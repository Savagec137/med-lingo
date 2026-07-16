-- Sprint 1 — Inventaire et économie unifiée.
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_type_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_type_check
  CHECK (type IN ('avatar','frame','background','badge','booster','chest','title','profile_card','gem_pack'));
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_rarity_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_rarity_check
  CHECK (rarity IN ('common','rare','epic','legendary','mythic'));
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_rarity_check;
ALTER TABLE public.badges ADD CONSTRAINT badges_rarity_check
  CHECK (rarity IN ('common','rare','epic','legendary','mythic'));
ALTER TABLE public.loot_tables DROP CONSTRAINT IF EXISTS loot_tables_tier_check;
ALTER TABLE public.loot_tables ADD CONSTRAINT loot_tables_tier_check
  CHECK (tier IN ('bronze','silver','gold','epic','legendary','mythic'));

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('chest','xp_boost','avatar','profile_card','badge','ticket')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary','mythic')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_code)
);
CREATE INDEX IF NOT EXISTS inventory_user_updated_idx ON public.inventory(user_id, updated_at DESC);
GRANT SELECT ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_read_own ON public.inventory;
CREATE POLICY inventory_read_own ON public.inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  reference TEXT,
  reward JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reward_history_user_created_idx ON public.reward_history(user_id, created_at DESC);
GRANT SELECT ON public.reward_history TO authenticated;
GRANT ALL ON public.reward_history TO service_role;
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reward_history_read_own ON public.reward_history;
CREATE POLICY reward_history_read_own ON public.reward_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_currency (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  keys INTEGER NOT NULL DEFAULT 0 CHECK (keys >= 0),
  tickets INTEGER NOT NULL DEFAULT 0 CHECK (tickets >= 0),
  energy INTEGER NOT NULL DEFAULT 5 CHECK (energy >= 0),
  energy_max INTEGER NOT NULL DEFAULT 5 CHECK (energy_max > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_currency TO authenticated;
GRANT ALL ON public.user_currency TO service_role;
ALTER TABLE public.user_currency ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_currency_read_own ON public.user_currency;
CREATE POLICY user_currency_read_own ON public.user_currency FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL,
  streak_day INTEGER NOT NULL CHECK (streak_day BETWEEN 1 AND 7),
  rewards JSONB NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_date)
);
CREATE INDEX IF NOT EXISTS daily_rewards_user_date_idx ON public.daily_rewards(user_id, reward_date DESC);
GRANT SELECT ON public.daily_rewards TO authenticated;
GRANT ALL ON public.daily_rewards TO service_role;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_rewards_read_own ON public.daily_rewards;
CREATE POLICY daily_rewards_read_own ON public.daily_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_user_currency_from_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_currency (user_id, coins, gems, keys, energy, energy_max)
  VALUES (NEW.user_id, NEW.coins, NEW.gems, NEW.keys, NEW.energy, NEW.energy_max)
  ON CONFLICT (user_id) DO UPDATE SET
    coins = EXCLUDED.coins, gems = EXCLUDED.gems, keys = EXCLUDED.keys,
    energy = EXCLUDED.energy, energy_max = EXCLUDED.energy_max, updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS wallets_sync_user_currency ON public.wallets;
CREATE TRIGGER wallets_sync_user_currency
  AFTER INSERT OR UPDATE OF coins, gems, keys, energy, energy_max ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_currency_from_wallet();

INSERT INTO public.user_currency (user_id, coins, gems, keys, energy, energy_max)
SELECT user_id, coins, gems, keys, energy, energy_max FROM public.wallets
ON CONFLICT (user_id) DO UPDATE SET
  coins = EXCLUDED.coins, gems = EXCLUDED.gems, keys = EXCLUDED.keys,
  energy = EXCLUDED.energy, energy_max = EXCLUDED.energy_max, updated_at = now();

CREATE OR REPLACE FUNCTION public.game_level_from_xp(total_xp INTEGER)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(1, FLOOR((1 + SQRT(1 + GREATEST(total_xp, 0)::numeric / 12.5)) / 2)::integer);
$$;

CREATE OR REPLACE FUNCTION public.grant_game_reward(_reward JSONB, _source TEXT, _reference TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  reward_type TEXT := _reward->>'type';
  reward_amount INTEGER := GREATEST(1, COALESCE((_reward->>'amount')::INTEGER, 1));
  item_code_value TEXT := _reward->>'item_code';
  item_type_value TEXT := COALESCE(_reward->>'item_type', 'ticket');
  rarity_value TEXT := COALESCE(_reward->>'rarity', 'common');
  normalized JSONB;
  next_xp INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF reward_type NOT IN ('xp','coins','gems','keys','tickets','energy','item') THEN RAISE EXCEPTION 'invalid reward type'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  IF reward_type = 'coins' THEN
    UPDATE public.wallets SET coins = coins + reward_amount, updated_at = now() WHERE user_id = uid;
    INSERT INTO public.coin_transactions (user_id, amount, currency, source, reference) VALUES (uid, reward_amount, 'coins', _source, _reference);
    normalized := jsonb_build_object('type','coins','amount',reward_amount);
  ELSIF reward_type = 'gems' THEN
    UPDATE public.wallets SET gems = gems + reward_amount, updated_at = now() WHERE user_id = uid;
    INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference) VALUES (uid, 'gems', reward_amount, _source, _reference);
    normalized := jsonb_build_object('type','gems','amount',reward_amount);
  ELSIF reward_type = 'keys' THEN
    UPDATE public.wallets SET keys = keys + reward_amount, updated_at = now() WHERE user_id = uid;
    INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference) VALUES (uid, 'keys', reward_amount, _source, _reference);
    normalized := jsonb_build_object('type','keys','amount',reward_amount);
  ELSIF reward_type = 'tickets' THEN
    UPDATE public.user_currency SET tickets = tickets + reward_amount, updated_at = now() WHERE user_id = uid;
    normalized := jsonb_build_object('type','tickets','amount',reward_amount);
  ELSIF reward_type = 'energy' THEN
    UPDATE public.wallets SET energy = LEAST(energy_max, energy + reward_amount), updated_at = now() WHERE user_id = uid;
    normalized := jsonb_build_object('type','energy','amount',reward_amount);
  ELSIF reward_type = 'xp' THEN
    UPDATE public.user_progress
      SET xp = xp + reward_amount, level = public.game_level_from_xp(xp + reward_amount), updated_at = now()
      WHERE user_id = uid RETURNING xp INTO next_xp;
    IF next_xp IS NULL THEN RAISE EXCEPTION 'missing user progress'; END IF;
    INSERT INTO public.xp_transactions (user_id, amount, source) VALUES (uid, reward_amount, _source);
    normalized := jsonb_build_object('type','xp','amount',reward_amount);
  ELSE
    IF item_code_value IS NULL OR item_code_value = '' THEN RAISE EXCEPTION 'missing item code'; END IF;
    IF item_type_value NOT IN ('chest','xp_boost','avatar','profile_card','badge','ticket') THEN RAISE EXCEPTION 'invalid item type'; END IF;
    IF rarity_value NOT IN ('common','rare','epic','legendary','mythic') THEN RAISE EXCEPTION 'invalid rarity'; END IF;
    INSERT INTO public.inventory (user_id, item_code, item_type, rarity, quantity, metadata)
    VALUES (uid, item_code_value, item_type_value, rarity_value, reward_amount, COALESCE(_reward->'metadata', '{}'::jsonb))
    ON CONFLICT (user_id, item_code) DO UPDATE SET
      quantity = public.inventory.quantity + EXCLUDED.quantity,
      rarity = EXCLUDED.rarity,
      metadata = public.inventory.metadata || EXCLUDED.metadata,
      updated_at = now();
    normalized := jsonb_build_object('type','item','amount',reward_amount,'itemCode',item_code_value,'itemType',item_type_value,'rarity',rarity_value,'metadata',COALESCE(_reward->'metadata', '{}'::jsonb));
  END IF;
  INSERT INTO public.reward_history (user_id, source, reference, reward) VALUES (uid, _source, _reference, normalized);
  RETURN normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_game_item(_item_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  item public.shop_items%ROWTYPE;
  current_coins INTEGER;
  current_gems INTEGER;
  granted JSONB;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE code = _item_code AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item not found'; END IF;
  IF item.type <> 'chest' THEN RAISE EXCEPTION 'only chests use this purchase flow'; END IF;
  IF item.premium_only THEN RAISE EXCEPTION 'premium required'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT coins, gems INTO current_coins, current_gems FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF current_coins < item.price_coins OR current_gems < item.price_gems THEN RAISE EXCEPTION 'insufficient currency'; END IF;
  UPDATE public.wallets SET coins = coins - item.price_coins, gems = gems - item.price_gems, updated_at = now() WHERE user_id = uid;
  IF item.price_coins > 0 THEN INSERT INTO public.coin_transactions (user_id, amount, currency, source, reference) VALUES (uid, -item.price_coins, 'coins', 'shop', item.code); END IF;
  IF item.price_gems > 0 THEN INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference) VALUES (uid, 'gems', -item.price_gems, 'shop', item.code); END IF;
  granted := public.grant_game_reward(jsonb_build_object('type','item','amount',1,'item_code',item.code,'item_type','chest','rarity',item.rarity,'metadata',item.metadata || jsonb_build_object('name',item.name)), 'shop', item.code);
  RETURN jsonb_build_object('ok',true,'item',granted);
END;
$$;

CREATE OR REPLACE FUNCTION public.open_game_chest(_chest_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  item public.shop_items%ROWTYPE;
  inv public.inventory%ROWTYPE;
  loot public.loot_tables%ROWTYPE;
  tier_value TEXT;
  raw_reward JSONB;
  granted JSONB;
  rewards JSONB := '[]'::jsonb;
  total_weight INTEGER := 0;
  roll_value INTEGER;
  cumulative INTEGER := 0;
  selected_reward JSONB;
  amount_value INTEGER;
  level_before INTEGER;
  level_after INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE code = _chest_code AND type = 'chest' AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'chest not found'; END IF;
  SELECT * INTO inv FROM public.inventory WHERE user_id = uid AND item_code = _chest_code FOR UPDATE;
  IF NOT FOUND OR inv.quantity < 1 THEN RAISE EXCEPTION 'chest not owned'; END IF;
  tier_value := COALESCE(
    item.metadata->>'tier',
    CASE _chest_code
      WHEN 'chest_small' THEN 'bronze'
      WHEN 'chest_big' THEN 'gold'
      WHEN 'chest_epic' THEN 'legendary'
    END,
    REPLACE(_chest_code, 'game_chest_', '')
  );
  IF tier_value NOT IN ('bronze','silver','gold','legendary','mythic') THEN RAISE EXCEPTION 'invalid chest tier'; END IF;
  SELECT * INTO loot FROM public.loot_tables WHERE code = 'game_chest_' || tier_value AND active = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'loot table not found'; END IF;
  SELECT level INTO level_before FROM public.user_progress WHERE user_id = uid;

  UPDATE public.inventory SET quantity = quantity - 1, updated_at = now() WHERE id = inv.id;
  FOR raw_reward IN SELECT value FROM jsonb_array_elements(COALESCE(loot.entries->'guaranteed', '[]'::jsonb)) LOOP
    IF raw_reward ? 'min' THEN
      amount_value := FLOOR(random() * ((raw_reward->>'max')::INTEGER - (raw_reward->>'min')::INTEGER + 1))::INTEGER + (raw_reward->>'min')::INTEGER;
      raw_reward := (raw_reward - 'min' - 'max') || jsonb_build_object('amount', amount_value);
    END IF;
    granted := public.grant_game_reward(raw_reward, 'chest:' || tier_value, _chest_code);
    rewards := rewards || granted;
  END LOOP;
  FOR raw_reward IN SELECT value FROM jsonb_array_elements(COALESCE(loot.entries->'rolls', '[]'::jsonb)) LOOP
    total_weight := total_weight + COALESCE((raw_reward->>'weight')::INTEGER, 1);
  END LOOP;
  IF total_weight > 0 THEN
    roll_value := FLOOR(random() * total_weight)::INTEGER + 1;
    FOR raw_reward IN SELECT value FROM jsonb_array_elements(loot.entries->'rolls') LOOP
      cumulative := cumulative + COALESCE((raw_reward->>'weight')::INTEGER, 1);
      IF roll_value <= cumulative THEN selected_reward := raw_reward->'reward'; EXIT; END IF;
    END LOOP;
    IF selected_reward ? 'min' THEN
      amount_value := FLOOR(random() * ((selected_reward->>'max')::INTEGER - (selected_reward->>'min')::INTEGER + 1))::INTEGER + (selected_reward->>'min')::INTEGER;
      selected_reward := (selected_reward - 'min' - 'max') || jsonb_build_object('amount', amount_value);
    END IF;
    granted := public.grant_game_reward(selected_reward, 'chest:' || tier_value, _chest_code);
    rewards := rewards || granted;
  END IF;
  INSERT INTO public.chest_openings (user_id, chest_code, tier, source, loot) VALUES (uid, _chest_code, tier_value, 'inventory', rewards);
  SELECT level INTO level_after FROM public.user_progress WHERE user_id = uid;
  RETURN jsonb_build_object('chestCode',_chest_code,'tier',tier_value,'rewards',rewards,'levelUp',CASE WHEN level_after > level_before THEN jsonb_build_object('from',level_before,'to',level_after) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  day_index INTEGER := ((CURRENT_DATE - DATE '2026-07-16') % 7) + 1;
  raw_reward JSONB;
  granted JSONB;
  reward_list JSONB := '[]'::jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_rewards WHERE user_id = uid AND reward_date = CURRENT_DATE) THEN RAISE EXCEPTION 'daily reward already claimed'; END IF;
  raw_reward := CASE day_index
    WHEN 1 THEN jsonb_build_object('type','coins','amount',50)
    WHEN 2 THEN jsonb_build_object('type','xp','amount',25)
    WHEN 3 THEN jsonb_build_object('type','gems','amount',3)
    WHEN 4 THEN jsonb_build_object('type','tickets','amount',1)
    WHEN 5 THEN jsonb_build_object('type','energy','amount',2)
    WHEN 6 THEN jsonb_build_object('type','item','amount',1,'item_code','boost_xp_30','item_type','xp_boost','rarity','rare','metadata',jsonb_build_object('name','Boost XP 30 min'))
    WHEN 7 THEN jsonb_build_object('type','item','amount',1,'item_code','game_chest_silver','item_type','chest','rarity','rare','metadata',jsonb_build_object('name','Coffre Argent','tier','silver'))
  END;
  granted := public.grant_game_reward(raw_reward, 'daily_reward', CURRENT_DATE::TEXT);
  reward_list := reward_list || granted;
  INSERT INTO public.daily_rewards (user_id, reward_date, streak_day, rewards) VALUES (uid, CURRENT_DATE, day_index, reward_list);
  RETURN jsonb_build_object('rewardDate',CURRENT_DATE,'streakDay',day_index,'rewards',reward_list,'claimedAt',now());
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_legacy_item_to_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.shop_items%ROWTYPE; modern_type TEXT;
BEGIN
  SELECT * INTO item FROM public.shop_items WHERE code = NEW.item_code;
  IF NOT FOUND THEN RETURN NEW; END IF;
  modern_type := CASE WHEN item.type = 'chest' THEN 'chest' WHEN item.type = 'avatar' THEN 'avatar' WHEN item.type = 'badge' THEN 'badge' ELSE 'profile_card' END;
  INSERT INTO public.inventory (user_id, item_code, item_type, rarity, quantity, metadata)
  VALUES (NEW.user_id, item.code, modern_type, item.rarity, 1, item.metadata || jsonb_build_object('name',item.name))
  ON CONFLICT (user_id, item_code) DO UPDATE SET quantity = public.inventory.quantity + 1, updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_inventory_sync_modern_inventory ON public.user_inventory;
CREATE TRIGGER user_inventory_sync_modern_inventory AFTER INSERT ON public.user_inventory
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_item_to_inventory();

INSERT INTO public.inventory (user_id, item_code, item_type, rarity, quantity, metadata, acquired_at)
SELECT ui.user_id, ui.item_code,
  CASE WHEN si.type = 'chest' THEN 'chest' WHEN si.type = 'avatar' THEN 'avatar' WHEN si.type = 'badge' THEN 'badge' ELSE 'profile_card' END,
  si.rarity, 1, si.metadata || jsonb_build_object('name',si.name), ui.acquired_at
FROM public.user_inventory ui JOIN public.shop_items si ON si.code = ui.item_code
ON CONFLICT (user_id, item_code) DO NOTHING;

INSERT INTO public.shop_items (code, type, name, description, price_coins, price_gems, premium_only, rarity, icon, sort_order, metadata) VALUES
  ('game_chest_bronze','chest','Coffre Bronze','Un coffre de départ avec des ressources essentielles.',120,0,false,'common','box',300,'{"tier":"bronze"}'::jsonb),
  ('game_chest_silver','chest','Coffre Argent','Des récompenses améliorées et une chance d’objet rare.',360,0,false,'rare','box',310,'{"tier":"silver"}'::jsonb),
  ('game_chest_gold','chest','Coffre Or','Une sélection de récompenses de haut niveau.',900,0,false,'epic','box',320,'{"tier":"gold"}'::jsonb),
  ('game_chest_legendary','chest','Coffre Légendaire','Un coffre prestigieux avec un objet garanti.',1800,12,false,'legendary','box',330,'{"tier":"legendary"}'::jsonb),
  ('game_chest_mythic','chest','Coffre Mythique','La réserve la plus rare de MedLingo.',0,35,false,'mythic','box',340,'{"tier":"mythic"}'::jsonb),
  ('game_card_anatomy','profile_card','Carte Anatomie','Carte de profil collectionnable.',650,0,false,'rare','id-card',410,'{"name":"Carte Anatomie"}'::jsonb),
  ('game_card_clinical','profile_card','Carte Clinique','Carte de profil pour les parcours avancés.',1200,0,false,'epic','id-card',420,'{"name":"Carte Clinique"}'::jsonb),
  ('game_badge_precision','badge','Badge Précision','Badge de collection réservé aux élèves rigoureux.',800,0,false,'rare','badge-check',430,'{"name":"Badge Précision"}'::jsonb),
  ('game_badge_guardian','badge','Badge Gardien','Badge de collection de rareté légendaire.',0,18,false,'legendary','badge-check',440,'{"name":"Badge Gardien"}'::jsonb),
  ('game_gems_starter','gem_pack','Pack Gemmes — Découverte','Prévu pour l’intégration Stripe.',0,0,false,'common','gem',500,'{"payment_provider":"stripe","gems":80}'::jsonb),
  ('game_gems_plus','gem_pack','Pack Gemmes — Plus','Prévu pour l’intégration Stripe.',0,0,false,'rare','gem',510,'{"payment_provider":"stripe","gems":450}'::jsonb)
ON CONFLICT (code) DO UPDATE SET metadata = EXCLUDED.metadata, rarity = EXCLUDED.rarity, sort_order = EXCLUDED.sort_order;

INSERT INTO public.loot_tables (code, tier, entries) VALUES
  ('game_chest_bronze','bronze','{"guaranteed":[{"type":"coins","min":30,"max":60}],"rolls":[{"weight":70,"reward":{"type":"coins","min":15,"max":35}},{"weight":20,"reward":{"type":"xp","min":10,"max":20}},{"weight":10,"reward":{"type":"tickets","amount":1}}]}'::jsonb),
  ('game_chest_silver','silver','{"guaranteed":[{"type":"coins","min":90,"max":150},{"type":"gems","min":2,"max":5}],"rolls":[{"weight":55,"reward":{"type":"xp","min":25,"max":45}},{"weight":30,"reward":{"type":"item","amount":1,"item_code":"boost_xp_30","item_type":"xp_boost","rarity":"rare","metadata":{"name":"Boost XP 30 min"}}},{"weight":15,"reward":{"type":"tickets","amount":2}}]}'::jsonb),
  ('game_chest_gold','gold','{"guaranteed":[{"type":"coins","min":240,"max":420},{"type":"gems","min":8,"max":14}],"rolls":[{"weight":50,"reward":{"type":"xp","min":60,"max":100}},{"weight":35,"reward":{"type":"item","amount":1,"item_code":"game_card_anatomy","item_type":"profile_card","rarity":"rare","metadata":{"name":"Carte Anatomie"}}},{"weight":15,"reward":{"type":"keys","amount":1}}]}'::jsonb),
  ('game_chest_legendary','legendary','{"guaranteed":[{"type":"gems","min":20,"max":35},{"type":"item","amount":1,"item_code":"game_card_clinical","item_type":"profile_card","rarity":"epic","metadata":{"name":"Carte Clinique"}}],"rolls":[{"weight":60,"reward":{"type":"xp","min":120,"max":180}},{"weight":40,"reward":{"type":"item","amount":1,"item_code":"game_badge_precision","item_type":"badge","rarity":"rare","metadata":{"name":"Badge Précision"}}}]}'::jsonb),
  ('game_chest_mythic','mythic','{"guaranteed":[{"type":"gems","min":50,"max":80},{"type":"item","amount":1,"item_code":"game_badge_guardian","item_type":"badge","rarity":"legendary","metadata":{"name":"Badge Gardien"}}],"rolls":[{"weight":55,"reward":{"type":"xp","min":200,"max":300}},{"weight":30,"reward":{"type":"item","amount":1,"item_code":"boost_xp_60","item_type":"xp_boost","rarity":"epic","metadata":{"name":"Boost XP 60 min"}}},{"weight":15,"reward":{"type":"keys","amount":2}}]}'::jsonb)
ON CONFLICT (code) DO UPDATE SET entries = EXCLUDED.entries, tier = EXCLUDED.tier, updated_at = now();

REVOKE ALL ON FUNCTION public.grant_game_reward(JSONB, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.purchase_game_item(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_game_chest(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_game_item(TEXT), public.open_game_chest(TEXT), public.claim_daily_reward() TO authenticated;
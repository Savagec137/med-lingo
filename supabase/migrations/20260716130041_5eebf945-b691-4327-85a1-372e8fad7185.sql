
-- ============ WALLETS ============
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet select" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own wallet insert" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own wallet update" ON public.wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COIN TRANSACTIONS ============
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'coins' CHECK (currency IN ('coins','gems')),
  source TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tx insert" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ SHOP ITEMS ============
CREATE TABLE public.shop_items (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('avatar','frame','background','badge','booster','chest','title')),
  name TEXT NOT NULL,
  description TEXT,
  price_coins INTEGER NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  price_gems INTEGER NOT NULL DEFAULT 0 CHECK (price_gems >= 0),
  premium_only BOOLEAN NOT NULL DEFAULT false,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  asset_url TEXT,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO anon, authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop items public read" ON public.shop_items FOR SELECT TO anon, authenticated USING (active = true);

-- ============ USER INVENTORY ============
CREATE TABLE public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL REFERENCES public.shop_items(code) ON DELETE CASCADE,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_code)
);
CREATE INDEX ON public.user_inventory(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inv all" ON public.user_inventory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ HELPER: award_coins ============
CREATE OR REPLACE FUNCTION public.award_coins(_amount INTEGER, _source TEXT, _reference TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_balance INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount = 0 THEN RETURN (SELECT coins FROM wallets WHERE user_id = _uid); END IF;

  INSERT INTO wallets (user_id, coins) VALUES (_uid, GREATEST(0, _amount))
  ON CONFLICT (user_id) DO UPDATE
    SET coins = GREATEST(0, wallets.coins + _amount),
        updated_at = now()
  RETURNING coins INTO _new_balance;

  INSERT INTO coin_transactions (user_id, amount, currency, source, reference)
  VALUES (_uid, _amount, 'coins', _source, _reference);

  RETURN _new_balance;
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_coins(INTEGER, TEXT, TEXT) TO authenticated;

-- ============ HELPER: purchase_item ============
CREATE OR REPLACE FUNCTION public.purchase_item(_item_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _item shop_items%ROWTYPE;
  _bal INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _item FROM shop_items WHERE code = _item_code AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'item not found'; END IF;

  IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = _uid AND item_code = _item_code) THEN
    RAISE EXCEPTION 'already owned';
  END IF;

  IF _item.premium_only THEN RAISE EXCEPTION 'premium required'; END IF;

  SELECT coins INTO _bal FROM wallets WHERE user_id = _uid;
  IF COALESCE(_bal,0) < _item.price_coins THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  UPDATE wallets SET coins = coins - _item.price_coins, updated_at = now() WHERE user_id = _uid;
  INSERT INTO coin_transactions (user_id, amount, currency, source, reference)
  VALUES (_uid, -_item.price_coins, 'coins', 'purchase', _item_code);
  INSERT INTO user_inventory (user_id, item_code) VALUES (_uid, _item_code);

  RETURN jsonb_build_object('ok', true, 'item_code', _item_code);
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT) TO authenticated;

-- ============ UPDATE new-user trigger to create wallet ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_progress (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id, coins) VALUES (NEW.id, 100) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ============ SEED CATALOGUE ============
INSERT INTO public.shop_items (code, type, name, description, price_coins, premium_only, rarity, icon, sort_order) VALUES
  ('avatar_student',      'avatar',     'Étudiant',           'Ton premier avatar médical',                     0,    false, 'common',    '🎓', 1),
  ('avatar_nurse',        'avatar',     'Infirmier·ère',      'Blouse blanche impeccable',                      300,  false, 'common',    '👩‍⚕️', 2),
  ('avatar_paramedic',    'avatar',     'Ambulancier',        'Prêt à intervenir',                              600,  false, 'rare',      '🚑', 3),
  ('avatar_doctor',       'avatar',     'Médecin',            'Stéthoscope au cou',                             1200, false, 'rare',      '🩺', 4),
  ('avatar_surgeon',      'avatar',     'Chirurgien',         'Bloc opératoire, calme absolu',                  2500, false, 'epic',      '🔪', 5),
  ('avatar_samu',         'avatar',     'SAMU',               'Urgences pré-hospitalières',                     0,    true,  'epic',      '🚁', 6),
  ('avatar_professor',    'avatar',     'Professeur',         'Toge et savoir infini',                          0,    true,  'legendary', '👨‍🏫', 7),
  ('frame_bronze',        'frame',      'Cadre bronze',       'Un début solide',                                200,  false, 'common',    '🥉', 20),
  ('frame_silver',        'frame',      'Cadre argent',       'Élégance discrète',                              800,  false, 'rare',      '🥈', 21),
  ('frame_gold',          'frame',      'Cadre or',           'Pour les meilleurs',                             2000, false, 'epic',      '🥇', 22),
  ('frame_neon',          'frame',      'Cadre néon',         'Anime le profil',                                0,    true,  'legendary', '✨', 23),
  ('bg_hospital',         'background', 'Fond hôpital',       'Couloirs feutrés',                               400,  false, 'common',    '🏥', 40),
  ('bg_anatomy',          'background', 'Fond anatomie',      'Planche classique',                              600,  false, 'rare',      '🦴', 41),
  ('bg_ambulance',        'background', 'Fond ambulance',     'Sirène en fond',                                 800,  false, 'rare',      '🚑', 42),
  ('bg_operating_room',   'background', 'Fond bloc opératoire','Lampes scialytiques',                           1500, false, 'epic',      '💡', 43),
  ('bg_premium_aurora',   'background', 'Aurore Premium',     'Fond animé exclusif',                            0,    true,  'legendary', '🌌', 44),
  ('badge_first_care',    'badge',      'Premier soin',       'Ton tout premier badge boutique',                150,  false, 'common',    '❤️‍🩹', 60),
  ('badge_defibrillator', 'badge',      'Défibrillateur',     'Choc électrique maîtrisé',                       500,  false, 'rare',      '⚡', 61),
  ('badge_pulse_elite',   'badge',      'Pulse Elite',        'Réservé aux abonnés Premium',                    0,    true,  'legendary', '💠', 62),
  ('title_novice',        'title',      'Novice',             'Titre affiché sur ta carte',                     100,  false, 'common',    '📖', 80);

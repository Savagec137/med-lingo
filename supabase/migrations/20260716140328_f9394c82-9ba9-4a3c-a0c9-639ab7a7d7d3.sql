
-- 1. Étendre la table wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keys INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS energy_max INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS energy_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Tables de loot (catalogue public par palier de coffre)
CREATE TABLE IF NOT EXISTS public.loot_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze','silver','gold','epic','mythic')),
  entries JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loot_tables TO anon, authenticated;
GRANT ALL ON public.loot_tables TO service_role;
ALTER TABLE public.loot_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loot_tables readable by all" ON public.loot_tables FOR SELECT USING (active = true);

-- 3. Historique unifié multi-devise
CREATE TABLE IF NOT EXISTS public.currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('gems','keys','energy')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.currency_transactions TO authenticated;
GRANT ALL ON public.currency_transactions TO service_role;
ALTER TABLE public.currency_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own currency tx read" ON public.currency_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own currency tx insert" ON public.currency_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_currency_tx_user ON public.currency_transactions(user_id, created_at DESC);

-- 4. Régénération d'énergie (1 point toutes les 6 minutes)
CREATE OR REPLACE FUNCTION public.regen_energy()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  w RECORD;
  elapsed_min INTEGER;
  gained INTEGER;
  new_energy INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.energy >= w.energy_max THEN
    UPDATE public.wallets SET energy_updated_at = now() WHERE user_id = uid;
    RETURN w.energy;
  END IF;
  elapsed_min := GREATEST(0, EXTRACT(EPOCH FROM (now() - w.energy_updated_at))::INTEGER / 60);
  gained := elapsed_min / 6;
  IF gained <= 0 THEN RETURN w.energy; END IF;
  new_energy := LEAST(w.energy_max, w.energy + gained);
  UPDATE public.wallets
    SET energy = new_energy,
        energy_updated_at = w.energy_updated_at + (gained * INTERVAL '6 minutes'),
        updated_at = now()
    WHERE user_id = uid;
  RETURN new_energy;
END; $$;

-- 5. Award gems
CREATE OR REPLACE FUNCTION public.award_gems(_amount INTEGER, _source TEXT, _reference TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid(); new_balance INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 OR _amount > 1000 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.wallets (user_id, gems) VALUES (uid, _amount)
    ON CONFLICT (user_id) DO UPDATE SET gems = wallets.gems + _amount, updated_at = now()
    RETURNING gems INTO new_balance;
  INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference)
    VALUES (uid, 'gems', _amount, _source, _reference);
  RETURN new_balance;
END; $$;

-- 6. Award keys
CREATE OR REPLACE FUNCTION public.award_keys(_amount INTEGER, _source TEXT, _reference TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid(); new_balance INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 OR _amount > 100 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.wallets (user_id, keys) VALUES (uid, _amount)
    ON CONFLICT (user_id) DO UPDATE SET keys = wallets.keys + _amount, updated_at = now()
    RETURNING keys INTO new_balance;
  INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference)
    VALUES (uid, 'keys', _amount, _source, _reference);
  RETURN new_balance;
END; $$;

-- 7. Spend energy (regen puis débit)
CREATE OR REPLACE FUNCTION public.spend_energy(_amount INTEGER, _reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid(); current_e INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 OR _amount > 50 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  current_e := public.regen_energy();
  IF current_e < _amount THEN RAISE EXCEPTION 'insufficient energy'; END IF;
  UPDATE public.wallets SET energy = energy - _amount, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference)
    VALUES (uid, 'energy', -_amount, _reason, NULL);
  RETURN current_e - _amount;
END; $$;

-- 8. Seed loot tables (par palier)
INSERT INTO public.loot_tables (code, tier, entries) VALUES
  ('chest_bronze_default', 'bronze', '{"guaranteed":[{"type":"coins","min":20,"max":60}],"rolls":[{"weight":80,"reward":{"type":"coins","min":10,"max":30}},{"weight":15,"reward":{"type":"gems","min":1,"max":3}},{"weight":5,"reward":{"type":"keys","amount":1}}]}'::jsonb),
  ('chest_silver_default', 'silver', '{"guaranteed":[{"type":"coins","min":80,"max":180},{"type":"gems","min":2,"max":5}],"rolls":[{"weight":60,"reward":{"type":"coins","min":40,"max":80}},{"weight":30,"reward":{"type":"gems","min":3,"max":8}},{"weight":10,"reward":{"type":"cosmetic","rarity":"common"}}]}'::jsonb),
  ('chest_gold_default', 'gold', '{"guaranteed":[{"type":"coins","min":250,"max":500},{"type":"gems","min":8,"max":15}],"rolls":[{"weight":50,"reward":{"type":"coins","min":150,"max":300}},{"weight":35,"reward":{"type":"gems","min":10,"max":25}},{"weight":15,"reward":{"type":"cosmetic","rarity":"rare"}}]}'::jsonb),
  ('chest_epic_default', 'epic', '{"guaranteed":[{"type":"gems","min":25,"max":50},{"type":"cosmetic","rarity":"rare"}],"rolls":[{"weight":45,"reward":{"type":"coins","min":400,"max":900}},{"weight":35,"reward":{"type":"gems","min":20,"max":50}},{"weight":20,"reward":{"type":"cosmetic","rarity":"epic"}}]}'::jsonb),
  ('chest_mythic_default', 'mythic', '{"guaranteed":[{"type":"gems","min":75,"max":150},{"type":"cosmetic","rarity":"epic"}],"rolls":[{"weight":40,"reward":{"type":"gems","min":50,"max":120}},{"weight":35,"reward":{"type":"cosmetic","rarity":"epic"}},{"weight":25,"reward":{"type":"cosmetic","rarity":"legendary"}}]}'::jsonb)
ON CONFLICT (code) DO NOTHING;

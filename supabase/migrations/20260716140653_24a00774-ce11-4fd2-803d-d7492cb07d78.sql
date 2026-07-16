
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS last_compensation_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.chest_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_code TEXT NOT NULL,
  tier TEXT NOT NULL,
  source TEXT NOT NULL,
  loot JSONB NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chest_openings TO authenticated;
GRANT ALL ON public.chest_openings TO service_role;
ALTER TABLE public.chest_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chest openings read" ON public.chest_openings FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_chest_openings_user ON public.chest_openings(user_id, opened_at DESC);

-- open_chest: tire loot d'une loot_table par tier et crédite le portefeuille
CREATE OR REPLACE FUNCTION public.open_chest(_tier TEXT, _source TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  lt RECORD;
  entries JSONB;
  guaranteed JSONB;
  rolls JSONB;
  total_weight INTEGER := 0;
  pick INTEGER;
  cum INTEGER;
  r JSONB;
  reward JSONB;
  loot JSONB := '[]'::jsonb;
  amt INTEGER;
  reward_type TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _tier NOT IN ('bronze','silver','gold','epic','mythic') THEN RAISE EXCEPTION 'invalid tier'; END IF;

  SELECT * INTO lt FROM public.loot_tables
    WHERE tier = _tier AND active = true
    ORDER BY created_at LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no loot table'; END IF;

  entries := lt.entries;
  guaranteed := COALESCE(entries->'guaranteed', '[]'::jsonb);
  rolls := COALESCE(entries->'rolls', '[]'::jsonb);

  -- Récompenses garanties
  FOR r IN SELECT * FROM jsonb_array_elements(guaranteed) LOOP
    reward_type := r->>'type';
    IF reward_type IN ('coins','gems','keys') THEN
      amt := CASE WHEN r ? 'amount' THEN (r->>'amount')::int
                  ELSE floor(random() * ((r->>'max')::int - (r->>'min')::int + 1))::int + (r->>'min')::int END;
      loot := loot || jsonb_build_object('type', reward_type, 'amount', amt);
    ELSE
      loot := loot || r;
    END IF;
  END LOOP;

  -- 1 roll pondéré
  IF jsonb_array_length(rolls) > 0 THEN
    FOR r IN SELECT * FROM jsonb_array_elements(rolls) LOOP
      total_weight := total_weight + COALESCE((r->>'weight')::int, 1);
    END LOOP;
    pick := floor(random() * total_weight)::int + 1;
    cum := 0;
    FOR r IN SELECT * FROM jsonb_array_elements(rolls) LOOP
      cum := cum + COALESCE((r->>'weight')::int, 1);
      IF pick <= cum THEN
        reward := r->'reward';
        reward_type := reward->>'type';
        IF reward_type IN ('coins','gems','keys') THEN
          amt := CASE WHEN reward ? 'amount' THEN (reward->>'amount')::int
                      ELSE floor(random() * ((reward->>'max')::int - (reward->>'min')::int + 1))::int + (reward->>'min')::int END;
          loot := loot || jsonb_build_object('type', reward_type, 'amount', amt);
        ELSE
          loot := loot || reward;
        END IF;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Créditer le portefeuille (coins/gems/keys uniquement — cosmétiques traités côté app)
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  FOR r IN SELECT * FROM jsonb_array_elements(loot) LOOP
    reward_type := r->>'type';
    amt := COALESCE((r->>'amount')::int, 0);
    IF amt > 0 THEN
      IF reward_type = 'coins' THEN
        UPDATE public.wallets SET coins = coins + amt, updated_at = now() WHERE user_id = uid;
        INSERT INTO public.coin_transactions (user_id, amount, source, reference) VALUES (uid, amt, 'chest', _source);
      ELSIF reward_type = 'gems' THEN
        UPDATE public.wallets SET gems = gems + amt, updated_at = now() WHERE user_id = uid;
        INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference) VALUES (uid, 'gems', amt, 'chest', _source);
      ELSIF reward_type = 'keys' THEN
        UPDATE public.wallets SET keys = keys + amt, updated_at = now() WHERE user_id = uid;
        INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference) VALUES (uid, 'keys', amt, 'chest', _source);
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.chest_openings (user_id, chest_code, tier, source, loot)
    VALUES (uid, lt.code, _tier, _source, loot);

  RETURN jsonb_build_object('tier', _tier, 'loot', loot);
END; $$;

-- Coffre de compensation (0 vie): 1x toutes les 4h
CREATE OR REPLACE FUNCTION public.claim_compensation_chest()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  w RECORD;
  is_prem BOOLEAN;
  tier TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF w.last_compensation_at IS NOT NULL AND w.last_compensation_at > now() - INTERVAL '4 hours' THEN
    RAISE EXCEPTION 'cooldown active';
  END IF;
  SELECT COALESCE(is_premium, false) INTO is_prem FROM public.user_progress WHERE user_id = uid;
  tier := CASE WHEN is_prem THEN 'silver' ELSE 'bronze' END;
  UPDATE public.wallets SET last_compensation_at = now() WHERE user_id = uid;
  RETURN public.open_chest(tier, 'compensation');
END; $$;

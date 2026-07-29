-- Retire les clés et tickets de l'économie active sans supprimer les anciennes
-- colonnes. Les soldes historiques restent conservés pour audit et rollback.

WITH transformed_loot AS (
  SELECT
    id,
    jsonb_set(
      entries,
      '{rolls}',
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE roll #>> '{reward,type}'
              WHEN 'keys' THEN
                jsonb_set(
                  roll,
                  '{reward}',
                  jsonb_build_object(
                    'type',
                    'gems',
                    'amount',
                    GREATEST(4, COALESCE((roll #>> '{reward,amount}')::INTEGER, 1) * 5)
                  )
                )
              WHEN 'tickets' THEN
                jsonb_set(
                  roll,
                  '{reward}',
                  jsonb_build_object(
                    'type',
                    'coins',
                    'amount',
                    GREATEST(25, COALESCE((roll #>> '{reward,amount}')::INTEGER, 1) * 30)
                  )
                )
              ELSE roll
            END
            ORDER BY ordinal
          )
          FROM jsonb_array_elements(COALESCE(entries->'rolls', '[]'::jsonb))
            WITH ORDINALITY AS reward_rolls(roll, ordinal)
        ),
        '[]'::jsonb
      )
    ) AS entries
  FROM public.loot_tables
)
UPDATE public.loot_tables AS loot
SET entries = transformed.entries, updated_at = now()
FROM transformed_loot AS transformed
WHERE loot.id = transformed.id
  AND loot.entries IS DISTINCT FROM transformed.entries;

CREATE OR REPLACE FUNCTION public.grant_game_reward(
  _reward JSONB,
  _source TEXT,
  _reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  reward_type TEXT := _reward->>'type';
  reward_amount INTEGER := GREATEST(1, COALESCE((_reward->>'amount')::INTEGER, 1));
  item_code_value TEXT := _reward->>'item_code';
  item_type_value TEXT := _reward->>'item_type';
  rarity_value TEXT := COALESCE(_reward->>'rarity', 'common');
  normalized JSONB;
  next_xp INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF reward_type NOT IN ('xp', 'coins', 'gems', 'energy', 'item') THEN
    RAISE EXCEPTION 'deprecated or invalid reward type';
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_currency (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  IF reward_type = 'coins' THEN
    UPDATE public.wallets
    SET coins = coins + reward_amount, updated_at = now()
    WHERE user_id = uid;
    INSERT INTO public.coin_transactions (user_id, amount, currency, source, reference)
    VALUES (uid, reward_amount, 'coins', _source, _reference);
    normalized := jsonb_build_object('type', 'coins', 'amount', reward_amount);
  ELSIF reward_type = 'gems' THEN
    UPDATE public.wallets
    SET gems = gems + reward_amount, updated_at = now()
    WHERE user_id = uid;
    INSERT INTO public.currency_transactions (user_id, currency, amount, source, reference)
    VALUES (uid, 'gems', reward_amount, _source, _reference);
    normalized := jsonb_build_object('type', 'gems', 'amount', reward_amount);
  ELSIF reward_type = 'energy' THEN
    UPDATE public.wallets
    SET energy = LEAST(energy_max, energy + reward_amount), updated_at = now()
    WHERE user_id = uid;
    normalized := jsonb_build_object('type', 'energy', 'amount', reward_amount);
  ELSIF reward_type = 'xp' THEN
    UPDATE public.user_progress
    SET
      xp = xp + reward_amount,
      level = public.game_level_from_xp(xp + reward_amount),
      updated_at = now()
    WHERE user_id = uid
    RETURNING xp INTO next_xp;
    IF next_xp IS NULL THEN RAISE EXCEPTION 'missing user progress'; END IF;
    INSERT INTO public.xp_transactions (user_id, amount, source)
    VALUES (uid, reward_amount, _source);
    normalized := jsonb_build_object('type', 'xp', 'amount', reward_amount);
  ELSE
    IF item_code_value IS NULL OR item_code_value = '' THEN
      RAISE EXCEPTION 'missing item code';
    END IF;
    IF item_type_value NOT IN ('chest', 'xp_boost', 'avatar', 'profile_card', 'badge') THEN
      RAISE EXCEPTION 'invalid item type';
    END IF;
    IF rarity_value NOT IN ('common', 'rare', 'epic', 'legendary', 'mythic') THEN
      RAISE EXCEPTION 'invalid rarity';
    END IF;
    INSERT INTO public.inventory (
      user_id,
      item_code,
      item_type,
      rarity,
      quantity,
      metadata
    )
    VALUES (
      uid,
      item_code_value,
      item_type_value,
      rarity_value,
      reward_amount,
      COALESCE(_reward->'metadata', '{}'::jsonb)
    )
    ON CONFLICT (user_id, item_code) DO UPDATE SET
      quantity = public.inventory.quantity + EXCLUDED.quantity,
      rarity = EXCLUDED.rarity,
      metadata = public.inventory.metadata || EXCLUDED.metadata,
      updated_at = now();
    normalized := jsonb_build_object(
      'type',
      'item',
      'amount',
      reward_amount,
      'itemCode',
      item_code_value,
      'itemType',
      item_type_value,
      'rarity',
      rarity_value,
      'metadata',
      COALESCE(_reward->'metadata', '{}'::jsonb)
    );
  END IF;

  INSERT INTO public.reward_history (user_id, source, reference, reward)
  VALUES (uid, _source, _reference, normalized);
  RETURN normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  day_index INTEGER := ((CURRENT_DATE - DATE '2026-07-16') % 7) + 1;
  raw_reward JSONB;
  granted JSONB;
  reward_list JSONB := '[]'::jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (
    SELECT 1
    FROM public.daily_rewards
    WHERE user_id = uid AND reward_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'daily reward already claimed';
  END IF;

  raw_reward := CASE day_index
    WHEN 1 THEN jsonb_build_object('type', 'coins', 'amount', 50)
    WHEN 2 THEN jsonb_build_object('type', 'xp', 'amount', 25)
    WHEN 3 THEN jsonb_build_object('type', 'gems', 'amount', 3)
    WHEN 4 THEN jsonb_build_object('type', 'coins', 'amount', 75)
    WHEN 5 THEN jsonb_build_object('type', 'energy', 'amount', 2)
    WHEN 6 THEN jsonb_build_object(
      'type', 'item',
      'amount', 1,
      'item_code', 'boost_xp_30',
      'item_type', 'xp_boost',
      'rarity', 'rare',
      'metadata', jsonb_build_object('name', 'Boost XP 30 min')
    )
    WHEN 7 THEN jsonb_build_object(
      'type', 'item',
      'amount', 1,
      'item_code', 'game_chest_silver',
      'item_type', 'chest',
      'rarity', 'rare',
      'metadata', jsonb_build_object('name', 'Coffre Argent', 'tier', 'silver')
    )
  END;

  granted := public.grant_game_reward(raw_reward, 'daily_reward', CURRENT_DATE::TEXT);
  reward_list := reward_list || granted;
  INSERT INTO public.daily_rewards (user_id, reward_date, streak_day, rewards)
  VALUES (uid, CURRENT_DATE, day_index, reward_list);
  RETURN jsonb_build_object(
    'rewardDate', CURRENT_DATE,
    'streakDay', day_index,
    'rewards', reward_list,
    'claimedAt', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_keys(INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.wallets.keys IS
  'DEPRECATED 2026-07-29: solde historique conservé, plus attribué ni affiché.';
COMMENT ON COLUMN public.user_currency.keys IS
  'DEPRECATED 2026-07-29: solde historique conservé, plus attribué ni affiché.';
COMMENT ON COLUMN public.user_currency.tickets IS
  'DEPRECATED 2026-07-29: solde historique conservé, plus attribué ni affiché.';

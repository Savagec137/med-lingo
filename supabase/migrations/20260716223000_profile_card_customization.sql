-- Personal profile cards: a user can only equip a card already earned from
-- the game inventory (or the built-in default card).

CREATE TABLE IF NOT EXISTS public.user_profile_customization (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_card_code TEXT NOT NULL DEFAULT 'game_card_default',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_profile_customization TO authenticated;
GRANT ALL ON public.user_profile_customization TO service_role;
ALTER TABLE public.user_profile_customization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profile_customization_read_own ON public.user_profile_customization;
CREATE POLICY user_profile_customization_read_own
  ON public.user_profile_customization
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.equip_game_profile_card(_item_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _item_code NOT IN (
    'game_card_default',
    'game_card_anatomy',
    'game_card_clinical',
    'game_card_surgery',
    'game_card_genome',
    'game_card_neuro',
    'game_card_cardio',
    'game_card_caduceus',
    'game_card_pediatric'
  ) THEN
    RAISE EXCEPTION 'invalid profile card';
  END IF;

  IF _item_code <> 'game_card_default'
    AND NOT EXISTS (
      SELECT 1
      FROM public.inventory
      WHERE user_id = uid
        AND item_code = _item_code
        AND item_type = 'profile_card'
        AND quantity > 0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_inventory
      WHERE user_id = uid
        AND item_code = _item_code
    ) THEN
    RAISE EXCEPTION 'profile card not owned';
  END IF;

  INSERT INTO public.user_profile_customization (user_id, profile_card_code)
  VALUES (uid, _item_code)
  ON CONFLICT (user_id) DO UPDATE SET
    profile_card_code = EXCLUDED.profile_card_code,
    updated_at = now();

  RETURN jsonb_build_object('profileCardCode', _item_code, 'updatedAt', now());
END;
$$;

REVOKE ALL ON FUNCTION public.equip_game_profile_card(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_game_profile_card(TEXT) TO authenticated;

INSERT INTO public.shop_items (
  code, type, name, description, price_coins, price_gems, premium_only,
  rarity, icon, sort_order, metadata
) VALUES
  ('game_card_anatomy', 'profile_card', 'Carte Anatomie', 'Une carte de visite au style anatomique.', 650, 0, false, 'rare', 'dna', 410, '{"name":"Carte Anatomie"}'::jsonb),
  ('game_card_clinical', 'profile_card', 'Carte Clinique', 'Une carte de visite clinique et lumineuse.', 1200, 0, false, 'epic', 'id-card', 420, '{"name":"Carte Clinique"}'::jsonb),
  ('game_card_surgery', 'profile_card', 'Carte Bloc operatoire', 'Une carte inspiree du bloc operatoire.', 1600, 0, false, 'epic', 'cross', 425, '{"name":"Carte Bloc operatoire"}'::jsonb),
  ('game_card_genome', 'profile_card', 'Carte Genomique', 'Une carte de collection dediee au vivant.', 2100, 0, false, 'rare', 'dna', 430, '{"name":"Carte Genomique"}'::jsonb),
  ('game_card_neuro', 'profile_card', 'Carte Neurologie', 'Une carte premium pour les parcours avances.', 0, 20, false, 'legendary', 'brain', 435, '{"name":"Carte Neurologie"}'::jsonb),
  ('game_card_cardio', 'profile_card', 'Carte Cardiologie', 'Une carte intense pour les experts du rythme.', 0, 20, false, 'legendary', 'heart-pulse', 440, '{"name":"Carte Cardiologie"}'::jsonb),
  ('game_card_caduceus', 'profile_card', 'Carte Medecin d or', 'Une carte de visite medicale doree.', 0, 28, false, 'legendary', 'stethoscope', 445, '{"name":"Carte Medecin d or"}'::jsonb),
  ('game_card_pediatric', 'profile_card', 'Carte Pediatrie', 'Une carte mythique aux couleurs apaisantes.', 0, 45, false, 'mythic', 'sparkles', 450, '{"name":"Carte Pediatrie"}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_coins = EXCLUDED.price_coins,
  price_gems = EXCLUDED.price_gems,
  rarity = EXCLUDED.rarity,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata;

UPDATE public.loot_tables AS loot
SET entries = jsonb_set(
  loot.entries,
  '{rolls}',
  COALESCE(loot.entries->'rolls', '[]'::jsonb)
    || jsonb_build_array(
      jsonb_build_object(
        'weight', 20,
        'reward', jsonb_build_object(
          'type', 'item',
          'amount', 1,
          'item_code', 'game_card_neuro',
          'item_type', 'profile_card',
          'rarity', 'legendary',
          'metadata', jsonb_build_object('name', 'Carte Neurologie')
        )
      )
    )
)
WHERE loot.code = 'game_chest_mythic'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(loot.entries->'rolls', '[]'::jsonb)) AS roll
    WHERE roll->'reward'->>'item_code' = 'game_card_neuro'
  );

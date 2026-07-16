-- Temporary test economy: every game chest grants enough currency to explore
-- the full shop. Remove or replace this migration's values before production.
-- Existing cosmetic rewards and weighted rolls are intentionally preserved.

UPDATE public.loot_tables AS loot
SET
  entries = jsonb_set(
    loot.entries,
    '{guaranteed}',
    COALESCE(loot.entries->'guaranteed', '[]'::jsonb)
      || CASE
        WHEN EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(loot.entries->'guaranteed', '[]'::jsonb)) AS reward
          WHERE reward->>'type' = 'coins' AND (reward->>'amount')::integer = 10000
        ) THEN '[]'::jsonb
        ELSE jsonb_build_array(jsonb_build_object('type', 'coins', 'amount', 10000))
      END
      || CASE
        WHEN EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(loot.entries->'guaranteed', '[]'::jsonb)) AS reward
          WHERE reward->>'type' = 'gems' AND (reward->>'amount')::integer = 10000
        ) THEN '[]'::jsonb
        ELSE jsonb_build_array(jsonb_build_object('type', 'gems', 'amount', 10000))
      END
  ),
  updated_at = now()
WHERE loot.code IN (
  'game_chest_bronze',
  'game_chest_silver',
  'game_chest_gold',
  'game_chest_legendary',
  'game_chest_mythic'
);

-- Restore a sustainable production economy after the temporary 10,000-coin
-- and 10,000-gem test rewards. Existing wallets and weighted cosmetic rolls
-- are intentionally preserved; only guaranteed future rewards are rebalanced.

UPDATE public.loot_tables AS loot
SET
  entries = jsonb_set(
    loot.entries,
    '{guaranteed}',
    CASE loot.code
      WHEN 'game_chest_bronze' THEN
        '[{"type":"coins","min":20,"max":35}]'::jsonb
      WHEN 'game_chest_silver' THEN
        '[{"type":"coins","min":65,"max":110},{"type":"gems","min":1,"max":3}]'::jsonb
      WHEN 'game_chest_gold' THEN
        '[{"type":"coins","min":150,"max":260},{"type":"gems","min":3,"max":6}]'::jsonb
      WHEN 'game_chest_legendary' THEN
        '[{"type":"gems","min":5,"max":9},{"type":"item","amount":1,"item_code":"game_card_clinical","item_type":"profile_card","rarity":"epic","metadata":{"name":"Carte Clinique"}}]'::jsonb
      WHEN 'game_chest_mythic' THEN
        '[{"type":"gems","min":12,"max":20},{"type":"item","amount":1,"item_code":"game_badge_guardian","item_type":"badge","rarity":"legendary","metadata":{"name":"Badge Gardien"}}]'::jsonb
      ELSE '[]'::jsonb
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

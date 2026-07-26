-- Gamification, virtual economy, premium, store, inventory and chests.

CREATE TABLE gamification.levels (
  level integer PRIMARY KEY,
  title text NOT NULL,
  minimum_total_xp bigint NOT NULL UNIQUE,
  maximum_total_xp bigint,
  benefits jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT levels_level_ck CHECK (level > 0),
  CONSTRAINT levels_xp_ck CHECK (
    minimum_total_xp >= 0
    AND (maximum_total_xp IS NULL OR maximum_total_xp > minimum_total_xp)
  ),
  CONSTRAINT levels_benefits_ck CHECK (jsonb_typeof(benefits) = 'object')
);
COMMENT ON TABLE gamification.levels IS
  'Global deterministic XP-to-level thresholds; never duplicated on user history rows.';

CREATE TABLE gamification.ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  tier integer NOT NULL,
  minimum_rating numeric NOT NULL,
  maximum_rating numeric,
  icon_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ranks_tier_ck CHECK (tier > 0),
  CONSTRAINT ranks_rating_ck CHECK (
    maximum_rating IS NULL OR maximum_rating > minimum_rating
  ),
  CONSTRAINT ranks_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE gamification.ranks IS
  'Competitive rank catalog independent from temporary leagues and seasons.';

CREATE TABLE gamification.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  rarity core.rarity NOT NULL DEFAULT 'common',
  icon_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  hidden_until_earned boolean NOT NULL DEFAULT false,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE gamification.badges IS
  'Collectible badge catalog; earning rules belong to achievement definitions.';

CREATE TABLE gamification.titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  rarity core.rarity NOT NULL DEFAULT 'common',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE gamification.titles IS
  'Equippable profile titles unlocked by rewards, achievements or premium access.';

CREATE TABLE commerce.currency_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind core.currency_kind NOT NULL,
  display_name text NOT NULL,
  icon_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  maximum_balance numeric,
  transferable boolean NOT NULL DEFAULT false,
  purchasable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT currency_maximum_ck CHECK (maximum_balance IS NULL OR maximum_balance >= 0)
);
COMMENT ON TABLE commerce.currency_definitions IS
  'Normalized currency catalog replacing hard-coded wallet columns for coins, gems, keys, tickets and energy.';

CREATE TABLE commerce.wallets (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  currency_id uuid NOT NULL REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric NOT NULL DEFAULT 0,
  lifetime_spent numeric NOT NULL DEFAULT 0,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, currency_id),
  CONSTRAINT wallets_balance_ck CHECK (balance >= 0),
  CONSTRAINT wallets_lifetime_ck CHECK (lifetime_earned >= 0 AND lifetime_spent >= 0)
);
COMMENT ON TABLE commerce.wallets IS
  'Current server-authoritative balance per user and currency; derived and reconciled with wallet_ledger.';
CREATE INDEX wallets_currency_balance_idx
  ON commerce.wallets (currency_id, balance DESC);

CREATE TABLE commerce.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  currency_id uuid NOT NULL REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  direction core.ledger_direction NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric NOT NULL,
  balance_after numeric NOT NULL,
  reason_code text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  correlation_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT wallet_ledger_amount_ck CHECK (amount > 0),
  CONSTRAINT wallet_ledger_balances_ck CHECK (balance_before >= 0 AND balance_after >= 0),
  CONSTRAINT wallet_ledger_math_ck CHECK (
    (direction = 'credit' AND balance_after = balance_before + amount)
    OR (direction = 'debit' AND balance_after = balance_before - amount)
  ),
  CONSTRAINT wallet_ledger_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.wallet_ledger IS
  'Append-only financial-grade virtual-currency ledger with idempotency and before/after balances.';
CREATE INDEX wallet_ledger_user_time_idx
  ON commerce.wallet_ledger (user_id, created_at DESC);
CREATE INDEX wallet_ledger_correlation_idx
  ON commerce.wallet_ledger (correlation_id);
CREATE INDEX wallet_ledger_source_idx
  ON commerce.wallet_ledger (source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE commerce.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  item_type text NOT NULL,
  name text NOT NULL,
  description text,
  rarity core.rarity NOT NULL DEFAULT 'common',
  stackable boolean NOT NULL DEFAULT false,
  consumable boolean NOT NULL DEFAULT false,
  premium_only boolean NOT NULL DEFAULT false,
  asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_items_type_ck CHECK (
    item_type IN (
      'avatar', 'theme', 'frame', 'profile_card', 'badge_cosmetic',
      'title', 'boost', 'ticket', 'chest', 'consumable', 'bundle'
    )
  ),
  CONSTRAINT catalog_items_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.catalog_items IS
  'Unified store and inventory catalog for avatars, themes, frames, cards, boosts, tickets and chests.';
CREATE INDEX catalog_items_type_status_idx
  ON commerce.catalog_items (item_type, status, sort_order);
CREATE INDEX catalog_items_metadata_gin
  ON commerce.catalog_items USING gin (metadata jsonb_path_ops);
CREATE INDEX catalog_items_name_trgm_idx
  ON commerce.catalog_items USING gin (name gin_trgm_ops);

CREATE TABLE commerce.catalog_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES commerce.catalog_items(id) ON DELETE CASCADE,
  currency_id uuid NOT NULL REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  amount numeric NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT catalog_prices_amount_ck CHECK (amount >= 0),
  CONSTRAINT catalog_prices_dates_ck CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT catalog_prices_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.catalog_prices IS
  'Time-bounded item prices; multiple currencies are separate rows rather than duplicated columns.';
CREATE UNIQUE INDEX catalog_prices_active_uidx
  ON commerce.catalog_prices (item_id, currency_id)
  WHERE active AND valid_until IS NULL;
CREATE INDEX catalog_prices_lookup_idx
  ON commerce.catalog_prices (item_id, active, valid_from DESC);

CREATE TABLE commerce.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id),
  CONSTRAINT inventory_quantity_ck CHECK (quantity >= 0),
  CONSTRAINT inventory_expiry_ck CHECK (expires_at IS NULL OR expires_at > acquired_at),
  CONSTRAINT inventory_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.inventory IS
  'Current item stack per user and catalog item, replacing duplicate legacy inventory tables.';
CREATE INDEX inventory_user_updated_idx
  ON commerce.inventory (user_id, updated_at DESC);
CREATE INDEX inventory_item_idx ON commerce.inventory (item_id, quantity);

CREATE TABLE commerce.inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  quantity_delta integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  reason_code text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  correlation_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT inventory_events_delta_ck CHECK (quantity_delta <> 0),
  CONSTRAINT inventory_events_quantities_ck CHECK (
    quantity_before >= 0
    AND quantity_after >= 0
    AND quantity_after = quantity_before + quantity_delta
  ),
  CONSTRAINT inventory_events_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.inventory_events IS
  'Append-only item movement ledger supporting reconciliation and reward audit.';
CREATE INDEX inventory_events_user_time_idx
  ON commerce.inventory_events (user_id, created_at DESC);
CREATE INDEX inventory_events_correlation_idx
  ON commerce.inventory_events (correlation_id);

CREATE TABLE commerce.user_equipment (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  slot text NOT NULL,
  inventory_id uuid NOT NULL REFERENCES commerce.inventory(id) ON DELETE CASCADE,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot),
  UNIQUE (inventory_id),
  CONSTRAINT user_equipment_slot_ck CHECK (
    slot IN ('avatar', 'frame', 'profile_card', 'theme', 'title', 'badge_showcase')
  )
);
COMMENT ON TABLE commerce.user_equipment IS
  'One equipped owned item per cosmetic slot, with ownership enforced by server functions.';

CREATE TABLE commerce.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  product_type text NOT NULL,
  name text NOT NULL,
  description text,
  provider_product_ref text,
  entitlement_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_type_ck CHECK (
    product_type IN ('consumable', 'non_consumable', 'subscription')
  ),
  CONSTRAINT products_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.products IS
  'Real-money product catalog prepared for Stripe/App Store/Play Store without storing payment secrets.';

CREATE TABLE commerce.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_price_ref text NOT NULL,
  currency_code text NOT NULL,
  amount_minor bigint NOT NULL,
  billing_interval text,
  country_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_price_ref),
  CONSTRAINT product_prices_amount_ck CHECK (amount_minor >= 0),
  CONSTRAINT product_prices_interval_ck CHECK (
    billing_interval IS NULL OR billing_interval IN ('day', 'week', 'month', 'year')
  )
);
COMMENT ON TABLE commerce.product_prices IS
  'Provider-specific real-money prices in minor units; supports regional stores and recurring billing.';
CREATE INDEX product_prices_product_active_idx
  ON commerce.product_prices (product_id, active);

CREATE TABLE commerce.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  order_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_order_ref text,
  currency_code text,
  total_amount_minor bigint,
  correlation_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT purchase_orders_type_ck CHECK (order_type IN ('virtual_currency', 'real_money')),
  CONSTRAINT purchase_orders_status_ck CHECK (
    status IN ('pending', 'authorized', 'paid', 'fulfilled', 'failed', 'cancelled', 'refunded')
  ),
  CONSTRAINT purchase_orders_amount_ck CHECK (
    total_amount_minor IS NULL OR total_amount_minor >= 0
  ),
  CONSTRAINT purchase_orders_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.purchase_orders IS
  'Purchase aggregate for both virtual and real-money checkout with idempotent fulfillment.';
CREATE UNIQUE INDEX purchase_orders_provider_uidx
  ON commerce.purchase_orders (provider, provider_order_ref)
  WHERE provider_order_ref IS NOT NULL;
CREATE INDEX purchase_orders_user_time_idx
  ON commerce.purchase_orders (user_id, created_at DESC);

CREATE TABLE commerce.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.purchase_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES commerce.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount numeric NOT NULL,
  currency_id uuid REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT purchase_order_lines_target_ck CHECK (num_nonnulls(item_id, product_id) = 1),
  CONSTRAINT purchase_order_lines_quantity_ck CHECK (quantity > 0),
  CONSTRAINT purchase_order_lines_amount_ck CHECK (unit_amount >= 0),
  CONSTRAINT purchase_order_lines_currency_ck CHECK (
    (item_id IS NOT NULL AND currency_id IS NOT NULL)
    OR (product_id IS NOT NULL AND currency_id IS NULL)
  ),
  CONSTRAINT purchase_order_lines_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.purchase_order_lines IS
  'Immutable priced lines belonging to a checkout order.';
CREATE INDEX purchase_order_lines_order_idx
  ON commerce.purchase_order_lines (order_id);

CREATE TABLE commerce.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES commerce.purchase_orders(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_ref text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_ref)
);
COMMENT ON TABLE commerce.payment_events IS
  'Idempotent webhook audit without raw card or payment credentials.';
CREATE INDEX payment_events_unprocessed_idx
  ON commerce.payment_events (received_at) WHERE processed_at IS NULL;

CREATE TABLE commerce.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES commerce.products(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  grace_period_days integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT subscription_plans_features_ck CHECK (jsonb_typeof(features) = 'object'),
  CONSTRAINT subscription_plans_grace_ck CHECK (grace_period_days >= 0)
);
COMMENT ON TABLE commerce.subscription_plans IS
  'Premium plan features and grace policy independent from provider billing identifiers.';

CREATE TABLE commerce.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES commerce.subscription_plans(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_subscription_ref text NOT NULL,
  status core.subscription_status NOT NULL,
  started_at timestamptz NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_ref),
  CONSTRAINT user_subscriptions_period_ck CHECK (current_period_end > current_period_start),
  CONSTRAINT user_subscriptions_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.user_subscriptions IS
  'Provider-backed subscription state synchronized only through verified server events.';
CREATE INDEX user_subscriptions_user_status_idx
  ON commerce.user_subscriptions (user_id, status, current_period_end DESC);

CREATE TABLE commerce.entitlement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  feature_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  active boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE commerce.entitlement_definitions IS
  'Provider-neutral premium capabilities granted by subscriptions, purchases or administration.';

CREATE TABLE commerce.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES commerce.entitlement_definitions(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_entitlements_expiry_ck CHECK (expires_at IS NULL OR expires_at > starts_at),
  CONSTRAINT user_entitlements_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.user_entitlements IS
  'Effective premium/admin grants with provenance and expiry, independent from subscription provider.';
CREATE INDEX user_entitlements_active_idx
  ON commerce.user_entitlements (user_id, entitlement_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE commerce.chest_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  rarity core.rarity NOT NULL,
  inventory_item_id uuid NOT NULL UNIQUE REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  animation_key text NOT NULL,
  guaranteed_reward_count integer NOT NULL DEFAULT 1,
  min_reward_count integer NOT NULL DEFAULT 1,
  max_reward_count integer NOT NULL DEFAULT 1,
  cooldown_seconds integer NOT NULL DEFAULT 0,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chest_types_reward_count_ck CHECK (
    guaranteed_reward_count >= 0
    AND min_reward_count > 0
    AND max_reward_count >= min_reward_count
    AND guaranteed_reward_count <= max_reward_count
  ),
  CONSTRAINT chest_types_cooldown_ck CHECK (cooldown_seconds >= 0),
  CONSTRAINT chest_types_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.chest_types IS
  'Five-or-more extensible chest definitions, separate from owned chest instances and loot probabilities.';

CREATE TABLE commerce.loot_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL,
  chest_type_id uuid NOT NULL REFERENCES commerce.chest_types(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  checksum text,
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chest_type_id, version_number),
  UNIQUE (stable_key, version_number),
  CONSTRAINT loot_tables_version_ck CHECK (version_number > 0),
  CONSTRAINT loot_tables_dates_ck CHECK (valid_until IS NULL OR valid_until > valid_from)
);
COMMENT ON TABLE commerce.loot_tables IS
  'Immutable, time-bounded loot table versions for reproducible chest openings.';
CREATE INDEX loot_tables_active_idx
  ON commerce.loot_tables (chest_type_id, status, valid_from DESC);

CREATE TABLE commerce.loot_table_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loot_table_id uuid NOT NULL REFERENCES commerce.loot_tables(id) ON DELETE CASCADE,
  reward_kind core.reward_kind NOT NULL,
  currency_id uuid REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  badge_id uuid REFERENCES gamification.badges(id) ON DELETE RESTRICT,
  title_id uuid REFERENCES gamification.titles(id) ON DELETE RESTRICT,
  chest_type_id uuid REFERENCES commerce.chest_types(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES commerce.entitlement_definitions(id) ON DELETE RESTRICT,
  weight numeric NOT NULL,
  min_quantity numeric NOT NULL DEFAULT 1,
  max_quantity numeric NOT NULL DEFAULT 1,
  guaranteed boolean NOT NULL DEFAULT false,
  rarity core.rarity NOT NULL DEFAULT 'common',
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT loot_entries_target_ck CHECK (
    CASE reward_kind
      WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0
      WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0
      WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0
      WHEN 'xp' THEN num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      ELSE true
    END
  ),
  CONSTRAINT loot_entries_weight_ck CHECK (weight > 0),
  CONSTRAINT loot_entries_quantity_ck CHECK (
    min_quantity > 0 AND max_quantity >= min_quantity
  ),
  CONSTRAINT loot_entries_conditions_ck CHECK (jsonb_typeof(conditions) = 'object')
);
COMMENT ON TABLE commerce.loot_table_entries IS
  'Normalized weighted reward candidates with quantity range, rarity and eligibility conditions.';
CREATE INDEX loot_table_entries_draw_idx
  ON commerce.loot_table_entries (loot_table_id, guaranteed, rarity);

CREATE TABLE commerce.chest_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  chest_type_id uuid NOT NULL REFERENCES commerce.chest_types(id) ON DELETE RESTRICT,
  inventory_id uuid REFERENCES commerce.inventory(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id uuid,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chest_instances_dates_ck CHECK (
    available_at >= acquired_at
    AND (opened_at IS NULL OR opened_at >= acquired_at)
    AND (expires_at IS NULL OR expires_at > acquired_at)
  ),
  CONSTRAINT chest_instances_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.chest_instances IS
  'Individually auditable user-owned chest; supports delayed, expiring and event chests.';
CREATE INDEX chest_instances_available_idx
  ON commerce.chest_instances (user_id, available_at)
  WHERE opened_at IS NULL;

CREATE TABLE gamification.reward_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE gamification.reward_bundles IS
  'Reusable reward package referenced by missions, achievements, Bosses and daily rewards.';

CREATE TABLE gamification.reward_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_bundle_id uuid NOT NULL REFERENCES gamification.reward_bundles(id) ON DELETE CASCADE,
  reward_kind core.reward_kind NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  currency_id uuid REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  badge_id uuid REFERENCES gamification.badges(id) ON DELETE RESTRICT,
  title_id uuid REFERENCES gamification.titles(id) ON DELETE RESTRICT,
  chest_type_id uuid REFERENCES commerce.chest_types(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES commerce.entitlement_definitions(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT reward_components_quantity_ck CHECK (quantity > 0),
  CONSTRAINT reward_components_target_ck CHECK (
    CASE reward_kind
      WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0
      WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0
      WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0
      WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      ELSE num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
    END
  ),
  CONSTRAINT reward_components_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE gamification.reward_components IS
  'Normalized components of a reusable reward bundle with one enforced target per component.';
CREATE INDEX reward_components_bundle_idx
  ON gamification.reward_components (reward_bundle_id);

CREATE TABLE gamification.reward_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  reward_bundle_id uuid REFERENCES gamification.reward_bundles(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id uuid,
  correlation_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  granted_at timestamptz,
  payload_snapshot jsonb NOT NULL,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT reward_grants_status_ck CHECK (status IN ('pending', 'granted', 'failed', 'reversed')),
  CONSTRAINT reward_grants_payload_ck CHECK (jsonb_typeof(payload_snapshot) = 'object'),
  CONSTRAINT reward_grants_granted_ck CHECK (
    status <> 'granted' OR granted_at IS NOT NULL
  )
);
COMMENT ON TABLE gamification.reward_grants IS
  'Idempotent reward transaction coordinating XP, wallet, inventory, badge, title and chest changes.';
CREATE INDEX reward_grants_user_time_idx
  ON gamification.reward_grants (user_id, created_at DESC);
CREATE INDEX reward_grants_correlation_idx
  ON gamification.reward_grants (correlation_id);

CREATE TABLE gamification.xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  amount integer NOT NULL,
  total_before bigint NOT NULL,
  total_after bigint NOT NULL,
  reason_code text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  reward_grant_id uuid REFERENCES gamification.reward_grants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT xp_ledger_amount_ck CHECK (amount <> 0),
  CONSTRAINT xp_ledger_total_ck CHECK (
    total_before >= 0 AND total_after >= 0 AND total_after = total_before + amount
  )
);
COMMENT ON TABLE gamification.xp_ledger IS
  'Append-only XP accounting; user total_xp is a transactionally maintained projection.';
CREATE INDEX xp_ledger_user_time_idx
  ON gamification.xp_ledger (user_id, created_at DESC);

CREATE TABLE gamification.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  metric_code text NOT NULL,
  rule jsonb NOT NULL,
  badge_id uuid REFERENCES gamification.badges(id) ON DELETE SET NULL,
  reward_bundle_id uuid REFERENCES gamification.reward_bundles(id) ON DELETE SET NULL,
  hidden boolean NOT NULL DEFAULT false,
  repeatable boolean NOT NULL DEFAULT false,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievement_rule_ck CHECK (jsonb_typeof(rule) = 'object')
);
COMMENT ON TABLE gamification.achievement_definitions IS
  'Versionable achievement rules separated from collectible badge presentation.';

CREATE TABLE gamification.user_achievements (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES gamification.achievement_definitions(id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  target numeric NOT NULL,
  earned_count integer NOT NULL DEFAULT 0,
  first_earned_at timestamptz,
  last_earned_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT user_achievements_values_ck CHECK (
    progress >= 0 AND target > 0 AND earned_count >= 0
  )
);
COMMENT ON TABLE gamification.user_achievements IS
  'Current achievement progress projection derived from trusted domain events.';

CREATE TABLE gamification.user_badges (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES gamification.badges(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  earned_at timestamptz NOT NULL DEFAULT now(),
  showcased boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, badge_id)
);
COMMENT ON TABLE gamification.user_badges IS
  'Owned collectible badges with provenance; clients cannot self-grant.';

CREATE TABLE gamification.user_titles (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES gamification.titles(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  earned_at timestamptz NOT NULL DEFAULT now(),
  equipped boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, title_id)
);
COMMENT ON TABLE gamification.user_titles IS
  'Owned profile titles separate from the single equipped title projection.';
CREATE UNIQUE INDEX user_titles_one_equipped_idx
  ON gamification.user_titles (user_id) WHERE equipped;

CREATE TABLE gamification.mission_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  period text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metric_code text NOT NULL,
  target numeric NOT NULL,
  eligibility_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_bundle_id uuid NOT NULL REFERENCES gamification.reward_bundles(id) ON DELETE RESTRICT,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  CONSTRAINT mission_definitions_period_ck CHECK (period IN ('daily', 'weekly', 'seasonal', 'one_time')),
  CONSTRAINT mission_definitions_target_ck CHECK (target > 0),
  CONSTRAINT mission_definitions_eligibility_ck CHECK (jsonb_typeof(eligibility_rule) = 'object')
);
COMMENT ON TABLE gamification.mission_definitions IS
  'Reusable daily, weekly, seasonal and one-time mission templates.';

CREATE TABLE gamification.mission_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_definition_id uuid NOT NULL REFERENCES gamification.mission_definitions(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  cohort_key text,
  configuration_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mission_occurrences_dates_ck CHECK (ends_at > starts_at),
  CONSTRAINT mission_occurrences_snapshot_ck CHECK (jsonb_typeof(configuration_snapshot) = 'object')
);
COMMENT ON TABLE gamification.mission_occurrences IS
  'Concrete time window and immutable rule snapshot for a mission instance.';
CREATE INDEX mission_occurrences_active_idx
  ON gamification.mission_occurrences (starts_at, ends_at);

CREATE TABLE gamification.user_mission_progress (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  mission_occurrence_id uuid NOT NULL REFERENCES gamification.mission_occurrences(id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  reward_grant_id uuid REFERENCES gamification.reward_grants(id) ON DELETE SET NULL,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_occurrence_id),
  CONSTRAINT user_mission_progress_ck CHECK (progress >= 0),
  CONSTRAINT user_mission_claim_ck CHECK (claimed_at IS NULL OR completed_at IS NOT NULL)
);
COMMENT ON TABLE gamification.user_mission_progress IS
  'Per-user mission state maintained from trusted activity events.';
CREATE INDEX user_mission_progress_active_idx
  ON gamification.user_mission_progress (user_id, completed_at, claimed_at);

CREATE TABLE gamification.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  CONSTRAINT seasons_dates_ck CHECK (ends_at > starts_at),
  CONSTRAINT seasons_rules_ck CHECK (jsonb_typeof(rules) = 'object')
);
COMMENT ON TABLE gamification.seasons IS
  'Time-bounded competitive and reward season definition.';

CREATE TABLE gamification.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES gamification.seasons(id) ON DELETE CASCADE,
  rank_id uuid NOT NULL REFERENCES gamification.ranks(id) ON DELETE RESTRICT,
  cohort_number integer NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  UNIQUE (season_id, rank_id, cohort_number),
  CONSTRAINT leagues_values_ck CHECK (cohort_number > 0 AND capacity > 1),
  CONSTRAINT leagues_dates_ck CHECK (ends_at > starts_at)
);
COMMENT ON TABLE gamification.leagues IS
  'Bounded leaderboard cohort for a rank and season, avoiding global hot rows.';

CREATE TABLE gamification.league_memberships (
  league_id uuid NOT NULL REFERENCES gamification.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  position integer,
  joined_at timestamptz NOT NULL DEFAULT now(),
  promoted boolean,
  relegated boolean,
  PRIMARY KEY (league_id, user_id),
  CONSTRAINT league_memberships_score_ck CHECK (score >= 0),
  CONSTRAINT league_memberships_position_ck CHECK (position IS NULL OR position > 0)
);
COMMENT ON TABLE gamification.league_memberships IS
  'User score projection within one small league cohort.';
CREATE INDEX league_memberships_ranking_idx
  ON gamification.league_memberships (league_id, score DESC, joined_at);
CREATE INDEX league_memberships_user_idx
  ON gamification.league_memberships (user_id, joined_at DESC);

CREATE TABLE gamification.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  challenge_type text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  rule jsonb NOT NULL,
  reward_bundle_id uuid REFERENCES gamification.reward_bundles(id) ON DELETE SET NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  CONSTRAINT challenges_dates_ck CHECK (ends_at > starts_at),
  CONSTRAINT challenges_rule_ck CHECK (jsonb_typeof(rule) = 'object')
);
COMMENT ON TABLE gamification.challenges IS
  'Individual or social limited-time challenge definition.';

CREATE TABLE gamification.challenge_participants (
  challenge_id uuid NOT NULL REFERENCES gamification.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  PRIMARY KEY (challenge_id, user_id),
  CONSTRAINT challenge_participants_values_ck CHECK (progress >= 0 AND score >= 0)
);
COMMENT ON TABLE gamification.challenge_participants IS
  'Membership and result projection for one challenge.';
CREATE INDEX challenge_participants_rank_idx
  ON gamification.challenge_participants (challenge_id, score DESC);

CREATE TABLE commerce.chest_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  chest_instance_id uuid NOT NULL UNIQUE REFERENCES commerce.chest_instances(id) ON DELETE RESTRICT,
  loot_table_id uuid NOT NULL REFERENCES commerce.loot_tables(id) ON DELETE RESTRICT,
  random_seed_hash text NOT NULL,
  server_nonce text NOT NULL,
  reward_grant_id uuid REFERENCES gamification.reward_grants(id) ON DELETE SET NULL,
  client_opened_at timestamptz,
  opened_at timestamptz NOT NULL DEFAULT now(),
  animation_completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT chest_openings_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE commerce.chest_openings IS
  'Exactly-once server result of a chest opening, pinned to a loot-table version.';
CREATE INDEX chest_openings_user_time_idx
  ON commerce.chest_openings (user_id, opened_at DESC);

CREATE TABLE commerce.chest_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chest_opening_id uuid NOT NULL REFERENCES commerce.chest_openings(id) ON DELETE CASCADE,
  loot_entry_id uuid REFERENCES commerce.loot_table_entries(id) ON DELETE SET NULL,
  reward_kind core.reward_kind NOT NULL,
  quantity numeric NOT NULL,
  currency_id uuid REFERENCES commerce.currency_definitions(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES commerce.catalog_items(id) ON DELETE RESTRICT,
  badge_id uuid REFERENCES gamification.badges(id) ON DELETE RESTRICT,
  title_id uuid REFERENCES gamification.titles(id) ON DELETE RESTRICT,
  chest_type_id uuid REFERENCES commerce.chest_types(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES commerce.entitlement_definitions(id) ON DELETE RESTRICT,
  rarity core.rarity NOT NULL,
  reward_snapshot jsonb NOT NULL,
  position integer NOT NULL,
  UNIQUE (chest_opening_id, position),
  CONSTRAINT chest_rewards_quantity_ck CHECK (quantity > 0),
  CONSTRAINT chest_rewards_position_ck CHECK (position > 0),
  CONSTRAINT chest_rewards_target_ck CHECK (
    CASE reward_kind
      WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0
      WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0
      WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0
      WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0
      WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
      ELSE num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0
    END
  ),
  CONSTRAINT chest_rewards_snapshot_ck CHECK (jsonb_typeof(reward_snapshot) = 'object')
);
COMMENT ON TABLE commerce.chest_rewards IS
  'Immutable ordered rewards revealed by a chest opening, retained independently of later catalog edits.';

CREATE TABLE gamification.daily_reward_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  cycle_length_days integer NOT NULL,
  timezone_policy text NOT NULL DEFAULT 'user',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  CONSTRAINT daily_reward_calendars_length_ck CHECK (cycle_length_days > 0),
  CONSTRAINT daily_reward_calendars_timezone_ck CHECK (timezone_policy IN ('user', 'utc', 'fixed'))
);
COMMENT ON TABLE gamification.daily_reward_calendars IS
  'Versionable daily-login reward cycle definition.';

CREATE TABLE gamification.daily_reward_steps (
  calendar_id uuid NOT NULL REFERENCES gamification.daily_reward_calendars(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  reward_bundle_id uuid NOT NULL REFERENCES gamification.reward_bundles(id) ON DELETE RESTRICT,
  PRIMARY KEY (calendar_id, day_number),
  CONSTRAINT daily_reward_steps_day_ck CHECK (day_number > 0)
);
COMMENT ON TABLE gamification.daily_reward_steps IS
  'Reward bundle assigned to each day of a daily calendar.';

CREATE TABLE gamification.daily_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES gamification.daily_reward_calendars(id) ON DELETE RESTRICT,
  local_reward_date date NOT NULL,
  day_number integer NOT NULL,
  reward_grant_id uuid NOT NULL UNIQUE REFERENCES gamification.reward_grants(id) ON DELETE RESTRICT,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  timezone text NOT NULL,
  UNIQUE (user_id, calendar_id, local_reward_date),
  CONSTRAINT daily_reward_claims_day_ck CHECK (day_number > 0)
);
COMMENT ON TABLE gamification.daily_reward_claims IS
  'Exactly-once daily reward claim with local-day and timezone evidence.';
CREATE INDEX daily_reward_claims_user_idx
  ON gamification.daily_reward_claims (user_id, local_reward_date DESC);

CREATE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON commerce.wallets
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER catalog_items_set_updated_at
BEFORE UPDATE ON commerce.catalog_items
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER inventory_set_updated_at
BEFORE UPDATE ON commerce.inventory
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER user_subscriptions_set_updated_at
BEFORE UPDATE ON commerce.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER user_achievements_set_updated_at
BEFORE UPDATE ON gamification.user_achievements
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER user_mission_progress_set_updated_at
BEFORE UPDATE ON gamification.user_mission_progress
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

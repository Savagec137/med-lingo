-- Trusted domain functions, invariants and read-optimized API views.

CREATE OR REPLACE FUNCTION iam.has_permission(
  permission_code text,
  requested_organization_id uuid DEFAULT NULL,
  requested_formation_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM iam.user_roles ur
    JOIN iam.role_permissions rp ON rp.role_id = ur.role_id
    JOIN iam.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.code = permission_code
      AND ur.revoked_at IS NULL
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND (
        (ur.organization_id IS NULL AND ur.formation_id IS NULL)
        OR ur.organization_id = requested_organization_id
        OR ur.formation_id = requested_formation_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION iam.bootstrap_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO iam.user_accounts (user_id, locale, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'fr-FR'),
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'Europe/Paris')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.mfa_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO progress.user_learning_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO progress.srs_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_medlingo_user_created_v1 ON auth.users;
CREATE TRIGGER on_medlingo_user_created_v1
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION iam.bootstrap_new_user();

CREATE OR REPLACE FUNCTION core.reject_update_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER wallet_ledger_append_only
BEFORE UPDATE OR DELETE ON commerce.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER inventory_events_append_only
BEFORE UPDATE OR DELETE ON commerce.inventory_events
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER xp_ledger_append_only
BEFORE UPDATE OR DELETE ON gamification.xp_ledger
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER question_attempts_append_only
BEFORE UPDATE OR DELETE ON progress.question_attempts
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER review_events_append_only
BEFORE UPDATE OR DELETE ON progress.review_events
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER mastery_history_append_only
BEFORE UPDATE OR DELETE ON progress.mastery_history
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER case_step_events_append_only
BEFORE UPDATE OR DELETE ON clinical.case_step_events
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();
CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON governance.audit_log
FOR EACH ROW EXECUTE FUNCTION core.reject_update_delete();

CREATE OR REPLACE FUNCTION practice.validate_answer_key_choice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.choice_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM practice.choices c
    WHERE c.id = NEW.choice_id
      AND c.question_version_id = NEW.question_version_id
  ) THEN
    RAISE EXCEPTION 'Answer choice does not belong to the question version'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER answer_key_choice_consistency
BEFORE INSERT OR UPDATE ON practice.answer_keys
FOR EACH ROW EXECUTE FUNCTION practice.validate_answer_key_choice();

CREATE OR REPLACE FUNCTION practice.grade_response(
  target_question_version_id uuid,
  response jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  question_type core.exercise_type;
  expected_ids uuid[];
  selected_ids uuid[];
  expected_order text[];
  submitted_order text[];
  expected_number numeric;
  submitted_number numeric;
  tolerance numeric;
  is_correct boolean := false;
  score numeric := 0;
BEGIN
  SELECT q.type
  INTO question_type
  FROM practice.question_versions qv
  JOIN practice.questions q ON q.id = qv.question_id
  WHERE qv.id = target_question_version_id
    AND qv.status = 'published';

  IF question_type IS NULL THEN
    RAISE EXCEPTION 'Published question version not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF question_type IN ('single_choice', 'multiple_choice', 'true_false') THEN
    SELECT COALESCE(array_agg(ak.choice_id ORDER BY ak.choice_id), ARRAY[]::uuid[])
    INTO expected_ids
    FROM practice.answer_keys ak
    WHERE ak.question_version_id = target_question_version_id
      AND ak.choice_id IS NOT NULL
      AND ak.required;

    SELECT COALESCE(array_agg(value::uuid ORDER BY value::uuid), ARRAY[]::uuid[])
    INTO selected_ids
    FROM jsonb_array_elements_text(COALESCE(response -> 'choiceIds', '[]'::jsonb)) AS value;

    is_correct := expected_ids = selected_ids;
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSIF question_type = 'ordering' THEN
    SELECT array_agg(oi.stable_key ORDER BY oi.correct_position)
    INTO expected_order
    FROM practice.ordering_items oi
    WHERE oi.question_version_id = target_question_version_id;

    SELECT array_agg(value ORDER BY ordinality)
    INTO submitted_order
    FROM jsonb_array_elements_text(COALESCE(response -> 'order', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    is_correct := expected_order = submitted_order;
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSIF question_type = 'calculation' THEN
    SELECT cr.expected_value, cr.tolerance
    INTO expected_number, tolerance
    FROM practice.calculation_rules cr
    WHERE cr.question_version_id = target_question_version_id;

    submitted_number := NULLIF(response ->> 'value', '')::numeric;
    is_correct := submitted_number IS NOT NULL
      AND abs(submitted_number - expected_number) <= tolerance;
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSIF question_type IN ('anatomy_localization', 'image_hotspot') THEN
    SELECT COALESCE(array_agg(ht.hotspot_id ORDER BY ht.hotspot_id), ARRAY[]::uuid[])
    INTO expected_ids
    FROM practice.hotspot_targets ht
    WHERE ht.question_version_id = target_question_version_id
      AND ht.required;

    SELECT COALESCE(array_agg(value::uuid ORDER BY value::uuid), ARRAY[]::uuid[])
    INTO selected_ids
    FROM jsonb_array_elements_text(COALESCE(response -> 'hotspotIds', '[]'::jsonb)) AS value;

    is_correct := expected_ids = selected_ids;
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSIF question_type = 'matching' THEN
    SELECT bool_and((response -> 'pairs' ->> mp.stable_key) = mp.right_content)
    INTO is_correct
    FROM practice.matching_pairs mp
    WHERE mp.question_version_id = target_question_version_id;
    is_correct := COALESCE(is_correct, false);
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSIF question_type = 'fill_blank' THEN
    SELECT bool_and(
      CASE
        WHEN fbs.case_sensitive THEN
          (response -> 'answers' ->> fbs.stable_key) = ANY (fbs.accepted_answers)
        ELSE
          lower(response -> 'answers' ->> fbs.stable_key) =
          ANY (SELECT lower(answer) FROM unnest(fbs.accepted_answers) AS answer)
      END
    )
    INTO is_correct
    FROM practice.fill_blank_slots fbs
    WHERE fbs.question_version_id = target_question_version_id;
    is_correct := COALESCE(is_correct, false);
    score := CASE WHEN is_correct THEN 1 ELSE 0 END;

  ELSE
    RAISE EXCEPTION 'Question type % requires a dedicated trusted grader', question_type
      USING ERRCODE = '0A000';
  END IF;

  RETURN jsonb_build_object(
    'isCorrect', is_correct,
    'score', score,
    'maxScore', 1,
    'questionVersionId', target_question_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION commerce.post_wallet_entry(
  target_user_id uuid,
  currency_code text,
  signed_amount numeric,
  reason_code text,
  source_type text,
  source_id uuid,
  idempotency_key uuid,
  correlation_id uuid
)
RETURNS commerce.wallet_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_currency commerce.currency_definitions%ROWTYPE;
  current_wallet commerce.wallets%ROWTYPE;
  existing_entry commerce.wallet_ledger%ROWTYPE;
  created_entry commerce.wallet_ledger%ROWTYPE;
  next_balance numeric;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to mutate this wallet' USING ERRCODE = '42501';
  END IF;
  IF signed_amount = 0 THEN
    RAISE EXCEPTION 'Wallet amount cannot be zero' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO existing_entry
  FROM commerce.wallet_ledger wl
  WHERE wl.user_id = target_user_id
    AND wl.idempotency_key = post_wallet_entry.idempotency_key;
  IF FOUND THEN
    RETURN existing_entry;
  END IF;

  SELECT *
  INTO STRICT target_currency
  FROM commerce.currency_definitions cd
  WHERE cd.code = currency_code AND cd.active;

  INSERT INTO commerce.wallets (user_id, currency_id)
  VALUES (target_user_id, target_currency.id)
  ON CONFLICT (user_id, currency_id) DO NOTHING;

  SELECT *
  INTO STRICT current_wallet
  FROM commerce.wallets w
  WHERE w.user_id = target_user_id
    AND w.currency_id = target_currency.id
  FOR UPDATE;

  next_balance := current_wallet.balance + signed_amount;
  IF next_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance', currency_code USING ERRCODE = '22003';
  END IF;
  IF target_currency.maximum_balance IS NOT NULL
     AND next_balance > target_currency.maximum_balance THEN
    RAISE EXCEPTION 'Maximum % balance exceeded', currency_code USING ERRCODE = '22003';
  END IF;

  UPDATE commerce.wallets
  SET balance = next_balance,
      lifetime_earned = lifetime_earned + GREATEST(signed_amount, 0),
      lifetime_spent = lifetime_spent + GREATEST(-signed_amount, 0),
      server_revision = server_revision + 1
  WHERE user_id = target_user_id
    AND currency_id = target_currency.id;

  INSERT INTO commerce.wallet_ledger (
    idempotency_key, user_id, currency_id, direction, amount,
    balance_before, balance_after, reason_code, source_type,
    source_id, correlation_id
  )
  VALUES (
    idempotency_key, target_user_id, target_currency.id,
    CASE WHEN signed_amount > 0 THEN 'credit'::core.ledger_direction
         ELSE 'debit'::core.ledger_direction END,
    abs(signed_amount), current_wallet.balance, next_balance,
    reason_code, source_type, source_id, correlation_id
  )
  RETURNING * INTO created_entry;

  RETURN created_entry;
END;
$$;

CREATE OR REPLACE FUNCTION commerce.adjust_inventory(
  target_user_id uuid,
  item_code text,
  quantity_delta integer,
  reason_code text,
  source_type text,
  source_id uuid,
  idempotency_key uuid,
  correlation_id uuid
)
RETURNS commerce.inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_item commerce.catalog_items%ROWTYPE;
  current_inventory commerce.inventory%ROWTYPE;
  existing_event commerce.inventory_events%ROWTYPE;
  before_quantity integer := 0;
  after_quantity integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to mutate this inventory' USING ERRCODE = '42501';
  END IF;
  IF quantity_delta = 0 THEN
    RAISE EXCEPTION 'Inventory delta cannot be zero' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO existing_event
  FROM commerce.inventory_events ie
  WHERE ie.user_id = target_user_id
    AND ie.idempotency_key = adjust_inventory.idempotency_key;
  IF FOUND THEN
    SELECT * INTO STRICT current_inventory
    FROM commerce.inventory i
    WHERE i.user_id = target_user_id AND i.item_id = existing_event.item_id;
    RETURN current_inventory;
  END IF;

  SELECT *
  INTO STRICT target_item
  FROM commerce.catalog_items ci
  WHERE ci.code = item_code AND ci.status = 'published';

  SELECT *
  INTO current_inventory
  FROM commerce.inventory i
  WHERE i.user_id = target_user_id AND i.item_id = target_item.id
  FOR UPDATE;

  IF FOUND THEN
    before_quantity := current_inventory.quantity;
  END IF;
  after_quantity := before_quantity + quantity_delta;

  IF after_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory quantity' USING ERRCODE = '22003';
  END IF;
  IF NOT target_item.stackable AND after_quantity > 1 THEN
    after_quantity := 1;
    quantity_delta := 1 - before_quantity;
  END IF;

  INSERT INTO commerce.inventory (user_id, item_id, quantity)
  VALUES (target_user_id, target_item.id, after_quantity)
  ON CONFLICT (user_id, item_id) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      server_revision = commerce.inventory.server_revision + 1
  RETURNING * INTO current_inventory;

  IF quantity_delta <> 0 THEN
    INSERT INTO commerce.inventory_events (
      idempotency_key, user_id, item_id, quantity_delta,
      quantity_before, quantity_after, reason_code, source_type,
      source_id, correlation_id
    )
    VALUES (
      idempotency_key, target_user_id, target_item.id, quantity_delta,
      before_quantity, after_quantity, reason_code, source_type,
      source_id, correlation_id
    );
  END IF;

  RETURN current_inventory;
END;
$$;

CREATE OR REPLACE FUNCTION gamification.post_xp(
  target_user_id uuid,
  amount integer,
  reason_code text,
  source_type text,
  source_id uuid,
  idempotency_key uuid,
  reward_grant_id uuid DEFAULT NULL
)
RETURNS gamification.xp_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  state_row progress.user_learning_state%ROWTYPE;
  existing_entry gamification.xp_ledger%ROWTYPE;
  created_entry gamification.xp_ledger%ROWTYPE;
  next_total bigint;
  next_level integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to mutate XP' USING ERRCODE = '42501';
  END IF;
  IF amount = 0 THEN
    RAISE EXCEPTION 'XP amount cannot be zero' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO existing_entry
  FROM gamification.xp_ledger xl
  WHERE xl.user_id = target_user_id
    AND xl.idempotency_key = post_xp.idempotency_key;
  IF FOUND THEN
    RETURN existing_entry;
  END IF;

  INSERT INTO progress.user_learning_state (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO STRICT state_row
  FROM progress.user_learning_state uls
  WHERE uls.user_id = target_user_id
  FOR UPDATE;

  next_total := state_row.total_xp + amount;
  IF next_total < 0 THEN
    RAISE EXCEPTION 'XP cannot become negative' USING ERRCODE = '22003';
  END IF;

  SELECT COALESCE(max(l.level), 1)
  INTO next_level
  FROM gamification.levels l
  WHERE l.minimum_total_xp <= next_total;

  UPDATE progress.user_learning_state
  SET total_xp = next_total,
      current_level = next_level,
      daily_xp = CASE
        WHEN daily_xp_date = current_date THEN daily_xp + GREATEST(amount, 0)
        ELSE GREATEST(amount, 0)
      END,
      daily_xp_date = current_date,
      server_revision = server_revision + 1
  WHERE user_id = target_user_id;

  INSERT INTO gamification.xp_ledger (
    idempotency_key, user_id, amount, total_before, total_after,
    reason_code, source_type, source_id, reward_grant_id
  )
  VALUES (
    idempotency_key, target_user_id, amount, state_row.total_xp, next_total,
    reason_code, source_type, source_id, reward_grant_id
  )
  RETURNING * INTO created_entry;

  RETURN created_entry;
END;
$$;

CREATE OR REPLACE FUNCTION gamification.grant_reward_bundle(
  target_user_id uuid,
  reward_bundle_code text,
  source_type text,
  source_id uuid,
  idempotency_key uuid
)
RETURNS gamification.reward_grants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  bundle_row gamification.reward_bundles%ROWTYPE;
  grant_row gamification.reward_grants%ROWTYPE;
  component record;
  correlation uuid := extensions.gen_random_uuid();
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to grant rewards' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO grant_row
  FROM gamification.reward_grants rg
  WHERE rg.user_id = target_user_id
    AND rg.idempotency_key = grant_reward_bundle.idempotency_key;
  IF FOUND THEN
    RETURN grant_row;
  END IF;

  SELECT *
  INTO STRICT bundle_row
  FROM gamification.reward_bundles rb
  WHERE rb.code = reward_bundle_code
    AND rb.status = 'published';

  INSERT INTO gamification.reward_grants (
    idempotency_key, user_id, reward_bundle_id, source_type,
    source_id, correlation_id, payload_snapshot
  )
  SELECT
    idempotency_key, target_user_id, bundle_row.id, source_type,
    source_id, correlation,
    jsonb_build_object(
      'bundleCode', bundle_row.code,
      'components', COALESCE(jsonb_agg(to_jsonb(rc) ORDER BY rc.id), '[]'::jsonb)
    )
  FROM gamification.reward_components rc
  WHERE rc.reward_bundle_id = bundle_row.id
  RETURNING * INTO grant_row;

  FOR component IN
    SELECT
      rc.*,
      cd.code AS currency_code,
      ci.code AS item_code,
      ct.id AS resolved_chest_type_id
    FROM gamification.reward_components rc
    LEFT JOIN commerce.currency_definitions cd ON cd.id = rc.currency_id
    LEFT JOIN commerce.catalog_items ci ON ci.id = rc.item_id
    LEFT JOIN commerce.chest_types ct ON ct.id = rc.chest_type_id
    WHERE rc.reward_bundle_id = bundle_row.id
    ORDER BY rc.id
  LOOP
    IF component.reward_kind IN ('currency', 'energy') THEN
      PERFORM commerce.post_wallet_entry(
        target_user_id, component.currency_code, component.quantity,
        'reward_bundle', source_type, source_id,
        extensions.uuid_generate_v5(idempotency_key, component.id::text),
        correlation
      );
    ELSIF component.reward_kind = 'item' THEN
      PERFORM commerce.adjust_inventory(
        target_user_id, component.item_code, component.quantity::integer,
        'reward_bundle', source_type, source_id,
        extensions.uuid_generate_v5(idempotency_key, component.id::text),
        correlation
      );
    ELSIF component.reward_kind = 'xp' THEN
      PERFORM gamification.post_xp(
        target_user_id, component.quantity::integer, 'reward_bundle',
        source_type, source_id,
        extensions.uuid_generate_v5(idempotency_key, component.id::text),
        grant_row.id
      );
    ELSIF component.reward_kind = 'badge' THEN
      INSERT INTO gamification.user_badges (user_id, badge_id, source_type, source_id)
      VALUES (target_user_id, component.badge_id, source_type, source_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    ELSIF component.reward_kind = 'title' THEN
      INSERT INTO gamification.user_titles (user_id, title_id, source_type, source_id)
      VALUES (target_user_id, component.title_id, source_type, source_id)
      ON CONFLICT (user_id, title_id) DO NOTHING;
    ELSIF component.reward_kind = 'chest' THEN
      INSERT INTO commerce.chest_instances (
        user_id, chest_type_id, source_type, source_id
      )
      VALUES (
        target_user_id, component.resolved_chest_type_id, source_type, source_id
      );
    ELSIF component.reward_kind = 'premium_entitlement' THEN
      INSERT INTO commerce.user_entitlements (
        user_id, entitlement_id, source_type, source_id, metadata
      )
      VALUES (
        target_user_id, component.entitlement_id, source_type, source_id,
        component.metadata
      );
    END IF;
  END LOOP;

  UPDATE gamification.reward_grants
  SET status = 'granted', granted_at = now()
  WHERE id = grant_row.id
  RETURNING * INTO grant_row;

  RETURN grant_row;
END;
$$;

CREATE OR REPLACE FUNCTION commerce.purchase_catalog_item(
  item_code text,
  currency_code text,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  item_row commerce.catalog_items%ROWTYPE;
  currency_row commerce.currency_definitions%ROWTYPE;
  price_row commerce.catalog_prices%ROWTYPE;
  order_row commerce.purchase_orders%ROWTYPE;
  inventory_row commerce.inventory%ROWTYPE;
  correlation uuid := extensions.gen_random_uuid();
  child_key uuid;
  chest_type_row commerce.chest_types%ROWTYPE;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO order_row
  FROM commerce.purchase_orders po
  WHERE po.user_id = target_user_id
    AND po.idempotency_key = purchase_catalog_item.idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'orderId', order_row.id,
      'status', order_row.status,
      'idempotentReplay', true
    );
  END IF;

  SELECT *
  INTO STRICT item_row
  FROM commerce.catalog_items ci
  WHERE ci.code = item_code AND ci.status = 'published';

  IF item_row.premium_only AND NOT EXISTS (
    SELECT 1
    FROM commerce.user_entitlements ue
    JOIN commerce.entitlement_definitions ed ON ed.id = ue.entitlement_id
    WHERE ue.user_id = target_user_id
      AND ed.code = 'premium'
      AND ue.revoked_at IS NULL
      AND ue.starts_at <= now()
      AND (ue.expires_at IS NULL OR ue.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Premium entitlement required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO STRICT currency_row
  FROM commerce.currency_definitions cd
  WHERE cd.code = currency_code AND cd.active;

  SELECT *
  INTO STRICT price_row
  FROM commerce.catalog_prices cp
  WHERE cp.item_id = item_row.id
    AND cp.currency_id = currency_row.id
    AND cp.active
    AND cp.valid_from <= now()
    AND (cp.valid_until IS NULL OR cp.valid_until > now())
  ORDER BY cp.valid_from DESC
  LIMIT 1;

  INSERT INTO commerce.purchase_orders (
    idempotency_key, user_id, order_type, status, correlation_id
  )
  VALUES (
    idempotency_key, target_user_id, 'virtual_currency', 'pending', correlation
  )
  RETURNING * INTO order_row;

  INSERT INTO commerce.purchase_order_lines (
    order_id, item_id, quantity, unit_amount, currency_id
  )
  VALUES (order_row.id, item_row.id, 1, price_row.amount, currency_row.id);

  child_key := extensions.uuid_generate_v5(idempotency_key, 'wallet-debit');
  PERFORM commerce.post_wallet_entry(
    target_user_id, currency_code, -price_row.amount,
    'catalog_purchase', 'purchase_order', order_row.id,
    child_key, correlation
  );

  child_key := extensions.uuid_generate_v5(idempotency_key, 'inventory-credit');
  inventory_row := commerce.adjust_inventory(
    target_user_id, item_code, 1,
    'catalog_purchase', 'purchase_order', order_row.id,
    child_key, correlation
  );

  IF item_row.item_type = 'chest' THEN
    SELECT *
    INTO STRICT chest_type_row
    FROM commerce.chest_types ct
    WHERE ct.inventory_item_id = item_row.id
      AND ct.status = 'published';

    INSERT INTO commerce.chest_instances (
      user_id, chest_type_id, inventory_id, source_type, source_id
    )
    VALUES (
      target_user_id, chest_type_row.id, inventory_row.id,
      'purchase_order', order_row.id
    );
  END IF;

  UPDATE commerce.purchase_orders
  SET status = 'fulfilled', completed_at = now()
  WHERE id = order_row.id
  RETURNING * INTO order_row;

  RETURN jsonb_build_object(
    'orderId', order_row.id,
    'status', order_row.status,
    'itemCode', item_row.code,
    'price', price_row.amount,
    'currencyCode', currency_code,
    'balance', (
      SELECT w.balance
      FROM commerce.wallets w
      WHERE w.user_id = target_user_id AND w.currency_id = currency_row.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION commerce.open_chest(
  target_chest_instance_id uuid,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  instance_row commerce.chest_instances%ROWTYPE;
  chest_type_row commerce.chest_types%ROWTYPE;
  loot_table_row commerce.loot_tables%ROWTYPE;
  opening_row commerce.chest_openings%ROWTYPE;
  grant_row gamification.reward_grants%ROWTYPE;
  loot_entry commerce.loot_table_entries%ROWTYPE;
  granted_reward record;
  position_number integer := 0;
  target_reward_count integer;
  reward_quantity numeric;
  nonce text := encode(extensions.gen_random_bytes(32), 'hex');
  correlation uuid := extensions.gen_random_uuid();
  child_key uuid;
  rewards jsonb := '[]'::jsonb;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO opening_row
  FROM commerce.chest_openings co
  WHERE co.user_id = target_user_id
    AND co.idempotency_key = open_chest.idempotency_key;
  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(cr.reward_snapshot ORDER BY cr.position), '[]'::jsonb)
    INTO rewards
    FROM commerce.chest_rewards cr
    WHERE cr.chest_opening_id = opening_row.id;
    RETURN jsonb_build_object(
      'openingId', opening_row.id,
      'rewards', rewards,
      'idempotentReplay', true
    );
  END IF;

  SELECT *
  INTO STRICT instance_row
  FROM commerce.chest_instances ci
  WHERE ci.id = target_chest_instance_id
    AND ci.user_id = target_user_id
  FOR UPDATE;

  IF instance_row.opened_at IS NOT NULL THEN
    RAISE EXCEPTION 'Chest has already been opened' USING ERRCODE = '55000';
  END IF;
  IF instance_row.available_at > now() THEN
    RAISE EXCEPTION 'Chest is not available yet' USING ERRCODE = '55000';
  END IF;
  IF instance_row.expires_at IS NOT NULL AND instance_row.expires_at <= now() THEN
    RAISE EXCEPTION 'Chest has expired' USING ERRCODE = '55000';
  END IF;

  SELECT *
  INTO STRICT chest_type_row
  FROM commerce.chest_types ct
  WHERE ct.id = instance_row.chest_type_id AND ct.status = 'published';

  SELECT *
  INTO STRICT loot_table_row
  FROM commerce.loot_tables lt
  WHERE lt.chest_type_id = chest_type_row.id
    AND lt.status = 'published'
    AND lt.valid_from <= now()
    AND (lt.valid_until IS NULL OR lt.valid_until > now())
  ORDER BY lt.version_number DESC
  LIMIT 1;

  INSERT INTO gamification.reward_grants (
    idempotency_key, user_id, source_type, source_id,
    correlation_id, status, payload_snapshot
  )
  VALUES (
    extensions.uuid_generate_v5(idempotency_key, 'reward-grant'),
    target_user_id, 'chest_opening', target_chest_instance_id,
    correlation, 'pending',
    jsonb_build_object(
      'chestType', chest_type_row.code,
      'lootTableId', loot_table_row.id,
      'lootTableVersion', loot_table_row.version_number
    )
  )
  RETURNING * INTO grant_row;

  INSERT INTO commerce.chest_openings (
    idempotency_key, user_id, chest_instance_id, loot_table_id,
    random_seed_hash, server_nonce, reward_grant_id
  )
  VALUES (
    idempotency_key, target_user_id, instance_row.id, loot_table_row.id,
    encode(extensions.digest(nonce, 'sha256'), 'hex'), nonce, grant_row.id
  )
  RETURNING * INTO opening_row;

  target_reward_count := floor(
    random() * (
      chest_type_row.max_reward_count - chest_type_row.min_reward_count + 1
    ) + chest_type_row.min_reward_count
  )::integer;

  FOR loot_entry IN
    SELECT lte.*
    FROM commerce.loot_table_entries lte
    WHERE lte.loot_table_id = loot_table_row.id
      AND lte.guaranteed
    ORDER BY lte.id
    LIMIT chest_type_row.guaranteed_reward_count
  LOOP
    position_number := position_number + 1;
    reward_quantity := floor(
      random() * (loot_entry.max_quantity - loot_entry.min_quantity + 1)
      + loot_entry.min_quantity
    );

    INSERT INTO commerce.chest_rewards (
      chest_opening_id, loot_entry_id, reward_kind, quantity,
      currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id,
      rarity, reward_snapshot, position
    )
    VALUES (
      opening_row.id, loot_entry.id, loot_entry.reward_kind, reward_quantity,
      loot_entry.currency_id, loot_entry.item_id, loot_entry.badge_id,
      loot_entry.title_id, loot_entry.chest_type_id, loot_entry.entitlement_id,
      loot_entry.rarity,
      jsonb_build_object(
        'kind', loot_entry.reward_kind,
        'quantity', reward_quantity,
        'rarity', loot_entry.rarity
      ),
      position_number
    );
  END LOOP;

  WHILE position_number < target_reward_count LOOP
    SELECT lte.*
    INTO STRICT loot_entry
    FROM commerce.loot_table_entries lte
    WHERE lte.loot_table_id = loot_table_row.id
      AND NOT lte.guaranteed
    ORDER BY -ln(GREATEST(random(), 0.000000000001)) / lte.weight
    LIMIT 1;

    position_number := position_number + 1;
    reward_quantity := floor(
      random() * (loot_entry.max_quantity - loot_entry.min_quantity + 1)
      + loot_entry.min_quantity
    );

    INSERT INTO commerce.chest_rewards (
      chest_opening_id, loot_entry_id, reward_kind, quantity,
      currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id,
      rarity, reward_snapshot, position
    )
    VALUES (
      opening_row.id, loot_entry.id, loot_entry.reward_kind, reward_quantity,
      loot_entry.currency_id, loot_entry.item_id, loot_entry.badge_id,
      loot_entry.title_id, loot_entry.chest_type_id, loot_entry.entitlement_id,
      loot_entry.rarity,
      jsonb_build_object(
        'kind', loot_entry.reward_kind,
        'quantity', reward_quantity,
        'rarity', loot_entry.rarity
      ),
      position_number
    );
  END LOOP;

  FOR granted_reward IN
    SELECT cr.position, cr.quantity, lte.*
    FROM commerce.chest_rewards cr
    JOIN commerce.loot_table_entries lte ON lte.id = cr.loot_entry_id
    WHERE cr.chest_opening_id = opening_row.id
    ORDER BY cr.position
  LOOP
    child_key := extensions.uuid_generate_v5(
      idempotency_key,
      'loot-' || granted_reward.id::text || '-' || granted_reward.position::text
    );
    reward_quantity := granted_reward.quantity;

    IF granted_reward.reward_kind IN ('currency', 'energy') THEN
      PERFORM commerce.post_wallet_entry(
        target_user_id,
        (SELECT code FROM commerce.currency_definitions WHERE id = granted_reward.currency_id),
        reward_quantity, 'chest_reward', 'chest_opening', opening_row.id,
        child_key, correlation
      );
    ELSIF granted_reward.reward_kind = 'item' THEN
      PERFORM commerce.adjust_inventory(
        target_user_id,
        (SELECT code FROM commerce.catalog_items WHERE id = granted_reward.item_id),
        reward_quantity::integer, 'chest_reward', 'chest_opening',
        opening_row.id, child_key, correlation
      );
    ELSIF granted_reward.reward_kind = 'xp' THEN
      PERFORM gamification.post_xp(
        target_user_id, reward_quantity::integer, 'chest_reward',
        'chest_opening', opening_row.id, child_key, grant_row.id
      );
    ELSIF granted_reward.reward_kind = 'badge' THEN
      INSERT INTO gamification.user_badges (user_id, badge_id, source_type, source_id)
      VALUES (target_user_id, granted_reward.badge_id, 'chest_opening', opening_row.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    ELSIF granted_reward.reward_kind = 'title' THEN
      INSERT INTO gamification.user_titles (user_id, title_id, source_type, source_id)
      VALUES (target_user_id, granted_reward.title_id, 'chest_opening', opening_row.id)
      ON CONFLICT (user_id, title_id) DO NOTHING;
    ELSIF granted_reward.reward_kind = 'chest' THEN
      INSERT INTO commerce.chest_instances (
        user_id, chest_type_id, source_type, source_id
      )
      VALUES (
        target_user_id, granted_reward.chest_type_id, 'chest_opening', opening_row.id
      );
    ELSIF granted_reward.reward_kind = 'premium_entitlement' THEN
      INSERT INTO commerce.user_entitlements (
        user_id, entitlement_id, source_type, source_id
      )
      VALUES (
        target_user_id, granted_reward.entitlement_id,
        'chest_opening', opening_row.id
      );
    END IF;
  END LOOP;

  IF instance_row.inventory_id IS NOT NULL THEN
    PERFORM commerce.adjust_inventory(
      target_user_id,
      (
        SELECT ci.code
        FROM commerce.inventory i
        JOIN commerce.catalog_items ci ON ci.id = i.item_id
        WHERE i.id = instance_row.inventory_id
      ),
      -1, 'chest_opened', 'chest_opening', opening_row.id,
      extensions.uuid_generate_v5(idempotency_key, 'consume-chest'),
      correlation
    );
  END IF;

  UPDATE commerce.chest_instances
  SET opened_at = opening_row.opened_at
  WHERE id = instance_row.id;

  SELECT COALESCE(jsonb_agg(cr.reward_snapshot ORDER BY cr.position), '[]'::jsonb)
  INTO rewards
  FROM commerce.chest_rewards cr
  WHERE cr.chest_opening_id = opening_row.id;

  UPDATE gamification.reward_grants
  SET status = 'granted',
      granted_at = now(),
      payload_snapshot = payload_snapshot || jsonb_build_object('rewards', rewards)
  WHERE id = grant_row.id;

  RETURN jsonb_build_object(
    'openingId', opening_row.id,
    'chestType', chest_type_row.code,
    'lootTableVersion', loot_table_row.version_number,
    'rewards', rewards
  );
END;
$$;

CREATE OR REPLACE FUNCTION gamification.claim_daily_reward(
  calendar_code text,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  calendar_row gamification.daily_reward_calendars%ROWTYPE;
  preference_timezone text;
  local_reward_date date;
  last_claim gamification.daily_reward_claims%ROWTYPE;
  target_day integer;
  bundle_code text;
  grant_row gamification.reward_grants%ROWTYPE;
  claim_row gamification.daily_reward_claims%ROWTYPE;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT timezone
  INTO preference_timezone
  FROM iam.user_accounts
  WHERE user_id = target_user_id;
  preference_timezone := COALESCE(preference_timezone, 'Europe/Paris');
  local_reward_date := (now() AT TIME ZONE preference_timezone)::date;

  SELECT drc.*
  INTO claim_row
  FROM gamification.daily_reward_claims drc
  JOIN gamification.daily_reward_calendars cal ON cal.id = drc.calendar_id
  WHERE drc.user_id = target_user_id
    AND cal.code = calendar_code
    AND drc.local_reward_date = local_reward_date;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimId', claim_row.id,
      'dayNumber', claim_row.day_number,
      'idempotentReplay', true
    );
  END IF;

  SELECT *
  INTO STRICT calendar_row
  FROM gamification.daily_reward_calendars drc
  WHERE drc.code = calendar_code AND drc.status = 'published';

  SELECT *
  INTO last_claim
  FROM gamification.daily_reward_claims drc
  WHERE drc.user_id = target_user_id
    AND drc.calendar_id = calendar_row.id
  ORDER BY drc.local_reward_date DESC
  LIMIT 1;

  target_day := CASE
    WHEN last_claim.id IS NULL THEN 1
    WHEN last_claim.local_reward_date = local_reward_date - 1
      THEN (last_claim.day_number % calendar_row.cycle_length_days) + 1
    ELSE 1
  END;

  SELECT rb.code
  INTO STRICT bundle_code
  FROM gamification.daily_reward_steps drs
  JOIN gamification.reward_bundles rb ON rb.id = drs.reward_bundle_id
  WHERE drs.calendar_id = calendar_row.id
    AND drs.day_number = target_day;

  grant_row := gamification.grant_reward_bundle(
    target_user_id, bundle_code, 'daily_reward', calendar_row.id,
    extensions.uuid_generate_v5(idempotency_key, 'reward-grant')
  );

  INSERT INTO gamification.daily_reward_claims (
    user_id, calendar_id, local_reward_date, day_number,
    reward_grant_id, timezone
  )
  VALUES (
    target_user_id, calendar_row.id, local_reward_date, target_day,
    grant_row.id, preference_timezone
  )
  RETURNING * INTO claim_row;

  RETURN jsonb_build_object(
    'claimId', claim_row.id,
    'dayNumber', claim_row.day_number,
    'rewardGrantId', grant_row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION progress.record_question_response(
  target_exercise_attempt_id uuid,
  target_question_version_id uuid,
  client_response_id uuid,
  response jsonb,
  presented_choice_order uuid[],
  response_time_ms integer,
  hint_count integer DEFAULT 0
)
RETURNS progress.question_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  grade jsonb;
  created_attempt progress.question_attempts%ROWTYPE;
  choice_text text;
  selection_order integer := 0;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM progress.exercise_attempts ea
    JOIN progress.lesson_attempts la ON la.id = ea.lesson_attempt_id
    WHERE ea.id = target_exercise_attempt_id
      AND la.user_id = target_user_id
      AND ea.status IN ('started', 'paused')
  ) THEN
    RAISE EXCEPTION 'Open exercise attempt not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO created_attempt
  FROM progress.question_attempts qa
  WHERE qa.user_id = target_user_id
    AND qa.client_response_id = record_question_response.client_response_id;
  IF FOUND THEN
    RETURN created_attempt;
  END IF;

  grade := practice.grade_response(target_question_version_id, response);

  INSERT INTO progress.question_attempts (
    client_response_id, exercise_attempt_id, user_id, question_version_id,
    presented_choice_order, response_payload, is_correct, score, max_score,
    response_time_ms, hint_count
  )
  VALUES (
    client_response_id, target_exercise_attempt_id, target_user_id,
    target_question_version_id, COALESCE(presented_choice_order, ARRAY[]::uuid[]),
    response, (grade ->> 'isCorrect')::boolean,
    (grade ->> 'score')::numeric, (grade ->> 'maxScore')::numeric,
    response_time_ms, hint_count
  )
  RETURNING * INTO created_attempt;

  FOR choice_text IN
    SELECT value
    FROM jsonb_array_elements_text(COALESCE(response -> 'choiceIds', '[]'::jsonb))
  LOOP
    selection_order := selection_order + 1;
    INSERT INTO progress.selected_choices (
      question_attempt_id, choice_id, selection_order
    )
    VALUES (created_attempt.id, choice_text::uuid, selection_order);
  END LOOP;

  IF NOT created_attempt.is_correct THEN
    INSERT INTO progress.mistakes (
      user_id, question_attempt_id, question_id, mistake_kind, competency_ids
    )
    SELECT
      target_user_id,
      created_attempt.id,
      qv.question_id,
      'unknown',
      COALESCE(array_agg(qc.competency_id) FILTER (WHERE qc.competency_id IS NOT NULL), ARRAY[]::uuid[])
    FROM practice.question_versions qv
    LEFT JOIN practice.question_competencies qc
      ON qc.question_version_id = qv.id
    WHERE qv.id = target_question_version_id
    GROUP BY qv.question_id;
  END IF;

  RETURN created_attempt;
END;
$$;

CREATE OR REPLACE FUNCTION progress.complete_lesson_attempt(
  target_lesson_attempt_id uuid,
  completion_idempotency_key uuid
)
RETURNS progress.lesson_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  attempt_row progress.lesson_attempts%ROWTYPE;
  score_sum numeric;
  max_score_sum numeric;
  final_accuracy numeric(5,2);
  passing_score numeric(5,2);
  base_xp integer;
  passed boolean;
  awarded_xp integer;
  awarded_stars smallint;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO STRICT attempt_row
  FROM progress.lesson_attempts la
  WHERE la.id = target_lesson_attempt_id
    AND la.user_id = target_user_id
  FOR UPDATE;

  IF attempt_row.status = 'completed' THEN
    RETURN attempt_row;
  END IF;
  IF attempt_row.status NOT IN ('started', 'paused', 'submitted') THEN
    RAISE EXCEPTION 'Attempt cannot be completed from status %', attempt_row.status
      USING ERRCODE = '55000';
  END IF;

  SELECT COALESCE(sum(qa.score), 0), COALESCE(sum(qa.max_score), 0)
  INTO score_sum, max_score_sum
  FROM progress.question_attempts qa
  JOIN progress.exercise_attempts ea ON ea.id = qa.exercise_attempt_id
  WHERE ea.lesson_attempt_id = target_lesson_attempt_id;

  IF max_score_sum <= 0 THEN
    RAISE EXCEPTION 'Attempt has no gradable responses' USING ERRCODE = '22023';
  END IF;

  SELECT lv.passing_score, lv.xp_reward
  INTO STRICT passing_score, base_xp
  FROM learning.lesson_versions lv
  WHERE lv.id = attempt_row.lesson_version_id;

  final_accuracy := round((score_sum / max_score_sum) * 100, 2);
  passed := final_accuracy >= passing_score;
  awarded_stars := CASE
    WHEN final_accuracy >= 95 THEN 3
    WHEN final_accuracy >= 85 THEN 2
    WHEN passed THEN 1
    ELSE 0
  END;
  awarded_xp := CASE WHEN passed THEN base_xp ELSE greatest(base_xp / 5, 0) END;

  UPDATE progress.lesson_attempts
  SET status = 'completed',
      submitted_at = COALESCE(submitted_at, now()),
      completed_at = now(),
      score = score_sum,
      accuracy = final_accuracy,
      stars = awarded_stars,
      xp_awarded = awarded_xp,
      duration_seconds = greatest(
        0, extract(epoch FROM (now() - started_at))::integer
      )
  WHERE id = target_lesson_attempt_id
  RETURNING * INTO attempt_row;

  INSERT INTO progress.lesson_progress (
    user_id, lesson_id, state, unlocked_at, first_started_at, completed_at,
    best_score, best_stars, attempt_count, successful_attempt_count,
    total_time_seconds, last_attempt_at, current_lesson_version_id, server_revision
  )
  VALUES (
    target_user_id, attempt_row.lesson_id,
    CASE WHEN passed THEN 'mastered'::core.mastery_state ELSE 'practicing'::core.mastery_state END,
    attempt_row.started_at, attempt_row.started_at,
    CASE WHEN passed THEN attempt_row.completed_at ELSE NULL END,
    final_accuracy, awarded_stars, 1, CASE WHEN passed THEN 1 ELSE 0 END,
    attempt_row.duration_seconds, attempt_row.completed_at,
    attempt_row.lesson_version_id, 1
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET state = CASE
        WHEN EXCLUDED.state = 'mastered' THEN 'mastered'::core.mastery_state
        ELSE progress.lesson_progress.state
      END,
      first_started_at = COALESCE(progress.lesson_progress.first_started_at, EXCLUDED.first_started_at),
      completed_at = COALESCE(progress.lesson_progress.completed_at, EXCLUDED.completed_at),
      best_score = greatest(progress.lesson_progress.best_score, EXCLUDED.best_score),
      best_stars = greatest(progress.lesson_progress.best_stars, EXCLUDED.best_stars),
      attempt_count = progress.lesson_progress.attempt_count + 1,
      successful_attempt_count = progress.lesson_progress.successful_attempt_count
        + CASE WHEN passed THEN 1 ELSE 0 END,
      total_time_seconds = progress.lesson_progress.total_time_seconds + EXCLUDED.total_time_seconds,
      last_attempt_at = EXCLUDED.last_attempt_at,
      current_lesson_version_id = EXCLUDED.current_lesson_version_id,
      server_revision = progress.lesson_progress.server_revision + 1;

  INSERT INTO progress.completion_records (
    user_id, content_kind, lesson_id, score, stars, passed, evidence
  )
  VALUES (
    target_user_id, 'lesson', attempt_row.lesson_id,
    final_accuracy, awarded_stars, passed,
    jsonb_build_object(
      'lessonAttemptId', attempt_row.id,
      'lessonVersionId', attempt_row.lesson_version_id
    )
  );

  IF awarded_xp > 0 THEN
    PERFORM gamification.post_xp(
      target_user_id, awarded_xp, 'lesson_completion',
      'lesson_attempt', attempt_row.id, completion_idempotency_key, NULL
    );
  END IF;

  RETURN attempt_row;
END;
$$;

CREATE OR REPLACE FUNCTION operations.record_sync_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
  row_data jsonb;
  key_data jsonb := '{}'::jsonb;
  key_name text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  owner_id := (row_data ->> 'user_id')::uuid;
  FOREACH key_name IN ARRAY TG_ARGV LOOP
    key_data := key_data || jsonb_build_object(key_name, row_data -> key_name);
  END LOOP;

  INSERT INTO operations.sync_changes (
    user_id, entity_type, entity_key, operation, payload, expires_at
  )
  VALUES (
    owner_id,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    key_data,
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    now() + interval '90 days'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_user_learning_state
AFTER INSERT OR UPDATE OR DELETE ON progress.user_learning_state
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id');
CREATE TRIGGER sync_lesson_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.lesson_progress
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id', 'lesson_id');
CREATE TRIGGER sync_path_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.path_progress
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id', 'path_id');
CREATE TRIGGER sync_block_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.block_progress
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id', 'block_id');
CREATE TRIGGER sync_review_items
AFTER INSERT OR UPDATE OR DELETE ON progress.review_items
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id', 'flashcard_id');
CREATE TRIGGER sync_wallets
AFTER INSERT OR UPDATE OR DELETE ON commerce.wallets
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('user_id', 'currency_id');
CREATE TRIGGER sync_inventory
AFTER INSERT OR UPDATE OR DELETE ON commerce.inventory
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('id');
CREATE TRIGGER sync_in_app_notifications
AFTER INSERT OR UPDATE OR DELETE ON engagement.in_app_notifications
FOR EACH ROW EXECUTE FUNCTION operations.record_sync_change('id');

CREATE OR REPLACE FUNCTION operations.broadcast_user_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_data jsonb :=
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  owner_id uuid := (row_data ->> 'user_id')::uuid;
BEGIN
  IF owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.broadcast_changes(
    'user:' || owner_id::text || ':state',
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN NULL;
END;
$$;

-- The api schema is the only Data API schema exposed to mobile clients.
-- These SECURITY INVOKER wrappers form a stable RPC contract while the
-- SECURITY DEFINER implementations remain in non-exposed domain schemas.
CREATE OR REPLACE FUNCTION api.record_question_response(
  target_exercise_attempt_id uuid,
  target_question_version_id uuid,
  client_response_id uuid,
  response jsonb,
  presented_choice_order uuid[],
  response_time_ms integer,
  hint_count integer DEFAULT 0
)
RETURNS progress.question_attempts
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT progress.record_question_response(
    target_exercise_attempt_id,
    target_question_version_id,
    client_response_id,
    response,
    presented_choice_order,
    response_time_ms,
    hint_count
  );
$$;

CREATE OR REPLACE FUNCTION api.complete_lesson_attempt(
  target_lesson_attempt_id uuid,
  completion_idempotency_key uuid
)
RETURNS progress.lesson_attempts
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT progress.complete_lesson_attempt(
    target_lesson_attempt_id,
    completion_idempotency_key
  );
$$;

CREATE OR REPLACE FUNCTION api.purchase_catalog_item(
  item_code text,
  currency_code text,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT commerce.purchase_catalog_item(
    item_code,
    currency_code,
    idempotency_key
  );
$$;

CREATE OR REPLACE FUNCTION api.open_chest(
  target_chest_instance_id uuid,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT commerce.open_chest(target_chest_instance_id, idempotency_key);
$$;

CREATE OR REPLACE FUNCTION api.claim_daily_reward(
  calendar_code text,
  idempotency_key uuid
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT gamification.claim_daily_reward(calendar_code, idempotency_key);
$$;

CREATE OR REPLACE VIEW api.published_curriculum
WITH (security_invoker = true)
AS
SELECT
  f.id AS formation_id,
  f.stable_key AS formation_key,
  f.title AS formation_title,
  fv.id AS formation_version_id,
  b.id AS block_id,
  b.stable_key AS block_key,
  b.title AS block_title,
  b.position AS block_position,
  p.id AS path_id,
  p.stable_key AS path_key,
  p.title AS path_title,
  p.position AS path_position,
  l.id AS lesson_id,
  l.stable_key AS lesson_key,
  l.kind AS lesson_kind,
  l.position AS lesson_position,
  lv.id AS lesson_version_id,
  lv.title AS lesson_title,
  lv.summary,
  lv.difficulty,
  lv.estimated_minutes,
  lv.passing_score,
  lv.xp_reward,
  lv.selection_config
FROM learning.formations f
JOIN learning.formation_versions fv ON fv.id = f.current_version_id
JOIN learning.blocks b ON b.formation_version_id = fv.id
JOIN learning.paths p ON p.block_id = b.id
JOIN learning.lessons l ON l.path_id = p.id
JOIN learning.lesson_versions lv ON lv.id = l.current_version_id
WHERE f.status = 'published'
  AND fv.status = 'published'
  AND b.status = 'published'
  AND p.status = 'published'
  AND l.status = 'published'
  AND lv.status = 'published';
COMMENT ON VIEW api.published_curriculum IS
  'Read-only flattened published curriculum for efficient mobile lazy loading.';

CREATE OR REPLACE VIEW api.my_learning_dashboard
WITH (security_invoker = true)
AS
SELECT
  uls.user_id,
  uls.total_xp,
  uls.current_level,
  uls.hearts,
  uls.max_hearts,
  uls.current_streak,
  uls.longest_streak,
  uls.daily_xp,
  uls.daily_xp_date,
  count(DISTINCT lp.lesson_id) FILTER (WHERE lp.completed_at IS NOT NULL) AS completed_lessons,
  COALESCE(avg(cm.mastery_score), 0)::numeric(5,2) AS average_mastery
FROM progress.user_learning_state uls
LEFT JOIN progress.lesson_progress lp ON lp.user_id = uls.user_id
LEFT JOIN progress.competency_mastery cm ON cm.user_id = uls.user_id
WHERE uls.user_id = auth.uid()
GROUP BY uls.user_id;
COMMENT ON VIEW api.my_learning_dashboard IS
  'Single RLS-safe mobile dashboard projection for the authenticated user.';

CREATE OR REPLACE VIEW api.my_inventory
WITH (security_invoker = true)
AS
SELECT
  i.id,
  i.user_id,
  ci.code,
  ci.item_type,
  ci.name,
  ci.description,
  ci.rarity,
  ci.asset_id,
  i.quantity,
  i.acquired_at,
  i.expires_at,
  ue.slot AS equipped_slot,
  i.updated_at
FROM commerce.inventory i
JOIN commerce.catalog_items ci ON ci.id = i.item_id
LEFT JOIN commerce.user_equipment ue ON ue.inventory_id = i.id
WHERE i.user_id = auth.uid()
  AND i.quantity > 0;
COMMENT ON VIEW api.my_inventory IS
  'Joined user inventory and catalog presentation with equipped state.';

CREATE OR REPLACE VIEW api.my_review_queue
WITH (security_invoker = true)
AS
SELECT
  ri.user_id,
  ri.flashcard_id,
  f.stable_key,
  f.front,
  f.back,
  f.difficulty,
  ri.state,
  ri.due_at,
  ri.review_count,
  ri.lapse_count
FROM progress.review_items ri
JOIN practice.flashcards f ON f.id = ri.flashcard_id
WHERE ri.user_id = auth.uid()
  AND ri.suspended_at IS NULL
  AND ri.due_at <= now()
  AND f.status = 'published'
ORDER BY ri.due_at
LIMIT 100;
COMMENT ON VIEW api.my_review_queue IS
  'Due SRS cards for the authenticated user, capped for mobile pagination.';

CREATE OR REPLACE VIEW api.my_unread_notifications
WITH (security_invoker = true)
AS
SELECT id, user_id, title, body, action_url, payload, created_at, expires_at
FROM engagement.in_app_notifications
WHERE user_id = auth.uid()
  AND read_at IS NULL
  AND dismissed_at IS NULL
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY created_at DESC;
COMMENT ON VIEW api.my_unread_notifications IS
  'Realtime-ready unread in-app notifications for the authenticated user.';

CREATE OR REPLACE FUNCTION api.search_medical_concepts(
  query_embedding extensions.vector(1536),
  match_count integer DEFAULT 10,
  minimum_similarity numeric DEFAULT 0.70
)
RETURNS TABLE (
  concept_id uuid,
  stable_key text,
  preferred_label text,
  definition text,
  similarity numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    mc.id,
    mc.stable_key,
    mc.preferred_label,
    mc.definition,
    (1 - (ce.embedding <=> query_embedding))::numeric AS similarity
  FROM knowledge.concept_embeddings ce
  JOIN knowledge.medical_concepts mc ON mc.id = ce.concept_id
  WHERE mc.status = 'published'
    AND 1 - (ce.embedding <=> query_embedding) >= minimum_similarity
  ORDER BY ce.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 100);
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA iam FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA practice FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA commerce FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gamification FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA progress FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA operations FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA api FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION practice.grade_response(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION progress.record_question_response(
  uuid, uuid, uuid, jsonb, uuid[], integer, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION progress.complete_lesson_attempt(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION gamification.grant_reward_bundle(
  uuid, text, text, uuid, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION commerce.purchase_catalog_item(text, text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION commerce.open_chest(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION gamification.claim_daily_reward(text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.search_medical_concepts(
  extensions.vector, integer, numeric
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.record_question_response(
  uuid, uuid, uuid, jsonb, uuid[], integer, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.complete_lesson_attempt(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.purchase_catalog_item(text, text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.open_chest(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION api.claim_daily_reward(text, uuid)
  TO authenticated, service_role;

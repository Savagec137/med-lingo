\set ON_ERROR_STOP on

BEGIN;

DO $contract$
DECLARE
  application_schemas constant text[] := ARRAY[
    'iam', 'media', 'knowledge', 'learning', 'practice', 'anatomy',
    'clinical', 'progress', 'gamification', 'commerce', 'ai',
    'engagement', 'analytics', 'governance', 'operations'
  ];
  failure_count integer;
BEGIN
  SELECT count(*)
  INTO failure_count
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = ANY (application_schemas)
    AND relation.relkind IN ('r', 'p')
    AND (NOT relation.relrowsecurity OR NOT relation.relforcerowsecurity);

  IF failure_count > 0 THEN
    RAISE EXCEPTION '% application tables do not enable and force RLS',
      failure_count;
  END IF;

  SELECT count(*)
  INTO failure_count
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = ANY (application_schemas)
    AND relation.relkind IN ('r', 'p')
    AND obj_description(relation.oid, 'pg_class') IS NULL;

  IF failure_count > 0 THEN
    RAISE EXCEPTION '% application tables have no COMMENT', failure_count;
  END IF;

  SELECT count(*)
  INTO failure_count
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = ANY (application_schemas || ARRAY['api'])
    AND procedure.prosecdef
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(procedure.proconfig, ARRAY[]::text[])) AS setting
      WHERE setting = 'search_path=""'
        OR setting = 'search_path='
    );

  IF failure_count > 0 THEN
    RAISE EXCEPTION '% SECURITY DEFINER functions have an unsafe search_path',
      failure_count;
  END IF;

  SELECT count(*)
  INTO failure_count
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = ANY (application_schemas || ARRAY['api'])
    AND procedure.prosecdef
    AND (
      has_function_privilege('anon', procedure.oid, 'EXECUTE')
      OR EXISTS (
        SELECT 1
        FROM aclexplode(
          coalesce(
            procedure.proacl,
            acldefault('f', procedure.proowner)
          )
        ) AS privilege
        WHERE privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      )
    );

  IF failure_count > 0 THEN
    RAISE EXCEPTION '% privileged functions remain executable by anon/public',
      failure_count;
  END IF;

  IF has_function_privilege(
    'authenticated',
    'practice.grade_response(uuid,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated can call the private grading helper';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'gamification.grant_reward_bundle(uuid,text,text,uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated can call the generic reward helper';
  END IF;

  IF to_regclass('commerce.wallet_ledger') IS NULL
    OR to_regclass('commerce.inventory_events') IS NULL
    OR to_regclass('gamification.xp_ledger') IS NULL
    OR to_regclass('gamification.reward_grants') IS NULL
  THEN
    RAISE EXCEPTION 'one or more immutable ledgers are missing';
  END IF;

  WITH required_table(schema_name, table_name) AS (
    VALUES
      ('commerce', 'wallet_ledger'),
      ('commerce', 'inventory_events'),
      ('gamification', 'xp_ledger'),
      ('gamification', 'reward_grants'),
      ('commerce', 'chest_openings')
  )
  SELECT count(*)
  INTO failure_count
  FROM required_table AS required
  WHERE EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    JOIN pg_class AS relation
      ON relation.oid = index_definition.indrelid
    JOIN pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = required.schema_name
      AND relation.relname = required.table_name
      AND index_definition.indisunique
      AND (
        SELECT array_agg(attribute.attname::text ORDER BY key_position.ordinality)
        FROM unnest(index_definition.indkey)
          WITH ORDINALITY AS key_position(attribute_number, ordinality)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = relation.oid
          AND attribute.attnum = key_position.attribute_number
      ) = ARRAY['user_id', 'idempotency_key']
  );

  IF failure_count <> 5 THEN
    RAISE EXCEPTION 'critical idempotency constraints are incomplete: %/5',
      failure_count;
  END IF;

  SELECT count(*)
  INTO failure_count
  FROM storage.buckets
  WHERE id IN (
    'medlingo-public-content',
    'medlingo-user-private',
    'medlingo-secure-exports'
  );

  IF failure_count <> 3 THEN
    RAISE EXCEPTION 'MedLingo Storage buckets are incomplete: %/3',
      failure_count;
  END IF;

  SELECT count(*)
  INTO failure_count
  FROM pg_trigger AS trigger_definition
  JOIN pg_class AS relation
    ON relation.oid = trigger_definition.tgrelid
  JOIN pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE NOT trigger_definition.tgisinternal
    AND trigger_definition.tgname IN (
      'broadcast_user_learning_state',
      'broadcast_lesson_progress',
      'broadcast_path_progress',
      'broadcast_block_progress',
      'broadcast_wallets',
      'broadcast_inventory',
      'broadcast_in_app_notifications'
    )
    AND (namespace.nspname || '.' || relation.relname) IN (
      'progress.user_learning_state',
      'progress.lesson_progress',
      'progress.path_progress',
      'progress.block_progress',
      'commerce.wallets',
      'commerce.inventory',
      'engagement.in_app_notifications'
    );

  IF failure_count <> 7 THEN
    RAISE EXCEPTION 'Realtime Broadcast triggers are incomplete: %/7',
      failure_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'medlingo_user_state_receive'
      AND 'authenticated' = ANY (roles)
  ) THEN
    RAISE EXCEPTION 'private Realtime authorization policy is missing';
  END IF;
END;
$contract$;

ROLLBACK;

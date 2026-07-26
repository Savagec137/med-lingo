-- Phase 1 runtime, bootstrap, minimal API surface and deny-by-default RLS.

INSERT INTO iam.permissions (code, domain, action, description)
VALUES
  ('users.read', 'users', 'read', 'Read user administration projections'),
  ('users.manage', 'users', 'manage', 'Manage account status and organization membership'),
  ('roles.manage', 'iam', 'manage', 'Manage roles and permission grants'),
  ('content.manage', 'content', 'manage', 'Create, review and publish learning content'),
  ('sources.validate', 'knowledge', 'validate', 'Validate source provenance and regulatory updates'),
  ('rewards.grant', 'gamification', 'grant', 'Grant server-authoritative rewards'),
  ('economy.manage', 'commerce', 'manage', 'Manage catalog, prices, loot and reconciliation'),
  ('analytics.read', 'analytics', 'read', 'Read aggregate product and learning analytics'),
  ('moderation.manage', 'governance', 'manage', 'Process moderation cases and actions'),
  ('feature_flags.manage', 'operations', 'manage', 'Manage feature rollout and overrides'),
  ('audit.read', 'governance', 'read', 'Read restricted security and audit trails')
ON CONFLICT (code) DO UPDATE
SET domain = EXCLUDED.domain,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

INSERT INTO iam.roles (code, name, description, system_role)
VALUES
  ('learner', 'Apprenant', 'Default learning role', true),
  ('trainer', 'Formateur', 'Training follow-up role', true),
  ('content_editor', 'Éditeur pédagogique', 'Creates and updates draft content', true),
  ('medical_reviewer', 'Validateur médical', 'Performs medical content review', true),
  ('regulatory_reviewer', 'Validateur réglementaire', 'Reviews legal and regulatory sources', true),
  ('moderator', 'Modérateur', 'Processes moderation cases', true),
  ('administrator', 'Administrateur', 'Global operational administrator', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    system_role = EXCLUDED.system_role;

INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM iam.roles r
JOIN iam.permissions p ON
  (r.code = 'administrator')
  OR (r.code = 'content_editor' AND p.code = 'content.manage')
  OR (r.code = 'medical_reviewer' AND p.code IN ('content.manage', 'sources.validate'))
  OR (r.code = 'regulatory_reviewer' AND p.code = 'sources.validate')
  OR (r.code = 'moderator' AND p.code = 'moderation.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION iam.bootstrap_new_user_phase1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_locale text;
BEGIN
  requested_locale := COALESCE(NEW.raw_user_meta_data ->> 'locale', 'fr-FR');
  IF requested_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' THEN
    requested_locale := 'fr-FR';
  END IF;

  INSERT INTO iam.user_accounts (user_id, locale, timezone)
  VALUES (
    NEW.id,
    requested_locale,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'timezone', ''), 'Europe/Paris')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    left(
      COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
      ),
      80
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO iam.mfa_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO iam.user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM iam.roles r
  WHERE r.code = 'learner'
    AND NOT EXISTS (
      SELECT 1
      FROM iam.user_roles ur
      WHERE ur.user_id = NEW.id
        AND ur.role_id = r.id
        AND ur.organization_id IS NULL
        AND ur.formation_id IS NULL
        AND ur.revoked_at IS NULL
    );
  RETURN NEW;
END;
$$;

-- Existing public profiles remain the application source of truth until the
-- dedicated profile reconciliation.
INSERT INTO iam.user_accounts (
  user_id, locale, timezone, last_seen_at, created_at, updated_at
)
SELECT
  au.id,
  CASE
    WHEN COALESCE(au.raw_user_meta_data ->> 'locale', '') ~ '^[a-z]{2}(-[A-Z]{2})?$'
      THEN au.raw_user_meta_data ->> 'locale'
    ELSE 'fr-FR'
  END,
  COALESCE(NULLIF(au.raw_user_meta_data ->> 'timezone', ''), 'Europe/Paris'),
  au.last_sign_in_at,
  COALESCE(au.created_at, now()),
  now()
FROM auth.users au
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO iam.profiles (user_id, display_name)
SELECT
  au.id,
  left(
    COALESCE(
      NULLIF(au.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(split_part(COALESCE(au.email, ''), '@', 1), '')
    ),
    80
  )
FROM auth.users au
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO iam.user_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO iam.mfa_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO iam.user_roles (user_id, role_id)
SELECT ua.user_id, r.id
FROM iam.user_accounts ua
CROSS JOIN iam.roles r
WHERE r.code = 'learner'
  AND NOT EXISTS (
    SELECT 1
    FROM iam.user_roles ur
    WHERE ur.user_id = ua.user_id
      AND ur.role_id = r.id
      AND ur.organization_id IS NULL
      AND ur.formation_id IS NULL
      AND ur.revoked_at IS NULL
  );

DROP TRIGGER IF EXISTS on_medlingo_user_created_phase1 ON auth.users;
CREATE TRIGGER on_medlingo_user_created_phase1
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION iam.bootstrap_new_user_phase1();

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

-- __EXTRACTED_PHASE1_RUNTIME__

REVOKE ALL ON SCHEMA iam, media, knowledge, learning, practice, anatomy,
  clinical, api FROM PUBLIC;
GRANT USAGE ON SCHEMA iam, media, knowledge, learning, practice, anatomy,
  clinical, api TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA iam, media, knowledge, learning, practice,
  anatomy, clinical TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA iam, media, knowledge, learning, practice,
  anatomy, clinical TO service_role;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN (
      'iam', 'media', 'knowledge', 'learning', 'practice', 'anatomy', 'clinical'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      target.schemaname, target.tablename);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
      target.schemaname, target.tablename);
  END LOOP;
END;
$$;

DO $$
DECLARE
  target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'iam.user_accounts'::regclass,
    'iam.profiles'::regclass,
    'iam.user_preferences'::regclass,
    'iam.user_devices'::regclass,
    'iam.user_sessions'::regclass,
    'iam.external_identities'::regclass,
    'iam.mfa_preferences'::regclass,
    'iam.security_events'::regclass,
    'iam.organization_memberships'::regclass,
    'iam.user_roles'::regclass,
    'iam.user_consents'::regclass,
    'iam.account_recovery_events'::regclass
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON %s TO authenticated', target);
    EXECUTE format(
      'CREATE POLICY owner_read ON %s FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      target
    );
  END LOOP;
END;
$$;

GRANT INSERT (user_id, display_name, given_name, family_name, biography,
  avatar_asset_id, profile_visibility, organization_name, profession_title,
  training_program) ON iam.profiles TO authenticated;
GRANT UPDATE (display_name, given_name, family_name, biography, avatar_asset_id,
  profile_visibility, organization_name, profession_title, training_program)
ON iam.profiles TO authenticated;
GRANT INSERT (user_id, theme, reduced_motion, haptics_enabled, sounds_enabled,
  content_locale, daily_goal_xp, study_reminder_time, accessibility,
  learning_preferences) ON iam.user_preferences TO authenticated;
GRANT UPDATE (theme, reduced_motion, haptics_enabled, sounds_enabled,
  content_locale, daily_goal_xp, study_reminder_time, accessibility,
  learning_preferences) ON iam.user_preferences TO authenticated;
GRANT INSERT (user_id, installation_id, platform, device_model, os_version,
  app_version, locale, timezone, push_capable, last_seen_at)
ON iam.user_devices TO authenticated;
GRANT UPDATE (device_model, os_version, app_version, locale, timezone,
  push_capable, last_seen_at, revoked_at) ON iam.user_devices TO authenticated;

CREATE POLICY profile_insert_own ON iam.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_update_own ON iam.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY preferences_insert_own ON iam.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY preferences_update_own ON iam.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_insert_own ON iam.user_devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_update_own ON iam.user_devices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT INSERT ON iam.user_consents TO authenticated;
CREATE POLICY consents_insert_own ON iam.user_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON learning.formations, learning.formation_versions,
  learning.blocks, learning.paths, learning.lessons, learning.lesson_versions
TO authenticated;
CREATE POLICY formations_published_read ON learning.formations
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY formation_versions_published_read ON learning.formation_versions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY blocks_published_read ON learning.blocks
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY paths_published_read ON learning.paths
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY lessons_published_read ON learning.lessons
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY lesson_versions_published_read ON learning.lesson_versions
  FOR SELECT TO authenticated USING (status = 'published');

GRANT SELECT ON knowledge.medical_concepts, knowledge.concept_embeddings
TO authenticated;
CREATE POLICY medical_concepts_published_read ON knowledge.medical_concepts
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY concept_embeddings_published_read ON knowledge.concept_embeddings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM knowledge.medical_concepts mc
      WHERE mc.id = concept_id AND mc.status = 'published'
    )
  );

DO $$
DECLARE
  target regclass;
BEGIN
  FOR target IN
    SELECT format('%I.%I', schemaname, tablename)::regclass
    FROM pg_tables
    WHERE schemaname IN (
      'media', 'knowledge', 'learning', 'practice', 'anatomy', 'clinical'
    )
  LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON %s TO authenticated', target);
    EXECUTE format(
      'CREATE POLICY content_manage ON %s FOR ALL TO authenticated '
      || 'USING (iam.has_permission(''content.manage'')) '
      || 'WITH CHECK (iam.has_permission(''content.manage''))',
      target
    );
  END LOOP;
END;
$$;

GRANT SELECT ON api.published_curriculum TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA iam FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA practice FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA api FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION iam.has_permission(text, uuid, uuid)
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION practice.grade_response(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION api.search_medical_concepts(
  extensions.vector, integer, numeric
) TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'medlingo-public-content', 'medlingo-public-content', true, 104857600,
    ARRAY[
      'image/png', 'image/jpeg', 'image/webp', 'image/avif',
      'video/mp4', 'audio/mpeg', 'audio/mp4',
      'application/json', 'model/gltf-binary'
    ]
  ),
  (
    'medlingo-user-private', 'medlingo-user-private', false, 20971520,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS medlingo_public_assets_read ON storage.objects;
CREATE POLICY medlingo_public_assets_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'medlingo-public-content');
DROP POLICY IF EXISTS medlingo_public_assets_manage ON storage.objects;
CREATE POLICY medlingo_public_assets_manage ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'medlingo-public-content'
    AND iam.has_permission('content.manage')
  )
  WITH CHECK (
    bucket_id = 'medlingo-public-content'
    AND iam.has_permission('content.manage')
  );
DROP POLICY IF EXISTS medlingo_private_assets_read ON storage.objects;
CREATE POLICY medlingo_private_assets_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medlingo-user-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS medlingo_private_assets_write ON storage.objects;
CREATE POLICY medlingo_private_assets_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medlingo-user-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS medlingo_private_assets_update ON storage.objects;
CREATE POLICY medlingo_private_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medlingo-user-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'medlingo-user-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS medlingo_private_assets_delete ON storage.objects;
CREATE POLICY medlingo_private_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medlingo-user-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

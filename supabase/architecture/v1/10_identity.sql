-- Identity and access management.
-- auth.users remains the authentication source of truth.

CREATE TABLE iam.user_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status core.account_status NOT NULL DEFAULT 'active',
  locale text NOT NULL DEFAULT 'fr-FR',
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  onboarding_completed_at timestamptz,
  last_seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_accounts_locale_ck CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT user_accounts_deleted_ck CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL) OR status <> 'deleted'
  )
);
COMMENT ON TABLE iam.user_accounts IS
  'Application account projection for each auth.users identity; never stores credentials or JWTs.';

CREATE TABLE iam.profiles (
  user_id uuid PRIMARY KEY REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  display_name text,
  given_name text,
  family_name text,
  biography text,
  avatar_asset_id uuid,
  profile_visibility text NOT NULL DEFAULT 'private',
  organization_name text,
  profession_title text,
  training_program text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_visibility_ck
    CHECK (profile_visibility IN ('private', 'friends', 'public')),
  CONSTRAINT profiles_display_name_ck
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80)
);
COMMENT ON TABLE iam.profiles IS
  'Non-sensitive user-facing profile data separated from authentication and preferences.';

CREATE TABLE iam.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system',
  reduced_motion boolean NOT NULL DEFAULT false,
  haptics_enabled boolean NOT NULL DEFAULT true,
  sounds_enabled boolean NOT NULL DEFAULT true,
  content_locale text NOT NULL DEFAULT 'fr-FR',
  daily_goal_xp integer NOT NULL DEFAULT 30,
  study_reminder_time time,
  accessibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  learning_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_theme_ck CHECK (theme IN ('system', 'light', 'dark')),
  CONSTRAINT user_preferences_daily_goal_ck CHECK (daily_goal_xp BETWEEN 0 AND 10000),
  CONSTRAINT user_preferences_accessibility_object_ck
    CHECK (jsonb_typeof(accessibility) = 'object'),
  CONSTRAINT user_preferences_learning_object_ck
    CHECK (jsonb_typeof(learning_preferences) = 'object')
);
COMMENT ON TABLE iam.user_preferences IS
  'One normalized preference record per user; JSONB is limited to extensible UI and learning options.';

CREATE TABLE iam.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  installation_id uuid NOT NULL,
  platform core.platform NOT NULL,
  device_model text,
  os_version text,
  app_version text,
  locale text,
  timezone text,
  push_capable boolean NOT NULL DEFAULT false,
  trusted_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, installation_id)
);
COMMENT ON TABLE iam.user_devices IS
  'Registered app installations for trust, push routing, offline synchronization and revocation.';
CREATE INDEX user_devices_user_seen_idx
  ON iam.user_devices (user_id, last_seen_at DESC);
CREATE INDEX user_devices_active_idx
  ON iam.user_devices (user_id, platform) WHERE revoked_at IS NULL;

CREATE TABLE iam.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  auth_session_id uuid,
  ip_hash text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  end_reason text,
  CONSTRAINT user_sessions_end_ck CHECK (
    ended_at IS NULL OR ended_at >= started_at
  )
);
COMMENT ON TABLE iam.user_sessions IS
  'Auditable session metadata mirror; access and refresh tokens remain exclusively in Supabase Auth.';
CREATE INDEX user_sessions_active_idx
  ON iam.user_sessions (user_id, last_activity_at DESC) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX user_sessions_auth_session_uidx
  ON iam.user_sessions (auth_session_id) WHERE auth_session_id IS NOT NULL;

CREATE TABLE iam.external_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  auth_identity_id uuid NOT NULL,
  provider text NOT NULL,
  provider_subject_hash text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  unlinked_at timestamptz,
  UNIQUE (auth_identity_id),
  UNIQUE (provider, provider_subject_hash)
);
COMMENT ON TABLE iam.external_identities IS
  'Minimal non-secret audit projection of OAuth, passwordless and magic-link identities managed by Supabase Auth.';
CREATE INDEX external_identities_user_idx
  ON iam.external_identities (user_id, linked_at DESC);

CREATE TABLE iam.mfa_preferences (
  user_id uuid PRIMARY KEY REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT false,
  preferred_factor text,
  enrolled_factor_count integer NOT NULL DEFAULT 0,
  last_verified_at timestamptz,
  recovery_codes_rotated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mfa_factor_ck
    CHECK (preferred_factor IS NULL OR preferred_factor IN ('totp', 'phone', 'webauthn')),
  CONSTRAINT mfa_count_ck CHECK (enrolled_factor_count >= 0)
);
COMMENT ON TABLE iam.mfa_preferences IS
  'Application MFA policy projection; secrets and factor material stay in Supabase Auth.';

CREATE TABLE iam.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_events_severity_ck
    CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT security_events_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE iam.security_events IS
  'Append-only security history for login, logout, MFA, lockout, credential and suspicious-access events.';
CREATE INDEX security_events_user_time_idx
  ON iam.security_events (user_id, occurred_at DESC);
CREATE INDEX security_events_type_time_idx
  ON iam.security_events (event_type, occurred_at DESC);
CREATE INDEX security_events_metadata_gin
  ON iam.security_events USING gin (metadata jsonb_path_ops);

CREATE TABLE iam.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  organization_type text NOT NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_type_ck CHECK (
    organization_type IN ('training_institute', 'employer', 'healthcare_facility', 'partner', 'internal')
  ),
  CONSTRAINT organizations_settings_ck CHECK (jsonb_typeof(settings) = 'object')
);
COMMENT ON TABLE iam.organizations IS
  'Training institutes, employers and partner organizations used for scoped access and cohorts.';

CREATE TABLE iam.organization_memberships (
  organization_id uuid NOT NULL REFERENCES iam.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  membership_status text NOT NULL DEFAULT 'active',
  external_reference text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (organization_id, user_id),
  CONSTRAINT organization_membership_status_ck CHECK (
    membership_status IN ('invited', 'active', 'suspended', 'left')
  ),
  CONSTRAINT organization_memberships_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE iam.organization_memberships IS
  'Membership relation between users and institutes/employers without duplicating user profiles.';
CREATE INDEX organization_memberships_user_idx
  ON iam.organization_memberships (user_id, membership_status);

CREATE TABLE iam.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE iam.roles IS
  'Named RBAC roles such as learner, trainer, medical_reviewer, content_editor and administrator.';

CREATE TABLE iam.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  domain text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain, action)
);
COMMENT ON TABLE iam.permissions IS
  'Atomic RBAC permissions, kept independent from roles to avoid authorization duplication.';

CREATE TABLE iam.role_permissions (
  role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
COMMENT ON TABLE iam.role_permissions IS
  'Many-to-many mapping from RBAC roles to atomic permissions.';
CREATE INDEX role_permissions_permission_idx
  ON iam.role_permissions (permission_id, role_id);

CREATE TABLE iam.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES iam.organizations(id) ON DELETE CASCADE,
  formation_id uuid,
  granted_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT user_roles_scope_ck CHECK (num_nonnulls(organization_id, formation_id) <= 1),
  CONSTRAINT user_roles_expiry_ck CHECK (
    expires_at IS NULL OR expires_at > granted_at
  )
);
COMMENT ON TABLE iam.user_roles IS
  'Scoped, expirable user-role grants with complete provenance.';
CREATE UNIQUE INDEX user_roles_active_uidx
  ON iam.user_roles (
    user_id,
    role_id,
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(formation_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE revoked_at IS NULL;
CREATE INDEX user_roles_authorization_idx
  ON iam.user_roles (user_id, organization_id, formation_id)
  WHERE revoked_at IS NULL;

CREATE TABLE iam.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  consent_code text NOT NULL,
  document_version text NOT NULL,
  granted boolean NOT NULL,
  locale text NOT NULL DEFAULT 'fr-FR',
  source text NOT NULL DEFAULT 'app',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  CONSTRAINT user_consents_evidence_ck CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT user_consents_withdrawn_ck CHECK (
    withdrawn_at IS NULL OR withdrawn_at >= recorded_at
  )
);
COMMENT ON TABLE iam.user_consents IS
  'Immutable consent history for terms, privacy, analytics, AI memory and communication channels.';
CREATE INDEX user_consents_latest_idx
  ON iam.user_consents (user_id, consent_code, recorded_at DESC);

CREATE TABLE iam.account_recovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  recovery_type text NOT NULL,
  status text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT recovery_status_ck
    CHECK (status IN ('requested', 'verified', 'completed', 'expired', 'cancelled')),
  CONSTRAINT recovery_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE iam.account_recovery_events IS
  'Audit-only history of account recovery and security-sensitive identity changes.';
CREATE INDEX account_recovery_user_idx
  ON iam.account_recovery_events (user_id, requested_at DESC);

CREATE TRIGGER user_accounts_set_updated_at
BEFORE UPDATE ON iam.user_accounts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON iam.profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER user_preferences_set_updated_at
BEFORE UPDATE ON iam.user_preferences
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER user_devices_set_updated_at
BEFORE UPDATE ON iam.user_devices
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER mfa_preferences_set_updated_at
BEFORE UPDATE ON iam.mfa_preferences
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON iam.roles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON iam.organizations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

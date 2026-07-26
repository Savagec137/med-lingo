-- Governance, audit, moderation, feature delivery and offline synchronization.

CREATE TABLE governance.content_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requested_review core.review_status NOT NULL,
  requested_by uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  closed_at timestamptz,
  CONSTRAINT content_review_status_ck CHECK (
    status IN ('open', 'in_review', 'approved', 'changes_requested', 'rejected', 'cancelled')
  ),
  CONSTRAINT content_review_snapshot_ck CHECK (jsonb_typeof(source_snapshot) = 'object')
);
COMMENT ON TABLE governance.content_review_requests IS
  'Workflow envelope for source, trainer, medical and regulatory validation of versioned content.';
CREATE INDEX content_review_requests_queue_idx
  ON governance.content_review_requests (status, requested_review, due_at);
CREATE INDEX content_review_requests_entity_idx
  ON governance.content_review_requests (entity_type, entity_id, requested_at DESC);

CREATE TABLE governance.content_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id uuid NOT NULL REFERENCES governance.content_review_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE RESTRICT,
  decision text NOT NULL,
  review_status core.review_status NOT NULL,
  comment text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_review_decision_ck CHECK (
    decision IN ('approve', 'request_changes', 'reject', 'abstain')
  ),
  CONSTRAINT content_review_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')
);
COMMENT ON TABLE governance.content_review_decisions IS
  'Immutable reviewer decisions preserving the distinction between source, trainer and medical validation.';
CREATE INDEX content_review_decisions_request_idx
  ON governance.content_review_decisions (review_request_id, decided_at);

CREATE TABLE governance.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity_schema text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  request_id uuid,
  ip_hash text,
  user_agent text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at),
  CONSTRAINT audit_log_before_ck CHECK (
    before_data IS NULL OR jsonb_typeof(before_data) = 'object'
  ),
  CONSTRAINT audit_log_after_ck CHECK (
    after_data IS NULL OR jsonb_typeof(after_data) = 'object'
  ),
  CONSTRAINT audit_log_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE governance.audit_log IS
  'Append-only monthly-partitioned administrative and sensitive-data audit trail.';
CREATE TABLE governance.audit_log_default
  PARTITION OF governance.audit_log DEFAULT;
CREATE INDEX audit_log_actor_time_idx
  ON governance.audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX audit_log_entity_idx
  ON governance.audit_log (entity_schema, entity_table, entity_id, occurred_at DESC);
CREATE INDEX audit_log_request_idx
  ON governance.audit_log (request_id) WHERE request_id IS NOT NULL;

CREATE TABLE governance.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  entity_schema text NOT NULL,
  entity_table text NOT NULL,
  retention_interval interval NOT NULL,
  legal_basis text NOT NULL,
  archive_before_delete boolean NOT NULL DEFAULT false,
  anonymize_instead_of_delete boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retention_interval_ck CHECK (retention_interval > interval '0 seconds')
);
COMMENT ON TABLE governance.data_retention_policies IS
  'Explicit lifecycle rules for personal, learning, security, AI and operational data.';

CREATE TABLE governance.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  export_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  failure_reason text,
  CONSTRAINT data_export_status_ck CHECK (
    status IN ('requested', 'processing', 'completed', 'failed', 'expired')
  )
);
COMMENT ON TABLE governance.data_export_requests IS
  'GDPR portability workflow with expiring encrypted export assets.';
CREATE INDEX data_export_requests_user_idx
  ON governance.data_export_requests (user_id, requested_at DESC);

CREATE TABLE governance.data_erasure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  cooling_off_until timestamptz NOT NULL,
  verified_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  legal_hold boolean NOT NULL DEFAULT false,
  retained_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  failure_reason text,
  CONSTRAINT data_erasure_status_ck CHECK (
    status IN ('requested', 'verified', 'cancelled', 'processing', 'completed', 'blocked', 'failed')
  ),
  CONSTRAINT data_erasure_cooling_ck CHECK (cooling_off_until > requested_at)
);
COMMENT ON TABLE governance.data_erasure_requests IS
  'Controlled GDPR erasure/anonymization workflow preserving legal and financial obligations.';
CREATE INDEX data_erasure_requests_status_idx
  ON governance.data_erasure_requests (status, cooling_off_until);

CREATE TABLE governance.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  category text NOT NULL,
  severity text NOT NULL,
  description text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT moderation_cases_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT moderation_cases_status_ck CHECK (
    status IN ('open', 'triaged', 'investigating', 'resolved', 'dismissed')
  ),
  CONSTRAINT moderation_cases_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')
);
COMMENT ON TABLE governance.moderation_cases IS
  'Moderation workflow for social, profile, AI and user-generated content incidents.';
CREATE INDEX moderation_cases_queue_idx
  ON governance.moderation_cases (status, severity, opened_at);

CREATE TABLE governance.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_case_id uuid NOT NULL REFERENCES governance.moderation_cases(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  reason text NOT NULL,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_actions_type_ck CHECK (
    action_type IN ('note', 'warn', 'hide', 'restrict', 'suspend', 'ban', 'restore')
  ),
  CONSTRAINT moderation_actions_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE governance.moderation_actions IS
  'Immutable moderation decisions with actor, reason, target and optional expiry.';

CREATE TABLE operations.application_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  environment text NOT NULL,
  release_version text,
  severity text NOT NULL,
  error_type text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT application_errors_severity_ck CHECK (
    severity IN ('debug', 'info', 'warning', 'error', 'fatal')
  ),
  CONSTRAINT application_errors_context_ck CHECK (jsonb_typeof(context) = 'object')
);
COMMENT ON TABLE operations.application_errors IS
  'Privacy-filtered client, Edge Function and database error occurrences grouped by fingerprint.';
CREATE INDEX application_errors_fingerprint_idx
  ON operations.application_errors (fingerprint, occurred_at DESC);
CREATE INDEX application_errors_unresolved_idx
  ON operations.application_errors (severity, occurred_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX application_errors_context_gin
  ON operations.application_errors USING gin (context jsonb_path_ops);

CREATE TABLE operations.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  reproduction_steps text,
  expected_behavior text,
  actual_behavior text,
  app_version text,
  device_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT bug_reports_status_ck CHECK (
    status IN ('new', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate')
  ),
  CONSTRAINT bug_reports_priority_ck CHECK (
    priority IN ('low', 'normal', 'high', 'critical')
  ),
  CONSTRAINT bug_reports_device_ck CHECK (jsonb_typeof(device_context) = 'object')
);
COMMENT ON TABLE operations.bug_reports IS
  'User or staff submitted defect with reproducibility and device context.';
CREATE INDEX bug_reports_queue_idx
  ON operations.bug_reports (status, priority, created_at);

CREATE TABLE operations.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  value_type text NOT NULL,
  default_value jsonb NOT NULL,
  rollout_percentage numeric(5,2) NOT NULL DEFAULT 0,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_type_ck CHECK (value_type IN ('boolean', 'string', 'number', 'json')),
  CONSTRAINT feature_flags_rollout_ck CHECK (rollout_percentage BETWEEN 0 AND 100),
  CONSTRAINT feature_flags_rules_ck CHECK (jsonb_typeof(rules) = 'array')
);
COMMENT ON TABLE operations.feature_flags IS
  'Server-authoritative feature configuration and deterministic rollout rules.';

CREATE TABLE operations.feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id uuid NOT NULL REFERENCES operations.feature_flags(id) ON DELETE CASCADE,
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  organization_id uuid REFERENCES iam.organizations(id) ON DELETE CASCADE,
  formation_id uuid REFERENCES learning.formations(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  expires_at timestamptz,
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flag_override_target_ck CHECK (
    num_nonnulls(user_id, organization_id, formation_id) = 1
  )
);
COMMENT ON TABLE operations.feature_flag_overrides IS
  'Explicit user, organization or formation feature override with referentially valid target.';
CREATE INDEX feature_flag_overrides_user_idx
  ON operations.feature_flag_overrides (user_id, feature_flag_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX feature_flag_overrides_org_idx
  ON operations.feature_flag_overrides (organization_id, feature_flag_id)
  WHERE organization_id IS NOT NULL;

CREATE TABLE operations.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  affected_services text[] NOT NULL,
  severity text NOT NULL DEFAULT 'maintenance',
  user_message text,
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT maintenance_windows_dates_ck CHECK (ends_at > starts_at),
  CONSTRAINT maintenance_windows_services_ck CHECK (cardinality(affected_services) > 0),
  CONSTRAINT maintenance_windows_severity_ck CHECK (
    severity IN ('notice', 'maintenance', 'degraded', 'outage')
  )
);
COMMENT ON TABLE operations.maintenance_windows IS
  'Scheduled or emergency service-impact window consumed by clients and status tooling.';
CREATE INDEX maintenance_windows_time_gist
  ON operations.maintenance_windows
  USING gist (tstzrange(starts_at, ends_at, '[)'));

CREATE TABLE operations.idempotency_keys (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  scope text NOT NULL,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  locked_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, scope, idempotency_key),
  CONSTRAINT idempotency_keys_status_ck CHECK (
    response_status IS NULL OR response_status BETWEEN 100 AND 599
  ),
  CONSTRAINT idempotency_keys_expiry_ck CHECK (expires_at > locked_at)
);
COMMENT ON TABLE operations.idempotency_keys IS
  'Generic exactly-once guard for mobile mutations beyond domain-specific unique keys.';
CREATE INDEX idempotency_keys_expiry_idx ON operations.idempotency_keys (expires_at);

CREATE TABLE operations.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  correlation_id uuid NOT NULL,
  causation_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  CONSTRAINT outbox_events_version_ck CHECK (event_version > 0),
  CONSTRAINT outbox_events_payload_ck CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT outbox_events_attempts_ck CHECK (attempt_count >= 0)
);
COMMENT ON TABLE operations.outbox_events IS
  'Transactional outbox for analytics, notifications, achievements and external integrations.';
CREATE INDEX outbox_events_worker_idx
  ON operations.outbox_events (available_at, occurred_at)
  WHERE published_at IS NULL;
CREATE INDEX outbox_events_aggregate_idx
  ON operations.outbox_events (aggregate_type, aggregate_id, occurred_at);

CREATE TABLE operations.sync_changes (
  revision bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_key jsonb NOT NULL,
  operation text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  payload jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT sync_changes_operation_ck CHECK (operation IN ('upsert', 'delete')),
  CONSTRAINT sync_changes_entity_key_ck CHECK (jsonb_typeof(entity_key) = 'object'),
  CONSTRAINT sync_changes_payload_ck CHECK (
    payload IS NULL OR jsonb_typeof(payload) = 'object'
  )
);
COMMENT ON TABLE operations.sync_changes IS
  'Per-user monotonic change feed for incremental offline synchronization and tombstones.';
CREATE INDEX sync_changes_user_revision_idx
  ON operations.sync_changes (user_id, revision);
CREATE INDEX sync_changes_entity_key_gin
  ON operations.sync_changes USING gin (entity_key jsonb_path_ops);
CREATE INDEX sync_changes_expiry_idx
  ON operations.sync_changes (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE operations.device_sync_cursors (
  device_id uuid PRIMARY KEY REFERENCES iam.user_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  last_pulled_revision bigint NOT NULL DEFAULT 0,
  last_push_at timestamptz,
  last_pull_at timestamptz,
  full_resync_required boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_sync_cursors_revision_ck CHECK (last_pulled_revision >= 0)
);
COMMENT ON TABLE operations.device_sync_cursors IS
  'Acknowledged offline-sync cursor per installation, used to retain tombstones safely.';
CREATE INDEX device_sync_cursors_user_idx
  ON operations.device_sync_cursors (user_id, updated_at DESC);

CREATE TABLE operations.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  scheduled_for timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  processed_count bigint NOT NULL DEFAULT 0,
  failed_count bigint NOT NULL DEFAULT 0,
  cursor jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  CONSTRAINT job_runs_status_ck CHECK (
    status IN ('running', 'succeeded', 'failed', 'cancelled', 'partial')
  ),
  CONSTRAINT job_runs_counts_ck CHECK (processed_count >= 0 AND failed_count >= 0),
  CONSTRAINT job_runs_cursor_ck CHECK (cursor IS NULL OR jsonb_typeof(cursor) = 'object'),
  CONSTRAINT job_runs_metrics_ck CHECK (jsonb_typeof(metrics) = 'object')
);
COMMENT ON TABLE operations.job_runs IS
  'Execution history for rollups, SRS scheduling, notifications, partitions and cleanup jobs.';
CREATE INDEX job_runs_name_time_idx
  ON operations.job_runs (job_name, started_at DESC);

CREATE TABLE operations.schema_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  checksum text NOT NULL,
  description text NOT NULL,
  compatibility_level text NOT NULL,
  applied_at timestamptz,
  applied_by text,
  rollback_plan text NOT NULL,
  validation_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT schema_releases_compatibility_ck CHECK (
    compatibility_level IN ('additive', 'dual_write', 'cutover', 'breaking')
  ),
  CONSTRAINT schema_releases_validation_ck CHECK (jsonb_typeof(validation_report) = 'object')
);
COMMENT ON TABLE operations.schema_releases IS
  'Application-level schema release registry with compatibility and rollback evidence.';

CREATE TRIGGER retention_policies_set_updated_at
BEFORE UPDATE ON governance.data_retention_policies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER bug_reports_set_updated_at
BEFORE UPDATE ON operations.bug_reports
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER feature_flags_set_updated_at
BEFORE UPDATE ON operations.feature_flags
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER device_sync_cursors_set_updated_at
BEFORE UPDATE ON operations.device_sync_cursors
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

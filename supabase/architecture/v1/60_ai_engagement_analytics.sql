-- Pulse AI, notifications and learning analytics.

CREATE TABLE ai.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  title text,
  purpose text NOT NULL DEFAULT 'tutor',
  formation_id uuid REFERENCES learning.formations(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES learning.lessons(id) ON DELETE SET NULL,
  clinical_case_id uuid REFERENCES clinical.cases(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  model_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT ai_conversations_purpose_ck CHECK (
    purpose IN ('tutor', 'debrief', 'revision', 'recommendation', 'support')
  ),
  CONSTRAINT ai_conversations_status_ck CHECK (
    status IN ('active', 'archived', 'deleted')
  ),
  CONSTRAINT ai_conversations_policy_ck CHECK (jsonb_typeof(model_policy) = 'object')
);
COMMENT ON TABLE ai.conversations IS
  'User-owned Pulse interaction thread scoped to tutoring, revision or a clinical debrief.';
CREATE INDEX ai_conversations_user_recent_idx
  ON ai.conversations (user_id, last_message_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE ai.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  role core.ai_message_role NOT NULL,
  content text NOT NULL,
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_identifier text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  safety_status text NOT NULL DEFAULT 'unchecked',
  client_message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, client_message_id),
  CONSTRAINT ai_messages_blocks_ck CHECK (jsonb_typeof(content_blocks) = 'array'),
  CONSTRAINT ai_messages_tokens_ck CHECK (
    (input_tokens IS NULL OR input_tokens >= 0)
    AND (output_tokens IS NULL OR output_tokens >= 0)
    AND (latency_ms IS NULL OR latency_ms >= 0)
  ),
  CONSTRAINT ai_messages_safety_ck CHECK (
    safety_status IN ('unchecked', 'safe', 'flagged', 'blocked', 'reviewed')
  )
);
COMMENT ON TABLE ai.messages IS
  'Append-only Pulse messages with model, prompt, token, safety and latency audit fields.';
CREATE INDEX ai_messages_conversation_time_idx
  ON ai.messages (conversation_id, created_at);
CREATE INDEX ai_messages_user_time_idx
  ON ai.messages (user_id, created_at DESC);

CREATE TABLE ai.message_citations (
  message_id uuid NOT NULL REFERENCES ai.messages(id) ON DELETE CASCADE,
  source_section_id uuid NOT NULL REFERENCES knowledge.source_sections(id) ON DELETE RESTRICT,
  citation_order integer NOT NULL,
  relevance numeric(5,4),
  quoted_text_hash text,
  PRIMARY KEY (message_id, source_section_id),
  UNIQUE (message_id, citation_order),
  CONSTRAINT ai_message_citations_order_ck CHECK (citation_order > 0),
  CONSTRAINT ai_message_citations_relevance_ck CHECK (
    relevance IS NULL OR relevance BETWEEN 0 AND 1
  )
);
COMMENT ON TABLE ai.message_citations IS
  'Precise source grounding for Pulse responses.';

CREATE TABLE ai.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content text NOT NULL,
  structured_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL DEFAULT 'standard',
  source_conversation_id uuid REFERENCES ai.conversations(id) ON DELETE SET NULL,
  source_message_id uuid REFERENCES ai.messages(id) ON DELETE SET NULL,
  confidence numeric(5,4) NOT NULL DEFAULT 1,
  consent_code text NOT NULL DEFAULT 'ai_memory',
  expires_at timestamptz,
  superseded_by uuid REFERENCES ai.user_memories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT ai_user_memories_type_ck CHECK (
    memory_type IN ('preference', 'goal', 'difficulty', 'learning_fact', 'constraint')
  ),
  CONSTRAINT ai_user_memories_sensitivity_ck CHECK (
    sensitivity IN ('standard', 'sensitive', 'restricted')
  ),
  CONSTRAINT ai_user_memories_confidence_ck CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT ai_user_memories_content_ck CHECK (jsonb_typeof(structured_content) = 'object')
);
COMMENT ON TABLE ai.user_memories IS
  'Consent-bound, expirable user learning memory; excludes diagnostic or unnecessary health data.';
CREATE INDEX ai_user_memories_active_idx
  ON ai.user_memories (user_id, memory_type, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE ai.memory_embeddings (
  memory_id uuid NOT NULL REFERENCES ai.user_memories(id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, embedding_model)
);
COMMENT ON TABLE ai.memory_embeddings IS
  'Semantic vectors for consented user learning memories.';
CREATE INDEX ai_memory_embeddings_hnsw_idx
  ON ai.memory_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE ai.context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  formation_id uuid REFERENCES learning.formations(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES learning.lessons(id) ON DELETE SET NULL,
  mastery_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieved_concept_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  retrieved_memory_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  prompt_context_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_context_mastery_ck CHECK (jsonb_typeof(mastery_snapshot) = 'object'),
  CONSTRAINT ai_context_progress_ck CHECK (jsonb_typeof(progress_snapshot) = 'object')
);
COMMENT ON TABLE ai.context_snapshots IS
  'Immutable context actually supplied to Pulse, enabling privacy review and reproducibility.';
CREATE INDEX ai_context_conversation_idx
  ON ai.context_snapshots (conversation_id, created_at DESC);
CREATE INDEX ai_context_concepts_gin
  ON ai.context_snapshots USING gin (retrieved_concept_ids);

CREATE TABLE ai.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  rationale text NOT NULL,
  score numeric(7,6) NOT NULL,
  model_identifier text NOT NULL,
  model_version text NOT NULL,
  input_snapshot jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT ai_recommendations_score_ck CHECK (score BETWEEN 0 AND 1),
  CONSTRAINT ai_recommendations_dates_ck CHECK (
    expires_at IS NULL OR expires_at > generated_at
  ),
  CONSTRAINT ai_recommendations_input_ck CHECK (jsonb_typeof(input_snapshot) = 'object')
);
COMMENT ON TABLE ai.recommendations IS
  'Ranked adaptive content recommendations with explicit model and input snapshot.';
CREATE INDEX ai_recommendations_active_idx
  ON ai.recommendations (user_id, generated_at DESC)
  WHERE accepted_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE ai.adaptive_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  decision_type text NOT NULL,
  candidates jsonb NOT NULL,
  selected_target_type text NOT NULL,
  selected_target_id uuid NOT NULL,
  policy_identifier text NOT NULL,
  policy_version text NOT NULL,
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  exploration_probability numeric(7,6),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_adaptive_candidates_ck CHECK (jsonb_typeof(candidates) = 'array'),
  CONSTRAINT ai_adaptive_probability_ck CHECK (
    exploration_probability IS NULL OR exploration_probability BETWEEN 0 AND 1
  )
);
COMMENT ON TABLE ai.adaptive_learning_events IS
  'Audit trail of every adaptive-selection decision, including rejected candidates.';
CREATE INDEX ai_adaptive_user_time_idx
  ON ai.adaptive_learning_events (user_id, occurred_at DESC);

CREATE TABLE ai.safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES ai.conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES ai.messages(id) ON DELETE SET NULL,
  category text NOT NULL,
  severity text NOT NULL,
  action text NOT NULL,
  detector text NOT NULL,
  detector_version text NOT NULL,
  evidence_hash text,
  reviewed_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_safety_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT ai_safety_action_ck CHECK (action IN ('allow', 'warn', 'redact', 'block', 'escalate'))
);
COMMENT ON TABLE ai.safety_events IS
  'Restricted audit of medical-safety, privacy and moderation decisions for Pulse.';
CREATE INDEX ai_safety_unreviewed_idx
  ON ai.safety_events (severity, created_at DESC) WHERE reviewed_at IS NULL;

CREATE TABLE engagement.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  purpose text NOT NULL,
  default_channel core.notification_channel NOT NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE engagement.notification_templates IS
  'Stable notification identity for reminders, rewards, security and product messages.';

CREATE TABLE engagement.notification_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES engagement.notification_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  locale text NOT NULL,
  subject_template text,
  body_template text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (template_id, version_number, locale),
  CONSTRAINT notification_template_versions_number_ck CHECK (version_number > 0),
  CONSTRAINT notification_template_versions_schema_ck CHECK (jsonb_typeof(variables_schema) = 'object')
);
COMMENT ON TABLE engagement.notification_template_versions IS
  'Localized immutable notification copy and validated variable contract.';

CREATE TABLE engagement.notification_preferences (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  purpose text NOT NULL,
  channel core.notification_channel NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, purpose, channel)
);
COMMENT ON TABLE engagement.notification_preferences IS
  'Per-purpose and per-channel communication preferences, separate from legal consent history.';

CREATE TABLE engagement.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES iam.user_devices(id) ON DELETE CASCADE,
  provider text NOT NULL,
  endpoint_hash text NOT NULL,
  token_ciphertext text NOT NULL,
  key_version text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, endpoint_hash)
);
COMMENT ON TABLE engagement.push_subscriptions IS
  'Encrypted push destination per device; raw tokens never appear in logs or analytics.';
CREATE INDEX push_subscriptions_user_active_idx
  ON engagement.push_subscriptions (user_id, enabled) WHERE invalidated_at IS NULL;

CREATE TABLE engagement.notification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES engagement.notification_templates(id) ON DELETE CASCADE,
  schedule_type text NOT NULL,
  cron_expression text,
  next_run_at timestamptz,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_schedules_type_ck CHECK (
    schedule_type IN ('revision_due', 'daily_study', 'streak_risk', 'weekly_summary', 'custom')
  ),
  CONSTRAINT notification_schedules_cron_ck CHECK (
    (schedule_type = 'custom' AND cron_expression IS NOT NULL)
    OR schedule_type <> 'custom'
  ),
  CONSTRAINT notification_schedules_context_ck CHECK (jsonb_typeof(context) = 'object')
);
COMMENT ON TABLE engagement.notification_schedules IS
  'User-specific revision and study reminder schedules evaluated by trusted workers.';
CREATE INDEX notification_schedules_due_idx
  ON engagement.notification_schedules (next_run_at)
  WHERE enabled AND next_run_at IS NOT NULL;

CREATE TABLE engagement.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  template_version_id uuid NOT NULL REFERENCES engagement.notification_template_versions(id) ON DELETE RESTRICT,
  channel core.notification_channel NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority smallint NOT NULL DEFAULT 5,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status core.delivery_status NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT notification_queue_priority_ck CHECK (priority BETWEEN 1 AND 10),
  CONSTRAINT notification_queue_attempts_ck CHECK (attempt_count >= 0),
  CONSTRAINT notification_queue_dates_ck CHECK (expires_at IS NULL OR expires_at > scheduled_at),
  CONSTRAINT notification_queue_variables_ck CHECK (jsonb_typeof(variables) = 'object')
);
COMMENT ON TABLE engagement.notification_queue IS
  'Transactional, retryable queue for in-app, push and email delivery workers.';
CREATE INDEX notification_queue_worker_idx
  ON engagement.notification_queue (priority DESC, next_attempt_at)
  WHERE status IN ('queued', 'failed');

CREATE TABLE engagement.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES engagement.notification_queue(id) ON DELETE CASCADE,
  provider text,
  provider_message_ref text,
  status core.delivery_status NOT NULL,
  rendered_subject text,
  rendered_body_hash text NOT NULL,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE engagement.notification_deliveries IS
  'Per-attempt delivery history with provider response and privacy-safe rendered-content hash.';
CREATE INDEX notification_deliveries_queue_idx
  ON engagement.notification_deliveries (queue_id, created_at DESC);
CREATE INDEX notification_deliveries_provider_idx
  ON engagement.notification_deliveries (provider, provider_message_ref)
  WHERE provider_message_ref IS NOT NULL;

CREATE TABLE engagement.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  queue_id uuid REFERENCES engagement.notification_queue(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  expires_at timestamptz,
  CONSTRAINT in_app_notifications_payload_ck CHECK (jsonb_typeof(payload) = 'object')
);
COMMENT ON TABLE engagement.in_app_notifications IS
  'Realtime user inbox with read, dismiss and expiry state.';
CREATE INDEX in_app_notifications_unread_idx
  ON engagement.in_app_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE analytics.learning_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  anonymous_id uuid,
  session_id uuid,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  entity_type text,
  entity_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_occurred_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at),
  CONSTRAINT learning_events_actor_ck CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
  CONSTRAINT learning_events_version_ck CHECK (event_version > 0),
  CONSTRAINT learning_events_properties_ck CHECK (jsonb_typeof(properties) = 'object')
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE analytics.learning_events IS
  'High-volume append-only behavioral event stream, monthly partitioned and privacy minimized.';
CREATE TABLE analytics.learning_events_default
  PARTITION OF analytics.learning_events DEFAULT;
CREATE INDEX learning_events_user_time_idx
  ON analytics.learning_events (user_id, occurred_at DESC);
CREATE INDEX learning_events_name_time_idx
  ON analytics.learning_events (event_name, occurred_at DESC);
CREATE INDEX learning_events_entity_idx
  ON analytics.learning_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX learning_events_properties_gin
  ON analytics.learning_events USING gin (properties jsonb_path_ops);

CREATE TABLE analytics.user_daily_stats (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  timezone text NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  lessons_started integer NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  reviews_completed integer NOT NULL DEFAULT 0,
  streak_qualified boolean NOT NULL DEFAULT false,
  average_response_ms numeric,
  mastery_delta numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stat_date),
  CONSTRAINT user_daily_stats_nonnegative_ck CHECK (
    active_seconds >= 0
    AND lessons_started >= 0
    AND lessons_completed >= 0
    AND questions_answered >= 0
    AND correct_answers >= 0
    AND correct_answers <= questions_answered
    AND xp_earned >= 0
    AND reviews_completed >= 0
    AND (average_response_ms IS NULL OR average_response_ms >= 0)
  )
);
COMMENT ON TABLE analytics.user_daily_stats IS
  'Daily user learning aggregate used for heatmaps, streaks and dashboards.';
CREATE INDEX user_daily_stats_date_idx
  ON analytics.user_daily_stats (stat_date, lessons_completed);

CREATE TABLE analytics.user_weekly_stats (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  week_start date NOT NULL,
  active_days integer NOT NULL DEFAULT 0,
  active_seconds bigint NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2),
  xp_earned integer NOT NULL DEFAULT 0,
  mastery_score numeric(5,2),
  retention_score numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start),
  CONSTRAINT user_weekly_stats_values_ck CHECK (
    active_days BETWEEN 0 AND 7
    AND active_seconds >= 0
    AND lessons_completed >= 0
    AND questions_answered >= 0
    AND xp_earned >= 0
    AND (accuracy IS NULL OR accuracy BETWEEN 0 AND 100)
    AND (mastery_score IS NULL OR mastery_score BETWEEN 0 AND 100)
    AND (retention_score IS NULL OR retention_score BETWEEN 0 AND 100)
  )
);
COMMENT ON TABLE analytics.user_weekly_stats IS
  'Weekly user aggregate for trend charts and league reporting.';

CREATE TABLE analytics.user_monthly_stats (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  month_start date NOT NULL,
  active_days integer NOT NULL DEFAULT 0,
  active_seconds bigint NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2),
  xp_earned integer NOT NULL DEFAULT 0,
  mastery_score numeric(5,2),
  retention_score numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_start),
  CONSTRAINT user_monthly_stats_values_ck CHECK (
    active_days BETWEEN 0 AND 31
    AND active_seconds >= 0
    AND lessons_completed >= 0
    AND questions_answered >= 0
    AND xp_earned >= 0
    AND (accuracy IS NULL OR accuracy BETWEEN 0 AND 100)
    AND (mastery_score IS NULL OR mastery_score BETWEEN 0 AND 100)
    AND (retention_score IS NULL OR retention_score BETWEEN 0 AND 100)
  )
);
COMMENT ON TABLE analytics.user_monthly_stats IS
  'Monthly user aggregate for longitudinal learning and retention reporting.';

CREATE TABLE analytics.content_daily_stats (
  stat_date date NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  starts bigint NOT NULL DEFAULT 0,
  completions bigint NOT NULL DEFAULT 0,
  successful_completions bigint NOT NULL DEFAULT 0,
  average_score numeric(5,2),
  average_duration_seconds numeric,
  unique_users bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stat_date, entity_type, entity_id),
  CONSTRAINT content_daily_stats_values_ck CHECK (
    starts >= 0
    AND completions >= 0
    AND successful_completions >= 0
    AND successful_completions <= completions
    AND unique_users >= 0
    AND (average_score IS NULL OR average_score BETWEEN 0 AND 100)
    AND (average_duration_seconds IS NULL OR average_duration_seconds >= 0)
  )
);
COMMENT ON TABLE analytics.content_daily_stats IS
  'Daily content performance aggregate for lessons, questions, paths, blocks and cases.';

CREATE TABLE analytics.question_quality_stats (
  question_version_id uuid PRIMARY KEY REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  attempt_count bigint NOT NULL DEFAULT 0,
  correct_count bigint NOT NULL DEFAULT 0,
  difficulty_index numeric(7,6),
  discrimination_index numeric(7,6),
  average_response_ms numeric,
  skip_count bigint NOT NULL DEFAULT 0,
  distractor_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_quality_counts_ck CHECK (
    attempt_count >= 0
    AND correct_count >= 0
    AND correct_count <= attempt_count
    AND skip_count >= 0
  ),
  CONSTRAINT question_quality_indices_ck CHECK (
    (difficulty_index IS NULL OR difficulty_index BETWEEN 0 AND 1)
    AND (discrimination_index IS NULL OR discrimination_index BETWEEN -1 AND 1)
    AND (average_response_ms IS NULL OR average_response_ms >= 0)
  ),
  CONSTRAINT question_quality_distribution_ck CHECK (jsonb_typeof(distractor_distribution) = 'object')
);
COMMENT ON TABLE analytics.question_quality_stats IS
  'Psychometric and distractor performance metrics for content-quality review.';

CREATE TABLE analytics.cohort_retention (
  cohort_date date NOT NULL,
  cohort_type text NOT NULL,
  period_number integer NOT NULL,
  cohort_size bigint NOT NULL,
  retained_users bigint NOT NULL,
  retention_rate numeric(7,6) NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimensions_hash text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_date, cohort_type, period_number, dimensions_hash),
  CONSTRAINT cohort_retention_values_ck CHECK (
    period_number >= 0
    AND cohort_size >= 0
    AND retained_users >= 0
    AND retained_users <= cohort_size
    AND retention_rate BETWEEN 0 AND 1
  ),
  CONSTRAINT cohort_retention_dimensions_ck CHECK (jsonb_typeof(dimensions) = 'object'),
  CONSTRAINT cohort_retention_dimensions_hash_ck CHECK (
    dimensions_hash ~ '^[0-9a-f]{64}$'
  )
);
COMMENT ON TABLE analytics.cohort_retention IS
  'Anonymous cohort-retention aggregates segmented by controlled dimensions; dimensions_hash is the canonical SHA-256 identity of dimensions.';

CREATE TABLE analytics.mastery_snapshots (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  mastery_score numeric(5,2) NOT NULL,
  confidence numeric(5,4) NOT NULL,
  state core.mastery_state NOT NULL,
  PRIMARY KEY (user_id, competency_id, snapshot_date),
  CONSTRAINT mastery_snapshots_values_ck CHECK (
    mastery_score BETWEEN 0 AND 100 AND confidence BETWEEN 0 AND 1
  )
);
COMMENT ON TABLE analytics.mastery_snapshots IS
  'Daily per-competency snapshots for learning-curve visualization and model evaluation.';

CREATE TABLE analytics.heatmap_cells (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  local_date date NOT NULL,
  local_hour smallint NOT NULL,
  activity_count integer NOT NULL DEFAULT 0,
  active_seconds integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, local_date, local_hour),
  CONSTRAINT heatmap_cells_hour_ck CHECK (local_hour BETWEEN 0 AND 23),
  CONSTRAINT heatmap_cells_values_ck CHECK (activity_count >= 0 AND active_seconds >= 0)
);
COMMENT ON TABLE analytics.heatmap_cells IS
  'Pre-aggregated local-time activity heatmap cells; no raw content is exposed.';

CREATE TRIGGER ai_user_memories_set_updated_at
BEFORE UPDATE ON ai.user_memories
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER notification_templates_set_updated_at
BEFORE UPDATE ON engagement.notification_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER notification_preferences_set_updated_at
BEFORE UPDATE ON engagement.notification_preferences
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER push_subscriptions_set_updated_at
BEFORE UPDATE ON engagement.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER notification_schedules_set_updated_at
BEFORE UPDATE ON engagement.notification_schedules
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

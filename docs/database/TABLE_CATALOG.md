# Dictionnaire de données MedLingo Enterprise V1

> Ce document est généré depuis le SQL de référence. Le SQL reste la
> définition exécutable exacte des types, valeurs par défaut, contraintes et index.

- Tables logiques : **195**
- Partitions physiques par défaut : **2**
- Index explicites : **337**

## Répartition par domaine

| Domaine | Tables |
|---|---:|
| `ai` | 9 |
| `analytics` | 9 |
| `anatomy` | 6 |
| `clinical` | 9 |
| `commerce` | 23 |
| `engagement` | 8 |
| `gamification` | 23 |
| `governance` | 8 |
| `iam` | 16 |
| `knowledge` | 13 |
| `learning` | 17 |
| `media` | 4 |
| `operations` | 11 |
| `practice` | 22 |
| `progress` | 17 |

## Domaine `ai`

### `ai.conversations`

**Description et justification.** User-owned Pulse interaction thread scoped to tutoring, revision or a clinical debrief.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `title` | `text` | oui | — | — | — | — | — |
| `purpose` | `text` | non | `'tutor'` | — | — | — | — |
| `formation_id` | `uuid` | oui | — | — | — | `learning.formations.id` (N:1) | — |
| `lesson_id` | `uuid` | oui | — | — | — | `learning.lessons.id` (N:1) | — |
| `clinical_case_id` | `uuid` | oui | — | — | — | `clinical.cases.id` (N:1) | — |
| `status` | `text` | non | `'active'` | — | — | — | — |
| `model_policy` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `last_message_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `archived_at` | `timestamptz` | oui | — | — | — | — | — |
| `deleted_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `formation_id -> learning.formations.id ON DELETE SET NULL`; `lesson_id -> learning.lessons.id ON DELETE SET NULL`; `clinical_case_id -> clinical.cases.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_conversations_purpose_ck CHECK ( purpose IN ('tutor', 'debrief', 'revision', 'recommendation', 'support') )`; `CONSTRAINT ai_conversations_status_ck CHECK ( status IN ('active', 'archived', 'deleted') )`; `CONSTRAINT ai_conversations_policy_ck CHECK (jsonb_typeof(model_policy) = 'object')`

**Index.** `ai_conversations_user_recent_idx` ((user_id, last_message_at DESC) WHERE deleted_at IS NULL); `idx_conversations_formation_id` ((formation_id)); `idx_conversations_lesson_id` ((lesson_id)); `idx_conversations_clinical_case_id` ((clinical_case_id))

### `ai.messages`

**Description et justification.** Append-only Pulse messages with model, prompt, token, safety and latency audit fields.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `conversation_id` | `uuid` | non | — | — | — | `ai.conversations.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `role` | `core.ai_message_role` | non | — | — | — | — | — |
| `content` | `text` | non | — | — | — | — | — |
| `content_blocks` | `jsonb` | non | `'[]'::jsonb` | — | — | — | — |
| `model_identifier` | `text` | oui | — | — | — | — | — |
| `prompt_version` | `text` | oui | — | — | — | — | — |
| `input_tokens` | `integer` | oui | — | — | — | — | — |
| `output_tokens` | `integer` | oui | — | — | — | — | — |
| `latency_ms` | `integer` | oui | — | — | — | — | — |
| `safety_status` | `text` | non | `'unchecked'` | — | — | — | — |
| `client_message_id` | `uuid` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `deleted_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `conversation_id -> ai.conversations.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (user_id, client_message_id)`

**Checks.** `CONSTRAINT ai_messages_blocks_ck CHECK (jsonb_typeof(content_blocks) = 'array')`; `CONSTRAINT ai_messages_tokens_ck CHECK ( (input_tokens IS NULL OR input_tokens >= 0) AND (output_tokens IS NULL OR output_tokens >= 0) AND (latency_ms IS NULL OR latency_ms >= 0) )`; `CONSTRAINT ai_messages_safety_ck CHECK ( safety_status IN ('unchecked', 'safe', 'flagged', 'blocked', 'reviewed') )`

**Index.** `ai_messages_conversation_time_idx` ((conversation_id, created_at)); `ai_messages_user_time_idx` ((user_id, created_at DESC))

### `ai.message_citations`

**Description et justification.** Precise source grounding for Pulse responses.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `message_id` | `uuid` | non | — | — | — | `ai.messages.id` (N:1) | — |
| `source_section_id` | `uuid` | non | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `citation_order` | `integer` | non | — | — | — | — | — |
| `relevance` | `numeric(5,4)` | oui | — | — | — | — | — |
| `quoted_text_hash` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (message_id, source_section_id)`

**Relations.** `message_id -> ai.messages.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (message_id, citation_order)`

**Checks.** `CONSTRAINT ai_message_citations_order_ck CHECK (citation_order > 0)`; `CONSTRAINT ai_message_citations_relevance_ck CHECK ( relevance IS NULL OR relevance BETWEEN 0 AND 1 )`

**Index.** `idx_message_citations_source_section_id` ((source_section_id))

### `ai.user_memories`

**Description et justification.** Consent-bound, expirable user learning memory; excludes diagnostic or unnecessary health data.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `memory_type` | `text` | non | — | — | — | — | — |
| `content` | `text` | non | — | — | — | — | — |
| `structured_content` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `sensitivity` | `text` | non | `'standard'` | — | — | — | — |
| `source_conversation_id` | `uuid` | oui | — | — | — | `ai.conversations.id` (N:1) | — |
| `source_message_id` | `uuid` | oui | — | — | — | `ai.messages.id` (N:1) | — |
| `confidence` | `numeric(5,4)` | non | `1` | — | — | — | — |
| `consent_code` | `text` | non | `'ai_memory'` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `superseded_by` | `uuid` | oui | — | — | — | `ai.user_memories.id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `deleted_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `source_conversation_id -> ai.conversations.id ON DELETE SET NULL`; `source_message_id -> ai.messages.id ON DELETE SET NULL`; `superseded_by -> ai.user_memories.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_user_memories_type_ck CHECK ( memory_type IN ('preference', 'goal', 'difficulty', 'learning_fact', 'constraint') )`; `CONSTRAINT ai_user_memories_sensitivity_ck CHECK ( sensitivity IN ('standard', 'sensitive', 'restricted') )`; `CONSTRAINT ai_user_memories_confidence_ck CHECK (confidence BETWEEN 0 AND 1)`; `CONSTRAINT ai_user_memories_content_ck CHECK (jsonb_typeof(structured_content) = 'object')`

**Index.** `ai_user_memories_active_idx` ((user_id, memory_type, updated_at DESC) WHERE deleted_at IS NULL); `idx_user_memories_source_conversation_id` ((source_conversation_id)); `idx_user_memories_source_message_id` ((source_message_id)); `idx_user_memories_superseded_by` ((superseded_by))

### `ai.memory_embeddings`

**Description et justification.** Semantic vectors for consented user learning memories.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `memory_id` | `uuid` | non | — | — | — | `ai.user_memories.id` (N:1) | — |
| `embedding_model` | `text` | non | — | — | — | — | — |
| `embedding` | `extensions.vector(1536)` | non | — | — | — | — | — |
| `content_hash` | `text` | non | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (memory_id, embedding_model)`

**Relations.** `memory_id -> ai.user_memories.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `ai_memory_embeddings_hnsw_idx` (USING hnsw (embedding vector_cosine_ops))

### `ai.context_snapshots`

**Description et justification.** Immutable context actually supplied to Pulse, enabling privacy review and reproducibility.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `conversation_id` | `uuid` | non | — | — | — | `ai.conversations.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `formation_id` | `uuid` | oui | — | — | — | `learning.formations.id` (N:1) | — |
| `lesson_id` | `uuid` | oui | — | — | — | `learning.lessons.id` (N:1) | — |
| `mastery_snapshot` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `progress_snapshot` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `retrieved_concept_ids` | `uuid[]` | non | `ARRAY[]::uuid[]` | — | — | — | — |
| `retrieved_memory_ids` | `uuid[]` | non | `ARRAY[]::uuid[]` | — | — | — | — |
| `prompt_context_hash` | `text` | non | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `conversation_id -> ai.conversations.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `formation_id -> learning.formations.id ON DELETE SET NULL`; `lesson_id -> learning.lessons.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_context_mastery_ck CHECK (jsonb_typeof(mastery_snapshot) = 'object')`; `CONSTRAINT ai_context_progress_ck CHECK (jsonb_typeof(progress_snapshot) = 'object')`

**Index.** `ai_context_conversation_idx` ((conversation_id, created_at DESC)); `ai_context_concepts_gin` (USING gin (retrieved_concept_ids)); `idx_context_snapshots_user_id` ((user_id)); `idx_context_snapshots_formation_id` ((formation_id)); `idx_context_snapshots_lesson_id` ((lesson_id))

### `ai.recommendations`

**Description et justification.** Ranked adaptive content recommendations with explicit model and input snapshot.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `recommendation_type` | `text` | non | — | — | — | — | — |
| `target_type` | `text` | non | — | — | — | — | — |
| `target_id` | `uuid` | non | — | — | — | — | — |
| `rationale` | `text` | non | — | — | — | — | — |
| `score` | `numeric(7,6)` | non | — | — | — | — | — |
| `model_identifier` | `text` | non | — | — | — | — | — |
| `model_version` | `text` | non | — | — | — | — | — |
| `input_snapshot` | `jsonb` | non | — | — | — | — | — |
| `generated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `accepted_at` | `timestamptz` | oui | — | — | — | — | — |
| `dismissed_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_recommendations_score_ck CHECK (score BETWEEN 0 AND 1)`; `CONSTRAINT ai_recommendations_dates_ck CHECK ( expires_at IS NULL OR expires_at > generated_at )`; `CONSTRAINT ai_recommendations_input_ck CHECK (jsonb_typeof(input_snapshot) = 'object')`

**Index.** `ai_recommendations_active_idx` ((user_id, generated_at DESC) WHERE accepted_at IS NULL AND dismissed_at IS NULL)

### `ai.adaptive_learning_events`

**Description et justification.** Audit trail of every adaptive-selection decision, including rejected candidates.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `decision_type` | `text` | non | — | — | — | — | — |
| `candidates` | `jsonb` | non | — | — | — | — | — |
| `selected_target_type` | `text` | non | — | — | — | — | — |
| `selected_target_id` | `uuid` | non | — | — | — | — | — |
| `policy_identifier` | `text` | non | — | — | — | — | — |
| `policy_version` | `text` | non | — | — | — | — | — |
| `reason_codes` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `exploration_probability` | `numeric(7,6)` | oui | — | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_adaptive_candidates_ck CHECK (jsonb_typeof(candidates) = 'array')`; `CONSTRAINT ai_adaptive_probability_ck CHECK ( exploration_probability IS NULL OR exploration_probability BETWEEN 0 AND 1 )`

**Index.** `ai_adaptive_user_time_idx` ((user_id, occurred_at DESC))

### `ai.safety_events`

**Description et justification.** Restricted audit of medical-safety, privacy and moderation decisions for Pulse.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `conversation_id` | `uuid` | oui | — | — | — | `ai.conversations.id` (N:1) | — |
| `message_id` | `uuid` | oui | — | — | — | `ai.messages.id` (N:1) | — |
| `category` | `text` | non | — | — | — | — | — |
| `severity` | `text` | non | — | — | — | — | — |
| `action` | `text` | non | — | — | — | — | — |
| `detector` | `text` | non | — | — | — | — | — |
| `detector_version` | `text` | non | — | — | — | — | — |
| `evidence_hash` | `text` | oui | — | — | — | — | — |
| `reviewed_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `reviewed_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `conversation_id -> ai.conversations.id ON DELETE SET NULL`; `message_id -> ai.messages.id ON DELETE SET NULL`; `reviewed_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT ai_safety_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical'))`; `CONSTRAINT ai_safety_action_ck CHECK (action IN ('allow', 'warn', 'redact', 'block', 'escalate'))`

**Index.** `ai_safety_unreviewed_idx` ((severity, created_at DESC) WHERE reviewed_at IS NULL); `idx_safety_events_user_id` ((user_id)); `idx_safety_events_conversation_id` ((conversation_id)); `idx_safety_events_message_id` ((message_id)); `idx_safety_events_reviewed_by` ((reviewed_by))

## Domaine `analytics`

### `analytics.learning_events`

**Description et justification.** High-volume append-only behavioral event stream, monthly partitioned and privacy minimized.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | — | — | — | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `anonymous_id` | `uuid` | oui | — | — | — | — | — |
| `session_id` | `uuid` | oui | — | — | — | — | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `event_name` | `text` | non | — | — | — | — | — |
| `event_version` | `integer` | non | `1` | — | — | — | — |
| `entity_type` | `text` | oui | — | — | — | — | — |
| `entity_id` | `uuid` | oui | — | — | — | — | — |
| `properties` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `client_occurred_at` | `timestamptz` | oui | — | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `received_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (id, occurred_at)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT learning_events_actor_ck CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)`; `CONSTRAINT learning_events_version_ck CHECK (event_version > 0)`; `CONSTRAINT learning_events_properties_ck CHECK (jsonb_typeof(properties) = 'object')`

**Index.** `learning_events_user_time_idx` ((user_id, occurred_at DESC)); `learning_events_name_time_idx` ((event_name, occurred_at DESC)); `learning_events_entity_idx` ((entity_type, entity_id, occurred_at DESC)); `learning_events_properties_gin` (USING gin (properties jsonb_path_ops)); `idx_learning_events_device_id` ((device_id))

### `analytics.user_daily_stats`

**Description et justification.** Daily user learning aggregate used for heatmaps, streaks and dashboards.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `stat_date` | `date` | non | — | — | — | — | — |
| `timezone` | `text` | non | — | — | — | — | — |
| `active_seconds` | `integer` | non | `0` | — | — | — | — |
| `lessons_started` | `integer` | non | `0` | — | — | — | — |
| `lessons_completed` | `integer` | non | `0` | — | — | — | — |
| `questions_answered` | `integer` | non | `0` | — | — | — | — |
| `correct_answers` | `integer` | non | `0` | — | — | — | — |
| `xp_earned` | `integer` | non | `0` | — | — | — | — |
| `reviews_completed` | `integer` | non | `0` | — | — | — | — |
| `streak_qualified` | `boolean` | non | `false` | — | — | — | — |
| `average_response_ms` | `numeric` | oui | — | — | — | — | — |
| `mastery_delta` | `numeric` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, stat_date)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_daily_stats_nonnegative_ck CHECK ( active_seconds >= 0 AND lessons_started >= 0 AND lessons_completed >= 0 AND questions_answered >= 0 AND correct_answers >= 0 AND correct_answers <= questions_answered AND xp_earned >= 0 AND reviews_completed >= 0 AND (average_response_ms IS NULL OR average_response_ms >= 0) )`

**Index.** `user_daily_stats_date_idx` ((stat_date, lessons_completed))

### `analytics.user_weekly_stats`

**Description et justification.** Weekly user aggregate for trend charts and league reporting.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `week_start` | `date` | non | — | — | — | — | — |
| `active_days` | `integer` | non | `0` | — | — | — | — |
| `active_seconds` | `bigint` | non | `0` | — | — | — | — |
| `lessons_completed` | `integer` | non | `0` | — | — | — | — |
| `questions_answered` | `integer` | non | `0` | — | — | — | — |
| `accuracy` | `numeric(5,2)` | oui | — | — | — | — | — |
| `xp_earned` | `integer` | non | `0` | — | — | — | — |
| `mastery_score` | `numeric(5,2)` | oui | — | — | — | — | — |
| `retention_score` | `numeric(5,2)` | oui | — | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, week_start)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_weekly_stats_values_ck CHECK ( active_days BETWEEN 0 AND 7 AND active_seconds >= 0 AND lessons_completed >= 0 AND questions_answered >= 0 AND xp_earned >= 0 AND (accuracy IS NULL OR accuracy BETWEEN 0 AND 100) AND (mastery_score IS NULL OR mastery_score BETWEEN 0 AND 100) AND (retention_score IS NULL OR retention_score BETWEEN 0 AND 100) )`

**Index.** Clé primaire / uniques uniquement.

### `analytics.user_monthly_stats`

**Description et justification.** Monthly user aggregate for longitudinal learning and retention reporting.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `month_start` | `date` | non | — | — | — | — | — |
| `active_days` | `integer` | non | `0` | — | — | — | — |
| `active_seconds` | `bigint` | non | `0` | — | — | — | — |
| `lessons_completed` | `integer` | non | `0` | — | — | — | — |
| `questions_answered` | `integer` | non | `0` | — | — | — | — |
| `accuracy` | `numeric(5,2)` | oui | — | — | — | — | — |
| `xp_earned` | `integer` | non | `0` | — | — | — | — |
| `mastery_score` | `numeric(5,2)` | oui | — | — | — | — | — |
| `retention_score` | `numeric(5,2)` | oui | — | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, month_start)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_monthly_stats_values_ck CHECK ( active_days BETWEEN 0 AND 31 AND active_seconds >= 0 AND lessons_completed >= 0 AND questions_answered >= 0 AND xp_earned >= 0 AND (accuracy IS NULL OR accuracy BETWEEN 0 AND 100) AND (mastery_score IS NULL OR mastery_score BETWEEN 0 AND 100) AND (retention_score IS NULL OR retention_score BETWEEN 0 AND 100) )`

**Index.** Clé primaire / uniques uniquement.

### `analytics.content_daily_stats`

**Description et justification.** Daily content performance aggregate for lessons, questions, paths, blocks and cases.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `stat_date` | `date` | non | — | — | — | — | — |
| `entity_type` | `text` | non | — | — | — | — | — |
| `entity_id` | `uuid` | non | — | — | — | — | — |
| `starts` | `bigint` | non | `0` | — | — | — | — |
| `completions` | `bigint` | non | `0` | — | — | — | — |
| `successful_completions` | `bigint` | non | `0` | — | — | — | — |
| `average_score` | `numeric(5,2)` | oui | — | — | — | — | — |
| `average_duration_seconds` | `numeric` | oui | — | — | — | — | — |
| `unique_users` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (stat_date, entity_type, entity_id)`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT content_daily_stats_values_ck CHECK ( starts >= 0 AND completions >= 0 AND successful_completions >= 0 AND successful_completions <= completions AND unique_users >= 0 AND (average_score IS NULL OR average_score BETWEEN 0 AND 100) AND (average_duration_seconds IS NULL OR average_duration_seconds >= 0) )`

**Index.** Clé primaire / uniques uniquement.

### `analytics.question_quality_stats`

**Description et justification.** Psychometric and distractor performance metrics for content-quality review.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | oui | — | `practice.question_versions.id` (1:0..1) | — |
| `attempt_count` | `bigint` | non | `0` | — | — | — | — |
| `correct_count` | `bigint` | non | `0` | — | — | — | — |
| `difficulty_index` | `numeric(7,6)` | oui | — | — | — | — | — |
| `discrimination_index` | `numeric(7,6)` | oui | — | — | — | — | — |
| `average_response_ms` | `numeric` | oui | — | — | — | — | — |
| `skip_count` | `bigint` | non | `0` | — | — | — | — |
| `distractor_distribution` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `last_computed_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `question_version_id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT question_quality_counts_ck CHECK ( attempt_count >= 0 AND correct_count >= 0 AND correct_count <= attempt_count AND skip_count >= 0 )`; `CONSTRAINT question_quality_indices_ck CHECK ( (difficulty_index IS NULL OR difficulty_index BETWEEN 0 AND 1) AND (discrimination_index IS NULL OR discrimination_index BETWEEN -1 AND 1) AND (average_response_ms IS NULL OR average_response_ms >= 0) )`; `CONSTRAINT question_quality_distribution_ck CHECK (jsonb_typeof(distractor_distribution) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `analytics.cohort_retention`

**Description et justification.** Anonymous cohort-retention aggregates segmented by controlled dimensions; dimensions_hash is the canonical SHA-256 identity of dimensions.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `cohort_date` | `date` | non | — | — | — | — | — |
| `cohort_type` | `text` | non | — | — | — | — | — |
| `period_number` | `integer` | non | — | — | — | — | — |
| `cohort_size` | `bigint` | non | — | — | — | — | — |
| `retained_users` | `bigint` | non | — | — | — | — | — |
| `retention_rate` | `numeric(7,6)` | non | — | — | — | — | — |
| `dimensions` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `dimensions_hash` | `text` | non | — | — | — | — | — |
| `computed_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (cohort_date, cohort_type, period_number, dimensions_hash)`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT cohort_retention_values_ck CHECK ( period_number >= 0 AND cohort_size >= 0 AND retained_users >= 0 AND retained_users <= cohort_size AND retention_rate BETWEEN 0 AND 1 )`; `CONSTRAINT cohort_retention_dimensions_ck CHECK (jsonb_typeof(dimensions) = 'object')`; `CONSTRAINT cohort_retention_dimensions_hash_ck CHECK ( dimensions_hash ~ '^[0-9a-f]{64}$' )`

**Index.** Clé primaire / uniques uniquement.

### `analytics.mastery_snapshots`

**Description et justification.** Daily per-competency snapshots for learning-curve visualization and model evaluation.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `snapshot_date` | `date` | non | — | — | — | — | — |
| `mastery_score` | `numeric(5,2)` | non | — | — | — | — | — |
| `confidence` | `numeric(5,4)` | non | — | — | — | — | — |
| `state` | `core.mastery_state` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, competency_id, snapshot_date)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT mastery_snapshots_values_ck CHECK ( mastery_score BETWEEN 0 AND 100 AND confidence BETWEEN 0 AND 1 )`

**Index.** `idx_mastery_snapshots_competency_id` ((competency_id))

### `analytics.heatmap_cells`

**Description et justification.** Pre-aggregated local-time activity heatmap cells; no raw content is exposed.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `local_date` | `date` | non | — | — | — | — | — |
| `local_hour` | `smallint` | non | — | — | — | — | — |
| `activity_count` | `integer` | non | `0` | — | — | — | — |
| `active_seconds` | `integer` | non | `0` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, local_date, local_hour)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT heatmap_cells_hour_ck CHECK (local_hour BETWEEN 0 AND 23)`; `CONSTRAINT heatmap_cells_values_ck CHECK (activity_count >= 0 AND active_seconds >= 0)`

**Index.** Clé primaire / uniques uniquement.

## Domaine `anatomy`

### `anatomy.body_systems`

**Description et justification.** Canonical anatomical systems linked to the shared medical concept graph.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `concept_id` | `uuid` | non | — | — | oui | `knowledge.medical_concepts.id` (1:0..1) | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `sort_order` | `integer` | non | `0` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `concept_id -> knowledge.medical_concepts.id ON DELETE RESTRICT`

**Contraintes uniques.** `concept_id`; `stable_key`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `anatomy.structures`

**Description et justification.** Unified 3NF anatomy entity for bones, muscles, organs, nerves, vessels, regions and landmarks.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `concept_id` | `uuid` | non | — | — | oui | `knowledge.medical_concepts.id` (1:0..1) | — |
| `body_system_id` | `uuid` | oui | — | — | — | `anatomy.body_systems.id` (N:1) | — |
| `parent_structure_id` | `uuid` | oui | — | — | — | `anatomy.structures.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `structure_type` | `text` | non | — | — | — | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `laterality` | `text` | oui | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `concept_id -> knowledge.medical_concepts.id ON DELETE RESTRICT`; `body_system_id -> anatomy.body_systems.id ON DELETE SET NULL`; `parent_structure_id -> anatomy.structures.id ON DELETE RESTRICT`

**Contraintes uniques.** `concept_id`; `stable_key`

**Checks.** `CONSTRAINT anatomy_structure_type_ck CHECK ( structure_type IN ('region', 'bone', 'muscle', 'organ', 'nerve', 'vessel', 'tissue', 'landmark', 'other') )`; `CONSTRAINT anatomy_laterality_ck CHECK ( laterality IS NULL OR laterality IN ('left', 'right', 'bilateral', 'midline', 'not_applicable') )`; `CONSTRAINT anatomy_structures_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `anatomy_structures_system_type_idx` ((body_system_id, structure_type, status)); `anatomy_structures_parent_idx` ((parent_structure_id))

### `anatomy.structure_relationships`

**Description et justification.** Sourced anatomical hierarchy and spatial/functional relationships.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_structure_id` | `uuid` | non | — | — | — | `anatomy.structures.id` (N:1) | — |
| `target_structure_id` | `uuid` | non | — | — | — | `anatomy.structures.id` (N:1) | — |
| `relationship` | `core.relationship_kind` | non | — | — | — | — | — |
| `source_section_id` | `uuid` | oui | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_structure_id -> anatomy.structures.id ON DELETE CASCADE`; `target_structure_id -> anatomy.structures.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (source_structure_id, target_structure_id, relationship)`

**Checks.** `CONSTRAINT anatomy_relationship_not_self_ck CHECK (source_structure_id <> target_structure_id)`; `CONSTRAINT anatomy_relationship_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `structure_relationships_target_idx` ((target_structure_id, relationship)); `idx_structure_relationships_source_section_id` ((source_section_id))

### `anatomy.models`

**Description et justification.** Versioned optimized 3D anatomy model catalog stored through media assets.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `model_asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `preview_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `coordinate_system` | `text` | non | `'right_handed_y_up'` | — | — | — | — |
| `units` | `text` | non | `'meters'` | — | — | — | — |
| `version_label` | `text` | non | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `model_asset_id -> media.assets.id ON DELETE RESTRICT`; `preview_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT anatomy_models_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `idx_models_model_asset_id` ((model_asset_id)); `idx_models_preview_asset_id` ((preview_asset_id))

### `anatomy.model_nodes`

**Description et justification.** Addressable model scene nodes mapped to canonical anatomy structures.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `model_id` | `uuid` | non | — | — | — | `anatomy.models.id` (N:1) | — |
| `structure_id` | `uuid` | oui | — | — | — | `anatomy.structures.id` (N:1) | — |
| `parent_node_id` | `uuid` | oui | — | — | — | `anatomy.model_nodes.id` (N:1) | — |
| `node_key` | `text` | non | — | — | — | — | — |
| `label` | `text` | oui | — | — | — | — | — |
| `transform` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `interaction_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `model_id -> anatomy.models.id ON DELETE CASCADE`; `structure_id -> anatomy.structures.id ON DELETE SET NULL`; `parent_node_id -> anatomy.model_nodes.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (model_id, node_key)`

**Checks.** `CONSTRAINT anatomy_model_nodes_transform_ck CHECK (jsonb_typeof(transform) = 'object')`; `CONSTRAINT anatomy_model_nodes_interaction_ck CHECK (jsonb_typeof(interaction_config) = 'object')`

**Index.** `anatomy_model_nodes_structure_idx` ((structure_id) WHERE structure_id IS NOT NULL); `idx_model_nodes_parent_node_id` ((parent_node_id))

### `anatomy.hotspots`

**Description et justification.** Interactive coordinates and camera targets for anatomical localization exercises.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `model_id` | `uuid` | non | — | — | — | `anatomy.models.id` (N:1) | — |
| `structure_id` | `uuid` | non | — | — | — | `anatomy.structures.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `position` | `jsonb` | non | — | — | — | — | — |
| `camera_target` | `jsonb` | oui | — | — | — | — | — |
| `radius` | `numeric` | non | `0.02` | — | — | — | — |
| `label` | `text` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `model_id -> anatomy.models.id ON DELETE CASCADE`; `structure_id -> anatomy.structures.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (model_id, stable_key)`

**Checks.** `CONSTRAINT anatomy_hotspots_radius_ck CHECK (radius > 0)`; `CONSTRAINT anatomy_hotspots_position_ck CHECK (jsonb_typeof(position) = 'object')`; `CONSTRAINT anatomy_hotspots_camera_ck CHECK ( camera_target IS NULL OR jsonb_typeof(camera_target) = 'object' )`; `CONSTRAINT anatomy_hotspots_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `anatomy_hotspots_structure_idx` ((structure_id, model_id))

## Domaine `clinical`

### `clinical.cases`

**Description et justification.** Stable identity of a clinical scenario reusable in lessons, Bosses and Intervention.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `domain_id` | `uuid` | non | — | — | — | `knowledge.medical_domains.id` (N:1) | — |
| `difficulty` | `core.difficulty_level` | non | — | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `clinical.case_versions.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `domain_id -> knowledge.medical_domains.id ON DELETE RESTRICT`; `CONSTRAINT clinical_cases_current_version_fk: (current_version_id) -> clinical.case_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_cases_domain_id` ((domain_id)); `idx_cases_current_version_id` ((current_version_id))

### `clinical.case_versions`

**Description et justification.** Immutable, medically reviewed scenario version with initial state, score and timing rules.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `case_id` | `uuid` | non | — | — | — | `clinical.cases.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `summary` | `text` | non | — | — | — | — | — |
| `patient_profile` | `jsonb` | non | — | — | — | — | — |
| `initial_state` | `jsonb` | non | — | — | — | — | — |
| `scoring_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `timing_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `case_id -> clinical.cases.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (case_id, version_number)`

**Checks.** `CONSTRAINT case_versions_number_ck CHECK (version_number > 0)`; `CONSTRAINT case_versions_patient_ck CHECK (jsonb_typeof(patient_profile) = 'object')`; `CONSTRAINT case_versions_state_ck CHECK (jsonb_typeof(initial_state) = 'object')`; `CONSTRAINT case_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object')`; `CONSTRAINT case_versions_timing_ck CHECK (jsonb_typeof(timing_config) = 'object')`; `CONSTRAINT case_versions_published_ck CHECK ( status <> 'published' OR published_at IS NOT NULL )`

**Index.** `idx_case_versions_created_by` ((created_by))

### `clinical.case_steps`

**Description et justification.** Ordered reusable stages of a case, such as alert, safety, ABCDE, decisions, transport and debrief.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `case_version_id` | `uuid` | non | — | — | — | `clinical.case_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `phase` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `prompt` | `text` | non | — | — | — | — | — |
| `state_patch` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `time_cost_seconds` | `integer` | non | `0` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `case_version_id -> clinical.case_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (case_version_id, stable_key)`; `UNIQUE (case_version_id, position)`

**Checks.** `CONSTRAINT case_steps_position_ck CHECK (position > 0)`; `CONSTRAINT case_steps_time_ck CHECK (time_cost_seconds >= 0)`; `CONSTRAINT case_steps_state_ck CHECK (jsonb_typeof(state_patch) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `clinical.case_step_questions`

**Description et justification.** Links case steps to ordinary versioned questions, avoiding a second question engine.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `case_step_id` | `uuid` | non | — | — | — | `clinical.case_steps.id` (N:1) | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `position` | `integer` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (case_step_id, question_version_id)`

**Relations.** `case_step_id -> clinical.case_steps.id ON DELETE CASCADE`; `question_version_id -> practice.question_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (case_step_id, position)`

**Checks.** `CONSTRAINT case_step_questions_position_ck CHECK (position > 0)`

**Index.** `idx_case_step_questions_question_version_id` ((question_version_id))

### `clinical.case_decisions`

**Description et justification.** Branching, scored decisions with explicit patient-state and timing consequences.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `case_step_id` | `uuid` | non | — | — | — | `clinical.case_steps.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `label` | `text` | non | — | — | — | — | — |
| `next_step_id` | `uuid` | oui | — | — | — | `clinical.case_steps.id` (N:1) | — |
| `score_delta` | `numeric` | non | `0` | — | — | — | — |
| `xp_delta` | `integer` | non | `0` | — | — | — | — |
| `time_delta_seconds` | `integer` | non | `0` | — | — | — | — |
| `patient_state_patch` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `feedback` | `text` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `case_step_id -> clinical.case_steps.id ON DELETE CASCADE`; `next_step_id -> clinical.case_steps.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (case_step_id, stable_key)`

**Checks.** `CONSTRAINT case_decisions_patient_state_ck CHECK (jsonb_typeof(patient_state_patch) = 'object')`

**Index.** `case_decisions_next_step_idx` ((next_step_id) WHERE next_step_id IS NOT NULL)

### `clinical.case_sources`

**Description et justification.** Precise evidence sources for the clinical scenario and its decision logic.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `case_version_id` | `uuid` | non | — | — | — | `clinical.case_versions.id` (N:1) | — |
| `source_section_id` | `uuid` | non | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `evidence_note` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (case_version_id, source_section_id)`

**Relations.** `case_version_id -> clinical.case_versions.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_case_sources_source_section_id` ((source_section_id))

### `clinical.case_attempts`

**Description et justification.** Server-authoritative state of a user clinical-case run with idempotent mobile identity.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `client_attempt_id` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `case_version_id` | `uuid` | non | — | — | — | `clinical.case_versions.id` (N:1) | — |
| `status` | `core.attempt_status` | non | `'started'` | — | — | — | — |
| `patient_state` | `jsonb` | non | — | — | — | — | — |
| `score` | `numeric` | non | `0` | — | — | — | — |
| `max_score` | `numeric` | non | — | — | — | — | — |
| `elapsed_seconds` | `integer` | non | `0` | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `case_version_id -> clinical.case_versions.id ON DELETE RESTRICT`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (user_id, client_attempt_id)`

**Checks.** `CONSTRAINT case_attempts_state_ck CHECK (jsonb_typeof(patient_state) = 'object')`; `CONSTRAINT case_attempts_score_ck CHECK (score >= 0 AND max_score > 0 AND score <= max_score)`; `CONSTRAINT case_attempts_time_ck CHECK (elapsed_seconds >= 0)`

**Index.** `case_attempts_user_time_idx` ((user_id, started_at DESC)); `idx_case_attempts_case_version_id` ((case_version_id)); `idx_case_attempts_device_id` ((device_id))

### `clinical.case_step_events`

**Description et justification.** Append-only decision timeline used for scoring, debrief and replay.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `case_attempt_id` | `uuid` | non | — | — | — | `clinical.case_attempts.id` (N:1) | — |
| `case_step_id` | `uuid` | non | — | — | — | `clinical.case_steps.id` (N:1) | — |
| `decision_id` | `uuid` | oui | — | — | — | `clinical.case_decisions.id` (N:1) | — |
| `sequence_number` | `integer` | non | — | — | — | — | — |
| `patient_state_before` | `jsonb` | non | — | — | — | — | — |
| `patient_state_after` | `jsonb` | non | — | — | — | — | — |
| `score_delta` | `numeric` | non | `0` | — | — | — | — |
| `time_delta_seconds` | `integer` | non | `0` | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `case_attempt_id -> clinical.case_attempts.id ON DELETE CASCADE`; `case_step_id -> clinical.case_steps.id ON DELETE RESTRICT`; `decision_id -> clinical.case_decisions.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (case_attempt_id, sequence_number)`

**Checks.** `CONSTRAINT case_step_events_sequence_ck CHECK (sequence_number > 0)`; `CONSTRAINT case_step_events_before_ck CHECK (jsonb_typeof(patient_state_before) = 'object')`; `CONSTRAINT case_step_events_after_ck CHECK (jsonb_typeof(patient_state_after) = 'object')`

**Index.** `idx_case_step_events_case_step_id` ((case_step_id)); `idx_case_step_events_decision_id` ((decision_id))

### `clinical.case_feedback`

**Description et justification.** Structured end-of-case feedback, with optional Pulse-generated explanation kept auditable.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `case_attempt_id` | `uuid` | non | — | oui | — | `clinical.case_attempts.id` (1:0..1) | — |
| `strengths` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `mistakes` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `recommendations` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `pulse_feedback` | `text` | oui | — | — | — | — | — |
| `generated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `model_identifier` | `text` | oui | — | — | — | — | — |
| `reviewed` | `boolean` | non | `false` | — | — | — | — |

**Clé primaire.** `case_attempt_id`

**Relations.** `case_attempt_id -> clinical.case_attempts.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

## Domaine `commerce`

### `commerce.currency_definitions`

**Description et justification.** Normalized currency catalog replacing hard-coded wallet columns for coins, gems, keys, tickets and energy.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `kind` | `core.currency_kind` | non | — | — | — | — | — |
| `display_name` | `text` | non | — | — | — | — | — |
| `icon_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `maximum_balance` | `numeric` | oui | — | — | — | — | — |
| `transferable` | `boolean` | non | `false` | — | — | — | — |
| `purchasable` | `boolean` | non | `false` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `icon_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT currency_maximum_ck CHECK (maximum_balance IS NULL OR maximum_balance >= 0)`

**Index.** `idx_currency_definitions_icon_asset_id` ((icon_asset_id))

### `commerce.wallets`

**Description et justification.** Current server-authoritative balance per user and currency; derived and reconciled with wallet_ledger.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `currency_id` | `uuid` | non | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `balance` | `numeric` | non | `0` | — | — | — | — |
| `lifetime_earned` | `numeric` | non | `0` | — | — | — | — |
| `lifetime_spent` | `numeric` | non | `0` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, currency_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT wallets_balance_ck CHECK (balance >= 0)`; `CONSTRAINT wallets_lifetime_ck CHECK (lifetime_earned >= 0 AND lifetime_spent >= 0)`

**Index.** `wallets_currency_balance_idx` ((currency_id, balance DESC))

### `commerce.wallet_ledger`

**Description et justification.** Append-only financial-grade virtual-currency ledger with idempotency and before/after balances.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `currency_id` | `uuid` | non | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `direction` | `core.ledger_direction` | non | — | — | — | — | — |
| `amount` | `numeric` | non | — | — | — | — | — |
| `balance_before` | `numeric` | non | — | — | — | — | — |
| `balance_after` | `numeric` | non | — | — | — | — | — |
| `reason_code` | `text` | non | — | — | — | — | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `correlation_id` | `uuid` | non | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT wallet_ledger_amount_ck CHECK (amount > 0)`; `CONSTRAINT wallet_ledger_balances_ck CHECK (balance_before >= 0 AND balance_after >= 0)`; `CONSTRAINT wallet_ledger_math_ck CHECK ( (direction = 'credit' AND balance_after = balance_before + amount) OR (direction = 'debit' AND balance_after = balance_before - amount) )`; `CONSTRAINT wallet_ledger_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `wallet_ledger_user_time_idx` ((user_id, created_at DESC)); `wallet_ledger_correlation_idx` ((correlation_id)); `wallet_ledger_source_idx` ((source_type, source_id) WHERE source_id IS NOT NULL); `idx_wallet_ledger_currency_id` ((currency_id))

### `commerce.catalog_items`

**Description et justification.** Unified store and inventory catalog for avatars, themes, frames, cards, boosts, tickets and chests.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `item_type` | `text` | non | — | — | — | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `rarity` | `core.rarity` | non | `'common'` | — | — | — | — |
| `stackable` | `boolean` | non | `false` | — | — | — | — |
| `consumable` | `boolean` | non | `false` | — | — | — | — |
| `premium_only` | `boolean` | non | `false` | — | — | — | — |
| `asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `sort_order` | `integer` | non | `0` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT catalog_items_type_ck CHECK ( item_type IN ( 'avatar', 'theme', 'frame', 'profile_card', 'badge_cosmetic', 'title', 'boost', 'ticket', 'chest', 'consumable', 'bundle' ) )`; `CONSTRAINT catalog_items_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `catalog_items_type_status_idx` ((item_type, status, sort_order)); `catalog_items_metadata_gin` (USING gin (metadata jsonb_path_ops)); `catalog_items_name_trgm_idx` (USING gin (name gin_trgm_ops)); `idx_catalog_items_asset_id` ((asset_id))

### `commerce.catalog_prices`

**Description et justification.** Time-bounded item prices; multiple currencies are separate rows rather than duplicated columns.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `item_id` | `uuid` | non | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `currency_id` | `uuid` | non | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `amount` | `numeric` | non | — | — | — | — | — |
| `valid_from` | `timestamptz` | non | `now()` | — | — | — | — |
| `valid_until` | `timestamptz` | oui | — | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `item_id -> commerce.catalog_items.id ON DELETE CASCADE`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT catalog_prices_amount_ck CHECK (amount >= 0)`; `CONSTRAINT catalog_prices_dates_ck CHECK (valid_until IS NULL OR valid_until > valid_from)`; `CONSTRAINT catalog_prices_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `catalog_prices_active_uidx` (unique, (item_id, currency_id) WHERE active AND valid_until IS NULL); `catalog_prices_lookup_idx` ((item_id, active, valid_from DESC)); `idx_catalog_prices_currency_id` ((currency_id))

### `commerce.inventory`

**Description et justification.** Current item stack per user and catalog item, replacing duplicate legacy inventory tables.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `item_id` | `uuid` | non | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `quantity` | `integer` | non | `1` | — | — | — | — |
| `acquired_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, item_id)`

**Checks.** `CONSTRAINT inventory_quantity_ck CHECK (quantity >= 0)`; `CONSTRAINT inventory_expiry_ck CHECK (expires_at IS NULL OR expires_at > acquired_at)`; `CONSTRAINT inventory_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `inventory_user_updated_idx` ((user_id, updated_at DESC)); `inventory_item_idx` ((item_id, quantity))

### `commerce.inventory_events`

**Description et justification.** Append-only item movement ledger supporting reconciliation and reward audit.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `item_id` | `uuid` | non | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `quantity_delta` | `integer` | non | — | — | — | — | — |
| `quantity_before` | `integer` | non | — | — | — | — | — |
| `quantity_after` | `integer` | non | — | — | — | — | — |
| `reason_code` | `text` | non | — | — | — | — | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `correlation_id` | `uuid` | non | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT inventory_events_delta_ck CHECK (quantity_delta <> 0)`; `CONSTRAINT inventory_events_quantities_ck CHECK ( quantity_before >= 0 AND quantity_after >= 0 AND quantity_after = quantity_before + quantity_delta )`; `CONSTRAINT inventory_events_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `inventory_events_user_time_idx` ((user_id, created_at DESC)); `inventory_events_correlation_idx` ((correlation_id)); `idx_inventory_events_item_id` ((item_id))

### `commerce.user_equipment`

**Description et justification.** One equipped owned item per cosmetic slot, with ownership enforced by server functions.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `slot` | `text` | non | — | — | — | — | — |
| `inventory_id` | `uuid` | non | — | — | — | `commerce.inventory.id` (1:0..1) | — |
| `equipped_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, slot)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `inventory_id -> commerce.inventory.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (inventory_id)`

**Checks.** `CONSTRAINT user_equipment_slot_ck CHECK ( slot IN ('avatar', 'frame', 'profile_card', 'theme', 'title', 'badge_showcase') )`

**Index.** Clé primaire / uniques uniquement.

### `commerce.products`

**Description et justification.** Real-money product catalog prepared for Stripe/App Store/Play Store without storing payment secrets.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `product_type` | `text` | non | — | — | — | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `provider_product_ref` | `text` | oui | — | — | — | — | — |
| `entitlement_code` | `text` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT products_type_ck CHECK ( product_type IN ('consumable', 'non_consumable', 'subscription') )`; `CONSTRAINT products_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `commerce.product_prices`

**Description et justification.** Provider-specific real-money prices in minor units; supports regional stores and recurring billing.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `product_id` | `uuid` | non | — | — | — | `commerce.products.id` (N:1) | — |
| `provider` | `text` | non | — | — | — | — | — |
| `provider_price_ref` | `text` | non | — | — | — | — | — |
| `currency_code` | `text` | non | — | — | — | — | — |
| `amount_minor` | `bigint` | non | — | — | — | — | — |
| `billing_interval` | `text` | oui | — | — | — | — | — |
| `country_code` | `text` | oui | — | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `product_id -> commerce.products.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (provider, provider_price_ref)`

**Checks.** `CONSTRAINT product_prices_amount_ck CHECK (amount_minor >= 0)`; `CONSTRAINT product_prices_interval_ck CHECK ( billing_interval IS NULL OR billing_interval IN ('day', 'week', 'month', 'year') )`

**Index.** `product_prices_product_active_idx` ((product_id, active))

### `commerce.purchase_orders`

**Description et justification.** Purchase aggregate for both virtual and real-money checkout with idempotent fulfillment.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `order_type` | `text` | non | — | — | — | — | — |
| `status` | `text` | non | `'pending'` | — | — | — | — |
| `provider` | `text` | oui | — | — | — | — | — |
| `provider_order_ref` | `text` | oui | — | — | — | — | — |
| `currency_code` | `text` | oui | — | — | — | — | — |
| `total_amount_minor` | `bigint` | oui | — | — | — | — | — |
| `correlation_id` | `uuid` | non | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT purchase_orders_type_ck CHECK (order_type IN ('virtual_currency', 'real_money'))`; `CONSTRAINT purchase_orders_status_ck CHECK ( status IN ('pending', 'authorized', 'paid', 'fulfilled', 'failed', 'cancelled', 'refunded') )`; `CONSTRAINT purchase_orders_amount_ck CHECK ( total_amount_minor IS NULL OR total_amount_minor >= 0 )`; `CONSTRAINT purchase_orders_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `purchase_orders_provider_uidx` (unique, (provider, provider_order_ref) WHERE provider_order_ref IS NOT NULL); `purchase_orders_user_time_idx` ((user_id, created_at DESC))

### `commerce.purchase_order_lines`

**Description et justification.** Immutable priced lines belonging to a checkout order.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `order_id` | `uuid` | non | — | — | — | `commerce.purchase_orders.id` (N:1) | — |
| `item_id` | `uuid` | oui | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `product_id` | `uuid` | oui | — | — | — | `commerce.products.id` (N:1) | — |
| `quantity` | `integer` | non | `1` | — | — | — | — |
| `unit_amount` | `numeric` | non | — | — | — | — | — |
| `currency_id` | `uuid` | oui | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `order_id -> commerce.purchase_orders.id ON DELETE CASCADE`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`; `product_id -> commerce.products.id ON DELETE RESTRICT`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT purchase_order_lines_target_ck CHECK (num_nonnulls(item_id, product_id) = 1)`; `CONSTRAINT purchase_order_lines_quantity_ck CHECK (quantity > 0)`; `CONSTRAINT purchase_order_lines_amount_ck CHECK (unit_amount >= 0)`; `CONSTRAINT purchase_order_lines_currency_ck CHECK ( (item_id IS NOT NULL AND currency_id IS NOT NULL) OR (product_id IS NOT NULL AND currency_id IS NULL) )`; `CONSTRAINT purchase_order_lines_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `purchase_order_lines_order_idx` ((order_id)); `idx_purchase_order_lines_item_id` ((item_id)); `idx_purchase_order_lines_product_id` ((product_id)); `idx_purchase_order_lines_currency_id` ((currency_id))

### `commerce.payment_events`

**Description et justification.** Idempotent webhook audit without raw card or payment credentials.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `order_id` | `uuid` | oui | — | — | — | `commerce.purchase_orders.id` (N:1) | — |
| `provider` | `text` | non | — | — | — | — | — |
| `provider_event_ref` | `text` | non | — | — | — | — | — |
| `event_type` | `text` | non | — | — | — | — | — |
| `payload_hash` | `text` | non | — | — | — | — | — |
| `verified` | `boolean` | non | `false` | — | — | — | — |
| `processed_at` | `timestamptz` | oui | — | — | — | — | — |
| `processing_error` | `text` | oui | — | — | — | — | — |
| `received_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `order_id -> commerce.purchase_orders.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (provider, provider_event_ref)`

**Checks.** Aucun check de table supplémentaire.

**Index.** `payment_events_unprocessed_idx` ((received_at) WHERE processed_at IS NULL); `idx_payment_events_order_id` ((order_id))

### `commerce.subscription_plans`

**Description et justification.** Premium plan features and grace policy independent from provider billing identifiers.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `product_id` | `uuid` | non | — | — | oui | `commerce.products.id` (1:0..1) | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `features` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `grace_period_days` | `integer` | non | `3` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `product_id -> commerce.products.id ON DELETE CASCADE`

**Contraintes uniques.** `product_id`; `code`

**Checks.** `CONSTRAINT subscription_plans_features_ck CHECK (jsonb_typeof(features) = 'object')`; `CONSTRAINT subscription_plans_grace_ck CHECK (grace_period_days >= 0)`

**Index.** Clé primaire / uniques uniquement.

### `commerce.user_subscriptions`

**Description et justification.** Provider-backed subscription state synchronized only through verified server events.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `plan_id` | `uuid` | non | — | — | — | `commerce.subscription_plans.id` (N:1) | — |
| `provider` | `text` | non | — | — | — | — | — |
| `provider_subscription_ref` | `text` | non | — | — | — | — | — |
| `status` | `core.subscription_status` | non | — | — | — | — | — |
| `started_at` | `timestamptz` | non | — | — | — | — | — |
| `current_period_start` | `timestamptz` | non | — | — | — | — | — |
| `current_period_end` | `timestamptz` | non | — | — | — | — | — |
| `cancel_at_period_end` | `boolean` | non | `false` | — | — | — | — |
| `ended_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `plan_id -> commerce.subscription_plans.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (provider, provider_subscription_ref)`

**Checks.** `CONSTRAINT user_subscriptions_period_ck CHECK (current_period_end > current_period_start)`; `CONSTRAINT user_subscriptions_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `user_subscriptions_user_status_idx` ((user_id, status, current_period_end DESC)); `idx_user_subscriptions_plan_id` ((plan_id))

### `commerce.entitlement_definitions`

**Description et justification.** Provider-neutral premium capabilities granted by subscriptions, purchases or administration.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `feature_flags` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `commerce.user_entitlements`

**Description et justification.** Effective premium/admin grants with provenance and expiry, independent from subscription provider.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `entitlement_id` | `uuid` | non | — | — | — | `commerce.entitlement_definitions.id` (N:1) | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `starts_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `revoked_at` | `timestamptz` | oui | — | — | — | — | — |
| `granted_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `entitlement_id -> commerce.entitlement_definitions.id ON DELETE RESTRICT`; `granted_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_entitlements_expiry_ck CHECK (expires_at IS NULL OR expires_at > starts_at)`; `CONSTRAINT user_entitlements_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `user_entitlements_active_idx` ((user_id, entitlement_id, expires_at) WHERE revoked_at IS NULL); `idx_user_entitlements_entitlement_id` ((entitlement_id)); `idx_user_entitlements_granted_by` ((granted_by))

### `commerce.chest_types`

**Description et justification.** Five-or-more extensible chest definitions, separate from owned chest instances and loot probabilities.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `rarity` | `core.rarity` | non | — | — | — | — | — |
| `inventory_item_id` | `uuid` | non | — | — | oui | `commerce.catalog_items.id` (1:0..1) | — |
| `animation_key` | `text` | non | — | — | — | — | — |
| `guaranteed_reward_count` | `integer` | non | `1` | — | — | — | — |
| `min_reward_count` | `integer` | non | `1` | — | — | — | — |
| `max_reward_count` | `integer` | non | `1` | — | — | — | — |
| `cooldown_seconds` | `integer` | non | `0` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `inventory_item_id -> commerce.catalog_items.id ON DELETE RESTRICT`

**Contraintes uniques.** `code`; `inventory_item_id`

**Checks.** `CONSTRAINT chest_types_reward_count_ck CHECK ( guaranteed_reward_count >= 0 AND min_reward_count > 0 AND max_reward_count >= min_reward_count AND guaranteed_reward_count <= max_reward_count )`; `CONSTRAINT chest_types_cooldown_ck CHECK (cooldown_seconds >= 0)`; `CONSTRAINT chest_types_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `commerce.loot_tables`

**Description et justification.** Immutable, time-bounded loot table versions for reproducible chest openings.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `chest_type_id` | `uuid` | non | — | — | — | `commerce.chest_types.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `valid_from` | `timestamptz` | non | `now()` | — | — | — | — |
| `valid_until` | `timestamptz` | oui | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `checksum` | `text` | oui | — | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `chest_type_id -> commerce.chest_types.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (chest_type_id, version_number)`; `UNIQUE (stable_key, version_number)`

**Checks.** `CONSTRAINT loot_tables_version_ck CHECK (version_number > 0)`; `CONSTRAINT loot_tables_dates_ck CHECK (valid_until IS NULL OR valid_until > valid_from)`

**Index.** `loot_tables_active_idx` ((chest_type_id, status, valid_from DESC)); `idx_loot_tables_created_by` ((created_by))

### `commerce.loot_table_entries`

**Description et justification.** Normalized weighted reward candidates with quantity range, rarity and eligibility conditions.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `loot_table_id` | `uuid` | non | — | — | — | `commerce.loot_tables.id` (N:1) | — |
| `reward_kind` | `core.reward_kind` | non | — | — | — | — | — |
| `currency_id` | `uuid` | oui | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `item_id` | `uuid` | oui | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `badge_id` | `uuid` | oui | — | — | — | `gamification.badges.id` (N:1) | — |
| `title_id` | `uuid` | oui | — | — | — | `gamification.titles.id` (N:1) | — |
| `chest_type_id` | `uuid` | oui | — | — | — | `commerce.chest_types.id` (N:1) | — |
| `entitlement_id` | `uuid` | oui | — | — | — | `commerce.entitlement_definitions.id` (N:1) | — |
| `weight` | `numeric` | non | — | — | — | — | — |
| `min_quantity` | `numeric` | non | `1` | — | — | — | — |
| `max_quantity` | `numeric` | non | `1` | — | — | — | — |
| `guaranteed` | `boolean` | non | `false` | — | — | — | — |
| `rarity` | `core.rarity` | non | `'common'` | — | — | — | — |
| `conditions` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `loot_table_id -> commerce.loot_tables.id ON DELETE CASCADE`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`; `badge_id -> gamification.badges.id ON DELETE RESTRICT`; `title_id -> gamification.titles.id ON DELETE RESTRICT`; `chest_type_id -> commerce.chest_types.id ON DELETE RESTRICT`; `entitlement_id -> commerce.entitlement_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT loot_entries_target_ck CHECK ( CASE reward_kind WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0 WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0 WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0 WHEN 'xp' THEN num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 ELSE true END )`; `CONSTRAINT loot_entries_weight_ck CHECK (weight > 0)`; `CONSTRAINT loot_entries_quantity_ck CHECK ( min_quantity > 0 AND max_quantity >= min_quantity )`; `CONSTRAINT loot_entries_conditions_ck CHECK (jsonb_typeof(conditions) = 'object')`

**Index.** `loot_table_entries_draw_idx` ((loot_table_id, guaranteed, rarity)); `idx_loot_table_entries_currency_id` ((currency_id)); `idx_loot_table_entries_item_id` ((item_id)); `idx_loot_table_entries_badge_id` ((badge_id)); `idx_loot_table_entries_title_id` ((title_id)); `idx_loot_table_entries_chest_type_id` ((chest_type_id)); `idx_loot_table_entries_entitlement_id` ((entitlement_id))

### `commerce.chest_instances`

**Description et justification.** Individually auditable user-owned chest; supports delayed, expiring and event chests.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `chest_type_id` | `uuid` | non | — | — | — | `commerce.chest_types.id` (N:1) | — |
| `inventory_id` | `uuid` | oui | — | — | — | `commerce.inventory.id` (N:1) | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `acquired_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `available_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `opened_at` | `timestamptz` | oui | — | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `chest_type_id -> commerce.chest_types.id ON DELETE RESTRICT`; `inventory_id -> commerce.inventory.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT chest_instances_dates_ck CHECK ( available_at >= acquired_at AND (opened_at IS NULL OR opened_at >= acquired_at) AND (expires_at IS NULL OR expires_at > acquired_at) )`; `CONSTRAINT chest_instances_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `chest_instances_available_idx` ((user_id, available_at) WHERE opened_at IS NULL); `idx_chest_instances_chest_type_id` ((chest_type_id)); `idx_chest_instances_inventory_id` ((inventory_id))

### `commerce.chest_openings`

**Description et justification.** Exactly-once server result of a chest opening, pinned to a loot-table version.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `chest_instance_id` | `uuid` | non | — | — | oui | `commerce.chest_instances.id` (1:0..1) | — |
| `loot_table_id` | `uuid` | non | — | — | — | `commerce.loot_tables.id` (N:1) | — |
| `random_seed_hash` | `text` | non | — | — | — | — | — |
| `server_nonce` | `text` | non | — | — | — | — | — |
| `reward_grant_id` | `uuid` | oui | — | — | — | `gamification.reward_grants.id` (N:1) | — |
| `client_opened_at` | `timestamptz` | oui | — | — | — | — | — |
| `opened_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `animation_completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `chest_instance_id -> commerce.chest_instances.id ON DELETE RESTRICT`; `loot_table_id -> commerce.loot_tables.id ON DELETE RESTRICT`; `reward_grant_id -> gamification.reward_grants.id ON DELETE SET NULL`

**Contraintes uniques.** `chest_instance_id`; `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT chest_openings_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `chest_openings_user_time_idx` ((user_id, opened_at DESC)); `idx_chest_openings_loot_table_id` ((loot_table_id)); `idx_chest_openings_reward_grant_id` ((reward_grant_id))

### `commerce.chest_rewards`

**Description et justification.** Immutable ordered rewards revealed by a chest opening, retained independently of later catalog edits.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `chest_opening_id` | `uuid` | non | — | — | — | `commerce.chest_openings.id` (N:1) | — |
| `loot_entry_id` | `uuid` | oui | — | — | — | `commerce.loot_table_entries.id` (N:1) | — |
| `reward_kind` | `core.reward_kind` | non | — | — | — | — | — |
| `quantity` | `numeric` | non | — | — | — | — | — |
| `currency_id` | `uuid` | oui | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `item_id` | `uuid` | oui | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `badge_id` | `uuid` | oui | — | — | — | `gamification.badges.id` (N:1) | — |
| `title_id` | `uuid` | oui | — | — | — | `gamification.titles.id` (N:1) | — |
| `chest_type_id` | `uuid` | oui | — | — | — | `commerce.chest_types.id` (N:1) | — |
| `entitlement_id` | `uuid` | oui | — | — | — | `commerce.entitlement_definitions.id` (N:1) | — |
| `rarity` | `core.rarity` | non | — | — | — | — | — |
| `reward_snapshot` | `jsonb` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `chest_opening_id -> commerce.chest_openings.id ON DELETE CASCADE`; `loot_entry_id -> commerce.loot_table_entries.id ON DELETE SET NULL`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`; `badge_id -> gamification.badges.id ON DELETE RESTRICT`; `title_id -> gamification.titles.id ON DELETE RESTRICT`; `chest_type_id -> commerce.chest_types.id ON DELETE RESTRICT`; `entitlement_id -> commerce.entitlement_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (chest_opening_id, position)`

**Checks.** `CONSTRAINT chest_rewards_quantity_ck CHECK (quantity > 0)`; `CONSTRAINT chest_rewards_position_ck CHECK (position > 0)`; `CONSTRAINT chest_rewards_target_ck CHECK ( CASE reward_kind WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0 WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0 WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0 WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 ELSE num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 END )`; `CONSTRAINT chest_rewards_snapshot_ck CHECK (jsonb_typeof(reward_snapshot) = 'object')`

**Index.** `idx_chest_rewards_loot_entry_id` ((loot_entry_id)); `idx_chest_rewards_currency_id` ((currency_id)); `idx_chest_rewards_item_id` ((item_id)); `idx_chest_rewards_badge_id` ((badge_id)); `idx_chest_rewards_title_id` ((title_id)); `idx_chest_rewards_chest_type_id` ((chest_type_id)); `idx_chest_rewards_entitlement_id` ((entitlement_id))

## Domaine `engagement`

### `engagement.notification_templates`

**Description et justification.** Stable notification identity for reminders, rewards, security and product messages.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `purpose` | `text` | non | — | — | — | — | — |
| `default_channel` | `core.notification_channel` | non | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `engagement.notification_template_versions`

**Description et justification.** Localized immutable notification copy and validated variable contract.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `template_id` | `uuid` | non | — | — | — | `engagement.notification_templates.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `locale` | `text` | non | — | — | — | — | — |
| `subject_template` | `text` | oui | — | — | — | — | — |
| `body_template` | `text` | non | — | — | — | — | — |
| `variables_schema` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `template_id -> engagement.notification_templates.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (template_id, version_number, locale)`

**Checks.** `CONSTRAINT notification_template_versions_number_ck CHECK (version_number > 0)`; `CONSTRAINT notification_template_versions_schema_ck CHECK (jsonb_typeof(variables_schema) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `engagement.notification_preferences`

**Description et justification.** Per-purpose and per-channel communication preferences, separate from legal consent history.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `purpose` | `text` | non | — | — | — | — | — |
| `channel` | `core.notification_channel` | non | — | — | — | — | — |
| `enabled` | `boolean` | non | `true` | — | — | — | — |
| `quiet_hours_start` | `time` | oui | — | — | — | — | — |
| `quiet_hours_end` | `time` | oui | — | — | — | — | — |
| `timezone` | `text` | non | `'Europe/Paris'` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, purpose, channel)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `engagement.push_subscriptions`

**Description et justification.** Encrypted push destination per device; raw tokens never appear in logs or analytics.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `device_id` | `uuid` | non | — | — | — | `iam.user_devices.id` (N:1) | — |
| `provider` | `text` | non | — | — | — | — | — |
| `endpoint_hash` | `text` | non | — | — | — | — | — |
| `token_ciphertext` | `text` | non | — | — | — | — | — |
| `key_version` | `text` | non | — | — | — | — | — |
| `enabled` | `boolean` | non | `true` | — | — | — | — |
| `last_success_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_failure_at` | `timestamptz` | oui | — | — | — | — | — |
| `invalidated_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `device_id -> iam.user_devices.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (provider, endpoint_hash)`

**Checks.** Aucun check de table supplémentaire.

**Index.** `push_subscriptions_user_active_idx` ((user_id, enabled) WHERE invalidated_at IS NULL); `idx_push_subscriptions_device_id` ((device_id))

### `engagement.notification_schedules`

**Description et justification.** User-specific revision and study reminder schedules evaluated by trusted workers.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `template_id` | `uuid` | non | — | — | — | `engagement.notification_templates.id` (N:1) | — |
| `schedule_type` | `text` | non | — | — | — | — | — |
| `cron_expression` | `text` | oui | — | — | — | — | — |
| `next_run_at` | `timestamptz` | oui | — | — | — | — | — |
| `context` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `enabled` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `template_id -> engagement.notification_templates.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT notification_schedules_type_ck CHECK ( schedule_type IN ('revision_due', 'daily_study', 'streak_risk', 'weekly_summary', 'custom') )`; `CONSTRAINT notification_schedules_cron_ck CHECK ( (schedule_type = 'custom' AND cron_expression IS NOT NULL) OR schedule_type <> 'custom' )`; `CONSTRAINT notification_schedules_context_ck CHECK (jsonb_typeof(context) = 'object')`

**Index.** `notification_schedules_due_idx` ((next_run_at) WHERE enabled AND next_run_at IS NOT NULL); `idx_notification_schedules_user_id` ((user_id)); `idx_notification_schedules_template_id` ((template_id))

### `engagement.notification_queue`

**Description et justification.** Transactional, retryable queue for in-app, push and email delivery workers.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `template_version_id` | `uuid` | non | — | — | — | `engagement.notification_template_versions.id` (N:1) | — |
| `channel` | `core.notification_channel` | non | — | — | — | — | — |
| `variables` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `priority` | `smallint` | non | `5` | — | — | — | — |
| `scheduled_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `status` | `core.delivery_status` | non | `'queued'` | — | — | — | — |
| `attempt_count` | `integer` | non | `0` | — | — | — | — |
| `next_attempt_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `locked_at` | `timestamptz` | oui | — | — | — | — | — |
| `locked_by` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `template_version_id -> engagement.notification_template_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT notification_queue_priority_ck CHECK (priority BETWEEN 1 AND 10)`; `CONSTRAINT notification_queue_attempts_ck CHECK (attempt_count >= 0)`; `CONSTRAINT notification_queue_dates_ck CHECK (expires_at IS NULL OR expires_at > scheduled_at)`; `CONSTRAINT notification_queue_variables_ck CHECK (jsonb_typeof(variables) = 'object')`

**Index.** `notification_queue_worker_idx` ((priority DESC, next_attempt_at) WHERE status IN ('queued', 'failed')); `idx_notification_queue_template_version_id` ((template_version_id))

### `engagement.notification_deliveries`

**Description et justification.** Per-attempt delivery history with provider response and privacy-safe rendered-content hash.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `queue_id` | `uuid` | non | — | — | — | `engagement.notification_queue.id` (N:1) | — |
| `provider` | `text` | oui | — | — | — | — | — |
| `provider_message_ref` | `text` | oui | — | — | — | — | — |
| `status` | `core.delivery_status` | non | — | — | — | — | — |
| `rendered_subject` | `text` | oui | — | — | — | — | — |
| `rendered_body_hash` | `text` | non | — | — | — | — | — |
| `sent_at` | `timestamptz` | oui | — | — | — | — | — |
| `delivered_at` | `timestamptz` | oui | — | — | — | — | — |
| `opened_at` | `timestamptz` | oui | — | — | — | — | — |
| `failed_at` | `timestamptz` | oui | — | — | — | — | — |
| `failure_code` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `queue_id -> engagement.notification_queue.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `notification_deliveries_queue_idx` ((queue_id, created_at DESC)); `notification_deliveries_provider_idx` ((provider, provider_message_ref) WHERE provider_message_ref IS NOT NULL)

### `engagement.in_app_notifications`

**Description et justification.** Realtime user inbox with read, dismiss and expiry state.

**Définition SQL.** [60_ai_engagement_analytics.sql](../../supabase/architecture/v1/60_ai_engagement_analytics.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `queue_id` | `uuid` | oui | — | — | — | `engagement.notification_queue.id` (N:1) | — |
| `title` | `text` | non | — | — | — | — | — |
| `body` | `text` | non | — | — | — | — | — |
| `action_url` | `text` | oui | — | — | — | — | — |
| `payload` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `read_at` | `timestamptz` | oui | — | — | — | — | — |
| `dismissed_at` | `timestamptz` | oui | — | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `queue_id -> engagement.notification_queue.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT in_app_notifications_payload_ck CHECK (jsonb_typeof(payload) = 'object')`

**Index.** `in_app_notifications_unread_idx` ((user_id, created_at DESC) WHERE read_at IS NULL AND dismissed_at IS NULL); `idx_in_app_notifications_queue_id` ((queue_id))

## Domaine `gamification`

### `gamification.levels`

**Description et justification.** Global deterministic XP-to-level thresholds; never duplicated on user history rows.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `level` | `integer` | non | — | oui | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `minimum_total_xp` | `bigint` | non | — | — | oui | — | — |
| `maximum_total_xp` | `bigint` | oui | — | — | — | — | — |
| `benefits` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `level`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `minimum_total_xp`

**Checks.** `CONSTRAINT levels_level_ck CHECK (level > 0)`; `CONSTRAINT levels_xp_ck CHECK ( minimum_total_xp >= 0 AND (maximum_total_xp IS NULL OR maximum_total_xp > minimum_total_xp) )`; `CONSTRAINT levels_benefits_ck CHECK (jsonb_typeof(benefits) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `gamification.ranks`

**Description et justification.** Competitive rank catalog independent from temporary leagues and seasons.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `tier` | `integer` | non | — | — | — | — | — |
| `minimum_rating` | `numeric` | non | — | — | — | — | — |
| `maximum_rating` | `numeric` | oui | — | — | — | — | — |
| `icon_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `icon_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT ranks_tier_ck CHECK (tier > 0)`; `CONSTRAINT ranks_rating_ck CHECK ( maximum_rating IS NULL OR maximum_rating > minimum_rating )`; `CONSTRAINT ranks_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `idx_ranks_icon_asset_id` ((icon_asset_id))

### `gamification.badges`

**Description et justification.** Collectible badge catalog; earning rules belong to achievement definitions.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `rarity` | `core.rarity` | non | `'common'` | — | — | — | — |
| `icon_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `hidden_until_earned` | `boolean` | non | `false` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `icon_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_badges_icon_asset_id` ((icon_asset_id))

### `gamification.titles`

**Description et justification.** Equippable profile titles unlocked by rewards, achievements or premium access.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `rarity` | `core.rarity` | non | `'common'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `gamification.reward_bundles`

**Description et justification.** Reusable reward package referenced by missions, achievements, Bosses and daily rewards.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `gamification.reward_components`

**Description et justification.** Normalized components of a reusable reward bundle with one enforced target per component.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `reward_bundle_id` | `uuid` | non | — | — | — | `gamification.reward_bundles.id` (N:1) | — |
| `reward_kind` | `core.reward_kind` | non | — | — | — | — | — |
| `quantity` | `numeric` | non | `1` | — | — | — | — |
| `currency_id` | `uuid` | oui | — | — | — | `commerce.currency_definitions.id` (N:1) | — |
| `item_id` | `uuid` | oui | — | — | — | `commerce.catalog_items.id` (N:1) | — |
| `badge_id` | `uuid` | oui | — | — | — | `gamification.badges.id` (N:1) | — |
| `title_id` | `uuid` | oui | — | — | — | `gamification.titles.id` (N:1) | — |
| `chest_type_id` | `uuid` | oui | — | — | — | `commerce.chest_types.id` (N:1) | — |
| `entitlement_id` | `uuid` | oui | — | — | — | `commerce.entitlement_definitions.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `reward_bundle_id -> gamification.reward_bundles.id ON DELETE CASCADE`; `currency_id -> commerce.currency_definitions.id ON DELETE RESTRICT`; `item_id -> commerce.catalog_items.id ON DELETE RESTRICT`; `badge_id -> gamification.badges.id ON DELETE RESTRICT`; `title_id -> gamification.titles.id ON DELETE RESTRICT`; `chest_type_id -> commerce.chest_types.id ON DELETE RESTRICT`; `entitlement_id -> commerce.entitlement_definitions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT reward_components_quantity_ck CHECK (quantity > 0)`; `CONSTRAINT reward_components_target_ck CHECK ( CASE reward_kind WHEN 'currency' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'item' THEN item_id IS NOT NULL AND num_nonnulls(currency_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'badge' THEN badge_id IS NOT NULL AND num_nonnulls(currency_id, item_id, title_id, chest_type_id, entitlement_id) = 0 WHEN 'title' THEN title_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, chest_type_id, entitlement_id) = 0 WHEN 'chest' THEN chest_type_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, entitlement_id) = 0 WHEN 'premium_entitlement' THEN entitlement_id IS NOT NULL AND num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id) = 0 WHEN 'energy' THEN currency_id IS NOT NULL AND num_nonnulls(item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 ELSE num_nonnulls(currency_id, item_id, badge_id, title_id, chest_type_id, entitlement_id) = 0 END )`; `CONSTRAINT reward_components_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `reward_components_bundle_idx` ((reward_bundle_id)); `idx_reward_components_currency_id` ((currency_id)); `idx_reward_components_item_id` ((item_id)); `idx_reward_components_badge_id` ((badge_id)); `idx_reward_components_title_id` ((title_id)); `idx_reward_components_chest_type_id` ((chest_type_id)); `idx_reward_components_entitlement_id` ((entitlement_id))

### `gamification.reward_grants`

**Description et justification.** Idempotent reward transaction coordinating XP, wallet, inventory, badge, title and chest changes.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `reward_bundle_id` | `uuid` | oui | — | — | — | `gamification.reward_bundles.id` (N:1) | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `correlation_id` | `uuid` | non | — | — | — | — | — |
| `status` | `text` | non | `'pending'` | — | — | — | — |
| `granted_at` | `timestamptz` | oui | — | — | — | — | — |
| `payload_snapshot` | `jsonb` | non | — | — | — | — | — |
| `failure_reason` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `reward_bundle_id -> gamification.reward_bundles.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT reward_grants_status_ck CHECK (status IN ('pending', 'granted', 'failed', 'reversed'))`; `CONSTRAINT reward_grants_payload_ck CHECK (jsonb_typeof(payload_snapshot) = 'object')`; `CONSTRAINT reward_grants_granted_ck CHECK ( status <> 'granted' OR granted_at IS NOT NULL )`

**Index.** `reward_grants_user_time_idx` ((user_id, created_at DESC)); `reward_grants_correlation_idx` ((correlation_id)); `idx_reward_grants_reward_bundle_id` ((reward_bundle_id))

### `gamification.xp_ledger`

**Description et justification.** Append-only XP accounting; user total_xp is a transactionally maintained projection.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `amount` | `integer` | non | — | — | — | — | — |
| `total_before` | `bigint` | non | — | — | — | — | — |
| `total_after` | `bigint` | non | — | — | — | — | — |
| `reason_code` | `text` | non | — | — | — | — | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `reward_grant_id` | `uuid` | oui | — | — | — | `gamification.reward_grants.id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `reward_grant_id -> gamification.reward_grants.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (user_id, idempotency_key)`

**Checks.** `CONSTRAINT xp_ledger_amount_ck CHECK (amount <> 0)`; `CONSTRAINT xp_ledger_total_ck CHECK ( total_before >= 0 AND total_after >= 0 AND total_after = total_before + amount )`

**Index.** `xp_ledger_user_time_idx` ((user_id, created_at DESC)); `idx_xp_ledger_reward_grant_id` ((reward_grant_id))

### `gamification.achievement_definitions`

**Description et justification.** Versionable achievement rules separated from collectible badge presentation.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `metric_code` | `text` | non | — | — | — | — | — |
| `rule` | `jsonb` | non | — | — | — | — | — |
| `badge_id` | `uuid` | oui | — | — | — | `gamification.badges.id` (N:1) | — |
| `reward_bundle_id` | `uuid` | oui | — | — | — | `gamification.reward_bundles.id` (N:1) | — |
| `hidden` | `boolean` | non | `false` | — | — | — | — |
| `repeatable` | `boolean` | non | `false` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `badge_id -> gamification.badges.id ON DELETE SET NULL`; `reward_bundle_id -> gamification.reward_bundles.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT achievement_rule_ck CHECK (jsonb_typeof(rule) = 'object')`

**Index.** `idx_achievement_definitions_badge_id` ((badge_id)); `idx_achievement_definitions_reward_bundle_id` ((reward_bundle_id))

### `gamification.user_achievements`

**Description et justification.** Current achievement progress projection derived from trusted domain events.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `achievement_id` | `uuid` | non | — | — | — | `gamification.achievement_definitions.id` (N:1) | — |
| `progress` | `numeric` | non | `0` | — | — | — | — |
| `target` | `numeric` | non | — | — | — | — | — |
| `earned_count` | `integer` | non | `0` | — | — | — | — |
| `first_earned_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_earned_at` | `timestamptz` | oui | — | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, achievement_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `achievement_id -> gamification.achievement_definitions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_achievements_values_ck CHECK ( progress >= 0 AND target > 0 AND earned_count >= 0 )`

**Index.** `idx_user_achievements_achievement_id` ((achievement_id))

### `gamification.user_badges`

**Description et justification.** Owned collectible badges with provenance; clients cannot self-grant.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `badge_id` | `uuid` | non | — | — | — | `gamification.badges.id` (N:1) | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `earned_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `showcased` | `boolean` | non | `false` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, badge_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `badge_id -> gamification.badges.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_user_badges_badge_id` ((badge_id))

### `gamification.user_titles`

**Description et justification.** Owned profile titles separate from the single equipped title projection.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `title_id` | `uuid` | non | — | — | — | `gamification.titles.id` (N:1) | — |
| `source_type` | `text` | non | — | — | — | — | — |
| `source_id` | `uuid` | oui | — | — | — | — | — |
| `earned_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `equipped` | `boolean` | non | `false` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, title_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `title_id -> gamification.titles.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `user_titles_one_equipped_idx` (unique, (user_id) WHERE equipped); `idx_user_titles_title_id` ((title_id))

### `gamification.mission_definitions`

**Description et justification.** Reusable daily, weekly, seasonal and one-time mission templates.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `period` | `text` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `metric_code` | `text` | non | — | — | — | — | — |
| `target` | `numeric` | non | — | — | — | — | — |
| `eligibility_rule` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `reward_bundle_id` | `uuid` | non | — | — | — | `gamification.reward_bundles.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `reward_bundle_id -> gamification.reward_bundles.id ON DELETE RESTRICT`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT mission_definitions_period_ck CHECK (period IN ('daily', 'weekly', 'seasonal', 'one_time'))`; `CONSTRAINT mission_definitions_target_ck CHECK (target > 0)`; `CONSTRAINT mission_definitions_eligibility_ck CHECK (jsonb_typeof(eligibility_rule) = 'object')`

**Index.** `idx_mission_definitions_reward_bundle_id` ((reward_bundle_id))

### `gamification.mission_occurrences`

**Description et justification.** Concrete time window and immutable rule snapshot for a mission instance.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `mission_definition_id` | `uuid` | non | — | — | — | `gamification.mission_definitions.id` (N:1) | — |
| `starts_at` | `timestamptz` | non | — | — | — | — | — |
| `ends_at` | `timestamptz` | non | — | — | — | — | — |
| `cohort_key` | `text` | oui | — | — | — | — | — |
| `configuration_snapshot` | `jsonb` | non | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `mission_definition_id -> gamification.mission_definitions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT mission_occurrences_dates_ck CHECK (ends_at > starts_at)`; `CONSTRAINT mission_occurrences_snapshot_ck CHECK (jsonb_typeof(configuration_snapshot) = 'object')`

**Index.** `mission_occurrences_active_idx` ((starts_at, ends_at)); `idx_mission_occurrences_mission_definition_id` ((mission_definition_id))

### `gamification.user_mission_progress`

**Description et justification.** Per-user mission state maintained from trusted activity events.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `mission_occurrence_id` | `uuid` | non | — | — | — | `gamification.mission_occurrences.id` (N:1) | — |
| `progress` | `numeric` | non | `0` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `claimed_at` | `timestamptz` | oui | — | — | — | — | — |
| `reward_grant_id` | `uuid` | oui | — | — | — | `gamification.reward_grants.id` (N:1) | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, mission_occurrence_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `mission_occurrence_id -> gamification.mission_occurrences.id ON DELETE CASCADE`; `reward_grant_id -> gamification.reward_grants.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_mission_progress_ck CHECK (progress >= 0)`; `CONSTRAINT user_mission_claim_ck CHECK (claimed_at IS NULL OR completed_at IS NOT NULL)`

**Index.** `user_mission_progress_active_idx` ((user_id, completed_at, claimed_at)); `idx_user_mission_progress_mission_occurrence_id` ((mission_occurrence_id)); `idx_user_mission_progress_reward_grant_id` ((reward_grant_id))

### `gamification.seasons`

**Description et justification.** Time-bounded competitive and reward season definition.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `starts_at` | `timestamptz` | non | — | — | — | — | — |
| `ends_at` | `timestamptz` | non | — | — | — | — | — |
| `rules` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT seasons_dates_ck CHECK (ends_at > starts_at)`; `CONSTRAINT seasons_rules_ck CHECK (jsonb_typeof(rules) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `gamification.leagues`

**Description et justification.** Bounded leaderboard cohort for a rank and season, avoiding global hot rows.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `season_id` | `uuid` | non | — | — | — | `gamification.seasons.id` (N:1) | — |
| `rank_id` | `uuid` | non | — | — | — | `gamification.ranks.id` (N:1) | — |
| `cohort_number` | `integer` | non | — | — | — | — | — |
| `capacity` | `integer` | non | `30` | — | — | — | — |
| `starts_at` | `timestamptz` | non | — | — | — | — | — |
| `ends_at` | `timestamptz` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `season_id -> gamification.seasons.id ON DELETE CASCADE`; `rank_id -> gamification.ranks.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (season_id, rank_id, cohort_number)`

**Checks.** `CONSTRAINT leagues_values_ck CHECK (cohort_number > 0 AND capacity > 1)`; `CONSTRAINT leagues_dates_ck CHECK (ends_at > starts_at)`

**Index.** `idx_leagues_rank_id` ((rank_id))

### `gamification.league_memberships`

**Description et justification.** User score projection within one small league cohort.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `league_id` | `uuid` | non | — | — | — | `gamification.leagues.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `score` | `numeric` | non | `0` | — | — | — | — |
| `position` | `integer` | oui | — | — | — | — | — |
| `joined_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `promoted` | `boolean` | oui | — | — | — | — | — |
| `relegated` | `boolean` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (league_id, user_id)`

**Relations.** `league_id -> gamification.leagues.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT league_memberships_score_ck CHECK (score >= 0)`; `CONSTRAINT league_memberships_position_ck CHECK (position IS NULL OR position > 0)`

**Index.** `league_memberships_ranking_idx` ((league_id, score DESC, joined_at)); `league_memberships_user_idx` ((user_id, joined_at DESC))

### `gamification.challenges`

**Description et justification.** Individual or social limited-time challenge definition.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `challenge_type` | `text` | non | — | — | — | — | — |
| `starts_at` | `timestamptz` | non | — | — | — | — | — |
| `ends_at` | `timestamptz` | non | — | — | — | — | — |
| `rule` | `jsonb` | non | — | — | — | — | — |
| `reward_bundle_id` | `uuid` | oui | — | — | — | `gamification.reward_bundles.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `reward_bundle_id -> gamification.reward_bundles.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT challenges_dates_ck CHECK (ends_at > starts_at)`; `CONSTRAINT challenges_rule_ck CHECK (jsonb_typeof(rule) = 'object')`

**Index.** `idx_challenges_reward_bundle_id` ((reward_bundle_id))

### `gamification.challenge_participants`

**Description et justification.** Membership and result projection for one challenge.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `challenge_id` | `uuid` | non | — | — | — | `gamification.challenges.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `progress` | `numeric` | non | `0` | — | — | — | — |
| `score` | `numeric` | non | `0` | — | — | — | — |
| `joined_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `claimed_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (challenge_id, user_id)`

**Relations.** `challenge_id -> gamification.challenges.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT challenge_participants_values_ck CHECK (progress >= 0 AND score >= 0)`

**Index.** `challenge_participants_rank_idx` ((challenge_id, score DESC)); `idx_challenge_participants_user_id` ((user_id))

### `gamification.daily_reward_calendars`

**Description et justification.** Versionable daily-login reward cycle definition.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `cycle_length_days` | `integer` | non | — | — | — | — | — |
| `timezone_policy` | `text` | non | `'user'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT daily_reward_calendars_length_ck CHECK (cycle_length_days > 0)`; `CONSTRAINT daily_reward_calendars_timezone_ck CHECK (timezone_policy IN ('user', 'utc', 'fixed'))`

**Index.** Clé primaire / uniques uniquement.

### `gamification.daily_reward_steps`

**Description et justification.** Reward bundle assigned to each day of a daily calendar.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `calendar_id` | `uuid` | non | — | — | — | `gamification.daily_reward_calendars.id` (N:1) | — |
| `day_number` | `integer` | non | — | — | — | — | — |
| `reward_bundle_id` | `uuid` | non | — | — | — | `gamification.reward_bundles.id` (N:1) | — |

**Clé primaire.** `PRIMARY KEY (calendar_id, day_number)`

**Relations.** `calendar_id -> gamification.daily_reward_calendars.id ON DELETE CASCADE`; `reward_bundle_id -> gamification.reward_bundles.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT daily_reward_steps_day_ck CHECK (day_number > 0)`

**Index.** `idx_daily_reward_steps_reward_bundle_id` ((reward_bundle_id))

### `gamification.daily_reward_claims`

**Description et justification.** Exactly-once daily reward claim with local-day and timezone evidence.

**Définition SQL.** [50_gamification_commerce.sql](../../supabase/architecture/v1/50_gamification_commerce.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `calendar_id` | `uuid` | non | — | — | — | `gamification.daily_reward_calendars.id` (N:1) | — |
| `local_reward_date` | `date` | non | — | — | — | — | — |
| `day_number` | `integer` | non | — | — | — | — | — |
| `reward_grant_id` | `uuid` | non | — | — | oui | `gamification.reward_grants.id` (1:0..1) | — |
| `claimed_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `timezone` | `text` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `calendar_id -> gamification.daily_reward_calendars.id ON DELETE RESTRICT`; `reward_grant_id -> gamification.reward_grants.id ON DELETE RESTRICT`

**Contraintes uniques.** `reward_grant_id`; `UNIQUE (user_id, calendar_id, local_reward_date)`

**Checks.** `CONSTRAINT daily_reward_claims_day_ck CHECK (day_number > 0)`

**Index.** `daily_reward_claims_user_idx` ((user_id, local_reward_date DESC)); `idx_daily_reward_claims_calendar_id` ((calendar_id))

## Domaine `governance`

### `governance.content_review_requests`

**Description et justification.** Workflow envelope for source, trainer, medical and regulatory validation of versioned content.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `entity_type` | `text` | non | — | — | — | — | — |
| `entity_id` | `uuid` | non | — | — | — | — | — |
| `requested_review` | `core.review_status` | non | — | — | — | — | — |
| `requested_by` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `assigned_to` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `status` | `text` | non | `'open'` | — | — | — | — |
| `source_snapshot` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `requested_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `due_at` | `timestamptz` | oui | — | — | — | — | — |
| `closed_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `requested_by -> iam.user_accounts.user_id ON DELETE RESTRICT`; `assigned_to -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT content_review_status_ck CHECK ( status IN ('open', 'in_review', 'approved', 'changes_requested', 'rejected', 'cancelled') )`; `CONSTRAINT content_review_snapshot_ck CHECK (jsonb_typeof(source_snapshot) = 'object')`

**Index.** `content_review_requests_queue_idx` ((status, requested_review, due_at)); `content_review_requests_entity_idx` ((entity_type, entity_id, requested_at DESC)); `idx_content_review_requests_requested_by` ((requested_by)); `idx_content_review_requests_assigned_to` ((assigned_to))

### `governance.content_review_decisions`

**Description et justification.** Immutable reviewer decisions preserving the distinction between source, trainer and medical validation.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `review_request_id` | `uuid` | non | — | — | — | `governance.content_review_requests.id` (N:1) | — |
| `reviewer_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `decision` | `text` | non | — | — | — | — | — |
| `review_status` | `core.review_status` | non | — | — | — | — | — |
| `comment` | `text` | oui | — | — | — | — | — |
| `evidence` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `decided_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `review_request_id -> governance.content_review_requests.id ON DELETE CASCADE`; `reviewer_id -> iam.user_accounts.user_id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT content_review_decision_ck CHECK ( decision IN ('approve', 'request_changes', 'reject', 'abstain') )`; `CONSTRAINT content_review_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')`

**Index.** `content_review_decisions_request_idx` ((review_request_id, decided_at)); `idx_content_review_decisions_reviewer_id` ((reviewer_id))

### `governance.audit_log`

**Description et justification.** Append-only monthly-partitioned administrative and sensitive-data audit trail.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | — | — | — | — |
| `actor_user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `actor_role` | `text` | oui | — | — | — | — | — |
| `action` | `text` | non | — | — | — | — | — |
| `entity_schema` | `text` | non | — | — | — | — | — |
| `entity_table` | `text` | non | — | — | — | — | — |
| `entity_id` | `text` | oui | — | — | — | — | — |
| `request_id` | `uuid` | oui | — | — | — | — | — |
| `ip_hash` | `text` | oui | — | — | — | — | — |
| `user_agent` | `text` | oui | — | — | — | — | — |
| `before_data` | `jsonb` | oui | — | — | — | — | — |
| `after_data` | `jsonb` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (id, occurred_at)`

**Relations.** `actor_user_id -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT audit_log_before_ck CHECK ( before_data IS NULL OR jsonb_typeof(before_data) = 'object' )`; `CONSTRAINT audit_log_after_ck CHECK ( after_data IS NULL OR jsonb_typeof(after_data) = 'object' )`; `CONSTRAINT audit_log_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `audit_log_actor_time_idx` ((actor_user_id, occurred_at DESC)); `audit_log_entity_idx` ((entity_schema, entity_table, entity_id, occurred_at DESC)); `audit_log_request_idx` ((request_id) WHERE request_id IS NOT NULL)

### `governance.data_retention_policies`

**Description et justification.** Explicit lifecycle rules for personal, learning, security, AI and operational data.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `entity_schema` | `text` | non | — | — | — | — | — |
| `entity_table` | `text` | non | — | — | — | — | — |
| `retention_interval` | `interval` | non | — | — | — | — | — |
| `legal_basis` | `text` | non | — | — | — | — | — |
| `archive_before_delete` | `boolean` | non | `false` | — | — | — | — |
| `anonymize_instead_of_delete` | `boolean` | non | `false` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |
| `approved_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `approved_at` | `timestamptz` | oui | — | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `approved_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT retention_interval_ck CHECK (retention_interval > interval '0 seconds')`

**Index.** `idx_data_retention_policies_approved_by` ((approved_by))

### `governance.data_export_requests`

**Description et justification.** GDPR portability workflow with expiring encrypted export assets.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `status` | `text` | non | `'requested'` | — | — | — | — |
| `requested_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `processing_started_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `export_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `failure_reason` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `export_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT data_export_status_ck CHECK ( status IN ('requested', 'processing', 'completed', 'failed', 'expired') )`

**Index.** `data_export_requests_user_idx` ((user_id, requested_at DESC)); `idx_data_export_requests_export_asset_id` ((export_asset_id))

### `governance.data_erasure_requests`

**Description et justification.** Controlled GDPR erasure/anonymization workflow preserving legal and financial obligations.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `status` | `text` | non | `'requested'` | — | — | — | — |
| `requested_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `cooling_off_until` | `timestamptz` | non | — | — | — | — | — |
| `verified_at` | `timestamptz` | oui | — | — | — | — | — |
| `processing_started_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `legal_hold` | `boolean` | non | `false` | — | — | — | — |
| `retained_categories` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `failure_reason` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT data_erasure_status_ck CHECK ( status IN ('requested', 'verified', 'cancelled', 'processing', 'completed', 'blocked', 'failed') )`; `CONSTRAINT data_erasure_cooling_ck CHECK (cooling_off_until > requested_at)`

**Index.** `data_erasure_requests_status_idx` ((status, cooling_off_until)); `idx_data_erasure_requests_user_id` ((user_id))

### `governance.moderation_cases`

**Description et justification.** Moderation workflow for social, profile, AI and user-generated content incidents.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `reporter_user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `subject_user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `entity_type` | `text` | non | — | — | — | — | — |
| `entity_id` | `uuid` | oui | — | — | — | — | — |
| `category` | `text` | non | — | — | — | — | — |
| `severity` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `evidence` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `text` | non | `'open'` | — | — | — | — |
| `assigned_to` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `opened_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `closed_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `reporter_user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `subject_user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `assigned_to -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT moderation_cases_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical'))`; `CONSTRAINT moderation_cases_status_ck CHECK ( status IN ('open', 'triaged', 'investigating', 'resolved', 'dismissed') )`; `CONSTRAINT moderation_cases_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')`

**Index.** `moderation_cases_queue_idx` ((status, severity, opened_at)); `idx_moderation_cases_reporter_user_id` ((reporter_user_id)); `idx_moderation_cases_subject_user_id` ((subject_user_id)); `idx_moderation_cases_assigned_to` ((assigned_to))

### `governance.moderation_actions`

**Description et justification.** Immutable moderation decisions with actor, reason, target and optional expiry.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `moderation_case_id` | `uuid` | non | — | — | — | `governance.moderation_cases.id` (N:1) | — |
| `action_type` | `text` | non | — | — | — | — | — |
| `actor_user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `target_user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `reason` | `text` | non | — | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `moderation_case_id -> governance.moderation_cases.id ON DELETE CASCADE`; `actor_user_id -> iam.user_accounts.user_id ON DELETE RESTRICT`; `target_user_id -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT moderation_actions_type_ck CHECK ( action_type IN ('note', 'warn', 'hide', 'restrict', 'suspend', 'ban', 'restore') )`; `CONSTRAINT moderation_actions_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `idx_moderation_actions_moderation_case_id` ((moderation_case_id)); `idx_moderation_actions_actor_user_id` ((actor_user_id)); `idx_moderation_actions_target_user_id` ((target_user_id))

## Domaine `iam`

### `iam.user_accounts`

**Description et justification.** Application account projection for each auth.users identity; never stores credentials or JWTs.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `auth.users.id` (1:0..1) | — |
| `status` | `core.account_status` | non | `'active'` | — | — | — | — |
| `locale` | `text` | non | `'fr-FR'` | — | — | — | — |
| `timezone` | `text` | non | `'Europe/Paris'` | — | — | — | — |
| `onboarding_completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_seen_at` | `timestamptz` | oui | — | — | — | — | — |
| `deleted_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> auth.users.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_accounts_locale_ck CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')`; `CONSTRAINT user_accounts_deleted_ck CHECK ( (status = 'deleted' AND deleted_at IS NOT NULL) OR status <> 'deleted' )`

**Index.** Clé primaire / uniques uniquement.

### `iam.profiles`

**Description et justification.** Non-sensitive user-facing profile data separated from authentication and preferences.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `iam.user_accounts.user_id` (1:0..1) | — |
| `display_name` | `text` | oui | — | — | — | — | — |
| `given_name` | `text` | oui | — | — | — | — | — |
| `family_name` | `text` | oui | — | — | — | — | — |
| `biography` | `text` | oui | — | — | — | — | — |
| `avatar_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `profile_visibility` | `text` | non | `'private'` | — | — | — | — |
| `organization_name` | `text` | oui | — | — | — | — | — |
| `profession_title` | `text` | oui | — | — | — | — | — |
| `training_program` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `CONSTRAINT profiles_avatar_asset_fk: (avatar_asset_id) -> media.assets (id) ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT profiles_visibility_ck CHECK (profile_visibility IN ('private', 'friends', 'public'))`; `CONSTRAINT profiles_display_name_ck CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80)`

**Index.** `idx_profiles_avatar_asset_id` ((avatar_asset_id))

### `iam.user_preferences`

**Description et justification.** One normalized preference record per user; JSONB is limited to extensible UI and learning options.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `iam.user_accounts.user_id` (1:0..1) | — |
| `theme` | `text` | non | `'system'` | — | — | — | — |
| `reduced_motion` | `boolean` | non | `false` | — | — | — | — |
| `haptics_enabled` | `boolean` | non | `true` | — | — | — | — |
| `sounds_enabled` | `boolean` | non | `true` | — | — | — | — |
| `content_locale` | `text` | non | `'fr-FR'` | — | — | — | — |
| `daily_goal_xp` | `integer` | non | `30` | — | — | — | — |
| `study_reminder_time` | `time` | oui | — | — | — | — | — |
| `accessibility` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `learning_preferences` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_preferences_theme_ck CHECK (theme IN ('system', 'light', 'dark'))`; `CONSTRAINT user_preferences_daily_goal_ck CHECK (daily_goal_xp BETWEEN 0 AND 10000)`; `CONSTRAINT user_preferences_accessibility_object_ck CHECK (jsonb_typeof(accessibility) = 'object')`; `CONSTRAINT user_preferences_learning_object_ck CHECK (jsonb_typeof(learning_preferences) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `iam.user_devices`

**Description et justification.** Registered app installations for trust, push routing, offline synchronization and revocation.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `installation_id` | `uuid` | non | — | — | — | — | — |
| `platform` | `core.platform` | non | — | — | — | — | — |
| `device_model` | `text` | oui | — | — | — | — | — |
| `os_version` | `text` | oui | — | — | — | — | — |
| `app_version` | `text` | oui | — | — | — | — | — |
| `locale` | `text` | oui | — | — | — | — | — |
| `timezone` | `text` | oui | — | — | — | — | — |
| `push_capable` | `boolean` | non | `false` | — | — | — | — |
| `trusted_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_seen_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `revoked_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (user_id, installation_id)`

**Checks.** Aucun check de table supplémentaire.

**Index.** `user_devices_user_seen_idx` ((user_id, last_seen_at DESC)); `user_devices_active_idx` ((user_id, platform) WHERE revoked_at IS NULL)

### `iam.user_sessions`

**Description et justification.** Auditable session metadata mirror; access and refresh tokens remain exclusively in Supabase Auth.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `auth_session_id` | `uuid` | oui | — | — | — | — | — |
| `ip_hash` | `text` | oui | — | — | — | — | — |
| `user_agent` | `text` | oui | — | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `last_activity_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `ended_at` | `timestamptz` | oui | — | — | — | — | — |
| `end_reason` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_sessions_end_ck CHECK ( ended_at IS NULL OR ended_at >= started_at )`

**Index.** `user_sessions_active_idx` ((user_id, last_activity_at DESC) WHERE ended_at IS NULL); `user_sessions_auth_session_uidx` (unique, (auth_session_id) WHERE auth_session_id IS NOT NULL); `idx_user_sessions_device_id` ((device_id))

### `iam.external_identities`

**Description et justification.** Minimal non-secret audit projection of OAuth, passwordless and magic-link identities managed by Supabase Auth.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `auth_identity_id` | `uuid` | non | — | — | — | — | — |
| `provider` | `text` | non | — | — | — | — | — |
| `provider_subject_hash` | `text` | non | — | — | — | — | — |
| `linked_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `last_login_at` | `timestamptz` | oui | — | — | — | — | — |
| `unlinked_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (auth_identity_id)`; `UNIQUE (provider, provider_subject_hash)`

**Checks.** Aucun check de table supplémentaire.

**Index.** `external_identities_user_idx` ((user_id, linked_at DESC))

### `iam.mfa_preferences`

**Description et justification.** Application MFA policy projection; secrets and factor material stay in Supabase Auth.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `iam.user_accounts.user_id` (1:0..1) | — |
| `required` | `boolean` | non | `false` | — | — | — | — |
| `preferred_factor` | `text` | oui | — | — | — | — | — |
| `enrolled_factor_count` | `integer` | non | `0` | — | — | — | — |
| `last_verified_at` | `timestamptz` | oui | — | — | — | — | — |
| `recovery_codes_rotated_at` | `timestamptz` | oui | — | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT mfa_factor_ck CHECK (preferred_factor IS NULL OR preferred_factor IN ('totp', 'phone', 'webauthn'))`; `CONSTRAINT mfa_count_ck CHECK (enrolled_factor_count >= 0)`

**Index.** Clé primaire / uniques uniquement.

### `iam.security_events`

**Description et justification.** Append-only security history for login, logout, MFA, lockout, credential and suspicious-access events.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `event_type` | `text` | non | — | — | — | — | — |
| `severity` | `text` | non | `'info'` | — | — | — | — |
| `ip_hash` | `text` | oui | — | — | — | — | — |
| `user_agent` | `text` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT security_events_severity_ck CHECK (severity IN ('info', 'warning', 'critical'))`; `CONSTRAINT security_events_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `security_events_user_time_idx` ((user_id, occurred_at DESC)); `security_events_type_time_idx` ((event_type, occurred_at DESC)); `security_events_metadata_gin` (USING gin (metadata jsonb_path_ops)); `idx_security_events_device_id` ((device_id))

### `iam.organizations`

**Description et justification.** Training institutes, employers and partner organizations used for scoped access and cohorts.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `organization_type` | `text` | non | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `settings` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT organizations_type_ck CHECK ( organization_type IN ('training_institute', 'employer', 'healthcare_facility', 'partner', 'internal') )`; `CONSTRAINT organizations_settings_ck CHECK (jsonb_typeof(settings) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `iam.organization_memberships`

**Description et justification.** Membership relation between users and institutes/employers without duplicating user profiles.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `organization_id` | `uuid` | non | — | — | — | `iam.organizations.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `membership_status` | `text` | non | `'active'` | — | — | — | — |
| `external_reference` | `text` | oui | — | — | — | — | — |
| `joined_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `left_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (organization_id, user_id)`

**Relations.** `organization_id -> iam.organizations.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT organization_membership_status_ck CHECK ( membership_status IN ('invited', 'active', 'suspended', 'left') )`; `CONSTRAINT organization_memberships_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `organization_memberships_user_idx` ((user_id, membership_status))

### `iam.roles`

**Description et justification.** Named RBAC roles such as learner, trainer, medical_reviewer, content_editor and administrator.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `system_role` | `boolean` | non | `false` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `iam.permissions`

**Description et justification.** Atomic RBAC permissions, kept independent from roles to avoid authorization duplication.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `domain` | `text` | non | — | — | — | — | — |
| `action` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `code`; `UNIQUE (domain, action)`

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `iam.role_permissions`

**Description et justification.** Many-to-many mapping from RBAC roles to atomic permissions.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `role_id` | `uuid` | non | — | — | — | `iam.roles.id` (N:1) | — |
| `permission_id` | `uuid` | non | — | — | — | `iam.permissions.id` (N:1) | — |
| `granted_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (role_id, permission_id)`

**Relations.** `role_id -> iam.roles.id ON DELETE CASCADE`; `permission_id -> iam.permissions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `role_permissions_permission_idx` ((permission_id, role_id))

### `iam.user_roles`

**Description et justification.** Scoped, expirable user-role grants with complete provenance.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `role_id` | `uuid` | non | — | — | — | `iam.roles.id` (N:1) | — |
| `organization_id` | `uuid` | oui | — | — | — | `iam.organizations.id` (N:1) | — |
| `formation_id` | `uuid` | oui | — | — | — | `learning.formations.id` (N:1) | — |
| `granted_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `granted_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `revoked_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `role_id -> iam.roles.id ON DELETE CASCADE`; `organization_id -> iam.organizations.id ON DELETE CASCADE`; `granted_by -> iam.user_accounts.user_id ON DELETE SET NULL`; `CONSTRAINT user_roles_formation_fk: (formation_id) -> learning.formations (id) ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_roles_scope_ck CHECK (num_nonnulls(organization_id, formation_id) <= 1)`; `CONSTRAINT user_roles_expiry_ck CHECK ( expires_at IS NULL OR expires_at > granted_at )`

**Index.** `user_roles_active_uidx` (unique, ( user_id, role_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(formation_id, '00000000-0000-0000-0000-000000000000'::uuid) ) WHERE revoked_at IS NULL); `user_roles_authorization_idx` ((user_id, organization_id, formation_id) WHERE revoked_at IS NULL); `idx_user_roles_role_id` ((role_id)); `idx_user_roles_organization_id` ((organization_id)); `idx_user_roles_formation_id` ((formation_id)); `idx_user_roles_granted_by` ((granted_by))

### `iam.user_consents`

**Description et justification.** Immutable consent history for terms, privacy, analytics, AI memory and communication channels.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `consent_code` | `text` | non | — | — | — | — | — |
| `document_version` | `text` | non | — | — | — | — | — |
| `granted` | `boolean` | non | — | — | — | — | — |
| `locale` | `text` | non | `'fr-FR'` | — | — | — | — |
| `source` | `text` | non | `'app'` | — | — | — | — |
| `evidence` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `recorded_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `withdrawn_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_consents_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')`; `CONSTRAINT user_consents_withdrawn_ck CHECK ( withdrawn_at IS NULL OR withdrawn_at >= recorded_at )`

**Index.** `user_consents_latest_idx` ((user_id, consent_code, recorded_at DESC))

### `iam.account_recovery_events`

**Description et justification.** Audit-only history of account recovery and security-sensitive identity changes.

**Définition SQL.** [10_identity.sql](../../supabase/architecture/v1/10_identity.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `recovery_type` | `text` | non | — | — | — | — | — |
| `status` | `text` | non | — | — | — | — | — |
| `requested_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT recovery_status_ck CHECK (status IN ('requested', 'verified', 'completed', 'expired', 'cancelled'))`; `CONSTRAINT recovery_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `account_recovery_user_idx` ((user_id, requested_at DESC))

## Domaine `knowledge`

### `knowledge.source_documents`

**Description et justification.** Stable identity for DEA, HAS, Code de la santé publique and other auditable medical sources.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `publisher` | `text` | oui | — | — | — | — | — |
| `authority` | `core.source_authority` | non | — | — | — | — | — |
| `document_type` | `text` | non | — | — | — | — | — |
| `canonical_url` | `text` | oui | — | — | — | — | — |
| `jurisdiction` | `text` | non | `'FR'` | — | — | — | — |
| `language` | `text` | non | `'fr'` | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `knowledge.source_versions.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `CONSTRAINT source_documents_current_version_fk: (current_version_id) -> knowledge.source_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT source_documents_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `source_documents_authority_status_idx` ((authority, status)); `source_documents_title_trgm_idx` (USING gin (title gin_trgm_ops)); `idx_source_documents_current_version_id` ((current_version_id))

### `knowledge.source_versions`

**Description et justification.** Immutable editions of a source document so every learning claim remains reproducible.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_document_id` | `uuid` | non | — | — | — | `knowledge.source_documents.id` (N:1) | — |
| `version_label` | `text` | non | — | — | — | — | — |
| `published_on` | `date` | oui | — | — | — | — | — |
| `effective_from` | `date` | oui | — | — | — | — | — |
| `effective_until` | `date` | oui | — | — | — | — | — |
| `checksum_sha256` | `text` | oui | — | — | — | — | — |
| `media_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `page_count` | `integer` | oui | — | — | — | — | — |
| `imported_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `supersedes_version_id` | `uuid` | oui | — | — | — | `knowledge.source_versions.id` (N:1) | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_document_id -> knowledge.source_documents.id ON DELETE CASCADE`; `media_asset_id -> media.assets.id ON DELETE SET NULL`; `supersedes_version_id -> knowledge.source_versions.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (source_document_id, version_label)`

**Checks.** `CONSTRAINT source_versions_dates_ck CHECK ( effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from )`; `CONSTRAINT source_versions_pages_ck CHECK (page_count IS NULL OR page_count > 0)`

**Index.** `source_versions_document_idx` ((source_document_id, effective_from DESC NULLS LAST)); `idx_source_versions_media_asset_id` ((media_asset_id)); `idx_source_versions_supersedes_version_id` ((supersedes_version_id))

### `knowledge.source_sections`

**Description et justification.** Page- or article-level citation units used by questions, concepts and Pulse AI.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_version_id` | `uuid` | non | — | — | — | `knowledge.source_versions.id` (N:1) | — |
| `parent_section_id` | `uuid` | oui | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `heading` | `text` | oui | — | — | — | — | — |
| `page_from` | `integer` | oui | — | — | — | — | — |
| `page_to` | `integer` | oui | — | — | — | — | — |
| `article_reference` | `text` | oui | — | — | — | — | — |
| `extracted_text` | `text` | oui | — | — | — | — | — |
| `search_vector` | `tsvector` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_version_id -> knowledge.source_versions.id ON DELETE CASCADE`; `parent_section_id -> knowledge.source_sections.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (source_version_id, stable_key)`

**Checks.** `CONSTRAINT source_sections_pages_ck CHECK ( (page_from IS NULL AND page_to IS NULL) OR (page_from > 0 AND page_to >= page_from) )`; `CONSTRAINT source_sections_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `source_sections_parent_idx` ((parent_section_id)); `source_sections_search_idx` (USING gin (search_vector)); `source_sections_article_idx` ((article_reference) WHERE article_reference IS NOT NULL)

### `knowledge.regulatory_updates`

**Description et justification.** Tracked changes to official medical and regulatory sources with explicit impact review.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_document_id` | `uuid` | non | — | — | — | `knowledge.source_documents.id` (N:1) | — |
| `source_version_id` | `uuid` | oui | — | — | — | `knowledge.source_versions.id` (N:1) | — |
| `update_type` | `text` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `summary` | `text` | non | — | — | — | — | — |
| `detected_at` | `timestamptz` | non | — | — | — | — | — |
| `effective_at` | `timestamptz` | oui | — | — | — | — | — |
| `reviewed_at` | `timestamptz` | oui | — | — | — | — | — |
| `reviewed_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `impact_assessment` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_document_id -> knowledge.source_documents.id ON DELETE CASCADE`; `source_version_id -> knowledge.source_versions.id ON DELETE SET NULL`; `reviewed_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT regulatory_updates_impact_ck CHECK (jsonb_typeof(impact_assessment) = 'object')`

**Index.** `regulatory_updates_status_idx` ((status, detected_at DESC)); `idx_regulatory_updates_source_document_id` ((source_document_id)); `idx_regulatory_updates_source_version_id` ((source_version_id)); `idx_regulatory_updates_reviewed_by` ((reviewed_by))

### `knowledge.medical_domains`

**Description et justification.** Hierarchical medical taxonomy shared by all formations and learning modes.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `parent_domain_id` | `uuid` | oui | — | — | — | `knowledge.medical_domains.id` (N:1) | — |
| `code` | `text` | non | — | — | oui | — | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `sort_order` | `integer` | non | `0` | — | — | — | — |
| `active` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `parent_domain_id -> knowledge.medical_domains.id ON DELETE RESTRICT`

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** `medical_domains_parent_idx` ((parent_domain_id, sort_order))

### `knowledge.competencies`

**Description et justification.** Stable, reusable Master Knowledge Base competencies with explicit mastery criteria.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `domain_id` | `uuid` | non | — | — | — | `knowledge.medical_domains.id` (N:1) | — |
| `name` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `mastery_threshold` | `numeric(5,2)` | non | `80` | — | — | — | — |
| `min_successful_attempts` | `integer` | non | `2` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `domain_id -> knowledge.medical_domains.id ON DELETE RESTRICT`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT competencies_mastery_ck CHECK (mastery_threshold BETWEEN 0 AND 100)`; `CONSTRAINT competencies_attempts_ck CHECK (min_successful_attempts > 0)`; `CONSTRAINT competencies_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `competencies_domain_status_idx` ((domain_id, status)); `competencies_key_trgm_idx` (USING gin (stable_key gin_trgm_ops)); `competencies_metadata_gin` (USING gin (metadata jsonb_path_ops))

### `knowledge.competency_prerequisites`

**Description et justification.** Directed prerequisite graph between competencies; cycles are rejected by validation tooling.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `prerequisite_competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `minimum_mastery` | `numeric(5,2)` | non | `70` | — | — | — | — |
| `required` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (competency_id, prerequisite_competency_id)`

**Relations.** `competency_id -> knowledge.competencies.id ON DELETE CASCADE`; `prerequisite_competency_id -> knowledge.competencies.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT competency_prerequisites_not_self_ck CHECK (competency_id <> prerequisite_competency_id)`; `CONSTRAINT competency_prerequisites_mastery_ck CHECK (minimum_mastery BETWEEN 0 AND 100)`

**Index.** `competency_prerequisites_reverse_idx` ((prerequisite_competency_id, competency_id))

### `knowledge.medical_concepts`

**Description et justification.** Normalized medical concepts used by content, semantic search and the medical graph.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `domain_id` | `uuid` | non | — | — | — | `knowledge.medical_domains.id` (N:1) | — |
| `preferred_label` | `text` | non | — | — | — | — | — |
| `definition` | `text` | non | — | — | — | — | — |
| `synonyms` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `language` | `text` | non | `'fr'` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `search_vector` | `tsvector` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `domain_id -> knowledge.medical_domains.id ON DELETE RESTRICT`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT medical_concepts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `medical_concepts_domain_idx` ((domain_id, status)); `medical_concepts_search_idx` (USING gin (search_vector)); `medical_concepts_synonyms_idx` (USING gin (synonyms))

### `knowledge.concept_relationships`

**Description et justification.** Directed, sourced edges of the MedLingo medical knowledge graph.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_concept_id` | `uuid` | non | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `target_concept_id` | `uuid` | non | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `relationship` | `core.relationship_kind` | non | — | — | — | — | — |
| `confidence` | `numeric(5,4)` | non | `1` | — | — | — | — |
| `source_section_id` | `uuid` | oui | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_concept_id -> knowledge.medical_concepts.id ON DELETE CASCADE`; `target_concept_id -> knowledge.medical_concepts.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (source_concept_id, target_concept_id, relationship)`

**Checks.** `CONSTRAINT concept_relationships_not_self_ck CHECK (source_concept_id <> target_concept_id)`; `CONSTRAINT concept_relationships_confidence_ck CHECK (confidence BETWEEN 0 AND 1)`; `CONSTRAINT concept_relationships_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `concept_relationships_target_idx` ((target_concept_id, relationship)); `idx_concept_relationships_source_section_id` ((source_section_id))

### `knowledge.concept_competencies`

**Description et justification.** Many-to-many mapping that connects the medical graph to measurable competencies.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `concept_id` | `uuid` | non | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `relevance` | `numeric(5,4)` | non | `1` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (concept_id, competency_id)`

**Relations.** `concept_id -> knowledge.medical_concepts.id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT concept_competencies_relevance_ck CHECK (relevance BETWEEN 0 AND 1)`

**Index.** `concept_competencies_competency_idx` ((competency_id, concept_id))

### `knowledge.concept_sources`

**Description et justification.** Auditable evidence links from concepts to precise document sections.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `concept_id` | `uuid` | non | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `source_section_id` | `uuid` | non | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `evidence_kind` | `text` | non | `'supports'` | — | — | — | — |
| `quotation_hash` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (concept_id, source_section_id)`

**Relations.** `concept_id -> knowledge.medical_concepts.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT concept_sources_kind_ck CHECK (evidence_kind IN ('defines', 'supports', 'updates', 'contradicts'))`

**Index.** `idx_concept_sources_source_section_id` ((source_section_id))

### `knowledge.concept_embeddings`

**Description et justification.** Versioned semantic vectors for concept retrieval; one embedding per model and concept.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `concept_id` | `uuid` | non | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `embedding_model` | `text` | non | — | — | — | — | — |
| `dimensions` | `integer` | non | — | — | — | — | — |
| `embedding` | `extensions.vector(1536)` | non | — | — | — | — | — |
| `content_hash` | `text` | non | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (concept_id, embedding_model)`

**Relations.** `concept_id -> knowledge.medical_concepts.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT concept_embeddings_dimensions_ck CHECK (dimensions = 1536)`

**Index.** `concept_embeddings_hnsw_idx` (USING hnsw (embedding vector_cosine_ops))

### `knowledge.tags`

**Description et justification.** Controlled reusable content tags; domain-specific junction tables preserve referential integrity.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `label` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `parent_tag_id` | `uuid` | oui | — | — | — | `knowledge.tags.id` (N:1) | — |
| `active` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `parent_tag_id -> knowledge.tags.id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** Aucun check de table supplémentaire.

**Index.** `tags_parent_idx` ((parent_tag_id))

## Domaine `learning`

### `learning.formations`

**Description et justification.** Top-level training programs such as DEA, Auxiliaire Ambulancier and IFSI.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `audience` | `text` | oui | — | — | — | — | — |
| `jurisdiction` | `text` | non | `'FR'` | — | — | — | — |
| `default_locale` | `text` | non | `'fr-FR'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `learning.formation_versions.id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `CONSTRAINT formations_current_version_fk: (current_version_id) -> learning.formation_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_formations_current_version_id` ((current_version_id))

### `learning.formation_versions`

**Description et justification.** Immutable version envelope for a formation curriculum.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `formation_id` | `uuid` | non | — | — | — | `learning.formations.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `effective_from` | `timestamptz` | oui | — | — | — | — | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `source_version_id` | `uuid` | oui | — | — | — | `knowledge.source_versions.id` (N:1) | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `formation_id -> learning.formations.id ON DELETE CASCADE`; `source_version_id -> knowledge.source_versions.id ON DELETE SET NULL`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (formation_id, version_number)`

**Checks.** `CONSTRAINT formation_versions_number_ck CHECK (version_number > 0)`

**Index.** `idx_formation_versions_source_version_id` ((source_version_id)); `idx_formation_versions_created_by` ((created_by))

### `learning.blocks`

**Description et justification.** Ordered curriculum domains grouping related learning paths.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `formation_version_id` | `uuid` | non | — | — | — | `learning.formation_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `subtitle` | `text` | oui | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `estimated_minutes` | `integer` | non | `0` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `formation_version_id -> learning.formation_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (formation_version_id, stable_key)`; `UNIQUE (formation_version_id, position)`

**Checks.** `CONSTRAINT blocks_position_ck CHECK (position > 0)`; `CONSTRAINT blocks_duration_ck CHECK (estimated_minutes >= 0)`; `CONSTRAINT blocks_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `blocks_formation_status_idx` ((formation_version_id, status, position))

### `learning.paths`

**Description et justification.** Ordered pedagogical paths within a block, independent of their lessons and rewards.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `block_id` | `uuid` | non | — | — | — | `learning.blocks.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `subtitle` | `text` | oui | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `objectives_text` | `text` | oui | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `estimated_minutes` | `integer` | non | `0` | — | — | — | — |
| `xp_reward` | `integer` | non | `0` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `block_id -> learning.blocks.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (block_id, stable_key)`; `UNIQUE (block_id, position)`

**Checks.** `CONSTRAINT paths_position_ck CHECK (position > 0)`; `CONSTRAINT paths_duration_ck CHECK (estimated_minutes >= 0)`; `CONSTRAINT paths_xp_ck CHECK (xp_reward >= 0)`; `CONSTRAINT paths_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `paths_block_status_idx` ((block_id, status, position))

### `learning.lessons`

**Description et justification.** Stable lesson identity; all editable pedagogical fields live in immutable lesson_versions.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `path_id` | `uuid` | non | — | — | — | `learning.paths.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `kind` | `core.content_kind` | non | `'lesson'` | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `path_id -> learning.paths.id ON DELETE CASCADE`; `CONSTRAINT lessons_current_version_fk: (current_version_id) -> learning.lesson_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (path_id, stable_key)`; `UNIQUE (path_id, position)`

**Checks.** `CONSTRAINT lessons_position_ck CHECK (position > 0)`

**Index.** `lessons_path_status_idx` ((path_id, status, position)); `idx_lessons_current_version_id` ((current_version_id))

### `learning.lesson_versions`

**Description et justification.** Immutable lesson versions preserving official source specifications and renderer configuration.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `lesson_id` | `uuid` | non | — | — | — | `learning.lessons.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `subtitle` | `text` | oui | — | — | — | — | — |
| `summary` | `text` | oui | — | — | — | — | — |
| `pedagogical_content` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `estimated_minutes` | `integer` | non | `0` | — | — | — | — |
| `passing_score` | `numeric(5,2)` | non | `80` | — | — | — | — |
| `xp_reward` | `integer` | non | `0` | — | — | — | — |
| `selection_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `lesson_id -> learning.lessons.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (lesson_id, version_number)`

**Checks.** `CONSTRAINT lesson_versions_number_ck CHECK (version_number > 0)`; `CONSTRAINT lesson_versions_duration_ck CHECK (estimated_minutes >= 0)`; `CONSTRAINT lesson_versions_passing_ck CHECK (passing_score BETWEEN 0 AND 100)`; `CONSTRAINT lesson_versions_xp_ck CHECK (xp_reward >= 0)`; `CONSTRAINT lesson_versions_content_ck CHECK (jsonb_typeof(pedagogical_content) = 'object')`; `CONSTRAINT lesson_versions_selection_ck CHECK (jsonb_typeof(selection_config) = 'object')`; `CONSTRAINT lesson_versions_published_ck CHECK ( status <> 'published' OR published_at IS NOT NULL )`

**Index.** `lesson_versions_lesson_status_idx` ((lesson_id, status, version_number DESC)); `lesson_versions_content_gin` (USING gin (pedagogical_content jsonb_path_ops)); `idx_lesson_versions_created_by` ((created_by))

### `learning.chapters`

**Description et justification.** Optional ordered internal lesson sections; not required for exercise-only lessons.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `content` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (lesson_version_id, stable_key)`; `UNIQUE (lesson_version_id, position)`

**Checks.** `CONSTRAINT chapters_position_ck CHECK (position > 0)`; `CONSTRAINT chapters_content_ck CHECK (jsonb_typeof(content) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `learning.learning_objectives`

**Description et justification.** Reusable measurable pedagogical objectives independent from lesson wording and versions.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `statement` | `text` | non | — | — | — | — | — |
| `bloom_level` | `text` | oui | — | — | — | — | — |
| `measurable` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT learning_objectives_bloom_ck CHECK ( bloom_level IS NULL OR bloom_level IN ( 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create' ) )`

**Index.** Clé primaire / uniques uniquement.

### `learning.lesson_objectives`

**Description et justification.** Ordered many-to-many mapping from a lesson version to its learning objectives.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `objective_id` | `uuid` | non | — | — | — | `learning.learning_objectives.id` (N:1) | — |
| `position` | `integer` | non | `1` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, objective_id)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `objective_id -> learning.learning_objectives.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_objectives_position_ck CHECK (position > 0)`

**Index.** `idx_lesson_objectives_objective_id` ((objective_id))

### `learning.lesson_competencies`

**Description et justification.** Weighted competency coverage of each immutable lesson version.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `weight` | `numeric(6,5)` | non | `1` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, competency_id)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_competencies_weight_ck CHECK (weight > 0 AND weight <= 1)`

**Index.** `lesson_competencies_competency_idx` ((competency_id, lesson_version_id))

### `learning.lesson_prerequisites`

**Description et justification.** Explicit prerequisite graph used for server-authoritative unlocking.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_id` | `uuid` | non | — | — | — | `learning.lessons.id` (N:1) | — |
| `prerequisite_lesson_id` | `uuid` | non | — | — | — | `learning.lessons.id` (N:1) | — |
| `minimum_score` | `numeric(5,2)` | non | `80` | — | — | — | — |
| `required` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_id, prerequisite_lesson_id)`

**Relations.** `lesson_id -> learning.lessons.id ON DELETE CASCADE`; `prerequisite_lesson_id -> learning.lessons.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_prerequisites_not_self_ck CHECK (lesson_id <> prerequisite_lesson_id)`; `CONSTRAINT lesson_prerequisites_score_ck CHECK (minimum_score BETWEEN 0 AND 100)`

**Index.** `lesson_prerequisites_reverse_idx` ((prerequisite_lesson_id, lesson_id))

### `learning.lesson_assets`

**Description et justification.** Purpose-specific attachment of optimized media to lesson versions.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `usage` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | `1` | — | — | — | — |
| `configuration` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, asset_id, usage)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `asset_id -> media.assets.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_assets_position_ck CHECK (position > 0)`; `CONSTRAINT lesson_assets_configuration_ck CHECK (jsonb_typeof(configuration) = 'object')`

**Index.** `lesson_assets_asset_idx` ((asset_id))

### `learning.lesson_metadata`

**Description et justification.** Extensible lesson metadata separated from core version fields to keep curriculum rows stable.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | oui | — | `learning.lesson_versions.id` (1:0..1) | — |
| `prerequisites_text` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `vocabulary` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `audience_notes` | `text` | oui | — | — | — | — | — |
| `source_notes` | `text` | oui | — | — | — | — | — |
| `feature_requirements` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `custom` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `lesson_version_id`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_metadata_custom_ck CHECK (jsonb_typeof(custom) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `learning.path_prerequisites`

**Description et justification.** Explicit path unlock graph, independent from visual ordering.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `path_id` | `uuid` | non | — | — | — | `learning.paths.id` (N:1) | — |
| `prerequisite_path_id` | `uuid` | non | — | — | — | `learning.paths.id` (N:1) | — |
| `required` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (path_id, prerequisite_path_id)`

**Relations.** `path_id -> learning.paths.id ON DELETE CASCADE`; `prerequisite_path_id -> learning.paths.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT path_prerequisites_not_self_ck CHECK (path_id <> prerequisite_path_id)`

**Index.** `idx_path_prerequisites_prerequisite_path_id` ((prerequisite_path_id))

### `learning.content_releases`

**Description et justification.** Atomic curriculum release manifest enabling reproducible clients and safe cache invalidation.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `release_key` | `text` | non | — | — | oui | — | — |
| `formation_version_id` | `uuid` | non | — | — | — | `learning.formation_versions.id` (N:1) | — |
| `scope` | `core.publication_scope` | non | `'formation'` | — | — | — | — |
| `version_label` | `text` | non | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `manifest_checksum` | `text` | oui | — | — | — | — | — |
| `published_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `formation_version_id -> learning.formation_versions.id ON DELETE RESTRICT`; `published_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `release_key`

**Checks.** `CONSTRAINT content_releases_published_ck CHECK ( status <> 'published' OR published_at IS NOT NULL )`

**Index.** `idx_content_releases_formation_version_id` ((formation_version_id)); `idx_content_releases_published_by` ((published_by))

### `learning.content_release_items`

**Description et justification.** Exact immutable lesson versions included in one release.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `release_id` | `uuid` | non | — | — | — | `learning.content_releases.id` (N:1) | — |
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `content_hash` | `text` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (release_id, lesson_version_id)`

**Relations.** `release_id -> learning.content_releases.id ON DELETE CASCADE`; `lesson_version_id -> learning.lesson_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `content_release_items_lesson_idx` ((lesson_version_id, release_id))

### `learning.lesson_tags`

**Description et justification.** Normalized tags for lesson discovery and analytics.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `tag_id` | `uuid` | non | — | — | — | `knowledge.tags.id` (N:1) | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, tag_id)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `tag_id -> knowledge.tags.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `lesson_tags_tag_idx` ((tag_id, lesson_version_id))

## Domaine `media`

### `media.assets`

**Description et justification.** Canonical media metadata; binary objects remain in private or public Supabase Storage buckets.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `kind` | `core.asset_kind` | non | — | — | — | — | — |
| `storage_bucket` | `text` | non | — | — | — | — | — |
| `storage_path` | `text` | non | — | — | — | — | — |
| `mime_type` | `text` | non | — | — | — | — | — |
| `byte_size` | `bigint` | non | — | — | — | — | — |
| `checksum_sha256` | `text` | non | — | — | — | — | — |
| `width_px` | `integer` | oui | — | — | — | — | — |
| `height_px` | `integer` | oui | — | — | — | — | — |
| `duration_ms` | `integer` | oui | — | — | — | — | — |
| `accessibility_label` | `text` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `deleted_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`; `UNIQUE (storage_bucket, storage_path)`; `UNIQUE (checksum_sha256, byte_size)`

**Checks.** `CONSTRAINT assets_byte_size_ck CHECK (byte_size > 0)`; `CONSTRAINT assets_dimensions_ck CHECK ( (width_px IS NULL OR width_px > 0) AND (height_px IS NULL OR height_px > 0) AND (duration_ms IS NULL OR duration_ms >= 0) )`; `CONSTRAINT assets_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `assets_kind_status_idx` ((kind, status, created_at DESC)); `assets_metadata_gin` (USING gin (metadata jsonb_path_ops)); `assets_search_trgm_idx` (USING gin (stable_key gin_trgm_ops)); `idx_assets_created_by` ((created_by))

### `media.asset_variants`

**Description et justification.** Optimized derivatives such as thumbnails, WebP/AVIF, mobile video, waveform and low-poly 3D.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `source_asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `variant_key` | `text` | non | — | — | — | — | — |
| `storage_bucket` | `text` | non | — | — | — | — | — |
| `storage_path` | `text` | non | — | — | — | — | — |
| `mime_type` | `text` | non | — | — | — | — | — |
| `byte_size` | `bigint` | non | — | — | — | — | — |
| `width_px` | `integer` | oui | — | — | — | — | — |
| `height_px` | `integer` | oui | — | — | — | — | — |
| `bitrate_kbps` | `integer` | oui | — | — | — | — | — |
| `transformation` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `source_asset_id -> media.assets.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (source_asset_id, variant_key)`; `UNIQUE (storage_bucket, storage_path)`

**Checks.** `CONSTRAINT asset_variants_size_ck CHECK (byte_size > 0)`; `CONSTRAINT asset_variants_transform_ck CHECK (jsonb_typeof(transformation) = 'object')`

**Index.** `asset_variants_source_idx` ((source_asset_id, variant_key))

### `media.asset_localizations`

**Description et justification.** Localized accessible titles, captions, alternative text and media transcripts.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `locale` | `text` | non | — | — | — | — | — |
| `title` | `text` | oui | — | — | — | — | — |
| `caption` | `text` | oui | — | — | — | — | — |
| `alt_text` | `text` | non | — | — | — | — | — |
| `transcript` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (asset_id, locale)`

**Relations.** `asset_id -> media.assets.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** Clé primaire / uniques uniquement.

### `media.asset_licenses`

**Description et justification.** Rights and provenance for every externally sourced or commissioned media asset.

**Définition SQL.** [20_content_knowledge.sql](../../supabase/architecture/v1/20_content_knowledge.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `license_name` | `text` | non | — | — | — | — | — |
| `rights_holder` | `text` | oui | — | — | — | — | — |
| `source_url` | `text` | oui | — | — | — | — | — |
| `valid_from` | `timestamptz` | oui | — | — | — | — | — |
| `valid_until` | `timestamptz` | oui | — | — | — | — | — |
| `usage_terms` | `text` | oui | — | — | — | — | — |
| `evidence_asset_id` | `uuid` | oui | — | — | — | `media.assets.id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `asset_id -> media.assets.id ON DELETE CASCADE`; `evidence_asset_id -> media.assets.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT asset_license_dates_ck CHECK ( valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from )`

**Index.** `asset_licenses_asset_idx` ((asset_id)); `idx_asset_licenses_evidence_asset_id` ((evidence_asset_id))

## Domaine `operations`

### `operations.application_errors`

**Description et justification.** Privacy-filtered client, Edge Function and database error occurrences grouped by fingerprint.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `fingerprint` | `text` | non | — | — | — | — | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `environment` | `text` | non | — | — | — | — | — |
| `release_version` | `text` | oui | — | — | — | — | — |
| `severity` | `text` | non | — | — | — | — | — |
| `error_type` | `text` | non | — | — | — | — | — |
| `message` | `text` | non | — | — | — | — | — |
| `stack_trace` | `text` | oui | — | — | — | — | — |
| `context` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `first_seen_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `resolved_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT application_errors_severity_ck CHECK ( severity IN ('debug', 'info', 'warning', 'error', 'fatal') )`; `CONSTRAINT application_errors_context_ck CHECK (jsonb_typeof(context) = 'object')`

**Index.** `application_errors_fingerprint_idx` ((fingerprint, occurred_at DESC)); `application_errors_unresolved_idx` ((severity, occurred_at DESC) WHERE resolved_at IS NULL); `application_errors_context_gin` (USING gin (context jsonb_path_ops)); `idx_application_errors_user_id` ((user_id)); `idx_application_errors_device_id` ((device_id))

### `operations.bug_reports`

**Description et justification.** User or staff submitted defect with reproducibility and device context.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `reporter_user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `reproduction_steps` | `text` | oui | — | — | — | — | — |
| `expected_behavior` | `text` | oui | — | — | — | — | — |
| `actual_behavior` | `text` | oui | — | — | — | — | — |
| `app_version` | `text` | oui | — | — | — | — | — |
| `device_context` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `status` | `text` | non | `'new'` | — | — | — | — |
| `priority` | `text` | non | `'normal'` | — | — | — | — |
| `assigned_to` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `resolved_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `reporter_user_id -> iam.user_accounts.user_id ON DELETE SET NULL`; `assigned_to -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT bug_reports_status_ck CHECK ( status IN ('new', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate') )`; `CONSTRAINT bug_reports_priority_ck CHECK ( priority IN ('low', 'normal', 'high', 'critical') )`; `CONSTRAINT bug_reports_device_ck CHECK (jsonb_typeof(device_context) = 'object')`

**Index.** `bug_reports_queue_idx` ((status, priority, created_at)); `idx_bug_reports_reporter_user_id` ((reporter_user_id)); `idx_bug_reports_assigned_to` ((assigned_to))

### `operations.feature_flags`

**Description et justification.** Server-authoritative feature configuration and deterministic rollout rules.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `code` | `text` | non | — | — | oui | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `value_type` | `text` | non | — | — | — | — | — |
| `default_value` | `jsonb` | non | — | — | — | — | — |
| `rollout_percentage` | `numeric(5,2)` | non | `0` | — | — | — | — |
| `rules` | `jsonb` | non | `'[]'::jsonb` | — | — | — | — |
| `enabled` | `boolean` | non | `false` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `code`

**Checks.** `CONSTRAINT feature_flags_type_ck CHECK (value_type IN ('boolean', 'string', 'number', 'json'))`; `CONSTRAINT feature_flags_rollout_ck CHECK (rollout_percentage BETWEEN 0 AND 100)`; `CONSTRAINT feature_flags_rules_ck CHECK (jsonb_typeof(rules) = 'array')`

**Index.** `idx_feature_flags_created_by` ((created_by))

### `operations.feature_flag_overrides`

**Description et justification.** Explicit user, organization or formation feature override with referentially valid target.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `feature_flag_id` | `uuid` | non | — | — | — | `operations.feature_flags.id` (N:1) | — |
| `user_id` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `organization_id` | `uuid` | oui | — | — | — | `iam.organizations.id` (N:1) | — |
| `formation_id` | `uuid` | oui | — | — | — | `learning.formations.id` (N:1) | — |
| `value` | `jsonb` | non | — | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |
| `reason` | `text` | non | — | — | — | — | — |
| `created_by` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `feature_flag_id -> operations.feature_flags.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `organization_id -> iam.organizations.id ON DELETE CASCADE`; `formation_id -> learning.formations.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT feature_flag_override_target_ck CHECK ( num_nonnulls(user_id, organization_id, formation_id) = 1 )`

**Index.** `feature_flag_overrides_user_idx` ((user_id, feature_flag_id) WHERE user_id IS NOT NULL); `feature_flag_overrides_org_idx` ((organization_id, feature_flag_id) WHERE organization_id IS NOT NULL); `idx_feature_flag_overrides_feature_flag_id` ((feature_flag_id)); `idx_feature_flag_overrides_formation_id` ((formation_id)); `idx_feature_flag_overrides_created_by` ((created_by))

### `operations.maintenance_windows`

**Description et justification.** Scheduled or emergency service-impact window consumed by clients and status tooling.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `starts_at` | `timestamptz` | non | — | — | — | — | — |
| `ends_at` | `timestamptz` | non | — | — | — | — | — |
| `affected_services` | `text[]` | non | — | — | — | — | — |
| `severity` | `text` | non | `'maintenance'` | — | — | — | — |
| `user_message` | `text` | oui | — | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `cancelled_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT maintenance_windows_dates_ck CHECK (ends_at > starts_at)`; `CONSTRAINT maintenance_windows_services_ck CHECK (cardinality(affected_services) > 0)`; `CONSTRAINT maintenance_windows_severity_ck CHECK ( severity IN ('notice', 'maintenance', 'degraded', 'outage') )`

**Index.** `maintenance_windows_time_gist` (USING gist (tstzrange(starts_at, ends_at, '[)'))); `idx_maintenance_windows_created_by` ((created_by))

### `operations.idempotency_keys`

**Description et justification.** Generic exactly-once guard for mobile mutations beyond domain-specific unique keys.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `scope` | `text` | non | — | — | — | — | — |
| `idempotency_key` | `uuid` | non | — | — | — | — | — |
| `request_hash` | `text` | non | — | — | — | — | — |
| `response_status` | `integer` | oui | — | — | — | — | — |
| `response_body` | `jsonb` | oui | — | — | — | — | — |
| `locked_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `expires_at` | `timestamptz` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, scope, idempotency_key)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT idempotency_keys_status_ck CHECK ( response_status IS NULL OR response_status BETWEEN 100 AND 599 )`; `CONSTRAINT idempotency_keys_expiry_ck CHECK (expires_at > locked_at)`

**Index.** `idempotency_keys_expiry_idx` ((expires_at))

### `operations.outbox_events`

**Description et justification.** Transactional outbox for analytics, notifications, achievements and external integrations.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `aggregate_type` | `text` | non | — | — | — | — | — |
| `aggregate_id` | `uuid` | non | — | — | — | — | — |
| `event_type` | `text` | non | — | — | — | — | — |
| `event_version` | `integer` | non | `1` | — | — | — | — |
| `payload` | `jsonb` | non | — | — | — | — | — |
| `correlation_id` | `uuid` | non | — | — | — | — | — |
| `causation_id` | `uuid` | oui | — | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `available_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `attempt_count` | `integer` | non | `0` | — | — | — | — |
| `locked_at` | `timestamptz` | oui | — | — | — | — | — |
| `locked_by` | `text` | oui | — | — | — | — | — |
| `last_error` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT outbox_events_version_ck CHECK (event_version > 0)`; `CONSTRAINT outbox_events_payload_ck CHECK (jsonb_typeof(payload) = 'object')`; `CONSTRAINT outbox_events_attempts_ck CHECK (attempt_count >= 0)`

**Index.** `outbox_events_worker_idx` ((available_at, occurred_at) WHERE published_at IS NULL); `outbox_events_aggregate_idx` ((aggregate_type, aggregate_id, occurred_at))

### `operations.sync_changes`

**Description et justification.** Per-user monotonic change feed for incremental offline synchronization and tombstones.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `revision` | `bigint` | non | — | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `entity_type` | `text` | non | — | — | — | — | — |
| `entity_key` | `jsonb` | non | — | — | — | — | — |
| `operation` | `text` | non | — | — | — | — | — |
| `changed_fields` | `text[]` | non | `ARRAY[]::text[]` | — | — | — | — |
| `payload` | `jsonb` | oui | — | — | — | — | — |
| `changed_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `expires_at` | `timestamptz` | oui | — | — | — | — | — |

**Clé primaire.** `revision`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT sync_changes_operation_ck CHECK (operation IN ('upsert', 'delete'))`; `CONSTRAINT sync_changes_entity_key_ck CHECK (jsonb_typeof(entity_key) = 'object')`; `CONSTRAINT sync_changes_payload_ck CHECK ( payload IS NULL OR jsonb_typeof(payload) = 'object' )`

**Index.** `sync_changes_user_revision_idx` ((user_id, revision)); `sync_changes_entity_key_gin` (USING gin (entity_key jsonb_path_ops)); `sync_changes_expiry_idx` ((expires_at) WHERE expires_at IS NOT NULL)

### `operations.device_sync_cursors`

**Description et justification.** Acknowledged offline-sync cursor per installation, used to retain tombstones safely.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `device_id` | `uuid` | non | — | oui | — | `iam.user_devices.id` (1:0..1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `last_pulled_revision` | `bigint` | non | `0` | — | — | — | — |
| `last_push_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_pull_at` | `timestamptz` | oui | — | — | — | — | — |
| `full_resync_required` | `boolean` | non | `false` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `device_id`

**Relations.** `device_id -> iam.user_devices.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT device_sync_cursors_revision_ck CHECK (last_pulled_revision >= 0)`

**Index.** `device_sync_cursors_user_idx` ((user_id, updated_at DESC))

### `operations.job_runs`

**Description et justification.** Execution history for rollups, SRS scheduling, notifications, partitions and cleanup jobs.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `job_name` | `text` | non | — | — | — | — | — |
| `scheduled_for` | `timestamptz` | oui | — | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `status` | `text` | non | `'running'` | — | — | — | — |
| `processed_count` | `bigint` | non | `0` | — | — | — | — |
| `failed_count` | `bigint` | non | `0` | — | — | — | — |
| `cursor` | `jsonb` | oui | — | — | — | — | — |
| `metrics` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `error` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT job_runs_status_ck CHECK ( status IN ('running', 'succeeded', 'failed', 'cancelled', 'partial') )`; `CONSTRAINT job_runs_counts_ck CHECK (processed_count >= 0 AND failed_count >= 0)`; `CONSTRAINT job_runs_cursor_ck CHECK (cursor IS NULL OR jsonb_typeof(cursor) = 'object')`; `CONSTRAINT job_runs_metrics_ck CHECK (jsonb_typeof(metrics) = 'object')`

**Index.** `job_runs_name_time_idx` ((job_name, started_at DESC))

### `operations.schema_releases`

**Description et justification.** Application-level schema release registry with compatibility and rollback evidence.

**Définition SQL.** [70_governance_operations.sql](../../supabase/architecture/v1/70_governance_operations.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `version` | `text` | non | — | — | oui | — | — |
| `checksum` | `text` | non | — | — | — | — | — |
| `description` | `text` | non | — | — | — | — | — |
| `compatibility_level` | `text` | non | — | — | — | — | — |
| `applied_at` | `timestamptz` | oui | — | — | — | — | — |
| `applied_by` | `text` | oui | — | — | — | — | — |
| `rollback_plan` | `text` | non | — | — | — | — | — |
| `validation_report` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** Aucune relation sortante.

**Contraintes uniques.** `version`

**Checks.** `CONSTRAINT schema_releases_compatibility_ck CHECK ( compatibility_level IN ('additive', 'dual_write', 'cutover', 'breaking') )`; `CONSTRAINT schema_releases_validation_ck CHECK (jsonb_typeof(validation_report) = 'object')`

**Index.** Clé primaire / uniques uniquement.

## Domaine `practice`

### `practice.question_banks`

**Description et justification.** Reusable question pools shared by lessons, SRS, exams, Bosses, Pulse and Intervention.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `description` | `text` | oui | — | — | — | — | — |
| `formation_id` | `uuid` | oui | — | — | — | `learning.formations.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `selection_defaults` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `formation_id -> learning.formations.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT question_banks_selection_ck CHECK (jsonb_typeof(selection_defaults) = 'object')`

**Index.** `question_banks_formation_status_idx` ((formation_id, status)); `idx_question_banks_created_by` ((created_by))

### `practice.lesson_question_banks`

**Description et justification.** Data-driven mapping from lesson versions to one or more reusable question pools.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `question_bank_id` | `uuid` | non | — | — | — | `practice.question_banks.id` (N:1) | — |
| `selection_weight` | `numeric(6,5)` | non | `1` | — | — | — | — |
| `selection_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, question_bank_id)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `question_bank_id -> practice.question_banks.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_question_banks_weight_ck CHECK (selection_weight > 0 AND selection_weight <= 1)`; `CONSTRAINT lesson_question_banks_config_ck CHECK (jsonb_typeof(selection_config) = 'object')`

**Index.** `idx_lesson_question_banks_question_bank_id` ((question_bank_id))

### `practice.questions`

**Description et justification.** Stable identity and exercise type for one pedagogical question; wording lives in versions.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_bank_id` | `uuid` | non | — | — | — | `practice.question_banks.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `type` | `core.exercise_type` | non | — | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `practice.question_versions.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_bank_id -> practice.question_banks.id ON DELETE CASCADE`; `CONSTRAINT questions_current_version_fk: (current_version_id) -> practice.question_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (question_bank_id, stable_key)`

**Checks.** Aucun check de table supplémentaire.

**Index.** `questions_bank_type_status_idx` ((question_bank_id, type, status)); `idx_questions_current_version_id` ((current_version_id))

### `practice.question_versions`

**Description et justification.** Immutable wording, level and renderer configuration for a question version.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_id` | `uuid` | non | — | — | — | `practice.questions.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `prompt` | `text` | non | — | — | — | — | — |
| `instructions` | `text` | oui | — | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `bloom_level` | `text` | non | `'understand'` | — | — | — | — |
| `estimated_seconds` | `integer` | non | `30` | — | — | — | — |
| `scoring_config` | `jsonb` | non | `'{"maxScore":1}'::jsonb` | — | — | — | — |
| `renderer_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `review_status` | `core.review_status` | non | `'pending_review'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_id -> practice.questions.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (question_id, version_number)`

**Checks.** `CONSTRAINT question_versions_number_ck CHECK (version_number > 0)`; `CONSTRAINT question_versions_bloom_ck CHECK ( bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create') )`; `CONSTRAINT question_versions_duration_ck CHECK (estimated_seconds BETWEEN 1 AND 7200)`; `CONSTRAINT question_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object')`; `CONSTRAINT question_versions_renderer_ck CHECK (jsonb_typeof(renderer_config) = 'object')`; `CONSTRAINT question_versions_published_ck CHECK ( status <> 'published' OR published_at IS NOT NULL )`

**Index.** `question_versions_question_status_idx` ((question_id, status, version_number DESC)); `question_versions_renderer_gin` (USING gin (renderer_config jsonb_path_ops)); `idx_question_versions_created_by` ((created_by))

### `practice.choices`

**Description et justification.** Answer choices with stable IDs; visual position is never the source of truth.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `label` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (question_version_id, stable_key)`; `UNIQUE (question_version_id, position)`

**Checks.** `CONSTRAINT choices_position_ck CHECK (position > 0)`; `CONSTRAINT choices_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `choices_question_idx` ((question_version_id, position))

### `practice.answer_keys`

**Description et justification.** Canonical corrections by stable choice ID or structured accepted payload; supports single and multiple answers.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `choice_id` | `uuid` | oui | — | — | — | `practice.choices.id` (N:1) | — |
| `accepted_payload` | `jsonb` | oui | — | — | — | — | — |
| `weight` | `numeric(7,5)` | non | `1` | — | — | — | — |
| `required` | `boolean` | non | `true` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `choice_id -> practice.choices.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT answer_keys_target_ck CHECK ( (choice_id IS NOT NULL AND accepted_payload IS NULL) OR (choice_id IS NULL AND accepted_payload IS NOT NULL) )`; `CONSTRAINT answer_keys_weight_ck CHECK (weight >= 0 AND weight <= 1)`; `CONSTRAINT answer_keys_payload_ck CHECK ( accepted_payload IS NULL OR jsonb_typeof(accepted_payload) IN ('object', 'array', 'string', 'number', 'boolean') )`

**Index.** `answer_keys_choice_uidx` (unique, (question_version_id, choice_id) WHERE choice_id IS NOT NULL); `answer_keys_question_idx` ((question_version_id)); `idx_answer_keys_choice_id` ((choice_id))

### `practice.explanations`

**Description et justification.** General and choice-specific pedagogical feedback, including clinical or regulatory priority.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `choice_id` | `uuid` | oui | — | — | — | `practice.choices.id` (N:1) | — |
| `explanation_kind` | `text` | non | `'general'` | — | — | — | — |
| `content` | `text` | non | — | — | — | — | — |
| `priority_note` | `text` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `choice_id -> practice.choices.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT explanations_kind_ck CHECK ( explanation_kind IN ('general', 'correct', 'distractor', 'clinical', 'regulatory') )`

**Index.** `explanations_scope_uidx` (unique, ( question_version_id, COALESCE(choice_id, '00000000-0000-0000-0000-000000000000'::uuid), explanation_kind )); `idx_explanations_choice_id` ((choice_id))

### `practice.hints`

**Description et justification.** Ordered progressive hints with optional timing and XP cost.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `position` | `integer` | non | — | — | — | — | — |
| `content` | `text` | non | — | — | — | — | — |
| `xp_penalty` | `integer` | non | `0` | — | — | — | — |
| `unlock_after_seconds` | `integer` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (question_version_id, position)`

**Checks.** `CONSTRAINT hints_position_ck CHECK (position > 0)`; `CONSTRAINT hints_penalty_ck CHECK (xp_penalty >= 0)`; `CONSTRAINT hints_unlock_ck CHECK (unlock_after_seconds IS NULL OR unlock_after_seconds >= 0)`

**Index.** Clé primaire / uniques uniquement.

### `practice.question_competencies`

**Description et justification.** Weighted competencies measured by an immutable question version.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `weight` | `numeric(6,5)` | non | `1` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (question_version_id, competency_id)`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT question_competencies_weight_ck CHECK (weight > 0 AND weight <= 1)`

**Index.** `question_competencies_competency_idx` ((competency_id, question_version_id))

### `practice.question_sources`

**Description et justification.** Mandatory page- or article-level evidence for every source-backed question.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `source_section_id` | `uuid` | non | — | — | — | `knowledge.source_sections.id` (N:1) | — |
| `evidence_note` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (question_version_id, source_section_id)`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `source_section_id -> knowledge.source_sections.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `question_sources_section_idx` ((source_section_id, question_version_id))

### `practice.question_tags`

**Description et justification.** Normalized tags for search, adaptive selection and reuse across learning modes.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `tag_id` | `uuid` | non | — | — | — | `knowledge.tags.id` (N:1) | — |

**Clé primaire.** `PRIMARY KEY (question_version_id, tag_id)`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `tag_id -> knowledge.tags.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** Aucun check de table supplémentaire.

**Index.** `question_tags_tag_idx` ((tag_id, question_version_id))

### `practice.question_assets`

**Description et justification.** Images, audio, video, Lottie or 3D media used by a question version.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `asset_id` | `uuid` | non | — | — | — | `media.assets.id` (N:1) | — |
| `usage` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | `1` | — | — | — | — |
| `configuration` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (question_version_id, asset_id, usage)`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `asset_id -> media.assets.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT question_assets_position_ck CHECK (position > 0)`; `CONSTRAINT question_assets_config_ck CHECK (jsonb_typeof(configuration) = 'object')`

**Index.** `idx_question_assets_asset_id` ((asset_id))

### `practice.matching_pairs`

**Description et justification.** Normalized correct pairs for matching exercises; clients randomize both sides independently.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `left_content` | `text` | non | — | — | — | — | — |
| `right_content` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (question_version_id, stable_key)`; `UNIQUE (question_version_id, position)`

**Checks.** `CONSTRAINT matching_pairs_position_ck CHECK (position > 0)`

**Index.** Clé primaire / uniques uniquement.

### `practice.ordering_items`

**Description et justification.** Stable items and canonical sequence for chronological and procedural ordering.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `content` | `text` | non | — | — | — | — | — |
| `correct_position` | `integer` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (question_version_id, stable_key)`; `UNIQUE (question_version_id, correct_position)`

**Checks.** `CONSTRAINT ordering_items_position_ck CHECK (correct_position > 0)`

**Index.** Clé primaire / uniques uniquement.

### `practice.fill_blank_slots`

**Description et justification.** Normalized blank positions and accepted textual forms for fill-in exercises.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `stable_key` | `text` | non | — | — | — | — | — |
| `position` | `integer` | non | — | — | — | — | — |
| `accepted_answers` | `text[]` | non | — | — | — | — | — |
| `case_sensitive` | `boolean` | non | `false` | — | — | — | — |
| `accent_sensitive` | `boolean` | non | `false` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** `UNIQUE (question_version_id, stable_key)`; `UNIQUE (question_version_id, position)`

**Checks.** `CONSTRAINT fill_blank_slots_position_ck CHECK (position > 0)`; `CONSTRAINT fill_blank_slots_answers_ck CHECK (cardinality(accepted_answers) > 0)`

**Index.** Clé primaire / uniques uniquement.

### `practice.calculation_rules`

**Description et justification.** Server-side numeric correction rule for dosage, timing or other approved calculations.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | oui | — | `practice.question_versions.id` (1:0..1) | — |
| `expected_value` | `numeric` | non | — | — | — | — | — |
| `tolerance` | `numeric` | non | `0` | — | — | — | — |
| `unit` | `text` | oui | — | — | — | — | — |
| `rounding_scale` | `integer` | oui | — | — | — | — | — |
| `formula_reference` | `text` | oui | — | — | — | — | — |

**Clé primaire.** `question_version_id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT calculation_rules_tolerance_ck CHECK (tolerance >= 0)`; `CONSTRAINT calculation_rules_rounding_ck CHECK ( rounding_scale IS NULL OR rounding_scale BETWEEN 0 AND 10 )`

**Index.** Clé primaire / uniques uniquement.

### `practice.exercise_definitions`

**Description et justification.** Stable aggregate for a composed activity such as a lesson session, quiz, Boss or exam.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `title` | `text` | non | — | — | — | — | — |
| `kind` | `core.content_kind` | non | `'lesson'` | — | — | — | — |
| `current_version_id` | `uuid` | oui | — | — | — | `practice.exercise_versions.id` (N:1) | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `CONSTRAINT exercise_definitions_current_version_fk: (current_version_id) -> practice.exercise_versions (id) ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** Aucun check de table supplémentaire.

**Index.** `idx_exercise_definitions_current_version_id` ((current_version_id))

### `practice.exercise_versions`

**Description et justification.** Immutable composed-activity rules supporting deterministic retries and historical scoring.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `exercise_id` | `uuid` | non | — | — | — | `practice.exercise_definitions.id` (N:1) | — |
| `version_number` | `integer` | non | — | — | — | — | — |
| `instructions` | `text` | oui | — | — | — | — | — |
| `selection_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `scoring_config` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `time_limit_seconds` | `integer` | oui | — | — | — | — | — |
| `attempt_limit` | `integer` | oui | — | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_by` | `uuid` | oui | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `published_at` | `timestamptz` | oui | — | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `exercise_id -> practice.exercise_definitions.id ON DELETE CASCADE`; `created_by -> iam.user_accounts.user_id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (exercise_id, version_number)`

**Checks.** `CONSTRAINT exercise_versions_number_ck CHECK (version_number > 0)`; `CONSTRAINT exercise_versions_selection_ck CHECK (jsonb_typeof(selection_config) = 'object')`; `CONSTRAINT exercise_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object')`; `CONSTRAINT exercise_versions_time_ck CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0)`; `CONSTRAINT exercise_versions_attempt_limit_ck CHECK (attempt_limit IS NULL OR attempt_limit > 0)`; `CONSTRAINT exercise_versions_published_ck CHECK ( status <> 'published' OR published_at IS NOT NULL )`

**Index.** `idx_exercise_versions_created_by` ((created_by))

### `practice.exercise_questions`

**Description et justification.** Optional fixed membership of an activity; selection_config can instead sample question banks.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `exercise_version_id` | `uuid` | non | — | — | — | `practice.exercise_versions.id` (N:1) | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `position` | `integer` | oui | — | — | — | — | — |
| `weight` | `numeric(7,5)` | non | `1` | — | — | — | — |
| `required` | `boolean` | non | `false` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (exercise_version_id, question_version_id)`

**Relations.** `exercise_version_id -> practice.exercise_versions.id ON DELETE CASCADE`; `question_version_id -> practice.question_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT exercise_questions_position_ck CHECK (position IS NULL OR position > 0)`; `CONSTRAINT exercise_questions_weight_ck CHECK (weight > 0)`

**Index.** `exercise_questions_question_idx` ((question_version_id, exercise_version_id))

### `practice.lesson_exercises`

**Description et justification.** Ordered activities attached to a lesson version; no pedagogical text is hard-coded in React.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `exercise_version_id` | `uuid` | non | — | — | — | `practice.exercise_versions.id` (N:1) | — |
| `position` | `integer` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (lesson_version_id, exercise_version_id)`

**Relations.** `lesson_version_id -> learning.lesson_versions.id ON DELETE CASCADE`; `exercise_version_id -> practice.exercise_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (lesson_version_id, position)`

**Checks.** `CONSTRAINT lesson_exercises_position_ck CHECK (position > 0)`

**Index.** `idx_lesson_exercises_exercise_version_id` ((exercise_version_id))

### `practice.hotspot_targets`

**Description et justification.** Canonical accepted anatomy hotspots for image or 3D localization questions.

**Définition SQL.** [30_learning_delivery.sql](../../supabase/architecture/v1/30_learning_delivery.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `hotspot_id` | `uuid` | non | — | — | — | `anatomy.hotspots.id` (N:1) | — |
| `weight` | `numeric(7,5)` | non | `1` | — | — | — | — |
| `required` | `boolean` | non | `true` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (question_version_id, hotspot_id)`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE CASCADE`; `hotspot_id -> anatomy.hotspots.id ON DELETE RESTRICT`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT hotspot_targets_weight_ck CHECK (weight > 0 AND weight <= 1)`

**Index.** `idx_hotspot_targets_hotspot_id` ((hotspot_id))

### `practice.flashcards`

**Description et justification.** Reusable canonical review prompts linked to a question or medical concept.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `stable_key` | `text` | non | — | — | oui | — | — |
| `question_version_id` | `uuid` | oui | — | — | — | `practice.question_versions.id` (N:1) | — |
| `concept_id` | `uuid` | oui | — | — | — | `knowledge.medical_concepts.id` (N:1) | — |
| `front` | `text` | non | — | — | — | — | — |
| `back` | `text` | non | — | — | — | — | — |
| `difficulty` | `core.difficulty_level` | non | `'easy'` | — | — | — | — |
| `status` | `core.lifecycle_status` | non | `'draft'` | — | — | — | — |
| `created_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `question_version_id -> practice.question_versions.id ON DELETE SET NULL`; `concept_id -> knowledge.medical_concepts.id ON DELETE SET NULL`

**Contraintes uniques.** `stable_key`

**Checks.** `CONSTRAINT flashcards_origin_ck CHECK ( question_version_id IS NOT NULL OR concept_id IS NOT NULL )`

**Index.** `idx_flashcards_question_version_id` ((question_version_id)); `idx_flashcards_concept_id` ((concept_id))

## Domaine `progress`

### `progress.enrollments`

**Description et justification.** User registration in one immutable formation version; anchors all curriculum progress.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `formation_id` | `uuid` | non | — | — | — | `learning.formations.id` (N:1) | — |
| `formation_version_id` | `uuid` | non | — | — | — | `learning.formation_versions.id` (N:1) | — |
| `status` | `text` | non | `'active'` | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `last_activity_at` | `timestamptz` | oui | — | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `formation_id -> learning.formations.id ON DELETE RESTRICT`; `formation_version_id -> learning.formation_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, formation_id)`

**Checks.** `CONSTRAINT enrollments_status_ck CHECK (status IN ('active', 'paused', 'completed', 'withdrawn'))`; `CONSTRAINT enrollments_completion_ck CHECK ( (status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed' )`; `CONSTRAINT enrollments_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `enrollments_user_status_idx` ((user_id, status, last_activity_at DESC NULLS LAST)); `idx_enrollments_formation_id` ((formation_id)); `idx_enrollments_formation_version_id` ((formation_version_id))

### `progress.user_learning_state`

**Description et justification.** Server-authoritative, frequently read aggregate for XP, level, hearts and streak.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `iam.user_accounts.user_id` (1:0..1) | — |
| `total_xp` | `bigint` | non | `0` | — | — | — | — |
| `current_level` | `integer` | non | `1` | — | — | — | — |
| `hearts` | `integer` | non | `5` | — | — | — | — |
| `max_hearts` | `integer` | non | `5` | — | — | — | — |
| `hearts_updated_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `current_streak` | `integer` | non | `0` | — | — | — | — |
| `longest_streak` | `integer` | non | `0` | — | — | — | — |
| `last_study_date` | `date` | oui | — | — | — | — | — |
| `daily_xp` | `integer` | non | `0` | — | — | — | — |
| `daily_xp_date` | `date` | non | `current_date` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT user_learning_state_xp_ck CHECK (total_xp >= 0 AND daily_xp >= 0)`; `CONSTRAINT user_learning_state_level_ck CHECK (current_level > 0)`; `CONSTRAINT user_learning_state_hearts_ck CHECK ( hearts >= 0 AND max_hearts > 0 AND hearts <= max_hearts )`; `CONSTRAINT user_learning_state_streak_ck CHECK ( current_streak >= 0 AND longest_streak >= current_streak )`

**Index.** Clé primaire / uniques uniquement.

### `progress.lesson_progress`

**Description et justification.** One compact current-state row per user and stable lesson for fast roadmap rendering.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `lesson_id` | `uuid` | non | — | — | — | `learning.lessons.id` (N:1) | — |
| `state` | `core.mastery_state` | non | `'not_started'` | — | — | — | — |
| `unlocked_at` | `timestamptz` | oui | — | — | — | — | — |
| `first_started_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `best_score` | `numeric(5,2)` | non | `0` | — | — | — | — |
| `best_stars` | `smallint` | non | `0` | — | — | — | — |
| `attempt_count` | `integer` | non | `0` | — | — | — | — |
| `successful_attempt_count` | `integer` | non | `0` | — | — | — | — |
| `total_time_seconds` | `bigint` | non | `0` | — | — | — | — |
| `last_attempt_at` | `timestamptz` | oui | — | — | — | — | — |
| `current_lesson_version_id` | `uuid` | oui | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, lesson_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `lesson_id -> learning.lessons.id ON DELETE CASCADE`; `current_lesson_version_id -> learning.lesson_versions.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT lesson_progress_score_ck CHECK (best_score BETWEEN 0 AND 100)`; `CONSTRAINT lesson_progress_stars_ck CHECK (best_stars BETWEEN 0 AND 3)`; `CONSTRAINT lesson_progress_attempts_ck CHECK ( attempt_count >= 0 AND successful_attempt_count >= 0 AND successful_attempt_count <= attempt_count )`; `CONSTRAINT lesson_progress_time_ck CHECK (total_time_seconds >= 0)`; `CONSTRAINT lesson_progress_dates_ck CHECK ( completed_at IS NULL OR first_started_at IS NULL OR completed_at >= first_started_at )`

**Index.** `lesson_progress_user_state_idx` ((user_id, state, updated_at DESC)); `lesson_progress_lesson_completion_idx` ((lesson_id, completed_at) WHERE completed_at IS NOT NULL); `idx_lesson_progress_current_lesson_version_id` ((current_lesson_version_id))

### `progress.path_progress`

**Description et justification.** Materialized user/path aggregate maintained transactionally after lesson completion.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `path_id` | `uuid` | non | — | — | — | `learning.paths.id` (N:1) | — |
| `state` | `core.mastery_state` | non | `'not_started'` | — | — | — | — |
| `unlocked_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_lessons` | `integer` | non | `0` | — | — | — | — |
| `total_lessons` | `integer` | non | `0` | — | — | — | — |
| `completion_percent` | `numeric(5,2)` | non | `0` | — | — | — | — |
| `earned_stars` | `integer` | non | `0` | — | — | — | — |
| `possible_stars` | `integer` | non | `0` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, path_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `path_id -> learning.paths.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT path_progress_counts_ck CHECK ( completed_lessons >= 0 AND total_lessons >= completed_lessons )`; `CONSTRAINT path_progress_percent_ck CHECK (completion_percent BETWEEN 0 AND 100)`; `CONSTRAINT path_progress_stars_ck CHECK ( earned_stars >= 0 AND possible_stars >= earned_stars )`

**Index.** `path_progress_user_state_idx` ((user_id, state, updated_at DESC)); `idx_path_progress_path_id` ((path_id))

### `progress.block_progress`

**Description et justification.** Materialized user/block aggregate for fast global curriculum navigation.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `block_id` | `uuid` | non | — | — | — | `learning.blocks.id` (N:1) | — |
| `state` | `core.mastery_state` | non | `'not_started'` | — | — | — | — |
| `unlocked_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_paths` | `integer` | non | `0` | — | — | — | — |
| `total_paths` | `integer` | non | `0` | — | — | — | — |
| `completion_percent` | `numeric(5,2)` | non | `0` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, block_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `block_id -> learning.blocks.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT block_progress_counts_ck CHECK ( completed_paths >= 0 AND total_paths >= completed_paths )`; `CONSTRAINT block_progress_percent_ck CHECK (completion_percent BETWEEN 0 AND 100)`

**Index.** `block_progress_user_state_idx` ((user_id, state, updated_at DESC)); `idx_block_progress_block_id` ((block_id))

### `progress.completion_records`

**Description et justification.** Append-only proof of every successful or failed content validation event.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `content_kind` | `core.content_kind` | non | — | — | — | — | — |
| `lesson_id` | `uuid` | oui | — | — | — | `learning.lessons.id` (N:1) | — |
| `path_id` | `uuid` | oui | — | — | — | `learning.paths.id` (N:1) | — |
| `block_id` | `uuid` | oui | — | — | — | `learning.blocks.id` (N:1) | — |
| `score` | `numeric(5,2)` | non | — | — | — | — | — |
| `stars` | `smallint` | non | `0` | — | — | — | — |
| `passed` | `boolean` | non | — | — | — | — | — |
| `completed_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `evidence` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `lesson_id -> learning.lessons.id ON DELETE SET NULL`; `path_id -> learning.paths.id ON DELETE SET NULL`; `block_id -> learning.blocks.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT completion_records_target_ck CHECK ( num_nonnulls(lesson_id, path_id, block_id) = 1 )`; `CONSTRAINT completion_records_score_ck CHECK (score BETWEEN 0 AND 100)`; `CONSTRAINT completion_records_stars_ck CHECK (stars BETWEEN 0 AND 3)`; `CONSTRAINT completion_records_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')`

**Index.** `completion_records_user_time_idx` ((user_id, completed_at DESC)); `completion_records_lesson_idx` ((lesson_id, completed_at DESC) WHERE lesson_id IS NOT NULL); `idx_completion_records_path_id` ((path_id)); `idx_completion_records_block_id` ((block_id))

### `progress.lesson_attempts`

**Description et justification.** Immutable attempt envelope pinned to exact lesson and exercise versions with an idempotent mobile ID.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `client_attempt_id` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `enrollment_id` | `uuid` | oui | — | — | — | `progress.enrollments.id` (N:1) | — |
| `lesson_id` | `uuid` | non | — | — | — | `learning.lessons.id` (N:1) | — |
| `lesson_version_id` | `uuid` | non | — | — | — | `learning.lesson_versions.id` (N:1) | — |
| `exercise_version_id` | `uuid` | oui | — | — | — | `practice.exercise_versions.id` (N:1) | — |
| `status` | `core.attempt_status` | non | `'started'` | — | — | — | — |
| `randomization_seed` | `bigint` | non | — | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `submitted_at` | `timestamptz` | oui | — | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `score` | `numeric(7,4)` | oui | — | — | — | — | — |
| `accuracy` | `numeric(5,2)` | oui | — | — | — | — | — |
| `stars` | `smallint` | oui | — | — | — | — | — |
| `xp_awarded` | `integer` | non | `0` | — | — | — | — |
| `duration_seconds` | `integer` | oui | — | — | — | — | — |
| `app_version` | `text` | oui | — | — | — | — | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `enrollment_id -> progress.enrollments.id ON DELETE SET NULL`; `lesson_id -> learning.lessons.id ON DELETE RESTRICT`; `lesson_version_id -> learning.lesson_versions.id ON DELETE RESTRICT`; `exercise_version_id -> practice.exercise_versions.id ON DELETE SET NULL`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (user_id, client_attempt_id)`

**Checks.** `CONSTRAINT lesson_attempts_score_ck CHECK (score IS NULL OR score >= 0)`; `CONSTRAINT lesson_attempts_accuracy_ck CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 100)`; `CONSTRAINT lesson_attempts_stars_ck CHECK (stars IS NULL OR stars BETWEEN 0 AND 3)`; `CONSTRAINT lesson_attempts_xp_ck CHECK (xp_awarded >= 0)`; `CONSTRAINT lesson_attempts_duration_ck CHECK (duration_seconds IS NULL OR duration_seconds >= 0)`; `CONSTRAINT lesson_attempts_dates_ck CHECK ( (submitted_at IS NULL OR submitted_at >= started_at) AND (completed_at IS NULL OR completed_at >= started_at) )`; `CONSTRAINT lesson_attempts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `lesson_attempts_user_time_idx` ((user_id, started_at DESC)); `lesson_attempts_lesson_status_idx` ((lesson_id, status, started_at DESC)); `lesson_attempts_open_idx` ((user_id, started_at DESC) WHERE status IN ('started', 'paused')); `idx_lesson_attempts_enrollment_id` ((enrollment_id)); `idx_lesson_attempts_lesson_version_id` ((lesson_version_id)); `idx_lesson_attempts_exercise_version_id` ((exercise_version_id)); `idx_lesson_attempts_device_id` ((device_id))

### `progress.exercise_attempts`

**Description et justification.** Per-activity result within a lesson attempt, retained for granular replay and analytics.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `lesson_attempt_id` | `uuid` | non | — | — | — | `progress.lesson_attempts.id` (N:1) | — |
| `exercise_version_id` | `uuid` | non | — | — | — | `practice.exercise_versions.id` (N:1) | — |
| `position` | `integer` | non | — | — | — | — | — |
| `status` | `core.attempt_status` | non | `'started'` | — | — | — | — |
| `started_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `completed_at` | `timestamptz` | oui | — | — | — | — | — |
| `score` | `numeric(7,4)` | oui | — | — | — | — | — |
| `max_score` | `numeric(7,4)` | oui | — | — | — | — | — |
| `duration_ms` | `integer` | oui | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `lesson_attempt_id -> progress.lesson_attempts.id ON DELETE CASCADE`; `exercise_version_id -> practice.exercise_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (lesson_attempt_id, position)`

**Checks.** `CONSTRAINT exercise_attempts_position_ck CHECK (position > 0)`; `CONSTRAINT exercise_attempts_score_ck CHECK ( (score IS NULL OR score >= 0) AND (max_score IS NULL OR max_score >= 0) AND (score IS NULL OR max_score IS NULL OR score <= max_score) )`; `CONSTRAINT exercise_attempts_duration_ck CHECK (duration_ms IS NULL OR duration_ms >= 0)`

**Index.** `exercise_attempts_lesson_idx` ((lesson_attempt_id, position)); `idx_exercise_attempts_exercise_version_id` ((exercise_version_id))

### `progress.question_attempts`

**Description et justification.** Append-only answer event preserving visual order, stable answer payload, correction and latency.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `client_response_id` | `uuid` | non | — | — | — | — | — |
| `exercise_attempt_id` | `uuid` | non | — | — | — | `progress.exercise_attempts.id` (N:1) | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `question_version_id` | `uuid` | non | — | — | — | `practice.question_versions.id` (N:1) | — |
| `presented_choice_order` | `uuid[]` | non | `ARRAY[]::uuid[]` | — | — | — | — |
| `response_payload` | `jsonb` | non | — | — | — | — | — |
| `is_correct` | `boolean` | non | — | — | — | — | — |
| `score` | `numeric(7,4)` | non | `0` | — | — | — | — |
| `max_score` | `numeric(7,4)` | non | `1` | — | — | — | — |
| `response_time_ms` | `integer` | non | — | — | — | — | — |
| `hint_count` | `integer` | non | `0` | — | — | — | — |
| `answered_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `exercise_attempt_id -> progress.exercise_attempts.id ON DELETE CASCADE`; `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `question_version_id -> practice.question_versions.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (user_id, client_response_id)`

**Checks.** `CONSTRAINT question_attempts_score_ck CHECK ( score >= 0 AND max_score > 0 AND score <= max_score )`; `CONSTRAINT question_attempts_duration_ck CHECK (response_time_ms >= 0)`; `CONSTRAINT question_attempts_hint_ck CHECK (hint_count >= 0)`; `CONSTRAINT question_attempts_response_ck CHECK ( jsonb_typeof(response_payload) IN ('object', 'array', 'string', 'number', 'boolean') )`; `CONSTRAINT question_attempts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `question_attempts_user_time_idx` ((user_id, answered_at DESC)); `question_attempts_question_result_idx` ((question_version_id, is_correct, answered_at DESC)); `question_attempts_response_gin` (USING gin (response_payload jsonb_path_ops)); `idx_question_attempts_exercise_attempt_id` ((exercise_attempt_id))

### `progress.selected_choices`

**Description et justification.** Normalized selected option IDs for choice-based responses; response_payload covers non-choice types.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `question_attempt_id` | `uuid` | non | — | — | — | `progress.question_attempts.id` (N:1) | — |
| `choice_id` | `uuid` | non | — | — | — | `practice.choices.id` (N:1) | — |
| `selection_order` | `integer` | non | `1` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (question_attempt_id, choice_id)`

**Relations.** `question_attempt_id -> progress.question_attempts.id ON DELETE CASCADE`; `choice_id -> practice.choices.id ON DELETE RESTRICT`

**Contraintes uniques.** `UNIQUE (question_attempt_id, selection_order)`

**Checks.** `CONSTRAINT selected_choices_order_ck CHECK (selection_order > 0)`

**Index.** `idx_selected_choices_choice_id` ((choice_id))

### `progress.mistakes`

**Description et justification.** Auditable error history feeding remediation, SRS and adaptive learning.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `question_attempt_id` | `uuid` | non | — | — | oui | `progress.question_attempts.id` (1:0..1) | — |
| `question_id` | `uuid` | non | — | — | — | `practice.questions.id` (N:1) | — |
| `mistake_kind` | `text` | non | — | — | — | — | — |
| `competency_ids` | `uuid[]` | non | `ARRAY[]::uuid[]` | — | — | — | — |
| `first_seen_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `resolved_at` | `timestamptz` | oui | — | — | — | — | — |
| `recurrence_count` | `integer` | non | `1` | — | — | — | — |
| `metadata` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `question_attempt_id -> progress.question_attempts.id ON DELETE CASCADE`; `question_id -> practice.questions.id ON DELETE RESTRICT`

**Contraintes uniques.** `question_attempt_id`

**Checks.** `CONSTRAINT mistakes_kind_ck CHECK ( mistake_kind IN ('knowledge', 'priority', 'timing', 'regulatory', 'calculation', 'inattention', 'unknown') )`; `CONSTRAINT mistakes_recurrence_ck CHECK (recurrence_count > 0)`; `CONSTRAINT mistakes_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')`

**Index.** `mistakes_user_unresolved_idx` ((user_id, first_seen_at DESC) WHERE resolved_at IS NULL); `mistakes_competencies_gin` (USING gin (competency_ids)); `idx_mistakes_question_id` ((question_id))

### `progress.competency_mastery`

**Description et justification.** Current per-user competency estimate, derived from immutable evidence and never client-authored.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `state` | `core.mastery_state` | non | `'not_started'` | — | — | — | — |
| `mastery_score` | `numeric(5,2)` | non | `0` | — | — | — | — |
| `confidence` | `numeric(5,4)` | non | `0` | — | — | — | — |
| `evidence_count` | `integer` | non | `0` | — | — | — | — |
| `successful_evidence_count` | `integer` | non | `0` | — | — | — | — |
| `last_evidence_at` | `timestamptz` | oui | — | — | — | — | — |
| `mastered_at` | `timestamptz` | oui | — | — | — | — | — |
| `next_review_at` | `timestamptz` | oui | — | — | — | — | — |
| `algorithm_version` | `text` | non | `'mastery-v1'` | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, competency_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT competency_mastery_score_ck CHECK (mastery_score BETWEEN 0 AND 100)`; `CONSTRAINT competency_mastery_confidence_ck CHECK (confidence BETWEEN 0 AND 1)`; `CONSTRAINT competency_mastery_counts_ck CHECK ( evidence_count >= 0 AND successful_evidence_count >= 0 AND successful_evidence_count <= evidence_count )`

**Index.** `competency_mastery_user_review_idx` ((user_id, next_review_at) WHERE next_review_at IS NOT NULL); `competency_mastery_competency_idx` ((competency_id, state, mastery_score))

### `progress.mastery_history`

**Description et justification.** Append-only learning curve and algorithm audit trail for every mastery transition.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `competency_id` | `uuid` | non | — | — | — | `knowledge.competencies.id` (N:1) | — |
| `question_attempt_id` | `uuid` | oui | — | — | — | `progress.question_attempts.id` (N:1) | — |
| `previous_score` | `numeric(5,2)` | non | — | — | — | — | — |
| `new_score` | `numeric(5,2)` | non | — | — | — | — | — |
| `evidence_weight` | `numeric(6,5)` | non | — | — | — | — | — |
| `algorithm_version` | `text` | non | — | — | — | — | — |
| `occurred_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `competency_id -> knowledge.competencies.id ON DELETE CASCADE`; `question_attempt_id -> progress.question_attempts.id ON DELETE SET NULL`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT mastery_history_scores_ck CHECK ( previous_score BETWEEN 0 AND 100 AND new_score BETWEEN 0 AND 100 )`; `CONSTRAINT mastery_history_weight_ck CHECK (evidence_weight > 0 AND evidence_weight <= 1)`

**Index.** `mastery_history_user_competency_idx` ((user_id, competency_id, occurred_at DESC)); `idx_mastery_history_competency_id` ((competency_id)); `idx_mastery_history_question_attempt_id` ((question_attempt_id))

### `progress.streak_days`

**Description et justification.** Per-local-day evidence used to calculate streaks consistently across devices and time zones.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `study_date` | `date` | non | — | — | — | — | — |
| `xp_earned` | `integer` | non | `0` | — | — | — | — |
| `qualifying_activity_count` | `integer` | non | `0` | — | — | — | — |
| `frozen` | `boolean` | non | `false` | — | — | — | — |
| `timezone` | `text` | non | — | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, study_date)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT streak_days_xp_ck CHECK (xp_earned >= 0)`; `CONSTRAINT streak_days_activity_ck CHECK (qualifying_activity_count >= 0)`

**Index.** `streak_days_user_date_idx` ((user_id, study_date DESC))

### `progress.srs_profiles`

**Description et justification.** Per-user spaced-repetition algorithm and calibrated parameters.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | oui | — | `iam.user_accounts.user_id` (1:0..1) | — |
| `algorithm` | `text` | non | `'fsrs'` | — | — | — | — |
| `algorithm_version` | `text` | non | `'1'` | — | — | — | — |
| `desired_retention` | `numeric(5,4)` | non | `0.90` | — | — | — | — |
| `parameters` | `jsonb` | non | `'{}'::jsonb` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `user_id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT srs_profiles_retention_ck CHECK (desired_retention > 0 AND desired_retention < 1)`; `CONSTRAINT srs_profiles_parameters_ck CHECK (jsonb_typeof(parameters) = 'object')`

**Index.** Clé primaire / uniques uniquement.

### `progress.review_items`

**Description et justification.** Current FSRS-compatible scheduling state for one user and flashcard.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `flashcard_id` | `uuid` | non | — | — | — | `practice.flashcards.id` (N:1) | — |
| `state` | `text` | non | `'new'` | — | — | — | — |
| `stability` | `numeric` | non | `0` | — | — | — | — |
| `difficulty` | `numeric` | non | `0` | — | — | — | — |
| `interval_days` | `numeric` | non | `0` | — | — | — | — |
| `due_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `last_reviewed_at` | `timestamptz` | oui | — | — | — | — | — |
| `review_count` | `integer` | non | `0` | — | — | — | — |
| `lapse_count` | `integer` | non | `0` | — | — | — | — |
| `suspended_at` | `timestamptz` | oui | — | — | — | — | — |
| `server_revision` | `bigint` | non | `0` | — | — | — | — |
| `updated_at` | `timestamptz` | non | `now()` | — | — | — | — |

**Clé primaire.** `PRIMARY KEY (user_id, flashcard_id)`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `flashcard_id -> practice.flashcards.id ON DELETE CASCADE`

**Contraintes uniques.** Aucune au-delà de la clé primaire.

**Checks.** `CONSTRAINT review_items_state_ck CHECK ( state IN ('new', 'learning', 'review', 'relearning') )`; `CONSTRAINT review_items_values_ck CHECK ( stability >= 0 AND difficulty >= 0 AND interval_days >= 0 AND review_count >= 0 AND lapse_count >= 0 )`

**Index.** `review_items_due_idx` ((user_id, due_at) WHERE suspended_at IS NULL); `idx_review_items_flashcard_id` ((flashcard_id))

### `progress.review_events`

**Description et justification.** Append-only SRS history enabling recalculation after algorithm upgrades.

**Définition SQL.** [40_progress_srs.sql](../../supabase/architecture/v1/40_progress_srs.sql)

| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |
|---|---|:---:|---|:---:|:---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | oui | — | — | — |
| `client_event_id` | `uuid` | non | — | — | — | — | — |
| `user_id` | `uuid` | non | — | — | — | `iam.user_accounts.user_id` (N:1) | — |
| `flashcard_id` | `uuid` | non | — | — | — | `practice.flashcards.id` (N:1) | — |
| `rating` | `smallint` | non | — | — | — | — | — |
| `previous_state` | `jsonb` | non | — | — | — | — | — |
| `resulting_state` | `jsonb` | non | — | — | — | — | — |
| `response_time_ms` | `integer` | non | — | — | — | — | — |
| `reviewed_at` | `timestamptz` | non | `now()` | — | — | — | — |
| `device_id` | `uuid` | oui | — | — | — | `iam.user_devices.id` (N:1) | — |
| `algorithm_version` | `text` | non | — | — | — | — | — |

**Clé primaire.** `id`

**Relations.** `user_id -> iam.user_accounts.user_id ON DELETE CASCADE`; `flashcard_id -> practice.flashcards.id ON DELETE RESTRICT`; `device_id -> iam.user_devices.id ON DELETE SET NULL`

**Contraintes uniques.** `UNIQUE (user_id, client_event_id)`

**Checks.** `CONSTRAINT review_events_rating_ck CHECK (rating BETWEEN 1 AND 4)`; `CONSTRAINT review_events_time_ck CHECK (response_time_ms >= 0)`; `CONSTRAINT review_events_previous_ck CHECK (jsonb_typeof(previous_state) = 'object')`; `CONSTRAINT review_events_resulting_ck CHECK (jsonb_typeof(resulting_state) = 'object')`

**Index.** `review_events_user_time_idx` ((user_id, reviewed_at DESC)); `review_events_flashcard_idx` ((flashcard_id, reviewed_at DESC)); `idx_review_events_device_id` ((device_id))

## Partitions physiques

- `analytics.learning_events_default` : partition par défaut de `analytics.learning_events`.
- `governance.audit_log_default` : partition par défaut de `governance.audit_log`.


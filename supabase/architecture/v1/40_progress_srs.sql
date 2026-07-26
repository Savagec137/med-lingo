-- Enrolment, progression, attempts, mistakes, mastery and spaced repetition.

CREATE TABLE progress.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES learning.formations(id) ON DELETE RESTRICT,
  formation_version_id uuid NOT NULL REFERENCES learning.formation_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, formation_id),
  CONSTRAINT enrollments_status_ck CHECK (status IN ('active', 'paused', 'completed', 'withdrawn')),
  CONSTRAINT enrollments_completion_ck CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed'
  ),
  CONSTRAINT enrollments_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE progress.enrollments IS
  'User registration in one immutable formation version; anchors all curriculum progress.';
CREATE INDEX enrollments_user_status_idx
  ON progress.enrollments (user_id, status, last_activity_at DESC NULLS LAST);

CREATE TABLE progress.user_learning_state (
  user_id uuid PRIMARY KEY REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  total_xp bigint NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  hearts integer NOT NULL DEFAULT 5,
  max_hearts integer NOT NULL DEFAULT 5,
  hearts_updated_at timestamptz NOT NULL DEFAULT now(),
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_study_date date,
  daily_xp integer NOT NULL DEFAULT 0,
  daily_xp_date date NOT NULL DEFAULT current_date,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_learning_state_xp_ck CHECK (total_xp >= 0 AND daily_xp >= 0),
  CONSTRAINT user_learning_state_level_ck CHECK (current_level > 0),
  CONSTRAINT user_learning_state_hearts_ck CHECK (
    hearts >= 0 AND max_hearts > 0 AND hearts <= max_hearts
  ),
  CONSTRAINT user_learning_state_streak_ck CHECK (
    current_streak >= 0 AND longest_streak >= current_streak
  )
);
COMMENT ON TABLE progress.user_learning_state IS
  'Server-authoritative, frequently read aggregate for XP, level, hearts and streak.';

CREATE TABLE progress.lesson_progress (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
  state core.mastery_state NOT NULL DEFAULT 'not_started',
  unlocked_at timestamptz,
  first_started_at timestamptz,
  completed_at timestamptz,
  best_score numeric(5,2) NOT NULL DEFAULT 0,
  best_stars smallint NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  successful_attempt_count integer NOT NULL DEFAULT 0,
  total_time_seconds bigint NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  current_lesson_version_id uuid REFERENCES learning.lesson_versions(id) ON DELETE SET NULL,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id),
  CONSTRAINT lesson_progress_score_ck CHECK (best_score BETWEEN 0 AND 100),
  CONSTRAINT lesson_progress_stars_ck CHECK (best_stars BETWEEN 0 AND 3),
  CONSTRAINT lesson_progress_attempts_ck CHECK (
    attempt_count >= 0
    AND successful_attempt_count >= 0
    AND successful_attempt_count <= attempt_count
  ),
  CONSTRAINT lesson_progress_time_ck CHECK (total_time_seconds >= 0),
  CONSTRAINT lesson_progress_dates_ck CHECK (
    completed_at IS NULL OR first_started_at IS NULL OR completed_at >= first_started_at
  )
);
COMMENT ON TABLE progress.lesson_progress IS
  'One compact current-state row per user and stable lesson for fast roadmap rendering.';
CREATE INDEX lesson_progress_user_state_idx
  ON progress.lesson_progress (user_id, state, updated_at DESC);
CREATE INDEX lesson_progress_lesson_completion_idx
  ON progress.lesson_progress (lesson_id, completed_at)
  WHERE completed_at IS NOT NULL;

CREATE TABLE progress.path_progress (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES learning.paths(id) ON DELETE CASCADE,
  state core.mastery_state NOT NULL DEFAULT 'not_started',
  unlocked_at timestamptz,
  completed_at timestamptz,
  completed_lessons integer NOT NULL DEFAULT 0,
  total_lessons integer NOT NULL DEFAULT 0,
  completion_percent numeric(5,2) NOT NULL DEFAULT 0,
  earned_stars integer NOT NULL DEFAULT 0,
  possible_stars integer NOT NULL DEFAULT 0,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, path_id),
  CONSTRAINT path_progress_counts_ck CHECK (
    completed_lessons >= 0 AND total_lessons >= completed_lessons
  ),
  CONSTRAINT path_progress_percent_ck CHECK (completion_percent BETWEEN 0 AND 100),
  CONSTRAINT path_progress_stars_ck CHECK (
    earned_stars >= 0 AND possible_stars >= earned_stars
  )
);
COMMENT ON TABLE progress.path_progress IS
  'Materialized user/path aggregate maintained transactionally after lesson completion.';
CREATE INDEX path_progress_user_state_idx
  ON progress.path_progress (user_id, state, updated_at DESC);

CREATE TABLE progress.block_progress (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES learning.blocks(id) ON DELETE CASCADE,
  state core.mastery_state NOT NULL DEFAULT 'not_started',
  unlocked_at timestamptz,
  completed_at timestamptz,
  completed_paths integer NOT NULL DEFAULT 0,
  total_paths integer NOT NULL DEFAULT 0,
  completion_percent numeric(5,2) NOT NULL DEFAULT 0,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, block_id),
  CONSTRAINT block_progress_counts_ck CHECK (
    completed_paths >= 0 AND total_paths >= completed_paths
  ),
  CONSTRAINT block_progress_percent_ck CHECK (completion_percent BETWEEN 0 AND 100)
);
COMMENT ON TABLE progress.block_progress IS
  'Materialized user/block aggregate for fast global curriculum navigation.';
CREATE INDEX block_progress_user_state_idx
  ON progress.block_progress (user_id, state, updated_at DESC);

CREATE TABLE progress.completion_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  content_kind core.content_kind NOT NULL,
  lesson_id uuid REFERENCES learning.lessons(id) ON DELETE SET NULL,
  path_id uuid REFERENCES learning.paths(id) ON DELETE SET NULL,
  block_id uuid REFERENCES learning.blocks(id) ON DELETE SET NULL,
  score numeric(5,2) NOT NULL,
  stars smallint NOT NULL DEFAULT 0,
  passed boolean NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT completion_records_target_ck CHECK (
    num_nonnulls(lesson_id, path_id, block_id) = 1
  ),
  CONSTRAINT completion_records_score_ck CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT completion_records_stars_ck CHECK (stars BETWEEN 0 AND 3),
  CONSTRAINT completion_records_evidence_ck CHECK (jsonb_typeof(evidence) = 'object')
);
COMMENT ON TABLE progress.completion_records IS
  'Append-only proof of every successful or failed content validation event.';
CREATE INDEX completion_records_user_time_idx
  ON progress.completion_records (user_id, completed_at DESC);
CREATE INDEX completion_records_lesson_idx
  ON progress.completion_records (lesson_id, completed_at DESC)
  WHERE lesson_id IS NOT NULL;

CREATE TABLE progress.lesson_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_attempt_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES progress.enrollments(id) ON DELETE SET NULL,
  lesson_id uuid NOT NULL REFERENCES learning.lessons(id) ON DELETE RESTRICT,
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE RESTRICT,
  exercise_version_id uuid REFERENCES practice.exercise_versions(id) ON DELETE SET NULL,
  status core.attempt_status NOT NULL DEFAULT 'started',
  randomization_seed bigint NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  score numeric(7,4),
  accuracy numeric(5,2),
  stars smallint,
  xp_awarded integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  app_version text,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, client_attempt_id),
  CONSTRAINT lesson_attempts_score_ck CHECK (score IS NULL OR score >= 0),
  CONSTRAINT lesson_attempts_accuracy_ck CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 100),
  CONSTRAINT lesson_attempts_stars_ck CHECK (stars IS NULL OR stars BETWEEN 0 AND 3),
  CONSTRAINT lesson_attempts_xp_ck CHECK (xp_awarded >= 0),
  CONSTRAINT lesson_attempts_duration_ck CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT lesson_attempts_dates_ck CHECK (
    (submitted_at IS NULL OR submitted_at >= started_at)
    AND (completed_at IS NULL OR completed_at >= started_at)
  ),
  CONSTRAINT lesson_attempts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE progress.lesson_attempts IS
  'Immutable attempt envelope pinned to exact lesson and exercise versions with an idempotent mobile ID.';
CREATE INDEX lesson_attempts_user_time_idx
  ON progress.lesson_attempts (user_id, started_at DESC);
CREATE INDEX lesson_attempts_lesson_status_idx
  ON progress.lesson_attempts (lesson_id, status, started_at DESC);
CREATE INDEX lesson_attempts_open_idx
  ON progress.lesson_attempts (user_id, started_at DESC)
  WHERE status IN ('started', 'paused');

CREATE TABLE progress.exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_attempt_id uuid NOT NULL REFERENCES progress.lesson_attempts(id) ON DELETE CASCADE,
  exercise_version_id uuid NOT NULL REFERENCES practice.exercise_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  status core.attempt_status NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score numeric(7,4),
  max_score numeric(7,4),
  duration_ms integer,
  UNIQUE (lesson_attempt_id, position),
  CONSTRAINT exercise_attempts_position_ck CHECK (position > 0),
  CONSTRAINT exercise_attempts_score_ck CHECK (
    (score IS NULL OR score >= 0)
    AND (max_score IS NULL OR max_score >= 0)
    AND (score IS NULL OR max_score IS NULL OR score <= max_score)
  ),
  CONSTRAINT exercise_attempts_duration_ck CHECK (duration_ms IS NULL OR duration_ms >= 0)
);
COMMENT ON TABLE progress.exercise_attempts IS
  'Per-activity result within a lesson attempt, retained for granular replay and analytics.';
CREATE INDEX exercise_attempts_lesson_idx
  ON progress.exercise_attempts (lesson_attempt_id, position);

CREATE TABLE progress.question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_response_id uuid NOT NULL,
  exercise_attempt_id uuid NOT NULL REFERENCES progress.exercise_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE RESTRICT,
  presented_choice_order uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  response_payload jsonb NOT NULL,
  is_correct boolean NOT NULL,
  score numeric(7,4) NOT NULL DEFAULT 0,
  max_score numeric(7,4) NOT NULL DEFAULT 1,
  response_time_ms integer NOT NULL,
  hint_count integer NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, client_response_id),
  CONSTRAINT question_attempts_score_ck CHECK (
    score >= 0 AND max_score > 0 AND score <= max_score
  ),
  CONSTRAINT question_attempts_duration_ck CHECK (response_time_ms >= 0),
  CONSTRAINT question_attempts_hint_ck CHECK (hint_count >= 0),
  CONSTRAINT question_attempts_response_ck CHECK (
    jsonb_typeof(response_payload) IN ('object', 'array', 'string', 'number', 'boolean')
  ),
  CONSTRAINT question_attempts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE progress.question_attempts IS
  'Append-only answer event preserving visual order, stable answer payload, correction and latency.';
CREATE INDEX question_attempts_user_time_idx
  ON progress.question_attempts (user_id, answered_at DESC);
CREATE INDEX question_attempts_question_result_idx
  ON progress.question_attempts (question_version_id, is_correct, answered_at DESC);
CREATE INDEX question_attempts_response_gin
  ON progress.question_attempts USING gin (response_payload jsonb_path_ops);

CREATE TABLE progress.selected_choices (
  question_attempt_id uuid NOT NULL REFERENCES progress.question_attempts(id) ON DELETE CASCADE,
  choice_id uuid NOT NULL REFERENCES practice.choices(id) ON DELETE RESTRICT,
  selection_order integer NOT NULL DEFAULT 1,
  PRIMARY KEY (question_attempt_id, choice_id),
  UNIQUE (question_attempt_id, selection_order),
  CONSTRAINT selected_choices_order_ck CHECK (selection_order > 0)
);
COMMENT ON TABLE progress.selected_choices IS
  'Normalized selected option IDs for choice-based responses; response_payload covers non-choice types.';

CREATE TABLE progress.mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  question_attempt_id uuid NOT NULL UNIQUE REFERENCES progress.question_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES practice.questions(id) ON DELETE RESTRICT,
  mistake_kind text NOT NULL,
  competency_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  recurrence_count integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT mistakes_kind_ck CHECK (
    mistake_kind IN ('knowledge', 'priority', 'timing', 'regulatory', 'calculation', 'inattention', 'unknown')
  ),
  CONSTRAINT mistakes_recurrence_ck CHECK (recurrence_count > 0),
  CONSTRAINT mistakes_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE progress.mistakes IS
  'Auditable error history feeding remediation, SRS and adaptive learning.';
CREATE INDEX mistakes_user_unresolved_idx
  ON progress.mistakes (user_id, first_seen_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX mistakes_competencies_gin
  ON progress.mistakes USING gin (competency_ids);

CREATE TABLE progress.competency_mastery (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE CASCADE,
  state core.mastery_state NOT NULL DEFAULT 'not_started',
  mastery_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  successful_evidence_count integer NOT NULL DEFAULT 0,
  last_evidence_at timestamptz,
  mastered_at timestamptz,
  next_review_at timestamptz,
  algorithm_version text NOT NULL DEFAULT 'mastery-v1',
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, competency_id),
  CONSTRAINT competency_mastery_score_ck CHECK (mastery_score BETWEEN 0 AND 100),
  CONSTRAINT competency_mastery_confidence_ck CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT competency_mastery_counts_ck CHECK (
    evidence_count >= 0
    AND successful_evidence_count >= 0
    AND successful_evidence_count <= evidence_count
  )
);
COMMENT ON TABLE progress.competency_mastery IS
  'Current per-user competency estimate, derived from immutable evidence and never client-authored.';
CREATE INDEX competency_mastery_user_review_idx
  ON progress.competency_mastery (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;
CREATE INDEX competency_mastery_competency_idx
  ON progress.competency_mastery (competency_id, state, mastery_score);

CREATE TABLE progress.mastery_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE CASCADE,
  question_attempt_id uuid REFERENCES progress.question_attempts(id) ON DELETE SET NULL,
  previous_score numeric(5,2) NOT NULL,
  new_score numeric(5,2) NOT NULL,
  evidence_weight numeric(6,5) NOT NULL,
  algorithm_version text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mastery_history_scores_ck CHECK (
    previous_score BETWEEN 0 AND 100 AND new_score BETWEEN 0 AND 100
  ),
  CONSTRAINT mastery_history_weight_ck CHECK (evidence_weight > 0 AND evidence_weight <= 1)
);
COMMENT ON TABLE progress.mastery_history IS
  'Append-only learning curve and algorithm audit trail for every mastery transition.';
CREATE INDEX mastery_history_user_competency_idx
  ON progress.mastery_history (user_id, competency_id, occurred_at DESC);

CREATE TABLE progress.streak_days (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  study_date date NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  qualifying_activity_count integer NOT NULL DEFAULT 0,
  frozen boolean NOT NULL DEFAULT false,
  timezone text NOT NULL,
  PRIMARY KEY (user_id, study_date),
  CONSTRAINT streak_days_xp_ck CHECK (xp_earned >= 0),
  CONSTRAINT streak_days_activity_ck CHECK (qualifying_activity_count >= 0)
);
COMMENT ON TABLE progress.streak_days IS
  'Per-local-day evidence used to calculate streaks consistently across devices and time zones.';
CREATE INDEX streak_days_user_date_idx
  ON progress.streak_days (user_id, study_date DESC);

CREATE TABLE practice.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  question_version_id uuid REFERENCES practice.question_versions(id) ON DELETE SET NULL,
  concept_id uuid REFERENCES knowledge.medical_concepts(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flashcards_origin_ck CHECK (
    question_version_id IS NOT NULL OR concept_id IS NOT NULL
  )
);
COMMENT ON TABLE practice.flashcards IS
  'Reusable canonical review prompts linked to a question or medical concept.';

CREATE TABLE progress.srs_profiles (
  user_id uuid PRIMARY KEY REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  algorithm text NOT NULL DEFAULT 'fsrs',
  algorithm_version text NOT NULL DEFAULT '1',
  desired_retention numeric(5,4) NOT NULL DEFAULT 0.90,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srs_profiles_retention_ck CHECK (desired_retention > 0 AND desired_retention < 1),
  CONSTRAINT srs_profiles_parameters_ck CHECK (jsonb_typeof(parameters) = 'object')
);
COMMENT ON TABLE progress.srs_profiles IS
  'Per-user spaced-repetition algorithm and calibrated parameters.';

CREATE TABLE progress.review_items (
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES practice.flashcards(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'new',
  stability numeric NOT NULL DEFAULT 0,
  difficulty numeric NOT NULL DEFAULT 0,
  interval_days numeric NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  review_count integer NOT NULL DEFAULT 0,
  lapse_count integer NOT NULL DEFAULT 0,
  suspended_at timestamptz,
  server_revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flashcard_id),
  CONSTRAINT review_items_state_ck CHECK (
    state IN ('new', 'learning', 'review', 'relearning')
  ),
  CONSTRAINT review_items_values_ck CHECK (
    stability >= 0 AND difficulty >= 0 AND interval_days >= 0
    AND review_count >= 0 AND lapse_count >= 0
  )
);
COMMENT ON TABLE progress.review_items IS
  'Current FSRS-compatible scheduling state for one user and flashcard.';
CREATE INDEX review_items_due_idx
  ON progress.review_items (user_id, due_at)
  WHERE suspended_at IS NULL;

CREATE TABLE progress.review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES practice.flashcards(id) ON DELETE RESTRICT,
  rating smallint NOT NULL,
  previous_state jsonb NOT NULL,
  resulting_state jsonb NOT NULL,
  response_time_ms integer NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  algorithm_version text NOT NULL,
  UNIQUE (user_id, client_event_id),
  CONSTRAINT review_events_rating_ck CHECK (rating BETWEEN 1 AND 4),
  CONSTRAINT review_events_time_ck CHECK (response_time_ms >= 0),
  CONSTRAINT review_events_previous_ck CHECK (jsonb_typeof(previous_state) = 'object'),
  CONSTRAINT review_events_resulting_ck CHECK (jsonb_typeof(resulting_state) = 'object')
);
COMMENT ON TABLE progress.review_events IS
  'Append-only SRS history enabling recalculation after algorithm upgrades.';
CREATE INDEX review_events_user_time_idx
  ON progress.review_events (user_id, reviewed_at DESC);
CREATE INDEX review_events_flashcard_idx
  ON progress.review_events (flashcard_id, reviewed_at DESC);

CREATE TABLE clinical.case_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_attempt_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.user_accounts(user_id) ON DELETE CASCADE,
  case_version_id uuid NOT NULL REFERENCES clinical.case_versions(id) ON DELETE RESTRICT,
  status core.attempt_status NOT NULL DEFAULT 'started',
  patient_state jsonb NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  device_id uuid REFERENCES iam.user_devices(id) ON DELETE SET NULL,
  UNIQUE (user_id, client_attempt_id),
  CONSTRAINT case_attempts_state_ck CHECK (jsonb_typeof(patient_state) = 'object'),
  CONSTRAINT case_attempts_score_ck CHECK (score >= 0 AND max_score > 0 AND score <= max_score),
  CONSTRAINT case_attempts_time_ck CHECK (elapsed_seconds >= 0)
);
COMMENT ON TABLE clinical.case_attempts IS
  'Server-authoritative state of a user clinical-case run with idempotent mobile identity.';
CREATE INDEX case_attempts_user_time_idx
  ON clinical.case_attempts (user_id, started_at DESC);

CREATE TABLE clinical.case_step_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_attempt_id uuid NOT NULL REFERENCES clinical.case_attempts(id) ON DELETE CASCADE,
  case_step_id uuid NOT NULL REFERENCES clinical.case_steps(id) ON DELETE RESTRICT,
  decision_id uuid REFERENCES clinical.case_decisions(id) ON DELETE SET NULL,
  sequence_number integer NOT NULL,
  patient_state_before jsonb NOT NULL,
  patient_state_after jsonb NOT NULL,
  score_delta numeric NOT NULL DEFAULT 0,
  time_delta_seconds integer NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_attempt_id, sequence_number),
  CONSTRAINT case_step_events_sequence_ck CHECK (sequence_number > 0),
  CONSTRAINT case_step_events_before_ck CHECK (jsonb_typeof(patient_state_before) = 'object'),
  CONSTRAINT case_step_events_after_ck CHECK (jsonb_typeof(patient_state_after) = 'object')
);
COMMENT ON TABLE clinical.case_step_events IS
  'Append-only decision timeline used for scoring, debrief and replay.';

CREATE TABLE clinical.case_feedback (
  case_attempt_id uuid PRIMARY KEY REFERENCES clinical.case_attempts(id) ON DELETE CASCADE,
  strengths text[] NOT NULL DEFAULT ARRAY[]::text[],
  mistakes text[] NOT NULL DEFAULT ARRAY[]::text[],
  recommendations text[] NOT NULL DEFAULT ARRAY[]::text[],
  pulse_feedback text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_identifier text,
  reviewed boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE clinical.case_feedback IS
  'Structured end-of-case feedback, with optional Pulse-generated explanation kept auditable.';

CREATE TRIGGER user_learning_state_set_updated_at
BEFORE UPDATE ON progress.user_learning_state
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER lesson_progress_set_updated_at
BEFORE UPDATE ON progress.lesson_progress
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER path_progress_set_updated_at
BEFORE UPDATE ON progress.path_progress
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER block_progress_set_updated_at
BEFORE UPDATE ON progress.block_progress
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER competency_mastery_set_updated_at
BEFORE UPDATE ON progress.competency_mastery
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER srs_profiles_set_updated_at
BEFORE UPDATE ON progress.srs_profiles
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER review_items_set_updated_at
BEFORE UPDATE ON progress.review_items
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Pedagogical bank, extensible exercises, anatomy and clinical cases.

CREATE TABLE practice.question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  formation_id uuid REFERENCES learning.formations(id) ON DELETE CASCADE,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  selection_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_banks_selection_ck CHECK (jsonb_typeof(selection_defaults) = 'object')
);
COMMENT ON TABLE practice.question_banks IS
  'Reusable question pools shared by lessons, SRS, exams, Bosses, Pulse and Intervention.';
CREATE INDEX question_banks_formation_status_idx
  ON practice.question_banks (formation_id, status);

CREATE TABLE practice.lesson_question_banks (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  question_bank_id uuid NOT NULL REFERENCES practice.question_banks(id) ON DELETE RESTRICT,
  selection_weight numeric(6,5) NOT NULL DEFAULT 1,
  selection_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (lesson_version_id, question_bank_id),
  CONSTRAINT lesson_question_banks_weight_ck CHECK (selection_weight > 0 AND selection_weight <= 1),
  CONSTRAINT lesson_question_banks_config_ck CHECK (jsonb_typeof(selection_config) = 'object')
);
COMMENT ON TABLE practice.lesson_question_banks IS
  'Data-driven mapping from lesson versions to one or more reusable question pools.';

CREATE TABLE practice.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id uuid NOT NULL REFERENCES practice.question_banks(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  type core.exercise_type NOT NULL,
  current_version_id uuid,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_bank_id, stable_key)
);
COMMENT ON TABLE practice.questions IS
  'Stable identity and exercise type for one pedagogical question; wording lives in versions.';
CREATE INDEX questions_bank_type_status_idx
  ON practice.questions (question_bank_id, type, status);

CREATE TABLE practice.question_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES practice.questions(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  prompt text NOT NULL,
  instructions text,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  bloom_level text NOT NULL DEFAULT 'understand',
  estimated_seconds integer NOT NULL DEFAULT 30,
  scoring_config jsonb NOT NULL DEFAULT '{"maxScore":1}'::jsonb,
  renderer_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, version_number),
  CONSTRAINT question_versions_number_ck CHECK (version_number > 0),
  CONSTRAINT question_versions_bloom_ck CHECK (
    bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')
  ),
  CONSTRAINT question_versions_duration_ck CHECK (estimated_seconds BETWEEN 1 AND 7200),
  CONSTRAINT question_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object'),
  CONSTRAINT question_versions_renderer_ck CHECK (jsonb_typeof(renderer_config) = 'object'),
  CONSTRAINT question_versions_published_ck CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);
COMMENT ON TABLE practice.question_versions IS
  'Immutable wording, level and renderer configuration for a question version.';
CREATE INDEX question_versions_question_status_idx
  ON practice.question_versions (question_id, status, version_number DESC);
CREATE INDEX question_versions_renderer_gin
  ON practice.question_versions USING gin (renderer_config jsonb_path_ops);

ALTER TABLE practice.questions
  ADD CONSTRAINT questions_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES practice.question_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE practice.choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (question_version_id, stable_key),
  UNIQUE (question_version_id, position),
  CONSTRAINT choices_position_ck CHECK (position > 0),
  CONSTRAINT choices_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE practice.choices IS
  'Answer choices with stable IDs; visual position is never the source of truth.';
CREATE INDEX choices_question_idx
  ON practice.choices (question_version_id, position);

CREATE TABLE practice.answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  choice_id uuid REFERENCES practice.choices(id) ON DELETE CASCADE,
  accepted_payload jsonb,
  weight numeric(7,5) NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT answer_keys_target_ck CHECK (
    (choice_id IS NOT NULL AND accepted_payload IS NULL)
    OR (choice_id IS NULL AND accepted_payload IS NOT NULL)
  ),
  CONSTRAINT answer_keys_weight_ck CHECK (weight >= 0 AND weight <= 1),
  CONSTRAINT answer_keys_payload_ck CHECK (
    accepted_payload IS NULL OR jsonb_typeof(accepted_payload) IN ('object', 'array', 'string', 'number', 'boolean')
  )
);
COMMENT ON TABLE practice.answer_keys IS
  'Canonical corrections by stable choice ID or structured accepted payload; supports single and multiple answers.';
CREATE UNIQUE INDEX answer_keys_choice_uidx
  ON practice.answer_keys (question_version_id, choice_id)
  WHERE choice_id IS NOT NULL;
CREATE INDEX answer_keys_question_idx
  ON practice.answer_keys (question_version_id);

CREATE TABLE practice.explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  choice_id uuid REFERENCES practice.choices(id) ON DELETE CASCADE,
  explanation_kind text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  priority_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT explanations_kind_ck CHECK (
    explanation_kind IN ('general', 'correct', 'distractor', 'clinical', 'regulatory')
  )
);
COMMENT ON TABLE practice.explanations IS
  'General and choice-specific pedagogical feedback, including clinical or regulatory priority.';
CREATE UNIQUE INDEX explanations_scope_uidx
  ON practice.explanations (
    question_version_id,
    COALESCE(choice_id, '00000000-0000-0000-0000-000000000000'::uuid),
    explanation_kind
  );

CREATE TABLE practice.hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  position integer NOT NULL,
  content text NOT NULL,
  xp_penalty integer NOT NULL DEFAULT 0,
  unlock_after_seconds integer,
  UNIQUE (question_version_id, position),
  CONSTRAINT hints_position_ck CHECK (position > 0),
  CONSTRAINT hints_penalty_ck CHECK (xp_penalty >= 0),
  CONSTRAINT hints_unlock_ck CHECK (unlock_after_seconds IS NULL OR unlock_after_seconds >= 0)
);
COMMENT ON TABLE practice.hints IS
  'Ordered progressive hints with optional timing and XP cost.';

CREATE TABLE practice.question_competencies (
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE RESTRICT,
  weight numeric(6,5) NOT NULL DEFAULT 1,
  PRIMARY KEY (question_version_id, competency_id),
  CONSTRAINT question_competencies_weight_ck CHECK (weight > 0 AND weight <= 1)
);
COMMENT ON TABLE practice.question_competencies IS
  'Weighted competencies measured by an immutable question version.';
CREATE INDEX question_competencies_competency_idx
  ON practice.question_competencies (competency_id, question_version_id);

CREATE TABLE practice.question_sources (
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  source_section_id uuid NOT NULL REFERENCES knowledge.source_sections(id) ON DELETE RESTRICT,
  evidence_note text,
  PRIMARY KEY (question_version_id, source_section_id)
);
COMMENT ON TABLE practice.question_sources IS
  'Mandatory page- or article-level evidence for every source-backed question.';
CREATE INDEX question_sources_section_idx
  ON practice.question_sources (source_section_id, question_version_id);

CREATE TABLE practice.question_tags (
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES knowledge.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_version_id, tag_id)
);
COMMENT ON TABLE practice.question_tags IS
  'Normalized tags for search, adaptive selection and reuse across learning modes.';
CREATE INDEX question_tags_tag_idx
  ON practice.question_tags (tag_id, question_version_id);

CREATE TABLE practice.question_assets (
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE RESTRICT,
  usage text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (question_version_id, asset_id, usage),
  CONSTRAINT question_assets_position_ck CHECK (position > 0),
  CONSTRAINT question_assets_config_ck CHECK (jsonb_typeof(configuration) = 'object')
);
COMMENT ON TABLE practice.question_assets IS
  'Images, audio, video, Lottie or 3D media used by a question version.';

CREATE TABLE practice.matching_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  left_content text NOT NULL,
  right_content text NOT NULL,
  position integer NOT NULL,
  UNIQUE (question_version_id, stable_key),
  UNIQUE (question_version_id, position),
  CONSTRAINT matching_pairs_position_ck CHECK (position > 0)
);
COMMENT ON TABLE practice.matching_pairs IS
  'Normalized correct pairs for matching exercises; clients randomize both sides independently.';

CREATE TABLE practice.ordering_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  content text NOT NULL,
  correct_position integer NOT NULL,
  UNIQUE (question_version_id, stable_key),
  UNIQUE (question_version_id, correct_position),
  CONSTRAINT ordering_items_position_ck CHECK (correct_position > 0)
);
COMMENT ON TABLE practice.ordering_items IS
  'Stable items and canonical sequence for chronological and procedural ordering.';

CREATE TABLE practice.fill_blank_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  position integer NOT NULL,
  accepted_answers text[] NOT NULL,
  case_sensitive boolean NOT NULL DEFAULT false,
  accent_sensitive boolean NOT NULL DEFAULT false,
  UNIQUE (question_version_id, stable_key),
  UNIQUE (question_version_id, position),
  CONSTRAINT fill_blank_slots_position_ck CHECK (position > 0),
  CONSTRAINT fill_blank_slots_answers_ck CHECK (cardinality(accepted_answers) > 0)
);
COMMENT ON TABLE practice.fill_blank_slots IS
  'Normalized blank positions and accepted textual forms for fill-in exercises.';

CREATE TABLE practice.calculation_rules (
  question_version_id uuid PRIMARY KEY REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  expected_value numeric NOT NULL,
  tolerance numeric NOT NULL DEFAULT 0,
  unit text,
  rounding_scale integer,
  formula_reference text,
  CONSTRAINT calculation_rules_tolerance_ck CHECK (tolerance >= 0),
  CONSTRAINT calculation_rules_rounding_ck CHECK (
    rounding_scale IS NULL OR rounding_scale BETWEEN 0 AND 10
  )
);
COMMENT ON TABLE practice.calculation_rules IS
  'Server-side numeric correction rule for dosage, timing or other approved calculations.';

CREATE TABLE practice.exercise_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  kind core.content_kind NOT NULL DEFAULT 'lesson',
  current_version_id uuid,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE practice.exercise_definitions IS
  'Stable aggregate for a composed activity such as a lesson session, quiz, Boss or exam.';

CREATE TABLE practice.exercise_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES practice.exercise_definitions(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  instructions text,
  selection_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_limit_seconds integer,
  attempt_limit integer,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, version_number),
  CONSTRAINT exercise_versions_number_ck CHECK (version_number > 0),
  CONSTRAINT exercise_versions_selection_ck CHECK (jsonb_typeof(selection_config) = 'object'),
  CONSTRAINT exercise_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object'),
  CONSTRAINT exercise_versions_time_ck CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  CONSTRAINT exercise_versions_attempt_limit_ck CHECK (attempt_limit IS NULL OR attempt_limit > 0),
  CONSTRAINT exercise_versions_published_ck CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);
COMMENT ON TABLE practice.exercise_versions IS
  'Immutable composed-activity rules supporting deterministic retries and historical scoring.';

ALTER TABLE practice.exercise_definitions
  ADD CONSTRAINT exercise_definitions_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES practice.exercise_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE practice.exercise_questions (
  exercise_version_id uuid NOT NULL REFERENCES practice.exercise_versions(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE RESTRICT,
  position integer,
  weight numeric(7,5) NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT false,
  PRIMARY KEY (exercise_version_id, question_version_id),
  CONSTRAINT exercise_questions_position_ck CHECK (position IS NULL OR position > 0),
  CONSTRAINT exercise_questions_weight_ck CHECK (weight > 0)
);
COMMENT ON TABLE practice.exercise_questions IS
  'Optional fixed membership of an activity; selection_config can instead sample question banks.';
CREATE INDEX exercise_questions_question_idx
  ON practice.exercise_questions (question_version_id, exercise_version_id);

CREATE TABLE practice.lesson_exercises (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  exercise_version_id uuid NOT NULL REFERENCES practice.exercise_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  PRIMARY KEY (lesson_version_id, exercise_version_id),
  UNIQUE (lesson_version_id, position),
  CONSTRAINT lesson_exercises_position_ck CHECK (position > 0)
);
COMMENT ON TABLE practice.lesson_exercises IS
  'Ordered activities attached to a lesson version; no pedagogical text is hard-coded in React.';

CREATE TABLE anatomy.body_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL UNIQUE REFERENCES knowledge.medical_concepts(id) ON DELETE RESTRICT,
  stable_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft'
);
COMMENT ON TABLE anatomy.body_systems IS
  'Canonical anatomical systems linked to the shared medical concept graph.';

CREATE TABLE anatomy.structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL UNIQUE REFERENCES knowledge.medical_concepts(id) ON DELETE RESTRICT,
  body_system_id uuid REFERENCES anatomy.body_systems(id) ON DELETE SET NULL,
  parent_structure_id uuid REFERENCES anatomy.structures(id) ON DELETE RESTRICT,
  stable_key text NOT NULL UNIQUE,
  structure_type text NOT NULL,
  name text NOT NULL,
  laterality text,
  description text,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT anatomy_structure_type_ck CHECK (
    structure_type IN ('region', 'bone', 'muscle', 'organ', 'nerve', 'vessel', 'tissue', 'landmark', 'other')
  ),
  CONSTRAINT anatomy_laterality_ck CHECK (
    laterality IS NULL OR laterality IN ('left', 'right', 'bilateral', 'midline', 'not_applicable')
  ),
  CONSTRAINT anatomy_structures_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE anatomy.structures IS
  'Unified 3NF anatomy entity for bones, muscles, organs, nerves, vessels, regions and landmarks.';
CREATE INDEX anatomy_structures_system_type_idx
  ON anatomy.structures (body_system_id, structure_type, status);
CREATE INDEX anatomy_structures_parent_idx ON anatomy.structures (parent_structure_id);

CREATE TABLE anatomy.structure_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_structure_id uuid NOT NULL REFERENCES anatomy.structures(id) ON DELETE CASCADE,
  target_structure_id uuid NOT NULL REFERENCES anatomy.structures(id) ON DELETE CASCADE,
  relationship core.relationship_kind NOT NULL,
  source_section_id uuid REFERENCES knowledge.source_sections(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_structure_id, target_structure_id, relationship),
  CONSTRAINT anatomy_relationship_not_self_ck CHECK (source_structure_id <> target_structure_id),
  CONSTRAINT anatomy_relationship_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE anatomy.structure_relationships IS
  'Sourced anatomical hierarchy and spatial/functional relationships.';
CREATE INDEX structure_relationships_target_idx
  ON anatomy.structure_relationships (target_structure_id, relationship);

CREATE TABLE anatomy.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  model_asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE RESTRICT,
  preview_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  coordinate_system text NOT NULL DEFAULT 'right_handed_y_up',
  units text NOT NULL DEFAULT 'meters',
  version_label text NOT NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT anatomy_models_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE anatomy.models IS
  'Versioned optimized 3D anatomy model catalog stored through media assets.';

CREATE TABLE anatomy.model_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES anatomy.models(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES anatomy.structures(id) ON DELETE SET NULL,
  parent_node_id uuid REFERENCES anatomy.model_nodes(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  label text,
  transform jsonb NOT NULL DEFAULT '{}'::jsonb,
  interaction_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (model_id, node_key),
  CONSTRAINT anatomy_model_nodes_transform_ck CHECK (jsonb_typeof(transform) = 'object'),
  CONSTRAINT anatomy_model_nodes_interaction_ck CHECK (jsonb_typeof(interaction_config) = 'object')
);
COMMENT ON TABLE anatomy.model_nodes IS
  'Addressable model scene nodes mapped to canonical anatomy structures.';
CREATE INDEX anatomy_model_nodes_structure_idx
  ON anatomy.model_nodes (structure_id) WHERE structure_id IS NOT NULL;

CREATE TABLE anatomy.hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES anatomy.models(id) ON DELETE CASCADE,
  structure_id uuid NOT NULL REFERENCES anatomy.structures(id) ON DELETE RESTRICT,
  stable_key text NOT NULL,
  position jsonb NOT NULL,
  camera_target jsonb,
  radius numeric NOT NULL DEFAULT 0.02,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (model_id, stable_key),
  CONSTRAINT anatomy_hotspots_radius_ck CHECK (radius > 0),
  CONSTRAINT anatomy_hotspots_position_ck CHECK (jsonb_typeof(position) = 'object'),
  CONSTRAINT anatomy_hotspots_camera_ck CHECK (
    camera_target IS NULL OR jsonb_typeof(camera_target) = 'object'
  ),
  CONSTRAINT anatomy_hotspots_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE anatomy.hotspots IS
  'Interactive coordinates and camera targets for anatomical localization exercises.';
CREATE INDEX anatomy_hotspots_structure_idx
  ON anatomy.hotspots (structure_id, model_id);

CREATE TABLE practice.hotspot_targets (
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE CASCADE,
  hotspot_id uuid NOT NULL REFERENCES anatomy.hotspots(id) ON DELETE RESTRICT,
  weight numeric(7,5) NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (question_version_id, hotspot_id),
  CONSTRAINT hotspot_targets_weight_ck CHECK (weight > 0 AND weight <= 1)
);
COMMENT ON TABLE practice.hotspot_targets IS
  'Canonical accepted anatomy hotspots for image or 3D localization questions.';

CREATE TABLE clinical.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  domain_id uuid NOT NULL REFERENCES knowledge.medical_domains(id) ON DELETE RESTRICT,
  difficulty core.difficulty_level NOT NULL,
  current_version_id uuid,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.cases IS
  'Stable identity of a clinical scenario reusable in lessons, Bosses and Intervention.';

CREATE TABLE clinical.case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES clinical.cases(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  summary text NOT NULL,
  patient_profile jsonb NOT NULL,
  initial_state jsonb NOT NULL,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  timing_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, version_number),
  CONSTRAINT case_versions_number_ck CHECK (version_number > 0),
  CONSTRAINT case_versions_patient_ck CHECK (jsonb_typeof(patient_profile) = 'object'),
  CONSTRAINT case_versions_state_ck CHECK (jsonb_typeof(initial_state) = 'object'),
  CONSTRAINT case_versions_scoring_ck CHECK (jsonb_typeof(scoring_config) = 'object'),
  CONSTRAINT case_versions_timing_ck CHECK (jsonb_typeof(timing_config) = 'object'),
  CONSTRAINT case_versions_published_ck CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);
COMMENT ON TABLE clinical.case_versions IS
  'Immutable, medically reviewed scenario version with initial state, score and timing rules.';

ALTER TABLE clinical.cases
  ADD CONSTRAINT clinical_cases_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES clinical.case_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE clinical.case_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_version_id uuid NOT NULL REFERENCES clinical.case_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  phase text NOT NULL,
  position integer NOT NULL,
  prompt text NOT NULL,
  state_patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_cost_seconds integer NOT NULL DEFAULT 0,
  UNIQUE (case_version_id, stable_key),
  UNIQUE (case_version_id, position),
  CONSTRAINT case_steps_position_ck CHECK (position > 0),
  CONSTRAINT case_steps_time_ck CHECK (time_cost_seconds >= 0),
  CONSTRAINT case_steps_state_ck CHECK (jsonb_typeof(state_patch) = 'object')
);
COMMENT ON TABLE clinical.case_steps IS
  'Ordered reusable stages of a case, such as alert, safety, ABCDE, decisions, transport and debrief.';

CREATE TABLE clinical.case_step_questions (
  case_step_id uuid NOT NULL REFERENCES clinical.case_steps(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES practice.question_versions(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  PRIMARY KEY (case_step_id, question_version_id),
  UNIQUE (case_step_id, position),
  CONSTRAINT case_step_questions_position_ck CHECK (position > 0)
);
COMMENT ON TABLE clinical.case_step_questions IS
  'Links case steps to ordinary versioned questions, avoiding a second question engine.';

CREATE TABLE clinical.case_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_step_id uuid NOT NULL REFERENCES clinical.case_steps(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  label text NOT NULL,
  next_step_id uuid REFERENCES clinical.case_steps(id) ON DELETE SET NULL,
  score_delta numeric NOT NULL DEFAULT 0,
  xp_delta integer NOT NULL DEFAULT 0,
  time_delta_seconds integer NOT NULL DEFAULT 0,
  patient_state_patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text NOT NULL,
  UNIQUE (case_step_id, stable_key),
  CONSTRAINT case_decisions_patient_state_ck CHECK (jsonb_typeof(patient_state_patch) = 'object')
);
COMMENT ON TABLE clinical.case_decisions IS
  'Branching, scored decisions with explicit patient-state and timing consequences.';
CREATE INDEX case_decisions_next_step_idx
  ON clinical.case_decisions (next_step_id) WHERE next_step_id IS NOT NULL;

CREATE TABLE clinical.case_sources (
  case_version_id uuid NOT NULL REFERENCES clinical.case_versions(id) ON DELETE CASCADE,
  source_section_id uuid NOT NULL REFERENCES knowledge.source_sections(id) ON DELETE RESTRICT,
  evidence_note text,
  PRIMARY KEY (case_version_id, source_section_id)
);
COMMENT ON TABLE clinical.case_sources IS
  'Precise evidence sources for the clinical scenario and its decision logic.';

CREATE TRIGGER question_banks_set_updated_at
BEFORE UPDATE ON practice.question_banks
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER questions_set_updated_at
BEFORE UPDATE ON practice.questions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER exercise_definitions_set_updated_at
BEFORE UPDATE ON practice.exercise_definitions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER clinical_cases_set_updated_at
BEFORE UPDATE ON clinical.cases
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Media catalog, regulatory sources, Master Knowledge Base and curriculum.

CREATE TABLE media.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  kind core.asset_kind NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  checksum_sha256 text NOT NULL,
  width_px integer,
  height_px integer,
  duration_ms integer,
  accessibility_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (storage_bucket, storage_path),
  UNIQUE (checksum_sha256, byte_size),
  CONSTRAINT assets_byte_size_ck CHECK (byte_size > 0),
  CONSTRAINT assets_dimensions_ck CHECK (
    (width_px IS NULL OR width_px > 0)
    AND (height_px IS NULL OR height_px > 0)
    AND (duration_ms IS NULL OR duration_ms >= 0)
  ),
  CONSTRAINT assets_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE media.assets IS
  'Canonical media metadata; binary objects remain in private or public Supabase Storage buckets.';
CREATE INDEX assets_kind_status_idx ON media.assets (kind, status, created_at DESC);
CREATE INDEX assets_metadata_gin ON media.assets USING gin (metadata jsonb_path_ops);
CREATE INDEX assets_search_trgm_idx ON media.assets USING gin (stable_key gin_trgm_ops);

CREATE TABLE media.asset_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  width_px integer,
  height_px integer,
  bitrate_kbps integer,
  transformation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_asset_id, variant_key),
  UNIQUE (storage_bucket, storage_path),
  CONSTRAINT asset_variants_size_ck CHECK (byte_size > 0),
  CONSTRAINT asset_variants_transform_ck CHECK (jsonb_typeof(transformation) = 'object')
);
COMMENT ON TABLE media.asset_variants IS
  'Optimized derivatives such as thumbnails, WebP/AVIF, mobile video, waveform and low-poly 3D.';
CREATE INDEX asset_variants_source_idx
  ON media.asset_variants (source_asset_id, variant_key);

CREATE TABLE media.asset_localizations (
  asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text,
  caption text,
  alt_text text NOT NULL,
  transcript text,
  PRIMARY KEY (asset_id, locale)
);
COMMENT ON TABLE media.asset_localizations IS
  'Localized accessible titles, captions, alternative text and media transcripts.';

CREATE TABLE media.asset_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE CASCADE,
  license_name text NOT NULL,
  rights_holder text,
  source_url text,
  valid_from timestamptz,
  valid_until timestamptz,
  usage_terms text,
  evidence_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_license_dates_ck CHECK (
    valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from
  )
);
COMMENT ON TABLE media.asset_licenses IS
  'Rights and provenance for every externally sourced or commissioned media asset.';
CREATE INDEX asset_licenses_asset_idx ON media.asset_licenses (asset_id);

ALTER TABLE iam.profiles
  ADD CONSTRAINT profiles_avatar_asset_fk
  FOREIGN KEY (avatar_asset_id) REFERENCES media.assets(id) ON DELETE SET NULL;

CREATE TABLE knowledge.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  publisher text,
  authority core.source_authority NOT NULL,
  document_type text NOT NULL,
  canonical_url text,
  jurisdiction text NOT NULL DEFAULT 'FR',
  language text NOT NULL DEFAULT 'fr',
  current_version_id uuid,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_documents_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE knowledge.source_documents IS
  'Stable identity for DEA, HAS, Code de la santé publique and other auditable medical sources.';
CREATE INDEX source_documents_authority_status_idx
  ON knowledge.source_documents (authority, status);
CREATE INDEX source_documents_title_trgm_idx
  ON knowledge.source_documents USING gin (title gin_trgm_ops);

CREATE TABLE knowledge.source_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES knowledge.source_documents(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  published_on date,
  effective_from date,
  effective_until date,
  checksum_sha256 text,
  media_asset_id uuid REFERENCES media.assets(id) ON DELETE SET NULL,
  page_count integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  supersedes_version_id uuid REFERENCES knowledge.source_versions(id) ON DELETE SET NULL,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  UNIQUE (source_document_id, version_label),
  CONSTRAINT source_versions_dates_ck CHECK (
    effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from
  ),
  CONSTRAINT source_versions_pages_ck CHECK (page_count IS NULL OR page_count > 0)
);
COMMENT ON TABLE knowledge.source_versions IS
  'Immutable editions of a source document so every learning claim remains reproducible.';
CREATE INDEX source_versions_document_idx
  ON knowledge.source_versions (source_document_id, effective_from DESC NULLS LAST);

ALTER TABLE knowledge.source_documents
  ADD CONSTRAINT source_documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES knowledge.source_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE knowledge.source_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid NOT NULL REFERENCES knowledge.source_versions(id) ON DELETE CASCADE,
  parent_section_id uuid REFERENCES knowledge.source_sections(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  heading text,
  page_from integer,
  page_to integer,
  article_reference text,
  extracted_text text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(heading, '') || ' ' || coalesce(extracted_text, ''))
  ) STORED,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_version_id, stable_key),
  CONSTRAINT source_sections_pages_ck CHECK (
    (page_from IS NULL AND page_to IS NULL)
    OR (page_from > 0 AND page_to >= page_from)
  ),
  CONSTRAINT source_sections_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE knowledge.source_sections IS
  'Page- or article-level citation units used by questions, concepts and Pulse AI.';
CREATE INDEX source_sections_parent_idx ON knowledge.source_sections (parent_section_id);
CREATE INDEX source_sections_search_idx ON knowledge.source_sections USING gin (search_vector);
CREATE INDEX source_sections_article_idx
  ON knowledge.source_sections (article_reference) WHERE article_reference IS NOT NULL;

CREATE TABLE knowledge.regulatory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES knowledge.source_documents(id) ON DELETE CASCADE,
  source_version_id uuid REFERENCES knowledge.source_versions(id) ON DELETE SET NULL,
  update_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  detected_at timestamptz NOT NULL,
  effective_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  impact_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  status core.review_status NOT NULL DEFAULT 'pending_review',
  CONSTRAINT regulatory_updates_impact_ck CHECK (jsonb_typeof(impact_assessment) = 'object')
);
COMMENT ON TABLE knowledge.regulatory_updates IS
  'Tracked changes to official medical and regulatory sources with explicit impact review.';
CREATE INDEX regulatory_updates_status_idx
  ON knowledge.regulatory_updates (status, detected_at DESC);

CREATE TABLE knowledge.medical_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_domain_id uuid REFERENCES knowledge.medical_domains(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE knowledge.medical_domains IS
  'Hierarchical medical taxonomy shared by all formations and learning modes.';
CREATE INDEX medical_domains_parent_idx
  ON knowledge.medical_domains (parent_domain_id, sort_order);

CREATE TABLE knowledge.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  domain_id uuid NOT NULL REFERENCES knowledge.medical_domains(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  mastery_threshold numeric(5,2) NOT NULL DEFAULT 80,
  min_successful_attempts integer NOT NULL DEFAULT 2,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competencies_mastery_ck CHECK (mastery_threshold BETWEEN 0 AND 100),
  CONSTRAINT competencies_attempts_ck CHECK (min_successful_attempts > 0),
  CONSTRAINT competencies_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE knowledge.competencies IS
  'Stable, reusable Master Knowledge Base competencies with explicit mastery criteria.';
CREATE INDEX competencies_domain_status_idx
  ON knowledge.competencies (domain_id, status);
CREATE INDEX competencies_key_trgm_idx
  ON knowledge.competencies USING gin (stable_key gin_trgm_ops);
CREATE INDEX competencies_metadata_gin
  ON knowledge.competencies USING gin (metadata jsonb_path_ops);

CREATE TABLE knowledge.competency_prerequisites (
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE CASCADE,
  prerequisite_competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE RESTRICT,
  minimum_mastery numeric(5,2) NOT NULL DEFAULT 70,
  required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (competency_id, prerequisite_competency_id),
  CONSTRAINT competency_prerequisites_not_self_ck
    CHECK (competency_id <> prerequisite_competency_id),
  CONSTRAINT competency_prerequisites_mastery_ck
    CHECK (minimum_mastery BETWEEN 0 AND 100)
);
COMMENT ON TABLE knowledge.competency_prerequisites IS
  'Directed prerequisite graph between competencies; cycles are rejected by validation tooling.';
CREATE INDEX competency_prerequisites_reverse_idx
  ON knowledge.competency_prerequisites (prerequisite_competency_id, competency_id);

CREATE TABLE knowledge.medical_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  domain_id uuid NOT NULL REFERENCES knowledge.medical_domains(id) ON DELETE RESTRICT,
  preferred_label text NOT NULL,
  definition text NOT NULL,
  synonyms text[] NOT NULL DEFAULT ARRAY[]::text[],
  language text NOT NULL DEFAULT 'fr',
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('french', preferred_label || ' ' || definition || ' ' || array_to_string(synonyms, ' '))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_concepts_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE knowledge.medical_concepts IS
  'Normalized medical concepts used by content, semantic search and the medical graph.';
CREATE INDEX medical_concepts_domain_idx
  ON knowledge.medical_concepts (domain_id, status);
CREATE INDEX medical_concepts_search_idx
  ON knowledge.medical_concepts USING gin (search_vector);
CREATE INDEX medical_concepts_synonyms_idx
  ON knowledge.medical_concepts USING gin (synonyms);

CREATE TABLE knowledge.concept_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_concept_id uuid NOT NULL REFERENCES knowledge.medical_concepts(id) ON DELETE CASCADE,
  target_concept_id uuid NOT NULL REFERENCES knowledge.medical_concepts(id) ON DELETE CASCADE,
  relationship core.relationship_kind NOT NULL,
  confidence numeric(5,4) NOT NULL DEFAULT 1,
  source_section_id uuid REFERENCES knowledge.source_sections(id) ON DELETE SET NULL,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_concept_id, target_concept_id, relationship),
  CONSTRAINT concept_relationships_not_self_ck CHECK (source_concept_id <> target_concept_id),
  CONSTRAINT concept_relationships_confidence_ck CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT concept_relationships_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE knowledge.concept_relationships IS
  'Directed, sourced edges of the MedLingo medical knowledge graph.';
CREATE INDEX concept_relationships_target_idx
  ON knowledge.concept_relationships (target_concept_id, relationship);

CREATE TABLE knowledge.concept_competencies (
  concept_id uuid NOT NULL REFERENCES knowledge.medical_concepts(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE CASCADE,
  relevance numeric(5,4) NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_id, competency_id),
  CONSTRAINT concept_competencies_relevance_ck CHECK (relevance BETWEEN 0 AND 1)
);
COMMENT ON TABLE knowledge.concept_competencies IS
  'Many-to-many mapping that connects the medical graph to measurable competencies.';
CREATE INDEX concept_competencies_competency_idx
  ON knowledge.concept_competencies (competency_id, concept_id);

CREATE TABLE knowledge.concept_sources (
  concept_id uuid NOT NULL REFERENCES knowledge.medical_concepts(id) ON DELETE CASCADE,
  source_section_id uuid NOT NULL REFERENCES knowledge.source_sections(id) ON DELETE RESTRICT,
  evidence_kind text NOT NULL DEFAULT 'supports',
  quotation_hash text,
  PRIMARY KEY (concept_id, source_section_id),
  CONSTRAINT concept_sources_kind_ck
    CHECK (evidence_kind IN ('defines', 'supports', 'updates', 'contradicts'))
);
COMMENT ON TABLE knowledge.concept_sources IS
  'Auditable evidence links from concepts to precise document sections.';

CREATE TABLE knowledge.concept_embeddings (
  concept_id uuid NOT NULL REFERENCES knowledge.medical_concepts(id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  dimensions integer NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (concept_id, embedding_model),
  CONSTRAINT concept_embeddings_dimensions_ck CHECK (dimensions = 1536)
);
COMMENT ON TABLE knowledge.concept_embeddings IS
  'Versioned semantic vectors for concept retrieval; one embedding per model and concept.';
CREATE INDEX concept_embeddings_hnsw_idx
  ON knowledge.concept_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE knowledge.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  parent_tag_id uuid REFERENCES knowledge.tags(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE knowledge.tags IS
  'Controlled reusable content tags; domain-specific junction tables preserve referential integrity.';
CREATE INDEX tags_parent_idx ON knowledge.tags (parent_tag_id);

CREATE TABLE learning.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  audience text,
  jurisdiction text NOT NULL DEFAULT 'FR',
  default_locale text NOT NULL DEFAULT 'fr-FR',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE learning.formations IS
  'Top-level training programs such as DEA, Auxiliaire Ambulancier and IFSI.';

ALTER TABLE iam.user_roles
  ADD CONSTRAINT user_roles_formation_fk
  FOREIGN KEY (formation_id) REFERENCES learning.formations(id) ON DELETE CASCADE;

CREATE TABLE learning.formation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES learning.formations(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  description text,
  effective_from timestamptz,
  published_at timestamptz,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  source_version_id uuid REFERENCES knowledge.source_versions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formation_id, version_number),
  CONSTRAINT formation_versions_number_ck CHECK (version_number > 0)
);
COMMENT ON TABLE learning.formation_versions IS
  'Immutable version envelope for a formation curriculum.';

ALTER TABLE learning.formations
  ADD CONSTRAINT formations_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES learning.formation_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE learning.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_version_id uuid NOT NULL REFERENCES learning.formation_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  position integer NOT NULL,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  estimated_minutes integer NOT NULL DEFAULT 0,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (formation_version_id, stable_key),
  UNIQUE (formation_version_id, position),
  CONSTRAINT blocks_position_ck CHECK (position > 0),
  CONSTRAINT blocks_duration_ck CHECK (estimated_minutes >= 0),
  CONSTRAINT blocks_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE learning.blocks IS
  'Ordered curriculum domains grouping related learning paths.';
CREATE INDEX blocks_formation_status_idx
  ON learning.blocks (formation_version_id, status, position);

CREATE TABLE learning.paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES learning.blocks(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  objectives_text text,
  position integer NOT NULL,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  estimated_minutes integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (block_id, stable_key),
  UNIQUE (block_id, position),
  CONSTRAINT paths_position_ck CHECK (position > 0),
  CONSTRAINT paths_duration_ck CHECK (estimated_minutes >= 0),
  CONSTRAINT paths_xp_ck CHECK (xp_reward >= 0),
  CONSTRAINT paths_metadata_ck CHECK (jsonb_typeof(metadata) = 'object')
);
COMMENT ON TABLE learning.paths IS
  'Ordered pedagogical paths within a block, independent of their lessons and rewards.';
CREATE INDEX paths_block_status_idx ON learning.paths (block_id, status, position);

CREATE TABLE learning.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES learning.paths(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  kind core.content_kind NOT NULL DEFAULT 'lesson',
  position integer NOT NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path_id, stable_key),
  UNIQUE (path_id, position),
  CONSTRAINT lessons_position_ck CHECK (position > 0)
);
COMMENT ON TABLE learning.lessons IS
  'Stable lesson identity; all editable pedagogical fields live in immutable lesson_versions.';
CREATE INDEX lessons_path_status_idx ON learning.lessons (path_id, status, position);

CREATE TABLE learning.lesson_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  subtitle text,
  summary text,
  pedagogical_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  difficulty core.difficulty_level NOT NULL DEFAULT 'easy',
  estimated_minutes integer NOT NULL DEFAULT 0,
  passing_score numeric(5,2) NOT NULL DEFAULT 80,
  xp_reward integer NOT NULL DEFAULT 0,
  selection_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status core.review_status NOT NULL DEFAULT 'pending_review',
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, version_number),
  CONSTRAINT lesson_versions_number_ck CHECK (version_number > 0),
  CONSTRAINT lesson_versions_duration_ck CHECK (estimated_minutes >= 0),
  CONSTRAINT lesson_versions_passing_ck CHECK (passing_score BETWEEN 0 AND 100),
  CONSTRAINT lesson_versions_xp_ck CHECK (xp_reward >= 0),
  CONSTRAINT lesson_versions_content_ck CHECK (jsonb_typeof(pedagogical_content) = 'object'),
  CONSTRAINT lesson_versions_selection_ck CHECK (jsonb_typeof(selection_config) = 'object'),
  CONSTRAINT lesson_versions_published_ck CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);
COMMENT ON TABLE learning.lesson_versions IS
  'Immutable lesson versions preserving official source specifications and renderer configuration.';
CREATE INDEX lesson_versions_lesson_status_idx
  ON learning.lesson_versions (lesson_id, status, version_number DESC);
CREATE INDEX lesson_versions_content_gin
  ON learning.lesson_versions USING gin (pedagogical_content jsonb_path_ops);

ALTER TABLE learning.lessons
  ADD CONSTRAINT lessons_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES learning.lesson_versions(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE learning.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  title text NOT NULL,
  position integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (lesson_version_id, stable_key),
  UNIQUE (lesson_version_id, position),
  CONSTRAINT chapters_position_ck CHECK (position > 0),
  CONSTRAINT chapters_content_ck CHECK (jsonb_typeof(content) = 'object')
);
COMMENT ON TABLE learning.chapters IS
  'Optional ordered internal lesson sections; not required for exercise-only lessons.';

CREATE TABLE learning.learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE,
  statement text NOT NULL,
  bloom_level text,
  measurable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_objectives_bloom_ck CHECK (
    bloom_level IS NULL OR bloom_level IN (
      'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
    )
  )
);
COMMENT ON TABLE learning.learning_objectives IS
  'Reusable measurable pedagogical objectives independent from lesson wording and versions.';

CREATE TABLE learning.lesson_objectives (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES learning.learning_objectives(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 1,
  PRIMARY KEY (lesson_version_id, objective_id),
  CONSTRAINT lesson_objectives_position_ck CHECK (position > 0)
);
COMMENT ON TABLE learning.lesson_objectives IS
  'Ordered many-to-many mapping from a lesson version to its learning objectives.';

CREATE TABLE learning.lesson_competencies (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES knowledge.competencies(id) ON DELETE RESTRICT,
  weight numeric(6,5) NOT NULL DEFAULT 1,
  PRIMARY KEY (lesson_version_id, competency_id),
  CONSTRAINT lesson_competencies_weight_ck CHECK (weight > 0 AND weight <= 1)
);
COMMENT ON TABLE learning.lesson_competencies IS
  'Weighted competency coverage of each immutable lesson version.';
CREATE INDEX lesson_competencies_competency_idx
  ON learning.lesson_competencies (competency_id, lesson_version_id);

CREATE TABLE learning.lesson_prerequisites (
  lesson_id uuid NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id uuid NOT NULL REFERENCES learning.lessons(id) ON DELETE RESTRICT,
  minimum_score numeric(5,2) NOT NULL DEFAULT 80,
  required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (lesson_id, prerequisite_lesson_id),
  CONSTRAINT lesson_prerequisites_not_self_ck CHECK (lesson_id <> prerequisite_lesson_id),
  CONSTRAINT lesson_prerequisites_score_ck CHECK (minimum_score BETWEEN 0 AND 100)
);
COMMENT ON TABLE learning.lesson_prerequisites IS
  'Explicit prerequisite graph used for server-authoritative unlocking.';
CREATE INDEX lesson_prerequisites_reverse_idx
  ON learning.lesson_prerequisites (prerequisite_lesson_id, lesson_id);

CREATE TABLE learning.lesson_assets (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media.assets(id) ON DELETE RESTRICT,
  usage text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (lesson_version_id, asset_id, usage),
  CONSTRAINT lesson_assets_position_ck CHECK (position > 0),
  CONSTRAINT lesson_assets_configuration_ck CHECK (jsonb_typeof(configuration) = 'object')
);
COMMENT ON TABLE learning.lesson_assets IS
  'Purpose-specific attachment of optimized media to lesson versions.';
CREATE INDEX lesson_assets_asset_idx ON learning.lesson_assets (asset_id);

CREATE TABLE learning.lesson_metadata (
  lesson_version_id uuid PRIMARY KEY REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  prerequisites_text text[] NOT NULL DEFAULT ARRAY[]::text[],
  vocabulary text[] NOT NULL DEFAULT ARRAY[]::text[],
  audience_notes text,
  source_notes text,
  feature_requirements text[] NOT NULL DEFAULT ARRAY[]::text[],
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT lesson_metadata_custom_ck CHECK (jsonb_typeof(custom) = 'object')
);
COMMENT ON TABLE learning.lesson_metadata IS
  'Extensible lesson metadata separated from core version fields to keep curriculum rows stable.';

CREATE TABLE learning.path_prerequisites (
  path_id uuid NOT NULL REFERENCES learning.paths(id) ON DELETE CASCADE,
  prerequisite_path_id uuid NOT NULL REFERENCES learning.paths(id) ON DELETE RESTRICT,
  required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (path_id, prerequisite_path_id),
  CONSTRAINT path_prerequisites_not_self_ck CHECK (path_id <> prerequisite_path_id)
);
COMMENT ON TABLE learning.path_prerequisites IS
  'Explicit path unlock graph, independent from visual ordering.';

CREATE TABLE learning.content_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_key text NOT NULL UNIQUE,
  formation_version_id uuid NOT NULL REFERENCES learning.formation_versions(id) ON DELETE RESTRICT,
  scope core.publication_scope NOT NULL DEFAULT 'formation',
  version_label text NOT NULL,
  status core.lifecycle_status NOT NULL DEFAULT 'draft',
  manifest_checksum text,
  published_by uuid REFERENCES iam.user_accounts(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_releases_published_ck CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);
COMMENT ON TABLE learning.content_releases IS
  'Atomic curriculum release manifest enabling reproducible clients and safe cache invalidation.';

CREATE TABLE learning.content_release_items (
  release_id uuid NOT NULL REFERENCES learning.content_releases(id) ON DELETE CASCADE,
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE RESTRICT,
  content_hash text NOT NULL,
  PRIMARY KEY (release_id, lesson_version_id)
);
COMMENT ON TABLE learning.content_release_items IS
  'Exact immutable lesson versions included in one release.';
CREATE INDEX content_release_items_lesson_idx
  ON learning.content_release_items (lesson_version_id, release_id);

CREATE TABLE learning.lesson_tags (
  lesson_version_id uuid NOT NULL REFERENCES learning.lesson_versions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES knowledge.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_version_id, tag_id)
);
COMMENT ON TABLE learning.lesson_tags IS
  'Normalized tags for lesson discovery and analytics.';
CREATE INDEX lesson_tags_tag_idx ON learning.lesson_tags (tag_id, lesson_version_id);

CREATE TRIGGER assets_set_updated_at
BEFORE UPDATE ON media.assets
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER source_documents_set_updated_at
BEFORE UPDATE ON knowledge.source_documents
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER competencies_set_updated_at
BEFORE UPDATE ON knowledge.competencies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER medical_concepts_set_updated_at
BEFORE UPDATE ON knowledge.medical_concepts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER formations_set_updated_at
BEFORE UPDATE ON learning.formations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER lessons_set_updated_at
BEFORE UPDATE ON learning.lessons
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

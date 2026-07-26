-- MedLingo Enterprise Database V1
-- Foundation: extensions, schemas, shared enums and utility functions.
-- Execute on a Supabase staging branch before any production migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS learning;
CREATE SCHEMA IF NOT EXISTS practice;
CREATE SCHEMA IF NOT EXISTS anatomy;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS progress;
CREATE SCHEMA IF NOT EXISTS gamification;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS engagement;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS api;

CREATE TYPE core.lifecycle_status AS ENUM (
  'draft', 'review', 'approved', 'published', 'archived', 'retired'
);
CREATE TYPE core.review_status AS ENUM (
  'draft', 'pending_review', 'source_verified',
  'pedagogically_reviewed', 'trainer_validated',
  'medical_validated', 'regulatory_validated',
  'rejected', 'deprecated'
);
CREATE TYPE core.difficulty_level AS ENUM (
  'introductory', 'easy', 'medium', 'hard', 'expert'
);
CREATE TYPE core.rarity AS ENUM (
  'common', 'rare', 'epic', 'legendary', 'mythic'
);
CREATE TYPE core.exercise_type AS ENUM (
  'single_choice', 'multiple_choice', 'true_false', 'matching',
  'ordering', 'fill_blank', 'anatomy_localization', 'clinical_case',
  'drag_drop', 'image_hotspot', 'audio', 'video', 'calculation',
  'open_text'
);
CREATE TYPE core.content_kind AS ENUM (
  'lesson', 'review', 'quiz', 'boss', 'exam', 'intervention'
);
CREATE TYPE core.publication_scope AS ENUM (
  'private', 'organization', 'formation', 'public'
);
CREATE TYPE core.platform AS ENUM ('ios', 'android', 'web');
CREATE TYPE core.account_status AS ENUM (
  'pending', 'active', 'suspended', 'locked', 'deleted'
);
CREATE TYPE core.currency_kind AS ENUM (
  'coins', 'gems', 'keys', 'tickets', 'energy', 'real_money'
);
CREATE TYPE core.ledger_direction AS ENUM ('credit', 'debit');
CREATE TYPE core.reward_kind AS ENUM (
  'xp', 'currency', 'item', 'badge', 'title', 'energy',
  'chest', 'premium_entitlement'
);
CREATE TYPE core.notification_channel AS ENUM (
  'in_app', 'push', 'email'
);
CREATE TYPE core.delivery_status AS ENUM (
  'queued', 'processing', 'sent', 'delivered', 'opened',
  'failed', 'cancelled'
);
CREATE TYPE core.attempt_status AS ENUM (
  'started', 'paused', 'submitted', 'completed', 'abandoned', 'invalidated'
);
CREATE TYPE core.mastery_state AS ENUM (
  'not_started', 'acquiring', 'practicing', 'mastered', 'decaying'
);
CREATE TYPE core.source_authority AS ENUM (
  'has', 'code_sante_publique', 'dea_referential', 'ministry',
  'scientific_society', 'peer_reviewed', 'institutional', 'internal'
);
CREATE TYPE core.asset_kind AS ENUM (
  'image', 'video', 'audio', 'lottie', 'model_3d', 'pdf', 'illustration'
);
CREATE TYPE core.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'
);
CREATE TYPE core.ai_message_role AS ENUM (
  'system', 'user', 'assistant', 'tool'
);
CREATE TYPE core.relationship_kind AS ENUM (
  'is_a', 'part_of', 'contains', 'depends_on', 'prerequisite_of',
  'related_to', 'contraindicates', 'causes', 'affects'
);

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION core.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION core.jwt_claim_text(claim_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT auth.jwt() ->> claim_name;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA core FROM PUBLIC;
GRANT USAGE ON SCHEMA core TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION core.current_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION core.jwt_claim_text(text) TO authenticated, service_role;

-- Supabase privileges, Row Level Security, Storage and Realtime.

REVOKE ALL ON SCHEMA iam, media, knowledge, learning, practice, anatomy,
  clinical, progress, gamification, commerce, ai, engagement, analytics,
  governance, operations, api
FROM PUBLIC;

GRANT USAGE ON SCHEMA iam, media, knowledge, learning, practice, anatomy,
  clinical, progress, gamification, commerce, ai, engagement, analytics,
  governance, operations, api
TO authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA iam, media, knowledge, learning, practice,
  anatomy, clinical, progress, gamification, commerce, ai, engagement,
  analytics, governance, operations
TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA iam, media, knowledge, learning, practice,
  anatomy, clinical, progress, gamification, commerce, ai, engagement,
  analytics, governance, operations
TO service_role;

-- RLS is enabled and forced on every application table. Absence of a policy
-- intentionally means deny-by-default.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN (
      'iam', 'media', 'knowledge', 'learning', 'practice', 'anatomy',
      'clinical', 'progress', 'gamification', 'commerce', 'ai',
      'engagement', 'analytics', 'governance', 'operations'
    )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      target.schemaname, target.tablename
    );
    EXECUTE format(
      'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
      target.schemaname, target.tablename
    );
  END LOOP;
END;
$$;

-- Direct owner-read tables. Mutations remain denied unless explicitly listed
-- below or performed by a trusted function.
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
    'iam.account_recovery_events'::regclass,
    'progress.enrollments'::regclass,
    'progress.user_learning_state'::regclass,
    'progress.lesson_progress'::regclass,
    'progress.path_progress'::regclass,
    'progress.block_progress'::regclass,
    'progress.completion_records'::regclass,
    'progress.lesson_attempts'::regclass,
    'progress.question_attempts'::regclass,
    'progress.mistakes'::regclass,
    'progress.competency_mastery'::regclass,
    'progress.mastery_history'::regclass,
    'progress.streak_days'::regclass,
    'progress.srs_profiles'::regclass,
    'progress.review_items'::regclass,
    'progress.review_events'::regclass,
    'clinical.case_attempts'::regclass,
    'commerce.wallets'::regclass,
    'commerce.wallet_ledger'::regclass,
    'commerce.inventory'::regclass,
    'commerce.inventory_events'::regclass,
    'commerce.user_equipment'::regclass,
    'commerce.purchase_orders'::regclass,
    'commerce.user_subscriptions'::regclass,
    'commerce.user_entitlements'::regclass,
    'commerce.chest_instances'::regclass,
    'commerce.chest_openings'::regclass,
    'gamification.reward_grants'::regclass,
    'gamification.xp_ledger'::regclass,
    'gamification.user_achievements'::regclass,
    'gamification.user_badges'::regclass,
    'gamification.user_titles'::regclass,
    'gamification.user_mission_progress'::regclass,
    'gamification.league_memberships'::regclass,
    'gamification.challenge_participants'::regclass,
    'gamification.daily_reward_claims'::regclass,
    'ai.conversations'::regclass,
    'ai.messages'::regclass,
    'ai.user_memories'::regclass,
    'ai.context_snapshots'::regclass,
    'ai.recommendations'::regclass,
    'ai.adaptive_learning_events'::regclass,
    'engagement.notification_preferences'::regclass,
    'engagement.push_subscriptions'::regclass,
    'engagement.notification_schedules'::regclass,
    'engagement.notification_queue'::regclass,
    'engagement.in_app_notifications'::regclass,
    'analytics.user_daily_stats'::regclass,
    'analytics.user_weekly_stats'::regclass,
    'analytics.user_monthly_stats'::regclass,
    'analytics.mastery_snapshots'::regclass,
    'analytics.heatmap_cells'::regclass,
    'operations.sync_changes'::regclass,
    'operations.device_sync_cursors'::regclass
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON %s TO authenticated', target);
    EXECUTE format('DROP POLICY IF EXISTS owner_read ON %s', target);
    EXECUTE format(
      'CREATE POLICY owner_read ON %s FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      target
    );
  END LOOP;
END;
$$;

-- Self-service profile/preferences/device settings. Sensitive account fields
-- are changed through Auth or dedicated RPCs.
GRANT INSERT, UPDATE ON iam.profiles, iam.user_preferences, iam.user_devices,
  iam.mfa_preferences TO authenticated;

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
CREATE POLICY mfa_preferences_update_own ON iam.mfa_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Consent is an immutable user-authored event.
GRANT INSERT ON iam.user_consents TO authenticated;
CREATE POLICY consents_insert_own ON iam.user_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Published catalogs. Content writers use backend/admin RPCs; direct client
-- mutation is intentionally denied.
GRANT SELECT ON ALL TABLES IN SCHEMA media, knowledge, learning, practice,
  anatomy, clinical, gamification, commerce
TO authenticated;

CREATE POLICY assets_published_read ON media.assets
  FOR SELECT TO authenticated USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY asset_variants_published_read ON media.asset_variants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM media.assets a
      WHERE a.id = source_asset_id AND a.status = 'published' AND a.deleted_at IS NULL
    )
  );
CREATE POLICY asset_localizations_published_read ON media.asset_localizations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM media.assets a
      WHERE a.id = asset_id AND a.status = 'published' AND a.deleted_at IS NULL
    )
  );

CREATE POLICY medical_domains_active_read ON knowledge.medical_domains
  FOR SELECT TO authenticated USING (active);
CREATE POLICY competencies_published_read ON knowledge.competencies
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY competency_prerequisites_read ON knowledge.competency_prerequisites
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM knowledge.competencies c
      WHERE c.id = competency_id AND c.status = 'published'
    )
  );
CREATE POLICY medical_concepts_published_read ON knowledge.medical_concepts
  FOR SELECT TO authenticated USING (status = 'published');
GRANT SELECT ON knowledge.concept_embeddings TO authenticated;
CREATE POLICY concept_embeddings_published_read ON knowledge.concept_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM knowledge.medical_concepts AS concept
      WHERE concept.id = knowledge.concept_embeddings.concept_id
        AND concept.status = 'published'
    )
  );
CREATE POLICY concept_relationships_read ON knowledge.concept_relationships
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM knowledge.medical_concepts c
      WHERE c.id = source_concept_id AND c.status = 'published'
    )
  );
CREATE POLICY concept_competencies_read ON knowledge.concept_competencies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM knowledge.medical_concepts c
      WHERE c.id = concept_id AND c.status = 'published'
    )
  );
CREATE POLICY tags_active_read ON knowledge.tags
  FOR SELECT TO authenticated USING (active);
CREATE POLICY source_documents_published_read ON knowledge.source_documents
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY source_versions_read ON knowledge.source_versions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM knowledge.source_documents sd
      WHERE sd.id = source_document_id AND sd.status = 'published'
    )
  );
CREATE POLICY source_sections_read ON knowledge.source_sections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM knowledge.source_versions sv
      JOIN knowledge.source_documents sd ON sd.id = sv.source_document_id
      WHERE sv.id = source_version_id AND sd.status = 'published'
    )
  );

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
CREATE POLICY chapters_published_read ON learning.chapters
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY learning_objectives_read ON learning.learning_objectives
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM learning.lesson_objectives lo
      JOIN learning.lesson_versions lv ON lv.id = lo.lesson_version_id
      WHERE lo.objective_id = id AND lv.status = 'published'
    )
  );
CREATE POLICY lesson_objectives_read ON learning.lesson_objectives
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY lesson_competencies_read ON learning.lesson_competencies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY lesson_prerequisites_read ON learning.lesson_prerequisites
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lessons l
      WHERE l.id = lesson_id AND l.status = 'published'
    )
  );
CREATE POLICY lesson_assets_read ON learning.lesson_assets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY lesson_metadata_read ON learning.lesson_metadata
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY path_prerequisites_read ON learning.path_prerequisites
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.paths p
      WHERE p.id = path_id AND p.status = 'published'
    )
  );
CREATE POLICY content_releases_read ON learning.content_releases
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY content_release_items_read ON learning.content_release_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.content_releases cr
      WHERE cr.id = release_id AND cr.status = 'published'
    )
  );
CREATE POLICY lesson_tags_read ON learning.lesson_tags
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );

CREATE POLICY question_banks_published_read ON practice.question_banks
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY lesson_question_banks_read ON practice.lesson_question_banks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice.question_banks qb
      WHERE qb.id = question_bank_id AND qb.status = 'published'
    )
  );
CREATE POLICY questions_published_read ON practice.questions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY question_versions_published_read ON practice.question_versions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY choices_question_read ON practice.choices
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice.question_versions qv
      WHERE qv.id = question_version_id AND qv.status = 'published'
    )
  );
CREATE POLICY question_assets_read ON practice.question_assets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice.question_versions qv
      WHERE qv.id = question_version_id AND qv.status = 'published'
    )
  );
CREATE POLICY exercise_definitions_published_read ON practice.exercise_definitions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY exercise_versions_published_read ON practice.exercise_versions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY exercise_questions_read ON practice.exercise_questions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice.exercise_versions ev
      WHERE ev.id = exercise_version_id AND ev.status = 'published'
    )
  );
CREATE POLICY lesson_exercises_read ON practice.lesson_exercises
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM learning.lesson_versions lv
      WHERE lv.id = lesson_version_id AND lv.status = 'published'
    )
  );
CREATE POLICY flashcards_published_read ON practice.flashcards
  FOR SELECT TO authenticated USING (status = 'published');

-- Answer keys, explanations, matching pairs, ordering items, fill blanks,
-- calculation rules and hotspot targets have no direct authenticated policy.
-- They are evaluated by trusted functions so clients cannot fetch corrections.

CREATE POLICY body_systems_published_read ON anatomy.body_systems
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY structures_published_read ON anatomy.structures
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY structure_relationships_read ON anatomy.structure_relationships
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM anatomy.structures s
      WHERE s.id = source_structure_id AND s.status = 'published'
    )
  );
CREATE POLICY anatomy_models_published_read ON anatomy.models
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY anatomy_model_nodes_read ON anatomy.model_nodes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM anatomy.models m
      WHERE m.id = model_id AND m.status = 'published'
    )
  );
CREATE POLICY anatomy_hotspots_read ON anatomy.hotspots
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM anatomy.models m
      WHERE m.id = model_id AND m.status = 'published'
    )
  );

CREATE POLICY clinical_cases_published_read ON clinical.cases
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY clinical_case_versions_published_read ON clinical.case_versions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY clinical_case_steps_read ON clinical.case_steps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clinical.case_versions cv
      WHERE cv.id = case_version_id AND cv.status = 'published'
    )
  );
CREATE POLICY clinical_case_step_questions_read ON clinical.case_step_questions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM clinical.case_steps cs
      JOIN clinical.case_versions cv ON cv.id = cs.case_version_id
      WHERE cs.id = case_step_id AND cv.status = 'published'
    )
  );

CREATE POLICY currencies_active_read ON commerce.currency_definitions
  FOR SELECT TO authenticated USING (active);
CREATE POLICY catalog_items_published_read ON commerce.catalog_items
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY catalog_prices_active_read ON commerce.catalog_prices
  FOR SELECT TO authenticated USING (
    active
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until > now())
  );
CREATE POLICY products_active_read ON commerce.products
  FOR SELECT TO authenticated USING (active);
CREATE POLICY product_prices_active_read ON commerce.product_prices
  FOR SELECT TO authenticated USING (active);
CREATE POLICY subscription_plans_active_read ON commerce.subscription_plans
  FOR SELECT TO authenticated USING (active);
CREATE POLICY entitlement_definitions_active_read ON commerce.entitlement_definitions
  FOR SELECT TO authenticated USING (active);
CREATE POLICY chest_types_published_read ON commerce.chest_types
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY levels_read ON gamification.levels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ranks_read ON gamification.ranks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY badges_published_read ON gamification.badges
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY titles_published_read ON gamification.titles
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY achievements_published_read ON gamification.achievement_definitions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY mission_definitions_published_read ON gamification.mission_definitions
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY mission_occurrences_active_read ON gamification.mission_occurrences
  FOR SELECT TO authenticated USING (starts_at <= now() AND ends_at > now());
CREATE POLICY seasons_published_read ON gamification.seasons
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY leagues_active_read ON gamification.leagues
  FOR SELECT TO authenticated USING (starts_at <= now() AND ends_at > now());
CREATE POLICY challenges_published_read ON gamification.challenges
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY reward_calendars_published_read ON gamification.daily_reward_calendars
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY reward_steps_read ON gamification.daily_reward_steps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM gamification.daily_reward_calendars drc
      WHERE drc.id = calendar_id AND drc.status = 'published'
    )
  );

-- Indirect ownership.
GRANT SELECT ON progress.exercise_attempts, progress.selected_choices,
  clinical.case_step_events, clinical.case_feedback,
  commerce.purchase_order_lines, commerce.chest_rewards,
  ai.message_citations, ai.memory_embeddings,
  engagement.notification_deliveries
TO authenticated;

CREATE POLICY exercise_attempts_owner_read ON progress.exercise_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM progress.lesson_attempts la
      WHERE la.id = lesson_attempt_id AND la.user_id = auth.uid()
    )
  );
CREATE POLICY selected_choices_owner_read ON progress.selected_choices
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM progress.question_attempts qa
      WHERE qa.id = question_attempt_id AND qa.user_id = auth.uid()
    )
  );
CREATE POLICY case_step_events_owner_read ON clinical.case_step_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clinical.case_attempts ca
      WHERE ca.id = case_attempt_id AND ca.user_id = auth.uid()
    )
  );
CREATE POLICY case_feedback_owner_read ON clinical.case_feedback
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clinical.case_attempts ca
      WHERE ca.id = case_attempt_id AND ca.user_id = auth.uid()
    )
  );
CREATE POLICY purchase_lines_owner_read ON commerce.purchase_order_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM commerce.purchase_orders po
      WHERE po.id = order_id AND po.user_id = auth.uid()
    )
  );
CREATE POLICY chest_rewards_owner_read ON commerce.chest_rewards
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM commerce.chest_openings co
      WHERE co.id = chest_opening_id AND co.user_id = auth.uid()
    )
  );
CREATE POLICY ai_message_citations_owner_read ON ai.message_citations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ai.messages m
      WHERE m.id = message_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY ai_memory_embeddings_owner_read ON ai.memory_embeddings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ai.user_memories um
      WHERE um.id = memory_id AND um.user_id = auth.uid()
    )
  );
CREATE POLICY notification_deliveries_owner_read ON engagement.notification_deliveries
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM engagement.notification_queue nq
      WHERE nq.id = queue_id AND nq.user_id = auth.uid()
    )
  );

-- Safe user-authored AI and notification state.
GRANT INSERT, UPDATE ON ai.conversations, ai.messages, ai.user_memories TO authenticated;
CREATE POLICY ai_conversations_insert_own ON ai.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_conversations_update_own ON ai.conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_messages_insert_own ON ai.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND role = 'user'
    AND EXISTS (
      SELECT 1 FROM ai.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY ai_memories_insert_own ON ai.user_memories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_memories_update_own ON ai.user_memories
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT INSERT, UPDATE, DELETE ON engagement.notification_preferences,
  engagement.push_subscriptions, engagement.notification_schedules
TO authenticated;
GRANT UPDATE ON engagement.in_app_notifications TO authenticated;
CREATE POLICY notification_preferences_write_own ON engagement.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_write_own ON engagement.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM iam.user_devices d
      WHERE d.id = device_id AND d.user_id = auth.uid()
    )
  );
CREATE POLICY notification_schedules_write_own ON engagement.notification_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY in_app_notifications_update_own ON engagement.in_app_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Privacy requests and bug reports.
GRANT SELECT, INSERT ON governance.data_export_requests,
  governance.data_erasure_requests, operations.bug_reports TO authenticated;
CREATE POLICY export_requests_owner_read ON governance.data_export_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY export_requests_owner_insert ON governance.data_export_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY erasure_requests_owner_read ON governance.data_erasure_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY erasure_requests_owner_insert ON governance.data_erasure_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY bug_reports_owner_read ON operations.bug_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_user_id);
CREATE POLICY bug_reports_owner_insert ON operations.bug_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_user_id);

-- Content and administration policies. Scoped editors should use formation-
-- specific APIs; these direct policies intentionally accept global roles only.
DO $$
DECLARE
  target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'media.assets'::regclass,
    'media.asset_variants'::regclass,
    'media.asset_localizations'::regclass,
    'media.asset_licenses'::regclass,
    'knowledge.source_documents'::regclass,
    'knowledge.source_versions'::regclass,
    'knowledge.source_sections'::regclass,
    'knowledge.regulatory_updates'::regclass,
    'knowledge.medical_domains'::regclass,
    'knowledge.competencies'::regclass,
    'knowledge.competency_prerequisites'::regclass,
    'knowledge.medical_concepts'::regclass,
    'knowledge.concept_relationships'::regclass,
    'knowledge.concept_competencies'::regclass,
    'knowledge.concept_sources'::regclass,
    'knowledge.concept_embeddings'::regclass,
    'knowledge.tags'::regclass,
    'learning.formations'::regclass,
    'learning.formation_versions'::regclass,
    'learning.blocks'::regclass,
    'learning.paths'::regclass,
    'learning.lessons'::regclass,
    'learning.lesson_versions'::regclass,
    'learning.chapters'::regclass,
    'learning.learning_objectives'::regclass,
    'learning.lesson_objectives'::regclass,
    'learning.lesson_competencies'::regclass,
    'learning.lesson_prerequisites'::regclass,
    'learning.lesson_assets'::regclass,
    'learning.lesson_metadata'::regclass,
    'learning.path_prerequisites'::regclass,
    'learning.content_releases'::regclass,
    'learning.content_release_items'::regclass,
    'learning.lesson_tags'::regclass,
    'practice.question_banks'::regclass,
    'practice.lesson_question_banks'::regclass,
    'practice.questions'::regclass,
    'practice.question_versions'::regclass,
    'practice.choices'::regclass,
    'practice.answer_keys'::regclass,
    'practice.explanations'::regclass,
    'practice.hints'::regclass,
    'practice.question_competencies'::regclass,
    'practice.question_sources'::regclass,
    'practice.question_tags'::regclass,
    'practice.question_assets'::regclass,
    'practice.matching_pairs'::regclass,
    'practice.ordering_items'::regclass,
    'practice.fill_blank_slots'::regclass,
    'practice.calculation_rules'::regclass,
    'practice.exercise_definitions'::regclass,
    'practice.exercise_versions'::regclass,
    'practice.exercise_questions'::regclass,
    'practice.lesson_exercises'::regclass,
    'practice.hotspot_targets'::regclass,
    'practice.flashcards'::regclass,
    'anatomy.body_systems'::regclass,
    'anatomy.structures'::regclass,
    'anatomy.structure_relationships'::regclass,
    'anatomy.models'::regclass,
    'anatomy.model_nodes'::regclass,
    'anatomy.hotspots'::regclass,
    'clinical.cases'::regclass,
    'clinical.case_versions'::regclass,
    'clinical.case_steps'::regclass,
    'clinical.case_step_questions'::regclass,
    'clinical.case_decisions'::regclass,
    'clinical.case_sources'::regclass
  ]
  LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON %s TO authenticated', target);
    EXECUTE format('DROP POLICY IF EXISTS content_manage ON %s', target);
    EXECUTE format(
      'CREATE POLICY content_manage ON %s FOR ALL TO authenticated '
      || 'USING (iam.has_permission(''content.manage'')) '
      || 'WITH CHECK (iam.has_permission(''content.manage''))',
      target
    );
  END LOOP;
END;
$$;

-- API views.
GRANT SELECT ON api.published_curriculum, api.my_learning_dashboard,
  api.my_inventory, api.my_review_queue, api.my_unread_notifications
TO authenticated;

-- Storage buckets. Public curriculum assets are CDN-cacheable; private user
-- uploads and GDPR exports are protected by folder ownership.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'medlingo-public-content',
    'medlingo-public-content',
    true,
    104857600,
    ARRAY[
      'image/png', 'image/jpeg', 'image/webp', 'image/avif',
      'video/mp4', 'audio/mpeg', 'audio/mp4',
      'application/json', 'model/gltf-binary'
    ]
  ),
  (
    'medlingo-user-private',
    'medlingo-user-private',
    false,
    20971520,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  ),
  (
    'medlingo-secure-exports',
    'medlingo-secure-exports',
    false,
    524288000,
    ARRAY['application/zip', 'application/json']
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

DROP POLICY IF EXISTS medlingo_secure_exports_read ON storage.objects;
CREATE POLICY medlingo_secure_exports_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medlingo-secure-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Broadcast is preferred over Postgres Changes for the million-user target.
-- One private per-user topic carries only compact projection changes.
DROP POLICY IF EXISTS medlingo_user_state_receive ON realtime.messages;
CREATE POLICY medlingo_user_state_receive ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    (SELECT realtime.topic())
      = 'user:' || (SELECT auth.uid())::text || ':state'
  );

CREATE TRIGGER broadcast_user_learning_state
AFTER INSERT OR UPDATE OR DELETE ON progress.user_learning_state
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_lesson_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.lesson_progress
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_path_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.path_progress
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_block_progress
AFTER INSERT OR UPDATE OR DELETE ON progress.block_progress
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_wallets
AFTER INSERT OR UPDATE OR DELETE ON commerce.wallets
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_inventory
AFTER INSERT OR UPDATE OR DELETE ON commerce.inventory
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();
CREATE TRIGGER broadcast_in_app_notifications
AFTER INSERT OR UPDATE OR DELETE ON engagement.in_app_notifications
FOR EACH ROW EXECUTE FUNCTION operations.broadcast_user_projection();

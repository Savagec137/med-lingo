-- MedLingo enterprise target schema
-- Supporting indexes for foreign keys that are not already the leading columns
-- of a primary key, unique constraint, or workload-specific index.
--
-- PostgreSQL does not create indexes automatically on referencing columns.
-- These indexes keep joins and parent-row referential checks predictable as
-- the platform grows to millions of users.

CREATE INDEX idx_profiles_avatar_asset_id ON iam.profiles (avatar_asset_id);
CREATE INDEX idx_user_sessions_device_id ON iam.user_sessions (device_id);
CREATE INDEX idx_security_events_device_id ON iam.security_events (device_id);
CREATE INDEX idx_user_roles_role_id ON iam.user_roles (role_id);
CREATE INDEX idx_user_roles_organization_id ON iam.user_roles (organization_id);
CREATE INDEX idx_user_roles_formation_id ON iam.user_roles (formation_id);
CREATE INDEX idx_user_roles_granted_by ON iam.user_roles (granted_by);

CREATE INDEX idx_assets_created_by ON media.assets (created_by);
CREATE INDEX idx_asset_licenses_evidence_asset_id ON media.asset_licenses (evidence_asset_id);

CREATE INDEX idx_source_documents_current_version_id ON knowledge.source_documents (current_version_id);
CREATE INDEX idx_source_versions_media_asset_id ON knowledge.source_versions (media_asset_id);
CREATE INDEX idx_source_versions_supersedes_version_id ON knowledge.source_versions (supersedes_version_id);
CREATE INDEX idx_regulatory_updates_source_document_id ON knowledge.regulatory_updates (source_document_id);
CREATE INDEX idx_regulatory_updates_source_version_id ON knowledge.regulatory_updates (source_version_id);
CREATE INDEX idx_regulatory_updates_reviewed_by ON knowledge.regulatory_updates (reviewed_by);
CREATE INDEX idx_concept_relationships_source_section_id ON knowledge.concept_relationships (source_section_id);
CREATE INDEX idx_concept_sources_source_section_id ON knowledge.concept_sources (source_section_id);

CREATE INDEX idx_formations_current_version_id ON learning.formations (current_version_id);
CREATE INDEX idx_formation_versions_source_version_id ON learning.formation_versions (source_version_id);
CREATE INDEX idx_formation_versions_created_by ON learning.formation_versions (created_by);
CREATE INDEX idx_lessons_current_version_id ON learning.lessons (current_version_id);
CREATE INDEX idx_lesson_versions_created_by ON learning.lesson_versions (created_by);
CREATE INDEX idx_lesson_objectives_objective_id ON learning.lesson_objectives (objective_id);
CREATE INDEX idx_path_prerequisites_prerequisite_path_id ON learning.path_prerequisites (prerequisite_path_id);
CREATE INDEX idx_content_releases_formation_version_id ON learning.content_releases (formation_version_id);
CREATE INDEX idx_content_releases_published_by ON learning.content_releases (published_by);

CREATE INDEX idx_question_banks_created_by ON practice.question_banks (created_by);
CREATE INDEX idx_lesson_question_banks_question_bank_id ON practice.lesson_question_banks (question_bank_id);
CREATE INDEX idx_questions_current_version_id ON practice.questions (current_version_id);
CREATE INDEX idx_question_versions_created_by ON practice.question_versions (created_by);
CREATE INDEX idx_answer_keys_choice_id ON practice.answer_keys (choice_id);
CREATE INDEX idx_explanations_choice_id ON practice.explanations (choice_id);
CREATE INDEX idx_question_assets_asset_id ON practice.question_assets (asset_id);
CREATE INDEX idx_exercise_definitions_current_version_id ON practice.exercise_definitions (current_version_id);
CREATE INDEX idx_exercise_versions_created_by ON practice.exercise_versions (created_by);
CREATE INDEX idx_lesson_exercises_exercise_version_id ON practice.lesson_exercises (exercise_version_id);
CREATE INDEX idx_hotspot_targets_hotspot_id ON practice.hotspot_targets (hotspot_id);
CREATE INDEX idx_flashcards_question_version_id ON practice.flashcards (question_version_id);
CREATE INDEX idx_flashcards_concept_id ON practice.flashcards (concept_id);

CREATE INDEX idx_structure_relationships_source_section_id ON anatomy.structure_relationships (source_section_id);
CREATE INDEX idx_models_model_asset_id ON anatomy.models (model_asset_id);
CREATE INDEX idx_models_preview_asset_id ON anatomy.models (preview_asset_id);
CREATE INDEX idx_model_nodes_parent_node_id ON anatomy.model_nodes (parent_node_id);

CREATE INDEX idx_cases_domain_id ON clinical.cases (domain_id);
CREATE INDEX idx_cases_current_version_id ON clinical.cases (current_version_id);
CREATE INDEX idx_case_versions_created_by ON clinical.case_versions (created_by);
CREATE INDEX idx_case_step_questions_question_version_id ON clinical.case_step_questions (question_version_id);
CREATE INDEX idx_case_sources_source_section_id ON clinical.case_sources (source_section_id);
CREATE INDEX idx_case_attempts_case_version_id ON clinical.case_attempts (case_version_id);
CREATE INDEX idx_case_attempts_device_id ON clinical.case_attempts (device_id);
CREATE INDEX idx_case_step_events_case_step_id ON clinical.case_step_events (case_step_id);
CREATE INDEX idx_case_step_events_decision_id ON clinical.case_step_events (decision_id);

CREATE INDEX idx_enrollments_formation_id ON progress.enrollments (formation_id);
CREATE INDEX idx_enrollments_formation_version_id ON progress.enrollments (formation_version_id);
CREATE INDEX idx_lesson_progress_current_lesson_version_id ON progress.lesson_progress (current_lesson_version_id);
CREATE INDEX idx_path_progress_path_id ON progress.path_progress (path_id);
CREATE INDEX idx_block_progress_block_id ON progress.block_progress (block_id);
CREATE INDEX idx_completion_records_path_id ON progress.completion_records (path_id);
CREATE INDEX idx_completion_records_block_id ON progress.completion_records (block_id);
CREATE INDEX idx_lesson_attempts_enrollment_id ON progress.lesson_attempts (enrollment_id);
CREATE INDEX idx_lesson_attempts_lesson_version_id ON progress.lesson_attempts (lesson_version_id);
CREATE INDEX idx_lesson_attempts_exercise_version_id ON progress.lesson_attempts (exercise_version_id);
CREATE INDEX idx_lesson_attempts_device_id ON progress.lesson_attempts (device_id);
CREATE INDEX idx_exercise_attempts_exercise_version_id ON progress.exercise_attempts (exercise_version_id);
CREATE INDEX idx_question_attempts_exercise_attempt_id ON progress.question_attempts (exercise_attempt_id);
CREATE INDEX idx_selected_choices_choice_id ON progress.selected_choices (choice_id);
CREATE INDEX idx_mistakes_question_id ON progress.mistakes (question_id);
CREATE INDEX idx_mastery_history_competency_id ON progress.mastery_history (competency_id);
CREATE INDEX idx_mastery_history_question_attempt_id ON progress.mastery_history (question_attempt_id);
CREATE INDEX idx_review_items_flashcard_id ON progress.review_items (flashcard_id);
CREATE INDEX idx_review_events_device_id ON progress.review_events (device_id);

CREATE INDEX idx_ranks_icon_asset_id ON gamification.ranks (icon_asset_id);
CREATE INDEX idx_badges_icon_asset_id ON gamification.badges (icon_asset_id);
CREATE INDEX idx_reward_components_currency_id ON gamification.reward_components (currency_id);
CREATE INDEX idx_reward_components_item_id ON gamification.reward_components (item_id);
CREATE INDEX idx_reward_components_badge_id ON gamification.reward_components (badge_id);
CREATE INDEX idx_reward_components_title_id ON gamification.reward_components (title_id);
CREATE INDEX idx_reward_components_chest_type_id ON gamification.reward_components (chest_type_id);
CREATE INDEX idx_reward_components_entitlement_id ON gamification.reward_components (entitlement_id);
CREATE INDEX idx_reward_grants_reward_bundle_id ON gamification.reward_grants (reward_bundle_id);
CREATE INDEX idx_xp_ledger_reward_grant_id ON gamification.xp_ledger (reward_grant_id);
CREATE INDEX idx_achievement_definitions_badge_id ON gamification.achievement_definitions (badge_id);
CREATE INDEX idx_achievement_definitions_reward_bundle_id ON gamification.achievement_definitions (reward_bundle_id);
CREATE INDEX idx_user_achievements_achievement_id ON gamification.user_achievements (achievement_id);
CREATE INDEX idx_user_badges_badge_id ON gamification.user_badges (badge_id);
CREATE INDEX idx_user_titles_title_id ON gamification.user_titles (title_id);
CREATE INDEX idx_mission_definitions_reward_bundle_id ON gamification.mission_definitions (reward_bundle_id);
CREATE INDEX idx_mission_occurrences_mission_definition_id ON gamification.mission_occurrences (mission_definition_id);
CREATE INDEX idx_user_mission_progress_mission_occurrence_id ON gamification.user_mission_progress (mission_occurrence_id);
CREATE INDEX idx_user_mission_progress_reward_grant_id ON gamification.user_mission_progress (reward_grant_id);
CREATE INDEX idx_leagues_rank_id ON gamification.leagues (rank_id);
CREATE INDEX idx_challenges_reward_bundle_id ON gamification.challenges (reward_bundle_id);
CREATE INDEX idx_challenge_participants_user_id ON gamification.challenge_participants (user_id);
CREATE INDEX idx_daily_reward_steps_reward_bundle_id ON gamification.daily_reward_steps (reward_bundle_id);
CREATE INDEX idx_daily_reward_claims_calendar_id ON gamification.daily_reward_claims (calendar_id);

CREATE INDEX idx_currency_definitions_icon_asset_id ON commerce.currency_definitions (icon_asset_id);
CREATE INDEX idx_wallet_ledger_currency_id ON commerce.wallet_ledger (currency_id);
CREATE INDEX idx_catalog_items_asset_id ON commerce.catalog_items (asset_id);
CREATE INDEX idx_catalog_prices_currency_id ON commerce.catalog_prices (currency_id);
CREATE INDEX idx_inventory_events_item_id ON commerce.inventory_events (item_id);
CREATE INDEX idx_purchase_order_lines_item_id ON commerce.purchase_order_lines (item_id);
CREATE INDEX idx_purchase_order_lines_product_id ON commerce.purchase_order_lines (product_id);
CREATE INDEX idx_purchase_order_lines_currency_id ON commerce.purchase_order_lines (currency_id);
CREATE INDEX idx_payment_events_order_id ON commerce.payment_events (order_id);
CREATE INDEX idx_user_subscriptions_plan_id ON commerce.user_subscriptions (plan_id);
CREATE INDEX idx_user_entitlements_entitlement_id ON commerce.user_entitlements (entitlement_id);
CREATE INDEX idx_user_entitlements_granted_by ON commerce.user_entitlements (granted_by);
CREATE INDEX idx_loot_tables_created_by ON commerce.loot_tables (created_by);
CREATE INDEX idx_loot_table_entries_currency_id ON commerce.loot_table_entries (currency_id);
CREATE INDEX idx_loot_table_entries_item_id ON commerce.loot_table_entries (item_id);
CREATE INDEX idx_loot_table_entries_badge_id ON commerce.loot_table_entries (badge_id);
CREATE INDEX idx_loot_table_entries_title_id ON commerce.loot_table_entries (title_id);
CREATE INDEX idx_loot_table_entries_chest_type_id ON commerce.loot_table_entries (chest_type_id);
CREATE INDEX idx_loot_table_entries_entitlement_id ON commerce.loot_table_entries (entitlement_id);
CREATE INDEX idx_chest_instances_chest_type_id ON commerce.chest_instances (chest_type_id);
CREATE INDEX idx_chest_instances_inventory_id ON commerce.chest_instances (inventory_id);
CREATE INDEX idx_chest_openings_loot_table_id ON commerce.chest_openings (loot_table_id);
CREATE INDEX idx_chest_openings_reward_grant_id ON commerce.chest_openings (reward_grant_id);
CREATE INDEX idx_chest_rewards_loot_entry_id ON commerce.chest_rewards (loot_entry_id);
CREATE INDEX idx_chest_rewards_currency_id ON commerce.chest_rewards (currency_id);
CREATE INDEX idx_chest_rewards_item_id ON commerce.chest_rewards (item_id);
CREATE INDEX idx_chest_rewards_badge_id ON commerce.chest_rewards (badge_id);
CREATE INDEX idx_chest_rewards_title_id ON commerce.chest_rewards (title_id);
CREATE INDEX idx_chest_rewards_chest_type_id ON commerce.chest_rewards (chest_type_id);
CREATE INDEX idx_chest_rewards_entitlement_id ON commerce.chest_rewards (entitlement_id);

CREATE INDEX idx_conversations_formation_id ON ai.conversations (formation_id);
CREATE INDEX idx_conversations_lesson_id ON ai.conversations (lesson_id);
CREATE INDEX idx_conversations_clinical_case_id ON ai.conversations (clinical_case_id);
CREATE INDEX idx_message_citations_source_section_id ON ai.message_citations (source_section_id);
CREATE INDEX idx_user_memories_source_conversation_id ON ai.user_memories (source_conversation_id);
CREATE INDEX idx_user_memories_source_message_id ON ai.user_memories (source_message_id);
CREATE INDEX idx_user_memories_superseded_by ON ai.user_memories (superseded_by);
CREATE INDEX idx_context_snapshots_user_id ON ai.context_snapshots (user_id);
CREATE INDEX idx_context_snapshots_formation_id ON ai.context_snapshots (formation_id);
CREATE INDEX idx_context_snapshots_lesson_id ON ai.context_snapshots (lesson_id);
CREATE INDEX idx_safety_events_user_id ON ai.safety_events (user_id);
CREATE INDEX idx_safety_events_conversation_id ON ai.safety_events (conversation_id);
CREATE INDEX idx_safety_events_message_id ON ai.safety_events (message_id);
CREATE INDEX idx_safety_events_reviewed_by ON ai.safety_events (reviewed_by);

CREATE INDEX idx_push_subscriptions_device_id ON engagement.push_subscriptions (device_id);
CREATE INDEX idx_notification_schedules_user_id ON engagement.notification_schedules (user_id);
CREATE INDEX idx_notification_schedules_template_id ON engagement.notification_schedules (template_id);
CREATE INDEX idx_notification_queue_template_version_id ON engagement.notification_queue (template_version_id);
CREATE INDEX idx_in_app_notifications_queue_id ON engagement.in_app_notifications (queue_id);

CREATE INDEX idx_learning_events_device_id ON analytics.learning_events (device_id);
CREATE INDEX idx_mastery_snapshots_competency_id ON analytics.mastery_snapshots (competency_id);

CREATE INDEX idx_content_review_requests_requested_by ON governance.content_review_requests (requested_by);
CREATE INDEX idx_content_review_requests_assigned_to ON governance.content_review_requests (assigned_to);
CREATE INDEX idx_content_review_decisions_reviewer_id ON governance.content_review_decisions (reviewer_id);
CREATE INDEX idx_data_retention_policies_approved_by ON governance.data_retention_policies (approved_by);
CREATE INDEX idx_data_export_requests_export_asset_id ON governance.data_export_requests (export_asset_id);
CREATE INDEX idx_data_erasure_requests_user_id ON governance.data_erasure_requests (user_id);
CREATE INDEX idx_moderation_cases_reporter_user_id ON governance.moderation_cases (reporter_user_id);
CREATE INDEX idx_moderation_cases_subject_user_id ON governance.moderation_cases (subject_user_id);
CREATE INDEX idx_moderation_cases_assigned_to ON governance.moderation_cases (assigned_to);
CREATE INDEX idx_moderation_actions_moderation_case_id ON governance.moderation_actions (moderation_case_id);
CREATE INDEX idx_moderation_actions_actor_user_id ON governance.moderation_actions (actor_user_id);
CREATE INDEX idx_moderation_actions_target_user_id ON governance.moderation_actions (target_user_id);

CREATE INDEX idx_application_errors_user_id ON operations.application_errors (user_id);
CREATE INDEX idx_application_errors_device_id ON operations.application_errors (device_id);
CREATE INDEX idx_bug_reports_reporter_user_id ON operations.bug_reports (reporter_user_id);
CREATE INDEX idx_bug_reports_assigned_to ON operations.bug_reports (assigned_to);
CREATE INDEX idx_feature_flags_created_by ON operations.feature_flags (created_by);
CREATE INDEX idx_feature_flag_overrides_feature_flag_id ON operations.feature_flag_overrides (feature_flag_id);
CREATE INDEX idx_feature_flag_overrides_formation_id ON operations.feature_flag_overrides (formation_id);
CREATE INDEX idx_feature_flag_overrides_created_by ON operations.feature_flag_overrides (created_by);
CREATE INDEX idx_maintenance_windows_created_by ON operations.maintenance_windows (created_by);

# Couverture des exigences et fusions normalisées

Ce document relie la demande produit aux agrégats retenus. Le détail exact de
chaque colonne, clé, contrainte, relation, cardinalité et index se trouve dans
[TABLE_CATALOG.md](TABLE_CATALOG.md).

| Besoin | Tables principales | Décision |
|---|---|---|
| Utilisateurs, profils, préférences, appareils, sessions, sécurité | `auth.users`, `iam.user_accounts`, `profiles`, `user_preferences`, `user_devices`, `user_sessions`, `external_identities`, `mfa_preferences`, `security_events`, `account_recovery_events`, `user_consents` | `auth.users` reste l’identité unique ; aucun secret ni JWT n’est recopié. |
| Admin, organisations, rôles et permissions | `organizations`, `organization_memberships`, `roles`, `permissions`, `role_permissions`, `user_roles` | RBAC normalisé et rôles limitables par organisme ou formation. |
| Formations, blocs, parcours, leçons, chapitres | `formations`, `formation_versions`, `blocks`, `paths`, `lessons`, `lesson_versions`, `chapters`, `lesson_metadata`, `content_releases` | Les identifiants stables sont séparés des versions publiées immuables. |
| Objectifs, compétences et prérequis | `learning_objectives`, `lesson_objectives`, `competencies`, `lesson_competencies`, `competency_prerequisites`, `lesson_prerequisites`, `path_prerequisites` | Les relations many-to-many ne sont jamais stockées en JSON. |
| Sources médicales, HAS, CSP, DEA, articles et versions | `source_documents`, `source_versions`, `source_sections`, `regulatory_updates`, `concept_sources`, `question_sources`, `case_sources` | L’autorité est une valeur contrôlée ; chaque preuve pointe vers une version et une section. |
| Master Knowledge Base et graphe médical | `medical_domains`, `medical_concepts`, `concept_relationships`, `concept_competencies`, `concept_embeddings`, `tags` | Graphe relationnel plus index sémantique ; dépendances/prérequis typés. |
| Banque pédagogique | `question_banks`, `lesson_question_banks`, `questions`, `question_versions`, `choices`, `answer_keys`, `explanations`, `hints`, `question_competencies`, `question_tags`, `question_assets` | La correction utilise des identifiants stables, jamais une position visuelle. |
| Types d’exercices | `exercise_definitions`, `exercise_versions`, `exercise_questions`, `lesson_exercises`, `matching_pairs`, `ordering_items`, `fill_blank_slots`, `hotspot_targets`, `calculation_rules` | Un registre commun supporte QCM, vrai/faux, association, ordre, texte à trous, anatomie, cas, drag-and-drop, hotspot, audio, vidéo et calcul. |
| SRS et flashcards | `flashcards`, `srs_profiles`, `review_items`, `review_events` | La file courante est une projection ; chaque révision reste une preuve append-only. |
| Anatomie | `body_systems`, `structures`, `structure_relationships`, `models`, `model_nodes`, `hotspots` | Os, muscles, organes, nerfs et vaisseaux partagent `structures.structure_type`; les séparer aurait dupliqué colonnes, sources et relations. |
| Cas cliniques | `cases`, `case_versions`, `case_steps`, `case_step_questions`, `case_decisions`, `case_attempts`, `case_step_events`, `case_feedback` | Scénarios versionnés et chemins de décision indépendants du moteur React. |
| Progression et maîtrise | `enrollments`, `user_learning_state`, `lesson_progress`, `path_progress`, `block_progress`, `completion_records`, `lesson_attempts`, `exercise_attempts`, `question_attempts`, `selected_choices`, `mistakes`, `competency_mastery`, `mastery_history`, `streak_days` | Événements et projections sont séparés pour audit, calcul et lecture mobile rapide. |
| XP, niveaux, rangs, badges et titres | `xp_ledger`, `levels`, `ranks`, `badges`, `titles`, `achievement_definitions`, `user_achievements`, `user_badges`, `user_titles` | XP append-only ; présentation et règle d’obtention restent séparées. |
| Missions, défis, saisons et classements | `mission_definitions`, `mission_occurrences`, `user_mission_progress`, `challenges`, `challenge_participants`, `seasons`, `leagues`, `league_memberships` | Les occurrences temporelles sont séparées des définitions réutilisables. |
| Boutique, monnaies, inventaire et Premium | `currency_definitions`, `wallets`, `wallet_ledger`, `catalog_items`, `catalog_prices`, `inventory`, `inventory_events`, `user_equipment`, `products`, `product_prices`, `purchase_orders`, `purchase_order_lines`, `payment_events`, `subscription_plans`, `user_subscriptions`, `entitlement_definitions`, `user_entitlements` | Coins, gemmes, clés, tickets et énergie sont des lignes de monnaie ; aucune table ou colonne par devise. |
| Coffres et récompenses | `chest_types`, `loot_tables`, `loot_table_entries`, `chest_instances`, `chest_openings`, `chest_rewards`, `reward_bundles`, `reward_components`, `reward_grants`, `daily_reward_calendars`, `daily_reward_steps`, `daily_reward_claims` | Tirage, résultat historique et attribution atomique sont trois responsabilités distinctes. |
| Pulse IA et adaptation | `conversations`, `messages`, `message_citations`, `user_memories`, `memory_embeddings`, `context_snapshots`, `recommendations`, `adaptive_learning_events`, `safety_events` | Mémoire consentie, citations et contrôles de sécurité sont auditables. |
| Notifications push, email et rappels | `notification_templates`, `notification_template_versions`, `notification_preferences`, `push_subscriptions`, `notification_schedules`, `notification_queue`, `notification_deliveries`, `in_app_notifications` | Push, email, rappel quotidien et rappel SRS utilisent le même pipeline multicanal. |
| Statistiques et rétention | `learning_events`, `user_daily_stats`, `user_weekly_stats`, `user_monthly_stats`, `content_daily_stats`, `question_quality_stats`, `cohort_retention`, `mastery_snapshots`, `heatmap_cells` | Les métriques sont dérivées et préagrégées ; les événements bruts sont partitionnés. |
| Médias | `assets`, `asset_variants`, `asset_localizations`, `asset_licenses` | Images, vidéo, audio, Lottie, 3D, PDF et illustrations sont distingués par `asset_kind`, sans tables identiques par format. |
| Gouvernance, RGPD et modération | `content_review_requests`, `content_review_decisions`, `audit_log`, `data_retention_policies`, `data_export_requests`, `data_erasure_requests`, `moderation_cases`, `moderation_actions` | Toute validation et action sensible conserve acteur, motif et horodatage. |
| Exploitation | `application_errors`, `bug_reports`, `feature_flags`, `feature_flag_overrides`, `maintenance_windows`, `idempotency_keys`, `outbox_events`, `sync_changes`, `device_sync_cursors`, `job_runs`, `schema_releases` | Observabilité, déploiement progressif et synchronisation offline sont des agrégats dédiés. |

## Éléments volontairement non transformés en tables

- **JWT, OAuth et Magic Link** : gérés par Supabase Auth ; la base ne stocke pas
  de jetons applicatifs en clair.
- **Coins, gemmes, clés, tickets et énergie** : lignes de
  `currency_definitions`, `wallets` et `wallet_ledger`.
- **Images, vidéos, audio, Lottie, PDF et 3D** : lignes typées de `media.assets`;
  les binaires sont dans Storage.
- **Os, muscles, organes, nerfs et vaisseaux** : lignes typées
  d’`anatomy.structures`.
- **Difficulté et rareté** : `ENUM` contrôlés car leurs valeurs sont fermées et
  participent aux contraintes ; Bloom utilise une contrainte fermée.
- **Catégories** : `medical_domains` hiérarchiques et `tags` couvrent les deux
  besoins sans créer une taxonomie concurrente.

Ces fusions réduisent la duplication sans perdre de relation, de contrainte ou
de possibilité d’indexation.

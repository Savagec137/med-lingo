# MedLingo Enterprise Database V1

Ce dossier contient la **cible d'architecture**, pas une migration à appliquer
directement en production.

## Pourquoi ce dossier n'est pas dans `supabase/migrations`

La base MedLingo déjà connectée contient des données et plusieurs objets
historiques (`wallets`, `user_currency`, `inventory`, `user_inventory`, etc.).
Exécuter toute la cible en une seule fois empêcherait une migration progressive,
les contrôles de volumétrie et un retour arrière propre.

La mise en production doit suivre cet ordre :

1. valider le modèle et les politiques RLS ;
2. appliquer les scripts sur une branche Supabase de test ;
3. régénérer les types TypeScript ;
4. exécuter les tests de sécurité, de charge et de compatibilité ;
5. créer des migrations additives par domaine ;
6. effectuer le double-write et le backfill contrôlé ;
7. basculer les lectures ;
8. archiver les objets historiques après une période d'observation.

## Ordre d'exécution en environnement de validation

1. `00_foundation.sql`
2. `10_identity.sql`
3. `20_content_knowledge.sql`
4. `30_learning_delivery.sql`
5. `40_progress_srs.sql`
6. `50_gamification_commerce.sql`
7. `60_ai_engagement_analytics.sql`
8. `70_governance_operations.sql`
9. `75_foreign_key_indexes.sql`
10. `80_functions_views.sql`
11. `85_reference_data.sql`
12. `90_rls_realtime_storage.sql`
13. `tests/schema_contract.sql` sur la base de validation

## Principes non négociables

- `auth.users` reste la source de vérité d'identité Supabase.
- Les domaines métier utilisent des schémas PostgreSQL séparés.
- Les écritures économiques passent uniquement par des fonctions atomiques.
- Les journaux financiers, XP, récompenses et audit sont append-only.
- Les contenus publiés sont immuables ; une correction crée une version.
- Les tentatives et événements volumineux sont conçus pour le partitionnement.
- Les suppressions utilisateur sont logiques avant purge réglementaire.
- Toutes les tables applicatives ont RLS activé et forcé ; l'absence de
  politique vaut refus.
- Seul le schéma `api` est exposé à la Data API ; les fonctions privilégiées
  restent dans les schémas de domaine privés.
- Realtime utilise des canaux Broadcast privés par utilisateur.
- Les fonctions `SECURITY DEFINER` ont un `search_path` vide et des droits
  d'exécution minimaux.
- Les mutations mobiles portent une clé d'idempotence.

## Compatibilité

Les tables `public.*` actuelles restent intactes. Le plan de migration détaillé
se trouve dans `docs/database/MIGRATION_PLAN.md`.

# Références techniques officielles

Ces références fixent les choix d’implémentation de la cible V1. Elles ne
remplacent pas les tests sur la version PostgreSQL et les extensions réellement
disponibles dans le projet Supabase de validation.

## PostgreSQL

- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) :
  défaut deny, politiques par commande et `FORCE ROW LEVEL SECURITY`.
- [Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html) :
  partitionnement déclaratif, pruning et choix raisonné de la clé temporelle.
- [Indexes](https://www.postgresql.org/docs/current/indexes.html) :
  B-tree, index multicolonnes, partiels et types d’accès.
- [Full Text Search](https://www.postgresql.org/docs/current/textsearch.html) :
  `TSVECTOR`, dictionnaires et index GIN.

## Supabase

- [Using Custom Schemas](https://supabase.com/docs/guides/api/using-custom-schemas) :
  configuration explicite des schémas exposés à la Data API.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) :
  politiques `auth.uid()`, index des colonnes RLS et précautions sur
  `SECURITY DEFINER`.
- [Realtime database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) :
  Broadcast privé retenu pour l’échelle ; Postgres Changes réservé aux usages
  simples et peu connectés.
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) :
  contrôle des topics privés par politique sur `realtime.messages`.
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) :
  politiques sur `storage.objects` et séparation public/privé.
- [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) :
  option d’intégration asynchrone complémentaire à l’outbox.

## Extensions

- [pgvector](https://github.com/pgvector/pgvector) :
  stockage vectoriel, distance cosinus et index HNSW.
- [Supabase database extensions](https://supabase.com/docs/guides/database/extensions) :
  disponibilité et activation contrôlée par environnement.

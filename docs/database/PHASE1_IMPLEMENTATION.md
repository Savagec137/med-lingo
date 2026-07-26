# Mise en œuvre de la migration Enterprise Phase 1

Date : 26 juillet 2026

## Statut

La migration additive Phase 1 est générée et validée localement. Elle n’a pas
été appliquée au projet Supabase connecté, car l’environnement local ne dispose
ni de Supabase CLI, ni d’un jeton administrateur Supabase, ni d’une branche
Supabase de validation confirmée.

Le fichier prêt à tester est :

`supabase/migrations/20260726120000_enterprise_phase1_foundation.sql`

## Périmètre

Cette première migration crée 83 tables réparties entre :

- `iam` ;
- `media` ;
- `knowledge` ;
- `learning` ;
- `practice` ;
- `anatomy` ;
- `clinical`.

Elle installe également :

- les extensions PostgreSQL requises ;
- les types et fonctions partagés ;
- les index de clés étrangères ;
- les rôles et permissions MedLingo ;
- le backfill des identités `auth.users` vers `iam` ;
- le rôle `learner` pour les comptes existants et futurs ;
- un déclencheur d’initialisation pour les nouveaux comptes ;
- la fonction serveur de correction des exercices ;
- la vue mobile `api.published_curriculum` ;
- la recherche sémantique `api.search_medical_concepts` ;
- RLS activé et forcé sur les 83 tables ;
- des politiques IAM limitées au propriétaire ;
- une politique d’administration du contenu fondée sur
  `content.manage` ;
- les buckets `medlingo-public-content` et `medlingo-user-private`.

## Garantie de compatibilité

La migration ne contient aucun :

- `DROP TABLE` ;
- `DROP SCHEMA` ;
- `DROP COLUMN` ;
- `TRUNCATE` ;
- `DELETE FROM` ;
- `INSERT`, `UPDATE` ou `ALTER TABLE` ciblant une table `public`.

Les anciennes tables publiques et les lectures actuelles de l’application ne
sont donc pas basculées pendant cette phase.

## Validation effectuée

| Contrôle                                             | Résultat       |
| ---------------------------------------------------- | -------------- |
| Taille                                               | 104 346 octets |
| Instructions SQL                                     | 434            |
| Tables créées                                        | 83             |
| Tables commentées                                    | 83 sur 83      |
| Cibles de clés étrangères absentes                   | 0              |
| Références `regclass` absentes                       | 0              |
| Fonctions `SECURITY DEFINER`                         | 3              |
| Fonctions `SECURITY DEFINER` sans `search_path` vide | 0              |
| Parseur PostgreSQL                                   | réussi         |
| Parseur PL/pgSQL                                     | réussi         |
| Mutation d’une table `public` existante              | aucune         |

## Étape distante obligatoire

La migration doit être installée d’abord sur une branche Supabase de test.
Après installation :

1. exécuter le contrat `supabase/architecture/v1/tests/schema_contract.sql` ;
2. tester RLS avec deux comptes distincts et `service_role` ;
3. vérifier le backfill des comptes sans modifier `public.profiles` ;
4. tester la création d’un nouvel utilisateur ;
5. charger un petit curriculum `draft`, puis `published` ;
6. vérifier que les clés de correction ne sont jamais lisibles directement ;
7. tester les deux buckets Storage ;
8. régénérer les types TypeScript avec les schémas Phase 1 ;
9. mesurer les principales lectures avec `EXPLAIN (ANALYZE, BUFFERS)`.

La progression, l’économie, les coffres, Pulse IA et les analytics seront
migrés dans les phases suivantes, après observation du socle.

# Architecture SGBD officielle MedLingo — V1

## Statut

Cette version est une **architecture cible validable**, conçue pour devenir la
base officielle de MedLingo. Elle n'est volontairement pas placée dans
`supabase/migrations` : la base connectée contient déjà des utilisateurs, des
progressions et une économie active. La transition doit être progressive,
testée et réversible.

## Livrables

- [Architecture générale](ARCHITECTURE.md)
- [Dictionnaire détaillé des 195 tables](TABLE_CATALOG.md)
- [Relations et diagrammes ERD](ERD.md)
- [Diagrammes UML et séquences](UML.md)
- [Couverture des exigences et fusions normalisées](REQUIREMENTS_COVERAGE.md)
- [Sécurité et exploitation Supabase](SUPABASE_OPERATIONS.md)
- [Audit et plan de migration de la base actuelle](MIGRATION_PLAN.md)
- [Références techniques officielles](REFERENCES.md)
- [Rapport de validation mécanique](VALIDATION_REPORT.json)
- [Synthèse de validation](VALIDATION_SUMMARY.md)
- [SQL complet](../../supabase/architecture/v1/README.md)

## Chiffres clés

| Élément                        |                                                              Valeur |
| ------------------------------ | ------------------------------------------------------------------: |
| Contextes métier               |                                                                  15 |
| Tables logiques documentées    |                                                                 195 |
| Partitions physiques initiales |                                                                   2 |
| Index explicites               |                                                                 337 |
| Extensions                     | `pgcrypto`, `uuid-ossp`, `citext`, `pg_trgm`, `btree_gin`, `vector` |
| Vues API initiales             |                                                                   5 |
| Stockage Supabase              |                                                           3 buckets |
| Realtime                       |                                   7 projections via Broadcast privé |

Ce nombre de tables ne vient pas d'une recherche de volume artificiel. Il
résulte de quatre exigences : historique immuable, versionnement du contenu,
relations many-to-many normalisées et séparation entre référentiels et états
utilisateur. Les fusions qui améliorent réellement le modèle ont été retenues :

- `auth.users` reste l'unique table d'identité, sans copie de mot de passe ou JWT ;
- une seule table `anatomy.structures` représente os, muscles, organes, nerfs et
  vaisseaux grâce à `structure_type` ;
- une seule table `media.assets` représente image, vidéo, audio, Lottie, PDF et
  modèle 3D ;
- une seule paire `commerce.wallets` / `commerce.wallet_ledger` gère toutes les
  monnaies ;
- un seul `commerce.inventory` gère tous les objets ;
- un seul moteur `practice.questions` / `question_versions` alimente leçons,
  quiz, Boss, SRS, Pulse et Intervention.

## Décision de mise en production

La validation actuelle couvre la cohérence statique de l'architecture. Avant
toute application sur le Supabase connecté, il reste obligatoire de :

1. créer une branche Supabase de test ;
2. exécuter le SQL avec les versions d'extensions réellement disponibles ;
3. tester les RLS avec deux utilisateurs et un rôle service ;
4. réaliser un backfill sur une copie anonymisée ;
5. mesurer les requêtes critiques avec `EXPLAIN (ANALYZE, BUFFERS)` ;
6. régénérer les types TypeScript multi-schémas ;
7. déployer domaine par domaine.

Les tests de contrat PostgreSQL sont fournis dans
[`supabase/architecture/v1/tests`](../../supabase/architecture/v1/tests/README.md).

# Architecture générale

## Objectifs de conception

La base est conçue pour plusieurs millions d'utilisateurs, plusieurs formations,
des dizaines de milliers d'exercices et dix années d'évolution. Les priorités
sont, dans cet ordre :

1. exactitude médicale, réglementaire et économique ;
2. isolation des données par RLS ;
3. traçabilité et reproductibilité ;
4. compatibilité mobile/offline ;
5. lecture rapide des écrans ;
6. évolutivité organisationnelle et technique.

## Contextes DDD

| Schéma | Responsabilité | Source de vérité |
|---|---|---|
| `iam` | compte, profil, préférences, appareils, sessions, MFA, rôles, permissions, organismes, consentements | identité et autorisation applicatives |
| `media` | métadonnées, variantes, traductions et licences des médias | catalogue média ; binaires dans Storage |
| `knowledge` | sources, versions, articles/pages, compétences, concepts et graphe médical | Master Knowledge Base |
| `learning` | formations, blocs, parcours, leçons, versions, objectifs et prérequis | curriculum publié |
| `practice` | banques, questions, choix, corrections, exercices et flashcards | moteur pédagogique |
| `anatomy` | systèmes, structures, relations, modèles 3D et hotspots | référentiel anatomique |
| `clinical` | cas, étapes, décisions, tentatives et débriefs | moteur de cas cliniques |
| `progress` | inscriptions, progression, tentatives, erreurs, maîtrise, séries et SRS | état d'apprentissage |
| `gamification` | XP, niveaux, rangs, badges, titres, missions, défis, ligues et récompenses | règles et historique ludique |
| `commerce` | monnaies, ledger, boutique, inventaire, paiements, premium et coffres | économie et droits payants |
| `ai` | conversations Pulse, messages, mémoire, contexte, recommandations et sécurité | historique IA auditable |
| `engagement` | modèles, préférences, files et historique des notifications | communication utilisateur |
| `analytics` | événements et agrégats jour/semaine/mois, qualité et rétention | analytique dérivée |
| `governance` | validation, audit, RGPD et modération | contrôle et conformité |
| `operations` | erreurs, bugs, flags, maintenance, idempotence, outbox, sync et jobs | exploitation technique |
| `api` | vues et wrappers RPC `SECURITY INVOKER` exposés aux clients | contrat de lecture/commande |

## Règles d'agrégats

- `auth.users` est la racine d'identité. `iam.user_accounts` est uniquement sa
  projection métier.
- Une formation publiée pointe vers une `formation_version` immuable.
- Une leçon stable pointe vers une `lesson_version` immuable.
- Une question stable pointe vers une `question_version` immuable.
- Toute tentative conserve les identifiants des versions réellement jouées.
- Un solde est une projection ; le ledger est la preuve comptable.
- Un inventaire est une projection ; `inventory_events` est la preuve.
- Une maîtrise est une projection ; `mastery_history` et les tentatives sont les
  preuves recalculables.
- Une récompense est une transaction idempotente coordonnant XP, monnaies,
  inventaire, badge, titre et coffre.

## Normalisation

Le modèle respecte la 3NF au minimum :

- pas de colonnes `coins`, `gems`, `keys` répétées : une ligne par monnaie ;
- pas de prix par monnaie sur l'article : une ligne `catalog_prices` ;
- pas de réponse correcte encodée par position : `answer_keys.choice_id` ;
- pas de listes de compétences copiées dans les leçons : tables de jonction ;
- pas de source sous forme de texte libre : document → version → section ;
- pas de contenu modifié en place après publication : version suivante ;
- pas de badges confondus avec les conditions d'obtention : présentation et
  achievement sont séparés.

`JSONB` est réservé aux configurations extensibles, snapshots, payloads
événementiels et données de rendu dont les clés ne justifient pas encore une
relation stable. Les identités, relations, montants, scores et droits ne sont
jamais enfouis dans du JSON.

## Types PostgreSQL

Les types structurants sont `UUID`, `TIMESTAMPTZ`, `JSONB`, tableaux typés,
`ENUM`, `NUMERIC`, `BOOLEAN`, `TEXT`, `VECTOR` et `TSVECTOR`.

Des types numériques spécialisés (`SMALLINT`, `INTEGER`, `BIGINT`) sont
volontairement utilisés pour les positions, compteurs et identités monotones :
les représenter en `NUMERIC` augmenterait l'espace et le coût CPU sans bénéfice.
`DATE`, `TIME` et `INTERVAL` sont indispensables pour les journées locales, les
heures silencieuses et les politiques de conservation. `INDEX` n'est pas un
type PostgreSQL ; il s'agit d'un objet d'accès.

## Lecture et écriture

Le client mobile lit :

- des vues `api.*` pour les écrans agrégés ;
- des tables de catalogue publiées avec pagination ;
- ses propres projections (progression, portefeuille, inventaire, notifications).

Il ne modifie jamais directement :

- XP, maîtrise ou progression validée ;
- monnaies ou inventaire ;
- corrections ;
- récompenses et coffres ;
- rôles, premium ou autorisations ;
- statistiques agrégées.

Ces écritures passent par des fonctions atomiques ou des Edge Functions.
Seul le schéma `api` est exposé par la Data API. Ses wrappers sont
`SECURITY INVOKER` et appellent des fonctions métier privilégiées conservées
dans les schémas non exposés.

## Échelle

- Les routes à fort trafic lisent des projections compactes, pas les journaux.
- Les journaux sont indexés par `(user_id, created_at DESC)`.
- Les événements analytics et l'audit sont partitionnés par date.
- Les classements sont répartis en cohortes de ligue pour éviter une ligne
  globale chaude.
- Le contenu et les médias utilisent versions/checksums pour un cache CDN long.
- Les écritures asynchrones utilisent une outbox transactionnelle.
- Les agrégats quotidiens, hebdomadaires et mensuels évitent les scans de
  milliards d'événements.
- `pgvector` HNSW sert la recherche sémantique des concepts et mémoires Pulse.
- Les changements d’état utilisateur sont diffusés par Broadcast privé, avec
  un topic autorisé par utilisateur, plutôt que par Postgres Changes.

## Cohérence

- Transactions avec verrouillage de ligne pour monnaies, inventaire et XP.
- Clé d'idempotence par mutation mobile.
- Contraintes `CHECK` sur montants, scores, états et cardinalités.
- Triggers append-only sur les journaux critiques.
- `server_revision` et flux `sync_changes` pour le rapprochement offline.
- Toutes les fonctions privilégiées utilisent `SET search_path = ''`.

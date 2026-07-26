# Supabase, sécurité, performance et exploitation

## Authentification

Supabase Auth gère :

- JWT d'accès et refresh tokens ;
- email/mot de passe ;
- OAuth ;
- Magic Link ;
- facteurs MFA et assurance AAL ;
- révocation des sessions.

La base ne copie aucun secret. `iam.user_accounts` ne contient que l'état métier.
`iam.external_identities`, `user_sessions` et `mfa_preferences` sont des
projections d'audit et d'expérience utilisateur.

Les rôles Premium ne sont pas placés dans un champ modifiable du profil :

- les autorisations administratives utilisent RBAC ;
- Premium utilise `user_subscriptions` puis `user_entitlements` ;
- les claims JWT peuvent contenir un cache court des droits, mais la base reste
  la source de vérité pour une opération sensible.

## RLS

Toutes les tables des schémas applicatifs ont `ENABLE ROW LEVEL SECURITY` et
`FORCE ROW LEVEL SECURITY`.

| Catégorie | Lecture | Écriture |
|---|---|---|
| Profil et préférences | propriétaire | propriétaire, champs limités |
| Appareils et notifications | propriétaire | propriétaire |
| Progression/tentatives | propriétaire | fonctions métier |
| XP/monnaies/inventaire | propriétaire | fonctions atomiques uniquement |
| Contenu publié | utilisateur authentifié | éditeur autorisé/service |
| Corrections/loot | aucune lecture directe | service uniquement |
| IA | propriétaire | message utilisateur et mémoire consentie |
| Analytics/audit | pas d'accès client brut | workers/service |
| Administration | permission explicite | permission explicite |

Une requête sans politique correspondante est refusée. Le `service_role` ne doit
jamais se trouver dans Expo, dans le navigateur ou dans une variable publique.

## Fonctions privilégiées

Toute fonction `SECURITY DEFINER` :

- utilise `SET search_path = ''` ;
- qualifie chaque table par son schéma ;
- vérifie `auth.uid()` ou le rôle service ;
- possède une clé d'idempotence quand elle modifie une valeur ;
- verrouille les projections sensibles avec `FOR UPDATE` ;
- refuse les soldes négatifs et les doubles crédits ;
- voit son droit `EXECUTE` révoqué à `PUBLIC` et `anon`.

Les fonctions de niveau 1 livrées couvrent l'amorçage utilisateur, la correction
des exercices pris en charge, l'enregistrement des réponses, la fin de leçon, le
ledger de monnaie, l'inventaire, l'XP, les récompenses, l'achat en monnaie
virtuelle, l'ouverture de coffre et la récompense quotidienne. Les mutations
SRS avancées, le paiement réel et l'administration seront livrés dans leurs
migrations de domaine avec tests transactionnels avant activation.

## Surface Data API

Dans **Project Settings → API → Exposed schemas**, exposer uniquement `api`.
Les schémas de domaine (`iam`, `learning`, `practice`, `progress`, `commerce`,
etc.) restent privés. Les vues et wrappers du schéma `api` utilisent
`SECURITY INVOKER`; les implémentations `SECURITY DEFINER` restent dans les
schémas non exposés et vérifient l'identité, l'idempotence et les invariants.

Régénérer les types en incluant le schéma public historique, le contrat `api`
et les schémas utilisés côté serveur. Le client Expo ne reçoit que les types
de son contrat `api`.

## Storage

| Bucket | Visibilité | Contenu |
|---|---|---|
| `medlingo-public-content` | public/CDN | illustrations, audio, vidéo, Lottie et modèles 3D publiés |
| `medlingo-user-private` | dossier propriétaire | avatar importé, pièce jointe privée autorisée |
| `medlingo-secure-exports` | signé, temporaire | export RGPD chiffré |

Les métadonnées et droits vivent dans `media.*`. Les gros binaires ne sont
jamais stockés en `BYTEA` dans PostgreSQL. Les chemins privés commencent par
l'UUID utilisateur. Les variantes WebP/AVIF, vidéo mobile et 3D low-poly sont
des lignes `asset_variants`.

## Realtime

Realtime utilise **Broadcast privé**, plus adapté à une forte montée en charge
que Postgres Changes. Sept projections légères déclenchent un message :

- état XP/cœurs/série ;
- progression leçon/parcours/bloc ;
- portefeuille ;
- inventaire ;
- notifications in-app.

Le topic est `user:<uuid>:state`. Une politique sur `realtime.messages` compare
le topic demandé à `auth.uid()`, de sorte qu'un utilisateur ne peut rejoindre
que son canal. Activer le mode **private channels only** dans les paramètres
Realtime et utiliser `private: true` dans Expo.

Les journaux XP, monnaies, inventaire, tentatives, audit et analytics ne sont
pas diffusés. Ils sont paginés. Cette limite évite la saturation des connexions
WebSocket et les contrôles RLS répétés pour chaque ligne.

## Offline First

### Écriture

Chaque mutation mobile porte :

- un identifiant client ;
- une clé d'idempotence UUID ;
- la version du contenu ;
- l'identifiant de l'appareil ;
- l'heure client à titre informatif.

Le serveur décide du score, des récompenses et de la progression. Il produit une
révision dans `operations.sync_changes`.

### Lecture

Le client conserve `last_pulled_revision` par appareil. Il demande les
changements supérieurs à ce curseur, applique les upserts/tombstones dans une
transaction locale, puis accuse réception. Les tombstones sont conservés au
moins 90 jours ; un appareil plus ancien reçoit `full_resync_required`.

### Conflits

- préférences : dernière écriture serveur acceptée ;
- progression : maximum/best score et événements append-only ;
- SRS : l'événement de révision est conservé puis l'état est recalculé ;
- monnaies/inventaire/XP : serveur uniquement, jamais de merge client ;
- contenu : version immuable, cache invalidé par checksum de release.

## Edge Functions

Edge Functions recommandées :

1. `content-session` : délivre une session d'exercices sans corrections ;
2. `submit-learning-attempt` : orchestre fin de leçon et événement outbox ;
3. `open-chest` : tirage serveur, nonce et preuve exactement une fois ;
4. `purchase` : checkout virtuel ou réel ;
5. `stripe-webhook` : vérification de signature et synchronisation Premium ;
6. `pulse-chat` : sécurité, RAG sourcé, mémoire consentie ;
7. `sync` : mutations/pull offline paginés ;
8. `notification-worker` : file, retry et invalidation des tokens ;
9. `data-export` / `data-erasure` : RGPD ;
10. `partition-maintenance` : création et archivage des partitions.

## Index et recherche

- B-tree : clés étrangères, ordre chronologique, statut et curseurs.
- Composite : `(user_id, created_at DESC)`, `(parent_id, status, position)`.
- Partiels : notifications non lues, éléments SRS dus, sessions actives,
  outbox non publiée.
- GIN JSONB : configurations interrogées et payloads contrôlés.
- GIN tableau : synonymes, compétences d'erreurs et contextes.
- `pg_trgm` : noms, clés stables et titres.
- `TSVECTOR` : sources et concepts.
- HNSW `pgvector` : concepts et mémoire Pulse.

Toute requête critique doit être vérifiée avec `EXPLAIN (ANALYZE, BUFFERS)` sur
un jeu de données représentatif, pas uniquement sur une base vide.

## Partitionnement

`analytics.learning_events` et `governance.audit_log` sont partitionnées par
`occurred_at`, avec une partition par défaut de sécurité. En production :

- partitions mensuelles créées trois mois à l'avance ;
- index locaux vérifiés automatiquement ;
- données anciennes exportées en stockage froid selon la rétention ;
- aucune requête sans borne temporelle sur ces tables ;
- `job_runs` conserve l'état du job de maintenance.

Les tentatives et ledgers restent non partitionnés au départ, mais leur clé et
leurs index sont compatibles avec une migration vers des partitions quand la
mesure réelle le justifie.

## Cache

- curriculum publié : cache par `release_key` + `manifest_checksum` ;
- médias publics : URL versionnée et cache CDN long ;
- catalogue boutique : cache court avec invalidation à publication ;
- profil/progression : cache React Query + Realtime ;
- réponses sensibles et portefeuille : pas de cache partagé ;
- Pulse : embeddings et retrieval cachés par hash de contexte, jamais par texte
  personnel brut.

## Sauvegarde et continuité

- PITR Supabase activé pour la production ;
- sauvegarde logique quotidienne des catalogues et règles ;
- test de restauration trimestriel ;
- export séparé des sources et médias ;
- RPO et RTO documentés par environnement ;
- migration destructive interdite sans sauvegarde testée et plan de rollback.

## Observabilité

- `request_id` et `correlation_id` traversent RPC, outbox et workers ;
- erreurs privées dédupliquées par fingerprint ;
- latences et échecs de jobs dans `operations.job_runs` ;
- alertes sur drift ledger/projection, file bloquée, échec webhook, RLS et
  partitions manquantes ;
- aucune donnée sensible brute dans logs, erreurs ou analytics.

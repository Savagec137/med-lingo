# Audit et plan de migration de la base actuelle

## Conclusion de l'audit

La base actuelle est fonctionnelle, mais elle a été construite par sprints. Elle
contient 21 tables publiques et plusieurs générations du même domaine. La cible
V1 ne doit donc pas remplacer brutalement `public.*`.

### Risques confirmés dans les migrations du dépôt

1. `wallets` et `user_currency` représentent tous deux le solde.
2. `coin_transactions` et `currency_transactions` sont deux ledgers partiels.
3. `user_inventory` et `inventory` représentent tous deux la possession.
4. Les migrations `20260716180000` et `20260716192823` contiennent la même
   fondation d'inventaire avec des variantes de politiques.
5. Les migrations `20260716223000` et `20260717031038` répètent la
   personnalisation de profil.
6. Plusieurs anciennes politiques permettent au client d'insérer directement
   des transactions XP, monnaie, badges ou inventaire.
7. Plusieurs fonctions historiques utilisent `SET search_path = public` :
   acceptable pour le prototype, mais inférieur au standard cible
   `search_path = ''` avec noms qualifiés.
8. Les loot tables et récompenses historiques sont des objets JSONB sans toutes
   les contraintes relationnelles nécessaires à un audit économique.
9. `user_progress.completed_lessons` stocke une relation métier en JSONB.
10. Les identifiants de leçon en `TEXT` ne garantissent pas l'existence d'une
    version publiée.

Ces constats décrivent une dette de transition, pas une perte de données.

## Correspondance legacy → cible

| Table actuelle | Cible | Décision |
|---|---|---|
| `public.profiles` | `iam.user_accounts`, `iam.profiles` | backfill puis compatibilité |
| `public.user_progress` | `progress.user_learning_state`, `lesson_progress` | décomposer l'agrégat et le JSONB |
| `public.lesson_attempts` | `progress.lesson_attempts` | conserver l'historique, rattacher les versions si possible |
| `public.srs_cards` | `practice.flashcards`, `progress.review_items` | convertir l'item_key en FK stable |
| `public.badges` | `gamification.badges` | conserver les codes |
| `public.user_badges` | `gamification.user_badges` | backfill idempotent |
| `public.xp_transactions` | `gamification.xp_ledger` | journal historique signé comme import |
| `public.missions` | `mission_definitions` + `mission_occurrences` | séparer règle et fenêtre |
| `public.user_missions` | `user_mission_progress` | lier à l'occurrence |
| `public.wallets` | `commerce.wallets` | source legacy temporaire |
| `public.user_currency` | `commerce.wallets` | miroir à réconcilier, pas seconde source |
| `public.coin_transactions` | `commerce.wallet_ledger` | importer coins/gems |
| `public.currency_transactions` | `commerce.wallet_ledger` | importer gems/keys/energy |
| `public.shop_items` | `catalog_items`, `catalog_prices` | séparer article et prix |
| `public.user_inventory` | `commerce.inventory` | fusion par utilisateur/article |
| `public.inventory` | `commerce.inventory` | réconcilier les quantités |
| `public.loot_tables` | `loot_tables`, `loot_table_entries` | normaliser chaque entrée |
| `public.chest_openings` | `chest_instances`, `chest_openings`, `chest_rewards` | préserver le snapshot JSON |
| `public.reward_history` | `reward_grants` | importer comme snapshot legacy |
| `public.daily_rewards` | `daily_reward_claims` | relier à un calendrier |
| `public.user_profile_customization` | `commerce.user_equipment` | convertir la carte équipée |

## Règles de réconciliation

### Monnaies

Pour chaque utilisateur :

1. comparer `wallets` et `user_currency` ;
2. vérifier que les sommes des journaux expliquent le solde quand l'historique
   est complet ;
3. choisir explicitement la valeur autoritative ;
4. écrire une ligne d'import dans `wallet_ledger` avec le solde initial ;
5. enregistrer tout écart dans un rapport, jamais le masquer ;
6. activer le double-write ;
7. comparer quotidiennement les projections avant bascule.

Il est interdit d'additionner `wallets.coins` et `user_currency.coins` : ce sont
deux vues du même argent, pas deux avoirs.

### Inventaire

- Une possession non empilable devient quantité `1`, même si elle apparaît dans
  les deux tables.
- Une quantité empilable n'est additionnée que si les événements prouvent deux
  acquisitions distinctes.
- Tout conflit non explicable est exporté pour décision manuelle.
- L'équipement est appliqué uniquement après vérification de possession.

### Progression

- Les tentatives sont importées avant les agrégats.
- Le meilleur score et les étoiles sont recalculés depuis l'historique quand il
  est complet.
- Le JSON `completed_lessons` est transformé en lignes `lesson_progress`.
- Une leçon inconnue est conservée dans une table de quarantaine d'import et
  n'est jamais inventée dans le curriculum.

## Plan par phases

### Phase 0 — Validation

- Branche Supabase de test.
- Snapshot et inventaire de production.
- Exécution de la cible.
- Tests RLS multi-utilisateurs.
- Tests d'extensions et de performance.

### Phase 1 — Socle additif

- Schémas, types, IAM, média, connaissance et curriculum.
- Aucun changement des lectures actuelles.
- Import des catalogues et clés stables.

### Phase 2 — Progression

- Backfill tentatives et progression.
- Double-write côté Edge Function.
- Comparaison des agrégats pendant au moins sept jours.
- Bascule des lectures par feature flag.

### Phase 3 — Économie

- Backfill et réconciliation financière.
- Gel temporaire des achats pendant la bascule finale.
- Test achat, récompense, coffre, quotidien et reconnexion.
- Contrôle exact des totaux avant/après.

### Phase 4 — SRS, IA, notifications et analytics

- Import SRS.
- Consentement explicite avant mémoire Pulse.
- Outbox et workers.
- Agrégats analytics sans données sensibles inutiles.

### Phase 5 — Retrait legacy

Les tables `public.*` ne sont retirées qu'après :

- 30 jours sans lecture/écriture legacy ;
- export d'archive ;
- restauration testée ;
- accord produit et technique ;
- migration destructive séparée et réversible.

## Contrôles de bascule

- nombre de comptes identique ;
- aucune monnaie négative ;
- somme des balances avant/après documentée ;
- nombre de possessions non empilables cohérent ;
- aucun coffre ouvert deux fois ;
- aucun XP crédité deux fois ;
- progression et séries identiques ;
- tests RLS avec Alice/Bob/service ;
- application fonctionnelle après déconnexion/reconnexion ;
- rollback chronométré.

## Ce que ces fichiers ne font pas

Ils n'ont pas appliqué de migration à Supabase et n'ont modifié aucune table
actuelle. C'est intentionnel : la prochaine étape est de produire une migration
additive de **Phase 1** après validation de cette architecture, pas de coller les
195 tables en production en une seule opération.

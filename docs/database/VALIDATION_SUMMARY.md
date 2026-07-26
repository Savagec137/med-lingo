# Validation de l’architecture SGBD MedLingo V1

Date de contrôle : 26 juillet 2026

## Résultat

L’architecture cible est cohérente au niveau statique et syntaxique. Elle reste
volontairement hors de `supabase/migrations` tant que les tests sur une branche
Supabase isolée, le backfill et les mesures de charge n’ont pas été réalisés.

| Contrôle                                         | Résultat          |
| ------------------------------------------------ | ----------------- |
| Schémas métier                                   | 15                |
| Tables logiques                                  | 195               |
| Partitions physiques initiales                   | 2                 |
| Commentaires de table                            | 195 sur 195       |
| Index explicites                                 | 337               |
| Clés étrangères sans index directeur             | 0                 |
| Fichiers SQL d’architecture                      | 12                |
| Instructions analysées par le parseur PostgreSQL | 1 049             |
| Contrat SQL analysé                              | 3 instructions    |
| Erreurs du validateur d’architecture             | 0                 |
| Avertissements du validateur d’architecture      | 0                 |
| Tests applicatifs                                | 74 réussis sur 74 |
| TypeScript strict (`tsc --noEmit`)               | réussi            |
| Build de production                              | réussi            |
| ESLint du validateur SGBD                        | réussi            |

## Contrôles de sécurité automatisés

Le validateur vérifie notamment :

- l’activation et le forçage de RLS sur toutes les tables applicatives ;
- l’absence de droit d’exécution dangereux pour `anon` ou `public` ;
- le `search_path` vide des fonctions `SECURITY DEFINER` ;
- la séparation entre fonctions publiques `api` et fonctions privilégiées ;
- les clés d’idempotence des mutations économiques et mobiles ;
- l’existence des politiques Storage et Realtime Broadcast privées ;
- la présence d’un index directeur pour chaque clé étrangère.

Le contrat PostgreSQL fourni dans
`supabase/architecture/v1/tests/schema_contract.sql` devra aussi être exécuté
après installation sur une branche Supabase de validation.

## Résultats applicatifs

- La suite de 74 tests existants et ajoutés passe intégralement.
- La vérification TypeScript ne remonte aucune erreur.
- Le build client, SSR et Nitro est généré avec succès.
- Deux avertissements de build préexistants restent visibles :
  `src/routes/home-decor.tsx` n’exporte pas de route et Rollup ignore
  `inlineDynamicImports` lorsque le découpage du code est actif.

## Lint global préexistant

Le lint global du dépôt ne passe pas : 11 128 problèmes sont signalés, dont
11 115 erreurs. La très grande majorité correspond aux fins de ligne CRLF
historiques et aux règles Prettier déjà non satisfaites dans le dépôt. Aucun
nettoyage global n’a été tenté afin de ne pas mélanger cette architecture avec
des milliers de modifications sans rapport. Le seul fichier JavaScript créé
pour cette architecture, `scripts/validate-enterprise-database.mjs`, passe
ESLint et Prettier.

## Validation restant obligatoire avant production

Cette validation ne remplace pas une exécution réelle sur PostgreSQL/Supabase.
Avant tout déploiement, il faut :

1. créer une branche Supabase de test ;
2. exécuter les scripts dans l’ordre documenté ;
3. exécuter le contrat SQL avec un rôle administrateur ;
4. tester les politiques RLS avec au moins deux utilisateurs, un modérateur et
   le rôle service ;
5. vérifier les versions disponibles de `vector` et des autres extensions ;
6. tester les opérations concurrentes d’achat, de coffre, de récompense et de
   synchronisation offline ;
7. mesurer les requêtes critiques avec `EXPLAIN (ANALYZE, BUFFERS)` ;
8. réaliser un backfill sur une copie anonymisée de la base actuelle ;
9. régénérer les types TypeScript multi-schémas ;
10. déployer progressivement selon le plan de migration.

# Tests de contrat PostgreSQL

Ces tests s’exécutent uniquement sur une base Supabase de validation, après les
scripts `00_` à `90_`. Ils sont transactionnels et ne modifient aucune donnée.

```bash
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --file supabase/architecture/v1/tests/schema_contract.sql
```

Le script échoue immédiatement si :

- une table applicative n’a pas RLS activé et forcé ;
- une table n’est pas documentée ;
- une fonction `SECURITY DEFINER` n’impose pas un `search_path` vide ;
- `anon` peut exécuter une fonction privilégiée ;
- un client authentifié peut appeler directement le correcteur ou le moteur
  générique de récompenses ;
- une contrainte d’idempotence critique est absente ;
- les buckets Storage ou les projections Realtime attendus manquent.

Les scénarios multi-utilisateurs Alice/Bob, achat, coffre, récompense
quotidienne, progression et reconnexion restent des tests d’intégration à
exécuter sur une branche Supabase avec de vrais comptes Auth.

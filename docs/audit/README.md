# Outil d’audit pédagogique

L’auditeur contrôle la base JSON Medoka sans modifier ni corriger les données.

## Périmètre actif

Les totaux actifs incluent :

- la roadmap officielle ;
- la Master Knowledge Base ;
- les fichiers de leçons placés hors des dossiers `archive` et `imports` ;
- les banques JSON actives des autres modes de jeu.

Les archives, imports bruts et spécifications sont vérifiés pour leur validité JSON et leur
encodage, mais ne sont pas comptés une seconde fois dans les questions actives.

## Exécution

```bash
npm run audit:content
```

La commande génère :

- `audit.json` : données complètes et anomalies structurées ;
- `AUDIT_REPORT.md` : rapport lisible et versionnable ;
- `audit.html` : tableau de bord autonome ;
- l’interface `/audit` : lancement et export depuis l’application.

## Supabase

La comparaison s’exécute lorsqu’une liste d’identifiants Supabase est fournie au moteur. Le
schéma Supabase actuel ne contient pas de table pédagogique `questions`; le rapport indique
donc explicitement `not_configured` sans tenter d’interroger une table inexistante.

## Score

Le score sur 100 est composé de :

- structure : 20 points ;
- cohérence : 20 points ;
- doublons : 15 points ;
- intégrité : 25 points ;
- performance : 5 points ;
- complétude : 15 points.

Les anomalies sont classées `INFO`, `WARNING`, `ERROR` ou `CRITICAL`. Une anomalie n’entraîne
jamais de modification automatique.

# Plan : MedLingo v2 — App médicale complète

Objectif : passer d'un prototype à une vraie app d'apprentissage stable et riche, sur les 5 axes que tu as validés.

⚠️ **Ampleur** : c'est un très gros chantier (~4-6 tours de build). Je vais découper en **5 phases livrées successivement** pour que tu puisses tester à chaque étape, plutôt que d'attendre 1h un gros bloc qui risque de casser.

---

## Phase 1 — Fondations Cloud + Comptes (1 tour)

**But** : sauvegarder la progression dans le cloud, plus jamais perdue.

- Activer **Lovable Cloud** (base de données + auth)
- Auth email/mot de passe + Google
- Tables : `profiles`, `user_progress` (XP, streak, cœurs, leçons complétées), `lesson_attempts`, `srs_cards` (pour phase 3)
- RLS strict : chaque user ne voit que ses données
- Migration automatique : au premier login, on push le `localStorage` existant vers le cloud
- Header : avatar + menu déconnexion

## Phase 2 — Contenu massif + relecture (1-2 tours)

**But** : passer de ~15 questions à **500+ questions** couvrant vraiment le programme.

- **Os** : squelette complet (crâne, colonne, membres sup/inf, main, pied) — 8 leçons
- **Organes** : cardio, respiratoire, digestif, urinaire, reproducteur, nerveux, endocrinien, sensoriel — 10 leçons
- **Muscles** (nouveau) : principaux groupes — 5 leçons
- **Préfixes / Suffixes / Radicaux** : ~150 morphèmes médicaux — 12 leçons
- **Pathologies** : par système, avec décomposition étymologique — 15 leçons
- Chaque leçon = 15-20 questions
- Sources : terminologie médicale standard (Nomina Anatomica FR, référentiels IFSI/PASS)
- Un fichier `curriculum/` structuré par domaine, facile à étendre

## Phase 3 — Types d'exercices variés + SRS (1-2 tours)

**But** : arrêter le tout-QCM, ajouter la révision espacée style Anki.

Nouveaux types d'exercices :
1. **QCM** (existant)
2. **Associer paires** (mot ↔ définition)
3. **Écrire le mot** (saisie clavier avec tolérance orthographique)
4. **Remettre dans l'ordre** (décomposer "péri-cardi-te")
5. **Image → mot** (cliquer sur l'os/organe sur un schéma)
6. **Vrai/Faux** rapide
7. **Compléter la phrase**

Révision espacée (algo SM-2 simplifié) :
- Chaque item appris = carte SRS avec date de prochaine révision
- Bouton "Réviser" sur l'accueil qui liste les cartes dues du jour
- Mode "Mes erreurs" : refait uniquement ce qui a été raté

## Phase 4 — Visuels anatomiques (1 tour)

**But** : voir ce qu'on apprend, pas juste des mots.

- Illustrations SVG interactives : squelette, silhouette organes, cerveau, cœur, poumon
- Zones cliquables sur schéma pour exercices "image → mot"
- Images générées pour chaque leçon (bannière thématique)
- Animations douces (framer-motion) pour bonnes/mauvaises réponses

## Phase 5 — Rétention & polish (1 tour)

- **Sons** : bip correct/incorrect, jingle fin de leçon (Web Audio, sans lib lourde)
- **Notifications push** (via PWA) : rappel quotidien à heure choisie
- **Classement hebdo** simple entre users
- **Badges** : "10 jours de suite", "Système cardio maîtrisé", etc.
- **Mode révision hors-ligne** : PWA offline pour les leçons déjà chargées
- Fine-tuning UX : transitions, haptics mobile, dark mode

---

## Ordre proposé & questions

Je propose de démarrer par la **Phase 1 (Cloud + comptes)** immédiatement, car tout le reste (SRS, classement, sync mobile↔desktop) en dépend.

**Avant de lancer, deux questions rapides** :

1. **Google login** en plus de l'email/mot de passe ? (recommandé pour usage mobile fluide)
2. **Public cible principal** ? (étudiant IFSI / PASS-LAS / aide-soignant / curieux) — ça oriente le niveau de détail du contenu Phase 2.

Dis-moi go et je démarre la Phase 1.

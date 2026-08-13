# Design system Medoca

Ce module contient les composants partagés de la refonte Medoca. Il est volontairement isolé :
aucun composant ne réalise d'appel réseau, ne modifie l'économie et ne dépend de Supabase.

## Référence visuelle

- fond principal : bleu nuit `#07111d` ;
- panneaux : `#0b1724` avec bordures bleu-gris fines ;
- accent d'action et de progression : vert clinique `#26d878` ;
- texte principal : blanc froid `#f4f7fa` ;
- texte secondaire : gris bleuté ;
- vies : rouge `#ff315f` ;
- pièces : or doux ;
- rayons : 12 à 14 px ;
- cibles tactiles : 44 px minimum, 48 px pour les actions principales.

`MedocaHUD` accepte deux compositions sans logique métier :

- une variante apprentissage avec titre, sous-titre, progression, vies et réglages ;
- une variante économie avec pièces, gemmes, XP, vies et avatar.

Les écrans existants ne sont pas remplacés pendant ce sprint. Ils pourront adopter progressivement
ces composants lors des prochains sprints.

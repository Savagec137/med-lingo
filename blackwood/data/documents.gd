class_name DocumentDB
extends RefCounted
## Les documents de Blackwood Hospital. Ils racontent le Projet ECHO par
## fragments, à peu près dans l'ordre où Thomas les découvre.
## style : « typed » (imprimé) ou « hand » (manuscrit).

const DOCS := {
	"doc_voicemail": {
		"title": "Message vocal — Sarah",
		"style": "hand",
		"body": """Messagerie — 1 nouveau message — reçu à 23 h 58

« Thomas… c'est moi.
Si tu reçois ce message, ne viens surtout pas à l'hôpital.
Tu m'entends ? Surtout pas.
Ils ne sont pas morts, Thomas. Ils ne sont pas morts.
J'ai fait une bêtise. J'ai voulu arrêter ça et j'ai… j'ai tout ouvert.
J'ai fermé le bâtiment. Personne ne sort. Personne ne rentre.
Je t'aime, petit frère. Ne viens pas. »

[fin du message]""",
	},
	"doc_triage": {
		"title": "Fiche de tri — Urgences",
		"style": "typed",
		"body": """CHU BLACKWOOD — SERVICE DES URGENCES
Fiche de régulation — nuit du 11 au 12 novembre

22 h 05 — 3 admissions « agitation extrême + hyperthermie » en provenance des étages (!). Transferts internes non annoncés.
22 h 30 — 7 admissions. Morsures. Tous les patients viennent du 8e étage.
22 h 47 — Consigne de la direction : NE PAS transférer vers l'extérieur. NE PAS appeler le SAMU. NE PAS prévenir la préfecture.
23 h 10 — Arrêt des admissions. Les patients mordus → box 4, isolement.
23 h 26 — Le patient du box 2 (décédé 23 h 02) est debout.
23 h 31 — Nous n'avons plus assez de sangles.

Si quelqu'un lit ça : ils ne ressentent pas la douleur. Seule la tête compte.""",
	},
	"doc_security_log": {
		"title": "Main courante — Poste de sécurité",
		"style": "typed",
		"body": """POSTE DE SÉCURITÉ CENTRAL — REZ-DE-CHAUSSÉE
Main courante — 11 novembre

21 h 40 — Ordre du Dr Vance (direction scientifique) : fermer l'accès aux étages 7 et 8. Motif : « maintenance ».
23 h 05 — Alarme biologique au 8e. Le Dr Vance dit que c'est un exercice.
23 h 52 — Les verrous biologiques du 8e sont DÉSACTIVÉS depuis un badge interne. Je ne vois pas lequel, le système ne répond plus.
00 h 04 — Le bâtiment passe en CONFINEMENT TOTAL. Portes, ascenseurs, sorties. Commande lancée du 11e (centre de contrôle).
00 h 10 — Coupure générale. Éclairage de secours seulement.
00 h 20 — Morel descend aux urgences. Diaz monte en radiologie.
00 h 45 — Morel ne répond plus.
01 h 12 — Quelqu'un frappe à la porte du poste. Avec la tête. Régulièrement.

J'enchaîne l'entrée principale. Rien ne doit sortir d'ici.
— Agent R. Lemaire""",
	},
	"doc_communique": {
		"title": "Communiqué de la direction",
		"style": "typed",
		"body": """CENTRE HOSPITALIER UNIVERSITAIRE BLACKWOOD
Communiqué interne — diffusion immédiate

En raison d'un incident technique survenu sur les installations de ventilation des niveaux supérieurs, l'établissement est placé en mesure de précaution sanitaire.

Il est demandé au personnel :
— de ne communiquer aucune information à l'extérieur, y compris aux familles ;
— de ne pas se rendre aux étages 7 et 8 ;
— de signaler tout patient « désorienté » au poste de sécurité, sans intervenir.

Nos partenaires industriels ont été informés et assurent la continuité du programme.

— La Direction générale""",
	},
	"doc_nurse_note": {
		"title": "Mot griffonné — vestiaires",
		"style": "hand",
		"body": """Si c'est Julie qui trouve ça : je suis montée chercher Sarah au 3e.
Elle a appelé tout le monde pour qu'on descende, qu'on se barricade, qu'on n'ouvre à PERSONNE.
Elle pleurait. Elle disait que c'était sa faute.
Je ne comprends rien.
Ne m'attends pas pour le café.
— Nadia""",
	},
	"doc_patient_file": {
		"title": "Dossier de consultation — É. Brandt",
		"style": "typed",
		"body": """CONSULTATION D'ONCOLOGIE — Dr A. Ferrand
Patient : BRANDT Élias, 34 ans

Mars — Glioblastome de stade IV. Pronostic : 6 à 9 mois. Aucune option thérapeutique standard.

Juillet — Le patient est orienté, à la demande de la direction, vers un « protocole de recherche interne » (7e/8e étage). Je n'ai pas eu accès au dossier du protocole.

Septembre — Je revois M. Brandt par hasard dans un couloir. La tumeur a DISPARU. Il est en pleine forme. Il ne se souvient plus du prénom de sa fille.

Octobre — On m'informe que M. Brandt est décédé. Je n'ai pas été convié à l'autopsie. Je n'ai reçu aucun certificat de décès.""",
	},
	"doc_care_log": {
		"title": "Cahier de transmissions — 1er étage",
		"style": "hand",
		"body": """Nuit du 11/11

22 h — Mme Carvalho (consult. 2) : fièvre 41,2. Mord son drap. Sédatée.
22 h 40 — Mme Carvalho : arrêt cardio-respiratoire. Décès constaté 22 h 51.
23 h 15 — Mme Carvalho a quitté la salle de soins.

Je relis ce que je viens d'écrire. Je le laisse.

23 h 50 — La morgue ne répond plus. Les brancardiers qui sont descendus avec les corps ne sont pas remontés.
Les morts de ce soir ne restent pas morts.""",
	},
	"doc_generator": {
		"title": "Procédure — Groupe électrogène G1",
		"style": "typed",
		"body": """SERVICES TECHNIQUES — SOUS-SOL -2
Remise sous tension manuelle (secours)

En cas de coupure du réseau ET de verrouillage du démarrage automatique, respecter STRICTEMENT l'ordre suivant :

1. POMPE GASOIL → MARCHE
   (armoire murale, salle des groupes, côté cuve)
2. DÉMARRAGE G1 → ACTIONNER
   (pupitre en façade du groupe G1)
3. INVERSEUR SECOURS → BASCULER
   (mur nord de la salle des groupes)

Toute manœuvre dans le désordre provoque un calage du groupe et une réinitialisation de la séquence (bruit important).

Une fois le secours établi : ascenseurs, éclairage des sous-sols et monte-charge de recherche sont réalimentés.""",
	},
	"doc_morgue": {
		"title": "Registre de la morgue",
		"style": "hand",
		"body": """Entrées du 11 novembre :
— 21 h 30 : 2 corps du 8e (« patients du protocole », sans nom, sans dossier)
— 22 h 15 : 4 corps des urgences
— 23 h 00 : 3 corps du 1er

23 h 40 : le casier 7 est ouvert. De l'intérieur.
23 h 42 : le casier 12 aussi.
Je ferme la morgue à clé. Je ne remonte pas le registre.

Les corps du 8e avaient tous la même cicatrice à la nuque. Une petite pastille. « ECHO », gravé dessus.""",
	},
	"doc_patient_list": {
		"title": "Liste des patients — Neurologie",
		"style": "typed",
		"body": """NEUROLOGIE — 3e ÉTAGE — Infirmière de nuit : S. REED

301 — M. Duclos — AVC — stable
302 — Mme Petit — coma post-traumatique → TRANSFERT 8e (sur ordre Dr Vance)
303 — M. Laurent — sclérose latérale → TRANSFERT 8e
304 — M. Ngoma — coma → TRANSFERT 8e
305 — Mme Weiss — état végétatif → TRANSFERT 8e
306 — lit vide

Note manuscrite en marge, écriture de Sarah :
« Pourquoi toujours les patients qui ne peuvent pas dire non ? »""",
	},
	"doc_sarah_note": {
		"title": "Note de Sarah",
		"style": "hand",
		"body": """Si c'est toi, Thomas — et je sais que c'est toi, tu n'as jamais écouté personne —

L'escalier de service B, au 1er étage, monte jusqu'au 6e. C'est le seul passage vers le haut. Le code, c'est ton anniversaire : jour puis mois.

0 6 1 2

Au 6e tu comprendras. Au 8e tu sauras tout. Et après… ne monte pas plus haut. S'il te plaît.

S.""",
	},
	"doc_sarah_letter": {
		"title": "Lettre de Sarah (jamais envoyée)",
		"style": "hand",
		"body": """Thomas,

Tu te souviens quand maman disait que j'étais celle qui répare et toi celui qui protège ? J'ai voulu réparer quelque chose ici, et je crois que je l'ai cassé.

Depuis l'été, on m'enlève mes patients. Les comateux, ceux qui ne peuvent pas protester. Ils montent au 8e et ils ne redescendent pas. On m'a dit « protocole de recherche ». J'ai vu les formulaires de consentement : tous signés par la direction « au titre de la tutelle ».

Le Projet ECHO. Une molécule qui fait repousser les tissus. Elle marche, Thomas. Elle marche trop bien. Elle ne s'arrête jamais.

Ils veulent la vendre. Des milliers de doses. Je vais les en empêcher.

Pardon d'avoir raté ton anniversaire.
Ta sœur qui t'aime,
Sarah""",
	},
	"doc_keller": {
		"title": "Compte rendu opératoire — Dr M. Keller",
		"style": "typed",
		"body": """BLOC DE NEUROCHIRURGIE — 3e ÉTAGE
Opérateur : Dr Markus Keller

Intervention : implantation d'un diffuseur ECHO sous-occipital (sujet mineur n°3).
Déroulement : sans incident.

Addendum personnel, 11/11, 23 h 20 :
Je me suis piqué avec l'aiguille du diffuseur. Une goutte. Rien.
23 h 45 : mes mains ne tremblent plus. Pour la première fois en vingt ans, mes mains ne tremblent plus.
00 h 30 : je n'ai plus besoin de dormir. Je n'ai plus besoin de rien. Je veux opérer. Encore. Et encore. Ils sont tous malades, là, dehors, et je peux les RÉPARER.

(La fin du document est illisible — lacérée au scalpel.)""",
	},
	"doc_echo_protocol": {
		"title": "PROJET ECHO — Protocole de phase I",
		"style": "typed",
		"body": """PROJET ECHO — CONFIDENTIEL — Direction scientifique : Dr H. Vance
Financement : Kessler Biotech

Principe : réactivation des voies embryonnaires de régénération tissulaire. Chez la souris, ECHO-3 reconstitue un membre amputé en 11 jours.

Phase I (humaine) — Sujet 0 : É. Brandt, 34 ans, glioblastome terminal.
Première injection : 03/09.
J+6 : régression tumorale complète.
J+14 : la régénération ne s'arrête pas. Croissance osseuse et musculaire anarchique.
J+17 : arrêt cardiaque. Décès constaté.
J+17 (+ 40 min) : reprise d'activité motrice. Le sujet se lève.

Conclusion du Dr Vance : « Le corps ne sait plus mourir. C'est un résultat, pas un échec. »""",
	},
	"doc_sabotage": {
		"title": "Journal de sécurité — Niveau 8",
		"style": "typed",
		"body": """SYSTÈME DE CONFINEMENT BIOLOGIQUE — NIVEAU 8 — JOURNAL AUTOMATIQUE

11/11 23 h 49 — Accès salle de contrôle P3 — badge 0447 — REED Sarah (infirmière, neurologie)
11/11 23 h 51 — Désactivation vidéosurveillance niveau 8 — badge 0447
11/11 23 h 52 — Désactivation des verrous biologiques, cellules C-1 à C-12 — badge 0447
11/11 23 h 52 — ALERTE : ouverture cellules C-3, C-5, C-9
11/11 23 h 58 — ALERTE : agression, couloir 8-Nord
12/11 00 h 04 — CONFINEMENT GÉNÉRAL DU BÂTIMENT — commande manuelle, centre de contrôle (11e) — badge 0447

C'est elle. C'est Sarah qui a tout ouvert.
Et c'est elle qui a tout fermé.""",
	},
	"doc_crisis": {
		"title": "Main courante — Cellule de crise",
		"style": "typed",
		"body": """CELLULE DE CRISE — 6e ÉTAGE — Unité NRBC (renfort discret à la demande de Kessler Biotech)

00 h 30 — Arrivée par le toit. Mission : récupérer les stocks ECHO-7 et le personnel scientifique. Ne pas intervenir sur les patients.
01 h 00 — Point de situation : l'épidémie a commencé au 8e étage, au laboratoire, peu avant minuit. Les « sujets » se sont échappés des cellules.
01 h 20 — Contamination par morsure en moins d'une heure. Les décédés se relèvent en 10 à 40 minutes.
01 h 45 — Le Dr Vance est introuvable. Sa carte d'accès recherche a été retrouvée ici.
02 h 10 — Nous avons perdu l'équipe Bravo au 8e. Quelque chose de très grand.
02 h 30 — Ordre reçu : attendre. Le client veut ses doses.

On ne nous a pas envoyés sauver qui que ce soit.""",
	},
	"doc_vance_memo": {
		"title": "Mémo du Dr H. Vance",
		"style": "typed",
		"body": """DE : Dr Helena Vance
À : Direction générale — copie Kessler Biotech
OBJET : Livraison ECHO-7

Le lot commercial de 4 000 doses est prêt au 12e. Enlèvement confirmé par le client dans la nuit du 11 au 12, par le toit.

Concernant l'infirmière Reed : elle pose des questions. Elle a accédé à des dossiers de transfert. Je recommande de la muter, ou mieux, de l'intégrer au protocole — son profil sanguin est compatible.

Rappel : le code du coffre reste la date de la première injection. Ne l'écrivez nulle part.

— H. V.""",
	},
	"doc_video": {
		"title": "Vidéo de Sarah — transcription",
		"style": "hand",
		"body": """[Enregistrement — S. REED — 11/11 — 23 h 40]

« Je m'appelle Sarah Reed. Infirmière en neurologie.
Depuis juillet, la direction et le Dr Vance testent le Projet ECHO sur des patients qui n'ont jamais consenti. Des comateux. Des enfants de la pédiatrie. Ils les montent ici, au 8e.
ECHO fait repousser les tissus. Mais la régénération ne s'arrête jamais. Et quand le corps meurt, il se relève.
Ils ont vendu la molécule. Des milliers de doses partent cette nuit.
Je vais couper la sécurité du 8e et ouvrir les cellules : les enfants, au moins, ne finiront pas dans une caisse.
Le coffre de Vance contient la clé de l'ascenseur de direction. Code : 0-3-0-9. La date où ils ont piqué Élias.
Si tout tourne mal… je fermerai le bâtiment. Moi avec. »

[23 h 44 — un choc hors champ — Sarah se retourne — fin de l'enregistrement]""",
	},
	"doc_director": {
		"title": "Courrier du directeur général",
		"style": "typed",
		"body": """Monsieur le Directeur,

Vous trouverez ci-joint le virement correspondant à la seconde tranche du Programme ECHO. La troisième tranche sera versée à réception du lot commercial au Site 2.

Nous vous rappelons que la confidentialité est la condition de notre partenariat. Tout incident devra être traité en interne. Nos équipes sont en mesure d'intervenir dans votre établissement sans délai et sans formalité.

Nos hommages,
Kessler Biotech — Département des acquisitions""",
	},
	"doc_board": {
		"title": "Procès-verbal du conseil (extrait)",
		"style": "typed",
		"body": """CONSEIL D'ADMINISTRATION — SÉANCE EXTRAORDINAIRE — 2 novembre

Point 3 — Programme ECHO
Le Dr Vance présente les résultats de la phase II (sujets sous tutelle hospitalière). Taux de régénération : 100 %. Taux de « réanimation post-mortem » : 100 %.

M. le Directeur général rappelle que le contrat Kessler représente l'équivalent de huit années de budget de l'établissement.

Vote : poursuite du programme et livraison du lot ECHO-7 — adoptée à l'unanimité moins une voix.

La voix contre n'est pas nommée au procès-verbal.""",
	},
	"doc_zero": {
		"title": "Dossier du Sujet 0 — Élias Brandt",
		"style": "typed",
		"body": """SUJET 0 — BRANDT Élias — cellule 12-A

Statut : actif depuis 54 jours post-mortem.
Particularité : SEUL sujet conservant la parole et la mémoire. Le sujet reconnaît le personnel, pose des questions, demande des nouvelles de sa fille (Léa, 6 ans).

Tissus : régénération continue. Le sujet a subi 31 prélèvements complets. Tout a repoussé.

Recommandation : conserver le Sujet 0 comme souche de référence jusqu'à la fin de la production.

Note manuscrite : « Il m'a demandé aujourd'hui si c'était bientôt fini. Je n'ai pas su quoi répondre. » — S.R.""",
	},
	"doc_order": {
		"title": "Bon de commande — ECHO-7",
		"style": "typed",
		"body": """BON DE COMMANDE N° K-2231
Client : Kessler Biotech — Département des acquisitions
Destination : SITE 2 (coordonnées communiquées au transporteur)

Désignation : ECHO-7, lot commercial
Quantité : 4 000 doses
Conditionnement : 8 caisses réfrigérées
Enlèvement : toit, hélicoptère, nuit du 11 au 12 novembre

Mention : « Usage : programme militaire et civil — distribution grand public à l'étude ».

Des milliers de doses. Des milliers de gens qui ne pourraient plus jamais mourir.""",
	},
}


static func get_doc(id: String) -> Dictionary:
	return DOCS.get(id, {"title": id, "style": "typed", "body": ""})

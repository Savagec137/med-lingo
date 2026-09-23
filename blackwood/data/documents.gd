class_name DocumentDB
extends RefCounted
## Les documents trouvés dans le centre. Ils révèlent l'histoire par fragments,
## dans l'ordre où le joueur les découvre normalement.
## style : « typed » (machine à écrire) ou « hand » (manuscrit).

const DOCS := {
	"doc_incident": {
		"title": "Rapport d'incident n°47",
		"style": "typed",
		"body": """BLACKWOOD RESEARCH FACILITY — SERVICE DE SÉCURITÉ
RAPPORT D'INCIDENT N°47
3 novembre — 02 h 40
Rédigé par : R. Duval, chef de la sécurité

À 02 h 10, l'infirmière de garde du niveau B a déclenché l'alarme de l'unité de soins prolongés. Le patient de la chambre B-11, déclaré en arrêt cardiaque à 01 h 25 par le Dr. Marrow, a été retrouvé debout dans le couloir.

Le patient ne répondait à aucune consigne. Il a mordu l'infirmière K. Aubert à l'avant-bras. Deux agents ont été nécessaires pour le maîtriser. Il ne semblait ressentir aucune douleur.

Le Dr. Marrow est arrivé à 02 h 25. Il a fait transférer le patient au laboratoire et a ordonné que l'incident ne soit pas consigné au registre médical.

Je le consigne quand même.

Pour mémoire : un patient mort depuis quarante-cinq minutes ne se relève pas.

— R. Duval""",
	},
	"doc_journal_lena": {
		"title": "Journal du Dr. Lena Cole",
		"style": "hand",
		"body": """14 mars
Premier jour à Blackwood. Le centre est magnifique, perdu dans la forêt, silencieux. Le Dr. Marrow m'a fait visiter lui-même. Il parle du coma comme d'une « porte qu'on n'a jamais appris à rouvrir ». Il veut que je dirige le suivi neurologique du protocole LAZARUS.

2 juin
Les résultats sont impossibles. Des patients en mort cérébrale retrouvent une activité motrice après l'injection de L-9. Marrow dit que nous « redémarrons » le corps. J'ai demandé ce qu'il advenait de l'esprit. Il n'a pas répondu.

19 septembre
Le sujet 11 me suit des yeux à travers la vitre. Mais il n'y a rien derrière ses yeux. Rien. Les infirmières l'appellent « le creux ». Je crois qu'elles ont raison.

J'ai essayé d'appeler Ethan ce soir. Je n'ai pas laissé de message. Qu'est-ce que je lui aurais dit ?""",
	},
	"doc_medical": {
		"title": "Rapport médical — Sujet 11",
		"style": "typed",
		"body": """PROTOCOLE LAZARUS — RAPPORT MÉDICAL
Sujet n°11 (H, 41 ans) — Statut : RÉANIMÉ (J+46)

Activité corticale : nulle.
Activité du tronc cérébral : anormalement élevée.
Température corporelle : 29,4 °C (stable).
Fréquence cardiaque : 12 bpm.

Observations :
— Vision quasi inexistante. Le sujet réagit toutefois aux sources lumineuses vives.
— Audition extrêmement développée. Le moindre bruit de pas, a fortiori une course, déclenche une orientation immédiate de la tête.
— Aucune réaction à la douleur. Les blessures au torse n'interrompent pas ses déplacements. Seules les lésions crâniennes semblent l'arrêter.
— Agressivité croissante envers toute présence vivante.

Recommandation du Dr. L. Cole : suspension immédiate du protocole.
Décision du Dr. A. Marrow : poursuite. Passage à la phase III.""",
	},
	"doc_memo": {
		"title": "Note interne — Direction",
		"style": "typed",
		"body": """HALVORSEN BIOMEDICAL — NOTE INTERNE
Diffusion restreinte — À détruire après lecture
Objet : fermeture du site de Blackwood

Suite aux événements du 3 novembre, l'ensemble du personnel non essentiel est évacué avec effet immédiat. Les familles seront informées d'une contamination sanitaire.

Le protocole LAZARUS est officiellement suspendu.

Toutefois, les chambres de maintien du niveau B DOIVENT rester alimentées. Le générateur principal fonctionnera en autonomie ; la télémétrie reste transmise au Site 2.

Personne ne coupe l'alimentation. Personne ne descend.

Le Dr. Marrow reste sur place, à sa demande, pour « surveiller les sujets ».

— La Direction""",
	},
	"doc_archivist": {
		"title": "Aide-mémoire de l'archiviste",
		"style": "hand",
		"body": """Pour le coffre des archives.

Le Dr. Marrow a exigé que le code suive « l'ordre du protocole », comme tout ici. J'oublie toujours, alors je l'écris — tant pis pour le règlement.

D'abord, le patient s'endort.
Ensuite, son cœur se tait.
Enfin, il ouvre les yeux.

Chaque étape a son armoire,
chaque armoire porte son chiffre.

— M. Petit, archives""",
	},
	"doc_marrow": {
		"title": "Dossier confidentiel — Dr. Marrow",
		"style": "typed",
		"body": """DOSSIER DU PERSONNEL — CONFIDENTIEL
Nom : Dr. Aldous MARROW
Fonction : directeur scientifique, chirurgien-chef
Ancienneté : 19 ans

Note de la médecine du travail (11 août) :
Diagnostic confirmé de sclérose latérale amyotrophique. Évolution rapide. Espérance de vie estimée : moins de douze mois. Le Dr. Marrow refuse tout arrêt de travail.

Annotation manuscrite en marge :
« Il a commandé trois doses de L-9 concentré au nom du sujet 12. Le sujet 12 est mort en juillet. — L.C. »

Note de la direction :
Le Dr. Marrow reste indispensable au protocole. Ne pas donner suite.""",
	},
	"doc_last_entry": {
		"title": "Journal du Dr. Lena Cole — dernière entrée",
		"style": "hand",
		"body": """Je ne sais plus quel jour nous sommes.

Marrow s'est injecté la formule complète. Je l'ai vu faire. Il a souri en disant qu'un chirurgien ne devrait jamais cesser d'opérer.

Ce qui est sorti de la salle trois jours plus tard n'était plus lui. Il est plus grand. Ses mains... Il continue ses « interventions » au sous-sol, dans la salle du générateur. Il y descend les corps. Il les ouvre. Il les recoud. Il les réveille.

Tant que le générateur tourne, il reste là-bas, près de la chaleur, près des machines.

J'ai pris sa carte d'accès. Je vais descendre et tout arrêter.

Si quelqu'un trouve ceci : dites à mon frère, Ethan Cole, que je suis désolée. Et qu'il ne vienne pas me chercher.""",
	},
	"doc_morgue": {
		"title": "Registre de la chambre froide",
		"style": "typed",
		"body": """REGISTRE — CHAMBRE FROIDE (NIVEAU B)

B-04 — M. Leroy, 67 ans — décédé le 12/05 — transféré au protocole — RÉVEILLÉ
B-07 — J. Morel, 52 ans — décédé le 30/06 — transféré au protocole — RÉVEILLÉ
B-09 — inconnue, ~30 ans — décédée le 02/08 — transférée au protocole — ÉCHEC
B-11 — T. Garnier, 41 ans — décédé le 01/09 — transféré au protocole — RÉVEILLÉ
B-12 — S. Fontaine, 58 ans — décédé le 17/07 — doses détournées (voir Dr. Marrow)
B-14 — R. Duval, 49 ans — décédé le 04/11 — en attente

Les familles ont toutes reçu un certificat de décès et une urne.
Les urnes contenaient de la cendre de bois.""",
	},
	"doc_generator": {
		"title": "Consignes — Salle du générateur",
		"style": "typed",
		"body": """CONSIGNES DE SÉCURITÉ — SALLE DU GÉNÉRATEUR (NIVEAU B)

1. Le générateur principal alimente les chambres de maintien et le verrouillage d'urgence du tunnel de service.

2. Tant que le verrouillage d'urgence est actif, le tunnel de service reste FERMÉ.

3. ATTENTION : fuite du circuit de refroidissement. Le sol autour du générateur est régulièrement inondé. NE JAMAIS actionner les disjoncteurs muraux lorsqu'une personne se trouve dans l'eau. Décharge mortelle garantie.

4. Les disjoncteurs se réarment seuls après quelques secondes.

Ajouté au feutre rouge, d'une écriture tremblante :
« IL SE TIENT TOUJOURS PRÈS DE LA MACHINE. »""",
	},
}


static func get_doc(id: String) -> Dictionary:
	return DOCS.get(id, {"title": id, "style": "typed", "body": ""})

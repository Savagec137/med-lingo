class_name ItemDB
extends RefCounted
## Catalogue des objets. « kind » détermine le comportement dans l'inventaire.
##   weapon  : arme équipable
##   ammo    : munitions (empilables)
##   heal    : objet de soin (utilisable)
##   key     : clé / objet de progression (utilisé automatiquement au bon endroit)
##   instant : consommé au ramassage (n'occupe pas d'emplacement)
##   tool    : équipement permanent (lampe torche, hors emplacements)

const ITEMS := {
	"baton": {"name": "Matraque télescopique", "kind": "weapon", "max_stack": 1, "icon": "baton",
		"desc": "Matraque d'agent de sécurité. Silencieuse : économise les munitions."},
	"pistol": {"name": "Pistolet 9mm", "kind": "weapon", "max_stack": 1, "icon": "pistol",
		"desc": "Pistolet semi-automatique de service. Chargeur de 12 balles. Chaque balle compte."},
	"shotgun": {"name": "Fusil à pompe", "kind": "weapon", "max_stack": 1, "icon": "shotgun",
		"desc": "Calibre 12. Dévastateur de près. Très peu de cartouches."},
	"smg": {"name": "Pistolet-mitrailleur", "kind": "weapon", "max_stack": 1, "icon": "smg",
		"desc": "Rafales rapides. Consomme énormément de 9mm."},
	"magnum": {"name": "Magnum .357", "kind": "weapon", "max_stack": 1, "icon": "magnum",
		"desc": "Six coups de gros calibre. Pour ce qui ne devrait plus marcher."},
	"ammo_shells": {"name": "Cartouches calibre 12", "kind": "ammo", "max_stack": 30, "icon": "shells",
		"desc": "Cartouches de chevrotine pour le fusil à pompe. Rares : à garder pour les urgences."},
	"ammo_magnum": {"name": "Balles .357 Magnum", "kind": "ammo", "max_stack": 18, "icon": "magnum_ammo",
		"desc": "Munitions de gros calibre pour le Magnum. Chaque balle est précieuse."},
	"ammo_9mm": {
		"name": "Munitions 9mm",
		"kind": "ammo",
		"max_stack": 99,
		"icon": "ammo",
		"desc": "Cartouches 9mm Parabellum. Visez la tête : le corps ne les arrête pas.",
	},
	"spray": {
		"name": "Medical Spray",
		"kind": "heal",
		"max_stack": 3,
		"icon": "spray",
		"heal": 40.0,
		"desc": "Spray hémostatique et anesthésiant. Restaure 40 PV.",
	},
	"key_boxes": {"name": "Clé des box de soins", "kind": "key", "max_stack": 1, "icon": "key",
		"desc": "Un trousseau de l'accueil des urgences : « BOX DE SOINS »."},
	"fuse": {"name": "Fusible 60 A", "kind": "key", "max_stack": 1, "icon": "fuse",
		"desc": "Un fusible cylindrique de 60 ampères, neuf. De quoi réalimenter une porte électrique."},
	"key_technical": {"name": "Clé du local technique", "kind": "key", "max_stack": 1, "icon": "key",
		"desc": "Le trousseau de l'agent Diaz. Étiquette : « LOCAL TECHNIQUE — SOUS-SOL -2 ». Ouvre la porte de l'escalier A au -2."},
	"key_pharmacy": {"name": "Clé du rideau de la pharmacie", "kind": "key", "max_stack": 1, "icon": "key",
		"desc": "Une clé plate sur un anneau : « RIDEAU PHARMACIE — RDC »."},
	"key_locker": {"name": "Clé du casier de Sarah", "kind": "key", "max_stack": 1, "icon": "key",
		"desc": "Une petite clé sur un porte-clés en forme de phare. Sarah l'avait déjà quand on était gamins."},
	"card_research": {"name": "Carte d'accès RECHERCHE", "kind": "key", "max_stack": 1, "icon": "keycard",
		"desc": "Carte du Dr H. Vance, direction scientifique. Monte-charge sécurisé : étages de recherche 7 et 8 (départ du sous-sol -2)."},
	"key_private": {"name": "Clé de l'ascenseur de direction", "kind": "key", "max_stack": 1, "icon": "key",
		"desc": "Clé à tube, gravée « DIRECTION — 8 ↔ 11 ». Ouvre l'ascenseur privé du 8e étage."},
	"key_main_lab": {"name": "Carte de Sarah — Niveau 5", "kind": "key", "max_stack": 1, "icon": "keycard",
		"desc": "La carte d'accès de Sarah, poisseuse de sang. Niveau d'accréditation 5 : zone interdite, 12e étage."},
	"battery": {
		"name": "Piles",
		"kind": "instant",
		"max_stack": 1,
		"icon": "battery",
		"desc": "Des piles neuves pour la lampe torche.",
	},
	"flashlight": {
		"name": "Lampe torche",
		"kind": "tool",
		"max_stack": 1,
		"icon": "flashlight",
		"desc": "Une lampe torche militaire. Touche F pour l'allumer. Attention : la lumière attire l'attention.",
	},
}


static func get_item(id: String) -> Dictionary:
	return ITEMS.get(id, {"name": id, "kind": "key", "max_stack": 1, "icon": "key", "desc": ""})


static func item_name(id: String) -> String:
	return get_item(id).get("name", id)


static func max_stack(id: String) -> int:
	return int(get_item(id).get("max_stack", 1))


static func kind(id: String) -> String:
	return String(get_item(id).get("kind", "key"))

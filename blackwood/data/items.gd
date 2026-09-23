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
	"pistol": {
		"name": "Pistolet 9mm",
		"kind": "weapon",
		"max_stack": 1,
		"icon": "pistol",
		"desc": "Pistolet semi-automatique de service. Chargeur de 12 balles. Chaque balle compte.",
	},
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
	"admin_key": {
		"name": "Clé de l'administration",
		"kind": "key",
		"max_stack": 1,
		"icon": "key",
		"desc": "Une clé en laiton. Étiquette : « ADMINISTRATION — AILE OUEST ».",
	},
	"fuse": {
		"name": "Fusible haute tension",
		"kind": "key",
		"max_stack": 1,
		"icon": "fuse",
		"desc": "Un fusible cylindrique de 60 ampères. De quoi réalimenter un circuit entier.",
	},
	"keycard_b": {
		"name": "Carte d'accès — Niveau B",
		"kind": "key",
		"max_stack": 1,
		"icon": "keycard",
		"desc": "Carte magnétique du Dr. A. Marrow. Accès autorisé : NIVEAU B (sous-sol).",
	},
	"crowbar": {
		"name": "Pied-de-biche",
		"kind": "key",
		"max_stack": 1,
		"icon": "crowbar",
		"desc": "Un pied-de-biche en acier, lourd et froid. Assez solide pour forcer une porte coincée.",
	},
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

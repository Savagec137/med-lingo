class_name WeaponDB
extends RefCounted
## Les cinq armes du jeu — aucune autre. Chacune a un rôle précis :
##   baton   : silencieuse, faible, économise les munitions
##   pistol  : arme principale, munitions relativement rares
##   shotgun : dévastateur de près, très peu de cartouches
##   smg     : cadence élevée, dévore les munitions 9mm
##   magnum  : réservé aux ennemis les plus dangereux
##
## kind : « melee » (coup de matraque), « hitscan » (balle), « pellets » (plombs)

const ORDER := ["baton", "pistol", "shotgun", "smg", "magnum"]

const WEAPONS := {
	"baton": {
		"name": "Matraque télescopique", "short": "MATRAQUE", "kind": "melee",
		"ammo": "", "mag": 0, "damage": 30.0, "head_mult": 1.5, "interval": 0.72,
		"reach": 1.75, "arc": 70.0, "noise": 4.0, "stagger": 0.75,
		"desc": "Matraque d'agent de sécurité, déployée d'un coup sec. Faible, mais silencieuse : chaque balle économisée compte.",
	},
	"pistol": {
		"name": "Pistolet 9mm", "short": "PISTOLET 9MM", "kind": "hitscan",
		"ammo": "ammo_9mm", "mag": 12, "damage": 26.0, "head_mult": 2.6, "interval": 0.32,
		"reload": 1.7, "spread_aim": 0.7, "spread_hip": 4.0, "range": 60.0, "noise": 26.0,
		"recoil": 0.035, "shake": 0.18, "stagger": 0.35,
		"desc": "Pistolet semi-automatique de service. Chargeur de 12 balles. L'arme principale : chaque balle compte.",
	},
	"shotgun": {
		"name": "Fusil à pompe", "short": "FUSIL À POMPE", "kind": "pellets",
		"ammo": "ammo_shells", "mag": 5, "pellets": 9, "damage": 13.0, "head_mult": 1.8, "interval": 0.95,
		"reload": 0.55, "reload_one": true, "spread_aim": 4.2, "spread_hip": 6.5, "range": 22.0, "noise": 38.0,
		"recoil": 0.09, "shake": 0.45, "stagger": 0.95, "knockback": 3.5,
		"desc": "Fusil à pompe de calibre 12. Dévastateur à courte portée, inutile au loin. Cinq cartouches, rechargées une à une.",
	},
	"smg": {
		"name": "Pistolet-mitrailleur", "short": "PISTOLET-MITRAILLEUR", "kind": "hitscan", "auto": true,
		"ammo": "ammo_9mm", "mag": 30, "damage": 14.0, "head_mult": 2.2, "interval": 0.075,
		"reload": 2.1, "spread_aim": 1.6, "spread_hip": 5.0, "spread_growth": 0.35, "range": 45.0, "noise": 30.0,
		"recoil": 0.018, "shake": 0.08, "stagger": 0.2,
		"desc": "Pistolet-mitrailleur compact. Rafales rapides — et un chargeur de 30 balles de 9mm vidé en deux secondes.",
	},
	"magnum": {
		"name": "Magnum .357", "short": "MAGNUM .357", "kind": "hitscan",
		"ammo": "ammo_magnum", "mag": 6, "damage": 120.0, "head_mult": 2.0, "interval": 0.85,
		"reload": 2.6, "spread_aim": 0.4, "spread_hip": 3.0, "range": 80.0, "noise": 45.0,
		"recoil": 0.12, "shake": 0.55, "stagger": 1.0, "knockback": 2.0, "pierce": true,
		"desc": "Revolver de gros calibre. Six coups. De quoi arrêter ce qui ne devrait plus marcher.",
	},
}


static func get_weapon(id: String) -> Dictionary:
	return WEAPONS.get(id, {})


static func is_weapon(id: String) -> bool:
	return WEAPONS.has(id)

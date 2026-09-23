class_name HospitalLevel
extends RefCounted
## BLACKWOOD HOSPITAL — centre hospitalier universitaire de 12 étages.
## Neuf niveaux sont construits et explorables (-2, -1, RDC, 1, 3, 6, 8, 11, 12) ;
## les autres sont visibles de l'extérieur, listés dans les ascenseurs et
## traversés par les cages d'escalier, mais condamnés.

const BUILT := [-2, -1, 0, 1, 3, 6, 8, 11, 12]
const TOP := 12

const FLOOR_NAMES := {
	12: "Zone interdite — Laboratoire principal",
	11: "Centre de contrôle",
	10: "Archives secrètes",
	9: "Administration",
	8: "Laboratoire expérimental",
	7: "Recherche médicale",
	6: "Maladies infectieuses",
	5: "Pédiatrie",
	4: "Psychiatrie",
	3: "Neurologie — Chambres",
	2: "Chirurgie — Blocs — Réanimation",
	1: "Consultations — Radiologie — Attente",
	0: "Hall — Accueil — Sécurité — Pharmacie — Cafétéria",
	-1: "Urgences — Stockage — Laboratoire biologique",
	-2: "Parking — Morgue — Techniques — Générateurs",
}
const FLOOR_CLOSED := {
	12: "ZONE INTERDITE", 11: "ACCÈS DIRECTION", 10: "ACCÈS RESTREINT", 9: "CONDAMNÉ",
	8: "ACCÈS RECHERCHE", 7: "ACCÈS RECHERCHE", 5: "CONDAMNÉ", 4: "CONDAMNÉ", 2: "CONDAMNÉ — BLOCS CONTAMINÉS",
}


static func floor_label(lv: int) -> String:
	if lv == 0:
		return "RDC"
	return "%d" % lv if lv > 0 else "%d" % lv


## « 3e étage », « Rez-de-chaussée », « Sous-sol -2 ».
static func floor_text(lv: int) -> String:
	if lv == 0:
		return "Rez-de-chaussée"
	if lv < 0:
		return "Sous-sol %d" % lv
	return "1er étage" if lv == 1 else "%de étage" % lv


## Nom lisible d'un lieu (menus de sauvegarde) : zone et étage.
static func place_name(zone: String, lv: int) -> String:
	var def: Dictionary = Facility.ZONES.get(zone, {})
	var name := String(def.get("name", zone))
	if zone == "exterior" or zone == "":
		return "Blackwood Hospital — extérieur"
	var low := name.to_lower()
	if "étage" in low or "sous-sol" in low or "rez-de-chaussée" in low:
		return name
	return "%s · %s" % [name, floor_text(lv)]


static func build(f: Facility) -> void:
	Facility.ZONES.clear()
	Facility.FLOOR_Y.clear()
	for lv in BUILT:
		Facility.FLOOR_Y[lv] = HKit.floor_y(lv)
	HExterior.build(f)
	HFloorB2.build(f)
	HFloorB1.build(f)
	HFloor0.build(f)
	HFloor1.build(f)
	HFloor3.build(f)
	HFloor6.build(f)
	HFloor8.build(f)
	HFloor11.build(f)
	HFloor12.build(f)
	_stairwells(f)
	_elevators(f)
	for lv in BUILT:
		var rect := Rect2(HKit.X0 - 0.5, HKit.ZN - 0.5, HKit.X1 - HKit.X0 + 1.0, HKit.ZS - HKit.ZN + 0.5)
		if lv == -2:
			rect = rect.merge(Rect2(-4.5, -12, 37, 26.5))
		if lv == -1:
			rect = rect.merge(Rect2(31.5, -14.5, 15, 13))
		f.add_nav_floor(lv, rect)


## Menu principal : la tour vue de la rue, sans les intérieurs.
static func build_exterior_only(f: Facility) -> void:
	Facility.ZONES.clear()
	Facility.FLOOR_Y.clear()
	Facility.FLOOR_Y[0] = 0.0
	HExterior.build(f)


static func _stairwells(f: Facility) -> void:
	# Cage A : -2 → 1 (effondrée au-dessus du 1er)
	Facility.ZONES["stair_a"] = {"name": "Escalier A", "always": true, "rects": [Rect2(-12, -26, 6, 10)], "ymin": -9.0, "ymax": 8.0,
		"reverb": "corridor", "surface": "concrete", "ambience": {"amb_vent": 0.4, "amb_hum": 0.2}, "neighbors": [], "moon": false}
	HKit.stairwell(f, "stair_a", HKit.STAIR_A.x, HKit.STAIR_A.y, -2, 1, {
		-2: {"id": "stair_a_b2", "lock": Door.Lock.KEY, "key": "key_technical", "mat": "metal_gray", "heavy": true,
			"locked_msg": "Porte coupe-feu du sous-sol -2 — « LOCAUX TECHNIQUES ». Verrouillée à clé.",
			"unlock_msg": "La clé du local technique déverrouille la porte du -2."},
		# Calée ouverte : c'est la fuite devant l'infirmière (elle claque ensuite)
		-1: {"id": "stair_a_b1", "open": true, "dir": -1.0},
		0: {"id": "stair_a_0"},
		1: {"id": "stair_a_1"},
	}, true)
	# Cage B (service) : 1 → 6
	Facility.ZONES["stair_b"] = {"name": "Escalier de service B", "always": true, "rects": [Rect2(24, -26, 8, 10)], "ymin": 3.0, "ymax": 28.0,
		"reverb": "corridor", "surface": "concrete", "ambience": {"amb_vent": 0.3, "amb_hum": 0.2}, "neighbors": [], "moon": false}
	HKit.stairwell(f, "stair_b", HKit.STAIR_B.x, HKit.STAIR_B.y, 1, 6, {
		1: {"id": "stair_b_1", "lock": Door.Lock.EVENT, "locked_msg": "Porte de l'escalier de service B. Un clavier à code est fixé à côté."},
		2: {"id": "stair_b_2", "lock": Door.Lock.LOCKED, "locked_msg": "CHIRURGIE — ACCÈS CONDAMNÉ. La porte est soudée."},
		3: {"id": "stair_b_3", "lock": Door.Lock.LOCKED, "locked_msg": "La porte est barricadée de l'autre côté."},
		4: {"id": "stair_b_4", "lock": Door.Lock.LOCKED, "locked_msg": "PSYCHIATRIE — Porte verrouillée."},
		5: {"id": "stair_b_5", "lock": Door.Lock.LOCKED, "locked_msg": "PÉDIATRIE. La porte est entrouverte… mais bloquée par des gravats. On entend quelque chose ramper."},
		6: {"id": "stair_b_6"},
	})
	f.add_trigger("stairb_5", Vector3(28.0, HKit.floor_y(5) + 1.2, -17.2), Vector3(7.0, 2.4, 1.4))
	# Cage C (secours) : 8 → 12
	Facility.ZONES["stair_c"] = {"name": "Escalier de secours C", "always": true, "rects": [Rect2(-32, -26, 8, 10)], "ymin": 31.0, "ymax": 52.0,
		"reverb": "corridor", "surface": "concrete", "ambience": {"amb_vent": 0.3, "amb_hum": 0.2}, "neighbors": [], "moon": false}
	HKit.stairwell(f, "stair_c", HKit.STAIR_C.x, HKit.STAIR_C.y, 8, 12, {
		8: {"id": "stair_c_8"},
		9: {"id": "stair_c_9", "lock": Door.Lock.LOCKED, "locked_msg": "ADMINISTRATION — Porte verrouillée."},
		10: {"id": "stair_c_10", "lock": Door.Lock.LOCKED, "locked_msg": "ARCHIVES — ACCÈS RESTREINT."},
		11: {"id": "stair_c_11", "lock": Door.Lock.EVENT, "locked_msg": "Verrouillée depuis le centre de contrôle."},
		12: {"id": "stair_c_12", "lock": Door.Lock.KEY, "key": "key_main_lab", "mat": "metal_dark", "heavy": true,
			"locked_msg": "ZONE INTERDITE — Laboratoire principal. Lecteur de carte : « ACCÈS NIVEAU 5 REQUIS ».",
			"unlock_msg": "La carte de Sarah. Le lecteur passe au vert."},
	})


static func _elevators(f: Facility) -> void:
	f.elevators["main"] = {
		"name": "ASCENSEURS", "short": "ASCENSEURS", "stops": [-2, -1, 0, 1, 3, 6],
		"power_flag": "power_restored",
		"no_power_msg": "Rien. Les ascenseurs ne sont plus alimentés — le courant est coupé dans tout le bâtiment.",
		"rules": {
			6: {"flag": "reached_floor_6", "msg": "6e étage — CONFINEMENT BIOLOGIQUE. Arrêt désactivé. Accès par l'escalier de service B uniquement."},
			-1: {"flag": "b1_unlocked", "msg": "Sous-sol -1 — arrêt bloqué : « Obstruction détectée ». Quelque chose empêche les portes de s'ouvrir."},
		},
	}
	f.elevators["freight"] = {
		"name": "MONTE-CHARGE", "short": "MONTE-CHARGE", "stops": [-2, -1, 8],
		"power_flag": "power_restored",
		"rules": {
			8: {"item": "card_research", "msg": "Monte-charge sécurisé — CARTE RECHERCHE EXIGÉE. Étages 7-8 réservés au personnel du Projet ECHO."},
			-1: {"flag": "self_destruct", "msg": "Arrêt -1 : commande verrouillée."},
			-2: {"flag": "self_destruct_never", "msg": "Arrêt -2 : descente interdite depuis les étages de recherche."},
		},
	}
	f.elevators["private"] = {
		"name": "ASCENSEUR DE DIRECTION", "short": "ASCENSEUR DE DIRECTION", "stops": [8, 11],
		"power_flag": "power_restored",
		"rules": {11: {"item": "key_private", "msg": "Serrure à clé : ascenseur réservé à la direction."}},
	}

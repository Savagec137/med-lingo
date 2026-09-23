class_name HFloor0
extends RefCounted
## Rez-de-chaussée — Hall d'accueil (double hauteur, mur-rideau sur le parvis),
## sécurité (matraque, vidéosurveillance, main courante), pharmacie (rideau
## métallique : clé dans la cafétéria), cafétéria, vestiaires, admissions.

const LV := 0
const EMERGENCY := Color(1.0, 0.85, 0.62)


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var room := {"reverb": "room", "surface": "lino", "ambience": {"amb_hum": 0.35, "amb_room": 0.5, "amb_rain_inside": 0.25}}
	k.zone("f0_corridor", "Rez-de-chaussée — Couloir principal", [Rect2(-32, -16, 64, 4)],
		{"surface": "tile", "ambience": {"amb_hum": 0.35, "amb_vent": 0.5}})
	k.zone("f0_hall", "Hall d'accueil", [Rect2(-12, -12, 24, 12)], {"reverb": "hall", "surface": "tile", "ymax": 3.6, "moon": true,
		"ambience": {"amb_rain_inside": 0.6, "amb_hum": 0.2, "amb_wind": 0.15}})
	k.zone("f0_pharmacy", "Pharmacie", [Rect2(-32, -12, 8, 12)], room)
	k.zone("f0_waiting", "Salle d'attente", [Rect2(-24, -12, 12, 12)], room)
	k.zone("f0_security", "Poste de sécurité", [Rect2(12, -12, 8, 12)], room)
	k.zone("f0_admissions", "Admissions", [Rect2(20, -12, 12, 12)], room)
	k.zone("f0_lockers", "Vestiaires du personnel", [Rect2(-32, -26, 8, 10)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.4}})
	k.zone("f0_cafeteria", "Cafétéria", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.4, "amb_room": 0.4}})
	k.zone("f0_lounge", "Espace détente du personnel", [Rect2(6, -26, 10, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.45}})
	k.standard({
		"zone": "f0_corridor",
		"mats": {"wall": "wall_hospital", "corridor_floor": "floor_tile", "floor_s": "floor_lino", "floor_n": "floor_lino"},
		"zones_s": [{"zone": "f0_pharmacy", "x1": -32, "x2": -24, "floor": "floor_tile"}, {"zone": "f0_waiting", "x1": -24, "x2": -12},
			{"zone": "f0_hall", "x1": -12, "x2": 12, "floor": "floor_tile", "ceiling": "none"},
			{"zone": "f0_security", "x1": 12, "x2": 20}, {"zone": "f0_admissions", "x1": 20, "x2": 32, "floor": "floor_wood"}],
		"zones_n": [{"zone": "f0_lockers", "x1": -32, "x2": -24, "floor": "floor_tile"}, {"zone": "f0_cafeteria", "x1": -24, "x2": -12, "floor": "floor_checker"},
			{"zone": "f0_lounge", "x1": 6, "x2": 16, "floor": "floor_wood"}],
		"skip_north": [HKit.STAIR_A, HKit.ELEV],
		"north_walls": [-24.0, 6.0, 16.0],
		"south_walls": [-24.0, 20.0],
		"south_open": [Vector2(-12, 12)],
		"doors": [
			{"id": "f0_pharmacy_door", "x": -28.0, "side": "s", "w": 1.8, "opts": {"lock": Door.Lock.KEY, "key": "key_pharmacy", "mat": "shutter",
				"frame": "metal_dark", "double": false, "heavy": true, "sign": "PHARMACIE",
				"locked_msg": "Le rideau métallique de la pharmacie est verrouillé. Serrure à clé.", "unlock_msg": "La clé déverrouille le rideau de la pharmacie."}},
			{"id": "f0_waiting_door", "x": -18.0, "side": "s", "w": 1.8, "opts": {"double": true, "window": true, "open": true, "dir": 1.0, "sign": "SALLE D'ATTENTE"}},
			{"id": "f0_admissions_door", "x": 26.0, "side": "s", "opts": {"window": true, "sign": "ADMISSIONS"}},
			{"id": "f0_lockers_door", "x": -28.0, "side": "n", "opts": {"sign": "VESTIAIRES"}},
			{"id": "f0_cafeteria_door", "x": -18.0, "side": "n", "w": 1.8, "opts": {"double": true, "window": true, "sign": "CAFÉTÉRIA"}},
			{"id": "f0_lounge_door", "x": 11.0, "side": "n", "opts": {"sign": "DÉTENTE PERSONNEL"}},
		],
		"windows": [{"x": -21.5, "side": "n", "w": 2.4}, {"x": 23.0, "side": "s", "w": 2.4}],
		"light_mode": LightFixture.Mode.FLICKER,
		"light_energy": 0.6,
	})
	k.glass_x("f0_corridor", -22.7, -20.3, HKit.CN, 1.0, 2.2, "glass_dirty")
	k.glass_x("f0_corridor", 21.8, 24.2, HKit.CS, 1.0, 2.2, "glass_dirty")
	k.elevator_doors("f0_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	_hall(f, k)
	_security(f, k)
	_rooms(f, k)
	_north(f, k)


# --- Hall ---------------------------------------------------------------------------------

static func _hall(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f0_hall"
	# Cloisons latérales du hall (toute la hauteur de l'étage) : salle d'attente ouverte, sécurité fermée
	k.wall_z(Z, "wall_hospital", HKit.CS, HKit.ZS, -12.0, [{"a": -9.5, "b": -2.5, "top": 2.8}], "", HKit.H)
	k.wall_z(Z, "wall_hospital", HKit.CS, HKit.ZS, 12.0, [HKit.op(-6.0, 1.3)], "", HKit.H)
	# Retombée au-dessus du couloir (le hall monte sur deux niveaux)
	f.geo.box(Z, "wall_hospital", k.p(0, HKit.CS, 3.5), Vector3(24.0, 1.0, 0.2), {"collide": false})
	# Poteaux de la mezzanine
	for x in [-9.0, 9.0]:
		for z in [-10.0, -2.0]:
			g.cylinder(Z, "wall_concrete", k.p(x, z), k.p(x, z, 3.72), 0.28, {"segments": 14, "collide": true})
	HProps.reception_desk(g, Z, k.p(0, -8.6), PI, 6.0, "wood_light")
	Props.computer(g, Z, k.p(-1.4, -8.9, 0.76), 0.0, "screen_off")
	Props.computer(g, Z, k.p(1.6, -8.9, 0.76), 0.0, "screen_error")
	Props.office_chair(g, Z, k.p(0.8, -9.8), 3.4)
	Props.papers(g, Z, k.p(-0.5, -6.5), 2.2, 10)
	f.add_label(Z, "ACCUEIL", k.p(0, -8.3, 1.6), 0.0, 1.4, Color(0.8, 0.82, 0.8))
	var phone := Phone.new()
	phone.position = k.p(-2.2, -8.7, 1.14)
	phone.rotation.y = PI
	g.zone_root(Z).add_child(phone)
	f.nodes["hall_phone"] = phone
	# Bancs, plantes, corps
	for z in [-4.0, -1.8]:
		Props.bench_row(g, Z, k.p(-6.0, z), 0.0, 5)
		Props.bench_row(g, Z, k.p(6.0, z), 0.0, 5)
	for p in [k.p(-11.2, -0.8), k.p(11.2, -0.8), k.p(-11.2, -11.2)]:
		Props.plant(g, Z, p)
	HProps.corpse(f, Z, k.p(3.2, -5.6), 2.4, "face", {"cloth_tint": Color(0.06, 0.08, 0.16), "cloth_mix": 0.95})
	f.add_examine(Z, k.p(3.4, -5.0, 0.5), "Un agent de sécurité. Mordu à la gorge. Son étui de pistolet est vide ; sur son badge : « G. MOREL — SÉCURITÉ ».", {"radius": 1.8})
	HProps.blood_trail(f, Z, k.p(3.0, -5.0), k.p(11.2, -6.0), 7)
	f.add_blood(Z, k.p(0.2, -1.2, 0.01), 1.6, "blood_dry")
	Props.wheelchair(g, Z, k.p(-3.5, -6.5), 0.9)
	# Plan des étages
	g.box(Z, "metal_dark", k.p(-11.85, -11.0, 1.55), Vector3(0.08, 1.9, 1.9), {"collide": false})
	g.box(Z, "metal_white", k.p(-11.8, -11.0, 1.55), Vector3(0.04, 1.8, 1.8), {"collide": false})
	var lines := ""
	for lv in range(12, -3, -1):
		lines += "%s  %s\n" % [HospitalLevel.floor_label(lv), String(HospitalLevel.FLOOR_NAMES.get(lv, ""))]
	var lbl := f.add_label(Z, "PLAN DES ÉTAGES\n\n" + lines, k.p(-11.77, -11.0, 1.55), PI / 2.0, 0.2, Color(0.1, 0.12, 0.15))
	lbl.width = 1100.0
	lbl.autowrap_mode = TextServer.AUTOWRAP_OFF
	f.add_examine(Z, k.p(-11.2, -11.0, 1.4), "Le plan des étages. Douze niveaux et deux sous-sols. Neurologie, 3e étage : le service de Sarah. Tout en haut, le 12e : « Accès réglementé — Recherche ».", {"radius": 1.6})
	# Grande enseigne dans le hall
	f.add_label(Z, "BLACKWOOD", k.p(0, -11.85, 6.2), 0.0, 5.5, Color(0.78, 0.8, 0.78), false, UITheme.font_title())
	f.add_label(Z, "CENTRE HOSPITALIER UNIVERSITAIRE", k.p(0, -11.85, 5.0), 0.0, 1.3, Color(0.6, 0.62, 0.6))
	# Éclairage de secours : faible, par intermittence ; la lune entre par le mur-rideau
	for p in [k.p(-6.0, -6.0, 3.6), k.p(6.0, -6.0, 3.6)]:
		f.add_light(Z, p, EMERGENCY, 0.7, 8.0, LightFixture.Mode.FLICKER, {"panel": Vector3(0.5, 0.1, 0.2), "fog": 0.6, "buzz": true})
	f.add_trigger("f0_hall", k.p(0, -5.0, 1.2), Vector3(16.0, 2.4, 8.0))
	f.add_trigger("f0_arrive", k.p(-9.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))
	f.anchors["hall_view"] = k.p(0, -4.0, 2.0)


# --- Poste de sécurité ----------------------------------------------------------------------

static func _security(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f0_security"
	k.door("f0_security_door", Z, 12.0, -6.0, true, 1.3, {"sign": "SÉCURITÉ", "mat": "metal_gray", "window": true})
	HProps.monitor_wall(f, Z, k.p(19.85, -6.0), PI / 2.0, 4, 2)
	Props.desk(g, Z, k.p(18.4, -6.0), PI / 2.0, "wood_desk", 2.2, 0.8)
	Props.office_chair(g, Z, k.p(17.3, -6.2), -PI / 2.0 + 0.3)
	Props.computer(g, Z, k.p(18.5, -5.4, 0.76), PI / 2.0, "screen_terminal")
	f.add_pickup("f0_baton", Z, "baton", 1, k.p(18.3, -6.5, 0.78), 0.3,
		{"msg": "Matraque télescopique. Silencieuse. Mieux que rien. [1] pour l'équiper."})
	f.add_doc("doc_security_log", Z, k.p(18.4, -7.0, 0.78), -0.4, "folder")
	Props.lockers(g, Z, k.p(14.0, -0.4), 0.0, 4, "metal_dark", 2)
	f.add_examine(Z, k.p(14.2, -0.8, 1.2), "L'armoire à armes est ouverte. Vide. Quelqu'un est parti avec tout ce qu'il y avait. Derrière, une boîte de 9 mm oubliée.", {"radius": 1.6})
	f.add_pickup("f0_sec_ammo", Z, "ammo_9mm", 10, k.p(14.8, -0.6, 0.0), 0.8)
	f.add_pickup("f0_sec_battery", Z, "battery", 1, k.p(17.9, -5.2, 0.78), 0.4)
	Props.table(g, Z, k.p(13.4, -11.3), 0.0, 1.2, 0.6)
	f.add_save_point(Z, k.p(13.4, -11.3, 0.75), PI)
	Props.filing_cabinet(g, Z, k.p(15.4, -11.6), PI, 1.32, "metal_gray", 1)
	Props.papers(g, Z, k.p(15.5, -8.0), 1.4, 7)
	f.add_blood(Z, k.p(14.5, -9.0, 0.01), 1.4, "blood")
	f.add_light(Z, k.p(18.4, -6.0, 1.3), Color(0.5, 0.7, 1.0), 0.6, 5.0, LightFixture.Mode.STEADY, {})
	f.ceiling_light(Z, k.p(16.0, -4.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.7)
	f.add_light(Z, k.p(13.4, -11.0, 1.6), Color(1.0, 0.75, 0.45), 0.5, 4.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.12, 0.12, 0.12)})
	# L'agent qui gît ici n'est pas tout à fait mort
	f.add_spawn("f0_guard", "hollow", k.p(14.6, -9.2, 0.05), 0.4, [], {"variant": "guard", "dormant": true, "deep_sleep": true})


# --- Pharmacie, attente, admissions --------------------------------------------------------

static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	# Pharmacie : comptoir, rayonnages
	var P := "f0_pharmacy"
	for i in 3:
		Props.shelf(g, P, k.p(-31.4, -10.0 + i * 3.0), PI / 2.0, 2.4, 2.1, 0.45, 0.9)
	Props.shelf(g, P, k.p(-26.0, -5.0), 0.0, 2.4, 1.8, 0.45, 0.6)
	HProps.reception_desk(g, P, k.p(-28.0, -9.6), 0.0, 4.5, "metal_white")
	f.add_pickup("f0_pharma_spray1", P, "spray", 1, k.p(-26.5, -9.7, 1.15), 0.2)
	f.add_pickup("f0_pharma_spray2", P, "spray", 1, k.p(-30.8, -1.5, 0.0), 1.2)
	f.add_pickup("f0_pharma_ammo", P, "ammo_9mm", 12, k.p(-27.0, -3.0, 0.0), 0.3, {"msg": "Une boîte de 9 mm, dans le tiroir-caisse. Un pharmacien prévoyant."})
	Props.papers(g, P, k.p(-28.5, -6.0), 1.6, 10)
	f.ceiling_light(P, k.p(-28.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	# Salle d'attente et kiosque
	var W := "f0_waiting"
	for z in [-9.5, -6.5, -3.5]:
		Props.bench_row(g, W, k.p(-19.0, z), 0.0, 6, "fabric_blue")
	Props.vending_machine(g, W, k.p(-23.5, -1.0), -PI / 2.0)
	Props.vending_machine(g, W, k.p(-23.5, -2.2), -PI / 2.0)
	Props.tv_on_wall(g, W, k.p(-21.0, -11.5, 2.3), PI)
	HProps.reception_desk(g, W, k.p(-15.0, -1.6), 0.0, 2.6, "wood_desk")
	f.add_label(W, "RELAIS PRESSE", k.p(-15.0, -0.32, 2.3), PI, 0.9, Color(0.9, 0.3, 0.2))
	f.add_pickup("f0_kiosk_ammo", W, "ammo_9mm", 8, k.p(-15.4, -1.5, 0.78), 0.4)
	HProps.corpse(f, W, k.p(-20.5, -7.9), 0.6, "curl", {"cloth_tint": Color(0.4, 0.3, 0.2), "cloth_mix": 0.8})
	f.add_blood(W, k.p(-20.2, -7.6, 0.01), 1.2, "blood_dry")
	f.ceiling_light(W, k.p(-18.0, -6.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.6)
	# Admissions
	var A := "f0_admissions"
	for i in 3:
		Props.desk(g, A, k.p(22.5 + i * 3.2, -8.0), PI)
		Props.computer(g, A, k.p(22.5 + i * 3.2, -8.1, 0.76), PI, "screen_off" if i != 1 else "screen_terminal")
		Props.office_chair(g, A, k.p(22.5 + i * 3.2, -7.0), PI + randf_range(-0.5, 0.5), i == 2)
	for i in 4:
		Props.filing_cabinet(g, A, k.p(30.0 - i * 0.5, -0.4), PI, 1.32, "metal_gray", 2 if i == 1 else -1)
	f.add_doc("doc_communique", A, k.p(25.5, -8.0, 0.78), 0.2)
	f.add_pickup("f0_adm_spray", A, "spray", 1, k.p(28.8, -8.2, 0.78), 1.0)
	Props.papers(g, A, k.p(26.0, -4.0), 2.4, 12)
	f.ceiling_light(A, k.p(26.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	f.add_spawn("f0_adm_patient", "hollow", k.p(27.0, -3.5, 0.05), PI * 0.8, [k.p(22.0, -3.0, 0.05), k.p(30.5, -5.0, 0.05)], {"variant": "patient"})


# --- Côté nord : vestiaires, cafétéria, détente ---------------------------------------------

static func _north(f: Facility, k: HKit) -> void:
	var g := f.geo
	var L := "f0_lockers"
	for i in 3:
		Props.lockers(g, L, k.p(-31.7, -24.8 + i * 1.3), -PI / 2.0, 3, "metal_green", 1 if i == 1 else -1)
		Props.lockers(g, L, k.p(-24.35, -24.8 + i * 1.3), PI / 2.0, 3, "metal_blue")
	Props.bench_row(g, L, k.p(-28.0, -21.5), PI / 2.0, 4, "fabric_green")
	f.add_doc("doc_nurse_note", L, k.p(-27.6, -21.5, 0.48), 0.5)
	f.add_pickup("f0_locker_spray", L, "spray", 1, k.p(-31.0, -23.5, 0.0), 0.0)
	f.ceiling_light(L, k.p(-28.0, -21.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.6)
	# Cafétéria : trois patients « mangent »
	var C := "f0_cafeteria"
	for x in [-21.0, -16.0]:
		for z in [-23.5, -19.5]:
			Props.table(g, C, k.p(x, z), 0.0, 1.6, 0.9, 0.75, "wood_light")
			for s in [-1.0, 1.0]:
				Props.chair(g, C, k.p(x + s * 0.45, z - 0.75), PI)
				Props.chair(g, C, k.p(x - s * 0.45, z + 0.75), 0.0)
	HProps.reception_desk(g, C, k.p(-18.5, -24.8), PI, 5.0, "metal_steel")
	Props.fridge(g, C, k.p(-23.3, -25.5), PI)
	HProps.corpse(f, C, k.p(-18.3, -21.8), 1.2, "back", {"cloth_tint": Color(0.7, 0.7, 0.68), "cloth_mix": 0.6, "blood": 1.0})
	f.add_blood(C, k.p(-17.5, -21.2, 0.01), 2.0, "blood")
	f.add_pickup("f0_pharmacy_key", C, "key_pharmacy", 1, k.p(-17.4, -20.7, 0.0), 0.8,
		{"msg": "Un trousseau à la ceinture du pharmacien : « RIDEAU PHARMACIE »."})
	f.add_spawn("f0_caf1", "hollow", k.p(-18.8, -20.7, 0.05), PI * 0.9, [], {"variant": "patient"})
	f.add_spawn("f0_caf2", "hollow", k.p(-16.8, -22.6, 0.05), -PI * 0.4, [], {"variant": "patient"})
	f.add_spawn("f0_caf3", "hollow", k.p(-22.5, -18.2, 0.05), 0.2, [k.p(-22.5, -18.2, 0.05), k.p(-14.0, -24.0, 0.05)], {"variant": "patient"})
	f.ceiling_light(C, k.p(-18.0, -21.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.7)
	# Espace détente
	var D := "f0_lounge"
	Props.sofa(g, D, k.p(9.0, -25.3), PI)
	Props.sofa(g, D, k.p(15.3, -21.5), PI / 2.0, "fabric_green")
	Props.table(g, D, k.p(9.5, -22.8), 0.0, 1.0, 0.6, 0.45)
	Props.vending_machine(g, D, k.p(6.5, -18.0), -PI / 2.0)
	Props.tv_on_wall(g, D, k.p(11.0, -25.5, 2.2), PI)
	Props.notice_board(g, D, k.p(15.85, -20.0), PI / 2.0)
	f.add_examine(D, k.p(15.5, -20.0, 1.5), "Le planning des gardes de nuit. « Neurologie — 3e : S. REED, 10 → 12 nov. » Entouré au feutre rouge, un mot : « Sarah — merci pour la relève ! »", {"radius": 1.6})
	f.ceiling_light(D, k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.5)

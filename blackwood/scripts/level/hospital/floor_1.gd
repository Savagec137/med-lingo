class_name HFloor1
extends RefCounted
## 1er étage — Consultations, radiologie, salles d'attente. La mezzanine domine
## le hall. En radiologie gît l'agent Diaz : son pistolet et la clé du local
## technique (-2). Au bout du couloir, l'escalier de service B et son clavier à
## code — le seul chemin vers les étages supérieurs.

const LV := 1


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var room := {"reverb": "room", "surface": "lino", "ambience": {"amb_hum": 0.35, "amb_room": 0.5, "amb_rain_inside": 0.3}}
	k.zone("f1_corridor", "1er étage — Couloir des consultations", [Rect2(-32, -16, 64, 4)], {"surface": "lino", "ambience": {"amb_hum": 0.35, "amb_vent": 0.5}})
	k.zone("f1_mezzanine", "Mezzanine", [Rect2(-12, -12, 24, 12)], {"reverb": "hall", "surface": "tile", "moon": true,
		"ambience": {"amb_rain_inside": 0.6, "amb_hum": 0.2}})
	k.zone("f1_waiting", "Salle d'attente — Consultations", [Rect2(-32, -12, 8, 12)], room)
	k.zone("f1_consult_a", "Consultation 1", [Rect2(-24, -12, 6, 12)], room)
	k.zone("f1_consult_b", "Consultation 2", [Rect2(-18, -12, 6, 12)], room)
	k.zone("f1_radiology", "Radiologie — Accueil", [Rect2(12, -12, 12, 12)], room)
	k.zone("f1_xray", "Salle de radiographie", [Rect2(24, -12, 8, 12)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.6}})
	k.zone("f1_records", "Archives médicales", [Rect2(-32, -26, 8, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.3}})
	k.zone("f1_care", "Salle de soins", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.4}})
	k.zone("f1_staff", "Salle de pause du personnel", [Rect2(6, -26, 10, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.4}})
	k.standard({
		"zone": "f1_corridor",
		"mats": {"wall": "wall_hospital", "corridor_floor": "floor_lino", "floor_s": "floor_lino", "floor_n": "floor_lino"},
		"zones_s": [{"zone": "f1_waiting", "x1": -32, "x2": -24}, {"zone": "f1_consult_a", "x1": -24, "x2": -18, "floor": "floor_retro"},
			{"zone": "f1_consult_b", "x1": -18, "x2": -12, "floor": "floor_retro"},
			{"zone": "f1_mezzanine", "x1": -12, "x2": 12, "floor": "none", "ceiling": "none"},
			{"zone": "f1_radiology", "x1": 12, "x2": 24}, {"zone": "f1_xray", "x1": 24, "x2": 32, "floor": "floor_tile_lab"}],
		"zones_n": [{"zone": "f1_records", "x1": -32, "x2": -24}, {"zone": "f1_care", "x1": -24, "x2": -12, "floor": "floor_tile_lab"},
			{"zone": "f1_staff", "x1": 6, "x2": 16, "floor": "floor_wood"}],
		"skip_north": [HKit.STAIR_A, HKit.ELEV, HKit.STAIR_B],
		"north_walls": [-24.0, 6.0, 16.0],
		"south_walls": [-24.0, -18.0],
		"south_open": [Vector2(-12, -6), Vector2(6, 12)],
		"doors": [
			{"id": "f1_waiting_door", "x": -28.0, "side": "s", "w": 1.8, "opts": {"double": true, "open": true, "sign": "ATTENTE"}},
			{"id": "f1_consult_a_door", "x": -21.0, "side": "s", "opts": {"sign": "CONSULTATION 1"}},
			{"id": "f1_consult_b_door", "x": -15.0, "side": "s", "opts": {"sign": "CONSULTATION 2"}},
			{"id": "f1_radiology_door", "x": 16.0, "side": "s", "w": 1.8, "opts": {"double": true, "window": true, "sign": "RADIOLOGIE"}},
			{"id": "f1_records_door", "x": -28.0, "side": "n", "opts": {"sign": "ARCHIVES MÉDICALES"}},
			{"id": "f1_care_door", "x": -18.0, "side": "n", "opts": {"sign": "SALLE DE SOINS", "window": true}},
			{"id": "f1_staff_door", "x": 11.0, "side": "n", "opts": {"sign": "PAUSE"}},
		],
		"windows": [{"x": -21.5, "side": "n", "w": 2.4}, {"x": 20.5, "side": "s", "w": 2.6}],
		"light_mode": LightFixture.Mode.FLICKER,
		"light_energy": 0.55,
	})
	k.glass_x("f1_corridor", -22.7, -20.3, HKit.CN, 1.0, 2.2, "glass_dirty")
	k.glass_x("f1_corridor", 19.2, 21.8, HKit.CS, 1.0, 2.2, "glass_dirty")
	k.elevator_doors("f1_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	_mezzanine(f, k)
	_radiology(f, k)
	_rooms(f, k)
	_stair_b(f, k)


static func _mezzanine(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f1_mezzanine"
	# Dalle autour du vide sur le hall
	for r in [Rect2(-12, -12, 24, 2), Rect2(-12, -2, 24, 2), Rect2(-12, -10, 3, 8), Rect2(9, -10, 3, 8)]:
		k.slab(Z, "floor_tile", r.position.x, r.position.y, r.end.x, r.end.y)
	k.ceiling(Z, "ceiling_tile", -12, -12, 12, 0, 3.6)
	# Cloisons latérales pleine hauteur, retombée au-dessus du couloir
	k.wall_z(Z, "wall_hospital", HKit.CS, HKit.ZS, -12.0, [], "", HKit.H)
	k.wall_z(Z, "wall_hospital", HKit.CS, HKit.ZS, 12.0, [], "", HKit.H)
	g.box(Z, "wall_hospital", k.p(0, HKit.CS, 3.5), Vector3(24.0, 1.0, 0.2), {"collide": false})
	# Garde-corps vitrés autour du vide
	for seg in [[Vector3(-9, 0, -10), Vector3(9, 0, -10)], [Vector3(-9, 0, -2), Vector3(9, 0, -2)],
			[Vector3(-9, 0, -10), Vector3(-9, 0, -2)], [Vector3(9, 0, -10), Vector3(9, 0, -2)]]:
		var a: Vector3 = seg[0] + Vector3(0, k.y, 0)
		var b: Vector3 = seg[1] + Vector3(0, k.y, 0)
		Props.railing(g, Z, a, b, 1.05, "metal_steel")
		var mid := (a + b) * 0.5
		var along_x: bool = absf(b.x - a.x) > 0.1
		g.box(Z, "glass", mid + Vector3(0, 0.55, 0), Vector3(absf(b.x - a.x) if along_x else 0.02, 0.9, 0.02 if along_x else absf(b.z - a.z)), {"collide": false})
		g.box(Z, "wall_facade_dark", mid + Vector3(0, -0.2, 0), Vector3(absf(b.x - a.x) + 0.3 if along_x else 0.3, 0.4, 0.3 if along_x else absf(b.z - a.z) + 0.3), {"collide": false})
	# Attente avec vue sur le parking
	for x in [-6.0, 0.0, 6.0]:
		Props.bench_row(g, Z, k.p(x, -0.9), PI, 4, "fabric_green")
	Props.bench_row(g, Z, k.p(-4.5, -11.0), PI, 5)
	Props.bench_row(g, Z, k.p(4.5, -11.0), PI, 5)
	for p in [k.p(-11.2, -11.3), k.p(11.2, -11.3), k.p(-11.2, -0.8), k.p(11.2, -0.8)]:
		Props.plant(g, Z, p)
	Props.wheelchair(g, Z, k.p(10.5, -6.0), -1.2)
	Props.papers(g, Z, k.p(-10.5, -5.0), 1.2, 6)
	f.add_blood(Z, k.p(10.4, -8.5, 0.01), 1.1, "blood_dry")
	f.add_label(Z, "RADIOLOGIE", k.p(11.85, -6.0, 2.2), -PI / 2.0, 0.9, Color(0.85, 0.85, 0.8))
	f.add_label(Z, "CONSULTATIONS", k.p(-11.85, -6.0, 2.2), PI / 2.0, 0.9, Color(0.85, 0.85, 0.8))
	for x in [-6.0, 6.0]:
		f.add_light(Z, k.p(x, -11.0, 3.5), Color(1.0, 0.85, 0.62), 0.5, 7.0, LightFixture.Mode.FLICKER, {"panel": Vector3(0.6, 0.06, 0.6), "fog": 0.5})
	f.add_spawn("f1_mezz_patient", "hollow", k.p(-10.5, -4.0, 0.05), 0.0, [k.p(-10.5, -8.5, 0.05), k.p(10.5, -11.0, 0.05), k.p(10.5, -1.0, 0.05)], {"variant": "patient"})
	f.add_trigger("f1_arrive", k.p(-9.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))


static func _radiology(f: Facility, k: HKit) -> void:
	var g := f.geo
	var R := "f1_radiology"
	HProps.reception_desk(g, R, k.p(17.5, -6.5), -PI / 2.0, 3.5, "wood_light")
	Props.computer(g, R, k.p(17.8, -6.0, 0.76), PI / 2.0, "screen_terminal")
	Props.bench_row(g, R, k.p(14.0, -1.0), 0.0, 3)
	Props.bench_row(g, R, k.p(21.0, -1.0), 0.0, 3)
	HProps.lightbox(f, R, k.p(20.5, -11.85, 1.6), PI, true)
	f.add_examine(R, k.p(20.5, -11.4, 1.5), "Des radiographies de thorax sur le négatoscope. Les côtes… il y en a deux rangées, la seconde a poussé à travers la première. Annotation : « Patient 4 — J+3. Croissance osseuse non contrôlée. Transférer au 8e. »", {"radius": 1.7})
	f.add_blood(R, k.p(19.0, -3.0, 0.01), 1.3, "blood_dry")
	Props.office_chair(g, R, k.p(15.5, -3.5), 0.8, true)
	f.ceiling_light(R, k.p(18.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.55)
	f.add_spawn("f1_radiologist", "hollow", k.p(15.0, -8.0, 0.05), PI * 0.5, [k.p(14.0, -9.0, 0.05), k.p(22.0, -4.0, 0.05)], {"variant": "nurse"})
	# Salle de radiographie : porte plombée, l'agent Diaz, un patient qui écoute dans le noir
	var X := "f1_xray"
	k.wall_z(X, "wall_tile_white", HKit.CS, HKit.ZS, 24.0, [HKit.op(-6.0, 1.4)])
	k.door("f1_xray_door", X, 24.0, -6.0, true, 1.4, {"mat": "metal_gray", "heavy": true, "sign": "RAYONS X — ACCÈS RÉGLEMENTÉ"})
	HProps.xray(g, X, k.p(28.5, -6.5), 0.0)
	Props.medical_cabinet(g, X, k.p(31.6, -10.5), PI / 2.0)
	HProps.corpse(f, X, k.p(25.2, -0.45), 0.0, "sit", {"cloth_tint": Color(0.06, 0.08, 0.16), "cloth_mix": 0.95, "blood": 0.9})
	f.add_blood(X, k.p(25.3, -1.2, 0.01), 1.4, "blood")
	f.add_blood(X, k.p(25.2, -0.02, 1.2), 1.0, "blood_smear", Vector3.FORWARD)
	f.add_examine(X, k.p(25.3, -1.0, 0.8), "L'agent Diaz. Il s'est barricadé ici, puis s'est tiré une balle quand la morsure a commencé à brûler. À sa ceinture, un trousseau : « LOCAL TECHNIQUE — SOUS-SOL -2 ».", {"radius": 1.6})
	f.add_pickup("f1_pistol", X, "pistol", 1, k.p(26.0, -1.5, 0.02), 0.6, {"msg": "Le pistolet de l'agent Diaz. Chargeur de 12. [2] pour l'équiper."})
	f.add_pickup("f1_tech_key", X, "key_technical", 1, k.p(24.7, -1.3, 0.02), 1.4, {"msg": "Clé du local technique (sous-sol -2)."})
	f.add_pickup("f1_xray_ammo", X, "ammo_9mm", 12, k.p(29.8, -10.9, 0.0), 0.2)
	f.add_light(X, k.p(28.5, -6.5, 2.9), Color(0.9, 0.5, 0.3), 0.5, 6.0, LightFixture.Mode.BROKEN, {"panel": Vector3(0.4, 0.05, 0.4), "buzz": true})
	f.add_light(X, k.p(31.7, -2.0, 2.4), Color(1.0, 0.15, 0.08), 0.35, 4.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.1, 0.25, 0.25)})
	f.add_spawn("f1_xray_neuro", "hollow", k.p(30.8, -8.6, 0.05), PI / 2.0, [], {"variant": "neuro"})
	f.add_trigger("f1_xray", k.p(26.5, -6.0, 1.2), Vector3(3.5, 2.4, 10.0))


static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	# Salle d'attente
	var W := "f1_waiting"
	for z in [-9.5, -6.5, -3.5]:
		Props.bench_row(g, W, k.p(-28.0, z), 0.0, 5, "fabric_blue")
	Props.tv_on_wall(g, W, k.p(-28.0, -11.5, 2.3), PI)
	Props.plant(g, W, k.p(-31.3, -0.8))
	f.add_spawn("f1_wait1", "hollow", k.p(-29.2, -6.1, 0.05), 0.0, [], {"variant": "patient"})
	f.add_spawn("f1_wait2", "hollow", k.p(-26.4, -3.1, 0.05), 0.3, [], {"variant": "patient", "dormant": true})
	f.ceiling_light(W, k.p(-28.0, -6.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.5)
	# Consultations
	for z0 in [["f1_consult_a", -21.0], ["f1_consult_b", -15.0]]:
		var C: String = z0[0]
		var cx: float = z0[1]
		Props.desk(g, C, k.p(cx, -4.0), PI)
		Props.office_chair(g, C, k.p(cx, -3.1), PI + 0.3)
		Props.chair(g, C, k.p(cx - 0.6, -5.0), PI, "metal_gray", "fabric_blue")
		Props.computer(g, C, k.p(cx + 0.3, -4.1, 0.76), PI, "screen_off")
		Props.gurney(g, C, k.p(cx + 1.8, -9.0), 0.0)
		Props.sink(g, C, k.p(cx - 2.6, -10.0), -PI / 2.0)
		f.ceiling_light(C, k.p(cx, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.45)
	f.add_doc("doc_patient_file", "f1_consult_a", k.p(-21.3, -4.1, 0.78), 0.4, "folder")
	f.add_pickup("f1_consult_spray", "f1_consult_b", "spray", 1, k.p(-14.6, -4.2, 0.78), 0.1)
	Props.papers(g, "f1_consult_b", k.p(-15.0, -7.0), 1.5, 9)
	# Archives médicales
	var A := "f1_records"
	for i in 4:
		Props.shelf(g, A, k.p(-28.0, -24.8 + i * 2.2), 0.0, 6.0, 2.2, 0.45, 0.95, "metal_gray")
	f.add_pickup("f1_records_ammo", A, "ammo_9mm", 8, k.p(-30.4, -18.0, 0.0), 0.5)
	f.add_pickup("f1_records_battery", A, "battery", 1, k.p(-25.6, -17.4, 0.0), 1.2)
	f.ceiling_light(A, k.p(-28.0, -21.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.5)
	# Salle de soins
	var S := "f1_care"
	for i in 4:
		Props.medical_cabinet(g, S, k.p(-22.5 + i * 0.9, -25.6), PI)
	Props.sink(g, S, k.p(-13.4, -24.0), PI / 2.0)
	Props.table(g, S, k.p(-18.0, -21.0), 0.0, 2.0, 0.9, 0.9, "metal_white", "metal_steel")
	f.add_doc("doc_care_log", S, k.p(-18.4, -21.0, 0.92), 0.1)
	f.add_pickup("f1_care_spray", S, "spray", 1, k.p(-17.4, -21.2, 0.92), 0.7)
	HProps.cart(g, S, k.p(-14.5, -18.0), 0.5)
	f.ceiling_light(S, k.p(-18.0, -21.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.5)
	# Salle de pause
	var P := "f1_staff"
	Props.sofa(g, P, k.p(11.0, -25.3), PI, "fabric_blue")
	Props.table(g, P, k.p(11.0, -21.5), 0.0, 1.4, 0.8)
	Props.fridge(g, P, k.p(6.5, -24.8), -PI / 2.0)
	Props.chair(g, P, k.p(10.3, -20.7), 0.0)
	Props.chair(g, P, k.p(11.8, -22.3), PI)
	f.add_pickup("f1_staff_ammo", P, "ammo_9mm", 6, k.p(11.3, -21.4, 0.75), 1.2)
	f.add_examine(P, k.p(11.0, -21.2, 1.0), "Trois tasses de café, à moitié bues. Un téléphone portable : 47 appels manqués. Tous du même numéro : « Maman ».", {"radius": 1.5})
	f.ceiling_light(P, k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.5)


## Porte de l'escalier de service B : clavier à code (le code est au 3e, dans le casier de Sarah).
static func _stair_b(f: Facility, k: HKit) -> void:
	var cp := CodePanel.new()
	cp.code = "0612"
	cp.panel_id = "stair_b_code"
	cp.title = "ESCALIER DE SERVICE B"
	cp.door_id = "stair_b_1"
	cp.done_flag = "stair_b_open"
	cp.position = k.p(26.1, HKit.CN + 0.1, 1.3)
	f.geo.zone_root("f1_corridor").add_child(cp)
	f.nodes["stair_b_code"] = cp
	f.add_label("f1_corridor", "ESCALIER DE SERVICE B — ÉTAGES 1 À 6", k.p(28.0, HKit.CN + 0.12, 2.6), 0.0, 0.6, Color(0.85, 0.85, 0.8))

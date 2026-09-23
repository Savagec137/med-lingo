class_name HFloor8
extends RefCounted
## 8e étage — Laboratoire expérimental du Projet ECHO. La salle des cuves et
## ses patients expérimentaux, la salle d'expérimentation où rampe le Néonatal,
## la vidéo de Sarah, le coffre du Dr Vance (magnum + clé de l'ascenseur de
## direction) et la cellule C-7 d'où le Colossus finira par sortir.

const LV := 8


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var lab := {"reverb": "room", "surface": "tile", "ambience": {"amb_lab": 0.6, "amb_hum": 0.4}}
	k.zone("f8_corridor", "Laboratoire expérimental — 8e étage", [Rect2(-32, -16, 64, 4)], {"surface": "tile", "ambience": {"amb_lab": 0.4, "amb_vent": 0.6}})
	k.zone("f8_lab", "Salle des cuves", [Rect2(-32, -12, 32, 12)], lab)
	k.zone("f8_video", "Bureau de recherche", [Rect2(0, -12, 12, 12)], {"reverb": "room", "surface": "lino", "ambience": {"amb_hum": 0.4, "amb_rain_inside": 0.3}})
	k.zone("f8_exp", "Salle d'expérimentation", [Rect2(12, -12, 20, 12)], lab)
	k.zone("f8_colossus", "Cellule d'isolement C-7", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "surface": "concrete", "ambience": {"amb_hum": 0.6}})
	k.zone("f8_vance", "Bureau du Dr Vance", [Rect2(6, -26, 10, 10)], {"reverb": "room", "surface": "wood", "ambience": {"amb_hum": 0.3, "amb_room": 0.4}})
	k.zone("f8_server", "Salle des serveurs", [Rect2(24, -26, 8, 10)], {"reverb": "room", "surface": "metal", "ambience": {"amb_hum": 0.9}})
	k.standard({
		"zone": "f8_corridor",
		"mats": {"wall": "wall_lab", "corridor_floor": "floor_tile_lab", "floor_s": "floor_tile_lab", "floor_n": "floor_tile_lab"},
		"zones_s": [{"zone": "f8_lab", "x1": -32, "x2": 0}, {"zone": "f8_video", "x1": 0, "x2": 12, "floor": "floor_lino"},
			{"zone": "f8_exp", "x1": 12, "x2": 32}],
		"zones_n": [{"zone": "f8_colossus", "x1": -24, "x2": -12, "floor": "floor_concrete", "ceiling": "ceiling_concrete"},
			{"zone": "f8_vance", "x1": 6, "x2": 16, "floor": "floor_wood"}, {"zone": "f8_server", "x1": 24, "x2": 32, "floor": "floor_metal"}],
		"skip_north": [HKit.STAIR_C, HKit.FREIGHT, HKit.PRIVATE],
		"north_walls": [-12.0, 6.0, 16.0, 24.0],
		"south_walls": [0.0, 12.0],
		"doors": [
			{"id": "f8_lab_door_w", "x": -24.0, "side": "s", "w": 1.8, "opts": {"double": true, "window": true, "mat": "metal_white", "sign": "SALLE DES CUVES"}},
			{"id": "f8_lab_door_e", "x": -8.0, "side": "s", "w": 1.8, "opts": {"double": true, "window": true, "mat": "metal_white", "sign": "PROJET ECHO — PHASE III"}},
			{"id": "f8_video_door", "x": 6.0, "side": "s", "opts": {"sign": "BUREAU DE RECHERCHE", "window": true}},
			{"id": "f8_exp_door", "x": 22.0, "side": "s", "w": 1.8, "opts": {"double": true, "mat": "metal_white", "sign": "EXPÉRIMENTATION"}},
			{"id": "f8_colossus_door", "x": -18.0, "side": "n", "w": 1.8, "opts": {"double": true, "heavy": true, "mat": "metal_dark",
				"lock": Door.Lock.LOCKED, "sign": "C-7 — SUJET 12 — NE PAS OUVRIR", "locked_msg": "Porte blindée. Verrouillage magnétique. Quelque chose respire derrière."}},
			{"id": "f8_vance_door", "x": 11.0, "side": "n", "opts": {"sign": "DR H. VANCE — DIRECTION SCIENTIFIQUE", "mat": "wood_door"}},
			{"id": "f8_server_door", "x": 28.0, "side": "n", "opts": {"sign": "SERVEURS", "mat": "metal_gray"}},
		],
		"windows": [{"x": -16.0, "side": "s", "w": 5.0, "bottom": 0.9, "top": 2.4}, {"x": -14.0, "side": "n", "w": 3.0, "bottom": 0.9, "top": 2.4}],
		"light_mode": LightFixture.Mode.STEADY,
		"light_energy": 0.7,
	})
	k.glass_x("f8_corridor", -18.5, -13.5, HKit.CS, 0.9, 2.4, "glass")
	var cg := BreakableGlass.new()
	cg.glass_id = "f8_c7"
	cg.size = Vector3(3.0, 1.5, 0.06)
	cg.position = k.p(-14.0, HKit.CN, 1.65)
	f.geo.zone_root("f8_corridor").add_child(cg)
	f.nodes["glass_f8_c7"] = cg
	k.elevator_doors("f8_corridor", 16, 20, [18.0], "freight", "MONTE-CHARGE")
	k.elevator_doors("f8_corridor", 20, 24, [22.0], "private", "ASCENSEUR DE DIRECTION")
	_tank_lab(f, k)
	_video(f, k)
	_exp(f, k)
	_north(f, k)
	_corridor(f, k)


static func _tank_lab(f: Facility, k: HKit) -> void:
	var g := f.geo
	var L := "f8_lab"
	for i in 6:
		HProps.tank(f, L, k.p(-29.0 + i * 4.6, -2.5), true, "liquid_green" if i % 3 != 1 else "liquid_amber")
	for i in 3:
		HProps.tank(f, L, k.p(-26.5 + i * 9.0, -7.5), i != 1)
	for x in [-22.0, -12.0]:
		Props.table(g, L, k.p(x, -10.6), 0.0, 3.6, 0.9, 0.92, "metal_white", "metal_steel")
		Props.computer(g, L, k.p(x - 0.8, -10.5, 0.92), PI, "screen_ecg")
		Props.computer(g, L, k.p(x + 0.8, -10.5, 0.92), PI, "screen_terminal")
	HProps.dose_rack(g, L, k.p(-1.2, -6.0), -PI / 2.0 + PI, 3.0)
	f.add_examine(L, k.p(-26.5, -6.3, 1.4), "Dans la cuve, un homme flotte. Ses plaies se referment et se rouvrent en boucle, comme si son corps ne savait plus s'arrêter de guérir. Étiquette : « SUJET 7 — ECHO-5 — RÉGÉNÉRATION CONTINUE ».", {"radius": 1.8})
	f.add_examine(L, k.p(-17.5, -6.3, 1.4), "Cette cuve est vide. La vitre est fendue de l'intérieur. Des traces de pieds nus mènent vers la porte.", {"radius": 1.8})
	Props.rubble(g, L, k.p(-17.5, -5.8), 1.0, 8, "glass_dirty")
	f.add_blood(L, k.p(-7.0, -8.5, 0.01), 1.6, "blood_smear")
	f.add_pickup("f8_lab_ammo", L, "ammo_9mm", 15, k.p(-12.6, -10.5, 0.92), 0.4)
	f.add_pickup("f8_lab_shells", L, "ammo_shells", 5, k.p(-21.3, -10.6, 0.92), 1.4)
	for x in [-26.0, -16.0, -6.0]:
		f.add_light(L, k.p(x, -5.0, 2.9), Color(0.55, 1.0, 0.7), 0.7, 9.0, LightFixture.Mode.PULSE, {"panel": Vector3(1.2, 0.05, 0.3), "fog": 0.6})
	f.add_spawn("f8_exp1", "hollow", k.p(-20.0, -5.0, 0.05), 0.0, [k.p(-28.0, -5.0, 0.05), k.p(-4.0, -5.0, 0.05)], {"variant": "experimental"})
	f.add_spawn("f8_exp2", "hollow", k.p(-10.0, -9.0, 0.05), PI, [], {"variant": "experimental", "dormant": true})


## Bureau de recherche : la vidéo de Sarah.
static func _video(f: Facility, k: HKit) -> void:
	var g := f.geo
	var V := "f8_video"
	Props.desk(g, V, k.p(6.0, -4.5), PI, "wood_desk", 2.0, 0.9)
	Props.office_chair(g, V, k.p(6.0, -3.4), PI)
	var scr := Props.computer(g, V, k.p(6.0, -4.6, 0.78), PI, "screen_terminal")
	f.nodes["video_screen"] = scr
	var ep := EventPoint.new()
	ep.event_id = "sarah_video"
	ep.prompt_text = "LIRE LA VIDÉO — « S. REED, 11/11, 23 h 40 »"
	ep.done_flag = "sarah_video_seen"
	ep.position = k.p(6.0, -4.3, 1.0)
	g.zone_root(V).add_child(ep)
	f.nodes["sarah_video_point"] = ep
	for i in 3:
		Props.bookcase(g, V, k.p(1.0, -10.5 + i * 1.1), -PI / 2.0, 1.0)
	Props.filing_cabinet(g, V, k.p(11.5, -11.4), PI, 1.32, "metal_gray", 3)
	Props.papers(g, V, k.p(7.0, -8.0), 1.8, 10)
	f.add_light(V, k.p(6.0, -4.5, 1.4), Color(0.6, 0.8, 1.0), 0.6, 4.5, LightFixture.Mode.STEADY, {})
	f.ceiling_light(V, k.p(6.0, -8.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.5)
	f.anchors["video_cam"] = k.p(6.0, -2.6, 1.55)
	f.anchors["video_look"] = k.p(6.0, -4.75, 1.0)


## Salle d'expérimentation : tables de contention, conduit d'aération ouvert.
static func _exp(f: Facility, k: HKit) -> void:
	var g := f.geo
	var E := "f8_exp"
	for x in [16.0, 21.0, 26.0]:
		Props.operating_table(g, E, k.p(x, -5.0), 0.0)
		for s in [-1.0, 1.0]:
			g.box(E, "leather_boots", k.p(x + s * 0.32, -5.4, 0.93), Vector3(0.06, 0.04, 0.3), {"collide": false})
		Props.instrument_tray(g, E, k.p(x + 1.2, -3.0), 0.5)
	HProps.corpse(f, E, k.p(21.0, -5.9, 0.92), 0.0, "back", {"pallor": 0.8, "blood": 0.9}, 0.7)
	f.add_examine(E, k.p(21.0, -4.2, 1.1), "Un enfant. Sangles aux poignets. Fiche : « PÉDIATRIE → PROTOCOLE ECHO, sujet mineur n°3. Consentement : NON REQUIS (tutelle hospitalière) ».", {"radius": 1.6})
	# Grille d'aération arrachée : le Néonatal circule dans les gaines
	g.box(E, "black", k.p(31.85, -9.5, 0.5), Vector3(0.04, 0.6, 0.9), {"collide": false})
	g.box(E, "metal_gray", k.p(31.2, -9.5, 0.05), Vector3(0.9, 0.04, 0.9), {"rot": 0.6, "collide": false})
	f.add_examine(E, k.p(31.4, -9.5, 0.6), "La grille de la gaine d'aération a été arrachée. De l'intérieur. Des traces de petites mains ensanglantées.", {"radius": 1.5})
	Props.medical_cabinet(g, E, k.p(13.0, -11.6), PI)
	f.add_pickup("f8_exp_spray", E, "spray", 1, k.p(26.8, -1.0, 0.0), 0.4)
	f.add_pickup("f8_exp_magammo", E, "ammo_magnum", 4, k.p(16.8, -3.0, 0.98), 0.2)
	for x in [16.0, 26.0]:
		f.ceiling_light(E, k.p(x, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	f.add_spawn("f8_neonatal", "neonatal", k.p(30.0, -9.0, 0.05), PI * 0.5, [], {"vents": [k.p(31.0, -9.5, 0.05), k.p(-31.0, -14.0, 0.05), k.p(14.0, -1.0, 0.05)]})
	f.add_trigger("f8_exp", k.p(22.0, -7.0, 1.2), Vector3(18.0, 2.4, 9.0))


static func _north(f: Facility, k: HKit) -> void:
	var g := f.geo
	# Cellule C-7 : le Colossus, enchaîné
	var C := "f8_colossus"
	for x in [-22.0, -14.0]:
		g.cylinder(C, "metal_rust", k.p(x, -25.9, 2.2), k.p(-18.0, -22.0, 1.4), 0.04, {"segments": 6})
	g.box(C, "metal_dark", k.p(-18.0, -21.0, 0.05), Vector3(4.0, 0.1, 4.0), {"collide": false})
	f.add_blood(C, k.p(-17.0, -19.0, 0.01), 2.5, "blood_dry")
	f.add_light(C, k.p(-18.0, -21.0, 2.9), Color(1.0, 0.25, 0.15), 0.9, 8.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.4, 0.05, 0.4)})
	f.add_spawn("f8_colossus", "colossus", k.p(-18.0, -22.0, 0.05), 0.0, [], {"passive": true})
	f.add_examine("f8_corridor", k.p(-14.0, -15.6, 1.5), "Derrière la vitre blindée, une silhouette de près de trois mètres, enchaînée. Elle ne bouge pas. Puis sa tête se tourne, très lentement, vers moi.", {"radius": 1.7, "flag": "saw_colossus"})
	# Bureau du Dr Vance : le coffre
	var V := "f8_vance"
	Props.desk(g, V, k.p(11.0, -23.0), 0.0, "wood_desk", 2.2, 0.9)
	Props.office_chair(g, V, k.p(11.0, -24.1), 0.2)
	Props.computer(g, V, k.p(11.4, -22.9, 0.76), 0.0, "screen_terminal")
	Props.bookcase(g, V, k.p(6.4, -22.0), -PI / 2.0, 1.2)
	Props.bookcase(g, V, k.p(6.4, -20.6), -PI / 2.0, 1.2)
	Props.sofa(g, V, k.p(15.4, -20.5), PI / 2.0, "fabric_brown")
	f.add_doc("doc_vance_memo", V, k.p(10.4, -23.0, 0.78), 0.3, "folder")
	var safe := KeypadSafe.new()
	safe.code = "0309"
	safe.safe_id = "vance_safe"
	safe.title = "COFFRE — DR H. VANCE"
	safe.open_flag = "vance_safe_open"
	safe.success_msg = "Le coffre du Dr Vance s'ouvre."
	safe.contents = [{"item": "magnum", "count": 1, "id": "f8_magnum"}, {"item": "ammo_magnum", "count": 6, "id": "f8_magnum_ammo"},
		{"item": "key_private", "count": 1, "id": "f8_private_key"}]
	safe.position = k.p(13.5, -25.72, 1.3)
	g.zone_root(V).add_child(safe)
	f.nodes["vance_safe"] = safe
	f.ceiling_light(V, k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.6)
	f.add_light(V, k.p(10.2, -23.0, 1.1), Color(1.0, 0.8, 0.5), 0.5, 4.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.12, 0.12, 0.12)})
	# Salle des serveurs
	var S := "f8_server"
	for i in 3:
		HProps.server_rack(g, S, k.p(25.0 + i * 1.0, -24.8), PI)
		HProps.server_rack(g, S, k.p(25.0 + i * 1.0, -20.4), 0.0)
	f.add_pickup("f8_server_ammo", S, "ammo_9mm", 20, k.p(30.5, -17.5, 0.0), 0.3)
	f.add_pickup("f8_server_battery", S, "battery", 1, k.p(25.0, -17.3, 0.0), 0.8)
	f.add_light(S, k.p(28.0, -21.0, 2.8), Color(0.3, 0.6, 1.0), 0.6, 7.0, LightFixture.Mode.STEADY, {"panel": Vector3(1.0, 0.04, 0.2)})


static func _corridor(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f8_corridor"
	f.add_label(Z, "PROJET ECHO — PERSONNEL AUTORISÉ UNIQUEMENT", k.p(-4.0, HKit.CN + 0.12, 2.5), 0.0, 0.7, Color(0.9, 0.2, 0.15))
	HProps.cart(g, Z, k.p(2.5, -15.3), 0.4, true)
	Props.papers(g, Z, k.p(-2.0, -14.0), 2.0, 8)
	HProps.blood_trail(f, Z, k.p(-8.0, -12.5), k.p(-26.0, -14.5), 9)
	f.add_trigger("f8_arrive", k.p(18.0, -14.0, 1.2), Vector3(4.0, 2.4, 3.6))
	f.add_trigger("f8_stairc", k.p(-28.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))
	f.anchors["colossus_escape"] = k.p(2.0, -14.0, 0.05)
	f.add_save_point("f8_video", k.p(10.8, -1.0, 0.0), PI)
	Props.table(g, "f8_video", k.p(10.8, -1.0), 0.0, 0.9, 0.6)
	f.anchors["colossus_break"] = k.p(-14.0, -14.0, 0.05)

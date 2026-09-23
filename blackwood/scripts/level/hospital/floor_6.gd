class_name HFloor6
extends RefCounted
## 6e étage — Maladies infectieuses. On y arrive par l'escalier de service B et
## le sas de décontamination. Chambres d'isolement vitrées, laboratoire
## d'analyses (le journal de sécurité : badge S. REED), cellule de crise
## (pistolet-mitrailleur, carte RECHERCHE, « tout a commencé au 8e »).

const LV := 6
const Q := ["601", "602", "603", "604"]


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var iso := {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.5, "amb_vent": 0.4}}
	k.zone("f6_corridor", "Maladies infectieuses — 6e étage", [Rect2(-32, -16, 48, 4)], {"surface": "tile", "ambience": {"amb_hum": 0.5, "amb_vent": 0.6}})
	k.zone("f6_airlock", "Sas de décontamination", [Rect2(16, -16, 8, 4)], {"surface": "metal", "ambience": {"amb_vent": 0.9, "amb_hum": 0.3}})
	k.zone("f6_east", "Palier — Escalier de service B", [Rect2(24, -16, 8, 4)], {"surface": "tile", "ambience": {"amb_vent": 0.4}})
	for i in 4:
		k.zone("f6_q" + Q[i], "Chambre d'isolement " + Q[i], [Rect2(-32 + i * 8, -12, 8, 12)], iso)
	k.zone("f6_lab", "Laboratoire d'analyses", [Rect2(0, -12, 16, 12)], {"reverb": "room", "surface": "tile", "ambience": {"amb_lab": 0.5, "amb_hum": 0.3}})
	k.zone("f6_suits", "Vestiaire de confinement", [Rect2(16, -12, 16, 12)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.4}})
	k.zone("f6_pharma", "Réserve de médicaments", [Rect2(-32, -26, 8, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.4}})
	k.zone("f6_crisis", "Cellule de crise", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.35, "amb_room": 0.4}})
	k.zone("f6_monitor", "Surveillance des patients", [Rect2(6, -26, 10, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.5}})
	var doors := []
	for i in 4:
		var o := {"sign": Q[i], "window": true, "mat": "metal_white"}
		if i == 0 or i == 2:
			o["lock"] = Door.Lock.LOCKED
			o["locked_msg"] = "Verrouillage biologique actif. Le voyant du loquet est rouge."
		elif i == 3:
			o["lock"] = Door.Lock.EVENT
			o["locked_msg"] = "Verrouillage biologique actif. Derrière la vitre, quelqu'un vous regarde."
		doors.append({"id": "f6_door_" + Q[i], "x": -30.0 + i * 8.0, "side": "s", "opts": o})
	doors.append({"id": "f6_lab_door", "x": 8.0, "side": "s", "opts": {"sign": "LABORATOIRE D'ANALYSES", "window": true, "mat": "metal_white"}})
	doors.append({"id": "f6_suits_door", "x": 28.0, "side": "s", "opts": {"sign": "VESTIAIRE — TENUES NRBC", "mat": "metal_white"}})
	doors.append({"id": "f6_pharma_door", "x": -28.0, "side": "n", "opts": {"sign": "PHARMACIE DE SERVICE"}})
	doors.append({"id": "f6_crisis_door", "x": -18.0, "side": "n", "w": 1.8, "opts": {"double": true, "sign": "CELLULE DE CRISE", "window": true,
		"lock": Door.Lock.ITEM, "mat": "metal_gray", "locked_msg": "Porte électrique de la cellule de crise. Pas de courant : le boîtier à côté est ouvert, le fusible a sauté."}})
	doors.append({"id": "f6_monitor_door", "x": 11.0, "side": "n", "opts": {"sign": "SURVEILLANCE"}})
	var wins := []
	for i in 4:
		wins.append({"x": -26.0 + i * 8.0, "side": "s", "w": 3.4, "bottom": 0.9, "top": 2.3})
	k.standard({
		"zone": "f6_corridor",
		"mats": {"wall": "wall_infect", "corridor_floor": "floor_tile_lab", "floor_s": "floor_tile_lab", "floor_n": "floor_lino"},
		"zones_s": [{"zone": "f6_q601", "x1": -32, "x2": -24}, {"zone": "f6_q602", "x1": -24, "x2": -16}, {"zone": "f6_q603", "x1": -16, "x2": -8},
			{"zone": "f6_q604", "x1": -8, "x2": 0}, {"zone": "f6_lab", "x1": 0, "x2": 16}, {"zone": "f6_suits", "x1": 16, "x2": 32}],
		"zones_n": [{"zone": "f6_pharma", "x1": -32, "x2": -24}, {"zone": "f6_crisis", "x1": -24, "x2": -12}, {"zone": "f6_monitor", "x1": 6, "x2": 16}],
		"skip_north": [HKit.ELEV, HKit.STAIR_B],
		"north_walls": [-24.0, -12.0, 6.0, 16.0],
		"south_walls": [-24.0, -16.0, -8.0, 0.0, 16.0],
		"doors": doors,
		"windows": wins,
		"light_mode": LightFixture.Mode.STEADY,
		"light_energy": 0.75,
	})
	for i in 4:
		var cx := -26.0 + i * 8.0
		if i == 3:
			# Vitre de la 604 : elle éclatera quand l'infirmière passera au travers
			var bg := BreakableGlass.new()
			bg.glass_id = "f6_604"
			bg.size = Vector3(3.4, 1.4, 0.03)
			bg.position = k.p(cx, HKit.CS, 1.6)
			f.geo.zone_root("f6_corridor").add_child(bg)
			f.nodes["glass_f6_604"] = bg
		elif i != 1:
			k.glass_x("f6_corridor", cx - 1.7, cx + 1.7, HKit.CS, 0.9, 2.3, "glass")
	k.elevator_doors("f6_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	# Boîtier électrique de la porte de la cellule de crise (énigme du fusible)
	var fuse := Mechanism.new()
	fuse.kind = "fuse"
	fuse.required_item = "fuse"
	fuse.done_flag = "f6_fuse_inserted"
	fuse.idle_text = "Boîtier électrique de la cellule de crise : le fusible a sauté. Il en faut un neuf (60 A)."
	fuse.done_text = "Le fusible est en place. La porte est alimentée."
	fuse.success_text = "Le fusible s'enclenche. Les verrous de la cellule de crise se relâchent."
	fuse.target_door = f.doors["f6_crisis_door"]
	fuse.position = k.p(-19.9, HKit.CN + 0.02)
	f.geo.zone_root("f6_corridor").add_child(fuse)
	f.nodes["f6_fuse_box"] = fuse
	_airlock(f, k)
	_isolation(f, k)
	_lab(f, k)
	_north(f, k)


## Sas de décontamination entre le palier de l'escalier B et le service.
static func _airlock(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f6_airlock"
	for x in [16.0, 24.0]:
		k.wall_z(Z, "wall_infect", HKit.CN, HKit.CS, x, [{"a": -15.8, "b": -12.2, "top": 2.45}])
		var ad := AutoDoor.new()
		ad.door_id = "f6_airlock_%d" % int(x)
		ad.width = 3.4
		ad.height = 2.4
		ad.position = k.p(x, -14.0)
		ad.rotation.y = PI / 2.0
		g.zone_root(Z).add_child(ad)
	g.box(Z, "floor_metal", k.p(20.0, -14.0, 0.01), Vector3(7.8, 0.02, 3.8), {"collide": false})
	for x in [18.0, 20.0, 22.0]:
		for z in [-15.0, -13.0]:
			g.cylinder(Z, "metal_steel", k.p(x, z, 2.98), k.p(x, z, 2.75), 0.06, {"segments": 8})
	f.add_label(Z, "SAS DE DÉCONTAMINATION", k.p(20.0, HKit.CN + 0.12, 2.5), 0.0, 0.8, Color(0.95, 0.75, 0.1))
	f.add_label(Z, "ZONE DE CONFINEMENT BIOLOGIQUE — P3", k.p(23.85, -14.0, 2.7), -PI / 2.0, 0.6, Color(0.95, 0.75, 0.1))
	f.add_light(Z, k.p(20.0, -14.0, 2.9), Color(1.0, 0.75, 0.2), 1.0, 6.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.3, 0.1, 0.3), "fog": 0.8})
	f.ceiling_light("f6_east", k.p(28.0, -14.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	f.add_trigger("f6_arrive", k.p(28.0, -14.0, 1.2), Vector3(6.0, 2.4, 3.6))
	f.add_trigger("f6_airlock", k.p(20.0, -14.0, 1.2), Vector3(6.0, 2.4, 3.6))


static func _isolation(f: Facility, k: HKit) -> void:
	var g := f.geo
	for i in 4:
		var Z: String = "f6_q" + Q[i]
		var cx := -28.0 + i * 8.0
		HProps.patient_bed(f, Z, k.p(cx + 1.5, -3.0), 0.0, true)
		Props.iv_stand(g, Z, k.p(cx - 0.2, -2.0))
		Props.sink(g, Z, k.p(cx + 3.6, -9.5), PI / 2.0)
		g.box(Z, "plastic_sheet", k.p(cx, -6.5, 1.5), Vector3(7.8, 3.0, 0.03), {"collide": false})
		f.ceiling_light(Z, k.p(cx, -5.0, HKit.CEIL), [LightFixture.Mode.FLICKER, LightFixture.Mode.OFF, LightFixture.Mode.BROKEN, LightFixture.Mode.STEADY][i], 0.5)
		f.add_label(Z, "ISOLEMENT " + Q[i], k.p(cx + 2.0, -11.85, 2.5), 0.0, 0.7, Color(0.9, 0.7, 0.1))
	# 602 : la vitre a éclaté, la porte est enfoncée
	g.box("f6_corridor", "glass_dirty", k.p(-18.0, -12.8, 0.02), Vector3(3.0, 0.02, 1.2), {"collide": false})
	Props.rubble(g, "f6_corridor", k.p(-18.0, -12.8), 0.9, 8, "glass_dirty")
	f.add_blood("f6_q602", k.p(-19.5, -8.0, 0.01), 1.8, "blood")
	f.add_spawn("f6_q602", "hollow", k.p(-21.0, -5.0, 0.05), 0.2, [k.p(-22.0, -9.0, 0.05), k.p(-10.0, -14.0, 0.05)], {"variant": "patient"})
	f.add_spawn("f6_q604", "hollow", k.p(-3.5, -9.5, 0.05), 0.0, [], {"variant": "nurse", "passive": true})
	f.add_spawn("f6_q601", "hollow", k.p(-26.0, -11.4, 0.05), 0.0, [], {"variant": "patient", "passive": true})
	f.add_examine("f6_corridor", k.p(-26.0, -12.5, 1.5), "Chambre 601. Un patient se tient debout, le front contre la vitre. Il ne cligne pas des yeux. Sa bouche bouge. Il répète quelque chose : « …écho… écho… écho… »", {"radius": 1.6})
	f.add_trigger("f6_q604", k.p(-4.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))
	f.anchors["f6_q604_glass"] = k.p(-2.0, -12.0, 1.5)


static func _lab(f: Facility, k: HKit) -> void:
	var g := f.geo
	var L := "f6_lab"
	for z in [-9.0, -5.0]:
		Props.table(g, L, k.p(6.0, z), 0.0, 6.0, 1.0, 0.92, "metal_white", "metal_steel")
		for x in [4.0, 7.5]:
			Props.computer(g, L, k.p(x, z + 0.1, 0.92), PI, "screen_terminal" if x < 5.0 else "screen_ecg")
	Props.medical_cabinet(g, L, k.p(0.6, -2.0), -PI / 2.0)
	Props.fridge(g, L, k.p(15.4, -2.0), PI / 2.0)
	Props.fridge(g, L, k.p(15.4, -3.0), PI / 2.0)
	f.add_doc("doc_echo_protocol", L, k.p(5.4, -5.1, 0.92), 0.2, "folder")
	f.add_doc("doc_sabotage", L, k.p(8.3, -9.0, 0.92), -0.3)
	f.add_pickup("f6_lab_ammo", L, "ammo_9mm", 15, k.p(12.0, -1.0, 0.0), 0.4)
	f.add_examine(L, k.p(4.0, -8.6, 1.2), "Sur l'écran, en boucle : « ALERTE P3 — Défaillance des verrous biologiques, niveau 8. Procédure de confinement désactivée manuellement. Badge : S. REED. 23 h 52. » Sarah ?", {"radius": 1.6, "flag": "saw_sabotage_screen"})
	f.add_spawn("f6_lab_patient", "hollow", k.p(11.0, -7.0, 0.05), -PI * 0.5, [k.p(2.0, -3.0, 0.05), k.p(14.0, -10.0, 0.05)], {"variant": "patient"})
	f.ceiling_light(L, k.p(4.0, -6.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.7)
	f.ceiling_light(L, k.p(12.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.7)
	var S := "f6_suits"
	for i in 3:
		Props.lockers(g, S, k.p(20.0 + i * 1.7, -11.5), PI, 4, "metal_white", 1 if i == 1 else -1)
	for x in [18.0, 21.0, 24.0]:
		g.box(S, "metal_yellow", k.p(x, -0.25, 1.4), Vector3(0.7, 1.6, 0.3), {"collide": false})
	Props.bench_row(g, S, k.p(22.0, -6.0), PI / 2.0, 5, "fabric_blue")
	f.add_pickup("f6_suits_shells", S, "ammo_shells", 6, k.p(29.5, -2.5, 0.0), 0.5)
	f.add_pickup("f6_fuse", S, "fuse", 1, k.p(20.3, -1.0, 0.0), 0.8, {"msg": "Un fusible de 60 A, dans une boîte de maintenance. La porte de la cellule de crise…"})
	f.add_pickup("f6_suits_spray", S, "spray", 1, k.p(26.0, -9.5, 0.0), 1.2)
	f.ceiling_light(S, k.p(24.0, -6.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.6)


static func _north(f: Facility, k: HKit) -> void:
	var g := f.geo
	var P := "f6_pharma"
	for i in 3:
		Props.shelf(g, P, k.p(-28.0, -24.8 + i * 2.3), 0.0, 6.0, 2.0, 0.45, 0.8, "metal_white")
	f.add_pickup("f6_pharma_spray1", P, "spray", 1, k.p(-26.0, -18.2, 0.0), 0.3)
	f.add_pickup("f6_pharma_spray2", P, "spray", 1, k.p(-30.5, -17.0, 0.0), 1.0)
	f.add_pickup("f6_pharma_battery", P, "battery", 1, k.p(-24.8, -17.2, 0.0), 0.4)
	f.ceiling_light(P, k.p(-28.0, -21.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.5)
	# Cellule de crise
	var C := "f6_crisis"
	Props.table(g, C, k.p(-18.0, -21.5), 0.0, 5.0, 1.6, 0.76, "wood_desk")
	for x in [-20.0, -18.0, -16.0]:
		Props.office_chair(g, C, k.p(x, -20.2), randf_range(-0.4, 0.4), x > -17.0)
		Props.office_chair(g, C, k.p(x, -22.8), PI + randf_range(-0.4, 0.4))
	Props.notice_board(g, C, k.p(-18.0, -25.85), PI)
	Props.tv_on_wall(g, C, k.p(-23.5, -21.0, 2.1), -PI / 2.0)
	HProps.corpse(f, C, k.p(-13.4, -25.55), PI, "sit", {"cloth_tint": Color(0.15, 0.2, 0.12), "cloth_mix": 0.95, "blood": 0.9})
	f.add_examine(C, k.p(-13.5, -24.2, 0.8), "Un militaire. Unité NRBC. Il a écrit sur le mur, avec son propre sang : « ILS NE MEURENT PAS. VISEZ LA TÊTE. »", {"radius": 1.6})
	f.add_pickup("f6_smg", C, "smg", 1, k.p(-17.0, -20.95, 0.78), 0.3, {"msg": "Un pistolet-mitrailleur militaire. Rapide… et affamé de 9 mm. [4] pour l'équiper."})
	f.add_pickup("f6_smg_ammo", C, "ammo_9mm", 30, k.p(-19.0, -20.95, 0.78), 1.1)
	f.add_pickup("f6_research_card", C, "card_research", 1, k.p(-15.8, -21.2, 0.78), 0.2,
		{"msg": "Carte d'accès RECHERCHE — « Dr H. Vance, direction scientifique ». Monte-charge sécurisé, étages 7 et 8."})
	f.add_doc("doc_crisis", C, k.p(-20.2, -21.2, 0.78), -0.2, "folder")
	f.ceiling_light(C, k.p(-18.0, -21.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.7)
	f.add_spawn("f6_soldier", "hollow", k.p(-14.5, -18.5, 0.05), PI * 0.5, [], {"variant": "guard", "dormant": true})
	# Surveillance des patients
	var M := "f6_monitor"
	HProps.console(f, M, k.p(11.0, -24.5), PI, 6.0, "screen_ecg", 4)
	HProps.monitor_wall(f, M, k.p(11.0, -25.9), PI, 5, 2)
	Props.office_chair(g, M, k.p(10.0, -23.0), 0.4)
	f.add_examine(M, k.p(11.0, -23.4, 1.2), "Les moniteurs affichent les constantes des chambres 601 à 604. Fréquence cardiaque : 12, 9, 0, 14. Température : 29 °C. Tous « vivants ». Aucun n'est vivant.", {"radius": 1.8})
	f.add_pickup("f6_monitor_ammo", M, "ammo_9mm", 10, k.p(14.5, -19.0, 0.0), 0.2)
	f.ceiling_light(M, k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.5)
	Props.table(g, M, k.p(7.0, -17.4), 0.0, 0.9, 0.6)
	f.add_save_point(M, k.p(7.0, -17.4, 0.75), 0.0)

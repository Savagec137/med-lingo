class_name HFloor3
extends RefCounted
## 3e étage — Neurologie, chambres des patients. Le service de Sarah.
## Patients neurologiques immobiles qui réagissent au moindre bruit, casier de
## Sarah (code de l'escalier B, lettre jamais envoyée), fusil à pompe au poste
## de sécurité… et, derrière les portes du bloc de neurochirurgie, le Dr Keller.

const LV := 3
const ROOMS := ["301", "302", "303", "304", "305", "306"]


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var ward := {"reverb": "room", "surface": "lino", "ambience": {"amb_hum": 0.4, "amb_room": 0.5, "amb_rain_inside": 0.35}}
	k.zone("f3_corridor", "Neurologie — 3e étage", [Rect2(-32, -16, 64, 4)], {"surface": "lino", "ambience": {"amb_hum": 0.45, "amb_vent": 0.45}})
	for i in 6:
		k.zone("f3_room" + ROOMS[i], "Chambre " + ROOMS[i], [Rect2(-32 + i * 5, -12, 5, 12)], ward)
	k.zone("f3_dayroom", "Salon des patients", [Rect2(-2, -12, 10, 12)], ward)
	k.zone("f3_prep", "Préparation — Bloc", [Rect2(8, -12, 8, 12)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.5}})
	k.zone("f3_or", "Bloc de neurochirurgie", [Rect2(16, -12, 16, 12)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.6, "amb_lab": 0.3}})
	k.zone("f3_security", "Poste de sécurité — 3e", [Rect2(-32, -26, 8, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.4}})
	k.zone("f3_nurses", "Salle de repos des infirmières", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.35, "amb_room": 0.4}})
	k.zone("f3_station", "Poste de soins", [Rect2(6, -26, 10, 10)], {"reverb": "room", "ambience": {"amb_hum": 0.4}})
	var doors := []
	for i in 6:
		var cx := -29.5 + i * 5.0
		var o := {"sign": ROOMS[i], "window": true}
		match i:
			1, 3, 5:
				o["open"] = true
				o["dir"] = -1.0
			4:
				o["lock"] = Door.Lock.LOCKED
				o["locked_msg"] = "Chambre 305 — verrouillée. De l'autre côté, quelqu'un gratte la porte. Lentement. Sans s'arrêter."
		doors.append({"id": "f3_door_" + ROOMS[i], "x": cx, "side": "s", "opts": o})
	doors.append({"id": "f3_prep_door", "x": 12.0, "side": "s", "opts": {"sign": "PRÉPARATION", "window": true}})
	doors.append({"id": "f3_or_door", "x": 24.0, "side": "s", "w": 2.0, "opts": {"double": true, "heavy": true, "mat": "metal_steel", "window": true,
		"lock": Door.Lock.EVENT, "sign": "BLOC DE NEUROCHIRURGIE",
		"locked_msg": "Les portes du bloc sont bloquées de l'intérieur. Derrière, un grincement métallique… et quelqu'un qui fredonne."}})
	doors.append({"id": "f3_security_door", "x": -28.0, "side": "n", "opts": {"sign": "SÉCURITÉ", "mat": "metal_gray"}})
	doors.append({"id": "f3_nurses_door", "x": -18.0, "side": "n", "opts": {"sign": "PERSONNEL INFIRMIER"}})
	k.standard({
		"zone": "f3_corridor",
		"mats": {"wall": "wall_neuro", "corridor_floor": "floor_ward", "floor_s": "floor_ward", "floor_n": "floor_lino"},
		"zones_s": [{"zone": "f3_room301", "x1": -32, "x2": -27}, {"zone": "f3_room302", "x1": -27, "x2": -22}, {"zone": "f3_room303", "x1": -22, "x2": -17},
			{"zone": "f3_room304", "x1": -17, "x2": -12}, {"zone": "f3_room305", "x1": -12, "x2": -7}, {"zone": "f3_room306", "x1": -7, "x2": -2},
			{"zone": "f3_dayroom", "x1": -2, "x2": 8, "floor": "floor_wood"}, {"zone": "f3_prep", "x1": 8, "x2": 16, "floor": "floor_tile_lab"},
			{"zone": "f3_or", "x1": 16, "x2": 32, "floor": "floor_tile_lab"}],
		"zones_n": [{"zone": "f3_security", "x1": -32, "x2": -24}, {"zone": "f3_nurses", "x1": -24, "x2": -12},
			{"zone": "f3_station", "x1": 6, "x2": 16}],
		"skip_north": [HKit.ELEV, HKit.STAIR_B],
		"north_walls": [-24.0, -12.0, 6.0, 16.0],
		"south_walls": [-27.0, -22.0, -17.0, -12.0, -7.0, -2.0, 8.0, 16.0],
		"south_open": [Vector2(0.0, 6.0)],
		"north_open": [Vector2(7.5, 14.5)],
		"doors": doors,
		"windows": [{"x": 20.0, "side": "s", "w": 3.0}],
		"light_mode": LightFixture.Mode.STEADY,
		"light_energy": 0.7,
	})
	k.glass_x("f3_corridor", 18.5, 21.5, HKit.CS, 1.0, 2.2, "glass_dirty")
	k.elevator_doors("f3_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	_rooms(f, k)
	_north(f, k)
	_surgery(f, k)
	_corridor(f, k)


static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	for i in 6:
		var Z: String = "f3_room" + ROOMS[i]
		var cx := -29.5 + i * 5.0
		HProps.patient_bed(f, Z, k.p(cx - 0.6, -2.4), 0.0, i == 1 or i == 3)
		Props.chair(g, Z, k.p(cx + 1.4, -4.8), -0.6, "metal_gray", "fabric_blue")
		Props.table(g, Z, k.p(cx + 1.6, -1.2), 0.0, 0.6, 0.45, 0.8, "wood_light")
		Props.sink(g, Z, k.p(cx - 2.1, -10.0), -PI / 2.0)
		f.ceiling_light(Z, k.p(cx, -4.5, HKit.CEIL), [LightFixture.Mode.BROKEN, LightFixture.Mode.FLICKER, LightFixture.Mode.OFF,
			LightFixture.Mode.FLICKER, LightFixture.Mode.OFF, LightFixture.Mode.STEADY][i], 0.5)
		f.add_label(Z, ROOMS[i], k.p(cx, -11.85, 2.35), 0.0, 0.8, Color(0.4, 0.3, 0.45))
	# 302 : un patient attaché au lit ; 304 : le lit est vide, les sangles arrachées
	f.add_spawn("f3_bed302", "hollow", k.p(-25.1, -2.4, 0.62), PI, [], {"variant": "neuro", "dormant": true})
	f.add_examine("f3_room304", k.p(-15.2, -2.4, 0.9), "Le lit est vide. Les sangles de contention ont été arrachées. Pas détachées : arrachées.", {"radius": 1.6})
	f.add_blood("f3_room304", k.p(-14.8, -4.5, 0.01), 1.4, "blood_smear")
	f.add_pickup("f3_room301_spray", "f3_room301", "spray", 1, k.p(-28.0, -1.2, 0.8), 0.2)
	f.add_pickup("f3_room306_ammo", "f3_room306", "ammo_9mm", 10, k.p(-2.9, -1.2, 0.8), 0.9)
	f.add_spawn("f3_neuro303", "hollow", k.p(-19.8, -6.5, 0.05), PI * 0.5, [], {"variant": "neuro"})
	f.add_spawn("f3_neuro305", "hollow", k.p(-9.5, -5.0, 0.05), PI, [], {"variant": "neuro"})
	# Salon des patients : télévision qui grésille, fauteuils
	var D := "f3_dayroom"
	Props.tv_on_wall(g, D, k.p(3.0, -0.45, 2.1), 0.0)
	for x in [0.5, 3.0, 5.5]:
		Props.sofa(g, D, k.p(x, -5.0), PI, "fabric_blue")
	Props.table(g, D, k.p(3.0, -8.5), 0.0, 1.6, 0.9)
	for p in [k.p(-1.2, -0.8), k.p(7.2, -0.8)]:
		Props.plant(g, D, p)
	Props.wheelchair(g, D, k.p(6.5, -9.8), 2.0)
	Props.papers(g, D, k.p(3.0, -7.0), 2.0, 8)
	f.ceiling_light(D, k.p(3.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)


static func _north(f: Facility, k: HKit) -> void:
	var g := f.geo
	# Poste de sécurité : l'agent n'a pas eu le temps de se servir de son fusil
	var S := "f3_security"
	Props.desk(g, S, k.p(-28.0, -23.5), PI)
	Props.computer(g, S, k.p(-28.3, -23.6, 0.76), PI, "screen_snow")
	HProps.monitor_wall(f, S, k.p(-28.0, -25.9), PI, 3, 1)
	HProps.corpse(f, S, k.p(-31.55, -19.5), -PI / 2.0, "sit", {"cloth_tint": Color(0.06, 0.08, 0.16), "cloth_mix": 0.95, "blood": 1.0})
	f.add_examine(S, k.p(-30.9, -19.5, 0.8), "Un agent de sécurité, adossé au mur. Le fusil à pompe est encore posé sur ses genoux. Il n'a pas tiré une seule fois.", {"radius": 1.6})
	f.add_pickup("f3_shotgun", S, "shotgun", 1, k.p(-30.6, -19.1, 0.35), 1.4, {"msg": "Le fusil à pompe de l'agent. Dévastateur de près. [3] pour l'équiper."})
	f.add_pickup("f3_shells", S, "ammo_shells", 6, k.p(-27.4, -23.4, 0.78), 0.2)
	f.ceiling_light(S, k.p(-28.0, -21.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.5)
	# Salle de repos des infirmières : le casier de Sarah
	var N := "f3_nurses"
	for i in 5:
		if i == 2:
			var lk := LockerBox.new()
			lk.key_item = "key_locker"
			lk.open_flag = "sarah_locker_open"
			lk.name_tag = "S. REED"
			lk.locked_msg = "Un casier à son nom : « S. REED ». Fermé à clé."
			lk.contents = [{"doc": "doc_sarah_note"}, {"doc": "doc_sarah_letter", "model": "folder"}]
			lk.position = k.p(-22.0 + i * 0.44, -25.5)
			g.zone_root(N).add_child(lk)
			f.nodes["sarah_locker"] = lk
		else:
			Props.lockers(g, N, k.p(-22.0 + i * 0.44, -25.5), PI, 1, "metal_blue")
	Props.sofa(g, N, k.p(-14.0, -24.9), PI, "fabric_green")
	Props.table(g, N, k.p(-17.5, -20.5), 0.0, 1.6, 0.9)
	Props.chair(g, N, k.p(-18.2, -19.6), 0.0)
	Props.chair(g, N, k.p(-16.8, -21.4), PI)
	Props.fridge(g, N, k.p(-12.5, -18.5), PI / 2.0)
	Props.notice_board(g, N, k.p(-23.85, -20.0), -PI / 2.0)
	f.add_examine(N, k.p(-23.4, -20.0, 1.5), "Des photos d'équipe. Sur l'une, Sarah sourit, un bras autour de mes épaules — mon anniversaire, l'an dernier. Au dos, son écriture : « 06/12 — ne jamais oublier ».", {"radius": 1.6, "flag": "saw_birthday_photo"})
	f.add_pickup("f3_nurses_spray", N, "spray", 1, k.p(-17.0, -20.6, 0.76), 0.7)
	f.ceiling_light(N, k.p(-18.0, -21.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.55)
	# Poste de soins ouvert sur le couloir
	var P := "f3_station"
	# Comptoir sur 5 m : le passage vers les bureaux reste libre côté est
	g.box(P, "wood_light", k.p(10.0, -16.35, 0.55), Vector3(5.0, 1.1, 0.3))
	g.box(P, "metal_steel", k.p(10.0, -16.35, 1.12), Vector3(5.1, 0.04, 0.45), {"collide": false})
	Props.desk(g, P, k.p(9.0, -18.2), PI, "wood_desk", 2.0, 0.8)
	Props.desk(g, P, k.p(13.0, -18.2), PI, "wood_desk", 2.0, 0.8)
	Props.computer(g, P, k.p(9.2, -18.3, 0.76), PI, "screen_ecg")
	Props.computer(g, P, k.p(13.2, -18.3, 0.76), PI, "screen_terminal")
	Props.office_chair(g, P, k.p(10.2, -17.3), 1.0, true)
	Props.filing_cabinet(g, P, k.p(15.4, -25.5), PI, 1.32, "metal_gray", 0)
	Props.medical_cabinet(g, P, k.p(7.0, -25.6), PI)
	f.add_pickup("f3_locker_key", P, "key_locker", 1, k.p(12.6, -18.4, 0.78), 0.9, {"msg": "Une petite clé sur un porte-clés en forme de phare : « Casier — S. Reed »."})
	f.add_doc("doc_patient_list", P, k.p(8.6, -18.1, 0.78), 0.3)
	f.add_pickup("f3_station_ammo", P, "ammo_shells", 4, k.p(15.4, -25.2, 1.35), 0.2)
	f.add_pickup("f3_station_battery", P, "battery", 1, k.p(9.6, -18.4, 0.78), 0.5)
	f.ceiling_light(P, k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	f.add_spawn("f3_nurse", "hollow", k.p(13.0, -21.0, 0.05), PI, [k.p(9.0, -22.0, 0.05), k.p(14.0, -14.0, 0.05), k.p(-6.0, -14.0, 0.05)], {"variant": "nurse"})


## Préparation et bloc de neurochirurgie : l'antre du Chirurgien.
static func _surgery(f: Facility, k: HKit) -> void:
	var g := f.geo
	var P := "f3_prep"
	for i in 3:
		Props.sink(g, P, k.p(9.0 + i * 1.0, -0.4), 0.0)
	Props.lockers(g, P, k.p(15.6, -6.0), PI / 2.0, 4, "metal_green")
	Props.table(g, P, k.p(11.0, -7.0), 0.0, 2.2, 0.8, 0.92, "metal_white", "metal_steel")
	f.add_doc("doc_keller", P, k.p(10.6, -7.0, 0.92), -0.2, "folder")
	f.add_pickup("f3_prep_spray", P, "spray", 1, k.p(11.8, -7.1, 0.92), 0.3)
	f.add_blood(P, k.p(12.5, -4.0, 0.01), 1.4, "blood_smear")
	f.ceiling_light(P, k.p(12.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	var O := "f3_or"
	Props.operating_table(g, O, k.p(24.0, -5.5), 0.0)
	HProps.corpse(f, O, k.p(24.0, -6.4, 0.9), 0.0, "back", {"blood": 1.0, "pallor": 0.6, "cloth_mix": 0.0})
	for p in [k.p(22.5, -3.5), k.p(25.6, -7.5)]:
		Props.instrument_tray(g, O, p, fposmod(p.x * 1.7 + p.z * 0.9, TAU))
	HProps.console(f, O, k.p(30.8, -6.0), PI / 2.0, 3.0, "screen_ecg", 2)
	Props.medical_cabinet(g, O, k.p(17.0, -0.5), 0.0)
	Props.medical_cabinet(g, O, k.p(18.0, -0.5), 0.0)
	f.add_blood(O, k.p(23.0, -4.0, 0.01), 2.4, "blood")
	f.add_blood(O, k.p(26.0, -2.0, 0.01), 1.8, "blood_smear")
	f.add_pickup("f3_or_shells", O, "ammo_shells", 6, k.p(17.5, -0.6, 1.0), 0.1)
	f.add_light(O, k.p(24.0, -5.5, 2.7), Color(1.0, 0.97, 0.9), 2.2, 7.0, LightFixture.Mode.FLICKER,
		{"panel": Vector3(0.9, 0.08, 0.9), "shadow": true, "spot_dir": Vector3.DOWN, "spot_angle": 55.0})
	f.add_spawn("f3_surgeon", "surgeon", k.p(26.0, -4.5, 0.05), PI * 0.5, [], {"home": k.p(10.0, -14.0, 0.05), "patrol_anchor": "surgeon_patrol"})
	f.anchors["surgeon_patrol"] = [k.p(-20.0, -14.0, 0.05), k.p(4.0, -8.0, 0.05), k.p(20.0, -14.0, 0.05)]
	f.anchors["f3_or_door"] = k.p(24.0, -12.0, 1.4)


static func _corridor(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "f3_corridor"
	# Bouteilles d'oxygène : le point faible du Chirurgien
	var i := 0
	for p in [k.p(-8.0, -12.35), k.p(-1.0, -15.65), k.p(8.6, -12.35), k.p(18.0, -15.65), k.p(-20.5, -15.65)]:
		var t := ExplosiveTank.new()
		t.tank_id = "f3_%d" % i
		t.position = p
		g.zone_root(Z).add_child(t)
		i += 1
	HProps.cart(g, Z, k.p(-12.5, -15.3), 0.2)
	Props.wheelchair(g, Z, k.p(-21.0, -12.6), 0.3)
	Props.gurney(g, Z, k.p(27.0, -13.0), PI / 2.0 + 0.2)
	HProps.blood_trail(f, Z, k.p(24.0, -12.5), k.p(12.0, -15.0), 8)
	f.add_label(Z, "NEUROLOGIE — CHAMBRES 301 À 306", k.p(-16.0, HKit.CN + 0.12, 2.3), 0.0, 0.7, Color(0.45, 0.3, 0.5))
	f.add_examine(Z, k.p(-8.0, -12.8, 1.2), "Une bouteille d'oxygène médical. Pleine. Une balle bien placée et elle part comme une bombe.", {"radius": 1.4})
	f.add_trigger("f3_arrive", k.p(0.0, -14.0, 1.2), Vector3(12.0, 2.4, 3.6))
	f.add_save_point("f3_station", k.p(8.2, -16.2, 1.14), PI)

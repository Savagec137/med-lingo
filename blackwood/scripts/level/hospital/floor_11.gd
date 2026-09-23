class_name HFloor11
extends RefCounted
## 11e étage — Centre de contrôle. Toute la vidéosurveillance de l'hôpital,
## les commandes de confinement… et Sarah, adossée à la console principale.
## « Tu n'aurais jamais dû venir. »

const LV := 11


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	k.zone("f11_corridor", "Direction — 11e étage", [Rect2(-32, -16, 64, 4)], {"surface": "carpet", "ambience": {"amb_hum": 0.4, "amb_vent": 0.4}})
	k.zone("f11_control", "Centre de contrôle", [Rect2(-16, -12, 32, 12)], {"reverb": "hall", "surface": "carpet",
		"ambience": {"amb_hum": 0.7, "amb_rain_inside": 0.5, "amb_wind": 0.2}, "moon": true})
	k.zone("f11_director", "Bureau du directeur", [Rect2(-32, -12, 16, 12)], {"reverb": "room", "surface": "carpet", "ambience": {"amb_rain_inside": 0.4, "amb_hum": 0.2}})
	k.zone("f11_board", "Salle du conseil", [Rect2(16, -12, 16, 12)], {"reverb": "room", "surface": "carpet", "ambience": {"amb_rain_inside": 0.4, "amb_hum": 0.2}})
	k.standard({
		"zone": "f11_corridor",
		"mats": {"wall": "wall_admin", "corridor_floor": "floor_carpet", "floor_s": "floor_carpet", "floor_n": "floor_carpet"},
		"zones_s": [{"zone": "f11_director", "x1": -32, "x2": -16, "floor": "floor_wood"}, {"zone": "f11_control", "x1": -16, "x2": 16, "floor": "floor_tile_lab", "h": 3.4},
			{"zone": "f11_board", "x1": 16, "x2": 32, "floor": "floor_wood"}],
		"skip_north": [HKit.STAIR_C, HKit.PRIVATE],
		"south_walls": [-16.0, 16.0],
		"doors": [
			{"id": "f11_director_door", "x": -24.0, "side": "s", "opts": {"sign": "DIRECTION GÉNÉRALE", "mat": "wood_door"}},
			{"id": "f11_control_door", "x": 0.0, "side": "s", "w": 2.4, "opts": {"double": true, "window": true, "mat": "metal_dark", "sign": "CENTRE DE CONTRÔLE"}},
			{"id": "f11_board_door", "x": 24.0, "side": "s", "opts": {"sign": "SALLE DU CONSEIL", "mat": "wood_door"}},
		],
		"windows": [{"x": -8.0, "side": "s", "w": 5.0}, {"x": 8.0, "side": "s", "w": 5.0}],
		"light_mode": LightFixture.Mode.STEADY,
		"light_energy": 0.6,
	})
	k.glass_x("f11_corridor", -10.5, -5.5, HKit.CS, 1.0, 2.2, "glass")
	k.glass_x("f11_corridor", 5.5, 10.5, HKit.CS, 1.0, 2.2, "glass")
	k.elevator_doors("f11_corridor", 20, 24, [22.0], "private", "ASCENSEUR DE DIRECTION")
	_control(f, k)
	_offices(f, k)


static func _control(f: Facility, k: HKit) -> void:
	var g := f.geo
	var C := "f11_control"
	# Mur d'images au nord (dos au couloir), pupitres en gradins face à lui
	HProps.monitor_wall(f, C, k.p(-7.0, -11.85), PI, 6, 3)
	HProps.monitor_wall(f, C, k.p(7.0, -11.85), PI, 6, 3)
	var screens: Array = []
	for row in [[-6.5, 0.0], [-3.0, 0.3]]:
		for x in [-8.5, 0.0, 8.5]:
			screens.append_array(HProps.console(f, C, k.p(x, float(row[0])), PI, 5.0, "screen_terminal", 3))
	f.nodes["control_screens"] = screens
	# Console principale (autodestruction : non — confinement et verrous du bâtiment)
	var ep := EventPoint.new()
	ep.event_id = "sarah_talk"
	ep.prompt_text = "SARAH ?"
	ep.done_flag = "sarah_talked"
	ep.interact_radius = 2.6
	ep.position = k.p(2.0, -1.6, 0.9)
	g.zone_root(C).add_child(ep)
	f.nodes["sarah_point"] = ep
	f.add_blood(C, k.p(1.8, -1.6, 0.01), 2.0, "blood")
	HProps.blood_trail(f, C, k.p(0.0, -11.0), k.p(1.8, -1.6), 9)
	Props.office_chair(g, C, k.p(-5.0, -4.2), 2.2, true)
	Props.papers(g, C, k.p(-2.0, -8.0), 3.0, 14)
	for x in [-12.0, -4.0, 4.0, 12.0]:
		f.add_light(C, k.p(x, -6.0, 3.3), Color(0.75, 0.85, 1.0), 0.8, 9.0, LightFixture.Mode.STEADY if x != 4.0 else LightFixture.Mode.FLICKER,
			{"panel": Vector3(1.4, 0.05, 0.3), "fog": 0.4})
	f.add_light(C, k.p(0.0, -10.5, 2.0), Color(0.3, 0.55, 1.0), 1.2, 10.0, LightFixture.Mode.STEADY, {"fog": 0.6})
	f.anchors["sarah_pos"] = k.p(2.0, -2.3, 0.05)
	f.anchors["sarah_cam"] = k.p(0.2, -0.7, 1.45)
	f.anchors["sarah_look"] = k.p(2.0, -2.3, 0.85)
	f.anchors["sarah_arena"] = [k.p(-12.0, -9.0, 0.05), k.p(12.0, -9.0, 0.05), k.p(12.0, -1.5, 0.05), k.p(-12.0, -1.5, 0.05)]
	f.add_spawn("f11_sarah", "sarah", k.p(2.0, -2.3, 0.05), PI, [], {})
	f.add_trigger("f11_control", k.p(0.0, -8.0, 1.2), Vector3(12.0, 2.4, 6.0))


static func _offices(f: Facility, k: HKit) -> void:
	var g := f.geo
	var D := "f11_director"
	Props.desk(g, D, k.p(-24.0, -6.0), PI, "wood_desk", 2.4, 1.0)
	Props.office_chair(g, D, k.p(-24.0, -4.8), PI)
	Props.computer(g, D, k.p(-23.6, -6.1, 0.76), PI, "screen_terminal")
	for i in 4:
		Props.bookcase(g, D, k.p(-31.4, -10.0 + i * 1.2), -PI / 2.0, 1.1)
	Props.sofa(g, D, k.p(-18.5, -2.0), 0.0, "fabric_brown")
	Props.table(g, D, k.p(-18.5, -3.6), 0.0, 1.4, 0.7, 0.45, "wood_desk")
	Props.plant(g, D, k.p(-16.8, -11.2))
	f.add_doc("doc_director", D, k.p(-24.5, -6.0, 0.78), 0.4, "folder")
	f.add_pickup("f11_dir_spray", D, "spray", 1, k.p(-18.8, -3.6, 0.47), 0.8)
	f.add_pickup("f11_dir_magammo", D, "ammo_magnum", 4, k.p(-23.2, -6.1, 0.78), 0.3, {"msg": "Quatre balles de .357 dans le tiroir du directeur. Il s'attendait à quelque chose."})
	Props.table(g, D, k.p(-30.8, -1.0), 0.0, 1.0, 0.6)
	f.add_save_point(D, k.p(-30.8, -1.0, 0.75), 0.0)
	f.ceiling_light(D, k.p(-24.0, -6.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.55)
	var B := "f11_board"
	Props.table(g, B, k.p(24.0, -6.0), 0.0, 7.0, 2.0, 0.76, "wood_desk")
	for x in [21.0, 23.0, 25.0, 27.0]:
		Props.office_chair(g, B, k.p(x, -4.6), 0.0)
		Props.office_chair(g, B, k.p(x, -7.4), PI, x == 25.0)
	Props.tv_on_wall(g, B, k.p(31.5, -6.0, 1.9), PI / 2.0)
	f.add_doc("doc_board", B, k.p(23.6, -6.0, 0.78), -0.3, "folder")
	f.add_pickup("f11_board_ammo", B, "ammo_9mm", 20, k.p(26.4, -6.2, 0.78), 1.0)
	f.add_pickup("f11_board_shells", B, "ammo_shells", 6, k.p(21.4, -5.8, 0.78), 0.2)
	f.add_pickup("f11_board_spray", B, "spray", 1, k.p(17.0, -1.2, 0.0), 0.5)
	f.add_pickup("f11_board_battery", B, "battery", 1, k.p(29.0, -1.2, 0.0), 0.2)
	f.ceiling_light(B, k.p(24.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.55)
	f.add_trigger("f11_arrive", k.p(22.0, -14.0, 1.2), Vector3(4.0, 2.4, 3.6))

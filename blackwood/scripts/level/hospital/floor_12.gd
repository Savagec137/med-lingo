class_name HFloor12
extends RefCounted
## 12e étage — Zone interdite, laboratoire principal du Projet ECHO. Une vraie
## installation industrielle : bioréacteur, cuves, des milliers de doses prêtes
## à partir, un bon de commande. Le Patient Zéro dans sa cellule. La console
## d'autodestruction.

const LV := 12
const H12 := 3.6


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var g := f.geo
	var lab := {"reverb": "hall", "surface": "tile", "ambience": {"amb_lab": 0.8, "amb_hum": 0.5, "amb_generator": 0.15}}
	k.zone("f12_lab", "Zone interdite — Laboratoire principal", [Rect2(-32, -16, 64, 16)], lab)
	k.zone("f12_cell", "Cellule — Patient Zéro", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.6}})
	k.zone("f12_core", "Poste de commande", [Rect2(6, -26, 10, 10)], {"reverb": "room", "surface": "metal", "ambience": {"amb_hum": 0.8}})
	k.zone("f12_ship", "Quai d'expédition", [Rect2(16, -26, 16, 10)], {"reverb": "room", "surface": "concrete", "ambience": {"amb_hum": 0.4}})
	# Structure : un grand plateau ouvert, pièces au nord
	k.slab("f12_lab", "floor_tile_lab", HKit.X0, HKit.CN, HKit.X1, HKit.ZS)
	k.ceiling("f12_lab", "ceiling_tile", HKit.X0, HKit.CN, HKit.X1, HKit.ZS, H12)
	for r in [["f12_cell", -24.0, -12.0, "floor_tile_lab"], ["f12_core", 6.0, 16.0, "floor_metal"], ["f12_ship", 16.0, 32.0, "floor_concrete"]]:
		k.slab(String(r[0]), String(r[3]), float(r[1]), HKit.ZN, float(r[2]), HKit.CN)
		k.ceiling(String(r[0]), "ceiling_concrete", float(r[1]), HKit.ZN, float(r[2]), HKit.CN, H12)
	k.wall_x("f12_lab", "wall_lab", -24.0, 32.0, HKit.CN, [HKit.win(-18.0, 10.0, 0.0, 2.8), HKit.op(11.0, 1.4), {"a": 18.0, "b": 30.0, "top": 3.0}],
		"", H12)
	for x in [-12.0, 6.0, 16.0]:
		k.wall_z("f12_lab", "wall_lab", HKit.ZN, HKit.CN, x, [], "", H12)
	g.box("f12_lab", "wall_lab", k.p(24.0, HKit.CN, 3.3), Vector3(12.0, 0.6, 0.2), {"collide": false})
	k.door("f12_core_door", "f12_core", 11.0, HKit.CN, false, 1.4, {"mat": "metal_dark", "heavy": true, "window": true, "sign": "POSTE DE COMMANDE"})
	var bg := BreakableGlass.new()
	bg.glass_id = "f12_cell"
	bg.size = Vector3(10.0, 2.8, 0.08)
	bg.position = k.p(-18.0, HKit.CN, 1.4)
	g.zone_root("f12_lab").add_child(bg)
	f.nodes["glass_f12_cell"] = bg
	_lab(f, k)
	_rooms(f, k)


static func _lab(f: Facility, k: HKit) -> void:
	var g := f.geo
	var L := "f12_lab"
	# Poteaux
	for x in [-20.0, -8.0, 4.0, 16.0, 26.0]:
		for z in [-12.0, -4.0]:
			g.box(L, "wall_concrete", k.p(x, z, H12 * 0.5), Vector3(0.5, H12, 0.5))
	# Bioréacteur ECHO-7 au centre
	var c := k.p(-2.0, -8.0)
	g.cylinder(L, "metal_steel", c, c + Vector3(0, 3.4, 0), 1.6, {"segments": 24, "collide": true})
	g.cylinder(L, "tank_glass", c + Vector3(0, 0.6, 0), c + Vector3(0, 2.8, 0), 1.64, {"segments": 24})
	g.cylinder(L, "liquid_amber", c + Vector3(0, 0.65, 0), c + Vector3(0, 2.6, 0), 1.5, {"segments": 24})
	for a in 6:
		var dir := Vector3(cos(a * TAU / 6.0), 0, sin(a * TAU / 6.0))
		Props.pipe(g, L, c + dir * 1.6 + Vector3(0, 3.0, 0), c + dir * 4.5 + Vector3(0, 3.5, 0), 0.1, "metal_steel", false)
	f.add_label(L, "ECHO-7", k.p(-2.0, -6.35, 3.0), 0.0, 2.0, Color(1.0, 0.65, 0.2), true)
	f.add_light(L, c + Vector3(0, 1.6, 0), Color(1.0, 0.6, 0.2), 2.2, 11.0, LightFixture.Mode.PULSE, {"fog": 1.0})
	f.add_examine(L, k.p(-2.0, -5.9, 1.2), "Le bioréacteur ECHO-7. Des milliers de litres d'un liquide ambré, tiède, qui pulse lentement. Comme un cœur.", {"radius": 2.2})
	# Cuves de la « phase commerciale »
	for i in 5:
		HProps.tank(f, L, k.p(-28.0 + i * 3.4, -2.2), i != 2, "liquid_green")
		HProps.tank(f, L, k.p(12.0 + i * 3.4, -2.2), i != 4, "liquid_amber" if i % 2 == 0 else "liquid_green")
	# Paillasses et râteliers de doses
	for x in [-26.0, -16.0, 10.0, 22.0]:
		Props.table(g, L, k.p(x, -9.5), 0.0, 4.0, 1.0, 0.92, "metal_white", "metal_steel")
		Props.computer(g, L, k.p(x - 1.0, -9.4, 0.92), PI, "screen_terminal")
		Props.computer(g, L, k.p(x + 1.0, -9.4, 0.92), PI, "screen_ecg")
	for i in 4:
		HProps.dose_rack(g, L, k.p(-31.3, -13.0 + i * 3.0), -PI / 2.0, 2.6)
	HProps.dose_rack(g, L, k.p(31.3, -12.0), PI / 2.0, 3.0)
	HProps.dose_rack(g, L, k.p(31.3, -8.0), PI / 2.0, 3.0)
	f.add_examine(L, k.p(-30.4, -8.5, 1.3), "Des doses. Des centaines par armoire, des dizaines d'armoires. Étiquette : « ECHO-7 — lot commercial — conserver entre 2 et 8 °C ». Tout est prêt à partir.", {"radius": 2.0})
	f.add_pickup("f12_ammo", L, "ammo_9mm", 20, k.p(-16.6, -9.6, 0.92), 0.3)
	f.add_pickup("f12_magammo", L, "ammo_magnum", 4, k.p(10.6, -9.6, 0.92), 1.0)
	f.add_pickup("f12_shells", L, "ammo_shells", 8, k.p(22.4, -9.6, 0.92), 0.4)
	f.add_pickup("f12_spray", L, "spray", 1, k.p(-25.4, -9.6, 0.92), 0.6)
	for x in [-24.0, -12.0, 0.0, 12.0, 24.0]:
		for z in [-12.5, -5.0]:
			f.ceiling_light(L, k.p(x, z, H12), LightFixture.Mode.STEADY, 0.7, {"range": 8.0, "name": "f12_light_%d_%d" % [int(x), int(z)]})
	f.add_trigger("f12_arrive", k.p(-28.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))
	f.anchors["escape_start"] = k.p(11.0, -14.0, 0.05)


static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	# Cellule du Patient Zéro
	var C := "f12_cell"
	Props.hospital_bed(g, C, k.p(-21.0, -23.5), PI / 2.0, true)
	Props.chair(g, C, k.p(-15.0, -24.5), 0.4, "metal_gray", "fabric_blue")
	g.box(C, "paper", k.p(-17.0, -25.9, 1.6), Vector3(5.0, 1.8, 0.02), {"collide": false})
	f.add_examine(C, k.p(-17.0, -16.6, 1.6), "Le mur du fond de la cellule est couvert d'écriture. Des milliers de fois le même mot : « ENCORE ».", {"radius": 1.8})
	f.add_light(C, k.p(-18.0, -21.0, 3.4), Color(0.85, 0.9, 1.0), 0.7, 9.0, LightFixture.Mode.STEADY, {"panel": Vector3(1.2, 0.05, 1.2)})
	var ic := EventPoint.new()
	ic.event_id = "zero_talk"
	ic.prompt_text = "INTERPHONE DE LA CELLULE"
	ic.done_flag = "zero_talked"
	ic.position = k.p(-12.6, HKit.CN + 0.2, 1.3)
	g.zone_root("f12_lab").add_child(ic)
	f.nodes["zero_intercom"] = ic
	g.box("f12_lab", "metal_steel", k.p(-12.6, HKit.CN + 0.05, 1.3), Vector3(0.2, 0.3, 0.08), {"collide": false})
	f.add_doc("doc_zero", "f12_lab", k.p(-16.0, -9.6, 0.92), 0.2, "folder")
	f.add_spawn("f12_zero", "zero", k.p(-18.0, -16.9, 0.05), PI, [], {})
	f.anchors["zero_look"] = k.p(-18.0, -16.9, 1.75)
	f.anchors["zero_cam"] = k.p(-15.5, -12.6, 1.6)
	f.anchors["mutant_spawns"] = [k.p(-21.2, -3.6, 0.05), k.p(15.4, -3.6, 0.05)]
	# Poste de commande : autodestruction
	var P := "f12_core"
	HProps.console(f, P, k.p(11.0, -24.2), PI, 5.0, "screen_error", 3)
	HProps.server_rack(g, P, k.p(6.6, -21.0), -PI / 2.0)
	HProps.server_rack(g, P, k.p(15.4, -21.0), PI / 2.0)
	var sd := EventPoint.new()
	sd.event_id = "self_destruct"
	sd.prompt_text = "ENGAGER LA PROCÉDURE D'AUTODESTRUCTION"
	sd.done_flag = "self_destruct"
	sd.interact_radius = 2.0
	sd.position = k.p(11.0, -23.6, 1.0)
	g.zone_root(P).add_child(sd)
	f.nodes["self_destruct_point"] = sd
	g.box(P, "emit_red", k.p(11.0, -23.75, 1.02), Vector3(0.25, 0.05, 0.25), {"collide": false})
	f.add_light(P, k.p(11.0, -22.0, 3.3), Color(1.0, 0.2, 0.15), 1.0, 8.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.3, 0.05, 0.3)})
	f.add_examine(P, k.p(13.0, -23.6, 1.2), "« PROTOCOLE OMÉGA — Destruction de l'installation par charges thermobariques. Délai d'évacuation : 4 minutes. » Personne n'est censé ressortir vivant d'ici.", {"radius": 1.6})
	# Quai d'expédition : caisses de doses et bon de commande
	var S := "f12_ship"
	for i in 4:
		for j in 2:
			Props.crate(g, S, k.p(18.5 + i * 3.2, -24.5 + j * 2.4), 0.0, Vector3(2.2, 1.2, 1.4), "metal_white")
			f.add_label(S, "ECHO-7 — 500 DOSES", k.p(18.5 + i * 3.2, -24.5 + j * 2.4 + 0.72, 0.8), 0.0, 0.45, Color(0.15, 0.15, 0.15))
	f.add_doc("doc_order", S, k.p(21.7, -21.4, 1.22), 0.3, "folder")
	f.add_examine(S, k.p(28.0, -18.0, 1.2), "Les caisses portent toutes la même adresse d'expédition : « SITE 2 ». Aucun nom de ville. Juste des coordonnées.", {"radius": 1.8})
	f.ceiling_light(S, k.p(24.0, -21.0, H12), LightFixture.Mode.FLICKER, 0.6)

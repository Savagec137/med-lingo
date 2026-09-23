class_name BuildBasement
extends RefCounted
## Niveau B : zones 8 à 10.
##   Sous-sol (couloir technique, morgue, chambres de maintien, maintenance)
##   → Salle du générateur (le Chirurgien) → Tunnel de service → Sortie

const Y := -4.5
const CEIL := -1.6
const COLD := Color(0.82, 0.9, 1.0)
const WARM := Color(1.0, 0.72, 0.42)
const RED := Color(1.0, 0.16, 0.07)
const AMBER := Color(1.0, 0.58, 0.18)


static func build(f: Facility) -> void:
	var g := f.geo
	_corridor(f, g)
	_morgue(f, g)
	_holding(f, g)
	_maintenance(f, g)
	_generator(f, g)
	_tunnel(f, g)


static func _v(x: float, y: float, z: float) -> Vector3:
	return Vector3(x, Y + y, z)


# --- Couloir technique ----------------------------------------------------------

static func _corridor(f: Facility, g: Geo) -> void:
	var Z := "basement"
	g.slab(Z, "floor_concrete", 25.5, -35.0, 28.5, -31.0, Y)
	g.slab(Z, "floor_concrete", 0.0, -38.0, 30.0, -35.0, Y)
	g.ceiling(Z, "ceiling_concrete", 0.0, -38.0, 30.0, -35.0, CEIL)
	g.ceiling(Z, "ceiling_concrete", 25.3, -35.0, 28.7, -33.2, CEIL)
	var H := CEIL - Y
	g.wall_x(Z, "wall_concrete", 0.0, 30.0, -38.0, Y, H, 0.3, [{"a": 7.35, "b": 8.65}, {"a": 18.35, "b": 19.65}], "wall_concrete_dark")
	g.wall_x(Z, "wall_concrete_dark", 0.0, 30.0, -35.0, Y, H, 0.3, [{"a": 11.35, "b": 12.65}, {"a": 25.65, "b": 28.35, "top": H}], "wall_concrete")
	g.wall_z(Z, "wall_concrete_dark", -38.0, -35.0, 30.0, Y, H, 0.3)
	# Tuyauteries et câbles
	Props.pipe(g, Z, _v(0.2, 2.55, -37.55), _v(29.8, 2.55, -37.55), 0.13, "metal_rust")
	Props.pipe(g, Z, _v(0.2, 2.25, -37.6), _v(29.8, 2.25, -37.6), 0.07, "metal_gray")
	Props.pipe(g, Z, _v(0.2, 2.6, -35.4), _v(29.8, 2.6, -35.4), 0.09, "metal_green")
	for x in [4.0, 13.0, 22.0]:
		Props.cable(g, Z, _v(x, 2.7, -36.0), _v(x + 5.0, 2.7, -36.2), 0.35)
	# Flaques, gravats, chariot renversé
	for p in [_v(6.0, 0.012, -36.4), _v(16.5, 0.012, -36.8), _v(24.0, 0.012, -36.2)]:
		var puddle := MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(2.6, 1.8)
		puddle.mesh = pm
		puddle.material_override = Mats.get_mat("water")
		puddle.position = p
		g.zone_root(Z).add_child(puddle)
	Props.rubble(g, Z, _v(10.0, 0, -37.4), 0.6, 6)
	Props.gurney(g, Z, _v(21.5, 0, -35.8), 0.1, true)
	Props.boxes(g, Z, _v(29.2, 0, -37.4), PI, 2)
	Props.crate(g, Z, _v(1.2, 0, -37.3), 0.2)
	f.add_blood(Z, _v(14.0, 0.0, -36.5), 1.4, "blood_smear", Vector3.UP, 1.4)
	f.add_blood(Z, _v(3.0, 0.0, -36.8), 1.1, "blood_dry")
	f.add_label(Z, "NIVEAU B", _v(27.0, 2.0, -35.16), PI, 1.2, Color(0.7, 0.66, 0.5))
	f.add_label(Z, "< GÉNÉRATEUR", _v(22.0, 1.8, -37.84), 0.0, 0.6, Color(0.75, 0.6, 0.15))
	f.add_label(Z, "CHAMBRE FROIDE", _v(19.0, 2.55, -37.84), 0.0, 0.45, Color(0.6, 0.6, 0.58))
	f.add_label(Z, "MAINTIEN — ACCÈS RESTREINT", _v(8.0, 2.55, -37.84), 0.0, 0.4, Color(0.6, 0.6, 0.58))
	f.add_label(Z, "MAINTENANCE", _v(12.0, 2.55, -35.16), PI, 0.45, Color(0.6, 0.6, 0.58))
	# Éclairage
	var modes := [LightFixture.Mode.FLICKER, LightFixture.Mode.OFF, LightFixture.Mode.STEADY, LightFixture.Mode.BROKEN, LightFixture.Mode.FLICKER]
	for i in 5:
		var x := 3.0 + i * 6.0
		var l := f.add_light(Z, _v(x, 2.8, -36.5), COLD, 0.75, 7.0, modes[i],
			{"panel": Vector3(0.9, 0.05, 0.22), "buzz": modes[i] != LightFixture.Mode.OFF, "fog": 0.6, "shadow": i == 2})
		l.name = "corridor_light_%d" % i
	f.add_light(Z, _v(27.0, 2.3, -33.6), RED, 1.0, 7.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.25, 0.1, 0.08), "fog": 1.0})
	f.add_light(Z, _v(0.5, 2.3, -35.4), RED, 1.0, 7.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.1, 0.25), "fog": 1.0})
	# Porte de la salle du générateur (coincée : pied-de-biche)
	f.add_door("generator_door", Z, _v(0.0, 0, -36.5), true, 1.4,
		{"lock": Door.Lock.KEY, "key": "crowbar", "unlock_flag": "generator_door_forced", "heavy": true, "mat": "metal_rust",
		"sign": "GÉNÉRATEUR — DANGER",
		"locked_msg": "La porte de la salle du générateur est coincée : le mécanisme est tordu. Il faudrait un levier.",
		"unlock_msg": "Vous forcez la porte avec le pied-de-biche. Le métal cède dans un long grincement."})
	f.add_trigger("basement_arrive", _v(27.0, 1.0, -33.2), Vector3(2.8, 2.0, 2.4))
	f.anchors["basement_patrol"] = [_v(4.0, 0.05, -36.5), _v(15.0, 0.05, -36.4), _v(27.0, 0.05, -36.6), _v(19.0, 0.05, -36.5)]


# --- Morgue ------------------------------------------------------------------------

static func _morgue(f: Facility, g: Geo) -> void:
	var Z := "basement"
	g.slab(Z, "floor_tile_lab", 14.0, -48.0, 24.0, -38.0, Y)
	g.ceiling(Z, "ceiling_concrete", 14.0, -48.0, 24.0, -38.0, CEIL)
	var H := CEIL - Y
	g.wall_z(Z, "wall_tile_white", -48.0, -38.0, 14.0, Y, H, 0.3, [], "wall_tile_white")
	g.wall_z(Z, "wall_tile_white", -48.0, -38.0, 24.0, Y, H, 0.3, [], "wall_concrete")
	g.wall_x(Z, "wall_concrete", 14.0, 24.0, -48.0, Y, H, 0.3, [], "wall_tile_white")
	f.add_door("morgue_door", Z, _v(19.0, 0, -38.0), false, 1.3, {"mat": "metal_steel", "window": true, "sign": "CHAMBRE FROIDE"})
	Props.morgue_wall(g, Z, _v(19.0, 0, -47.25), PI, 4, 3, [[1, 0], [2, 1]])
	Props.steel_table(g, Z, _v(16.6, 0, -42.8), 0.0)
	Props.steel_table(g, Z, _v(21.4, 0, -42.8), 0.0)
	Props.body_bag(g, Z, _v(16.6, 0, -42.8), 0.05, false)
	Props.body_bag(g, Z, _v(21.4, 0, -42.6), -0.08, false)
	Props.body_bag(g, Z, _v(23.0, 0, -45.3), 1.4, true)
	Props.body_bag(g, Z, _v(15.2, 0, -46.0), 1.7, true)
	Props.desk(g, Z, _v(22.9, 0, -39.1), PI, "metal_gray", 1.4, 0.6)
	f.add_doc("doc_morgue", Z, _v(22.7, 0.77, -39.0), 0.3, "folder")
	f.add_pickup("morgue_ammo", Z, "ammo_9mm", 6, _v(23.3, 0.77, -39.1), -0.4)
	f.add_blood(Z, _v(18.6, 0.0, -44.5), 1.6, "blood_dry")
	f.add_blood(Z, _v(21.0, 0.0, -40.4), 1.0, "blood_smear", Vector3.UP, 2.2)
	f.ceiling_light(Z, _v(19.0, 2.9, -43.0), LightFixture.Mode.FLICKER, 0.8, {"shadow": true})
	f.add_light(Z, _v(14.3, 2.2, -39.5), RED, 0.7, 5.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.1, 0.2)})
	f.add_examine(Z, _v(19.0, 1.2, -46.6), "Des casiers réfrigérés. Deux sont ouverts… et vides. Les étiquettes : B-07, B-11.")
	f.anchors["morgue_body"] = _v(18.2, 0.05, -45.6)


# --- Chambres de maintien ------------------------------------------------------------

static func _holding(f: Facility, g: Geo) -> void:
	var Z := "basement"
	g.slab(Z, "floor_concrete", 2.0, -48.0, 14.0, -38.0, Y)
	g.ceiling(Z, "ceiling_concrete", 2.0, -48.0, 14.0, -38.0, CEIL)
	var H := CEIL - Y
	g.wall_z(Z, "wall_concrete", -48.0, -38.0, 2.0, Y, H, 0.3, [], "wall_concrete_dark")
	g.wall_x(Z, "wall_concrete", 2.0, 14.0, -48.0, Y, H, 0.3, [], "wall_concrete_dark")
	f.add_door("holding_door", Z, _v(8.0, 0, -38.0), false, 1.3, {"mat": "metal_gray", "window": true, "sign": "MAINTIEN"})
	var root := g.zone_root(Z)
	for row_z in [-41.8, -45.4]:
		for x in [4.6, 8.0, 11.4]:
			var p := _v(x, 0, row_z)
			g.box(Z, "metal_dark", p + Vector3(0, 0.3, 0), Vector3(1.1, 0.6, 2.4))
			g.box(Z, "emit_amber", p + Vector3(0, 0.61, 0), Vector3(0.8, 0.02, 2.0), {"collide": false, "shadow": false})
			var glass := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.5
			cm.bottom_radius = 0.5
			cm.height = 2.2
			cm.radial_segments = 16
			glass.mesh = cm
			glass.material_override = Mats.get_mat("tank_glass")
			glass.position = p + Vector3(0, 0.62, 0)
			glass.rotation.x = PI / 2.0
			glass.scale = Vector3(1.0, 1.0, 0.7)
			glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			root.add_child(glass)
			# Corps allongé
			g.box(Z, "gown", p + Vector3(0, 0.72, 0.1), Vector3(0.42, 0.18, 1.3), {"collide": false})
			var head := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 0.11
			sm.height = 0.22
			head.mesh = sm
			head.material_override = Mats.get_mat("flesh_corpse")
			head.position = p + Vector3(0, 0.76, -0.75)
			root.add_child(head)
			g.cylinder(Z, "rubber", p + Vector3(0.3, 0.6, -1.1), p + Vector3(0.3, 2.9, -1.2), 0.03, {"segments": 5})
			Props.computer(g, Z, p + Vector3(0.8, 0.9, -1.0), -PI / 2.0 + 0.4, "screen_ecg")
			g.box(Z, "metal_gray", p + Vector3(0.82, 0.45, -1.02), Vector3(0.4, 0.9, 0.4))
			g.solid(Z, p + Vector3(0, 0.6, 0), Vector3(1.1, 1.2, 2.4))
	for x in [4.6, 8.0, 11.4]:
		f.add_light(Z, _v(x, 1.5, -43.6), AMBER, 0.55, 4.5, LightFixture.Mode.PULSE, {"fog": 0.6})
	f.add_examine(Z, _v(8.0, 1.2, -40.2), "Des caissons de maintien. À l'intérieur, des corps sous perfusion. Leurs poitrines se soulèvent au rythme des machines. Le générateur les garde « en vie ».")
	f.add_pickup("holding_spray", Z, "spray", 1, _v(3.0, 0.02, -39.0), 0.3)
	Props.boxes(g, Z, _v(2.6, 0, -47.2), 0.0, 3)


# --- Local de maintenance (salle sûre) ----------------------------------------------

static func _maintenance(f: Facility, g: Geo) -> void:
	var Z := "basement"
	g.slab(Z, "floor_concrete", 8.0, -35.0, 16.0, -29.0, Y)
	g.ceiling(Z, "ceiling_concrete", 8.0, -35.0, 16.0, -29.0, CEIL)
	var H := CEIL - Y
	g.wall_z(Z, "wall_concrete", -35.0, -29.0, 8.0, Y, H, 0.3, [], "wall_concrete")
	g.wall_z(Z, "wall_concrete", -35.0, -29.0, 16.0, Y, H, 0.3, [], "wall_concrete")
	g.wall_x(Z, "wall_concrete", 8.0, 16.0, -29.0, Y, H, 0.3, [], "wall_concrete")
	f.add_door("maintenance_door", Z, _v(12.0, 0, -35.0), false, 1.3, {"mat": "metal_green", "sign": "MAINTENANCE"})
	Props.desk(g, Z, _v(12.0, 0, -29.55), 0.0, "wood_light", 3.0, 0.8)
	Props.lockers(g, Z, _v(8.4, 0, -32.2), -PI / 2.0, 3, "metal_green", -1)
	Props.shelf(g, Z, _v(15.6, 0, -33.6), -PI / 2.0, 1.8, 2.0, 0.5, 0.8)
	g.box(Z, "wood_desk", _v(12.0, 1.7, -29.2), Vector3(2.4, 0.9, 0.04), {"collide": false})
	for i in 7:
		g.box(Z, "metal_dark", _v(11.0 + i * 0.3, 1.5 + (i % 3) * 0.12, -29.25), Vector3(0.05, 0.3, 0.05), {"collide": false})
	Props.table(g, Z, _v(15.0, 0, -30.4), 0.0, 1.0, 0.6)
	f.add_save_point(Z, _v(15.0, 0.76, -30.4), PI)
	f.add_pickup("maintenance_crowbar", Z, "crowbar", 1, _v(11.4, 0.77, -29.6), 0.15,
		{"msg": "Un pied-de-biche en acier. Lourd. Solide. Vous obtenez : Pied-de-biche."})
	f.add_doc("doc_generator", Z, _v(12.9, 0.77, -29.5), -0.2)
	f.add_pickup("maintenance_ammo", Z, "ammo_9mm", 8, _v(13.6, 0.77, -29.7), 0.4)
	f.add_pickup("maintenance_battery", Z, "battery", 1, _v(10.4, 0.77, -29.5))
	f.add_light(Z, _v(12.0, 2.6, -32.0), WARM, 1.0, 7.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.5, 0.06, 0.2), "shadow": true, "fog": 0.4})
	f.add_examine(Z, _v(9.0, 1.4, -32.2), "Des vestiaires de techniciens. Un casque, une combinaison… et une photo d'enfant scotchée à l'intérieur d'une porte.")


# --- Zone 9 : salle du générateur ------------------------------------------------------

static func _generator(f: Facility, g: Geo) -> void:
	var Z := "generator"
	var top := -0.5
	var H := top - Y
	g.slab(Z, "floor_concrete", -16.0, -46.0, 0.0, -30.0, Y)
	g.ceiling(Z, "ceiling_concrete", -16.3, -46.3, 0.3, -29.7, top)
	g.wall_z(Z, "wall_concrete", -46.3, -29.7, -16.0, Y, H, 0.3, [], "wall_concrete_dark")
	g.wall_z(Z, "wall_concrete_dark", -46.3, -29.7, 0.0, Y, H, 0.3, [{"a": -37.2, "b": -35.8, "top": 2.2}], "wall_concrete_dark")
	g.wall_x(Z, "wall_concrete", -16.0, 0.0, -30.0, Y, H, 0.3, [], "wall_concrete_dark")
	g.wall_x(Z, "wall_concrete", -16.0, 0.0, -46.0, Y, H, 0.3, [{"a": -9.0, "b": -7.0, "top": 2.4}], "wall_concrete_dark")
	# Le générateur
	var c := _v(-8.0, 0, -38.0)
	g.box(Z, "wall_concrete", c + Vector3(0, 0.15, 0), Vector3(6.0, 0.3, 4.2))
	g.box(Z, "metal_green", c + Vector3(-0.4, 1.4, 0), Vector3(4.2, 2.2, 2.6))
	g.box(Z, "metal_dark", c + Vector3(2.4, 1.2, 0), Vector3(0.9, 1.8, 2.6))
	for i in 8:
		g.box(Z, "black", c + Vector3(2.86, 0.5 + i * 0.2, 0), Vector3(0.02, 0.06, 2.3), {"collide": false})
	for i in 3:
		g.cylinder(Z, "metal_dark", c + Vector3(-1.6 + i * 1.2, 2.5, 0), c + Vector3(-1.6 + i * 1.2, 3.2, 0), 0.3, {"segments": 12})
	g.cylinder(Z, "metal_rust", c + Vector3(-1.9, 2.5, -0.8), c + Vector3(-1.9, 4.2, -0.8), 0.22, {"segments": 12})
	g.box(Z, "metal_dark", c + Vector3(-0.4, 1.0, 1.4), Vector3(1.4, 1.5, 0.2))
	g.box(Z, "emit_amber", c + Vector3(-0.4, 1.9, 1.32), Vector3(1.6, 0.35, 0.06), {"collide": false, "shadow": false})
	for i in 4:
		g.cylinder(Z, "emit_green" if i % 2 == 0 else "emit_red", c + Vector3(-0.9 + i * 0.33, 1.2, 1.51), c + Vector3(-0.9 + i * 0.33, 1.2, 1.53), 0.07, {"segments": 10})
	g.solid(Z, c + Vector3(0.2, 1.6, 0), Vector3(5.6, 3.2, 3.0))
	f.add_label(Z, "HALVORSEN POWER UNIT — 2 MW", c + Vector3(-0.4, 2.2, 1.31), 0.0, 0.5, Color(0.8, 0.75, 0.55))
	# Eau au sol autour de la machine (piège électrique)
	var water := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(9.0, 9.0)
	water.mesh = pm
	water.material_override = Mats.unique("water")
	water.position = _v(-8.0, 0.025, -38.0)
	g.zone_root(Z).add_child(water)
	f.nodes["trap_water"] = water
	f.anchors["trap_rect"] = Rect2(-12.5, -42.5, 9.0, 9.0)
	# Disjoncteurs muraux
	var b1 := BreakerPanel.new()
	b1.position = _v(-15.84, 0, -38.0)
	b1.rotation.y = PI / 2.0
	g.zone_root(Z).add_child(b1)
	var b2 := BreakerPanel.new()
	b2.position = _v(-0.16, 0, -42.0)
	b2.rotation.y = -PI / 2.0
	g.zone_root(Z).add_child(b2)
	f.nodes["breakers"] = [b1, b2]
	# Table d'opération du Chirurgien
	Props.operating_table(g, Z, _v(-11.0, 0, -31.3), PI / 2.0)
	Props.body_bag(g, Z, _v(-11.0, 0, -31.3), PI / 2.0, false)
	Props.instrument_tray(g, Z, _v(-12.6, 0, -32.4), 0.3)
	f.add_blood(Z, _v(-11.0, 0.0, -31.8), 2.2, "blood")
	f.add_blood(Z, _v(-8.5, 0.0, -32.6), 1.4, "blood_smear", Vector3.UP, 0.4)
	# Piliers, caisses (abris)
	for p in [_v(-14.2, 0, -32.4), _v(-1.8, 0, -32.4), _v(-14.2, 0, -44.0), _v(-1.8, 0, -44.0)]:
		g.box(Z, "wall_concrete", p + Vector3(0, H * 0.5, 0), Vector3(0.7, H, 0.7))
	Props.crate(g, Z, _v(-4.2, 0, -44.8), 0.2)
	Props.crate(g, Z, _v(-14.8, 0, -41.4), -0.3)
	Props.boxes(g, Z, _v(-3.2, 0, -30.9), 0.0, 2)
	# Tuyaux
	Props.pipe(g, Z, _v(-15.8, 3.6, -34.0), _v(-0.2, 3.6, -34.0), 0.16, "metal_rust")
	Props.pipe(g, Z, _v(-15.8, 3.3, -42.0), _v(-0.2, 3.3, -42.0), 0.12, "metal_gray")
	for x in [-12.0, -4.0]:
		Props.cable(g, Z, _v(x, 0.05, -34.0), _v(-8.0, 0.05, -36.4), 0.0, 0.03)
	# Éclairage
	f.add_light(Z, _v(-11.0, 3.0, -31.3), Color(1.0, 0.96, 0.88), 3.2, 6.0, LightFixture.Mode.FLICKER,
		{"spot_dir": Vector3(0, -1, 0), "spot_angle": 40.0, "shadow": true, "fog": 1.4, "panel": Vector3(0.45, 0.03, 0.45), "name": "boss_lamp"})
	g.cylinder(Z, "metal_dark", _v(-11.0, H, -31.3), _v(-11.0, 3.05, -31.3), 0.02, {"segments": 5})
	f.add_light(Z, _v(-8.4, 1.9, -36.2), AMBER, 1.6, 8.0, LightFixture.Mode.PULSE, {"fog": 1.2, "name": "generator_glow"})
	f.add_light(Z, _v(-15.7, 3.0, -44.0), RED, 1.0, 8.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.12, 0.3), "fog": 1.0})
	f.add_light(Z, _v(-0.3, 3.0, -32.0), RED, 1.0, 8.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.12, 0.3), "fog": 1.0})
	f.ceiling_light(Z, _v(-8.0, H, -44.0), LightFixture.Mode.FLICKER, 0.9, {"range": 9.0})
	var flash := f.add_light(Z, _v(-8.0, 1.2, -38.0), Color(0.45, 0.65, 1.0), 0.0, 14.0, LightFixture.Mode.STEADY, {"fog": 2.0, "name": "trap_flash"})
	flash.base_energy = 0.0
	# Porte du tunnel (scellée tant que le verrouillage d'urgence est actif)
	var tdoor := f.add_door("tunnel_door", Z, _v(-8.0, 0, -46.0), false, 2.0,
		{"lock": Door.Lock.EVENT, "double": true, "height": 2.4, "heavy": true, "mat": "metal_yellow", "sign": "TUNNEL DE SERVICE — SORTIE",
		"locked_msg": "Verrouillage d'urgence actif. La porte du tunnel reste scellée tant que l'alimentation principale n'est pas rétablie."})
	f.nodes["tunnel_door"] = tdoor
	f.add_light(Z, _v(-8.0, 2.75, -45.8), RED, 0.5, 3.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.3, 0.08, 0.06), "name": "tunnel_status"})
	f.add_trigger("generator_enter", _v(-1.4, 1.0, -36.5), Vector3(1.6, 2.0, 2.4))
	f.anchors["boss_spawn"] = _v(-11.0, 0.05, -32.6)
	f.anchors["boss_center"] = _v(-8.0, 0.05, -38.0)
	f.anchors["boss_patrol"] = [_v(-13.0, 0.05, -38.0), _v(-8.0, 0.05, -43.5), _v(-3.0, 0.05, -38.0), _v(-8.0, 0.05, -33.0)]


# --- Zone 10 : tunnel de service et sortie ----------------------------------------------

static func _tunnel(f: Facility, g: Geo) -> void:
	var Z := "exit"
	g.slab(Z, "floor_concrete", -9.5, -62.0, -6.5, -46.0, Y)
	g.ceiling(Z, "ceiling_concrete", -9.8, -60.0, -6.2, -46.0, CEIL)
	g.ceiling(Z, "ceiling_concrete", -9.8, -74.3, -6.2, -60.0, 3.0)
	g.wall_z(Z, "wall_concrete_dark", -74.3, -46.0, -9.5, Y, 7.5, 0.3, [], "wall_ext")
	g.wall_z(Z, "wall_concrete_dark", -74.3, -46.0, -6.5, Y, 7.5, 0.3, [], "wall_ext")
	g.wall_x(Z, "wall_ext", -9.8, -6.2, -60.0, CEIL, 3.0 - CEIL, 0.3, [], "wall_concrete_dark")
	# Rampe vers la surface
	var bottom := Vector3(-8.0, Y, -62.0)
	var top := Vector3(-8.0, 0.0, -72.0)
	var along := top - bottom
	var length := along.length()
	var angle := atan2(along.y, -along.z)
	var basis := Basis(Vector3.RIGHT, angle)
	var normal := basis * Vector3.UP
	g.box(Z, "floor_concrete", (top + bottom) * 0.5 - normal * 0.15, Vector3(3.0, 0.3, length + 0.1), {"basis": basis, "nav": false})
	g.slab(Z, "floor_concrete", -9.5, -74.0, -6.5, -72.0, 0.0)
	# Éclairage : ampoules grillagées espacées, lumière de l'aube au bout
	for i in 4:
		var z := -49.0 - i * 4.5
		var mode := LightFixture.Mode.STEADY if i != 2 else LightFixture.Mode.FLICKER
		f.add_light(Z, Vector3(-6.75, Y + 2.3, z), WARM, 0.6, 5.5, mode, {"panel": Vector3(0.1, 0.14, 0.1), "fog": 0.8, "buzz": i == 2})
	f.add_light(Z, Vector3(-8.0, 1.8, -73.2), Color(0.6, 0.72, 0.95), 1.4, 12.0, LightFixture.Mode.STEADY, {"fog": 2.0, "name": "dawn_leak"})
	# Portail de sortie
	g.box(Z, "metal_dark", Vector3(-8.0, 1.25, -74.15), Vector3(3.0, 2.5, 0.12))
	g.box(Z, "emit_white_dim", Vector3(-8.0, 1.25, -74.08), Vector3(0.03, 2.4, 0.01), {"collide": false, "shadow": false})
	g.box(Z, "emit_white_dim", Vector3(-8.0, 2.46, -74.08), Vector3(2.8, 0.02, 0.01), {"collide": false, "shadow": false})
	g.box(Z, "wall_ext", Vector3(-8.0, 2.75, -74.15), Vector3(3.6, 0.5, 0.3))
	var gate := ExitGate.new()
	gate.position = Vector3(-8.0, 0.0, -73.9)
	g.zone_root(Z).add_child(gate)
	f.nodes["exit_gate"] = gate
	f.add_label(Z, "SORTIE", Vector3(-8.0, 2.75, -73.99), 0.0, 0.6, Color(0.2, 0.9, 0.35), true)
	# Clairière de l'épilogue (au-delà du portail)
	f.anchors["ending_player"] = Vector3(-8.0, 0.05, -79.0)
	f.anchors["ending_cam"] = Vector3(-3.5, 1.6, -84.5)
	f.anchors["ending_look"] = Vector3(-8.0, 1.4, -76.0)

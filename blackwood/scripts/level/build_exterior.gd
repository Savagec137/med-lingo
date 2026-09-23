class_name BuildExterior
extends RefCounted
## Zone 1 — Parking extérieur, façade du bâtiment, auvent, abords boisés.
## Le bâtiment paraît bien plus grand que la partie jouable : deux étages de
## fenêtres noires, une aile nord inaccessible, un toit continu.

const Z := "parking"


static func build(f: Facility) -> void:
	var g := f.geo
	_ground(g)
	_facade(f, g)
	_parking(f, g)
	_trees(g)


static func _ground(g: Geo) -> void:
	# Sol extérieur découpé autour de l'emprise du bâtiment et des trémies
	var ground_rects := [
		Rect2(-90, 50, 86.5, 50), Rect2(3.5, 50, 86.5, 50),
		Rect2(-90, 12, 60, 38), Rect2(30, 12, 60, 38),
		Rect2(-90, -130, 50, 142), Rect2(32, -130, 58, 142),
		Rect2(-40, 7, 28, 5), Rect2(-12, 6, 8, 6), Rect2(4, 6, 8, 6), Rect2(12, 7, 20, 5),
		Rect2(-40, -22, 28, 10),
		Rect2(-40, -60, 65.3, 38), Rect2(28.7, -60, 3.3, 38), Rect2(25.3, -60, 3.4, 26.8),
		Rect2(-40, -130, 30.5, 70), Rect2(-6.5, -130, 38.5, 70), Rect2(-9.5, -130, 3, 56),
	]
	for r in ground_rects:
		g.slab(Z, "ground", r.position.x, r.position.y, r.end.x, r.end.y, -0.02, 0.3)
	# Parking et route d'accès
	g.slab(Z, "asphalt", -30, 12, 30, 50, 0.0, 0.3)
	g.slab(Z, "asphalt", -3.5, 50, 3.5, 100, 0.0, 0.3)
	# Marquages au sol
	for row_z in [22.0, 32.0]:
		for i in 17:
			var x := -22.4 + i * 2.8
			g.box(Z, "paper", Vector3(x, 0.004, row_z), Vector3(0.1, 0.008, 4.6), {"collide": false, "shadow": false})
		g.box(Z, "paper", Vector3(0, 0.004, row_z - 2.3), Vector3(45, 0.008, 0.1), {"collide": false, "shadow": false})
	# Bordures devant la façade
	g.box(Z, "curb", Vector3(-17.5, 0.06, 12.2), Vector3(25, 0.12, 0.3), {"nav": false})
	g.box(Z, "curb", Vector3(17.5, 0.06, 12.2), Vector3(25, 0.12, 0.3), {"nav": false})


static func _facade(f: Facility, g: Geo) -> void:
	var H := 9.0
	# Aile ouest (administration) : façade sud, pignon ouest, façade nord
	var ow := [{"a": -30.5, "b": -28.5, "bottom": 1.0, "top": 2.3}, {"a": -27.0, "b": -25.0, "bottom": 1.0, "top": 2.3},
		{"a": -22.5, "b": -18.5, "bottom": 1.0, "top": 2.3}]
	g.wall_x(Z, "wall_hospital", -40.2, -11.8, 7.0, 0.0, H, 0.4, ow, "wall_ext")
	for x in [-38.0, -34.0, -30.0, -26.0, -22.0, -18.0, -14.0]:
		_fake_window(g, Vector3(x, 5.7, 7.2), false, 1.0)
	g.wall_z(Z, "wall_ext", -12.2, 7.2, -40.0, 0.0, H, 0.4, [], "wall_hospital_dirty")
	for z in [-8.0, -3.0, 2.0]:
		_fake_window(g, Vector3(-40.2, 5.7, z), true, -1.0)
	var north_ops := [{"a": -30.5, "b": -28.5, "bottom": 1.2, "top": 2.4}, {"a": -24.0, "b": -22.5, "bottom": 1.9, "top": 2.7},
		{"a": -18.5, "b": -17.0, "bottom": 1.9, "top": 2.7}]
	g.wall_x(Z, "wall_ext", -40.2, -11.8, -12.0, 0.0, H, 0.4, north_ops, "wall_plaster")
	for x in [-36.0, -30.0, -24.0, -18.0]:
		_fake_window(g, Vector3(x, 5.7, -12.2), false, -1.0)
	# Retour de façade entre aile et hall (décrochés)
	g.wall_z(Z, "wall_ext", 6.0, 7.2, -12.0, 0.0, H, 0.4)
	g.wall_z(Z, "wall_ext", 6.0, 7.2, 12.0, 0.0, H, 0.4)
	# Bloc nord inaccessible (cafétéria, ascenseurs) : murs extérieurs seulement
	g.wall_x(Z, "wall_ext", -12.2, 12.2, -22.0, 0.0, H, 0.4)
	for x in [-5.2, 5.2]:
		_fake_window(g, Vector3(x, 5.7, -22.2), false, -1.0)
	g.wall_z(Z, "wall_ext", -22.2, -11.8, -12.0, 0.0, H, 0.4)
	# Aile est (laboratoires) : façade sud, pignon est, façade nord
	var eo := [{"a": 18.5, "b": 20.5, "bottom": 1.0, "top": 2.3}, {"a": 26.0, "b": 28.0, "bottom": 1.0, "top": 2.3}]
	g.wall_x(Z, "wall_tile_white", 11.8, 32.2, 7.0, 0.0, H, 0.4, eo, "wall_ext")
	for x in [14.0, 18.0, 22.0, 26.0, 30.0]:
		_fake_window(g, Vector3(x, 5.7, 7.2), false, 1.0)
	g.wall_z(Z, "wall_tile_white", -22.2, 7.2, 32.0, 0.0, H, 0.4, [{"a": -1.65, "b": -0.35, "top": 2.2}], "wall_ext")
	for z in [-16.0, -8.0, 3.0]:
		_fake_window(g, Vector3(32.2, 5.7, z), true, 1.0)
	g.wall_x(Z, "wall_ext", 11.8, 25.3, -22.0, 0.0, H, 0.4, [], "wall_tile_white")
	g.wall_x(Z, "wall_ext", 28.7, 32.2, -22.0, 0.0, H, 0.4, [], "wall_tile_white")
	g.wall_x(Z, "wall_ext", 25.3, 28.7, -22.0, 3.6, H - 3.6, 0.4)

	# Toitures (continues au-dessus de tout le bâtiment)
	g.slab(Z, "ceiling_concrete", -40.2, -12.2, -11.8, 7.2, H + 0.3, 0.3)
	g.slab(Z, "ceiling_concrete", -12.2, -22.2, 12.2, 6.2, H + 0.3, 0.3)
	g.slab(Z, "ceiling_concrete", 11.8, -22.2, 32.2, 7.2, H + 0.3, 0.3)
	# Acrotères
	for seg in [[-40.2, -11.8, 7.0], [11.8, 32.2, 7.0], [-12.2, 12.2, -22.0], [-40.2, -11.8, -12.0], [11.8, 32.2, -22.0]]:
		g.box(Z, "wall_ext", Vector3((seg[0] + seg[1]) * 0.5, H + 0.6, seg[2]), Vector3(seg[1] - seg[0], 0.6, 0.45), {"collide": false})
	g.box(Z, "wall_ext", Vector3(0, H + 0.6, 6.0), Vector3(24.4, 0.6, 0.45), {"collide": false})

	# Une fenêtre faiblement éclairée à l'étage… quelqu'un ?
	var lit := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(1.6, 1.8)
	lit.mesh = q
	lit.material_override = Mats._emissive(Color(1.0, 0.7, 0.4), 0.35)
	lit.position = Vector3(-22.0, 5.7, 7.27)
	g.zone_root(Z).add_child(lit)
	f.nodes["upper_window"] = lit

	# Auvent et enseigne
	g.slab(Z, "wall_ext", -5.2, 12.0, 5.2, 16.2, 3.9, 0.3)
	g.box(Z, "wall_ext", Vector3(0, 4.15, 16.1), Vector3(10.4, 0.5, 0.25), {"collide": false})
	for x in [-4.6, 4.6]:
		g.cylinder(Z, "wall_concrete", Vector3(x, 0, 15.6), Vector3(x, 3.6, 15.6), 0.2, {"collide": true, "segments": 12})
	var sign := f.add_label(Z, "BLACKWOOD  RESEARCH  FACILITY", Vector3(0, 4.15, 16.24), 0.0, 1.35, Color(0.72, 0.74, 0.7), false, UITheme.font_title())
	sign.outline_size = 0
	# Plaque au sol près de la route
	g.box(Z, "wall_concrete", Vector3(-7.5, 0.6, 46.5), Vector3(4.2, 1.2, 0.5))
	f.add_label(Z, "BLACKWOOD RESEARCH FACILITY", Vector3(-7.5, 0.85, 46.76), 0.0, 0.55, Color(0.7, 0.7, 0.66), false, UITheme.font_title())
	f.add_label(Z, "HALVORSEN BIOMEDICAL — ACCÈS RÉGLEMENTÉ", Vector3(-7.5, 0.45, 46.76), 0.0, 0.3, Color(0.55, 0.55, 0.5))
	f.add_examine(Z, Vector3(-7.5, 0.9, 47.1), "« Blackwood Research Facility — Halvorsen Biomedical ». Quelqu'un a collé une affichette par-dessus : FERMÉ — MESURE SANITAIRE.")
	# Appliques de l'entrée
	f.add_light(Z, Vector3(-2.6, 3.0, 12.35), Color(1.0, 0.85, 0.6), 1.2, 7.0, LightFixture.Mode.FLICKER,
		{"panel": Vector3(0.3, 0.2, 0.12), "fog": 1.0, "buzz": true})
	g.box(Z, "metal_dark", Vector3(2.6, 3.0, 12.3), Vector3(0.3, 0.2, 0.15), {"collide": false})


static func _parking(f: Facility, g: Geo) -> void:
	# Voiture d'Ethan, portière ouverte, phares allumés vers l'entrée
	Props.car(g, Z, Vector3(6.0, 0, 34.0), 0.0, "car_black", true)
	for s in [-1.0, 1.0]:
		f.add_light(Z, Vector3(6.0 + s * 0.65, 0.75, 31.7), Color(1.0, 0.94, 0.82), 4.5, 30.0, LightFixture.Mode.STEADY,
			{"spot_dir": Vector3(-0.05 * s, -0.09, -1.0), "spot_angle": 24.0, "shadow": s > 0.0, "fog": 1.6})
		g.box(Z, "emit_headlight", Vector3(6.0 + s * 0.65, 0.72, 31.83), Vector3(0.32, 0.12, 0.04), {"collide": false, "shadow": false})
	f.anchors["player_start"] = Vector3(4.2, 0.05, 32.4)
	# Véhicules abandonnés
	Props.car(g, Z, Vector3(-8.4, 0, 22.0), 0.08, "car_red")
	Props.car(g, Z, Vector3(-14.0, 0, 21.5), -0.06, "car_white", true)
	Props.car(g, Z, Vector3(14.0, 0, 22.4), PI + 0.1, "car_gray")
	Props.car(g, Z, Vector3(21.0, 0, 31.5), 1.45, "car_red")
	Props.ambulance(g, Z, Vector3(10.5, 0, 15.2), -PI / 2.0 + 0.12)
	f.add_examine(Z, Vector3(8.6, 1.3, 15.4), "Une ambulance du centre. Les portes arrière sont ouvertes. À l'intérieur, un brancard vide et des sangles arrachées.")
	f.add_examine(Z, Vector3(-8.4, 1.0, 19.6), "Une voiture couverte de feuilles mortes. Elle est là depuis des mois.")
	f.add_examine(Z, Vector3(4.6, 1.0, 34.5), "Ma voiture. Le moteur tourne encore… Lena, qu'est-ce que tu fais ici ?", {"prompt": "EXAMINER"})
	# Lampadaires
	var lamp := Props.lamp_post(g, Z, Vector3(-11.0, 0, 27.0), PI)
	f.add_light(Z, lamp, Color(1.0, 0.55, 0.22), 3.5, 16.0, LightFixture.Mode.FLICKER,
		{"spot_dir": Vector3(0, -1, 0.05), "spot_angle": 55.0, "shadow": true, "fog": 2.0, "buzz": true})
	g.box(Z, "emit_sodium", lamp + Vector3(0, -0.05, 0), Vector3(0.3, 0.02, 0.5), {"collide": false, "shadow": false})
	Props.lamp_post(g, Z, Vector3(13.0, 0, 40.0), 0.0)
	Props.lamp_post(g, Z, Vector3(-20.0, 0, 42.0), 0.0)
	# Guérite et barrière
	g.box(Z, "wall_ext", Vector3(-5.5, 1.3, 47.0), Vector3(2.4, 2.6, 2.4))
	g.box(Z, "black", Vector3(-4.28, 1.5, 47.0), Vector3(0.02, 0.9, 1.6), {"collide": false})
	g.box(Z, "wall_ext", Vector3(-5.5, 2.7, 47.0), Vector3(2.8, 0.2, 2.8), {"collide": false})
	g.box(Z, "metal_yellow", Vector3(-3.6, 1.0, 50.0), Vector3(0.3, 1.0, 0.3))
	g.box(Z, "car_red", Vector3(-3.3, 2.2, 50.0), Vector3(0.1, 2.6, 0.1), {"basis": Basis(Vector3.BACK, -0.4), "collide": false})
	# Clôture
	Props.fence(g, Z, Vector3(-30, 0, 50), Vector3(-4, 0, 50))
	Props.fence(g, Z, Vector3(4, 0, 50), Vector3(30, 0, 50))
	Props.fence(g, Z, Vector3(-30, 0, 12.5), Vector3(-30, 0, 50))
	Props.fence(g, Z, Vector3(30, 0, 12.5), Vector3(30, 0, 50))
	# Détritus
	Props.papers(g, Z, Vector3(-2, 0, 28), 4.0, 10)
	Props.boxes(g, Z, Vector3(-26, 0, 14), 0.3, 3)
	f.add_blood(Z, Vector3(9.0, 0.0, 18.0), 1.3, "blood_dry", Vector3.UP, 0.4)
	f.add_blood(Z, Vector3(7.8, 0.0, 16.4), 0.8, "blood_smear", Vector3.UP, 1.1)
	# Pluie sur les flaques : aucune géométrie, l'asphalte est mouillé (shader)


static func _trees(g: Geo) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 90210
	var placed := 0
	while placed < 70:
		var p := Vector3(rng.randf_range(-80, 80), 0, rng.randf_range(-115, 95))
		# Hors du bâtiment, du parking, de la route et de la sortie du tunnel
		if p.x > -46 and p.x < 38 and p.z > -30 and p.z < 56:
			continue
		if absf(p.x) < 7.0 and p.z > 50:
			continue
		if p.x > -24 and p.x < 10 and p.z > -100 and p.z < -66:
			continue
		Props.tree(g, Z, p, rng.randf_range(8.0, 15.0))
		placed += 1
	# Quelques arbres encadrant la clairière de sortie
	for p in [Vector3(-26, 0, -92), Vector3(-20, 0, -104), Vector3(4, 0, -98), Vector3(12, 0, -88), Vector3(-30, 0, -80), Vector3(16, 0, -76)]:
		Props.tree(g, Z, p, rng.randf_range(10.0, 14.0))


## Fausse fenêtre d'étage plaquée sur la façade : vitre noire + encadrement.
static func _fake_window(g: Geo, center: Vector3, along_z: bool, outward: float) -> void:
	var n := Vector3(outward, 0, 0) if along_z else Vector3(0, 0, outward)
	var pane := Vector3(0.04, 1.8, 1.6) if along_z else Vector3(1.6, 1.8, 0.04)
	var frame := Vector3(0.06, 2.0, 1.8) if along_z else Vector3(1.8, 2.0, 0.06)
	g.box(Z, "wall_concrete_dark", center + n * 0.02, frame, {"collide": false})
	g.box(Z, "black", center + n * 0.05, pane, {"collide": false})
	g.box(Z, "glass_dirty", center + n * 0.075, pane, {"collide": false, "shadow": false})
	g.box(Z, "wall_ext", center + n * 0.08 + Vector3(0, -1.0, 0), (Vector3(0.18, 0.08, 1.9) if along_z else Vector3(1.9, 0.08, 0.18)), {"collide": false})

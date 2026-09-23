class_name HFloorB2
extends RefCounted
## Sous-sol -2 — Parking souterrain, morgue, locaux techniques, groupes
## électrogènes. Le Veilleur y rôde dans le noir. Rétablir le courant (procédure
## de démarrage en trois étapes) réalimente les ascenseurs de tout l'hôpital.
## Le monte-charge du -2 est le seul accès aux étages de recherche (carte).

const LV := -2
const RED := Color(1.0, 0.18, 0.1)
const COLD := Color(0.78, 0.88, 1.0)


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var tech := {"reverb": "basement", "surface": "concrete", "ambience": {"amb_basement": 0.7, "amb_hum": 0.3}}
	k.zone("b2_corridor", "Sous-sol -2 — Couloir technique", [Rect2(-32, -16, 64, 4)], tech)
	k.zone("b2_generator", "Salle des groupes électrogènes", [Rect2(-32, -12, 14, 12)], {"reverb": "basement", "surface": "concrete",
		"ambience": {"amb_generator": 0.25, "amb_basement": 0.5}})
	k.zone("b2_technical", "Local technique", [Rect2(-18, -12, 14, 12)], {"reverb": "room", "surface": "concrete", "ambience": {"amb_hum": 0.6, "amb_basement": 0.3}})
	k.zone("b2_parking", "Parking souterrain", [Rect2(-4, -12, 36, 26)], {"reverb": "tunnel", "surface": "concrete",
		"ambience": {"amb_tunnel": 0.6, "amb_basement": 0.4}})
	k.zone("b2_morgue", "Morgue", [Rect2(-24, -26, 12, 10)], {"reverb": "room", "surface": "tile", "ambience": {"amb_hum": 0.7, "amb_basement": 0.3}})
	k.zone("b2_boiler", "Chaufferie", [Rect2(6, -26, 10, 10)], {"reverb": "basement", "surface": "concrete", "ambience": {"amb_basement": 0.8}})
	k.zone("b2_workshop", "Atelier de maintenance", [Rect2(24, -26, 8, 10)], {"reverb": "room", "surface": "concrete", "ambience": {"amb_basement": 0.5}})
	k.standard({
		"zone": "b2_corridor",
		"mats": {"wall": "wall_concrete", "corridor_floor": "floor_concrete", "floor_s": "floor_concrete", "floor_n": "floor_concrete", "ceiling": "ceiling_concrete"},
		"zones_s": [{"zone": "b2_generator", "x1": -32, "x2": -18}, {"zone": "b2_technical", "x1": -18, "x2": -4, "floor": "floor_worn"}],
		"zones_n": [{"zone": "b2_morgue", "x1": -24, "x2": -12, "floor": "floor_tile", "ceiling": "ceiling_tile"}, {"zone": "b2_boiler", "x1": 6, "x2": 16},
			{"zone": "b2_workshop", "x1": 24, "x2": 32}],
		"skip_north": [HKit.STAIR_A, HKit.ELEV, HKit.FREIGHT],
		"north_walls": [-24.0, 6.0, 16.0, 24.0],
		"south_walls": [-18.0, -4.0],
		"south_open": [Vector2(0, 6), Vector2(20, 26)],
		"doors": [
			{"id": "b2_generator_door", "x": -25.0, "side": "s", "w": 1.8, "opts": {"double": true, "heavy": true, "mat": "metal_green", "sign": "GROUPES ÉLECTROGÈNES"}},
			{"id": "b2_technical_door", "x": -11.0, "side": "s", "opts": {"heavy": true, "mat": "metal_gray", "sign": "LOCAL TECHNIQUE"}},
			{"id": "b2_morgue_door", "x": -18.0, "side": "n", "w": 1.8, "opts": {"double": true, "heavy": true, "mat": "metal_steel", "window": true, "sign": "MORGUE"}},
			{"id": "b2_boiler_door", "x": 11.0, "side": "n", "opts": {"heavy": true, "mat": "metal_rust", "sign": "CHAUFFERIE"}},
			{"id": "b2_workshop_door", "x": 28.0, "side": "n", "opts": {"mat": "metal_gray", "sign": "ATELIER"}},
		],
		"no_lights": true,
	})
	k.elevator_doors("b2_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	k.elevator_doors("b2_corridor", 16, 20, [18.0], "freight", "MONTE-CHARGE — ÉTAGES DE RECHERCHE")
	_parking(f, k)
	_power(f, k)
	_rooms(f, k)
	_lights(f, k)


# --- Parking souterrain (s'étend sous le parvis jusqu'à z = 14) -------------------------------

static func _parking(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "b2_parking"
	var y := k.y
	k.slab(Z, "floor_concrete", -4, -12, 32, 14)
	k.ceiling(Z, "ceiling_concrete", -4, -12, 32, 14, 3.3)
	# Enceinte de l'extension sud
	g.wall_z(Z, "wall_concrete", 0.0, 14.3, -4.15, y, HKit.H, 0.3)
	g.wall_z(Z, "wall_concrete", 0.0, 14.3, 32.15, y, HKit.H, 0.3)
	g.wall_x(Z, "wall_concrete", -4.3, 32.3, 14.15, y, HKit.H, 0.3)
	# Poteaux et poutres
	for x in [4.0, 12.0, 20.0, 28.0]:
		for z in [-6.0, 2.0, 9.0]:
			g.box(Z, "wall_concrete", k.p(x, z, 1.65), Vector3(0.6, 3.3, 0.6))
			g.box(Z, "metal_yellow", k.p(x, z, 0.5), Vector3(0.62, 1.0, 0.62), {"collide": false})
		g.box(Z, "ceiling_concrete", k.p(x, 1.0, 3.1), Vector3(0.5, 0.4, 26.0), {"collide": false})
	# Marquages
	for i in 8:
		var x := -1.0 + i * 4.2
		g.box(Z, "paper", k.p(x, 12.0, 0.004), Vector3(0.1, 0.008, 4.0), {"collide": false, "shadow": false})
		g.box(Z, "paper", k.p(x, -9.5, 0.004), Vector3(0.1, 0.008, 4.0), {"collide": false, "shadow": false})
	# Voitures du personnel, ambulance
	Props.car(g, Z, k.p(1.2, 11.5), 0.05, "car_black")
	Props.car(g, Z, k.p(9.6, 11.8), -0.08, "car_red", true)
	Props.car(g, Z, k.p(22.2, -9.4), PI + 0.1, "car_white")
	Props.ambulance(g, Z, k.p(29.0, 4.5), PI)
	# Rampe d'accès des véhicules condamnée par un rideau métallique
	g.box(Z, "shutter", k.p(16.0, 14.0, 1.6), Vector3(7.0, 3.2, 0.1), {"collide": false})
	f.add_label(Z, "SORTIE VÉHICULES — FERMÉE", k.p(16.0, 13.8, 2.8), PI, 0.8, Color(0.9, 0.75, 0.1))
	# Traces du Veilleur : sang au plafond, carcasses
	HProps.blood_trail(f, Z, k.p(6.0, -2.0), k.p(18.0, 6.0), 8)
	f.add_blood(Z, k.p(14.0, 4.0, 3.28), 1.6, "blood", Vector3.DOWN)
	HProps.corpse(f, Z, k.p(15.4, 5.0), 1.8, "curl", {"cloth_tint": Color(0.1, 0.12, 0.2), "cloth_mix": 0.9, "blood": 1.0})
	f.add_examine(Z, k.p(15.4, 5.6, 0.5), "Un brancardier. Démembré avec une précision de boucher. Les entailles partent du haut, comme si quelque chose de très grand s'était penché sur lui.", {"radius": 1.8})
	HProps.corpse(f, Z, k.p(9.0, 10.3), 0.4, "sit", {"blood": 0.9})
	f.add_pickup("b2_parking_ammo", Z, "ammo_9mm", 10, k.p(10.5, 10.0, 0.0), 0.3)
	f.add_pickup("b2_parking_spray", Z, "spray", 1, k.p(26.4, 4.6, 0.0), 1.0, {"msg": "Un spray médical, tombé de l'ambulance."})
	f.add_examine(Z, k.p(7.9, 11.7, 1.0), "La portière est ouverte, les clés sur le contact. Le moteur ne démarre pas : quelqu'un a arraché les câbles sous le volant.", {"radius": 1.6})
	# Le Veilleur : grand, maigre, presque aveugle — il sent le mouvement et le bruit
	f.add_spawn("b2_veilleur", "veilleur", k.p(20.0, 4.0, 0.05), PI * 0.5,
		[k.p(8.0, -2.0, 0.05), k.p(26.0, -3.0, 0.05), k.p(24.0, 10.0, 0.05), k.p(6.0, 8.0, 0.05), k.p(3.0, -14.0, 0.05), k.p(24.0, -14.0, 0.05)], {})
	f.add_trigger("b2_parking", k.p(3.0, -9.0, 1.2), Vector3(6.0, 2.4, 5.0))
	f.add_trigger("b2_arrive", k.p(-9.0, -14.0, 1.2), Vector3(5.0, 2.4, 3.6))
	f.anchors["veilleur_ambush"] = k.p(11.0, -7.0, 0.05)


# --- Courant : procédure de démarrage en trois étapes ------------------------------------------

static func _power(f: Facility, k: HKit) -> void:
	var g := f.geo
	var G := "b2_generator"
	HProps.generator(g, G, k.p(-27.0, -3.2), 0.0)
	HProps.generator(g, G, k.p(-21.5, -3.2), 0.0)
	g.box(G, "black", k.p(-21.5, -3.2, 1.2), Vector3(3.2, 1.4, 1.75), {"collide": false})
	f.add_examine(G, k.p(-21.5, -4.3, 1.2), "Le groupe G2 est éventré. Le carter a été ouvert… de l'intérieur ? Il faudra se contenter de G1.", {"radius": 1.8})
	HProps.fuel_tank(g, G, k.p(-29.5, -9.0), 0.0)
	Props.pipe(g, G, k.p(-28.2, -9.0, 0.8), k.p(-27.8, -4.2, 0.6), 0.05, "metal_rust")
	HProps.electrical_cabinet(g, G, k.p(-20.5, -11.6), PI, 3)
	for p in [[k.p(-31.85, -7.0), PI / 2.0, "pump", "POMPE GASOIL"], [k.p(-25.6, -4.08), PI, "g1", "DÉMARRAGE G1"],
			[k.p(-22.6, -11.88), 0.0, "transfer", "INVERSEUR SECOURS"]]:
		var sp := SwitchPanel.new()
		sp.switch_id = String(p[2])
		sp.label_text = String(p[3])
		sp.position = p[0]
		sp.rotation.y = float(p[1])
		g.zone_root(G).add_child(sp)
		f.nodes["switch_" + String(p[2])] = sp
	Props.pipe(g, G, k.p(-31.7, -1.0, 2.8), k.p(-18.3, -1.0, 2.8), 0.12, "metal_rust")
	Props.pipe(g, G, k.p(-31.7, -11.4, 2.6), k.p(-18.3, -11.4, 2.6), 0.08, "metal_dark")
	f.add_blood(G, k.p(-24.0, -7.5, 0.01), 1.3, "blood_dry")
	f.add_pickup("b2_gen_ammo", G, "ammo_9mm", 8, k.p(-19.2, -6.5, 0.0), 0.7)
	# Local technique : procédure, armoires, établi, sauvegarde
	var T := "b2_technical"
	HProps.electrical_cabinet(g, T, k.p(-11.0, -0.4), 0.0, 4)
	HProps.electrical_cabinet(g, T, k.p(-17.6, -6.0), -PI / 2.0, 2)
	Props.table(g, T, k.p(-8.0, -9.5), 0.0, 2.2, 0.9, 0.9, "wood_desk", "metal_dark")
	f.add_doc("doc_generator", T, k.p(-8.4, -9.5, 0.9), 0.2, "folder")
	f.add_save_point(T, k.p(-7.2, -9.4, 0.9), PI)
	f.add_pickup("b2_tech_spray", T, "spray", 1, k.p(-5.2, -6.0, 0.0), 0.4)
	Props.shelf(g, T, k.p(-4.4, -3.0), PI / 2.0, 2.4, 2.0, 0.5, 0.7, "metal_gray")
	Props.pipe(g, T, k.p(-17.7, -2.0, 2.7), k.p(-4.3, -2.0, 2.7), 0.1, "metal_green")
	f.add_light(T, k.p(-8.0, -9.3, 1.6), Color(1.0, 0.8, 0.5), 0.6, 5.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.15, 0.1, 0.15)})
	f.add_examine(T, k.p(-11.0, -1.0, 1.5), "Le tableau général basse tension. Tous les voyants sont éteints : « RÉSEAU EDF — ABSENT ». Le courant doit venir des groupes électrogènes, à côté.", {"radius": 1.8})


# --- Morgue, chaufferie, atelier ---------------------------------------------------------------

static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	var M := "b2_morgue"
	Props.morgue_wall(g, M, k.p(-18.0, -25.4), PI, 6, 3, [[1, 0], [4, 1], [2, 2]])
	Props.steel_table(g, M, k.p(-21.0, -20.5), 0.0)
	Props.steel_table(g, M, k.p(-15.0, -20.5), 0.0)
	Props.body_bag(g, M, k.p(-15.0, -20.5), 0.0, false)
	Props.body_bag(g, M, k.p(-13.2, -18.2), 1.4)
	Props.instrument_tray(g, M, k.p(-19.6, -19.0), 0.3)
	Props.sink(g, M, k.p(-23.6, -18.5), -PI / 2.0)
	f.add_doc("doc_morgue", M, k.p(-22.8, -17.2, 0.0), 0.8, "folder")
	f.add_blood(M, k.p(-17.5, -22.5, 0.01), 1.6, "blood_smear")
	f.add_examine(M, k.p(-18.0, -24.6, 1.0), "Trois casiers réfrigérés sont ouverts… de l'intérieur. Les plateaux sont vides. Des traces de doigts ensanglantés sur les poignées.", {"radius": 1.8})
	f.add_spawn("b2_morgue_body", "hollow", k.p(-21.0, -20.5, 0.97), 0.0, [], {"variant": "patient", "dormant": true})
	f.add_light(M, k.p(-18.0, -21.0, HKit.CEIL - 0.05), COLD, 0.6, 8.0, LightFixture.Mode.FLICKER, {"panel": Vector3(1.2, 0.04, 0.3), "buzz": true, "grid": true})
	# Chaufferie
	var B := "b2_boiler"
	for x in [8.5, 13.5]:
		g.cylinder(B, "metal_rust", k.p(x, -22.5, 0.2), k.p(x, -22.5, 2.6), 1.1, {"segments": 16, "collide": true})
		g.cylinder(B, "metal_dark", k.p(x, -22.5, 0.0), k.p(x, -22.5, 0.2), 1.2, {"segments": 16})
		Props.pipe(g, B, k.p(x, -22.5, 2.6), k.p(x, -22.5, 3.0), 0.2, "metal_rust", false)
	Props.pipe(g, B, k.p(6.3, -18.0, 2.7), k.p(15.7, -18.0, 2.7), 0.14, "metal_rust")
	f.add_pickup("b2_boiler_ammo", B, "ammo_9mm", 12, k.p(11.0, -25.4, 0.0), 0.6)
	f.add_light(B, k.p(11.0, -19.0, 2.6), Color(1.0, 0.45, 0.2), 0.6, 7.0, LightFixture.Mode.PULSE, {"fog": 0.8})
	# Atelier
	var W := "b2_workshop"
	Props.table(g, W, k.p(28.0, -25.2), 0.0, 3.0, 0.9, 0.95, "wood_desk", "metal_dark")
	Props.shelf(g, W, k.p(31.5, -21.0), PI / 2.0, 2.4, 2.0, 0.5, 0.8)
	Props.boxes(g, W, k.p(25.0, -18.0), 0.0, 4)
	f.add_pickup("b2_workshop_spray", W, "spray", 1, k.p(27.4, -25.2, 0.95), 0.2)
	f.add_pickup("b2_workshop_battery", W, "battery", 1, k.p(26.4, -25.3, 0.95), 0.9)
	f.add_pickup("b2_workshop_shells", W, "ammo_shells", 4, k.p(28.8, -25.1, 0.95), 1.3, {"msg": "Des cartouches de calibre 12. Quelqu'un chassait, ici ?"})
	f.add_light(W, k.p(28.0, -21.0, HKit.CEIL - 0.05), COLD, 0.5, 6.0, LightFixture.Mode.BROKEN, {"panel": Vector3(1.0, 0.04, 0.25), "grid": true})


## Éclairage : quasi-noir avant le rétablissement du courant (« grid » = réseau principal).
static func _lights(f: Facility, k: HKit) -> void:
	var x := -28.0
	while x < 31.0:
		f.ceiling_light("b2_corridor", k.p(x, -14.0, HKit.CEIL), LightFixture.Mode.STEADY, 0.7, {"range": 7.0, "grid": true})
		x += 8.0
	for p in [k.p(-12.0, -15.7, 2.5), k.p(10.0, -15.7, 2.5), k.p(26.0, -12.3, 2.5)]:
		f.add_light("b2_corridor", p, RED, 0.45, 5.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.18, 0.08, 0.08)})
	for p in [k.p(4.0, -2.0, 3.2), k.p(20.0, -2.0, 3.2), k.p(4.0, 8.0, 3.2), k.p(20.0, 8.0, 3.2), k.p(28.0, 1.0, 3.2)]:
		f.ceiling_light("b2_parking", p, LightFixture.Mode.FLICKER, 0.8, {"range": 9.0, "grid": true})
	f.add_light("b2_parking", k.p(12.0, 12.5, 2.8), RED, 0.5, 6.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.2, 0.1, 0.1)})
	for p in [k.p(-28.0, -6.0, HKit.CEIL), k.p(-22.0, -6.0, HKit.CEIL)]:
		f.ceiling_light("b2_generator", p, LightFixture.Mode.STEADY, 0.9, {"range": 8.0, "grid": true})
	f.add_light("b2_generator", k.p(-31.6, -7.6, 2.2), RED, 0.5, 5.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.1, 0.18, 0.18)})
	f.ceiling_light("b2_technical", k.p(-11.0, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.8, {"grid": true})

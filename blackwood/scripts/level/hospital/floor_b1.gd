class_name HFloorB1
extends RefCounted
## Sous-sol -1 — Urgences souterraines, stockage médical, laboratoire de biologie.
## On y entre par le quai des ambulances (portes automatiques qui fonctionnent
## encore). Accueil et tri, box de soins, puis le couloir où attend l'infirmière.
## C'est aussi la dernière ligne droite de l'évasion finale (monte-charge → quai).

const LV := -1
const COLD := Color(0.8, 0.9, 1.0)
const RED := Color(1.0, 0.15, 0.1)


static func build(f: Facility) -> void:
	var k := HKit.new(f, LV)
	var base := {"reverb": "corridor", "surface": "tile", "ambience": {"amb_hum": 0.4, "amb_vent": 0.5, "amb_basement": 0.25}}
	k.zone("b1_corridor", "Urgences — Couloir de service", [Rect2(-26, -16, 58, 4)], base)
	k.zone("b1_bay", "Quai des ambulances", [Rect2(32.3, -14, 13.7, 12)], {"ymin": -5.0, "ymax": -0.3, "reverb": "basement",
		"surface": "concrete", "ambience": {"amb_rain": 0.35, "amb_wind": 0.2, "amb_hum": 0.3}, "outdoor_lights": true})
	k.zone("b1_triage", "Urgences — Accueil et tri", [Rect2(20, -12, 12, 12)], {"reverb": "room", "surface": "tile",
		"ambience": {"amb_hum": 0.5, "amb_room": 0.4}})
	k.zone("b1_boxes", "Urgences — Box de soins", [Rect2(4, -12, 16, 12)], {"reverb": "room", "surface": "tile",
		"ambience": {"amb_hum": 0.35, "amb_room": 0.5}})
	k.zone("b1_resus", "Salle de déchocage", [Rect2(-8, -12, 12, 12)], {"reverb": "room"})
	k.zone("b1_storage", "Stockage médical", [Rect2(6, -26, 10, 10)], {"reverb": "room", "surface": "concrete",
		"ambience": {"amb_hum": 0.5}})
	k.zone("b1_biolab", "Laboratoire de biologie", [Rect2(-24, -26, 12, 10)], {"reverb": "room"})
	k.standard({
		"zone": "b1_corridor",
		"corridor": Vector2(-26, 32),
		"mats": {"wall": "wall_hospital_dirty", "corridor_floor": "floor_worn", "floor_s": "floor_worn", "floor_n": "floor_worn"},
		"zones_s": [{"zone": "b1_resus", "x1": -8, "x2": 4, "floor": "floor_tile_lab"}, {"zone": "b1_boxes", "x1": 4, "x2": 20},
			{"zone": "b1_triage", "x1": 20, "x2": 32, "floor": "floor_tile"}],
		"zones_n": [{"zone": "b1_biolab", "x1": -24, "x2": -12, "floor": "floor_tile_lab"}, {"zone": "b1_storage", "x1": 6, "x2": 16, "floor": "floor_concrete"}],
		"skip_north": [HKit.STAIR_A, HKit.ELEV, HKit.FREIGHT],
		"north_walls": [-24.0, 6.0, 16.0],
		"south_walls": [-8.0, 4.0],
		"doors": [
			{"id": "b1_boxes_exit", "x": 6.0, "side": "s", "opts": {"sign": "BOX 1 — 4", "window": true}},
			{"id": "b1_resus_door", "x": -2.0, "side": "s", "w": 1.8, "opts": {"lock": Door.Lock.LOCKED, "double": true, "sign": "DÉCHOCAGE",
				"locked_msg": "Salle de déchocage. Verrouillée — quelqu'un a coincé une chaise sous la poignée, de l'intérieur."}},
			{"id": "b1_triage_corr", "x": 26.0, "side": "s", "opts": {"lock": Door.Lock.LOCKED, "sign": "ACCUEIL URGENCES",
				"locked_msg": "Des brancards empilés bloquent la porte de l'autre côté."}},
			{"id": "b1_biolab_door", "x": -18.0, "side": "n", "opts": {"lock": Door.Lock.LOCKED, "window": true, "mat": "metal_white", "sign": "LABORATOIRE DE BIOLOGIE",
				"locked_msg": "LABORATOIRE DE BIOLOGIE — accès par badge. Le lecteur est éteint."}},
			{"id": "b1_storage_door", "x": 11.0, "side": "n", "opts": {"sign": "STOCKAGE MÉDICAL", "mat": "metal_gray"}},
		],
		"windows": [{"x": 1.2, "side": "s", "w": 2.6}, {"x": -21.5, "side": "n", "w": 2.4}],
		"light_mode": LightFixture.Mode.FLICKER,
		"light_energy": 0.75,
		"barricade_text_w": "SECTEUR FERMÉ — QUARANTAINE",
	})
	k.glass_x("b1_corridor", -0.1, 2.5, HKit.CS, 1.0, 2.2, "glass_dirty")
	k.glass_x("b1_corridor", -22.7, -20.3, HKit.CN, 1.0, 2.2, "glass_dirty")
	k.elevator_doors("b1_corridor", -6, 6, [-3.0, 3.0], "main", "ASCENSEURS")
	k.elevator_doors("b1_corridor", 16, 20, [18.0], "freight", "MONTE-CHARGE")
	_bay(f, k)
	_triage(f, k)
	_boxes(f, k)
	_corridor(f, k)
	_rooms(f, k)


# --- Quai des ambulances -------------------------------------------------------------

static func _bay(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "b1_bay"
	var y := k.y
	g.slab(Z, "floor_concrete", 32.3, -14.0, 46.0, -2.0, y, 0.3)
	var hh := 3.7
	g.wall_x(Z, "wall_concrete", 32.3, 46.3, -14.15, y, hh, 0.3)
	g.wall_z(Z, "wall_concrete", -14.3, -2.0, 46.15, y, hh, 0.3)
	g.wall_x(Z, "wall_concrete", 32.3, 33.7, -1.85, y, hh, 0.3)
	g.wall_x(Z, "wall_concrete", 42.3, 46.3, -1.85, y, hh, 0.3)
	# Portes automatiques des urgences (elles fonctionnent encore)
	var ad := AutoDoor.new()
	ad.door_id = "er_doors"
	ad.width = 3.0
	ad.height = 2.5
	ad.position = Vector3(32.15, y, -8.0)
	ad.rotation.y = PI / 2.0
	g.zone_root(Z).add_child(ad)
	f.nodes["er_doors"] = ad
	g.box(Z, "wall_facade_dark", Vector3(32.5, y + 3.0, -8.0), Vector3(0.12, 0.7, 5.0), {"collide": false})
	f.add_label(Z, "URGENCES", Vector3(32.58, y + 3.0, -8.0), PI / 2.0, 2.2, RED, true)
	f.add_light(Z, Vector3(33.2, y + 3.0, -8.0), RED, 1.2, 6.0, LightFixture.Mode.STEADY, {"fog": 1.0})
	f.add_light(Z, Vector3(39.0, y + 3.35, -8.0), COLD, 1.1, 11.0, LightFixture.Mode.BROKEN,
		{"panel": Vector3(1.2, 0.05, 0.3), "buzz": true, "fog": 0.8})
	f.add_light(Z, Vector3(43.5, y + 3.35, -12.0), Color(1.0, 0.62, 0.3), 0.8, 8.0, LightFixture.Mode.STEADY,
		{"panel": Vector3(0.5, 0.1, 0.3), "fog": 0.8})
	# Ambulance arrivée en urgence, gyrophares allumés, portes arrière ouvertes vers les urgences
	Props.ambulance(g, Z, Vector3(40.5, y, -8.2), -PI / 2.0, true, true)
	f.add_light(Z, Vector3(38.6, y + 3.0, -9.2), Color(0.25, 0.4, 1.0), 1.6, 7.0, LightFixture.Mode.PULSE, {"fog": 1.2})
	# Plafonnier de la cellule, faiblard
	f.add_light(Z, Vector3(39.4, y + 2.35, -8.2), Color(0.85, 0.92, 1.0), 0.45, 3.5, LightFixture.Mode.FLICKER)
	Props.gurney(g, Z, Vector3(35.5, y, -5.2), 0.5, true)
	HProps.blood_trail(f, Z, Vector3(37.0, y, -8.2), Vector3(32.6, y, -8.0), 5)
	f.add_blood(Z, Vector3(36.4, y + 0.01, -7.4), 1.2, "blood_dry")
	Props.body_bag(g, Z, Vector3(44.0, y, -4.0), 0.3)
	Props.papers(g, Z, Vector3(36.0, y, -9.5), 1.5, 8)
	f.add_pickup("b1_flashlight", Z, "flashlight", 1, Vector3(38.2, y + 0.98, -7.85), 0.4,
		{"msg": "La lampe de l'équipe du SAMU, encore accrochée au brancard. [{key:flashlight}] pour l'allumer ou l'éteindre."})
	f.add_examine(Z, Vector3(37.6, y + 1.2, -8.8), "L'arrière de l'ambulance est maculé de sang. Le brancard a été arraché de ses fixations. Sur le siège, un gilet : « SAMU — Équipe 3 ».", {"radius": 2.0})
	f.add_examine(Z, Vector3(33.2, y + 1.3, -10.6), "Les portes automatiques s'ouvrent encore. Quelqu'un a laissé l'alimentation de secours des urgences en marche.", {"radius": 1.8})
	f.add_trigger("er_bay", Vector3(39.0, y + 1.2, -6.0), Vector3(12.0, 2.4, 7.0))


# --- Accueil et tri -------------------------------------------------------------------

static func _triage(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "b1_triage"
	var y := k.y
	# Cloison triage / box avec une porte
	k.wall_z(Z, "wall_hospital_dirty", HKit.CS, HKit.ZS, 20.0, [HKit.op(-6.0, 1.6)])
	k.door("b1_triage_boxes", Z, 20.0, -6.0, true, 1.6, {"double": true, "window": true, "sign": "BOX DE SOINS",
		"lock": Door.Lock.KEY, "key": "key_boxes", "locked_msg": "Porte des box de soins : verrouillée. Le badge ne suffit pas, il faut la clé de l'accueil.",
		"unlock_msg": "La clé de l'accueil déverrouille la porte des box."})
	HProps.reception_desk(g, Z, Vector3(27.0, y, -9.4), PI, 5.0)
	var phone := Phone.new()
	phone.position = Vector3(26.2, y + 1.14, -9.6)
	phone.rotation.y = PI
	g.zone_root(Z).add_child(phone)
	f.nodes["triage_phone"] = phone
	Props.computer(g, Z, Vector3(28.0, y + 1.14, -9.6), 0.0)
	Props.office_chair(g, Z, Vector3(27.4, y, -10.6), 2.6, true)
	f.add_doc("doc_triage", Z, Vector3(28.9, y + 1.15, -9.6), 0.3)
	f.add_pickup("b1_key_boxes", Z, "key_boxes", 1, Vector3(25.3, y + 1.15, -9.5), 0.6,
		{"msg": "Un trousseau oublié sur le comptoir : « BOX DE SOINS — ACCUEIL »."})
	Props.papers(g, Z, Vector3(26.5, y, -7.0), 1.8, 12)
	# Salle d'attente : chaises, fauteuils roulants renversés
	Props.bench_row(g, Z, Vector3(24.0, y, -1.0), 0.0, 5)
	Props.bench_row(g, Z, Vector3(29.0, y, -1.0), 0.0, 4)
	Props.bench_row(g, Z, Vector3(24.0, y, -4.2), PI, 5, "fabric_green")
	Props.wheelchair(g, Z, Vector3(22.4, y, -7.5), 1.9)
	Props.wheelchair(g, Z, Vector3(30.2, y, -5.5), -0.8)
	Props.gurney(g, Z, Vector3(24.5, y, -8.5), 1.4, true)
	# Brancards empilés contre la porte du couloir
	Props.gurney(g, Z, Vector3(26.0, y, -11.2), PI / 2.0)
	Props.gurney(g, Z, Vector3(25.6, y + 0.9, -11.3), PI / 2.0 + 0.15)
	HProps.cart(g, Z, Vector3(24.4, y, -11.3), 0.3, true)
	f.add_blood(Z, Vector3(23.0, y + 0.01, -6.2), 1.4, "blood_dry")
	f.add_blood(Z, Vector3(29.5, y + 0.01, -3.0), 0.9, "blood_dry")
	HProps.blood_trail(f, Z, Vector3(31.5, y, -8.0), Vector3(21.0, y, -6.0), 7)
	f.add_blood(Z, Vector3(31.99, y + 1.2, -4.0), 0.9, "blood_smear", Vector3.LEFT)
	HProps.corpse(f, Z, Vector3(21.3, y, -0.42), 0.0, "sit", {"cloth_tint": Color(0.15, 0.3, 0.55), "cloth_mix": 0.9})
	Props.notice_board(g, Z, Vector3(22.0, y, -11.88), PI)
	f.add_label(Z, "ACCUEIL — TRI", Vector3(27.0, y + 2.55, -11.85), 0.0, 1.1, Color(0.3, 0.55, 0.9))
	f.add_label(Z, "Temps d'attente estimé : —", Vector3(22.3, y + 2.1, -11.85), 0.0, 0.6, Color(0.9, 0.3, 0.1), true)
	for x in [23.0, 29.0]:
		f.ceiling_light(Z, k.p(x, -6.0, HKit.CEIL), LightFixture.Mode.FLICKER if x < 25.0 else LightFixture.Mode.STEADY, 0.85)
	f.add_light(Z, k.p(31.3, -3.0, 2.6), RED, 0.9, 6.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.15, 0.15, 0.15)})
	f.add_trigger("b1_enter", k.p(28.5, -8.0, 1.2), Vector3(5.0, 2.4, 6.0))
	f.add_examine(Z, k.p(22.0, -11.7, 1.4), "Un tableau blanc : « 23 h 10 — NE PLUS ADMETTRE. Patients mordus → isolement box 4. Le Dr Keller descend. » Plus bas, en rouge : « KELLER NE RÉPOND PLUS. »", {"radius": 1.8})


# --- Box de soins ----------------------------------------------------------------------

static func _boxes(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "b1_boxes"
	var y := k.y
	# Quatre box le long du mur sud, séparés par des rideaux
	for i in 4:
		var x0 := 4.5 + i * 3.75
		var cx := x0 + 1.875
		if i > 0:
			HProps.curtain(g, Z, Vector3(x0, y, -4.6), Vector3(x0, y, -0.1), 2.35, 0.0)
		HProps.curtain(g, Z, Vector3(x0 + 0.2, y, -4.6), Vector3(x0 + 3.55, y, -4.6), 2.35, [0.55, 0.7, 0.35, 0.8][i])
		Props.hospital_bed(g, Z, Vector3(cx, y, -2.0), 0.0, i == 1)
		Props.iv_stand(g, Z, Vector3(cx + 1.1, y, -1.0))
		f.add_label(Z, "BOX %d" % (i + 1), k.p(cx, -0.12, 2.3), PI, 0.8, Color(0.25, 0.45, 0.8))
	f.add_blood(Z, k.p(9.2, -2.2, 0.68), 0.8, "blood")
	f.add_blood(Z, k.p(9.6, -3.4, 0.01), 1.3, "blood_dry")
	HProps.corpse(f, Z, k.p(13.5, -2.9, 0.55), 0.05, "back", {"cloth_tint": Color(0.85, 0.85, 0.82), "cloth_mix": 0.7, "blood": 1.0}, 0.95)
	f.add_examine(Z, k.p(13.5, -2.6, 1.0), "Un patient, sanglé au lit. On lui a tiré une balle dans la tête. Sur son bracelet : « Admis 22 h 47 — morsure avant-bras ».", {"radius": 1.8})
	f.add_pickup("b1_spray", Z, "spray", 1, k.p(18.1, -2.4, 0.68), 0.4, {"msg": "Un spray médical, oublié sur le lit du box 4."})
	# Poste infirmier et chariots côté nord
	Props.desk(g, Z, k.p(10.0, -10.8), PI)
	Props.computer(g, Z, k.p(10.2, -10.9, 0.76), PI, "screen_error")
	Props.office_chair(g, Z, k.p(10.2, -9.8), 0.4)
	Props.medical_cabinet(g, Z, k.p(14.5, -11.65), PI)
	Props.medical_cabinet(g, Z, k.p(15.4, -11.65), PI)
	HProps.cart(g, Z, k.p(17.5, -9.0), 0.8)
	Props.gurney(g, Z, k.p(7.0, -8.2), 0.2)
	Props.papers(g, Z, k.p(11.5, -7.0), 2.0, 9)
	HProps.blood_trail(f, Z, k.p(18.0, -7.0), k.p(6.5, -11.0), 8)
	for x in [8.0, 16.0]:
		f.ceiling_light(Z, k.p(x, -7.5, HKit.CEIL), LightFixture.Mode.BROKEN if x < 10.0 else LightFixture.Mode.FLICKER, 0.8)
	f.ceiling_light(Z, k.p(12.0, -2.5, HKit.CEIL), LightFixture.Mode.STEADY, 0.6)


# --- Couloir : l'infirmière -------------------------------------------------------------

static func _corridor(f: Facility, k: HKit) -> void:
	var g := f.geo
	var Z := "b1_corridor"
	var y := k.y
	f.add_blood(Z, Vector3(11.0, y + 1.3, HKit.CN + 0.12), 1.0, "blood_smear", Vector3.BACK)
	f.add_blood(Z, k.p(11.4, -15.2, 0.01), 1.1, "blood_dry")
	Props.wheelchair(g, Z, k.p(-4.0, -12.7), 2.8)
	HProps.cart(g, Z, k.p(22.0, -15.4), 0.1)
	Props.papers(g, Z, k.p(1.0, -14.0), 2.5, 10)
	f.add_label(Z, "← ESCALIER A — RDC / SOUS-SOL -2", k.p(-2.0, HKit.CN + 0.13, 2.25), 0.0, 0.7, Color(0.85, 0.85, 0.8))
	f.add_label(Z, "SORTIE URGENCES →", k.p(10.0, HKit.CS - 0.13, 2.25), PI, 0.7, Color(0.2, 0.8, 0.3))
	# L'infirmière : immobile, face à la porte du stockage
	f.add_spawn("b1_nurse", "hollow", k.p(11.0, -14.8, 0.05), 0.0, [], {"variant": "nurse", "passive": true})
	f.anchors["b1_nurse_look"] = k.p(11.0, -14.8, 1.5)
	f.add_trigger("b1_nurse", k.p(6.0, -14.0, 1.2), Vector3(4.0, 2.4, 3.6))
	f.add_trigger("b1_stair_escape", Vector3(-9.0, y + 1.2, -17.2), Vector3(5.4, 2.4, 1.3))
	# Infectés qui envahiront le -1 pendant l'évasion
	f.add_spawn("b1_esc1", "hollow", k.p(-4.0, -14.0, 0.05), PI / 2.0, [k.p(-4.0, -14.0, 0.05), k.p(14.0, -13.6, 0.05)],
		{"variant": "patient", "event": true, "flag": "self_destruct"})
	f.add_spawn("b1_esc2", "hollow", k.p(14.0, -8.0, 0.05), PI, [k.p(14.0, -8.0, 0.05), k.p(7.0, -7.0, 0.05)],
		{"variant": "nurse", "event": true, "flag": "self_destruct"})
	f.add_spawn("b1_esc3", "hollow", k.p(26.0, -3.0, 0.05), PI / 2.0, [k.p(26.0, -3.0, 0.05), k.p(22.5, -8.5, 0.05)],
		{"variant": "guard", "event": true, "flag": "self_destruct"})


# --- Déchocage, laboratoire, stockage ---------------------------------------------------

static func _rooms(f: Facility, k: HKit) -> void:
	var g := f.geo
	var y := k.y
	# Déchocage (vu par la vitre) : corps sous un drap, défibrillateur
	Props.operating_table(g, "b1_resus", k.p(1.5, -7.0), 0.0)
	g.box("b1_resus", "fabric_green", k.p(1.5, -7.0, 1.0), Vector3(0.7, 0.18, 1.9), {"collide": false})
	f.add_blood("b1_resus", k.p(1.8, -6.2, 0.01), 1.6, "blood")
	Props.instrument_tray(g, "b1_resus", k.p(0.2, -8.2), 0.4)
	HProps.cart(g, "b1_resus", k.p(3.0, -9.5), 0.0)
	Props.chair(g, "b1_resus", k.p(-2.0, -11.6), PI)
	f.ceiling_light("b1_resus", k.p(1.5, -7.0, HKit.CEIL), LightFixture.Mode.FLICKER, 0.6)
	# Laboratoire de biologie (vu par la vitre)
	for x in [-21.0, -15.0]:
		Props.table(g, "b1_biolab", k.p(x, -21.0), 0.0, 2.4, 0.9, 0.92, "metal_white", "metal_steel")
		Props.computer(g, "b1_biolab", k.p(x - 0.6, -21.0, 0.92), PI, "screen_terminal")
	Props.fridge(g, "b1_biolab", k.p(-23.4, -24.8), -PI / 2.0)
	Props.fridge(g, "b1_biolab", k.p(-23.4, -23.9), -PI / 2.0)
	Props.medical_cabinet(g, "b1_biolab", k.p(-13.0, -25.6), PI)
	f.ceiling_light("b1_biolab", k.p(-18.0, -21.0, HKit.CEIL), LightFixture.Mode.PULSE, 0.4)
	f.add_examine("b1_corridor", k.p(-21.5, -15.7, 1.5), "Par la vitre : des paillasses, des centrifugeuses encore allumées. Sur un tableau, une seule ligne entourée trois fois : « ÉCHANTILLONS DU 8e — NE PAS OUVRIR HORS P3 ».", {"radius": 1.6})
	f.add_examine("b1_corridor", k.p(1.2, -12.3, 1.5), "Par la vitre du déchocage : un corps sous un drap vert. Le drap bouge. Faiblement. Régulièrement.", {"radius": 1.6})
	# Stockage médical
	for i in 3:
		Props.shelf(g, "b1_storage", k.p(7.2, -24.5 + i * 2.6), PI / 2.0, 2.2, 2.2, 0.5, 0.85)
		Props.shelf(g, "b1_storage", k.p(14.8, -24.5 + i * 2.6), -PI / 2.0, 2.2, 2.2, 0.5, 0.7)
	Props.boxes(g, "b1_storage", k.p(10.0, -25.3), 0.0, 5)
	f.add_pickup("b1_storage_spray", "b1_storage", "spray", 1, k.p(11.0, -19.5, 0.0), 0.2)
	f.add_pickup("b1_storage_ammo", "b1_storage", "ammo_9mm", 10, k.p(9.6, -22.0, 0.0), 1.1)
	f.add_pickup("b1_storage_battery", "b1_storage", "battery", 1, k.p(12.4, -24.0, 0.0), 0.3)
	f.ceiling_light("b1_storage", k.p(11.0, -21.0, HKit.CEIL), LightFixture.Mode.BROKEN, 0.7)

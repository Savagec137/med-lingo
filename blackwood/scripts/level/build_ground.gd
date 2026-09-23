class_name BuildGround
extends RefCounted
## Rez-de-chaussée : zones 2 à 7.
##   Entrée principale → Hall → Couloir administratif (archives, infirmerie,
##   bureau de Lena, salle de repos) → Salle de sécurité
##   Hall → Aile des laboratoires (salle d'examen, réserve) → Laboratoire

const COLD := Color(0.82, 0.9, 1.0)
const WARM := Color(1.0, 0.76, 0.48)
const RED := Color(1.0, 0.18, 0.08)
const GREEN := Color(0.2, 1.0, 0.45)


static func build(f: Facility) -> void:
	var g := f.geo
	_entrance(f, g)
	_hall(f, g)
	_admin(f, g)
	_archives(f, g)
	_security(f, g)
	_lab_wing(f, g)
	_lab(f, g)
	_stairs(f, g)


# --- Zone 2 : entrée principale ---------------------------------------------

static func _entrance(f: Facility, g: Geo) -> void:
	var Z := "entrance"
	g.slab(Z, "floor_tile", -4, 6, 4, 12, 0.0)
	g.ceiling(Z, "ceiling_tile", -4.15, 6, 4.15, 12.2, 3.2)
	g.wall_z(Z, "wall_ext", 6.0, 12.2, -4.0, 0.0, 3.6, 0.3, [], "wall_hospital")
	g.wall_z(Z, "wall_hospital", 6.0, 12.2, 4.0, 0.0, 3.6, 0.3, [], "wall_ext")
	g.wall_x(Z, "wall_hospital", -4.15, 4.15, 12.0, 0.0, 3.6, 0.3, [
		{"a": -1.3, "b": 1.3, "top": 2.6},
		{"a": -3.5, "b": -1.9, "bottom": 0.9, "top": 2.5},
		{"a": 1.9, "b": 3.5, "bottom": 0.9, "top": 2.5}], "wall_ext")
	for x in [-2.7, 2.7]:
		g.box(Z, "glass_dirty", Vector3(x, 1.7, 12.0), Vector3(1.6, 1.6, 0.03), {"collide": false, "shadow": false})
	# Portes vitrées
	var main := f.add_door("main_entrance", Z, Vector3(0, 0, 12.0), false, 2.6,
		{"height": 2.6, "double": true, "mat": "glass", "frame": "metal_dark", "sound_open": "door_open_glass", "sound_close": "door_close_glass"})
	main.locked_msg = "Le rideau de confinement bloque la sortie."
	f.add_door("vestibule_door", Z, Vector3(0, 0, 6.0), false, 2.6,
		{"height": 2.6, "double": true, "mat": "glass", "frame": "metal_dark", "sound_open": "door_open_glass", "sound_close": "door_close_glass"})
	# Mobilier
	Props.desk(g, Z, Vector3(2.9, 0, 9.3), PI / 2.0, "wood_desk", 1.6, 0.7)
	Props.computer(g, Z, Vector3(3.15, 0.76, 9.5), PI / 2.0, "screen_snow")
	Props.office_chair(g, Z, Vector3(3.55, 0, 8.6), -PI / 2.0 + 0.5)
	Props.bench_row(g, Z, Vector3(-3.35, 0, 9.2), -PI / 2.0, 3)
	Props.plant(g, Z, Vector3(-3.4, 0, 6.7))
	Props.notice_board(g, Z, Vector3(-3.83, 0, 10.6), -PI / 2.0)
	f.add_examine(Z, Vector3(-3.7, 1.5, 10.6), "Une affiche officielle : « Le centre de recherche Blackwood est fermé jusqu'à nouvel ordre. Mesure sanitaire préventive. — Halvorsen Biomedical ». Datée de novembre dernier.")
	g.box(Z, "rubber", Vector3(0, 0.006, 11.2), Vector3(2.2, 0.012, 1.2), {"collide": false})
	# Panneau « sol glissant »
	g.box(Z, "metal_yellow", Vector3(-1.6, 0.32, 8.4), Vector3(0.32, 0.64, 0.02), {"basis": Basis(Vector3.RIGHT, 0.25), "collide": false})
	g.box(Z, "metal_yellow", Vector3(-1.6, 0.32, 8.72), Vector3(0.32, 0.64, 0.02), {"basis": Basis(Vector3.RIGHT, -0.25), "collide": false})
	Props.papers(g, Z, Vector3(0.8, 0, 8.5), 1.8, 7)
	f.ceiling_light(Z, Vector3(0, 3.2, 9.0), LightFixture.Mode.FLICKER, 0.9, {"range": 6.5})
	_exit_sign(f, Z, Vector3(0, 2.85, 11.83), PI)
	f.add_trigger("hall_enter", Vector3(0, 1.0, 4.4), Vector3(7.0, 2.0, 1.8))


static func _exit_sign(f: Facility, zone: String, pos: Vector3, rot: float) -> void:
	f.geo.box(zone, "emit_green", pos, Vector3(0.5, 0.18, 0.04) if absf(sin(rot)) < 0.5 else Vector3(0.04, 0.18, 0.5), {"collide": false, "shadow": false})
	var lbl := f.add_label(zone, "SORTIE", pos + Basis(Vector3.UP, rot) * Vector3(0, 0, 0.03), rot, 0.35, Color(0.02, 0.1, 0.03))
	lbl.shaded = false
	f.add_light(zone, pos + Basis(Vector3.UP, rot) * Vector3(0, -0.1, 0.25), GREEN, 0.25, 2.5)


# --- Zone 3 : hall ------------------------------------------------------------

static func _hall(f: Facility, g: Geo) -> void:
	var Z := "hall"
	g.slab(Z, "floor_tile", -12, -10, 12, 6, 0.0)
	g.ceiling(Z, "ceiling_concrete", -12, -10, 12, 6, 6.2)
	# Murs
	g.wall_z(Z, "wall_admin", -10.0, 6.0, -12.0, 0.0, 9.0, 0.3, [{"a": -1.65, "b": -0.35, "top": 2.2}], "wall_hospital")
	g.wall_z(Z, "wall_hospital", -10.0, 6.0, 12.0, 0.0, 9.0, 0.3, [{"a": -2.2, "b": 0.2, "top": 2.4}], "wall_hospital")
	g.wall_x(Z, "wall_concrete", -12.0, 12.0, -10.0, 0.0, 9.0, 0.3, [
		{"a": -8.0, "b": -6.0, "top": 2.3},
		{"a": 3.8, "b": 6.2, "top": 2.3},
		{"a": -11.5, "b": -10.2, "top": 2.2},
		{"a": -4.0, "b": -2.6, "bottom": 3.2, "top": 5.4},
		{"a": 6.0, "b": 7.4, "bottom": 3.2, "top": 5.4}], "wall_hospital")
	var south_ops := [{"a": -10.6, "b": -8.6, "bottom": 1.2, "top": 5.6}, {"a": -7.6, "b": -5.6, "bottom": 1.2, "top": 5.6}]
	g.wall_x(Z, "wall_hospital", -12.0, -4.0, 6.0, 0.0, 9.0, 0.3, south_ops, "wall_ext")
	g.wall_x(Z, "wall_hospital", 4.0, 12.0, 6.0, 0.0, 9.0, 0.3, [{"a": 5.6, "b": 7.6, "bottom": 1.2, "top": 5.6}, {"a": 8.6, "b": 10.6, "bottom": 1.2, "top": 5.6}], "wall_ext")
	g.wall_x(Z, "wall_hospital", -4.0, 4.0, 6.0, 0.0, 3.2, 0.3, [{"a": -1.3, "b": 1.3, "top": 2.6}], "wall_hospital")
	g.wall_x(Z, "wall_hospital", -4.0, 4.0, 6.0, 3.2, 5.8, 0.3, [], "wall_ext")
	# Grandes fenêtres : vitres, meneaux, pluie
	for x in [-9.6, -6.6, 6.6, 9.6]:
		g.box(Z, "glass_dirty", Vector3(x, 3.4, 6.0), Vector3(2.0, 4.4, 0.03), {"collide": false, "shadow": false})
		g.box(Z, "metal_dark", Vector3(x, 3.4, 6.0), Vector3(0.06, 4.4, 0.1), {"collide": false})
		g.box(Z, "metal_dark", Vector3(x, 3.4, 6.0), Vector3(2.0, 0.06, 0.1), {"collide": false})
	# Vides derrière les ouvertures condamnées (le bâtiment continue)
	g.box(Z, "black", Vector3(-3.3, 4.3, -10.45), Vector3(1.6, 2.4, 0.3), {"collide": false})
	g.box(Z, "black", Vector3(6.7, 4.3, -10.45), Vector3(1.6, 2.4, 0.3), {"collide": false})
	g.box(Z, "black", Vector3(-10.85, 1.1, -10.5), Vector3(1.5, 2.3, 0.3))
	# Ascenseur hors service
	g.box(Z, "black", Vector3(-7.0, 1.15, -10.6), Vector3(2.1, 2.4, 0.4))
	for x in [-7.5, -6.5]:
		g.box(Z, "metal_steel", Vector3(x + (0.04 if x > -7.0 else -0.04), 1.15, -10.05), Vector3(0.95, 2.3, 0.05))
	g.box(Z, "metal_steel", Vector3(-7.0, 2.45, -9.9), Vector3(2.3, 0.2, 0.1), {"collide": false})
	g.box(Z, "paper", Vector3(-7.3, 1.5, -10.0), Vector3(0.3, 0.4, 0.01), {"collide": false})
	f.add_label(Z, "ASCENSEUR", Vector3(-7.0, 2.8, -9.84), 0.0, 0.45)
	f.add_examine(Z, Vector3(-7.0, 1.3, -9.7), "L'ascenseur ne répond pas. Une feuille scotchée : « HORS SERVICE ». Les portes sont légèrement disjointes : il n'y a que du noir derrière.")
	# Mezzanine (inaccessible) : dalle, garde-corps, piliers
	g.box(Z, "ceiling_concrete", Vector3(0, 3.05, -8.5), Vector3(24, 0.3, 3.0), {"nav": false})
	g.box(Z, "floor_lino", Vector3(0, 3.21, -8.5), Vector3(24, 0.02, 3.0), {"collide": false})
	Props.railing(g, Z, Vector3(-11.9, 3.2, -7.05), Vector3(11.9, 3.2, -7.05))
	for x in [-6.0, 0.0, 6.0]:
		g.cylinder(Z, "wall_concrete", Vector3(x, 0, -7.3), Vector3(x, 2.9, -7.3), 0.24, {"segments": 14, "collide": true})
	f.add_light(Z, Vector3(-2.0, 5.9, -8.6), COLD, 1.0, 6.0, LightFixture.Mode.BROKEN, {"panel": Vector3(1.2, 0.04, 0.3), "buzz": true, "fog": 0.8})
	# Accueil : comptoir, plan de travail, retours
	g.box(Z, "wood_desk", Vector3(0, 0.55, -2.2), Vector3(6.0, 1.1, 0.12))
	g.box(Z, "plastic_beige", Vector3(0, 1.13, -2.3), Vector3(6.3, 0.05, 0.45), {"collide": false})
	g.box(Z, "wood_desk", Vector3(0, 0.74, -2.75), Vector3(6.0, 0.04, 0.7), {"collide": false})
	g.solid(Z, Vector3(0, 0.38, -2.75), Vector3(6.0, 0.76, 0.7))
	for x in [-3.0, 3.0]:
		g.box(Z, "wood_desk", Vector3(x, 0.55, -2.75), Vector3(0.12, 1.1, 1.2))
	f.add_label(Z, "ACCUEIL", Vector3(0, 0.78, -2.13), 0.0, 0.6, Color(0.75, 0.72, 0.62), false, UITheme.font_title())
	Props.computer(g, Z, Vector3(0.4, 0.76, -2.75), 0.0, "screen_terminal")
	f.add_examine(Z, Vector3(0.4, 0.98, -2.95), "L'écran du poste d'accueil : « SESSION VERROUILLÉE — Dernière connexion : L. COLE, cette nuit, 01:58 ». Elle était ici. Il y a quelques heures à peine.")
	Props.office_chair(g, Z, Vector3(-0.9, 0, -3.8), PI + 0.3)
	Props.office_chair(g, Z, Vector3(1.6, 0, -3.9), PI - 0.2)
	Props.papers(g, Z, Vector3(-1.5, 0, -4.2), 1.2, 6)
	var phone := Phone.new()
	phone.position = Vector3(-1.3, 0.76, -2.85)
	phone.rotation.y = PI
	g.zone_root(Z).add_child(phone)
	f.nodes["phone"] = phone
	f.add_doc("doc_incident", Z, Vector3(1.1, 1.16, -2.3), 0.3)
	f.add_save_point(Z, Vector3(2.25, 0.76, -3.0), PI)
	# Cloison derrière l'accueil : logo et armoire à clés
	g.box(Z, "wall_hospital", Vector3(0, 1.3, -5.3), Vector3(7.2, 2.6, 0.2))
	f.add_label(Z, "BLACKWOOD", Vector3(-0.6, 1.95, -5.19), 0.0, 1.2, Color(0.25, 0.28, 0.27), false, UITheme.font_title())
	f.add_label(Z, "RESEARCH FACILITY", Vector3(-0.6, 1.62, -5.19), 0.0, 0.42, Color(0.3, 0.32, 0.31))
	g.box(Z, "metal_gray", Vector3(2.65, 1.45, -5.14), Vector3(0.6, 0.7, 0.1), {"collide": false})
	g.box(Z, "black", Vector3(2.65, 1.45, -5.09), Vector3(0.52, 0.62, 0.01), {"collide": false})
	for i in 12:
		g.box(Z, "metal_steel", Vector3(2.42 + (i % 4) * 0.15, 1.65 - int(i / 4) * 0.18, -5.07), Vector3(0.012, 0.012, 0.04), {"collide": false, "shadow": false})
	f.add_pickup("hall_admin_key", Z, "admin_key", 1, Vector3(2.57, 1.36, -5.05), 0.0,
		{"prompt": "PRENDRE LA CLÉ", "msg": "Une seule clé pend encore dans l'armoire. Étiquette : « ADMINISTRATION — AILE OUEST ». Vous obtenez : Clé de l'administration."})
	# Salle d'attente
	Props.bench_row(g, Z, Vector3(-8.0, 0, 1.2), 0.0, 5)
	Props.bench_row(g, Z, Vector3(-8.0, 0, 3.6), 0.0, 5)
	Props.table(g, Z, Vector3(-8.0, 0, -0.9), 0.0, 1.4, 0.6, 0.42, "wood_light", "metal_dark")
	Props.papers(g, Z, Vector3(-8.0, 0.43, -0.9), 0.4, 4)
	var tv := Props.tv_on_wall(g, Z, Vector3(-11.6, 2.4, 2.4), -PI / 2.0)
	f.add_light(Z, Vector3(-11.1, 2.4, 2.4), Color(0.6, 0.7, 1.0), 0.4, 3.5, LightFixture.Mode.FLICKER)
	f.add_examine(Z, Vector3(-11.3, 2.2, 2.4), "Un vieux téléviseur allumé sur de la neige. Un instant, j'ai cru voir une silhouette dans le bruit.")
	f.nodes["hall_tv"] = tv
	for p in [Vector3(-11.2, 0, 5.2), Vector3(11.2, 0, 5.2), Vector3(-11.2, 0, -4.4)]:
		Props.plant(g, Z, p)
	# Côté est : fauteuil roulant, brancard renversé, distributeur
	Props.wheelchair(g, Z, Vector3(7.4, 0, 3.4), 0.9)
	Props.gurney(g, Z, Vector3(9.0, 0, 1.1), 0.35, true)
	Props.iv_stand(g, Z, Vector3(6.4, 0, 2.0))
	Props.vending_machine(g, Z, Vector3(11.35, 0, 4.4), PI / 2.0)
	f.add_light(Z, Vector3(10.7, 1.3, 4.4), Color(0.7, 0.85, 1.0), 0.6, 3.5, LightFixture.Mode.FLICKER, {"buzz": true})
	# Trousse de secours murale
	g.box(Z, "plastic_white", Vector3(-9.3, 1.45, -9.8), Vector3(0.45, 0.45, 0.14), {"collide": false})
	g.box(Z, "car_red", Vector3(-9.3, 1.45, -9.72), Vector3(0.22, 0.06, 0.01), {"collide": false})
	g.box(Z, "car_red", Vector3(-9.3, 1.45, -9.72), Vector3(0.06, 0.22, 0.01), {"collide": false})
	g.box(Z, "plastic_white", Vector3(-9.3, 1.12, -9.78), Vector3(0.45, 0.03, 0.2), {"collide": false})
	f.add_pickup("hall_spray", Z, "spray", 1, Vector3(-9.3, 1.14, -9.75))
	# Traînée de sang depuis la cafétéria
	var trail := [Vector3(5.0, 0, -9.3), Vector3(4.6, 0, -8.2), Vector3(4.0, 0, -7.1), Vector3(3.9, 0, -6.2)]
	for i in trail.size():
		f.add_blood(Z, trail[i], 0.9 - i * 0.1, "blood_smear", Vector3.UP, 0.4 + i * 0.3)
	f.add_blood(Z, Vector3(5.2, 0, -9.6), 1.4, "blood_dry")
	# Portes
	f.add_door("admin_door", Z, Vector3(-12.0, 0, -1.0), true, 1.3,
		{"lock": Door.Lock.KEY, "key": "admin_key", "unlock_flag": "admin_unlocked", "sign": "ADMINISTRATION", "window": true,
		"locked_msg": "Cette porte est verrouillée. Une plaque indique : « ADMINISTRATION — AILE OUEST »."})
	var wing := f.add_door("wing_door", Z, Vector3(12.0, 0, -1.0), true, 2.4,
		{"lock": Door.Lock.ITEM, "double": true, "height": 2.4, "sign": "LABORATOIRES", "window": true, "mat": "metal_gray", "heavy": true,
		"locked_msg": "Verrouillage électronique. Le boîtier de la porte est éteint : pas de courant."})
	wing.unlock_msg = ""
	var caf := f.add_door("cafeteria_door", Z, Vector3(5.0, 0, -10.0), false, 2.4,
		{"lock": Door.Lock.EVENT, "double": true, "height": 2.3, "sign": "CAFÉTÉRIA", "window": true,
		"locked_msg": "La porte est bloquée de l'autre côté. Quelque chose de lourd… et quelque chose qui respire."})
	f.nodes["cafeteria_door"] = caf
	f.add_door("stairs_b_door", Z, Vector3(-10.85, 0, -10.0), false, 1.3,
		{"lock": Door.Lock.LOCKED, "sign": "ESCALIER B", "mat": "metal_gray",
		"locked_msg": "La cage d'escalier s'est effondrée. Impossible de monter."})
	# Petite pièce noire derrière la cafétéria (d'où surgit une créature)
	g.slab(Z, "floor_concrete", 3.6, -13.2, 6.4, -10.0, 0.0)
	g.ceiling(Z, "ceiling_concrete", 3.6, -13.2, 6.4, -10.0, 2.8)
	g.wall_z(Z, "wall_concrete_dark", -13.2, -10.0, 3.6, 0.0, 2.8, 0.2)
	g.wall_z(Z, "wall_concrete_dark", -13.2, -10.0, 6.4, 0.0, 2.8, 0.2)
	g.wall_x(Z, "wall_concrete_dark", 3.6, 6.4, -13.2, 0.0, 2.8, 0.2)
	Props.boxes(g, Z, Vector3(3.9, 0, -12.8), 0.0, 3)
	f.anchors["cafeteria_spawn"] = Vector3(5.0, 0.05, -11.8)
	# Boîtier électrique de l'aile des laboratoires
	var fuse := Mechanism.new()
	fuse.kind = "fuse"
	fuse.required_item = "fuse"
	fuse.target_door = wing
	fuse.done_flag = "fuse_inserted"
	fuse.idle_text = "Un boîtier électrique ouvert. Le logement du fusible principal est vide. Étiquette : « AILE LABORATOIRES — CIRCUIT A »."
	fuse.success_text = "Le fusible s'enclenche. Le courant revient dans l'aile des laboratoires…"
	fuse.done_text = "Le circuit de l'aile des laboratoires est alimenté."
	fuse.position = Vector3(11.84, 0, 1.4)
	fuse.rotation.y = -PI / 2.0
	g.zone_root(Z).add_child(fuse)
	f.nodes["fuse_box"] = fuse
	# Éclairage : suspension clignotante de l'accueil, veilleuses, sortie
	g.cylinder(Z, "rubber", Vector3(0, 6.2, -3.0), Vector3(0, 3.7, -3.0), 0.01, {"segments": 4})
	f.add_light(Z, Vector3(0, 3.55, -3.0), COLD, 1.6, 10.0, LightFixture.Mode.FLICKER,
		{"panel": Vector3(1.4, 0.05, 0.35), "shadow": true, "fog": 0.7, "buzz": true, "name": "hall_pendant"})
	f.add_light(Z, Vector3(-11.6, 4.0, -5.0), Color(1.0, 0.35, 0.12), 0.7, 9.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.1, 0.12, 0.3), "fog": 0.6})
	f.add_light(Z, Vector3(11.6, 4.0, -5.0), Color(1.0, 0.35, 0.12), 0.7, 9.0, LightFixture.Mode.STEADY, {"panel": Vector3(0.1, 0.12, 0.3), "fog": 0.6})
	_exit_sign(f, Z, Vector3(0, 2.9, 5.83), 0.0)
	# Témoin rouge au-dessus de la porte des laboratoires (vert une fois alimentée)
	var lamp := f.add_light(Z, Vector3(11.8, 2.75, -1.0), RED, 0.4, 2.5, LightFixture.Mode.PULSE, {"panel": Vector3(0.05, 0.1, 0.16), "name": "wing_status"})
	lamp.set_meta("status", true)
	f.add_trigger("admin_enter", Vector3(-13.6, 1.0, -1.0), Vector3(1.4, 2.0, 2.8))


# --- Zone 4 : couloir administratif et pièces attenantes ----------------------

static func _admin(f: Facility, g: Geo) -> void:
	var Z := "admin"
	g.slab(Z, "floor_lino", -32, -2.5, -12, 0.5, 0.0)
	g.slab(Z, "floor_tile_lab", -32, -12, -26, -2.5, 0.0)
	g.slab(Z, "floor_concrete", -15, -6, -12, -2.5, 0.0)
	g.slab(Z, "floor_lino", -32, 0.5, -24, 7, 0.0)
	g.slab(Z, "floor_carpet", -24, 0.5, -17, 7, 0.0)
	g.slab(Z, "floor_lino", -17, 0.5, -12, 7, 0.0)
	g.ceiling(Z, "ceiling_tile", -40, -12, -12, 7, 3.0)
	# Couloir : murs nord et sud
	g.wall_x(Z, "wall_hospital", -32, -26, -2.5, 0, 3.0, 0.2, [{"a": -29.65, "b": -28.35}], "wall_admin")
	g.wall_x(Z, "wall_plaster", -26, -15, -2.5, 0, 3.0, 0.2, [{"a": -21.15, "b": -19.85}], "wall_admin")
	g.wall_x(Z, "wall_concrete", -15, -12, -2.5, 0, 3.0, 0.2, [{"a": -14.15, "b": -12.85}], "wall_admin")
	g.wall_x(Z, "wall_admin", -32, -24, 0.5, 0, 3.0, 0.2, [{"a": -28.65, "b": -27.35}], "wall_hospital")
	g.wall_x(Z, "wall_admin", -24, -17, 0.5, 0, 3.0, 0.2, [{"a": -21.15, "b": -19.85}], "wall_admin")
	g.wall_x(Z, "wall_admin", -17, -12, 0.5, 0, 3.0, 0.2, [{"a": -15.15, "b": -13.85}], "wall_admin")
	# Cloisons
	g.wall_z(Z, "wall_hospital", -12, -2.5, -26, 0, 3.0, 0.2, [], "wall_plaster")
	g.wall_z(Z, "wall_plaster", -12, -2.5, -15, 0, 3.0, 0.2, [{"a": -9.32, "b": -8.68, "bottom": 0.78, "top": 1.42}], "wall_concrete")
	g.wall_x(Z, "wall_concrete", -15, -12, -6, 0, 3.0, 0.2)
	g.wall_z(Z, "wall_hospital", 0.5, 7.0, -24, 0, 3.0, 0.2, [{"a": 3.35, "b": 4.65}], "wall_admin")
	g.wall_z(Z, "wall_admin", 0.5, 7.0, -17, 0, 3.0, 0.2, [], "wall_admin")
	g.wall_z(Z, "wall_concrete", -12, -7, -32, 0, 3.0, 0.2, [], "wall_hospital")
	g.wall_z(Z, "wall_hospital_dirty", -7, -2.5, -32, 0, 3.0, 0.2, [], "wall_hospital")
	g.wall_z(Z, "wall_hospital_dirty", -2.5, 0.5, -32, 0, 3.0, 0.2, [{"a": -1.65, "b": -0.35}], "wall_admin")
	g.wall_z(Z, "wall_hospital_dirty", 0.5, 5.0, -32, 0, 3.0, 0.2, [], "wall_hospital")
	g.wall_z(Z, "wall_concrete", 5.0, 7.0, -32, 0, 3.0, 0.2, [], "wall_hospital")
	# Portes
	f.add_door("infirmary_door", Z, Vector3(-29.0, 0, -2.5), false, 1.3, {"sign": "INFIRMERIE", "window": true, "open": true})
	f.add_door("archives_door", Z, Vector3(-20.5, 0, -2.5), false, 1.3, {"sign": "ARCHIVES"})
	f.add_door("closet_door", Z, Vector3(-13.5, 0, -2.5), false, 1.3,
		{"lock": Door.Lock.LOCKED, "sign": "LOCAL TECHNIQUE", "mat": "metal_gray", "locked_msg": "Local technique. Verrouillé."})
	f.add_door("breakroom_door", Z, Vector3(-28.0, 0, 0.5), false, 1.3, {"sign": "SALLE DE REPOS", "window": true, "open": true})
	f.add_door("office_door", Z, Vector3(-20.5, 0, 0.5), false, 1.3, {"sign": "DR L. COLE — NEUROLOGIE"})
	f.add_door("hr_door", Z, Vector3(-14.5, 0, 0.5), false, 1.3,
		{"lock": Door.Lock.LOCKED, "sign": "RESSOURCES HUMAINES", "locked_msg": "Ressources humaines. Verrouillé."})
	f.add_door("office_breakroom_door", Z, Vector3(-24.0, 0, 4.0), true, 1.3, {"open": true})
	# Couloir : mobilier, inscriptions
	Props.chair(g, Z, Vector3(-16.6, 0, 0.1), PI)
	Props.chair(g, Z, Vector3(-17.2, 0, 0.1), PI)
	Props.chair(g, Z, Vector3(-25.0, 0, -2.1), 0.3, "metal_gray", "fabric_blue")
	Props.boxes(g, Z, Vector3(-31.2, 0, 0.0), 0.2, 2)
	Props.papers(g, Z, Vector3(-22.0, 0, -1.0), 2.5, 12)
	Props.papers(g, Z, Vector3(-27.0, 0, -1.2), 1.5, 6)
	g.box(Z, "plastic_white", Vector3(-18.5, 0.5, -2.2), Vector3(0.35, 1.0, 0.35))
	g.cylinder(Z, "glass_dirty", Vector3(-18.5, 1.0, -2.2), Vector3(-18.5, 1.45, -2.2), 0.14, {"segments": 10})
	var scrawl := f.add_label(Z, "NE COUREZ PAS.\nILS ENTENDENT TOUT.", Vector3(-24.9, 1.55, 0.39), PI, 0.55, Color(0.45, 0.02, 0.02), false, UITheme.font_hand())
	scrawl.font_size = 72
	f.add_blood(Z, Vector3(-24.9, 1.3, 0.395), 1.1, "blood_smear", Vector3(0, 0, -1), 1.3)
	f.add_blood(Z, Vector3(-30.0, 0.0, -1.2), 1.2, "blood_dry")
	f.add_blood(Z, Vector3(-31.3, 0.0, -0.7), 0.9, "blood")
	# Éclairage du couloir : la plupart des tubes sont morts
	f.ceiling_light(Z, Vector3(-15.0, 3.0, -1.0), LightFixture.Mode.OFF)
	f.ceiling_light(Z, Vector3(-20.5, 3.0, -1.0), LightFixture.Mode.FLICKER, 1.0, {"shadow": true, "name": "admin_light"})
	f.ceiling_light(Z, Vector3(-26.0, 3.0, -1.0), LightFixture.Mode.OFF)
	f.ceiling_light(Z, Vector3(-30.2, 3.0, -1.0), LightFixture.Mode.BROKEN, 0.9)
	f.add_light(Z, Vector3(-31.75, 2.55, -1.0), RED, 0.9, 6.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.1, 0.25), "fog": 0.8})
	# Silhouette qui traverse le fond du couloir
	f.anchors["silhouette_from"] = Vector3(-28.0, 0.0, 1.6)
	f.anchors["silhouette_to"] = Vector3(-29.0, 0.0, -3.6)

	# Infirmerie
	Props.hospital_bed(g, Z, Vector3(-30.85, 0, -10.3), -PI / 2.0, true)
	Props.hospital_bed(g, Z, Vector3(-30.85, 0, -7.2), -PI / 2.0, false)
	Props.iv_stand(g, Z, Vector3(-29.6, 0, -11.4))
	Props.medical_cabinet(g, Z, Vector3(-26.35, 0, -8.6), PI / 2.0)
	Props.instrument_tray(g, Z, Vector3(-28.0, 0, -11.3), PI)
	g.cylinder(Z, "metal_steel", Vector3(-31.9, 2.5, -8.75), Vector3(-29.4, 2.5, -8.75), 0.015, {"segments": 5})
	g.box(Z, "fabric_green", Vector3(-30.9, 1.55, -8.75), Vector3(1.8, 1.9, 0.02), {"collide": false})
	f.add_pickup("infirmary_battery", Z, "battery", 1, Vector3(-27.6, 0.99, -11.3))
	f.add_pickup("infirmary_spray", Z, "spray", 1, Vector3(-26.4, 0.97, -8.6), PI / 2.0)
	f.add_doc("doc_medical", Z, Vector3(-30.5, 0.69, -7.2), 0.4, "folder")
	f.ceiling_light(Z, Vector3(-29.0, 3.0, -7.2), LightFixture.Mode.FLICKER, 0.75)
	f.add_blood(Z, Vector3(-30.9, 0.0, -9.2), 1.0, "blood_dry")

	# Salle de repos
	Props.table(g, Z, Vector3(-28.3, 0, 3.8), 0.0, 1.6, 0.9)
	Props.chair(g, Z, Vector3(-29.0, 0, 3.1), 0.1)
	Props.chair(g, Z, Vector3(-27.5, 0, 3.1), -0.2)
	Props.chair(g, Z, Vector3(-28.9, 0, 4.6), PI + 0.2)
	g.box(Z, "plastic_orange", Vector3(-27.2, 0.23, 5.0), Vector3(0.44, 0.04, 0.42), {"basis": Basis(Vector3.BACK, 1.4), "collide": false})
	Props.sofa(g, Z, Vector3(-31.35, 0, 3.8), -PI / 2.0)
	Props.fridge(g, Z, Vector3(-24.55, 0, 6.35), PI / 2.0)
	Props.sink(g, Z, Vector3(-26.6, 0, 6.65), 0.0)
	g.box(Z, "wood_light", Vector3(-27.8, 0.45, 6.65), Vector3(2.4, 0.9, 0.6))
	Props.vending_machine(g, Z, Vector3(-24.55, 0, 1.45), PI / 2.0)
	f.add_light(Z, Vector3(-25.1, 1.3, 1.45), Color(0.7, 0.85, 1.0), 0.5, 3.5, LightFixture.Mode.FLICKER, {"buzz": true})
	f.add_pickup("breakroom_spray", Z, "spray", 1, Vector3(-28.0, 0.77, 3.65), 0.8)
	Props.papers(g, Z, Vector3(-28.3, 0.76, 3.9), 0.4, 3)
	for x in [-29.5, -26.0]:
		g.box(Z, "glass_dirty", Vector3(x, 1.65, 7.0), Vector3(2.0, 1.3, 0.03), {"collide": false, "shadow": false})

	# Bureau du Dr. Lena Cole
	Props.desk(g, Z, Vector3(-20.5, 0, 4.7), PI, "wood_desk", 1.6, 0.8)
	Props.office_chair(g, Z, Vector3(-20.5, 0, 5.55), 0.0)
	Props.computer(g, Z, Vector3(-20.0, 0.76, 4.55), PI, "screen_amber")
	Props.bookcase(g, Z, Vector3(-23.7, 0, 2.3), PI / 2.0, 1.2)
	Props.bookcase(g, Z, Vector3(-23.7, 0, 5.7), PI / 2.0, 1.2)
	Props.filing_cabinet(g, Z, Vector3(-17.5, 0, 6.45), PI, 1.32, "metal_gray", 1)
	Props.plant(g, Z, Vector3(-17.6, 0, 1.2))
	g.box(Z, "glass_dirty", Vector3(-20.5, 1.65, 7.0), Vector3(4.0, 1.3, 0.03), {"collide": false, "shadow": false})
	# Lampe de bureau
	g.cylinder(Z, "metal_dark", Vector3(-21.3, 0.76, 4.45), Vector3(-21.3, 0.8, 4.45), 0.08, {"segments": 10})
	g.cylinder(Z, "metal_dark", Vector3(-21.3, 0.8, 4.45), Vector3(-21.2, 1.15, 4.5), 0.012, {"segments": 5})
	g.cylinder(Z, "metal_green", Vector3(-21.2, 1.2, 4.5), Vector3(-21.15, 1.08, 4.55), 0.03, {"radius_b": 0.1, "segments": 10})
	f.add_light(Z, Vector3(-21.15, 1.05, 4.55), WARM, 0.9, 5.0, LightFixture.Mode.STEADY, {"shadow": true, "fog": 0.4})
	f.add_doc("doc_journal_lena", Z, Vector3(-20.9, 0.77, 4.85), 0.2, "folder")
	# Photo encadrée
	g.box(Z, "wood_desk", Vector3(-19.75, 0.87, 4.95), Vector3(0.2, 0.22, 0.02), {"basis": Basis(Vector3.RIGHT, 0.25) * Basis(Vector3.UP, PI - 0.4), "collide": false})
	f.add_examine(Z, Vector3(-19.75, 0.9, 4.95), "Une photo encadrée : Lena et moi sur le port, il y a trois ans. Elle souriait encore. Au dos : « Pour quand je rentrerai. »",
		{"flag": "saw_photo"})
	# Cadre qui tombera (événement)
	var frame_node := Node3D.new()
	frame_node.position = Vector3(-17.13, 1.85, 3.2)
	g.zone_root(Z).add_child(frame_node)
	ItemModels._box(frame_node, Vector3(0.04, 0.5, 0.7), Vector3.ZERO, "wood_desk")
	ItemModels._box(frame_node, Vector3(0.01, 0.42, 0.6), Vector3(-0.025, 0, 0), "glass_dirty")
	f.nodes["office_frame"] = frame_node
	f.add_trigger("office_enter", Vector3(-20.5, 1.0, 1.7), Vector3(2.0, 2.0, 1.4))


# --- Zone 5 : salle d'archives -------------------------------------------------

static func _archives(f: Facility, g: Geo) -> void:
	var Z := "archives"
	g.slab(Z, "floor_lino", -26, -12, -15, -2.5, 0.0)
	# Rayonnages
	for row_z in [-6.7, -9.4]:
		for i in 5:
			Props.shelf(g, Z, Vector3(-24.2 + i * 1.2, 0, row_z), 0.0, 1.2, 2.1, 0.45, 0.85)
	# Bureau de l'archiviste, lampe et lampe torche
	Props.desk(g, Z, Vector3(-15.8, 0, -4.4), PI / 2.0, "wood_desk", 1.5, 0.7)
	Props.office_chair(g, Z, Vector3(-16.75, 0, -4.4), -PI / 2.0 + 0.3)
	Props.papers(g, Z, Vector3(-15.8, 0.765, -4.2), 0.35, 5)
	g.cylinder(Z, "metal_dark", Vector3(-15.65, 0.76, -5.0), Vector3(-15.65, 0.8, -5.0), 0.08, {"segments": 10})
	g.cylinder(Z, "metal_dark", Vector3(-15.65, 0.8, -5.0), Vector3(-15.75, 1.15, -4.95), 0.012, {"segments": 5})
	g.cylinder(Z, "metal_green", Vector3(-15.75, 1.2, -4.95), Vector3(-15.85, 1.08, -4.9), 0.03, {"radius_b": 0.1, "segments": 10})
	f.add_light(Z, Vector3(-15.9, 1.05, -4.85), WARM, 1.2, 6.5, LightFixture.Mode.STEADY, {"shadow": true, "fog": 0.5, "name": "archives_lamp"})
	f.add_pickup("archives_flashlight", Z, "flashlight", 1, Vector3(-15.9, 0.78, -4.0), 0.4)
	# Armoires aux symboles (énigme)
	_symbol_cabinet(f, g, Z, "moon", 3, Vector3(-25.6, 0, -4.2), -PI / 2.0,
		"Une armoire marquée d'un croissant de lune peint en blanc. Dessous, au pochoir : 3.")
	_symbol_cabinet(f, g, Z, "heart", 1, Vector3(-17.2, 0, -11.55), PI,
		"Une armoire marquée d'un cœur traversé d'un trait plat, comme un électrocardiogramme silencieux. Dessous, au pochoir : 1.")
	_symbol_cabinet(f, g, Z, "eye", 4, Vector3(-25.55, 0, -11.2), -PI / 2.0,
		"Une armoire marquée d'un œil grand ouvert. Dessous, au pochoir : 4.")
	Props.filing_cabinet(g, Z, Vector3(-19.4, 0, -11.55), PI, 1.32, "metal_gray", 2)
	Props.boxes(g, Z, Vector3(-18.6, 0, -8.0), 0.3, 3)
	Props.papers(g, Z, Vector3(-20.5, 0, -5.0), 2.2, 14)
	Props.papers(g, Z, Vector3(-23.0, 0, -8.1), 1.0, 6)
	for x in [-23.25, -17.75]:
		g.box(Z, "glass_dirty", Vector3(x, 2.3, -12.0), Vector3(1.5, 0.8, 0.03), {"collide": false, "shadow": false})
	# Coffre encastré dans le mur est
	var safe := KeypadSafe.new()
	safe.contents = [
		{"item": "fuse", "count": 1, "id": "safe_fuse"},
		{"item": "ammo_9mm", "count": 10, "id": "safe_ammo"},
		{"doc": "doc_marrow"},
	]
	safe.position = Vector3(-14.87, 1.1, -9.0)
	safe.rotation.y = -PI / 2.0
	g.zone_root(Z).add_child(safe)
	f.nodes["safe"] = safe
	# Carton qui tombera pendant l'événement
	var box := RigidBody3D.new()
	box.freeze = true
	box.collision_layer = 1
	box.collision_mask = 1
	box.mass = 4.0
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(0.45, 0.32, 0.36)
	cs.shape = shape
	box.add_child(cs)
	ItemModels._box(box, Vector3(0.45, 0.32, 0.36), Vector3.ZERO, "cardboard")
	box.position = Vector3(-19.2, 2.3, -9.4)
	g.zone_root(Z).add_child(box)
	f.nodes["falling_box"] = box
	f.add_trigger("archives_enter", Vector3(-20.5, 1.0, -4.1), Vector3(2.4, 2.0, 1.6))
	f.add_trigger("archives_exit", Vector3(-20.5, 1.0, -1.0), Vector3(3.0, 2.0, 2.6), false)


static func _symbol_cabinet(f: Facility, g: Geo, zone: String, kind: String, digit: int, pos: Vector3,
		rot: float, text: String) -> void:
	Props.filing_cabinet(g, zone, pos, rot)
	var basis := Basis(Vector3.UP, rot)
	var front := basis * Vector3(0, 0, -1)
	var sym := Symbols.decal_quad(kind, 0.34)
	g.zone_root(zone).add_child(sym)
	sym.global_transform = Transform3D(basis * Basis(Vector3.UP, PI), pos + Vector3(0, 1.0, 0) + front * 0.335)
	var lbl := f.add_label(zone, str(digit), pos + Vector3(0, 0.52, 0) + front * 0.336, rot + PI, 1.3, Color(0.88, 0.86, 0.8), false, UITheme.font_ui_bold())
	lbl.font_size = 96
	f.add_examine(zone, pos + Vector3(0, 1.0, 0) + front * 0.5, text, {"flag": "symbol_" + kind})


# --- Zone 6 : salle de sécurité -------------------------------------------------

static func _security(f: Facility, g: Geo) -> void:
	var Z := "security"
	g.slab(Z, "floor_lino", -40, -7, -32, 5, 0.0)
	g.wall_x(Z, "wall_concrete", -40, -32, -7.0, 0, 3.0, 0.2, [], "wall_hospital_dirty")
	g.wall_x(Z, "wall_hospital_dirty", -40, -32, 5.0, 0, 3.0, 0.2, [], "wall_concrete")
	var door := f.add_door("security_door", Z, Vector3(-32.0, 0, -1.0), true, 1.3,
		{"lock": Door.Lock.EVENT, "sign": "SÉCURITÉ", "mat": "metal_gray", "heavy": true,
		"locked_msg": "La porte ne bouge pas. Quelque chose la bloque de l'intérieur… et j'entends respirer."})
	f.nodes["security_door"] = door
	# Mur d'écrans et console
	Props.desk(g, Z, Vector3(-39.2, 0, -1.0), -PI / 2.0, "metal_gray", 3.4, 0.8)
	Props.office_chair(g, Z, Vector3(-38.2, 0, -0.6), PI / 2.0 - 0.4)
	var screens := []
	for row in 2:
		for col in 3:
			var p := Vector3(-39.78, 1.35 + row * 0.52, -2.1 + col * 1.1)
			g.box(Z, "plastic_dark", p, Vector3(0.14, 0.46, 0.62), {"collide": false})
			var mi := MeshInstance3D.new()
			var q := QuadMesh.new()
			q.size = Vector2(0.54, 0.38)
			mi.mesh = q
			mi.material_override = Mats.get_mat("screen_snow" if (row + col) % 2 == 0 else "screen_terminal")
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			g.zone_root(Z).add_child(mi)
			mi.global_transform = Transform3D(Basis(Vector3.UP, PI / 2.0), p + Vector3(0.071, 0, 0))
			screens.append(mi)
	f.nodes["cctv_screens"] = screens
	f.add_light(Z, Vector3(-39.0, 1.6, -1.0), Color(0.55, 0.75, 0.9), 0.6, 4.0, LightFixture.Mode.FLICKER)
	f.add_examine(Z, Vector3(-39.5, 1.6, -1.0), "Les moniteurs de surveillance. La plupart n'affichent que de la neige. Sur l'un d'eux, le sous-sol : une grande silhouette immobile, près d'une machine.",
		{"flag": "saw_cctv"})
	f.add_doc("doc_memo", Z, Vector3(-39.25, 0.77, 0.25), 0.2)
	f.add_doc("doc_archivist", Z, Vector3(-39.2, 0.77, -2.3), -0.3)
	f.add_examine(Z, Vector3(-39.2, 0.85, -2.0), "Un post-it collé sur la console : « Trouvé aux archives, contraire au règlement. Confisqué. — R. Duval »")
	# Armoire à armes (ouverte) avec le pistolet
	Props.lockers(g, Z, Vector3(-35.0, 0, -6.55), PI, 3, "metal_blue", 1)
	f.add_pickup("security_pistol", Z, "pistol", 1, Vector3(-35.0, 1.12, -6.55), PI / 2.0,
		{"msg": "Un pistolet 9mm de service, chargeur plein. Vous obtenez : Pistolet 9mm. (Clic droit : viser — Clic gauche : tirer — R : recharger)"})
	Props.table(g, Z, Vector3(-33.4, 0, -5.4), PI / 2.0, 1.2, 0.6)
	f.add_pickup("security_ammo", Z, "ammo_9mm", 12, Vector3(-33.4, 0.77, -5.2), 0.3)
	# Point de sauvegarde et soins
	Props.table(g, Z, Vector3(-34.6, 0, 4.35), 0.0, 1.0, 0.6)
	f.add_save_point(Z, Vector3(-34.6, 0.76, 4.3), PI)
	Props.medical_cabinet(g, Z, Vector3(-37.0, 0, 4.55), PI)
	f.add_pickup("security_spray", Z, "spray", 1, Vector3(-37.0, 0.97, 4.55), 0.0)
	# Barricade renversée, traces de lutte
	Props.office_chair(g, Z, Vector3(-33.0, 0, 0.8), 0.7, true)
	Props.boxes(g, Z, Vector3(-33.2, 0, 2.6), 0.0, 3)
	Props.papers(g, Z, Vector3(-35.0, 0, -1.0), 2.0, 12)
	f.add_blood(Z, Vector3(-33.0, 0.0, -1.0), 1.6, "blood")
	f.add_blood(Z, Vector3(-34.2, 0.0, -2.1), 1.1, "blood_dry")
	f.add_blood(Z, Vector3(-32.12, 1.1, -1.9), 0.9, "blood_smear", Vector3(-1, 0, 0), 0.5)
	f.ceiling_light(Z, Vector3(-36.0, 3.0, -1.0), LightFixture.Mode.STEADY, 0.8, {"name": "security_light"})
	f.ceiling_light(Z, Vector3(-36.0, 3.0, 3.0), LightFixture.Mode.FLICKER, 0.6)
	f.anchors["security_spawn"] = Vector3(-33.4, 0.05, -1.0)


# --- Aile des laboratoires --------------------------------------------------

static func _lab_wing(f: Facility, g: Geo) -> void:
	var Z := "lab_wing"
	g.slab(Z, "floor_tile_lab", 12, -2.5, 32, 0.5, 0.0)
	g.slab(Z, "floor_tile_lab", 16, 0.5, 23, 7, 0.0)
	g.slab(Z, "floor_concrete", 23, 0.5, 32, 7, 0.0)
	g.ceiling(Z, "ceiling_tile", 12, -2.5, 32, 7, 3.0)
	g.wall_x(Z, "wall_concrete", 12, 14, -2.5, 0, 3.0, 0.2, [], "wall_hospital")
	g.wall_x(Z, "wall_tile_white", 14, 32, -2.5, 0, 3.6, 0.2, [{"a": 21.8, "b": 24.2, "top": 2.4}], "wall_hospital")
	g.wall_x(Z, "wall_hospital", 12, 16, 0.5, 0, 3.0, 0.2, [{"a": 13.35, "b": 14.65}], "wall_tile_white")
	g.wall_x(Z, "wall_hospital", 16, 23, 0.5, 0, 3.0, 0.2, [{"a": 18.85, "b": 20.15}], "wall_tile_white")
	g.wall_x(Z, "wall_hospital", 23, 32, 0.5, 0, 3.0, 0.2, [{"a": 26.85, "b": 28.15}], "wall_tile_white")
	g.wall_z(Z, "wall_tile_white", 0.5, 7.0, 16.0, 0, 3.0, 0.2)
	g.wall_z(Z, "wall_tile_white", 0.5, 7.0, 23.0, 0, 3.0, 0.2, [], "wall_hospital")
	f.add_door("toilets_door", Z, Vector3(14.0, 0, 0.5), false, 1.3,
		{"lock": Door.Lock.LOCKED, "sign": "WC", "locked_msg": "« HORS SERVICE ». La porte est condamnée."})
	var exam := f.add_door("exam_door", Z, Vector3(19.5, 0, 0.5), false, 1.3, {"sign": "SALLE D'EXAMEN", "window": true})
	f.nodes["exam_door"] = exam
	f.add_door("storage_door", Z, Vector3(27.5, 0, 0.5), false, 1.3, {"sign": "RÉSERVE"})
	f.add_door("lab_main_door", Z, Vector3(23.0, 0, -2.5), false, 2.4,
		{"double": true, "height": 2.4, "sign": "LABORATOIRE", "window": true, "mat": "metal_gray", "heavy": true})
	f.add_door("emergency_exit", Z, Vector3(32.0, 0, -1.0), true, 1.3,
		{"lock": Door.Lock.LOCKED, "sign": "ISSUE DE SECOURS", "mat": "metal_gray",
		"locked_msg": "L'issue de secours est enchaînée de l'extérieur. Quelqu'un voulait que personne ne sorte."})
	_exit_sign(f, Z, Vector3(31.83, 2.75, -1.0), -PI / 2.0)
	# Couloir
	Props.gurney(g, Z, Vector3(17.0, 0, -0.2), PI / 2.0 + 0.1)
	Props.wheelchair(g, Z, Vector3(29.6, 0, -1.9), 2.2)
	Props.papers(g, Z, Vector3(25.0, 0, -1.0), 2.0, 8)
	f.add_blood(Z, Vector3(21.0, 0.0, -1.3), 1.2, "blood_smear", Vector3.UP, 0.2)
	f.add_blood(Z, Vector3(19.4, 1.4, 0.39), 0.8, "blood_smear", Vector3(0, 0, -1), 2.0)
	f.ceiling_light(Z, Vector3(15.5, 3.0, -1.0), LightFixture.Mode.FLICKER, 0.9, {"power": false})
	f.ceiling_light(Z, Vector3(21.0, 3.0, -1.0), LightFixture.Mode.STEADY, 0.8, {"power": false})
	f.ceiling_light(Z, Vector3(26.0, 3.0, -1.0), LightFixture.Mode.OFF)
	f.ceiling_light(Z, Vector3(30.5, 3.0, -1.0), LightFixture.Mode.FLICKER, 0.8, {"power": false, "shadow": true})
	f.add_light(Z, Vector3(31.75, 2.4, -1.9), RED, 0.8, 6.0, LightFixture.Mode.PULSE, {"panel": Vector3(0.08, 0.1, 0.25), "fog": 0.8})
	# Salle d'examen : la créature « endormie » sur la table
	Props.operating_table(g, Z, Vector3(19.5, 0, 4.4), PI / 2.0)
	Props.medical_cabinet(g, Z, Vector3(16.35, 0, 3.0), -PI / 2.0)
	Props.sink(g, Z, Vector3(22.65, 0, 2.2), PI / 2.0)
	Props.instrument_tray(g, Z, Vector3(20.6, 0, 5.9), 0.0)
	Props.iv_stand(g, Z, Vector3(18.2, 0, 5.8))
	g.box(Z, "glass_dirty", Vector3(19.5, 1.65, 7.0), Vector3(2.0, 1.3, 0.03), {"collide": false, "shadow": false})
	f.add_blood(Z, Vector3(19.5, 0.0, 3.2), 1.3, "blood_dry")
	f.add_pickup("exam_ammo", Z, "ammo_9mm", 8, Vector3(22.6, 0.93, 1.6), 0.4)
	f.ceiling_light(Z, Vector3(19.5, 3.0, 3.6), LightFixture.Mode.FLICKER, 0.8, {"power": false, "shadow": true})
	f.anchors["exam_table"] = Vector3(19.5, 0.95, 4.4)
	f.add_trigger("wing_enter", Vector3(14.2, 1.0, -1.0), Vector3(2.0, 2.0, 2.8))
	f.add_trigger("wing_mid", Vector3(17.6, 1.0, -1.0), Vector3(1.4, 2.0, 2.8))
	# Réserve
	Props.shelf(g, Z, Vector3(31.2, 0, 3.6), PI / 2.0, 1.8, 2.1, 0.5, 0.9)
	Props.shelf(g, Z, Vector3(26.0, 0, 6.5), PI, 1.8, 2.1, 0.5, 0.8)
	Props.shelf(g, Z, Vector3(28.2, 0, 6.5), PI, 1.8, 2.1, 0.5, 0.8)
	Props.boxes(g, Z, Vector3(24.0, 0, 5.8), 0.0, 4)
	Props.crate(g, Z, Vector3(29.4, 0, 1.6), 0.3)
	g.box(Z, "glass_dirty", Vector3(27.0, 1.65, 7.0), Vector3(2.0, 1.3, 0.03), {"collide": false, "shadow": false})
	f.add_pickup("storage_spray", Z, "spray", 1, Vector3(29.4, 0.72, 1.6), 0.2)
	f.add_pickup("storage_battery", Z, "battery", 1, Vector3(26.1, 0.96, 6.3))
	f.ceiling_light(Z, Vector3(27.5, 3.0, 3.8), LightFixture.Mode.BROKEN, 0.8, {"power": false})


# --- Zone 7 : laboratoire --------------------------------------------------------

static func _lab(f: Facility, g: Geo) -> void:
	var Z := "lab"
	g.slab(Z, "floor_tile_lab", 14, -22, 32, -2.5, 0.0)
	g.ceiling(Z, "ceiling_concrete", 14, -22, 32, -2.5, 3.6)
	g.wall_z(Z, "wall_concrete", -22, -2.5, 14.0, 0, 3.6, 0.2, [], "wall_tile_white")
	g.wall_x(Z, "wall_concrete", 25.3, 28.7, -22.0, 0.0, 3.6, 0.3, [{"a": 26.35, "b": 27.65, "top": 2.2}], "wall_tile_white")
	# Bureau vitré (nord-ouest)
	g.wall_z(Z, "wall_tile_white", -22, -16, 20.0, 0, 3.6, 0.15, [{"a": -21.5, "b": -16.5, "bottom": 1.0, "top": 2.6}])
	g.wall_x(Z, "wall_tile_white", 14, 20, -16.0, 0, 3.6, 0.15, [{"a": 16.35, "b": 17.65}, {"a": 17.9, "b": 19.7, "bottom": 1.0, "top": 2.6}, {"a": 14.3, "b": 16.1, "bottom": 1.0, "top": 2.6}])
	g.box(Z, "glass", Vector3(20.0, 1.8, -19.0), Vector3(0.03, 1.6, 5.0), {"shadow": false})
	g.box(Z, "glass", Vector3(18.8, 1.8, -16.0), Vector3(1.8, 1.6, 0.03), {"shadow": false})
	g.box(Z, "glass", Vector3(15.2, 1.8, -16.0), Vector3(1.8, 1.6, 0.03), {"shadow": false})
	f.add_door("lab_office_door", Z, Vector3(17.0, 0, -16.0), false, 1.3, {"window": true, "sign": "DIRECTION DU PROTOCOLE"})
	Props.desk(g, Z, Vector3(14.9, 0, -19.0), -PI / 2.0, "metal_gray", 1.6, 0.7)
	Props.computer(g, Z, Vector3(14.75, 0.76, -18.6), -PI / 2.0, "screen_terminal")
	Props.office_chair(g, Z, Vector3(15.75, 0, -19.1), PI / 2.0)
	Props.filing_cabinet(g, Z, Vector3(19.4, 0, -21.5), PI)
	Props.shelf(g, Z, Vector3(17.0, 0, -21.7), 0.0, 1.8, 2.1, 0.4, 0.9)
	f.add_light(Z, Vector3(15.3, 1.1, -18.6), Color(0.3, 1.0, 0.5), 0.35, 3.0)
	f.add_doc("doc_last_entry", Z, Vector3(15.0, 0.77, -19.4), -0.3, "folder")
	f.add_pickup("lab_keycard", Z, "keycard_b", 1, Vector3(15.1, 0.77, -18.4), 0.5,
		{"msg": "Une carte magnétique au nom du Dr. A. Marrow. Vous obtenez : Carte d'accès — Niveau B."})
	# Paillasses
	for row_z in [-13.4, -8.6]:
		g.box(Z, "metal_gray", Vector3(20.5, 0.44, row_z), Vector3(7.0, 0.88, 0.85))
		g.box(Z, "plastic_white", Vector3(20.5, 0.9, row_z), Vector3(7.2, 0.05, 0.95), {"collide": false})
		var rng := RandomNumberGenerator.new()
		rng.seed = int(row_z * 100)
		for i in 9:
			var x := 17.4 + i * 0.75 + rng.randf_range(-0.1, 0.1)
			var kind := rng.randi() % 4
			match kind:
				0:
					g.cylinder(Z, "glass_dirty", Vector3(x, 0.93, row_z + rng.randf_range(-0.2, 0.2)), Vector3(x, 1.1 + rng.randf() * 0.15, row_z), 0.04, {"segments": 8})
				1:
					g.box(Z, "plastic_dark", Vector3(x, 1.05, row_z), Vector3(0.18, 0.28, 0.25), {"collide": false})
					g.cylinder(Z, "metal_dark", Vector3(x, 1.18, row_z - 0.05), Vector3(x, 1.3, row_z - 0.08), 0.02, {"segments": 6})
				2:
					g.cylinder(Z, "plastic_white", Vector3(x, 0.93, row_z), Vector3(x, 1.12, row_z), 0.16, {"segments": 12})
				3:
					g.box(Z, "paper", Vector3(x, 0.93, row_z), Vector3(0.21, 0.01, 0.29), {"rot": rng.randf() * TAU, "collide": false})
	Props.computer(g, Z, Vector3(23.4, 0.93, -8.6), PI, "screen_ecg")
	f.add_pickup("lab_ammo", Z, "ammo_9mm", 8, Vector3(22.7, 0.95, -13.3), 0.7)
	f.add_examine(Z, Vector3(18.5, 1.0, -13.0), "Des boîtes de pétri, des seringues vides étiquetées « L-9 », des notes illisibles. Tout a été abandonné en pleine manipulation.")
	# Cuves à spécimens (mur est)
	for i in 4:
		var z: float = -19.0 + i * 3.5
		_tank(f, g, Z, Vector3(30.7, 0, z), i == 2)
	f.add_light(Z, Vector3(29.9, 2.2, -17.2), Color(0.25, 1.0, 0.55), 1.0, 6.0, LightFixture.Mode.PULSE, {"fog": 0.9})
	f.add_light(Z, Vector3(29.9, 2.2, -10.2), Color(0.25, 1.0, 0.55), 1.0, 6.0, LightFixture.Mode.PULSE, {"fog": 0.9})
	f.add_examine(Z, Vector3(29.8, 1.4, -12.0), "La cuve est brisée de l'intérieur. Le liquide s'est répandu au sol… et ce qu'elle contenait a disparu.")
	f.add_examine(Z, Vector3(29.8, 1.4, -15.5), "Dans le liquide trouble, une forme humaine flotte, reliée à des tubes. Sa poitrine se soulève. Lentement.")
	# Zone chirurgicale
	Props.operating_table(g, Z, Vector3(27.4, 0, -19.4), PI / 2.0)
	Props.instrument_tray(g, Z, Vector3(26.0, 0, -18.1), PI)
	Props.iv_stand(g, Z, Vector3(28.9, 0, -18.1))
	for s in [-0.6, 0.6]:
		g.box(Z, "rubber", Vector3(27.4 + s, 0.93, -19.4), Vector3(0.06, 0.02, 0.66), {"collide": false})
	f.add_blood(Z, Vector3(27.4, 0.0, -19.4), 2.0, "blood")
	f.add_blood(Z, Vector3(27.0, 0.915, -19.4), 0.8, "blood")
	f.add_blood(Z, Vector3(25.6, 0.0, -17.0), 1.2, "blood_smear", Vector3.UP, 0.8)
	g.cylinder(Z, "metal_dark", Vector3(27.4, 3.6, -19.4), Vector3(27.4, 2.8, -19.4), 0.03, {"segments": 6})
	g.cylinder(Z, "metal_steel", Vector3(27.4, 2.8, -19.4), Vector3(27.4, 2.65, -19.4), 0.35, {"radius_b": 0.25, "segments": 14})
	f.add_light(Z, Vector3(27.4, 2.6, -19.4), Color(1.0, 0.97, 0.9), 3.0, 5.5, LightFixture.Mode.FLICKER,
		{"spot_dir": Vector3(0, -1, 0), "spot_angle": 38.0, "shadow": true, "fog": 1.2, "panel": Vector3(0.4, 0.02, 0.4), "power": false})
	# Armoires, divers
	Props.medical_cabinet(g, Z, Vector3(16.2, 0, -2.85), 0.0)
	Props.medical_cabinet(g, Z, Vector3(29.6, 0, -2.85), 0.0)
	f.add_pickup("lab_spray", Z, "spray", 1, Vector3(29.6, 0.97, -2.9), 0.0)
	Props.boxes(g, Z, Vector3(14.7, 0, -12.0), PI / 2.0, 3)
	Props.papers(g, Z, Vector3(22.0, 0, -11.0), 3.0, 14)
	# Porte du niveau B et lecteur de carte
	var bdoor := f.add_door("basement_door", Z, Vector3(27.0, 0, -22.0), false, 1.3,
		{"lock": Door.Lock.ITEM, "sign": "NIVEAU B — ACCÈS RESTREINT", "mat": "metal_gray", "heavy": true,
		"locked_msg": "Porte blindée. Un lecteur de carte magnétique contrôle l'accès au niveau B."})
	var reader := Mechanism.new()
	reader.kind = "card"
	reader.required_item = "keycard_b"
	reader.target_door = bdoor
	reader.done_flag = "basement_unlocked"
	reader.idle_text = "Lecteur de carte : « ACCÈS NIVEAU B — CARTE REQUISE »."
	reader.success_text = "« ACCÈS AUTORISÉ — DR A. MARROW ». La porte du niveau B se déverrouille."
	reader.done_text = "« ACCÈS AUTORISÉ »."
	reader.position = Vector3(28.25, 0, -21.84)
	g.zone_root(Z).add_child(reader)
	# Éclairage (alimenté avec le fusible)
	for p in [Vector3(18.0, 3.6, -5.5), Vector3(24.0, 3.6, -5.5), Vector3(18.0, 3.6, -11.0), Vector3(24.0, 3.6, -11.0), Vector3(21.0, 3.6, -17.0)]:
		var mode := LightFixture.Mode.STEADY if int(p.x + p.z) % 3 == 0 else LightFixture.Mode.FLICKER
		f.ceiling_light(Z, p, mode, 0.9, {"power": false, "range": 8.0})
	f.add_trigger("lab_enter", Vector3(23.0, 1.0, -4.2), Vector3(3.2, 2.0, 1.6))
	f.anchors["lab_ambush"] = Vector3(21.5, 0.05, -10.9)


static func _tank(f: Facility, g: Geo, zone: String, pos: Vector3, broken: bool) -> void:
	g.cylinder(zone, "metal_dark", pos, pos + Vector3(0, 0.35, 0), 0.75, {"segments": 16, "collide": true})
	g.cylinder(zone, "metal_dark", pos + Vector3(0, 2.6, 0), pos + Vector3(0, 2.9, 0), 0.75, {"segments": 16})
	g.cylinder(zone, "metal_rust", pos + Vector3(0, 2.9, 0), pos + Vector3(0, 3.6, 0), 0.08, {"segments": 8})
	g.solid(zone, pos + Vector3(0, 1.4, 0), Vector3(1.4, 2.8, 1.4))
	var root := g.zone_root(zone)
	if broken:
		g.cylinder(zone, "glass", pos + Vector3(0, 0.35, 0), pos + Vector3(0, 0.9, 0), 0.66, {"segments": 16, "caps": false, "shadow": false})
		for i in 6:
			var a := i * 1.1
			g.box(zone, "glass", pos + Vector3(cos(a) * 1.2, 0.02, sin(a) * 1.0 - 0.3), Vector3(0.25, 0.01, 0.15), {"rot": a, "collide": false, "shadow": false})
		var puddle := MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(3.0, 2.2)
		puddle.mesh = pm
		puddle.material_override = Mats.get_mat("liquid_green")
		puddle.position = pos + Vector3(-1.0, 0.012, 0)
		root.add_child(puddle)
		return
	var glass := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.66
	cm.bottom_radius = 0.66
	cm.height = 2.25
	cm.radial_segments = 20
	glass.mesh = cm
	glass.material_override = Mats.get_mat("tank_glass")
	glass.position = pos + Vector3(0, 1.47, 0)
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(glass)
	var liquid := MeshInstance3D.new()
	var lm := CylinderMesh.new()
	lm.top_radius = 0.63
	lm.bottom_radius = 0.63
	lm.height = 2.1
	lm.radial_segments = 20
	liquid.mesh = lm
	liquid.material_override = Mats.get_mat("liquid_green")
	liquid.position = pos + Vector3(0, 1.42, 0)
	liquid.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(liquid)
	# Silhouette suspendue dans le liquide
	var body := Node3D.new()
	body.position = pos + Vector3(0, 0.55, 0)
	body.rotation.y = randf() * TAU
	root.add_child(body)
	var dark := Mats.get_mat("flesh_corpse")
	ItemModels._box(body, Vector3(0.34, 0.6, 0.2), Vector3(0, 1.0, 0), "gown").material_override = dark
	var head := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.26
	head.mesh = sm
	head.material_override = dark
	head.position = Vector3(0, 1.45, 0.02)
	body.add_child(head)
	for s in [-0.1, 0.1]:
		ItemModels._box(body, Vector3(0.1, 0.75, 0.1), Vector3(s, 0.38, 0), "gown").material_override = dark
		var arm := ItemModels._box(body, Vector3(0.07, 0.6, 0.07), Vector3(s * 2.4, 1.0, 0), "gown")
		arm.material_override = dark
		arm.rotation.z = s * 1.2
	var tw := body.create_tween().set_loops()
	tw.tween_property(body, "position:y", body.position.y + 0.06, 3.0).set_trans(Tween.TRANS_SINE)
	tw.tween_property(body, "position:y", body.position.y, 3.0).set_trans(Tween.TRANS_SINE)


# --- Cage d'escalier vers le niveau B (partie haute) ---------------------------

static func _stairs(f: Facility, g: Geo) -> void:
	var Z := "lab"
	g.slab(Z, "floor_concrete", 25.5, -23.2, 28.5, -22.0, 0.0)
	g.ceiling(Z, "ceiling_concrete", 25.3, -33.2, 28.7, -22.0, 3.6)
	g.wall_z(Z, "wall_concrete", -35.0, -22.0, 25.5, -4.5, 8.1, 0.3)
	g.wall_z(Z, "wall_concrete", -35.0, -22.0, 28.5, -4.5, 8.1, 0.3)
	g.wall_x(Z, "wall_concrete", 25.3, 28.7, -33.2, -1.6, 5.2, 0.3)
	# Rampe de collision (invisible) + marches visuelles
	var top := Vector3(27.0, 0.0, -23.2)
	var bottom := Vector3(27.0, -4.5, -31.0)
	var along := bottom - top
	var length := along.length()
	var angle := atan2(-along.y, -along.z)
	var basis := Basis(Vector3.RIGHT, -angle)
	var normal := basis * Vector3.UP
	g.solid(Z, (top + bottom) * 0.5 - normal * 0.15, Vector3(3.0, 0.3, length + 0.2), basis, false)
	var steps := 26
	var rise := 4.5 / steps
	var run := 7.8 / steps
	for i in steps:
		var y_top := -(i + 1) * rise
		var zc := -23.2 - (i + 0.5) * run
		g.box(Z, "wall_concrete", Vector3(27.0, y_top - 0.15, zc), Vector3(2.7, 0.3, run + 0.01), {"collide": false})
		g.box(Z, "metal_yellow", Vector3(27.0, y_top + 0.004, zc + run * 0.5 - 0.03), Vector3(2.6, 0.01, 0.05), {"collide": false, "shadow": false})
	# Main courante
	g.cylinder(Z, "metal_dark", Vector3(25.75, 0.95, -23.2), Vector3(25.75, -3.55, -31.0), 0.025, {"segments": 6})
	g.cylinder(Z, "metal_dark", Vector3(28.25, 0.95, -23.2), Vector3(28.25, -3.55, -31.0), 0.025, {"segments": 6})
	f.add_light(Z, Vector3(27.0, 2.2, -27.0), COLD, 0.9, 8.0, LightFixture.Mode.BROKEN, {"panel": Vector3(0.9, 0.04, 0.25), "buzz": true, "fog": 0.8})

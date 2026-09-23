extends Node3D
## Visite caméra de l'hôpital : construit le niveau complet, vérifie quelques
## chemins de navigation, puis place une caméra (avec une lampe torche simulée)
## sur une série de points de vue, étage par étage, et enregistre des captures.
## Usage : --shots=<dossier> [--only=<index>]

## [nom, étage affiché, position caméra, point visé]
const VIEWS := [
	["01_street", 0, Vector3(10.0, 1.7, 30.0), Vector3(0.0, 12.0, -10.0)],
	["02_entrance", 0, Vector3(-3.0, 1.7, 9.0), Vector3(0.0, 2.0, -2.0)],
	["03_ramp", -1, Vector3(38.0, 1.6, 21.0), Vector3(38.0, -3.0, -6.0)],
	["04_bay", -1, Vector3(44.0, -2.3, -3.0), Vector3(32.0, -3.2, -9.0)],
	["05_triage", -1, Vector3(30.5, -2.3, -1.5), Vector3(21.0, -3.2, -9.0)],
	["06_boxes", -1, Vector3(18.5, -2.3, -1.5), Vector3(6.0, -3.2, -9.0)],
	["07_b1_corridor", -1, Vector3(30.0, -2.3, -14.0), Vector3(-20.0, -3.0, -14.0)],
	["08_hall", 0, Vector3(0.0, 1.7, -1.2), Vector3(0.0, 2.2, -16.0)],
	["09_security", 0, Vector3(19.0, 1.7, -1.5), Vector3(14.0, 1.0, -10.0)],
	["10_cafeteria", 0, Vector3(-13.0, 1.7, -17.0), Vector3(-22.0, 1.0, -25.0)],
	["11_mezzanine", 1, Vector3(-10.0, 5.7, -13.0), Vector3(4.0, 3.0, -4.0)],
	["12_xray", 1, Vector3(25.0, 5.7, -1.5), Vector3(30.0, 4.6, -10.0)],
	["13_generator", -2, Vector3(-19.0, -6.3, -1.5), Vector3(-29.0, -7.4, -10.0)],
	["14_parking", -2, Vector3(0.0, -6.3, 12.0), Vector3(20.0, -7.2, -8.0)],
	["15_morgue", -2, Vector3(-14.0, -6.3, -17.0), Vector3(-21.0, -7.5, -25.0)],
	["16_f3_corridor", 3, Vector3(29.0, 13.7, -14.0), Vector3(-20.0, 12.6, -14.0)],
	["17_f3_or", 3, Vector3(17.0, 13.7, -1.5), Vector3(26.0, 12.5, -8.0)],
	["18_f6_isolation", 6, Vector3(14.0, 25.7, -14.0), Vector3(-28.0, 24.6, -13.0)],
	["19_f6_lab", 6, Vector3(1.0, 25.7, -1.5), Vector3(14.0, 24.5, -10.0)],
	["20_f8_tanks", 8, Vector3(-2.0, 33.7, -1.5), Vector3(-28.0, 32.6, -10.0)],
	["21_f8_exp", 8, Vector3(13.0, 33.7, -1.5), Vector3(30.0, 32.5, -10.0)],
	["22_f11_control", 11, Vector3(-1.0, 45.7, -11.0), Vector3(2.0, 44.6, -2.0)],
	["23_f12_lab", 12, Vector3(29.0, 49.7, -14.0), Vector3(-20.0, 48.6, -6.0)],
	["24_f12_cell", 12, Vector3(-17.0, 49.7, -11.0), Vector3(-18.0, 48.6, -24.0)],
	["25_tower_far", 0, Vector3(34.0, 3.0, 62.0), Vector3(0.0, 24.0, -13.0)],
]

var facility: Facility
var cam: Camera3D
var torch: SpotLight3D
var shots_dir := ""
var only := -1
var index := 0
var wait := 0
var failures := 0


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shots="):
			shots_dir = arg.substr(8)
		elif arg.begins_with("--only="):
			only = int(arg.substr(7))
	var t0 := Time.get_ticks_msec()
	facility = Facility.new()
	add_child(facility)
	facility.build()
	print("Construction du niveau : %d ms" % (Time.get_ticks_msec() - t0))
	print("Zones : %d, portes : %d, lumières : %d, déclencheurs : %d, apparitions : %d, obstacles IA : %d" % [
		Facility.ZONES.size(), facility.doors.size(), facility.lights.size(), facility.triggers.size(),
		facility.spawns.size(), facility.geo.obstacles.size()])
	var meshes := 0
	for n in facility.find_children("*", "MeshInstance3D", true, false):
		meshes += 1
	print("MeshInstance3D : %d" % meshes)
	var floors := facility.nav_grids.keys()
	floors.sort()
	for f in floors:
		var grid: NavGrid = facility.nav_grids[f]
		var solid := 0
		for x in grid.size.x:
			for y in grid.size.y:
				if grid.astar.is_point_solid(Vector2i(x, y)):
					solid += 1
		print("Grille étage %d : %s cellules, %d bloquées" % [f, grid.size, solid])
	_check_spawns()
	_check_paths()
	cam = Camera3D.new()
	cam.fov = 70.0
	cam.far = 250.0
	add_child(cam)
	cam.make_current()
	torch = SpotLight3D.new()
	torch.spot_range = 22.0
	torch.spot_angle = 30.0
	torch.light_energy = 4.0
	torch.shadow_enabled = true
	torch.light_volumetric_fog_energy = 0.7
	cam.add_child(torch)
	torch.position = Vector3(0.3, -0.2, 0)
	if only >= 0:
		index = only
	_place()


## Chaque point d'apparition doit se trouver sur une case libre de la grille de
## son étage (sinon la créature ne peut pas se déplacer).
func _check_spawns() -> void:
	for id in facility.spawns:
		var def: Dictionary = facility.spawns[id]
		var pos: Vector3 = def.pos
		var grid := facility.nav_grid_at(pos)
		if grid == null:
			print("[ÉCHEC] apparition %s : aucune grille à %s" % [id, pos])
			failures += 1
			continue
		var c := grid.world_to_cell(pos)
		if not grid.in_bounds(c) or grid.astar.is_point_solid(c):
			# Les créatures des évents et des cellules peuvent démarrer dans un décor
			if String(def.type) in ["neonatal"]:
				continue
			print("[ALERTE] apparition %s (%s) sur une case bloquée : %s" % [id, def.type, pos])


func _check_paths() -> void:
	# [description, étage, départ, arrivée, chemin attendu]
	var tests := [
		["RDC : hall → poste de sécurité", 0, Vector3(0, 0, -6), Vector3(16, 0, -6), true],
		["RDC : hall → cafétéria", 0, Vector3(0, 0, -6), Vector3(-18, 0, -21), true],
		["RDC : couloir → pharmacie (volet à clé = bloqué)", 0, Vector3(-28, 0, -14), Vector3(-28, 0, -6), false],
		["-1 : quai → tri", -1, Vector3(40, -4, -8), Vector3(26, -4, -6), true],
		["-1 : tri → box (porte à clé = bloqué)", -1, Vector3(26, -4, -6), Vector3(12, -4, -6), false],
		["-1 : couloir → escalier A", -1, Vector3(20, -4, -14), Vector3(-9, -4, -20), true],
		["-2 : couloir → parking", -2, Vector3(-20, -8, -14), Vector3(10, -8, 4), true],
		["-2 : couloir → morgue", -2, Vector3(-20, -8, -14), Vector3(-18, -8, -21), true],
		["1er : couloir → radiologie", 1, Vector3(18, 4, -14), Vector3(18, 4, -6), true],
		["3e : couloir → salon", 3, Vector3(0, 12, -14), Vector3(3, 12, -6), true],
		["6e : couloir → cellule de crise (fusible = bloqué)", 6, Vector3(-18, 24, -14), Vector3(-18, 24, -21), false],
		["8e : couloir → salle des cuves", 8, Vector3(-16, 32, -14), Vector3(-16, 32, -6), true],
		["11e : couloir → centre de contrôle", 11, Vector3(0, 44, -14), Vector3(0, 44, -6), true],
		["12e : laboratoire → cellule (vitre = bloqué)", 12, Vector3(-18, 48, -10), Vector3(-18, 48, -21), false],
		# Grandes créatures (grille gonflée) : elles passent les portes doubles
		["3e, Chirurgien : bloc → couloir → salon", -3, Vector3(26, 12, -4.5), Vector3(3, 12, -6), true],
		["3e, Chirurgien : couloir → chambre 301 (porte simple = trop étroite)", -3, Vector3(-29.5, 12, -14), Vector3(-29.5, 12, -6), false],
		["8e, Colossus : couloir → salle des cuves", -8, Vector3(-16, 32, -14), Vector3(-16, 32, -6), true],
	]
	# Le bloc s'ouvre quand le Chirurgien sort (événement) : on simule l'ouverture
	var or_door: Door = facility.doors["f3_or_door"]
	facility.set_nav_door(or_door, false)
	for t in tests:
		var f := int(t[1])
		var grid: NavGrid = facility.nav_grids.get(f) if f >= 0 or not facility.nav_grids_big.has(-f) else facility.nav_grids_big.get(-f)
		if grid == null:
			print("[ÉCHEC] %s : pas de grille" % t[0])
			failures += 1
			continue
		var ok: bool = grid.has_point_path(t[2], t[3])
		var good: bool = ok == bool(t[4])
		if not good:
			failures += 1
		print("[%s] %s → chemin=%s" % ["OK" if good else "ÉCHEC", t[0], ok])


func _place() -> void:
	if index >= VIEWS.size() or (only >= 0 and index != only):
		print("Visite terminée. Échecs de navigation : %d" % failures)
		get_tree().quit(1 if failures > 0 else 0)
		return
	var v: Array = VIEWS[index]
	facility.set_active_floor(int(v[1]))
	cam.global_position = v[2]
	cam.look_at(v[3], Vector3.UP)
	wait = 0


func _process(_delta: float) -> void:
	wait += 1
	if wait == 12:
		if shots_dir != "" and DisplayServer.get_name() != "headless":
			var img := get_viewport().get_texture().get_image()
			img.save_png("%s/%s.png" % [shots_dir, VIEWS[index][0]])
		print("vue %s (fps %d)" % [VIEWS[index][0], Engine.get_frames_per_second()])
		index += 1
		_place()

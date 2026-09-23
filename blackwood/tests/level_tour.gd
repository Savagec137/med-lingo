extends Node3D
## Visite caméra du niveau : construit le centre, place une caméra (avec une
## lampe torche simulée) sur une série de points de vue et enregistre des
## captures. Usage : --shots=<dossier> [--only=<index>]

const VIEWS := [
	["01_parking", Vector3(4.2, 1.7, 36.0), Vector3(0, 3.0, 12.0)],
	["02_entrance", Vector3(0.0, 1.7, 11.2), Vector3(0, 1.4, 4.0)],
	["03_hall", Vector3(0.0, 1.7, 5.0), Vector3(0, 1.4, -5.0)],
	["04_hall_side", Vector3(9.0, 2.0, 4.0), Vector3(-6.0, 1.5, -4.0)],
	["05_admin", Vector3(-12.6, 1.7, -1.0), Vector3(-32.0, 1.4, -1.0)],
	["06_archives", Vector3(-20.5, 1.7, -3.3), Vector3(-19.0, 1.0, -10.0)],
	["07_security", Vector3(-33.2, 1.7, 3.8), Vector3(-39.0, 1.3, -3.0)],
	["08_office", Vector3(-20.5, 1.7, 1.2), Vector3(-20.5, 1.0, 5.5)],
	["09_labwing", Vector3(12.6, 1.7, -1.0), Vector3(31.0, 1.4, -1.0)],
	["10_lab", Vector3(23.0, 1.8, -3.6), Vector3(27.0, 1.0, -18.0)],
	["11_stairs", Vector3(27.0, 1.5, -22.6), Vector3(27.0, -3.2, -31.0)],
	["12_basement", Vector3(27.0, -2.8, -36.6), Vector3(2.0, -3.2, -36.5)],
	["13_morgue", Vector3(19.0, -2.8, -38.8), Vector3(19.0, -3.4, -46.0)],
	["14_generator", Vector3(-1.0, -2.6, -36.5), Vector3(-10.0, -3.4, -37.5)],
	["15_tunnel", Vector3(-8.0, -2.8, -47.5), Vector3(-8.0, -1.0, -70.0)],
	["16_facade_far", Vector3(-6.0, 3.0, 45.0), Vector3(0, 4.0, 5.0)],
]

var facility: Facility
var cam: Camera3D
var torch: SpotLight3D
var shots_dir := ""
var only := -1
var index := 0
var wait := 0


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
	print("Portes : %d, lumières : %d, déclencheurs : %d, obstacles IA : %d" % [
		facility.doors.size(), facility.lights.size(), facility.triggers.size(), facility.geo.obstacles.size()])
	var meshes := 0
	for n in facility.find_children("*", "MeshInstance3D", true, false):
		meshes += 1
	print("MeshInstance3D : %d" % meshes)
	for i in facility.nav_grids.size():
		var grid: NavGrid = facility.nav_grids[i]
		var solid := 0
		for x in grid.size.x:
			for y in grid.size.y:
				if grid.astar.is_point_solid(Vector2i(x, y)):
					solid += 1
		print("Grille %d : %s cellules, %d bloquées" % [i, grid.size, solid])
	_check_paths()
	cam = Camera3D.new()
	cam.fov = 70.0
	cam.far = 200.0
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


func _check_paths() -> void:
	# Chemins attendus entre les zones (grilles de navigation)
	var g0: NavGrid = facility.nav_grids[0]
	var g1: NavGrid = facility.nav_grids[1]
	var tests := [
		["hall → archives (porte admin verrouillée = bloqué)", g0, Vector3(0, 0, 2), Vector3(-20.5, 0, -6), false],
		["couloir admin → sécurité (porte évènement = bloqué)", g0, Vector3(-20, 0, -1), Vector3(-36, 0, 0), false],
		["couloir admin → archives", g0, Vector3(-20, 0, -1), Vector3(-20.5, 0, -5), true],
		["couloir admin → salle de repos", g0, Vector3(-20, 0, -1), Vector3(-28, 0, 4), true],
		["couloir labo → laboratoire", g0, Vector3(20, 0, -1), Vector3(22, 0, -11), true],
		["sous-sol : couloir → morgue", g1, Vector3(20, -4.5, -36.5), Vector3(19, -4.5, -44), true],
		["sous-sol : couloir → générateur (porte coincée = bloqué)", g1, Vector3(5, -4.5, -36.5), Vector3(-8, -4.5, -33), false],
		["générateur : tour de la machine", g1, Vector3(-13, -4.5, -38), Vector3(-3, -4.5, -38), true],
	]
	for t in tests:
		var grid: NavGrid = t[1]
		var ok: bool = grid.has_point_path(t[2], t[3])
		var status := "OK" if ok == t[4] else "ÉCHEC"
		print("[%s] %s → chemin=%s" % [status, t[0], ok])


func _place() -> void:
	if index >= VIEWS.size() or (only >= 0 and index != only):
		print("Visite terminée.")
		get_tree().quit()
		return
	var v: Array = VIEWS[index]
	cam.global_position = v[1]
	cam.look_at(v[2], Vector3.UP)
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

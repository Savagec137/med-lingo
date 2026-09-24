extends Node3D
## Studio photo des accessoires : chaque accessoire (Props) est construit seul,
## sur un sol neutre, sous un éclairage de studio, et photographié sous deux
## angles. Sert à juger les modèles et les matériaux (avant / après).
## Usage (affichage requis) :
##   xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --resolution 1280x720 \
##     res://tests/prop_studio.tscn -- --shots=<dossier> [--only=nom1,nom2]

## [nom, distance de la caméra, hauteur visée]
const PROPS := [
	["wheelchair", 2.0, 0.5],
	["office_chair", 1.8, 0.55],
	["office_chair_tipped", 1.8, 0.3],
	["chair", 1.7, 0.5],
	["gurney", 3.0, 0.6],
	["hospital_bed", 3.2, 0.6],
	["iv_stand", 2.4, 1.0],
	["ambulance", 9.0, 1.3],
	["ambulance_open", 7.0, 1.4],
	["car", 7.5, 0.8],
	["car_open", 7.0, 0.8],
	["tree", 16.0, 4.5],
	["tree_leafy", 16.0, 4.5],
	["lamp_post", 8.0, 3.5],
	["bench_row", 3.2, 0.5],
	["vending_machine", 3.0, 1.0],
	["desk", 2.6, 0.6],
	["plant", 2.2, 0.7],
	["cart", 2.2, 0.6],
	["reception_desk", 5.0, 0.7],
]

var shots_dir := ""
var only: PackedStringArray = []
var cam: Camera3D
var holder: Node3D
var index := 0
var angle := 0
var wait := 0


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shots="):
			shots_dir = arg.substr(8)
		elif arg.begins_with("--only="):
			only = arg.substr(7).split(",")
	_build_studio()
	cam = Camera3D.new()
	cam.fov = 50.0
	cam.far = 200.0
	add_child(cam)
	cam.make_current()
	_next()


func _build_studio() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.1, 0.11, 0.13)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.58, 0.65)
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.ssao_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation = Vector3(deg_to_rad(-48.0), deg_to_rad(-35.0), 0.0)
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	add_child(sun)
	var fill := OmniLight3D.new()
	fill.position = Vector3(-4.0, 3.0, 5.0)
	fill.omni_range = 30.0
	fill.light_energy = 0.8
	add_child(fill)
	var g := Geo.new(self)
	g.slab("studio", "floor_concrete", -30.0, -30.0, 30.0, 30.0, 0.0, 0.2)
	g.build()


func _wanted(name: String) -> bool:
	return only.is_empty() or name in only


func _next() -> void:
	while index < PROPS.size() and not _wanted(String(PROPS[index][0])):
		index += 1
	if index >= PROPS.size():
		print("Studio terminé.")
		get_tree().quit(0)
		return
	if holder:
		holder.queue_free()
	holder = Node3D.new()
	add_child(holder)
	var g := Geo.new(holder)
	_build_prop(g, String(PROPS[index][0]))
	g.build()
	angle = 0
	_place_camera()


func _build_prop(g: Geo, name: String) -> void:
	var z := "prop"
	match name:
		"wheelchair":
			Props.wheelchair(g, z, Vector3.ZERO, 0.0)
		"office_chair":
			Props.office_chair(g, z, Vector3.ZERO, 0.0)
		"office_chair_tipped":
			Props.office_chair(g, z, Vector3.ZERO, 0.0, true)
		"chair":
			Props.chair(g, z, Vector3.ZERO, 0.0)
		"gurney":
			Props.gurney(g, z, Vector3.ZERO, 0.0)
		"hospital_bed":
			Props.hospital_bed(g, z, Vector3.ZERO, 0.0)
		"iv_stand":
			Props.iv_stand(g, z, Vector3.ZERO)
		"ambulance":
			Props.ambulance(g, z, Vector3.ZERO, 0.0)
		"ambulance_open":
			Props.ambulance(g, z, Vector3.ZERO, PI, true, true)
		"car":
			Props.car(g, z, Vector3.ZERO, 0.0)
		"car_open":
			Props.car(g, z, Vector3.ZERO, PI, "car_red", true, true)
		"plant":
			Props.plant(g, z, Vector3.ZERO)
		"cart":
			HProps.cart(g, z, Vector3.ZERO, 0.0)
		"reception_desk":
			HProps.reception_desk(g, z, Vector3.ZERO, PI, 4.0)
		"tree":
			Props.tree(g, z, Vector3.ZERO, 9.0, "pine")
		"tree_leafy":
			Props.tree(g, z, Vector3.ZERO, 9.0, "leafy")
		"lamp_post":
			Props.lamp_post(g, z, Vector3.ZERO, 0.0, 6.0)
		"bench_row":
			Props.bench_row(g, z, Vector3.ZERO, 0.0)
		"vending_machine":
			Props.vending_machine(g, z, Vector3.ZERO, 0.0)
		"desk":
			Props.desk(g, z, Vector3.ZERO, 0.0)


func _place_camera() -> void:
	var p: Array = PROPS[index]
	var dist := float(p[1])
	var h := float(p[2])
	# Vue 3/4 avant, puis 3/4 arrière plus haute
	var yaw := deg_to_rad(35.0) if angle == 0 else deg_to_rad(215.0)
	var el := 0.35 if angle == 0 else 0.6
	var dir := Vector3(sin(yaw), 0.0, cos(yaw))
	cam.global_position = Vector3(0, h, 0) + dir * dist + Vector3.UP * dist * el
	cam.look_at(Vector3(0, h, 0), Vector3.UP)
	wait = 0


func _process(_delta: float) -> void:
	wait += 1
	if wait == 8:
		var name := String(PROPS[index][0])
		if shots_dir != "" and DisplayServer.get_name() != "headless":
			var img := get_viewport().get_texture().get_image()
			img.save_png("%s/%s_%d.png" % [shots_dir, name, angle])
		print("accessoire %s, vue %d" % [name, angle])
		angle += 1
		if angle < 2:
			_place_camera()
		else:
			index += 1
			_next()

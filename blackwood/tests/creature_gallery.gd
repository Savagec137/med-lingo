extends Node3D
## Galerie des créatures : chaque variante est animée (marche, poursuite,
## attaque) sans IA, puis photographiée. Sert à vérifier les modèles réalistes
## et le reciblage de l'animation procédurale.
## Usage (rendu) : godot --path . res://tests/creature_gallery.tscn -- --shots=DOSSIER

const VARIANTS := ["patient", "nurse", "neuro", "experimental", "guard"]

var enemies: Array[Enemy] = []
var cam: Camera3D
var shots_dir := ""
var _t := 0.0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			shots_dir = a.substr(8)
	var g := Geo.new(self)
	g.box("gallery", "floor_tile", Vector3(0, -0.1, 0), Vector3(16, 0.2, 10))
	g.box("gallery", "wall_hospital", Vector3(0, 1.6, -3.5), Vector3(16, 3.2, 0.2))
	g.box("gallery", "wall_tile_white", Vector3(-7.5, 1.6, 0), Vector3(0.2, 3.2, 10))
	g.build()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.02, 0.02, 0.025)
	e.ambient_light_color = Color(0.35, 0.37, 0.4)
	e.ambient_light_energy = 0.5
	e.tonemap_mode = Environment.TONE_MAPPER_AGX
	e.ssao_enabled = true
	env.environment = e
	add_child(env)
	for x in [-4.0, 0.0, 4.0]:
		var l := OmniLight3D.new()
		l.position = Vector3(x, 2.8, 1.5)
		l.omni_range = 7.0
		l.light_energy = 1.6
		l.shadow_enabled = true
		add_child(l)
	var key := SpotLight3D.new()
	key.position = Vector3(2, 3, 5)
	key.look_at_from_position(key.position, Vector3(0, 1, 0))
	key.spot_range = 14.0
	key.spot_angle = 45.0
	key.light_energy = 3.0
	key.shadow_enabled = true
	add_child(key)
	for i in VARIANTS.size():
		var h := Hollow.new()
		h.variant = VARIANTS[i]
		h.home_rot = 0.0
		add_child(h)
		h.global_position = Vector3(-5.2 + i * 2.6, 0.0, 0.0)
		h.set_physics_process(false)
		h.rig.rotation.y = PI  # face à la caméra
		enemies.append(h)
	cam = Camera3D.new()
	cam.fov = 50.0
	add_child(cam)
	cam.global_position = Vector3(0, 1.5, 7.5)
	cam.look_at(Vector3(0, 1.0, 0), Vector3.UP)
	cam.make_current()
	_run()


func _physics_process(delta: float) -> void:
	_t += delta
	for i in enemies.size():
		var e: Enemy = enemies[i]
		var mode := int(_t / 3.0) % 3
		if mode == 0:
			e.state = Enemy.State.PATROL
			e._speed_now = 1.0
		elif mode == 1:
			e.state = Enemy.State.CHASE
			e._speed_now = 2.4
		else:
			e.state = Enemy.State.ATTACK
			e._attack_t = fmod(_t, 1.3)
			e._speed_now = 0.0
		e._animate(delta)


func _run() -> void:
	var views := [
		["gallery_face_walk", Vector3(0, 1.5, 7.5), 1.3],
		["gallery_side_chase", Vector3(8.5, 1.4, 1.5), 4.4],
		["gallery_face_attack", Vector3(0, 1.5, 7.5), 6.5],
		["gallery_close", Vector3(-3.8, 1.6, 2.2), 7.3],
	]
	for v in views:
		while _t < float(v[2]):
			await get_tree().process_frame
		cam.global_position = v[1]
		cam.look_at(Vector3(-2.6 if v[0] == "gallery_close" else 0.0, 1.0, 0), Vector3.UP)
		for i in 3:
			await RenderingServer.frame_post_draw
		if shots_dir != "" and DisplayServer.get_name() != "headless":
			get_viewport().get_texture().get_image().save_png("%s/%s.png" % [shots_dir, v[0]])
		print("vue ", v[0])
	get_tree().quit()

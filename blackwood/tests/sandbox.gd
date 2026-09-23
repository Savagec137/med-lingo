extends Node3D
## Scène bac à sable : une pièce de test pour valider le joueur, la caméra,
## la lampe torche, les matériaux et l'éclairage. Capture des images si
## l'argument --shots=<dossier> est passé.

var player: Player
var cam_rig: PlayerCamera
var frame := 0
var shots_dir := ""


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shots="):
			shots_dir = arg.substr(8)
	var geo := Geo.new(self)
	geo.slab("t", "floor_tile", -6, -8, 6, 6, 0.0)
	geo.ceiling("t", "ceiling_tile", -6, -8, 6, 6, 3.0)
	geo.wall_x("t", "wall_hospital", -6, 6, -8, 0, 3, 0.2, [{"a": -0.65, "b": 0.65, "top": 2.2}])
	geo.wall_x("t", "wall_hospital", -6, 6, 6, 0, 3, 0.2)
	geo.wall_z("t", "wall_hospital", -8, 6, -6, 0, 3, 0.2)
	geo.wall_z("t", "wall_hospital", -8, 6, 6, 0, 3, 0.2, [{"a": -2, "b": 0, "bottom": 1.0, "top": 2.3}])
	geo.box("t", "wood_desk", Vector3(3, 0.4, -3), Vector3(1.6, 0.8, 0.8))
	geo.box("t", "metal_gray", Vector3(-4.5, 1.0, -6), Vector3(1.0, 2.0, 0.5))
	geo.cylinder("t", "metal_rust", Vector3(-6, 2.7, -7.7), Vector3(6, 2.7, -7.7), 0.08)
	geo.build()
	FX.blood_decal(self, Vector3(1, 0, -1), 1.4, "blood")

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.0, 0.0, 0.0)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.25, 0.28, 0.35)
	e.ambient_light_energy = 0.12
	e.tonemap_mode = Environment.TONE_MAPPER_AGX
	e.tonemap_exposure = 1.0
	e.volumetric_fog_enabled = true
	e.volumetric_fog_density = 0.025
	e.volumetric_fog_albedo = Color(0.8, 0.8, 0.85)
	e.volumetric_fog_anisotropy = 0.5
	e.ssao_enabled = true
	e.glow_enabled = true
	env.environment = e
	add_child(env)

	var lamp := OmniLight3D.new()
	lamp.position = Vector3(2, 2.7, 2)
	lamp.light_color = Color(0.8, 0.9, 1.0)
	lamp.light_energy = 1.2
	lamp.omni_range = 7.0
	lamp.shadow_enabled = true
	add_child(lamp)
	var red := OmniLight3D.new()
	red.position = Vector3(-5, 2.5, 4)
	red.light_color = Color(1, 0.1, 0.05)
	red.light_energy = 1.5
	red.omni_range = 5.0
	add_child(red)

	GameState.reset()
	GameState.set_flag("has_flashlight", true)
	GameState.add_item("pistol")
	GameState.add_item("ammo_9mm", 24)
	GameState.pistol_mag = 12
	player = Player.new()
	add_child(player)
	cam_rig = PlayerCamera.new()
	cam_rig.setup(player, 0.0)
	add_child(cam_rig)
	player.camera_rig = cam_rig
	player.place(Vector3(0, 0.1, 3), 0.0)
	cam_rig.make_current()
	player.flashlight.set_on(true)


func _process(_delta: float) -> void:
	frame += 1
	if frame == 30:
		Input.action_press("move_forward")
	if frame == 60:
		Input.action_release("move_forward")
		_shot("sandbox_walk")
		cam_rig.add_look(0.6, -0.1)
	if frame == 80:
		_shot("sandbox_look")
		Input.action_press("aim")
	if frame == 100:
		_shot("sandbox_aim")
		Input.action_press("fire")
	if frame == 104:
		Input.action_release("fire")
		_shot("sandbox_fire")
	if frame == 130:
		Input.action_release("aim")
		print("player pos: ", player.global_position, " mag: ", GameState.pistol_mag, " fps: ", Engine.get_frames_per_second())
		get_tree().quit()


func _shot(label: String) -> void:
	if shots_dir == "" or DisplayServer.get_name() == "headless":
		return
	var img := get_viewport().get_texture().get_image()
	if img:
		img.save_png("%s/%s.png" % [shots_dir, label])

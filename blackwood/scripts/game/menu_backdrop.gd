class_name MenuBackdrop
extends Node3D
## Décor du menu principal : la façade de Blackwood sous la pluie, de nuit,
## filmée par une caméra qui dérive lentement. Des éclairs de temps en temps.

var facility: Facility
var cam: Camera3D
var rain: CPUParticles3D
var _t := 0.0
var _lightning_t := 6.0


func _ready() -> void:
	facility = Facility.new()
	add_child(facility)
	facility.build_exterior_only()
	facility.apply_quality(Settings.quality)
	cam = Camera3D.new()
	cam.fov = 55.0
	cam.far = 250.0
	add_child(cam)
	cam.make_current()
	rain = CPUParticles3D.new()
	rain.amount = 1400
	rain.lifetime = 0.9
	rain.local_coords = false
	rain.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	rain.emission_box_extents = Vector3(12.0, 0.5, 12.0)
	rain.direction = Vector3(0.12, -1.0, 0.05)
	rain.spread = 3.0
	rain.gravity = Vector3.ZERO
	rain.initial_velocity_min = 17.0
	rain.initial_velocity_max = 21.0
	var q := QuadMesh.new()
	q.size = Vector2(0.012, 0.55)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.7, 0.75, 0.85, 0.3)
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	q.material = m
	rain.mesh = q
	add_child(rain)
	_update_cam(0.0)


func _process(delta: float) -> void:
	_t += delta
	_update_cam(delta)
	_lightning_t -= delta
	if _lightning_t <= 0.0:
		_lightning_t = randf_range(9.0, 20.0)
		_lightning()


func _update_cam(_delta: float) -> void:
	var a := _t * 0.02
	var pos := Vector3(7.0 + sin(a) * 6.0, 1.9 + sin(_t * 0.1) * 0.2, 31.0 + cos(a) * 2.0)
	cam.global_position = pos
	cam.look_at(Vector3(-1.0, 3.2, 10.0), Vector3.UP)
	rain.global_position = pos + Vector3(0, 8.0, -4.0)


func _lightning() -> void:
	var moon := facility.moon
	var base := moon.light_energy
	for i in 2:
		moon.light_energy = 4.0
		await get_tree().create_timer(0.07).timeout
		if not is_inside_tree():
			return
		moon.light_energy = base
		await get_tree().create_timer(0.12).timeout
		if not is_inside_tree():
			return
	await get_tree().create_timer(randf_range(0.8, 2.0)).timeout
	if is_inside_tree():
		Audio.play_2d("thunder", -6.0, randf_range(0.9, 1.1), "Ambience")

class_name PlayerCamera
extends Node3D
## Caméra du joueur, en troisième personne (épaule, amorti, contourne les murs
## avec un SpringArm3D, se rapproche en visée) ou en première personne (à hauteur
## des yeux, corps masqué, bras et arme au calque 11). Tremble sur les tirs et
## les chocs, et peut être « détournée » vers un point d'intérêt.

const MOUSE_SCALE := 0.0022
const PITCH_MIN := -1.15
const PITCH_MAX := 0.85

var target: Node3D
var yaw := 0.0
var pitch := -0.12
var yaw_pivot: Node3D
var pitch_pivot: Node3D
var arm: SpringArm3D
var cam: Camera3D

var follow_speed := 9.0
var height := 1.58
var shoulder := 0.38
var arm_length := 2.45
var aim_arm_length := 1.1
var aim_shoulder := 0.52
var aiming := false
var first_person := false
## Hauteur des yeux en première personne.
var eye_height := 1.62
var trauma := 0.0
var recoil := 0.0
var input_enabled := true
## Autorise la souris même non capturée (tests automatisés, fenêtre sans focus).
var accept_uncaptured := false

var _focus_target = null
var _focus_blend := 0.0
var _focus_strength := 0.0
var _noise := FastNoiseLite.new()
var _t := 0.0
var _smoothed_yaw := 0.0
var _smoothed_pitch := 0.0


func _ready() -> void:
	top_level = true
	_noise.frequency = 1.6
	_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	yaw_pivot = Node3D.new()
	add_child(yaw_pivot)
	pitch_pivot = Node3D.new()
	yaw_pivot.add_child(pitch_pivot)
	arm = SpringArm3D.new()
	arm.spring_length = arm_length
	arm.collision_mask = 1 | 16
	arm.margin = 0.12
	var probe := SphereShape3D.new()
	probe.radius = 0.18
	arm.shape = probe
	arm.position = Vector3(shoulder, 0, 0)
	pitch_pivot.add_child(arm)
	cam = Camera3D.new()
	cam.fov = Settings.fov
	cam.near = 0.05
	cam.far = 220.0
	cam.cull_mask = 0xFFFFF & ~ViewModel.LAYER
	arm.add_child(cam)
	# Lumière d'appoint qui n'éclaire que le personnage (calque de rendu 2) :
	# Thomas reste lisible dans le noir sans que le décor soit éclairé.
	var fill := OmniLight3D.new()
	fill.light_color = Color(0.72, 0.78, 1.0)
	fill.light_energy = 0.5
	fill.omni_range = 4.0
	fill.light_cull_mask = 2
	fill.shadow_enabled = false
	fill.light_volumetric_fog_energy = 0.0
	fill.light_specular = 0.25
	fill.position = Vector3(0.5, 0.7, 1.0)
	yaw_pivot.add_child(fill)
	if target:
		global_position = target.global_position + Vector3.UP * height
		if target is CollisionObject3D:
			arm.add_excluded_object((target as CollisionObject3D).get_rid())
	_smoothed_yaw = yaw
	_smoothed_pitch = pitch
	Settings.changed.connect(_on_settings)
	set_first_person(Settings.camera_view == Settings.View.FIRST_PERSON)


func _on_settings() -> void:
	var want := Settings.camera_view == Settings.View.FIRST_PERSON
	if want != first_person:
		set_first_person(want)


## Bascule première / troisième personne (le corps reste visible dans les ombres).
func set_first_person(on: bool) -> void:
	first_person = on
	if on:
		cam.cull_mask = (0xFFFFF & ~2) | ViewModel.LAYER
		cam.near = 0.02
		arm.spring_length = 0.0
		arm.position.x = 0.0
	else:
		cam.cull_mask = 0xFFFFF & ~ViewModel.LAYER
		cam.near = 0.05
	if target and target.has_method("_on_view_changed"):
		target._on_view_changed(on)


func setup(p_target: Node3D, p_yaw: float) -> void:
	target = p_target
	yaw = p_yaw
	_smoothed_yaw = yaw
	if is_inside_tree():
		global_position = target.global_position + Vector3.UP * height
		if target is CollisionObject3D:
			arm.add_excluded_object((target as CollisionObject3D).get_rid())


func make_current() -> void:
	cam.make_current()


func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled or get_tree().paused:
		return
	if event is InputEventMouseMotion:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED and not accept_uncaptured:
			return
		var sens := Settings.mouse_sensitivity * (0.7 if aiming else 1.0)
		var rel: Vector2 = event.relative
		yaw -= rel.x * MOUSE_SCALE * sens
		var inv := -1.0 if Settings.invert_y else 1.0
		pitch = clampf(pitch - rel.y * MOUSE_SCALE * sens * inv, PITCH_MIN, PITCH_MAX)


## Rotation directe (utilisée par les tests automatisés et les cinématiques).
func add_look(dyaw: float, dpitch: float) -> void:
	yaw += dyaw
	pitch = clampf(pitch + dpitch, PITCH_MIN, PITCH_MAX)


func shake(amount: float) -> void:
	trauma = clampf(trauma + amount * Settings.camera_shake, 0.0, 1.0)


func kick(amount: float) -> void:
	recoil += amount


## Oriente doucement la caméra vers un point pendant « duration » secondes.
func focus_on(point: Vector3, duration: float = 2.0, strength: float = 1.0) -> void:
	_focus_target = point
	_focus_strength = strength
	_focus_blend = 0.0
	var tw := create_tween()
	tw.tween_property(self, "_focus_blend", 1.0, 0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(maxf(duration - 1.2, 0.1))
	tw.tween_property(self, "_focus_blend", 0.0, 0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_callback(func(): _focus_target = null)


func forward() -> Vector3:
	return -cam.global_transform.basis.z


func _process(delta: float) -> void:
	if target == null:
		return
	_t += delta
	if first_person:
		# À hauteur des yeux : suit le bassin (marche, esquive, chute) sans retard horizontal
		var dip := 0.0
		if target is Player and (target as Player).rig:
			var r := (target as Player).rig
			dip = r.joint("hips").position.y - r.base_hips_height
		var eye: Vector3 = target.global_position + Vector3.UP * (eye_height + dip * 0.8)
		global_position = Vector3(eye.x, lerpf(global_position.y, eye.y, 1.0 - exp(-25.0 * delta)), eye.z)
	else:
		var goal: Vector3 = target.global_position + Vector3.UP * height
		global_position = global_position.lerp(goal, 1.0 - exp(-follow_speed * delta))

	# Point d'intérêt cinématique : la vue glisse vers la cible puis revient
	var y := yaw
	var p := pitch
	if _focus_target != null and _focus_blend > 0.0:
		var to: Vector3 = (_focus_target as Vector3) - global_position
		var want_yaw := atan2(-to.x, -to.z)
		var want_pitch := atan2(to.y, Vector2(to.x, to.z).length())
		var dy := wrapf(want_yaw - yaw, -PI, PI)
		var k := _focus_blend * _focus_strength
		y = yaw + dy * k
		p = lerpf(pitch, clampf(want_pitch, PITCH_MIN, PITCH_MAX), k)
		if k > 0.95:
			yaw = lerp_angle(yaw, want_yaw, delta * 2.0)
	# Légère inertie de rotation
	_smoothed_yaw = lerp_angle(_smoothed_yaw, y, 1.0 - exp(-28.0 * delta))
	_smoothed_pitch = lerpf(_smoothed_pitch, p, 1.0 - exp(-28.0 * delta))
	yaw_pivot.rotation.y = _smoothed_yaw
	pitch_pivot.rotation.x = _smoothed_pitch + recoil

	var k2 := 1.0 - exp(-10.0 * delta)
	if first_person:
		arm.spring_length = 0.0
		arm.position.x = 0.0
	else:
		arm.spring_length = lerpf(arm.spring_length, aim_arm_length if aiming else arm_length, k2)
		arm.position.x = lerpf(arm.position.x, aim_shoulder if aiming else shoulder, k2)
	var want_fov := Settings.fov - ((12.0 if first_person else 16.0) if aiming else 0.0)
	cam.fov = lerpf(cam.fov, want_fov, k2)

	recoil = lerpf(recoil, 0.0, 1.0 - exp(-9.0 * delta))
	trauma = maxf(trauma - delta * 0.9, 0.0)
	var t2 := trauma * trauma
	cam.rotation = Vector3(
		_noise.get_noise_2d(_t * 40.0, 1.0) * 0.06 * t2,
		_noise.get_noise_2d(_t * 40.0, 50.0) * 0.06 * t2,
		_noise.get_noise_2d(_t * 40.0, 99.0) * 0.08 * t2)
	# Respiration discrète de la caméra
	cam.position.y = sin(_t * 1.3) * (0.004 if first_person else 0.012)

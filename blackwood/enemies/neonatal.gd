class_name Neonatal
extends Hollow
## LE NÉONATAL — petit, très rapide. Il rampe dans les gaines d'aération,
## surgit derrière sa proie, mord, puis disparaît dans les murs.

var vents: Array = []
var _hidden_t := -1.0
var _flee := false
var _flee_to := Vector3.ZERO
var _screech_t := 3.0


func _init() -> void:
	super._init()
	variant = "neonatal"
	max_hp = 70.0
	walk_speed = 1.6
	chase_speed = 5.2
	turn_speed = 12.0
	attack_range = 1.15
	attack_damage = 12.0
	attack_windup = 0.3
	attack_recovery = 0.35
	vision_range = 9.0
	vision_range_lit = 12.0
	vision_fov = deg_to_rad(200.0)
	proximity = 3.0
	hearing_scale = 1.8
	lose_time = 8.0
	stagger_chance = 0.8
	body_radius = 0.25
	body_height = 0.8


func _apply_variant() -> void:
	hp = max_hp


func _rig_cfg() -> Dictionary:
	return {"height": 0.56, "bulk": 0.82, "shoulder_width": 0.9, "arm_len": 1.3, "arm_thick": 0.8,
		"leg_thick": 0.8, "hunch": 0.2, "head_scale": 1.3, "hair": false}


func skin_look() -> Dictionary:
	return {"pallor": 0.85, "blood": 0.85, "wet": 0.9, "skin_tint": Color(1.0, 0.82, 0.82), "cloth_mix": 0.0,
		"bone_scale": {"Head": Vector3(1.35, 1.35, 1.35), "neck": Vector3(1.1, 0.8, 1.1)}}


func _hitbox_scale() -> float:
	return 0.6


func _physics_process(delta: float) -> void:
	if state == State.DEAD:
		super._physics_process(delta)
		return
	if _hidden_t >= 0.0:
		_hidden_t -= delta
		if _hidden_t < 0.0:
			_reappear()
		return
	if _flee:
		_move(delta, _flee_to, chase_speed * 1.1)
		_animate(delta)
		if _flat_dist(_flee_to) < 0.9 or state_time > 6.0:
			_hide()
		state_time += delta
		return
	_screech_t -= delta
	if _screech_t <= 0.0 and state == State.CHASE:
		_screech_t = randf_range(2.5, 5.0)
		Audio.play_3d("neonatal_screech", global_position + Vector3.UP * 0.6, -2.0, 0.12, 30.0, 4.0)
	super._physics_process(delta)


func _resolve_hit() -> void:
	super._resolve_hit()
	if not vents.is_empty():
		_flee = true
		state_time = 0.0
		_flee_to = _nearest_vent()


func _nearest_vent() -> Vector3:
	var best: Vector3 = vents[0]
	for v in vents:
		if _flat_dist(v) < _flat_dist(best) and absf((v as Vector3).y - global_position.y) < 2.0:
			best = v
	return best


func _hide() -> void:
	_flee = false
	_hidden_t = randf_range(6.0, 11.0)
	visible = false
	collision_layer = 0
	for h in _hitboxes:
		h.set_deferred("monitorable", false)
	Audio.play_3d("neonatal_skitter", global_position + Vector3.UP * 0.4, -2.0, 0.1, 20.0, 3.0)


## Ressort d'une gaine derrière le joueur.
func _reappear() -> void:
	var p := player()
	var spot: Vector3 = global_position
	if p and not vents.is_empty():
		var fwd := -p.camera_rig.cam.global_transform.basis.z if p.camera_rig else Vector3.FORWARD
		var best_score := -INF
		for v in vents:
			var vv: Vector3 = v
			if absf(vv.y - p.global_position.y) > 2.5:
				continue
			var to := vv - p.global_position
			var d := to.length()
			if d > 26.0:
				continue
			var score := -fwd.dot(to.normalized()) * 3.0 - d * 0.05
			if score > best_score:
				best_score = score
				spot = vv
	place(spot, facing)
	visible = true
	collision_layer = 4
	for h in _hitboxes:
		h.set_deferred("monitorable", true)
	if p:
		last_known = p.global_position
		_contact_t = 0.0
	set_state(State.CHASE)
	Audio.play_3d("neonatal_screech", global_position + Vector3.UP * 0.6, 2.0, 0.08, 35.0, 5.0)


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 0.6
	match kind:
		"alert":
			Audio.play_3d("neonatal_screech", pos, 0.0, 0.1, 35.0, 5.0)
		"hurt":
			Audio.play_3d("neonatal_screech", pos, -2.0, 0.2, 25.0, 3.0, 1.3)
		"attack":
			Audio.play_3d("hollow_attack", pos, -2.0, 0.1, 20.0, 3.0, 1.6)
		"death":
			Audio.play_3d("neonatal_screech", pos, 2.0, 0.0, 35.0, 5.0, 0.7)


func _footstep() -> void:
	Audio.play_3d("neonatal_skitter", global_position, -12.0, 0.2, 12.0, 2.0)


## À quatre pattes : bassin haut, bras qui fauchent le sol, tête relevée.
func _animate(delta: float) -> void:
	rig.reset_pose()
	var moving := _speed_now > 0.2
	if moving:
		_phase += _speed_now * delta * TAU / 0.7
	var s := sin(_phase) if moving else 0.0
	rig.position.y = -rig.base_hips_height * 0.42
	rig.pose("spine", Vector3(-1.15, 0, s * 0.1))
	rig.pose("chest", Vector3(-0.2, 0, 0))
	rig.pose("head", Vector3(0.95, sin(_phase * 0.5) * 0.3, 0))
	rig.pose("hip_l", Vector3(1.3 + s * 0.45, 0, -0.15))
	rig.pose("hip_r", Vector3(1.3 - s * 0.45, 0, 0.15))
	rig.pose("knee_l", Vector3(-1.9, 0, 0))
	rig.pose("knee_r", Vector3(-1.9, 0, 0))
	rig.pose("shoulder_l", Vector3(0.35 - s * 0.6, 0, -0.2))
	rig.pose("shoulder_r", Vector3(0.35 + s * 0.6, 0, 0.2))
	rig.pose("elbow_l", Vector3(0.3, 0, 0))
	rig.pose("elbow_r", Vector3(0.3, 0, 0))
	if state == State.ATTACK:
		rig.pose("head", Vector3(0.3, 0, 0))
		rig.pose("shoulder_l", Vector3(1.6, 0, -0.3))
		rig.pose("shoulder_r", Vector3(1.6, 0, 0.3))
	rig.apply(delta, 2.2)

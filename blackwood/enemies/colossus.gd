class_name Colossus
extends Hollow
## LE COLOSSUS — sujet 12 de la cellule C-7. Énorme, lent, presque impossible
## à tuer : on ne peut que le faire plier un instant, puis fuir. Il enfonce
## les portes, même verrouillées.

const STUN_EVERY := 520.0

var smashes_doors := true
var _dmg_acc := 0.0
var _down_t := 0.0
var _roar_t := 4.0


func _init() -> void:
	super._init()
	variant = "colossus"
	max_hp = 6000.0
	walk_speed = 1.2
	chase_speed = 3.3
	turn_speed = 3.0
	attack_range = 2.5
	attack_damage = 45.0
	attack_windup = 0.9
	attack_recovery = 1.1
	vision_range = 20.0
	vision_range_lit = 24.0
	vision_fov = deg_to_rad(160.0)
	proximity = 4.0
	hearing_scale = 2.0
	lose_time = 60.0
	search_time = 30.0
	give_up_distance = 90.0
	stagger_chance = 0.0
	body_radius = 0.7
	body_height = 2.9


func _apply_variant() -> void:
	hp = max_hp


func _rig_cfg() -> Dictionary:
	return {"height": 1.7, "bulk": 1.6, "shoulder_width": 1.25, "arm_len": 1.1, "arm_thick": 1.6,
		"leg_thick": 1.5, "hunch": 0.35, "hair": false}


func skin_look() -> Dictionary:
	return {"skin_tint": Color(0.95, 0.72, 0.66), "blood": 0.7, "wet": 0.5, "pallor": 0.2, "cloth_mix": 0.0,
		"bone_scale": {"Spine": Vector3(1.5, 1.0, 1.45), "Spine01": Vector3(1.45, 1.0, 1.4), "Spine02": Vector3(1.4, 1.0, 1.35),
			"LeftArm": Vector3(1.5, 1.0, 1.5), "RightArm": Vector3(1.5, 1.0, 1.5), "LeftUpLeg": Vector3(1.35, 1.0, 1.35),
			"RightUpLeg": Vector3(1.35, 1.0, 1.35), "Head": Vector3(0.78, 0.8, 0.8), "neck": Vector3(1.7, 1.0, 1.7)}}


func _hitbox_scale() -> float:
	return 1.8


func take_damage(amount: float, hit_pos: Vector3, dir: Vector3, is_head: bool) -> void:
	if state == State.DEAD:
		return
	super.take_damage(amount, hit_pos, dir, is_head)
	hp = maxf(hp, 50.0)
	_dmg_acc += amount
	if _dmg_acc >= STUN_EVERY and _down_t <= 0.0:
		_dmg_acc = 0.0
		_down_t = 5.5
		Audio.play_3d("colossus_roar", global_position + Vector3.UP * 2.6, 2.0, 0.0, 60.0, 8.0, 0.8)


func on_explosion(k: float) -> void:
	_down_t = maxf(_down_t, 3.0 + 3.0 * k)


func _net_extra() -> Array:
	return [_down_t]


func _net_apply_extra(a: Array) -> void:
	if a.size() >= 1:
		_down_t = float(a[0])


func _puppet_custom(delta: float) -> bool:
	if _down_t > 0.0:
		_down_t = maxf(_down_t - delta, 0.0)
		_animate_down(delta)
		return true
	return false


func _physics_process(delta: float) -> void:
	if net_puppet:
		_puppet_process(delta)
		return
	if state == State.DEAD:
		super._physics_process(delta)
		return
	if _down_t > 0.0:
		# À genoux, sonné : la seule fenêtre pour passer
		_down_t -= delta
		velocity.x = move_toward(velocity.x, 0.0, delta * 8.0)
		velocity.z = move_toward(velocity.z, 0.0, delta * 8.0)
		velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
		move_and_slide()
		_animate_down(delta)
		return
	_roar_t -= delta
	if _roar_t <= 0.0 and state == State.CHASE:
		_roar_t = randf_range(6.0, 10.0)
		Audio.play_3d("colossus_roar", global_position + Vector3.UP * 2.6, 4.0, 0.05, 70.0, 8.0)
	super._physics_process(delta)


func _animate_down(delta: float) -> void:
	rig.reset_pose()
	rig.pose("knee_l", Vector3(-1.5, 0, 0))
	rig.pose("knee_r", Vector3(-0.3, 0, 0))
	rig.pose("hip_l", Vector3(1.2, 0, 0))
	rig.pose("spine", Vector3(-0.7, 0, 0.1))
	rig.pose("head", Vector3(0.5, 0, 0))
	rig.pose("shoulder_l", Vector3(0.6, 0, -0.2))
	rig.pose("shoulder_r", Vector3(0.2, 0, 0.3))
	rig.position.y = lerpf(rig.position.y, -0.55, 1.0 - exp(-6.0 * delta))
	rig.apply(delta)


func _animate(delta: float) -> void:
	rig.position.y = lerpf(rig.position.y, 0.0, 1.0 - exp(-6.0 * delta))
	super._animate(delta)


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 2.6
	match kind:
		"alert":
			Audio.play_3d("colossus_roar", pos, 6.0, 0.0, 80.0, 10.0)
		"idle", "chase":
			Audio.play_3d("surgeon_breath", pos, -2.0, 0.1, 25.0, 4.0, 0.7)
		"hurt":
			Audio.play_3d("surgeon_hurt", pos, -4.0, 0.1, 30.0, 5.0, 0.7)
		"attack":
			Audio.play_3d("swing_heavy", pos, 2.0, 0.05, 30.0, 5.0, 0.7)


func _footstep() -> void:
	Audio.play_3d("step_heavy", global_position, 4.0, 0.1, 40.0, 6.0, 0.7)
	var p := player()
	if p and p.camera_rig and global_position.distance_to(p.global_position) < 14.0:
		p.camera_rig.shake(0.2)

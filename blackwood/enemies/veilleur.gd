class_name Veilleur
extends Hollow
## LE VEILLEUR — maigre, des bras démesurés, presque aveugle. Il ne voit pas :
## il sent le mouvement et entend tout. Marcher lentement le trompe ; courir
## le réveille. Il hante les couloirs sombres du sous-sol -2.

var _listen_t := 0.0
var _click_t := 2.0


func _init() -> void:
	super._init()
	variant = "veilleur"
	max_hp = 380.0
	walk_speed = 0.9
	chase_speed = 4.2
	turn_speed = 7.0
	attack_range = 2.2
	attack_damage = 28.0
	attack_windup = 0.5
	attack_recovery = 0.9
	vision_range = 2.2
	vision_range_lit = 3.2
	proximity = 1.8
	hearing_scale = 2.2
	lose_time = 3.0
	search_time = 8.0
	give_up_distance = 40.0
	stagger_chance = 0.2
	body_radius = 0.32
	body_height = 2.15
	patrol_wait = 4.0


func _apply_variant() -> void:
	hp = max_hp


func _rig_cfg() -> Dictionary:
	return {"height": 1.26, "bulk": 0.72, "shoulder_width": 0.9, "arm_len": 1.45, "arm_thick": 0.7,
		"leg_thick": 0.75, "hunch": 0.75, "hair": false}


func skin_look() -> Dictionary:
	return {"pallor": 0.95, "blood": 0.3, "wet": 0.45, "skin_tint": Color(0.8, 0.84, 0.9), "cloth_mix": 0.0,
		"bone_scale": {"LeftArm": Vector3(0.75, 1.32, 0.75), "RightArm": Vector3(0.75, 1.32, 0.75),
			"LeftForeArm": Vector3(0.92, 1.18, 0.92), "RightForeArm": Vector3(0.92, 1.18, 0.92),
			"Spine": Vector3(0.78, 1.08, 0.72), "Spine01": Vector3(0.8, 1.08, 0.75), "Spine02": Vector3(0.82, 1.05, 0.8),
			"Head": Vector3(0.9, 1.12, 0.95)}}


func _hitbox_scale() -> float:
	return 1.1


func _physics_process(delta: float) -> void:
	if net_puppet:
		_click_t -= delta
		if _click_t <= 0.0 and state != State.DEAD and not dormant:
			_click_t = randf_range(1.2, 3.0) if state == State.CHASE else randf_range(2.5, 6.0)
			Audio.play_3d("veilleur_click", global_position + Vector3.UP * 2.0, -2.0, 0.15, 22.0, 3.0)
		_puppet_process(delta)
		return
	if state != State.DEAD and not dormant and not passive:
		# Le mouvement du joueur le trahit : il « entend » sa vitesse
		_listen_t -= delta
		if _listen_t <= 0.0:
			_listen_t = 0.25
			var p := player()
			if p and not p.is_dead and absf(p.global_position.y - global_position.y) < 2.5:
				var d := global_position.distance_to(p.global_position)
				var v := Vector2(p.velocity.x, p.velocity.z).length()
				if (v > 3.2 and d < 16.0) or (v > 1.2 and d < 4.5):
					_on_noise(p.global_position, 40.0, p)
		_click_t -= delta
		if _click_t <= 0.0:
			_click_t = randf_range(1.2, 3.0) if state == State.CHASE else randf_range(2.5, 6.0)
			Audio.play_3d("veilleur_click", global_position + Vector3.UP * 2.0, -2.0, 0.15, 22.0, 3.0)
	super._physics_process(delta)


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 2.0
	match kind:
		"alert", "chase":
			Audio.play_3d("veilleur_scream", pos, 2.0, 0.08, 45.0, 6.0)
		"hear":
			Audio.play_3d("veilleur_click", pos, 0.0, 0.1, 25.0, 4.0, 0.8)
		"hurt":
			Audio.play_3d("hollow_hurt", pos, 0.0, 0.1, 25.0, 3.0, 0.7)
		"attack":
			Audio.play_3d("swing_heavy", pos, -2.0, 0.08, 20.0, 3.0)
		"death":
			Audio.play_3d("veilleur_scream", pos, 4.0, 0.0, 50.0, 6.0, 0.6)


func _footstep() -> void:
	Audio.play_3d("step_shuffle", global_position, -14.0, 0.2, 10.0, 2.0, 0.8)

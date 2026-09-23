class_name Hollow
extends Enemy
## THE HOLLOW — patient réanimé par le protocole LAZARUS.
## Presque aveugle (perçoit surtout la lumière vive), ouïe extrême, insensible
## à la douleur : seules les blessures à la tête l'arrêtent vraiment.
## Démarche traînante, bras tendus quand elle chasse, tics nerveux.

var variant := "patient"   # « patient » (blouse) ou « guard » (uniforme de sécurité)
var _twitch_t := 0.0
var _twitch_joint := ""
var _twitch_rot := Vector3.ZERO
var _drag := 1.0


func _init() -> void:
	max_hp = 100.0
	hp = max_hp
	walk_speed = 1.05
	chase_speed = 2.45
	attack_range = 1.45
	attack_damage = 17.0
	attack_windup = 0.55
	attack_recovery = 0.75
	vision_range = 6.5
	vision_range_lit = 11.0
	vision_fov = deg_to_rad(120.0)
	proximity = 2.2
	hearing_scale = 1.0
	lose_time = 5.0
	search_time = 11.0
	give_up_distance = 22.0
	stagger_chance = 0.55
	body_radius = 0.34
	body_height = 1.72


func _build_body() -> void:
	_drag = 1.0 if randf() < 0.5 else -1.0
	flesh_mat = Mats.flesh(Color(0.5, 0.49, 0.44) * randf_range(0.9, 1.05), 0.35)
	rig = HumanoidRig.new()
	rig.name = "Rig"
	add_child(rig)
	var cfg := {
		"height": randf_range(0.97, 1.03), "bulk": 0.84, "shoulder_width": 0.95, "arm_len": 1.18,
		"arm_thick": 0.85, "leg_thick": 0.85, "hunch": 0.4, "hair": false,
		"mat_skin": flesh_mat, "mat_hands": flesh_mat, "mat_arms": flesh_mat, "mat_forearms": flesh_mat,
		"mat_feet": flesh_mat,
	}
	if variant == "guard":
		cfg.merge({"torso_shape": "jacket", "mat_torso": "uniform_guard", "mat_arms": "uniform_guard",
			"mat_legs": "uniform_guard", "mat_feet": "leather_boots", "hair": true, "mat_hair": "hair_dark"}, true)
	else:
		cfg.merge({"torso_shape": "gown", "mat_torso": "gown", "mat_legs": flesh_mat, "mat_shins": flesh_mat}, true)
	rig.build(cfg)
	# Visage : yeux laiteux, bouche béante
	var eye := SphereMesh.new()
	eye.radius = 0.018
	eye.height = 0.036
	for s in [-0.038, 0.038]:
		rig.attach_mesh("head", eye, "eye_glow", Vector3(s, 0.12, -0.098))
	rig.attach_mesh("head", rig._box(Vector3(0.05, 0.05, 0.02)), "black", Vector3(0, 0.035, -0.1))
	# Zones de tir : tête (dégâts x2.6), torse, bassin
	var head_shape := SphereShape3D.new()
	head_shape.radius = 0.15
	add_hitbox("head", head_shape, Vector3(0, 0.1, 0), true)
	var chest_shape := BoxShape3D.new()
	chest_shape.size = Vector3(0.42, 0.5, 0.3)
	add_hitbox("chest", chest_shape, Vector3(0, -0.05, 0), false)
	var hips_shape := BoxShape3D.new()
	hips_shape.size = Vector3(0.38, 0.55, 0.28)
	add_hitbox("hips", hips_shape, Vector3(0, -0.2, 0), false)


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 1.5
	match kind:
		"idle":
			Audio.play_3d("hollow_groan", pos, -8.0, 0.15, 18.0, 2.5)
		"chase":
			Audio.play_3d("hollow_groan", pos, -2.0, 0.12, 25.0, 3.0)
		"alert":
			Audio.play_3d("hollow_alert", pos, 2.0, 0.1, 35.0, 4.0)
		"hear":
			Audio.play_3d("hollow_sniff", pos, -4.0, 0.1, 18.0, 2.5)
		"hurt":
			Audio.play_3d("hollow_hurt", pos, 0.0, 0.12, 25.0, 3.0)
		"attack":
			Audio.play_3d("hollow_attack", pos, 0.0, 0.1, 25.0, 3.0)
		"death":
			Audio.play_3d("hollow_death", pos, 2.0, 0.08, 30.0, 4.0)
		"wake":
			Audio.play_3d("hollow_wake", pos, 0.0, 0.05, 25.0, 3.0)


func _footstep() -> void:
	Audio.play_3d("step_shuffle", global_position, -10.0, 0.15, 14.0, 2.0)


func _animate(delta: float) -> void:
	rig.reset_pose()
	var t := Time.get_ticks_msec() * 0.001
	var chasing := state == State.CHASE
	if state == State.ATTACK:
		var k := clampf(_attack_t / attack_windup, 0.0, 1.0)
		if _attack_t < attack_windup:
			# Armement : bras relevés, buste en arrière
			rig.pose("shoulder_l", Vector3(lerpf(0.8, 2.4, k), 0, -0.3))
			rig.pose("shoulder_r", Vector3(lerpf(0.8, 2.4, k), 0, 0.3))
			rig.pose("elbow_l", Vector3(0.6, 0, 0))
			rig.pose("elbow_r", Vector3(0.6, 0, 0))
			rig.pose("spine", Vector3(0.15 * k, 0, 0))
		else:
			var k2 := clampf((_attack_t - attack_windup) / 0.18, 0.0, 1.0)
			rig.pose("shoulder_l", Vector3(lerpf(2.4, 0.6, k2), 0, -0.1))
			rig.pose("shoulder_r", Vector3(lerpf(2.4, 0.6, k2), 0, 0.1))
			rig.pose("elbow_l", Vector3(0.2, 0, 0))
			rig.pose("elbow_r", Vector3(0.2, 0, 0))
			rig.pose("spine", Vector3(-0.5, 0, 0))
			rig.pose("head", Vector3(-0.2, 0, 0))
		rig.apply(delta, 1.8)
		return
	if _speed_now > 0.15:
		_phase += _speed_now * delta * TAU / (1.1 if chasing else 1.3)
		var amp := clampf(_speed_now / 1.1, 0.35, 1.0)
		rig.walk_cycle(_phase, amp * (0.95 if chasing else 0.75), 0.25, 0.8)
		# Jambe traînante
		var lag := "knee_l" if _drag > 0.0 else "knee_r"
		rig.pose(lag, rig.targets[lag] * 0.35)
		var reach := 1.2 if chasing else 0.35
		rig.pose("shoulder_l", Vector3(reach + sin(_phase) * 0.12, 0, -0.08))
		rig.pose("shoulder_r", Vector3(reach - sin(_phase) * 0.12, 0, 0.08))
		rig.pose("elbow_l", Vector3(0.25, 0, 0))
		rig.pose("elbow_r", Vector3(0.35, 0, 0))
		rig.pose("spine", Vector3(-0.25 - (0.2 if chasing else 0.0), 0, sin(_phase * 0.5) * 0.08))
		rig.pose("head", Vector3(0.25, 0, sin(_phase * 0.5) * 0.35))
		rig.joint("hips").position.y = rig.base_hips_height - absf(sin(_phase)) * 0.05
	else:
		# Attente : balancement, tête qui pend
		rig.pose("shoulder_l", Vector3(0.2 + sin(t * 0.7) * 0.05, 0, -0.05))
		rig.pose("shoulder_r", Vector3(0.25 + sin(t * 0.8) * 0.05, 0, 0.05))
		rig.pose("elbow_l", Vector3(0.2, 0, 0))
		rig.pose("elbow_r", Vector3(0.2, 0, 0))
		rig.pose("head", Vector3(0.45, 0, sin(t * 0.5) * 0.4))
		rig.pose("spine", Vector3(-0.3, sin(t * 0.3) * 0.1, 0))
		if state == State.INVESTIGATE or state == State.SEARCH:
			rig.pose("head", Vector3(-0.1, sin(t * 1.3) * 0.7, 0.2))
	# Tics nerveux
	_twitch_t -= delta
	if _twitch_t <= 0.0:
		_twitch_t = randf_range(0.6, 3.0)
		_twitch_joint = ["head", "shoulder_l", "shoulder_r", "chest", "neck"][randi() % 5]
		_twitch_rot = Vector3(randf_range(-0.6, 0.6), randf_range(-0.8, 0.8), randf_range(-0.6, 0.6))
	if _twitch_t < 0.1 and _twitch_joint != "":
		rig.joints[_twitch_joint].rotation += _twitch_rot * 0.15
	if _stagger_t > 0.0:
		rig.pose("spine", Vector3(0.45, 0, 0.2))
		rig.pose("head", Vector3(-0.6, 0.3, 0))
		rig.pose("shoulder_l", Vector3(-0.4, 0, -0.6))
		rig.pose("shoulder_r", Vector3(-0.3, 0, 0.7))
	rig.apply(delta, 1.4 if chasing else 1.0)

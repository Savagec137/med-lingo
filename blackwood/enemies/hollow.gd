class_name Hollow
extends Enemy
## Les infectés de Blackwood Hospital (Projet ECHO). Morts qui ne savent plus
## mourir : insensibles à la douleur, seules les blessures à la tête les
## arrêtent vraiment. Quatre variantes :
##   patient      : lent, résistant, dangereux en groupe
##   nurse        : infirmier contaminé — plus rapide, sprints courts, agressif
##   neuro        : patient neurologique — immobile, presque aveugle, réagit au moindre son
##   experimental : patient expérimental — grand, très résistant, lent
##   guard        : agent de sécurité contaminé (patient en uniforme)
## Le corps visible est le modèle réaliste riggé (Higgsfield) piloté par un
## squelette procédural invisible (SkinnedBody).

var variant := "patient"
var skin: SkinnedBody
var _twitch_t := 0.0
var _twitch_joint := ""
var _twitch_rot := Vector3.ZERO
var _drag := 1.0
var _sprint_t := 0.0
var _sprint_cd := 2.0
var _base_chase := 2.1


func _init() -> void:
	max_hp = 140.0
	hp = max_hp
	walk_speed = 0.95
	chase_speed = 2.1
	attack_range = 1.45
	attack_damage = 18.0
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


func _ready() -> void:
	_apply_variant()
	_base_chase = chase_speed
	super._ready()


## Caractéristiques propres à chaque variante (appelé avant la construction).
func _apply_variant() -> void:
	match variant:
		"guard":
			max_hp = 130.0
			walk_speed = 1.05
			chase_speed = 2.35
		"nurse":
			max_hp = 90.0
			walk_speed = 1.3
			chase_speed = 2.9
			attack_damage = 15.0
			attack_windup = 0.42
			attack_recovery = 0.6
			vision_range = 8.0
			lose_time = 7.0
			give_up_distance = 30.0
			stagger_chance = 0.45
		"neuro":
			max_hp = 110.0
			walk_speed = 0.7
			chase_speed = 3.4
			vision_range = 1.3
			vision_range_lit = 1.6
			proximity = 1.3
			hearing_scale = 1.7
			lose_time = 2.5
			search_time = 5.0
		"experimental":
			max_hp = 420.0
			walk_speed = 0.75
			chase_speed = 1.6
			attack_range = 1.9
			attack_damage = 32.0
			attack_windup = 0.8
			attack_recovery = 1.0
			stagger_chance = 0.12
			vision_range = 8.0
			body_radius = 0.45
			body_height = 2.2
	hp = max_hp


## Proportions du squelette procédural (pilote invisible du modèle).
func _rig_cfg() -> Dictionary:
	var h := randf_range(0.97, 1.03)
	var bulk := 0.84
	if variant == "experimental":
		h = 1.28
		bulk = 1.15
	return {
		"height": h, "bulk": bulk, "shoulder_width": 0.95, "arm_len": 1.18,
		"arm_thick": 0.85, "leg_thick": 0.85, "hunch": 0.4, "hair": false,
	}


func _build_body() -> void:
	_drag = 1.0 if randf() < 0.5 else -1.0
	flesh_mat = Mats.flesh(Color(0.5, 0.49, 0.44) * randf_range(0.9, 1.05), 0.35)
	rig = HumanoidRig.new()
	rig.name = "Rig"
	add_child(rig)
	var cfg := _rig_cfg()
	cfg.merge({"mat_skin": flesh_mat, "mat_hands": flesh_mat, "mat_arms": flesh_mat, "mat_forearms": flesh_mat,
		"mat_feet": flesh_mat}, true)
	if variant == "guard":
		cfg.merge({"torso_shape": "jacket", "mat_torso": "uniform_guard", "mat_arms": "uniform_guard",
			"mat_legs": "uniform_guard", "mat_feet": "leather_boots", "hair": true, "mat_hair": "hair_dark"}, true)
	else:
		cfg.merge({"torso_shape": "gown", "mat_torso": "gown", "mat_legs": flesh_mat, "mat_shins": flesh_mat}, true)
	rig.build(cfg)
	if SkinnedBody.available():
		# Modèle réaliste (Higgsfield) : le rig procédural devient un pilote invisible
		for m in rig.meshes:
			m.visible = false
		skin = SkinnedBody.new()
		skin.name = "Skin"
		rig.add_child(skin)
		var look := skin_look()
		look["scale"] = float(look.get("scale", 1.0)) * float(cfg.height) / 0.946
		skin.setup(rig, look)
		flesh_mat = skin.material
	else:
		var eye := SphereMesh.new()
		eye.radius = 0.018
		eye.height = 0.036
		for s in [-0.038, 0.038]:
			rig.attach_mesh("head", eye, "eye_glow", Vector3(s, 0.12, -0.098))
		rig.attach_mesh("head", rig._box(Vector3(0.05, 0.05, 0.02)), "black", Vector3(0, 0.035, -0.1))
	_extra_body()
	# Zones de tir : tête, torse, bassin (à l'échelle de la créature)
	var k := _hitbox_scale()
	var head_shape := SphereShape3D.new()
	head_shape.radius = 0.15 * k
	add_hitbox("head", head_shape, Vector3(0, 0.1 * k, 0), true)
	var chest_shape := BoxShape3D.new()
	chest_shape.size = Vector3(0.42, 0.5, 0.3) * k
	add_hitbox("chest", chest_shape, Vector3(0, -0.05, 0), false)
	var hips_shape := BoxShape3D.new()
	hips_shape.size = Vector3(0.38, 0.55, 0.28) * k
	add_hitbox("hips", hips_shape, Vector3(0, -0.2 * k, 0), false)


## Accessoires supplémentaires (surcharge : cheveux, excroissances…).
func _extra_body() -> void:
	pass


func _hitbox_scale() -> float:
	return 1.3 if variant == "experimental" else 1.0


## Apparence du modèle réaliste selon la variante (voir SkinnedBody.setup).
func skin_look() -> Dictionary:
	match variant:
		"guard":
			return {"cloth_tint": Color(0.06, 0.08, 0.16), "cloth_mix": 0.97, "blood": 0.45}
		"nurse":
			return {"cloth_tint": Color(0.22, 0.52, 0.36), "cloth_mix": 0.95, "blood": 0.6, "wet": 0.3}
		"neuro":
			return {"cloth_tint": Color(0.85, 0.85, 0.8), "cloth_mix": 0.8, "pallor": 0.55, "blood": 0.15}
		"experimental":
			return {"skin_tint": Color(1.1, 0.72, 0.68), "blood": 0.8, "wet": 0.6,
				"bone_scale": {"Spine": Vector3(1.35, 1.0, 1.3), "Spine01": Vector3(1.25, 1.0, 1.25),
					"LeftArm": Vector3(1.3, 1.0, 1.3), "RightArm": Vector3(1.3, 1.0, 1.3)}}
	return {"blood": 0.35}


func _physics_process(delta: float) -> void:
	# L'infirmier contaminé sprinte par à-coups quand il poursuit sa proie
	if variant == "nurse" and state != State.DEAD:
		_sprint_cd = maxf(_sprint_cd - delta, 0.0)
		if _sprint_t > 0.0:
			_sprint_t -= delta
			chase_speed = 5.0
		else:
			chase_speed = _base_chase
		if state == State.CHASE and _sprint_t <= 0.0 and _sprint_cd <= 0.0 and _sees_player:
			var p := player()
			if p and global_position.distance_to(p.global_position) > 3.0:
				_sprint_t = 1.3
				_sprint_cd = randf_range(3.5, 5.5)
				_voice("alert")
	super._physics_process(delta)


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 1.5
	var pitch := 1.15 if variant == "nurse" else (0.8 if variant == "experimental" else 1.0)
	match kind:
		"idle":
			Audio.play_3d("hollow_groan", pos, -8.0, 0.15, 18.0, 2.5, pitch)
		"chase":
			Audio.play_3d("hollow_groan", pos, -2.0, 0.12, 25.0, 3.0, pitch)
		"alert":
			Audio.play_3d("hollow_alert", pos, 2.0, 0.1, 35.0, 4.0, pitch)
		"hear":
			Audio.play_3d("hollow_sniff", pos, -4.0, 0.1, 18.0, 2.5, pitch)
		"hurt":
			Audio.play_3d("hollow_hurt", pos, 0.0, 0.12, 25.0, 3.0, pitch)
		"attack":
			Audio.play_3d("hollow_attack", pos, 0.0, 0.1, 25.0, 3.0, pitch)
		"death":
			Audio.play_3d("hollow_death", pos, 2.0, 0.08, 30.0, 4.0, pitch)
		"wake":
			Audio.play_3d("hollow_wake", pos, 0.0, 0.05, 25.0, 3.0, pitch)


func _footstep() -> void:
	Audio.play_3d("step_shuffle" if variant != "experimental" else "step_heavy", global_position, -10.0, 0.15, 14.0, 2.0)


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
		var sprinting := _sprint_t > 0.0
		_phase += _speed_now * delta * TAU / (1.1 if chasing else 1.3)
		var amp := clampf(_speed_now / 1.1, 0.35, 1.0)
		rig.walk_cycle(_phase, amp * (1.1 if sprinting else (0.95 if chasing else 0.75)), 0.25, 0.8)
		# Jambe traînante (sauf en sprint)
		if not sprinting:
			var lag := "knee_l" if _drag > 0.0 else "knee_r"
			rig.pose(lag, rig.targets[lag] * 0.35)
		var reach := 1.2 if chasing else 0.35
		rig.pose("shoulder_l", Vector3(reach + sin(_phase) * 0.12, 0, -0.08))
		rig.pose("shoulder_r", Vector3(reach - sin(_phase) * 0.12, 0, 0.08))
		rig.pose("elbow_l", Vector3(0.25, 0, 0))
		rig.pose("elbow_r", Vector3(0.35, 0, 0))
		rig.pose("spine", Vector3(-0.25 - (0.35 if sprinting else (0.2 if chasing else 0.0)), 0, sin(_phase * 0.5) * 0.08))
		rig.pose("head", Vector3(0.25, 0, sin(_phase * 0.5) * 0.35))
		rig.joint("hips").position.y = rig.base_hips_height - absf(sin(_phase)) * 0.05
	elif variant == "neuro" and state == State.IDLE:
		# Patient neurologique : figé, la tête inclinée, à l'écoute
		rig.pose("shoulder_l", Vector3(0.05, 0, -0.02))
		rig.pose("shoulder_r", Vector3(0.05, 0, 0.02))
		rig.pose("head", Vector3(0.35, 0.0, 0.45 + sin(t * 0.3) * 0.05))
		rig.pose("spine", Vector3(-0.15, 0, 0))
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

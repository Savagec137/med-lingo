class_name SarahBoss
extends BossHumanoid
## SARAH REED — infirmière en neurologie, infectée par ECHO en ouvrant les
## cellules du 8e. Elle attend Thomas au centre de contrôle, assise contre la
## console. Quand la mutation l'emporte, le combat reste hanté par ce qu'elle
## était : deux fois, elle s'arrête, se tient la tête et dit son nom.

var sitting := true
var _mutation := 0.0
var _mutating := false
var _growths: Array[MeshInstance3D] = []
var _blade: MeshInstance3D


func _init() -> void:
	super._init()
	variant = "sarah"
	max_hp = 1300.0
	walk_speed = 1.2
	chase_speed = 3.5
	turn_speed = 8.0
	attack_range = 1.8
	attack_damage = 22.0
	attack_windup = 0.45
	attack_recovery = 0.6
	vision_range = 18.0
	vision_range_lit = 20.0
	vision_fov = deg_to_rad(240.0)
	proximity = 6.0
	hearing_scale = 1.5
	lose_time = 40.0
	search_time = 20.0
	give_up_distance = 70.0
	stagger_chance = 0.15
	body_radius = 0.33
	body_height = 1.7
	scream_sound = "sarah_scream"


func _apply_variant() -> void:
	hp = max_hp


func _rig_cfg() -> Dictionary:
	return {"height": 0.95, "bulk": 0.78, "shoulder_width": 0.86, "arm_len": 1.05, "arm_thick": 0.8,
		"leg_thick": 0.82, "hunch": 0.0, "hair": false}


func skin_look() -> Dictionary:
	return {"cloth_tint": Color(0.18, 0.4, 0.46), "cloth_mix": 0.95, "pallor": 0.35, "blood": 0.5, "wet": 0.25,
		"skin_tint": Color(1.02, 0.95, 0.92),
		"bone_scale": {"Spine": Vector3(0.9, 1.0, 0.88), "Spine01": Vector3(0.88, 1.0, 0.86), "neck": Vector3(0.85, 1.0, 0.85),
			"Head": Vector3(0.93, 0.95, 0.93)}}


## Cheveux, excroissances ECHO et lame osseuse (ces deux dernières cachées
## jusqu'à la mutation).
func _extra_body() -> void:
	var hair := Mats.get_mat("hair_dark")
	var cap := SphereMesh.new()
	cap.radius = 0.118
	cap.height = 0.2
	rig.attach_mesh("head", cap, hair, Vector3(0, 0.15, 0.02)).scale = Vector3(1.0, 0.92, 1.12)
	rig.attach_mesh("head", rig._box(Vector3(0.09, 0.3, 0.07)), hair, Vector3(0, 0.02, 0.13), Vector3(0.3, 0, 0))
	var growth_mat := Mats.flesh(Color(0.55, 0.2, 0.18), 0.9)
	for g in [["shoulder_r", Vector3(0.05, 0.02, 0.0), 0.14], ["chest", Vector3(0.1, 0.06, 0.08), 0.12], ["elbow_r", Vector3(0, -0.12, 0), 0.08],
			["spine", Vector3(-0.08, 0.12, 0.12), 0.11], ["neck", Vector3(0.05, 0.02, 0.05), 0.07], ["shoulder_l", Vector3(-0.02, 0.05, 0.05), 0.07]]:
		var sm := SphereMesh.new()
		sm.radius = float(g[2])
		sm.height = float(g[2]) * 1.7
		var mi := rig.attach_mesh(String(g[0]), sm, growth_mat, g[1])
		mi.scale = Vector3.ONE * 0.01
		mi.visible = false
		_growths.append(mi)
	_blade = rig.attach_mesh("wrist_r", rig._box(Vector3(0.035, 0.6, 0.09)), Mats.get_mat("plastic_beige"), Vector3(0, -0.34, 0))
	_blade.scale = Vector3(1, 0.01, 1)
	_blade.visible = false


func _hitbox_scale() -> float:
	return 0.95


## Début de la mutation (après le dialogue) : 3,5 s de convulsions puis le combat.
func begin_mutation() -> void:
	_mutating = true
	sitting = false
	_mutation = 0.0
	for g in _growths:
		g.visible = true
	_blade.visible = true
	Audio.play_3d("sarah_scream", global_position + Vector3.UP * 1.5, 2.0, 0.0, 50.0, 6.0)


## Chargement d'une partie en plein combat : elle est déjà transformée.
func start_fight_immediately() -> void:
	sitting = false
	_mutating = false
	for g in _growths:
		g.visible = true
		g.scale = Vector3.ONE
	_blade.visible = true
	_blade.scale = Vector3.ONE
	_finish_mutation()


func _finish_mutation() -> void:
	_mutating = false
	active = true
	passive = false
	if skin and skin.skeleton:
		for b in [["RightArm", Vector3(1.25, 1.2, 1.25)], ["RightForeArm", Vector3(1.1, 1.25, 1.1)], ["Spine", Vector3(1.1, 1.05, 1.1)]]:
			var bi := skin.skeleton.find_bone(String(b[0]))
			if bi >= 0:
				skin.skeleton.set_bone_pose_scale(bi, b[1])
	if flesh_mat:
		flesh_mat.set_shader_parameter("pallor", 0.7)
		flesh_mat.set_shader_parameter("blood", 0.95)
	var p := player()
	if p:
		last_known = p.global_position
	set_state(State.CHASE)
	boss_hp_changed.emit(hp, max_hp)


func _on_lucid(n: int) -> void:
	Audio.play_3d("zero_whisper", global_position + Vector3.UP * 1.6, 2.0, 0.0, 25.0, 4.0, 1.25)
	if n == 2:
		chase_speed = 4.1
		attack_windup = 0.38


func _pre_physics(delta: float) -> bool:
	if sitting:
		_hold_still(delta)
		_animate(delta)
		return true
	if _mutating:
		_mutation += delta / 3.5
		for g in _growths:
			g.scale = Vector3.ONE * clampf(_mutation * 1.1, 0.01, 1.0)
		_blade.scale = Vector3(1, clampf(_mutation, 0.01, 1.0), 1)
		if _mutation >= 1.0:
			_finish_mutation()
		_hold_still(delta)
		_animate(delta)
		return true
	return false


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 1.5
	match kind:
		"alert":
			Audio.play_3d("sarah_scream", pos, 0.0, 0.05, 40.0, 5.0)
		"hurt":
			Audio.play_3d("hollow_hurt", pos, -2.0, 0.1, 25.0, 3.0, 1.35)
		"attack":
			Audio.play_3d("swing", pos, -2.0, 0.1, 20.0, 3.0)
		"death":
			Audio.play_3d("sarah_scream", pos, 2.0, 0.0, 40.0, 5.0, 0.8)
		"idle", "chase":
			Audio.play_3d("hollow_groan", pos, -8.0, 0.1, 20.0, 3.0, 1.35)


func _animate(delta: float) -> void:
	var t := Time.get_ticks_msec() * 0.001
	if sitting:
		# Assise contre la console, la tête basse, la respiration lente
		rig.reset_pose()
		rig.position.y = -rig.base_hips_height + 0.13
		rig.pose("hip_l", Vector3(1.4, 0, -0.1))
		rig.pose("hip_r", Vector3(1.2, 0, 0.12))
		rig.pose("knee_l", Vector3(-0.35, 0, 0))
		rig.pose("knee_r", Vector3(-0.9, 0, 0))
		rig.pose("spine", Vector3(0.15 + sin(t * 1.1) * 0.02, 0, 0))
		rig.pose("head", Vector3(-0.35 + sin(t * 0.4) * 0.05, 0.15, 0.1))
		rig.pose("shoulder_l", Vector3(0.1, 0, -0.2))
		rig.pose("shoulder_r", Vector3(0.5, 0, 0.25))
		rig.pose("elbow_r", Vector3(1.2, 0, 0))
		rig.apply(delta, 0.8)
		return
	rig.position.y = lerpf(rig.position.y, 0.0, 1.0 - exp(-4.0 * delta))
	if _mutating:
		# Convulsions
		rig.reset_pose()
		for j in ["spine", "chest", "head", "shoulder_l", "shoulder_r", "elbow_l", "elbow_r"]:
			rig.joints[j].rotation = Vector3(randf_range(-0.35, 0.35), randf_range(-0.35, 0.35), randf_range(-0.35, 0.35)) * clampf(_mutation * 1.5, 0.2, 1.0)
		return
	super._animate(delta)

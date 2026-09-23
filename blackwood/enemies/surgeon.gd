class_name Surgeon
extends Enemy
## LE CHIRURGIEN — ce qu'est devenu le Dr Markus Keller après s'être injecté la
## formule complète. Immense, lent, extrêmement résistant. Une lame à la place
## de la main droite, une scie à la gauche, une lampe frontale qui fouille le
## noir. Sa présence s'annonce : pas lourds, souffle, métal qui racle le sol.
##
## Capacités : coup de lame puissant (armement long, esquivable) et charge
## après un rugissement. Une charge qui finit contre un mur l'étourdit.
## Point faible : les bouteilles d'oxygène du couloir, qui explosent quand on les touche.

signal boss_hp_changed(hp: float, max_hp: float)

const CHARGE_SPEED := 6.2
const CHARGE_TIME := 1.5
const ROAR_TIME := 0.85
const ELECTRO_DAMAGE := 260.0
## Le masque et la visière de cuir absorbent une partie des balles à la tête.
const HEAD_ARMOR := 0.5

var active := false          # inerte (« opère ») jusqu'à l'introduction du combat
var charge_cd := 3.0
var _roar_t := -1.0
var _charge_t := -1.0
var _charge_dir := Vector3.ZERO
var _charge_hit := false
var _stun_t := 0.0
var _electro_t := 0.0
var _flinch_acc := 0.0
var _scrape: AudioStreamPlayer3D
var _breath: AudioStreamPlayer3D
var _saw: MeshInstance3D
var lamp: SpotLight3D
var _lamp_mat: StandardMaterial3D


func _init() -> void:
	max_hp = 900.0
	hp = max_hp
	walk_speed = 0.95
	chase_speed = 1.95
	turn_speed = 3.2
	attack_range = 2.4
	attack_damage = 36.0
	attack_windup = 0.95
	attack_recovery = 1.05
	vision_range = 16.0
	vision_range_lit = 18.0
	vision_fov = deg_to_rad(150.0)
	proximity = 4.5
	hearing_scale = 1.6
	lose_time = 30.0
	search_time = 25.0
	give_up_distance = 60.0
	stagger_chance = 0.0
	body_radius = 0.55
	body_height = 2.4


func _build_body() -> void:
	flesh_mat = Mats.flesh(Color(0.46, 0.4, 0.37), 0.6)
	rig = HumanoidRig.new()
	rig.name = "Rig"
	add_child(rig)
	rig.build({
		"height": 1.38, "bulk": 1.55, "shoulder_width": 1.2, "arm_len": 1.3, "arm_thick": 1.25,
		"leg_thick": 1.15, "hunch": 0.55, "head_scale": 1.05, "hair": false,
		"torso_shape": "apron", "mat_torso": flesh_mat, "mat_apron": "apron", "mat_skin": flesh_mat,
		"mat_arms": flesh_mat, "mat_forearms": "surgical_cloth", "mat_hands": flesh_mat,
		"mat_legs": "apron", "mat_shins": "cloth_jeans", "mat_feet": "leather_boots",
	})
	# Corps réaliste (modèle Higgsfield) : le rig procédural pilote le squelette ;
	# masque, lampe frontale, lame et scie restent attachés aux articulations.
	if SkinnedBody.available():
		for m in rig.meshes:
			m.visible = false
		var skin := SkinnedBody.new()
		skin.name = "Skin"
		rig.add_child(skin)
		skin.setup(rig, {"scale": 1.38 / 0.946, "cloth_tint": Color(0.24, 0.38, 0.34), "cloth_mix": 0.92, "blood": 0.95,
			"pallor": 0.3, "wet": 0.45,
			"bone_scale": {"Spine": Vector3(1.45, 1.0, 1.4), "Spine01": Vector3(1.4, 1.0, 1.35), "Spine02": Vector3(1.3, 1.0, 1.25),
				"LeftArm": Vector3(1.35, 1.0, 1.35), "RightArm": Vector3(1.35, 1.0, 1.35), "neck": Vector3(1.3, 1.0, 1.3)}})
		flesh_mat = skin.material
	# Masque chirurgical et lampe frontale
	rig.attach_mesh("head", rig._box(Vector3(0.2, 0.13, 0.06)), "surgical_cloth", Vector3(0, 0.06, -0.1))
	var lamp_body := CylinderMesh.new()
	lamp_body.top_radius = 0.045
	lamp_body.bottom_radius = 0.05
	lamp_body.height = 0.07
	rig.attach_mesh("head", lamp_body, "metal_dark", Vector3(0, 0.2, -0.1), Vector3(PI / 2.0, 0, 0))
	_lamp_mat = StandardMaterial3D.new()
	_lamp_mat.emission_enabled = true
	_lamp_mat.emission = Color(1.0, 0.95, 0.8)
	_lamp_mat.emission_energy_multiplier = 6.0
	var lens := CylinderMesh.new()
	lens.top_radius = 0.035
	lens.bottom_radius = 0.035
	lens.height = 0.01
	rig.attach_mesh("head", lens, _lamp_mat, Vector3(0, 0.2, -0.14), Vector3(PI / 2.0, 0, 0))
	var strap := rig._box(Vector3(0.24, 0.03, 0.24))
	rig.attach_mesh("head", strap, "rubber", Vector3(0, 0.19, 0))
	lamp = SpotLight3D.new()
	lamp.light_color = Color(1.0, 0.95, 0.85)
	lamp.light_energy = 2.6
	lamp.spot_range = 16.0
	lamp.spot_angle = 20.0
	lamp.shadow_enabled = true
	lamp.light_volumetric_fog_energy = 1.4
	lamp.position = Vector3(0, 0.2, -0.16)
	lamp.rotation.x = -0.25
	rig.joint("head").add_child(lamp)
	# Lame (main droite) et scie circulaire (main gauche)
	rig.attach_mesh("wrist_r", rig._box(Vector3(0.05, 0.95, 0.14)), "metal_steel", Vector3(0, -0.55, 0))
	rig.attach_mesh("wrist_r", rig._box(Vector3(0.1, 0.16, 0.18)), "metal_rust", Vector3(0, -0.07, 0))
	var saw := CylinderMesh.new()
	saw.top_radius = 0.24
	saw.bottom_radius = 0.24
	saw.height = 0.02
	saw.radial_segments = 20
	_saw = rig.attach_mesh("wrist_l", saw, "metal_steel", Vector3(0, -0.3, 0), Vector3(0, 0, PI / 2.0))
	rig.attach_mesh("wrist_l", rig._box(Vector3(0.12, 0.2, 0.12)), "metal_rust", Vector3(0, -0.1, 0))
	# Zones de tir
	var head_shape := SphereShape3D.new()
	head_shape.radius = 0.2
	add_hitbox("head", head_shape, Vector3(0, 0.1, 0), true)
	var chest_shape := BoxShape3D.new()
	chest_shape.size = Vector3(0.85, 0.8, 0.6)
	add_hitbox("chest", chest_shape, Vector3(0, -0.05, 0), false)
	var belly_shape := BoxShape3D.new()
	belly_shape.size = Vector3(0.75, 0.8, 0.6)
	add_hitbox("hips", belly_shape, Vector3(0, 0.1, 0), false)
	# Boucles sonores attachées
	_breath = _loop_player("surgeon_breath", -4.0, 18.0)
	_scrape = _loop_player("metal_scrape", -60.0, 22.0)


func _loop_player(sound: String, vol: float, dist: float) -> AudioStreamPlayer3D:
	var p := AudioStreamPlayer3D.new()
	p.stream = Audio.get_stream(sound)
	p.bus = "SFX"
	p.volume_db = vol
	p.max_distance = dist
	p.unit_size = 4.0
	p.position = Vector3(0, 1.6, 0)
	add_child(p)
	if p.stream:
		p.play()
	return p


func activate() -> void:
	active = true
	var p := player()
	if p:
		last_known = p.global_position
	set_state(State.CHASE)


func _on_noise(pos: Vector3, radius: float, source: Node) -> void:
	if not active:
		return
	super._on_noise(pos, radius, source)


func _can_see_player() -> bool:
	return active and super._can_see_player()


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 2.1
	match kind:
		"idle", "chase":
			Audio.play_3d("surgeon_mutter", pos, -2.0, 0.08, 25.0, 4.0)
		"alert":
			Audio.play_3d("surgeon_roar", pos, 2.0, 0.05, 45.0, 6.0)
		"hurt":
			Audio.play_3d("surgeon_hurt", pos, -2.0, 0.1, 30.0, 5.0)
		"attack":
			Audio.play_3d("swing_heavy", pos, 0.0, 0.05, 25.0, 4.0)
		"death":
			Audio.play_3d("surgeon_death", pos, 4.0, 0.0, 60.0, 8.0)


func _footstep() -> void:
	Audio.play_3d("step_heavy", global_position, 0.0, 0.1, 30.0, 5.0)
	var p := player()
	if p and p.camera_rig and global_position.distance_to(p.global_position) < 9.0:
		p.camera_rig.shake(0.12)


func take_damage(amount: float, hit_pos: Vector3, dir: Vector3, is_head: bool) -> void:
	if state == State.DEAD:
		return
	if not active:
		activate()
	if is_head:
		amount *= HEAD_ARMOR
	super.take_damage(amount, hit_pos, dir, is_head)
	boss_hp_changed.emit(maxf(hp, 0.0), max_hp)
	_flinch_acc += amount
	if _flinch_acc >= 140.0 and state != State.DEAD:
		_flinch_acc = 0.0
		_stun_t = maxf(_stun_t, 0.7)
		_cancel_charge()
	if lamp:
		lamp.light_energy = 0.6


## Bouteille d'oxygène qui explose près de lui : sonné.
func on_explosion(k: float) -> void:
	if state == State.DEAD:
		return
	if not active:
		activate()
	_stun_t = maxf(_stun_t, 1.2 + 1.8 * k)
	_cancel_charge()


## Décharge électrique (disjoncteur actionné quand il se tient dans l'eau).
func electrocute() -> void:
	if state == State.DEAD:
		return
	if not active:
		activate()
	_electro_t = 3.2
	_stun_t = 3.4
	_cancel_charge()
	Audio.play_3d("surgeon_hurt", global_position + Vector3.UP * 2.0, 6.0, 0.0, 50.0, 8.0)
	hp -= ELECTRO_DAMAGE
	_hit_flash = 1.0
	boss_hp_changed.emit(maxf(hp, 0.0), max_hp)
	if hp <= 0.0:
		die()


func _cancel_charge() -> void:
	_roar_t = -1.0
	_charge_t = -1.0


func _net_extra() -> Array:
	return [active, _roar_t >= 0.0, _charge_t >= 0.0, _stun_t, _electro_t]


func _net_apply_extra(a: Array) -> void:
	if a.size() < 5:
		return
	active = bool(a[0])
	_roar_t = 0.1 if bool(a[1]) else -1.0
	_charge_t = 0.1 if bool(a[2]) else -1.0
	_stun_t = float(a[3])
	_electro_t = float(a[4])


func _puppet_custom(delta: float) -> bool:
	_stun_t = maxf(_stun_t - delta, 0.0)
	_electro_t = maxf(_electro_t - delta, 0.0)
	if _scrape:
		_scrape.volume_db = lerpf(_scrape.volume_db, -8.0 if _speed_now > 0.3 else -60.0, delta * 4.0)
	if lamp:
		lamp.light_energy = lerpf(lamp.light_energy, 2.6, delta * 6.0)
	if _saw:
		_saw.rotation.y += delta * (30.0 if state == State.ATTACK or _charge_t >= 0.0 else 4.0)
	if not active:
		_animate_idle_operating(delta)
		return true
	return false


func _physics_process(delta: float) -> void:
	if net_puppet:
		_puppet_process(delta)
		return
	# Boucles sonores : grattement de la lame quand il marche
	if _scrape and state != State.DEAD:
		var want := -8.0 if _speed_now > 0.3 else -60.0
		_scrape.volume_db = lerpf(_scrape.volume_db, want, delta * 4.0)
	if state == State.DEAD:
		if _breath and _breath.playing:
			_breath.stop()
			_scrape.stop()
		if lamp:
			lamp.light_energy = lerpf(lamp.light_energy, 0.0, delta * 0.8)
		super._physics_process(delta)
		return
	if lamp:
		lamp.light_energy = lerpf(lamp.light_energy, 2.6 * (0.6 + randf() * 0.4 if _electro_t > 0.0 else 1.0), delta * 6.0)
	if _saw:
		_saw.rotation.y += delta * (30.0 if state == State.ATTACK or _charge_t >= 0.0 else 4.0)
	if not active:
		_animate_idle_operating(delta)
		return
	charge_cd = maxf(charge_cd - delta, 0.0)
	_electro_t = maxf(_electro_t - delta, 0.0)
	if _stun_t > 0.0:
		_stun_t -= delta
		_stagger_t = _stun_t
		velocity.x = move_toward(velocity.x, 0.0, delta * 10.0)
		velocity.z = move_toward(velocity.z, 0.0, delta * 10.0)
		velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
		move_and_slide()
		_animate(delta)
		return
	# Rugissement puis charge
	if _roar_t >= 0.0:
		_roar_t += delta
		velocity = Vector3(0, -0.5, 0)
		move_and_slide()
		var p := player()
		if p:
			var tp := p.global_position - global_position
			facing = lerp_angle(facing, atan2(-tp.x, -tp.z), 1.0 - exp(-8.0 * delta))
			rig.rotation.y = facing
		if _roar_t >= ROAR_TIME:
			_roar_t = -1.0
			_charge_t = 0.0
			_charge_hit = false
			_charge_dir = Basis(Vector3.UP, facing) * Vector3.FORWARD
		_animate(delta)
		return
	if _charge_t >= 0.0:
		_update_charge(delta)
		_animate(delta)
		return
	# Décision de charger
	if state == State.CHASE and charge_cd <= 0.0 and _sees_player:
		var p2 := player()
		if p2:
			var d := global_position.distance_to(p2.global_position)
			if d > 4.5 and d < 11.0:
				_roar_t = 0.0
				charge_cd = randf_range(6.0, 9.0)
				Audio.play_3d("surgeon_roar", global_position + Vector3.UP * 2.1, 4.0, 0.03, 50.0, 6.0)
				if p2.camera_rig:
					p2.camera_rig.shake(0.35)
				_animate(delta)
				return
	super._physics_process(delta)


func _update_charge(delta: float) -> void:
	_charge_t += delta
	var v := _charge_dir * CHARGE_SPEED
	velocity.x = v.x
	velocity.z = v.z
	velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
	move_and_slide()
	_speed_now = CHARGE_SPEED
	var p := player()
	if p and not _charge_hit and not p.is_dead:
		if global_position.distance_to(p.global_position) < 1.5:
			_charge_hit = true
			p.take_damage(30.0, global_position)
			p.velocity += _charge_dir * 6.0
			Audio.play_3d("hit_flesh", p.global_position + Vector3.UP, 2.0, 0.05, 20.0, 4.0)
	# Collision frontale contre un mur : étourdi
	for i in get_slide_collision_count():
		var c := get_slide_collision(i)
		if c.get_normal().dot(_charge_dir) < -0.6 and not (c.get_collider() is Player):
			_charge_t = -1.0
			_stun_t = 1.6
			Audio.play_3d("impact_heavy", global_position + Vector3.UP, 4.0, 0.05, 35.0, 6.0)
			if p and p.camera_rig:
				p.camera_rig.shake(0.5)
			return
	if _charge_t >= CHARGE_TIME or _charge_hit:
		_charge_t = -1.0
		_stun_t = 0.5


func _animate_idle_operating(delta: float) -> void:
	# Penché sur la table, il « opère »
	var t := Time.get_ticks_msec() * 0.001
	rig.reset_pose()
	rig.pose("spine", Vector3(-0.5, 0, 0))
	rig.pose("shoulder_r", Vector3(1.0 + sin(t * 2.3) * 0.25, 0, 0.1))
	rig.pose("elbow_r", Vector3(0.9 + sin(t * 2.3) * 0.2, 0, 0))
	rig.pose("shoulder_l", Vector3(0.9 + sin(t * 1.7 + 1.0) * 0.15, 0, -0.1))
	rig.pose("elbow_l", Vector3(1.1, 0, 0))
	rig.pose("head", Vector3(0.5, sin(t * 0.4) * 0.2, 0))
	rig.apply(delta)
	_voice_t -= delta
	if _voice_t <= 0.0:
		_voice_t = randf_range(4.0, 8.0)
		Audio.play_3d("surgeon_mutter", global_position + Vector3.UP * 2.0, -6.0, 0.1, 25.0, 4.0)


func _animate(delta: float) -> void:
	rig.reset_pose()
	var t := Time.get_ticks_msec() * 0.001
	if _electro_t > 0.0:
		# Convulsions
		for j in ["spine", "chest", "head", "shoulder_l", "shoulder_r", "elbow_l", "elbow_r", "knee_l", "knee_r"]:
			rig.joints[j].rotation = Vector3(randf_range(-0.4, 0.4), randf_range(-0.4, 0.4), randf_range(-0.4, 0.4))
		return
	if _stun_t > 0.0:
		rig.pose("spine", Vector3(-0.9, 0, 0.15))
		rig.pose("head", Vector3(0.6, 0, 0))
		rig.pose("shoulder_l", Vector3(0.3, 0, -0.2))
		rig.pose("shoulder_r", Vector3(0.2, 0, 0.2))
		rig.pose("knee_l", Vector3(-0.5, 0, 0))
		rig.pose("knee_r", Vector3(-0.5, 0, 0))
		rig.apply(delta)
		return
	if _roar_t >= 0.0:
		rig.pose("spine", Vector3(0.2, 0, 0))
		rig.pose("head", Vector3(-0.7, 0, 0))
		rig.pose("shoulder_l", Vector3(0.4, 0, -1.3))
		rig.pose("shoulder_r", Vector3(0.4, 0, 1.3))
		rig.apply(delta, 2.0)
		return
	if _charge_t >= 0.0:
		_phase += delta * 14.0
		rig.walk_cycle(_phase, 1.2, 0.5)
		rig.pose("spine", Vector3(-0.8, 0, 0))
		rig.pose("shoulder_l", Vector3(1.3, 0, -0.6))
		rig.pose("shoulder_r", Vector3(1.3, 0, 0.6))
		rig.apply(delta, 2.0)
		return
	if state == State.ATTACK:
		if _attack_t < attack_windup:
			var k := clampf(_attack_t / attack_windup, 0.0, 1.0)
			rig.pose("shoulder_r", Vector3(lerpf(0.6, 2.9, k), 0, 0.2))
			rig.pose("elbow_r", Vector3(0.4, 0, 0))
			rig.pose("spine", Vector3(-0.2 + 0.3 * k, -0.3 * k, 0))
			rig.pose("shoulder_l", Vector3(0.8, 0, -0.4))
		else:
			var k2 := clampf((_attack_t - attack_windup) / 0.22, 0.0, 1.0)
			rig.pose("shoulder_r", Vector3(lerpf(2.9, 0.4, k2), 0, 0.1))
			rig.pose("elbow_r", Vector3(0.1, 0, 0))
			rig.pose("spine", Vector3(-0.8, 0.3, 0))
			rig.pose("shoulder_l", Vector3(0.6, 0, -0.3))
		rig.apply(delta, 1.6)
		return
	if _speed_now > 0.15:
		_phase += _speed_now * delta * TAU / 1.9
		rig.walk_cycle(_phase, 0.8, 0.3, 0.7)
		rig.pose("shoulder_r", Vector3(0.35, 0, 0.25))
		rig.pose("elbow_r", Vector3(0.1, 0, 0))
		rig.pose("shoulder_l", Vector3(0.7 + sin(_phase) * 0.1, 0, -0.35))
		rig.pose("elbow_l", Vector3(0.8, 0, 0))
		rig.pose("spine", Vector3(-0.55, 0, sin(_phase) * 0.12))
		rig.pose("head", Vector3(0.45, sin(t * 0.8) * 0.3, 0))
		rig.joint("hips").position.y = rig.base_hips_height - absf(sin(_phase)) * 0.08
	else:
		rig.pose("shoulder_r", Vector3(0.3, 0, 0.3))
		rig.pose("shoulder_l", Vector3(0.6, 0, -0.35))
		rig.pose("elbow_l", Vector3(0.9, 0, 0))
		rig.pose("head", Vector3(0.3, sin(t * 0.9) * 0.6, 0))
	rig.apply(delta, 0.8)


func _animate_death(delta: float) -> void:
	var t := clampf(_death_t / 2.2, 0.0, 1.0)
	rig.reset_pose()
	if t < 0.5:
		# Il tombe d'abord à genoux…
		rig.pose("knee_l", Vector3(-1.6, 0, 0))
		rig.pose("knee_r", Vector3(-1.6, 0, 0))
		rig.pose("hip_l", Vector3(1.4, 0, 0))
		rig.pose("hip_r", Vector3(1.4, 0, 0))
		rig.pose("spine", Vector3(0.3, 0, 0))
		rig.pose("head", Vector3(-0.6, 0, 0))
		rig.pose("shoulder_l", Vector3(0.2, 0, -0.8))
		rig.pose("shoulder_r", Vector3(0.2, 0, 0.8))
		rig.position.y = lerpf(0.0, -0.75, clampf(t * 2.0, 0.0, 1.0))
	else:
		# … puis s'effondre face contre terre
		var e := (t - 0.5) * 2.0
		rig.pose("knee_l", Vector3(-1.2, 0, 0))
		rig.pose("knee_r", Vector3(-1.0, 0, 0))
		rig.pose("shoulder_l", Vector3(2.4, 0, -0.5))
		rig.pose("shoulder_r", Vector3(2.2, 0, 0.6))
		rig.rotation.x = lerpf(0.0, -PI / 2.0 + 0.15, e * e)
		rig.position.y = lerpf(-0.75, 0.3, e)
	rig.apply(delta, 0.6)
	if _death_t > 1.9 and _death_t - delta <= 1.9:
		Audio.play_3d("impact_heavy", global_position, 6.0, 0.0, 40.0, 6.0)
		var p := player()
		if p and p.camera_rig:
			p.camera_rig.shake(0.6)

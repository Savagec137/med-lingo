class_name Player
extends CharacterBody3D
## Thomas Reed. Déplacement relatif à la caméra, course, esquive, visée,
## cinq armes (tir, frappe, rechargement), lampe torche, interactions, santé
## et mort. Vue première ou troisième personne (V).

signal died

const WALK_SPEED := 2.3
const RUN_SPEED := 4.7
const AIM_SPEED := 1.3
const ACCEL := 9.0
const DECEL := 11.0
const GRAVITY := 22.0
const TURN_SPEED := 10.0
const DODGE_SPEED := 7.0
const DODGE_TIME := 0.4
const DODGE_COOLDOWN := 0.9
const STRIDE_WALK := 0.8
const STRIDE_RUN := 1.2

const THOMAS := {
	"height": 1.0, "bulk": 1.0, "shoulder_width": 1.05,
	"mat_torso": "cloth_jacket", "mat_arms": "cloth_jacket", "mat_forearms": "cloth_jacket",
	"mat_legs": "cloth_jeans", "mat_skin": "skin_human", "mat_feet": "leather_boots",
	"mat_hair": "hair_dark", "hair": true, "torso_shape": "jacket",
}

## Numéro du joueur (1 = hôte / solo, 2 = invité) et ses données.
var slot := 1
var data: PlayerData
## Joueur de cette machine (entrées, caméra) ; sinon réplique réseau.
var is_local := true

var camera_rig: PlayerCamera
var rig: HumanoidRig
var flashlight: Flashlight
var weapons: Weapons
var view_model: ViewModel
var controls_enabled := true
var is_dead := false
var aiming := false
var aim_blend := 0.0
var running := false
var focused: Interactable = null
var surface := "concrete"
var facing_yaw := 0.0
var aim_point := Vector3.ZERO
var aim_pitch := 0.0

var _dodge_timer := 0.0
var _dodge_cd := 0.0
var _dodge_dir := Vector3.ZERO
var _invuln := 0.0
var _hurt := 0.0
var _stride := 0.0
var _phase := 0.0
var _quick_aim := 0.0
var _pending_shot := false
var _death_t := 0.0
var _focus_timer := 0.0
var _heal_cd := 0.0
var _breath_level := 0.0
var _move_speed := 0.0
var _fire_was_down := false


func _ready() -> void:
	if data == null:
		data = GameState.data(slot)
	collision_layer = 2
	collision_mask = 1 | 4 | 16
	floor_max_angle = deg_to_rad(46.0)
	floor_snap_length = 0.45
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.32
	cap.height = 1.78
	cs.shape = cap
	cs.position.y = 0.89
	add_child(cs)

	rig = HumanoidRig.new()
	rig.name = "Rig"
	add_child(rig)
	rig.build(THOMAS)
	rig.set_render_layers(2)

	weapons = Weapons.new()
	weapons.name = "Weapons"
	add_child(weapons)
	weapons.setup(self, rig.joint("wrist_r"), null)

	flashlight = Flashlight.new()
	flashlight.owner_player = self
	rig.joint("chest").add_child(flashlight)
	flashlight.position = Vector3(-0.16, 0.12, -0.12)
	_update_equipment_visibility()
	if is_local:
		GameState.player = self
	data.changed.connect(_on_data_changed)
	GameState.flag_changed.connect(func(f: String, _v: Variant) -> void:
		if f == "has_flashlight":
			_update_equipment_visibility())


func _on_data_changed(what: String) -> void:
	match what:
		"inventory":
			_update_equipment_visibility()
		"weapons":
			_on_weapons_changed()


## Message pour CE joueur (écran local, ou envoyé à son propriétaire en coop).
func notify(text: String, duration: float = 3.0, sound: String = "") -> void:
	if is_local:
		if sound != "":
			Audio.play_2d(sound, -4.0)
		GameState.show_message(text, duration)
	elif GameState.game and GameState.game.has_method("notify_player"):
		GameState.game.notify_player(slot, text, duration, sound)


## Relie la caméra : bras et arme à l'écran pour la vue première personne.
func attach_camera(c: PlayerCamera) -> void:
	camera_rig = c
	view_model = ViewModel.new()
	view_model.name = "ViewModel"
	c.cam.add_child(view_model)
	weapons.view = view_model
	view_model.set_weapon(weapons.current)
	_on_view_changed(c.first_person)


func _on_weapons_changed() -> void:
	if weapons and data.equipped != weapons.current:
		weapons.equip(data.equipped, true)
	_update_equipment_visibility()


func is_first_person() -> bool:
	return camera_rig != null and camera_rig.first_person


## Appelé par la caméra quand la vue change : la lampe suit les yeux en 1re personne.
func _on_view_changed(fp: bool) -> void:
	if flashlight == null or camera_rig == null:
		return
	if fp:
		flashlight.reparent(camera_rig.cam, false)
		flashlight.position = Vector3(0.22, -0.16, -0.05)
	else:
		flashlight.reparent(rig.joint("chest"), false)
		flashlight.position = Vector3(-0.16, 0.12, -0.12)
	if view_model:
		view_model.visible = fp


## Une arme est-elle en main ?
func is_armed() -> bool:
	return weapons != null and weapons.current != ""


## Compatibilité : ancien nom de is_armed().
func has_pistol() -> bool:
	return is_armed()


func _update_equipment_visibility() -> void:
	if weapons and weapons.world_model:
		weapons.world_model.visible = is_armed()
	if flashlight:
		flashlight.visible = GameState.get_flag("has_flashlight")


func camera_yaw() -> float:
	return camera_rig.yaw if camera_rig else 0.0


func _unhandled_input(event: InputEvent) -> void:
	if is_dead or not controls_enabled or get_tree().paused:
		return
	if event.is_action_pressed("interact"):
		try_interact()
	elif event.is_action_pressed("reload"):
		if is_armed():
			weapons.start_reload()
	elif event.is_action_pressed("toggle_view"):
		Settings.set_value("camera_view", Settings.View.THIRD_PERSON if is_first_person() else Settings.View.FIRST_PERSON)
	elif event.is_action_pressed("weapon_next"):
		weapons.cycle(1)
	elif event.is_action_pressed("weapon_prev"):
		weapons.cycle(-1)
	elif event.is_action_pressed("flashlight"):
		if GameState.get_flag("has_flashlight"):
			flashlight.toggle()
	elif event.is_action_pressed("dodge"):
		try_dodge()
	elif _weapon_key(event) >= 0:
		weapons.equip(WeaponDB.ORDER[_weapon_key(event)])
	elif event.is_action_pressed("quick_heal"):
		use_heal()


func _weapon_key(event: InputEvent) -> int:
	for i in WeaponDB.ORDER.size():
		if event.is_action_pressed("weapon_%d" % (i + 1)):
			return i
	return -1


func try_interact() -> void:
	if focused and focused.can_interact():
		focused.interact(self)


func try_dodge() -> void:
	if _dodge_cd > 0.0 or not is_on_floor():
		return
	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var dir := Basis(Vector3.UP, camera_yaw()) * Vector3(input.x, 0, input.y)
	if dir.length() < 0.1:
		dir = Basis(Vector3.UP, facing_yaw) * Vector3(0, 0, 1)
	_dodge_dir = dir.normalized()
	_dodge_timer = DODGE_TIME
	_dodge_cd = DODGE_COOLDOWN
	_invuln = 0.32
	weapons.cancel_reload()
	Audio.play_3d("dodge", global_position + Vector3.UP, -6.0, 0.08, 10.0, 2.0)


func use_heal() -> bool:
	if _heal_cd > 0.0 or not data.has_item("spray"):
		return false
	if data.hp >= PlayerData.MAX_HP:
		notify("Santé déjà au maximum.", 2.0)
		return false
	data.remove_item("spray", 1)
	data.set_hp(data.hp + float(ItemDB.get_item("spray").heal))
	_heal_cd = 1.0
	if is_local:
		Audio.play_2d("spray", -2.0)
	notify("Medical Spray utilisé. +40 PV", 2.0)
	return true


func _physics_process(delta: float) -> void:
	if is_dead:
		_animate_death(delta)
		velocity.x = move_toward(velocity.x, 0.0, DECEL * delta)
		velocity.z = move_toward(velocity.z, 0.0, DECEL * delta)
		velocity.y -= GRAVITY * delta
		move_and_slide()
		return
	_dodge_cd = maxf(_dodge_cd - delta, 0.0)
	_invuln = maxf(_invuln - delta, 0.0)
	_hurt = maxf(_hurt - delta, 0.0)
	_heal_cd = maxf(_heal_cd - delta, 0.0)

	var input := Vector2.ZERO
	var want_aim := false
	var want_run := false
	var fire_down := Input.is_action_pressed("fire") and controls_enabled
	var fire_edge := fire_down and not _fire_was_down
	_fire_was_down = fire_down
	if controls_enabled:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		want_aim = Input.is_action_pressed("aim") and is_armed() and not weapons.is_melee()
		want_run = Input.is_action_pressed("run")
		if is_armed() and (fire_edge or (fire_down and (weapons.is_auto() or weapons.is_melee()))):
			if weapons.is_melee():
				_do_fire()
			elif not _pending_shot and weapons.can_fire():
				_pending_shot = true
				_quick_aim = 0.6
	_quick_aim = maxf(_quick_aim - delta, 0.0)
	aiming = (want_aim or _quick_aim > 0.0) and _dodge_timer <= 0.0 and not weapons.reloading and not weapons.is_melee()
	aim_blend = move_toward(aim_blend, 1.0 if aiming else 0.0, delta * 7.0)
	if camera_rig:
		camera_rig.aiming = aiming

	var cam_basis := Basis(Vector3.UP, camera_yaw())
	var move_dir := cam_basis * Vector3(input.x, 0, input.y)
	var target_speed := 0.0
	running = false
	if _dodge_timer > 0.0:
		_dodge_timer -= delta
		var t := _dodge_timer / DODGE_TIME
		var v := _dodge_dir * DODGE_SPEED * (0.35 + t * 0.9)
		velocity.x = v.x
		velocity.z = v.z
	else:
		if move_dir.length() > 0.05:
			if aiming:
				target_speed = AIM_SPEED
			elif want_run:
				target_speed = RUN_SPEED
				running = true
			else:
				target_speed = WALK_SPEED
			if _hurt > 0.0:
				target_speed *= 0.6
			if data.hp < 30.0:
				target_speed *= 0.82
		var want_v := move_dir.normalized() * target_speed * minf(move_dir.length(), 1.0)
		var accel := ACCEL if want_v.length() > 0.01 else DECEL
		velocity.x = move_toward(velocity.x, want_v.x, accel * delta * maxf(target_speed, 2.0))
		velocity.z = move_toward(velocity.z, want_v.z, accel * delta * maxf(target_speed, 2.0))

	if is_on_floor():
		velocity.y = -0.5
	else:
		velocity.y -= GRAVITY * delta
	move_and_slide()

	# Orientation du corps
	var hvel := Vector3(velocity.x, 0, velocity.z)
	_move_speed = hvel.length()
	if is_first_person():
		facing_yaw = lerp_angle(facing_yaw, camera_yaw(), 1.0 - exp(-30.0 * delta))
	elif aiming:
		facing_yaw = lerp_angle(facing_yaw, camera_yaw(), 1.0 - exp(-18.0 * delta))
	elif _dodge_timer <= 0.0 and hvel.length() > 0.3:
		var want := atan2(-hvel.x, -hvel.z)
		facing_yaw = lerp_angle(facing_yaw, want, 1.0 - exp(-TURN_SPEED * delta))
	rig.rotation.y = facing_yaw

	_update_aim(delta)
	if _pending_shot and (aim_blend > 0.75 or is_first_person()):
		_pending_shot = false
		_do_fire()
	elif _pending_shot and not is_armed():
		_pending_shot = false
	if view_model:
		view_model.visible = is_first_person() and is_armed() and not is_dead
		view_model.aiming = Input.is_action_pressed("aim") and aiming
		view_model.update(delta, camera_yaw(), camera_rig.pitch if camera_rig else 0.0, _move_speed, running)

	_footsteps(delta, hvel.length())
	_animate(delta, hvel.length())
	_update_focus(delta)
	_update_breathing(delta)


func _update_aim(delta: float) -> void:
	if camera_rig == null:
		return
	var cam := camera_rig.cam
	var origin := cam.global_position
	var fwd := -cam.global_transform.basis.z
	# Le rayon part à hauteur du joueur pour ignorer ce qui est derrière lui
	var along := (global_position + Vector3.UP * 1.4 - origin).dot(fwd)
	var start := origin + fwd * maxf(along, 0.0)
	var q := PhysicsRayQueryParameters3D.create(start, start + fwd * 40.0, 1 | 8 | 16)
	q.collide_with_areas = true
	q.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	aim_point = hit.position if not hit.is_empty() else start + fwd * 40.0
	aim_pitch = camera_rig.pitch
	if flashlight:
		var from := flashlight.global_position
		var dir := aim_point - from
		if dir.length() < 1.5:
			dir = fwd
		flashlight.update_light(delta, dir.normalized())


func _do_fire() -> void:
	var cam := camera_rig.cam
	var fwd := -cam.global_transform.basis.z
	var origin := cam.global_position
	var along := (global_position + Vector3.UP * 1.4 - origin).dot(fwd)
	origin += fwd * maxf(along, 0.0)
	var aimed := Input.is_action_pressed("aim")
	if weapons.trigger(origin, fwd, aimed, _move_speed > 0.5, [get_rid()]) and not weapons.is_melee():
		var d := weapons.def()
		camera_rig.kick(float(d.get("recoil", 0.035)))
		camera_rig.shake(float(d.get("shake", 0.18)))
		_quick_aim = maxf(_quick_aim, 0.5)


func _footsteps(delta: float, speed: float) -> void:
	if not is_on_floor() or speed < 0.4:
		_stride = 0.0
		return
	_stride += speed * delta
	var stride_len := STRIDE_RUN if running else STRIDE_WALK
	if _stride >= stride_len:
		_stride -= stride_len
		var vol := -4.0 if running else -12.0
		if aiming:
			vol = -16.0
		Audio.play_3d("step_" + surface, global_position + Vector3.UP * 0.1, vol, 0.1, 18.0, 3.0)
		var noise := 11.0 if running else (1.5 if aiming else 3.0)
		GameState.emit_noise(global_position, noise, self)


func _update_focus(delta: float) -> void:
	_focus_timer -= delta
	if _focus_timer > 0.0:
		return
	_focus_timer = 0.08
	var best: Interactable = null
	var best_score := INF
	var me := global_position + Vector3.UP * 1.1
	var look := Basis(Vector3.UP, facing_yaw) * Vector3.FORWARD
	var cam_look := -camera_rig.cam.global_transform.basis.z if camera_rig else look
	cam_look.y = 0.0
	cam_look = cam_look.normalized()
	for n in get_tree().get_nodes_in_group("interactable"):
		var it := n as Interactable
		if it == null or not it.can_interact():
			continue
		var fp := it.focus_position()
		var to := fp - me
		var flat := Vector2(to.x, to.z)
		var dist := flat.length()
		if dist > it.interact_radius or absf(to.y) > 1.6:
			continue
		var dir3 := Vector3(to.x, 0, to.z).normalized() if dist > 0.01 else look
		var facing := maxf(look.dot(dir3), cam_look.dot(dir3))
		if dist > 0.7 and facing < 0.35:
			continue
		var score := dist - facing * 0.8
		if score < best_score:
			# Ligne de vue (les murs bloquent, pas l'objet lui-même)
			var q := PhysicsRayQueryParameters3D.create(me, fp, 1)
			q.exclude = [get_rid()]
			var hit := get_world_3d().direct_space_state.intersect_ray(q)
			if not hit.is_empty() and (hit.position as Vector3).distance_to(fp) > 0.45:
				continue
			best = it
			best_score = score
	focused = best


func _update_breathing(delta: float) -> void:
	var want := 0.0
	if data.hp < 30.0:
		want = 0.55
	_breath_level = move_toward(_breath_level, want, delta * 0.5)
	Audio.set_loop("heartbeat", _breath_level, 1.0, "SFX")


func take_damage(amount: float, from: Vector3, _kind: String = "melee") -> void:
	if is_dead or _invuln > 0.0 or DebugTools.god_mode:
		return
	# Portes de l'ascenseur refermées : plus rien ne peut l'atteindre
	if GameState.game and GameState.game.get("traveling") == true and amount < 1000.0:
		return
	amount *= Settings.damage_taken_mult()
	data.set_hp(data.hp - amount)
	_hurt = 0.45
	_invuln = 0.5
	weapons.delay_reload(0.35)
	var push := (global_position - from)
	push.y = 0.0
	if push.length() > 0.01:
		velocity += push.normalized() * 3.5
	if camera_rig:
		camera_rig.shake(0.45)
	Audio.play_2d("player_hurt", -2.0)
	if GameState.game and GameState.game.has_method("on_player_hurt"):
		GameState.game.on_player_hurt(amount)
	if data.hp <= 0.0:
		die()


func die() -> void:
	if is_dead:
		return
	is_dead = true
	controls_enabled = false
	aiming = false
	if camera_rig:
		camera_rig.aiming = false
		# La mort se regarde de l'extérieur
		if camera_rig.first_person:
			camera_rig.set_first_person(false)
	Audio.play_2d("player_death", 0.0)
	Audio.set_loop("heartbeat", 0.0, 0.5, "SFX")
	died.emit()


func _animate(delta: float, speed: float) -> void:
	rig.reset_pose()
	var run_k := clampf((speed - WALK_SPEED) / (RUN_SPEED - WALK_SPEED), 0.0, 1.0)
	if speed > 0.2:
		var stride := lerpf(STRIDE_WALK, STRIDE_RUN, run_k)
		_phase += speed / (stride * 2.0) * TAU * delta
		var amp := clampf(speed / WALK_SPEED, 0.0, 1.0) * lerpf(0.75, 1.25, run_k)
		rig.walk_cycle(_phase, amp, 1.0 - aim_blend * 0.8)
		rig.pose("spine", Vector3(-0.05 - run_k * 0.18, 0, 0))
		rig.joint("hips").position.y = rig.base_hips_height - absf(sin(_phase)) * 0.035 * amp
	else:
		_phase = 0.0
		var br := sin(Time.get_ticks_msec() * 0.0022)
		rig.pose("chest", Vector3(br * 0.02, 0, 0))
		rig.pose("shoulder_l", Vector3(0.05, 0, -0.1))
		rig.pose("shoulder_r", Vector3(0.05, 0, 0.1))
		rig.pose("elbow_l", Vector3(0.18, 0, 0))
		rig.pose("elbow_r", Vector3(0.18, 0, 0))
		rig.joint("hips").position.y = lerpf(rig.joint("hips").position.y, rig.base_hips_height, 0.2)

	# Visée : bras tendus vers la cible
	if aim_blend > 0.01:
		var p := clampf(aim_pitch, -0.9, 0.9)
		var ab := aim_blend
		rig.pose("shoulder_r", Vector3(lerpf(0.05, PI / 2.0 + p, ab), 0, lerpf(0.1, -0.12, ab)))
		rig.pose("elbow_r", Vector3(lerpf(0.2, 0.05, ab), 0, 0))
		rig.pose("shoulder_l", Vector3(lerpf(0.05, PI / 2.0 + p - 0.1, ab), 0, lerpf(-0.1, 0.55, ab)))
		rig.pose("elbow_l", Vector3(lerpf(0.2, 0.35, ab), 0, 0))
		rig.pose("chest", Vector3(p * 0.3 * ab, 0, 0))
		rig.pose("head", Vector3(p * 0.4 * ab, 0, 0))
	elif weapons._melee_t >= 0.0:
		# Coup de matraque : bras armé puis abattu en diagonale
		var mt := weapons._melee_t / 0.45
		var wind := smoothstep(0.0, 0.3, mt) * (1.0 - smoothstep(0.3, 0.6, mt))
		var strike := smoothstep(0.3, 0.6, mt) * (1.0 - smoothstep(0.75, 1.0, mt))
		rig.pose("shoulder_r", Vector3(1.2 + 1.2 * wind - 0.6 * strike, 0.3 * wind, 0.5 * wind - 0.3 * strike))
		rig.pose("elbow_r", Vector3(1.0 * wind + 0.2, 0, 0))
		rig.pose("chest", Vector3(0, 0.4 * wind - 0.5 * strike, 0))
	elif weapons.reloading:
		rig.pose("shoulder_r", Vector3(0.9, 0, -0.2))
		rig.pose("elbow_r", Vector3(1.0, 0, 0))
		var jiggle := sin(weapons.reload_timer * 12.0) * 0.15
		rig.pose("shoulder_l", Vector3(0.7 + jiggle, 0, 0.3))
		rig.pose("elbow_l", Vector3(1.2, 0, 0))
	elif is_armed():
		# Arme tenue basse, canon vers le sol
		rig.pose("shoulder_r", Vector3(0.35, 0, 0.12))
		rig.pose("elbow_r", Vector3(0.55, 0, 0))

	if _dodge_timer > 0.0:
		rig.pose("spine", Vector3(-0.45, 0, 0))
		rig.pose("hip_l", Vector3(0.7, 0, 0))
		rig.pose("hip_r", Vector3(-0.2, 0, 0))
		rig.pose("knee_l", Vector3(-1.0, 0, 0))
		rig.pose("knee_r", Vector3(-0.8, 0, 0))
		rig.joint("hips").position.y = rig.base_hips_height - 0.25
	if _hurt > 0.0:
		rig.pose("spine", Vector3(0.25 * _hurt / 0.45, 0, 0))
		rig.pose("head", Vector3(0.3 * _hurt / 0.45, 0, 0))
	rig.apply(delta)


func _animate_death(delta: float) -> void:
	_death_t += delta
	var t := clampf(_death_t / 0.9, 0.0, 1.0)
	var e := t * t
	rig.reset_pose()
	rig.pose("knee_l", Vector3(-1.2, 0, 0))
	rig.pose("knee_r", Vector3(-0.9, 0, 0))
	rig.pose("shoulder_l", Vector3(0.4, 0, -0.9))
	rig.pose("shoulder_r", Vector3(0.2, 0, 1.0))
	rig.pose("head", Vector3(-0.3, 0.4, 0))
	rig.apply(delta, 0.6)
	rig.rotation.x = lerpf(0.0, -PI / 2.0 + 0.1, e)
	rig.position.y = lerpf(0.0, 0.15, e)
	if _death_t > 0.8 and _death_t - delta <= 0.8:
		Audio.play_3d("body_fall", global_position, 0.0, 0.05, 15.0, 3.0)
		if camera_rig:
			camera_rig.shake(0.3)


## Place le joueur (chargement de partie, téléportation d'événement).
func place(pos: Vector3, yaw: float) -> void:
	global_position = pos
	facing_yaw = yaw
	rig.rotation.y = yaw
	velocity = Vector3.ZERO
	if camera_rig:
		camera_rig.yaw = yaw
		camera_rig.global_position = pos + Vector3.UP * camera_rig.height

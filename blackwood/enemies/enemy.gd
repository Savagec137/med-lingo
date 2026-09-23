class_name Enemy
extends CharacterBody3D
## Créature : machine à états complète.
##   IDLE        immobile (ou allongée, « dormante », jusqu'à son réveil)
##   PATROL      parcourt ses points de ronde
##   INVESTIGATE se rend vers un bruit entendu
##   CHASE       poursuit le joueur repéré
##   ATTACK      frappe au corps-à-corps (armement, coup, récupération)
##   SEARCH      fouille les alentours de la dernière position connue
##   RETURN      regagne sa zone d'origine
##   DEAD        morte (définitivement : enregistré dans la sauvegarde)
## Sens : ouïe (bruits de pas, tirs, portes), vision courte (plus longue si la
## lampe torche du joueur est allumée), détection de proximité.

signal died(enemy: Enemy)
signal state_changed(enemy: Enemy, new_state: int)

enum State { IDLE, PATROL, INVESTIGATE, CHASE, ATTACK, SEARCH, RETURN, DEAD }
const STATE_NAMES := ["IDLE", "PATROL", "INVESTIGATE", "CHASE", "ATTACK", "SEARCH", "RETURN", "DEAD"]
## Hauteur maximale de la capsule de collision (sous le linteau des portes).
const MAX_COLLISION_HEIGHT := 2.1

var enemy_id := ""
var max_hp := 100.0
var hp := 100.0
var walk_speed := 1.1
var chase_speed := 2.4
var turn_speed := 6.0
var attack_range := 1.5
var attack_damage := 18.0
var attack_windup := 0.55
var attack_recovery := 0.7
var hearing_scale := 1.0
var vision_range := 7.0
var vision_range_lit := 11.0
var vision_fov := deg_to_rad(120.0)
var proximity := 2.2
var lose_time := 5.0
var search_time := 10.0
var give_up_distance := 24.0
var patrol_wait := 2.5
var stagger_chance := 0.6
var body_radius := 0.35
var body_height := 1.75

var home_pos := Vector3.ZERO
var home_rot := 0.0
var patrol_points: Array = []
var nav: NavGrid
var dormant := false
var wake_radius := 3.2
## Dormante qui ne se réveille que sur un événement (ni bruit ni proximité).
var deep_sleep := false
## Immobile et sourde jusqu'à son activation par un événement (infirmière du -1…).
var passive := false

var state: int = State.IDLE
var state_time := 0.0
var target_pos := Vector3.ZERO
var last_known := Vector3.ZERO
var facing := 0.0
var rig: HumanoidRig
var flesh_mat: ShaderMaterial

var _path := PackedVector3Array()
var _path_i := 0
var _path_goal := Vector3.INF
var _repath_t := 0.0
var _contact_t := 0.0
var _sense_t := 0.0
var _sees_player := false
var _patrol_i := 0
var _wait_t := 0.0
var _attack_t := 0.0
var _attack_hit := false
var _stagger_t := 0.0
var _hit_flash := 0.0
var _stuck_t := 0.0
var _stuck_pos := Vector3.ZERO
var _stuck_count := 0
var _voice_t := 3.0
var _step_accum := 0.0
var _phase := 0.0
var _rise_t := -1.0
var _death_t := 0.0
var _speed_now := 0.0
var _rng := RandomNumberGenerator.new()
var _hitboxes: Array[Area3D] = []


func _ready() -> void:
	add_to_group("enemies")
	_rng.randomize()
	# Difficulté : points de vie des créatures
	max_hp *= Settings.enemy_hp_mult()
	hp = max_hp
	collision_layer = 4
	collision_mask = 1 | 2 | 4 | 16
	floor_max_angle = deg_to_rad(46.0)
	floor_snap_length = 0.4
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = body_radius
	# Les baies de porte font 2,25 m : les grandes créatures (Chirurgien,
	# Colossus) se baissent pour passer — leur collision est plafonnée.
	cap.height = minf(body_height, MAX_COLLISION_HEIGHT)
	cs.shape = cap
	cs.position.y = cap.height * 0.5
	add_child(cs)
	_build_body()
	facing = home_rot
	rig.rotation.y = facing
	GameState.noise_emitted.connect(_on_noise)
	if dormant:
		_set_dormant_pose()
	_voice_t = _rng.randf_range(2.0, 8.0)


## À surcharger : construit le modèle (rig) et les zones de tir.
func _build_body() -> void:
	pass


func add_hitbox(joint_name: String, shape: Shape3D, offset: Vector3, is_head: bool) -> void:
	var area := Area3D.new()
	area.collision_layer = 8
	area.collision_mask = 0
	area.monitoring = false
	area.monitorable = true
	area.set_meta("enemy", self)
	area.set_meta("head", is_head)
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = offset
	area.add_child(cs)
	rig.joint(joint_name).add_child(area)
	_hitboxes.append(area)


func player() -> Player:
	return GameState.player as Player


func is_dead() -> bool:
	return state == State.DEAD


func set_state(s: int) -> void:
	if state == s or state == State.DEAD:
		return
	var prev := state
	state = s
	state_time = 0.0
	_wait_t = 0.0
	_path = PackedVector3Array()
	_path_goal = Vector3.INF
	if s == State.SEARCH:
		_pick_search_point()
	_on_state_enter(prev, s)
	state_changed.emit(self, s)


## Réactions sonores/visuelles aux changements d'état (surchargeable).
func _on_state_enter(prev: int, s: int) -> void:
	if s == State.CHASE and prev != State.ATTACK:
		_voice("alert")


func _voice(kind: String) -> void:
	pass


# --- Sens --------------------------------------------------------------------

func _on_noise(pos: Vector3, radius: float, source: Node) -> void:
	if state == State.DEAD or source == self or passive:
		return
	if dormant and deep_sleep:
		return
	if absf(pos.y - global_position.y) > 3.0:
		return
	var d := global_position.distance_to(pos)
	if d > radius * hearing_scale:
		return
	if dormant:
		if d < radius * hearing_scale * 0.6 or d < wake_radius:
			wake_up()
		return
	if _rise_t >= 0.0:
		return
	var from_player := source == GameState.player
	if from_player:
		last_known = pos
		_contact_t = 0.0
	match state:
		State.IDLE, State.PATROL, State.RETURN, State.SEARCH:
			target_pos = pos
			set_state(State.INVESTIGATE)
			_voice("hear")
		State.INVESTIGATE:
			target_pos = pos
			_path_goal = Vector3.INF
		State.CHASE:
			if from_player:
				last_known = pos


func _can_see_player() -> bool:
	var p := player()
	if p == null or p.is_dead:
		return false
	var eye := global_position + Vector3.UP * (body_height * 0.9)
	var target := p.global_position + Vector3.UP * 1.2
	if absf(target.y - eye.y) > 2.5:
		return false
	var to := target - eye
	var dist := to.length()
	var lit := GameState.flashlight_on and p.flashlight and p.flashlight.spot.visible
	var rng := vision_range_lit if lit else vision_range
	if dist > rng:
		return false
	if dist > proximity:
		var fwd := Basis(Vector3.UP, facing) * Vector3.FORWARD
		var flat := Vector3(to.x, 0, to.z).normalized()
		if fwd.angle_to(flat) > vision_fov * 0.5:
			return false
	var q := PhysicsRayQueryParameters3D.create(eye, target, 1 | 16)
	q.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	return hit.is_empty()


# --- Dégâts ---------------------------------------------------------------------

func take_damage(amount: float, hit_pos: Vector3, dir: Vector3, is_head: bool) -> void:
	if state == State.DEAD:
		return
	passive = false
	if dormant:
		deep_sleep = false
		wake_up()
	hp -= amount
	_hit_flash = 1.0
	velocity += Vector3(dir.x, 0, dir.z).normalized() * 1.2
	var p := player()
	if p:
		last_known = p.global_position
		_contact_t = 0.0
	if hp <= 0.0:
		die(dir)
		return
	_voice("hurt")
	if is_head or _rng.randf() < stagger_chance:
		_stagger_t = 0.45 if is_head else 0.3
		if state == State.ATTACK:
			set_state(State.CHASE)
	if state != State.ATTACK and _rise_t < 0.0:
		set_state(State.CHASE)


## Choc d'arme lourde : titube (power 0..1) et recule.
func stagger(power: float, dir: Vector3 = Vector3.ZERO, knockback: float = 0.0) -> void:
	if state == State.DEAD or power <= 0.0:
		return
	if _rng.randf() < power:
		_stagger_t = maxf(_stagger_t, 0.25 + power * 0.55)
		if state == State.ATTACK:
			set_state(State.CHASE)
	if knockback > 0.0:
		velocity += Vector3(dir.x, 0, dir.z).normalized() * knockback


func die(dir: Vector3 = Vector3.ZERO) -> void:
	if state == State.DEAD:
		return
	state = State.DEAD
	state_time = 0.0
	hp = 0.0
	GameState.dead_enemies[enemy_id] = true
	collision_layer = 0
	collision_mask = 1
	for h in _hitboxes:
		h.set_deferred("monitorable", false)
		for c in h.get_children():
			c.set_deferred("disabled", true)
	_voice("death")
	died.emit(self)
	state_changed.emit(self, state)


## Pose de cadavre immédiate (chargement d'une partie).
func set_dead_immediately() -> void:
	die()
	_death_t = 10.0
	_animate_death(1.0)


# --- Réveil (créature « dormante » allongée) -----------------------------------

func _set_dormant_pose() -> void:
	rig.rotation.x = -PI / 2.0
	rig.position.y = 0.25
	rig.reset_pose()
	rig.pose("shoulder_l", Vector3(0.2, 0, -0.3))
	rig.pose("shoulder_r", Vector3(0.2, 0, 0.3))
	rig.snap()


func wake_up() -> void:
	if not dormant:
		return
	dormant = false
	_rise_t = 0.0
	_voice("wake")


func _update_rise(delta: float) -> bool:
	if _rise_t < 0.0:
		return false
	_rise_t += delta
	var t := clampf(_rise_t / 1.5, 0.0, 1.0)
	var e := t * t * (3.0 - 2.0 * t)
	rig.rotation.x = lerpf(-PI / 2.0, 0.0, e)
	rig.position.y = lerpf(0.25, 0.0, e)
	rig.reset_pose()
	rig.pose("spine", Vector3(-0.6 * (1.0 - e), 0, 0))
	rig.pose("knee_l", Vector3(-1.2 * (1.0 - e), 0, 0))
	rig.pose("knee_r", Vector3(-0.8 * (1.0 - e), 0, 0))
	rig.pose("head", Vector3(sin(_rise_t * 9.0) * 0.3 * (1.0 - e), 0, 0))
	rig.apply(delta)
	if t >= 1.0:
		_rise_t = -1.0
		var p := player()
		if p:
			last_known = p.global_position
			target_pos = last_known
		set_state(State.CHASE if _can_see_player() else State.INVESTIGATE)
	return true


# --- Boucle principale -----------------------------------------------------------

func _physics_process(delta: float) -> void:
	if state == State.DEAD:
		_death_t += delta
		_animate_death(delta)
		velocity = velocity.move_toward(Vector3.ZERO, delta * 8.0)
		velocity.y -= 20.0 * delta
		move_and_slide()
		return
	_hit_flash = maxf(_hit_flash - delta * 5.0, 0.0)
	if flesh_mat:
		flesh_mat.set_shader_parameter("hit_flash", _hit_flash)
	if dormant:
		_check_dormant_wake()
		return
	if _update_rise(delta):
		return
	if passive:
		_passive_idle(delta)
		return
	var p := player()
	var far := p == null or global_position.distance_to(p.global_position) > 45.0
	state_time += delta
	_sense_t -= delta
	if _sense_t <= 0.0:
		_sense_t = 0.15 if not far else 0.6
		_sees_player = not far and _can_see_player()
		if _sees_player:
			last_known = p.global_position
			_contact_t = 0.0
			if state != State.CHASE and state != State.ATTACK:
				set_state(State.CHASE)
	_contact_t += delta
	_stagger_t = maxf(_stagger_t - delta, 0.0)

	var move_target := Vector3.INF
	var speed := 0.0
	match state:
		State.IDLE:
			if not patrol_points.is_empty() and state_time > patrol_wait:
				set_state(State.PATROL)
		State.PATROL:
			if patrol_points.is_empty():
				# Pas de ronde définie : errance autour de son poste
				patrol_points = [home_pos, nav.random_point_near(home_pos, 6.0, _rng) if nav else home_pos]
			var goal: Vector3 = patrol_points[_patrol_i % patrol_points.size()]
			if _flat_dist(goal) < 0.6:
				_patrol_i += 1
				set_state(State.IDLE)
			else:
				move_target = goal
				speed = walk_speed
		State.INVESTIGATE:
			if _wait_t > 0.0:
				# Arrivée sur le lieu du bruit : la créature s'immobilise et écoute
				_wait_t -= delta
				if _wait_t <= 0.0:
					last_known = target_pos
					set_state(State.SEARCH)
			elif _flat_dist(target_pos) < 1.0 or state_time > 15.0:
				_wait_t = 2.2
			else:
				move_target = target_pos
				speed = walk_speed * 1.25
		State.CHASE:
			if p == null or p.is_dead:
				set_state(State.RETURN)
			else:
				var d := global_position.distance_to(p.global_position)
				if d <= attack_range and _sees_player and _stagger_t <= 0.0:
					_start_attack()
				elif _contact_t > lose_time or d > give_up_distance:
					set_state(State.SEARCH)
				else:
					move_target = p.global_position if _sees_player else last_known
					speed = chase_speed
					if not _sees_player and _flat_dist(last_known) < 0.8:
						set_state(State.SEARCH)
		State.ATTACK:
			_update_attack(delta)
		State.SEARCH:
			if state_time > search_time:
				set_state(State.RETURN)
			elif _wait_t > 0.0:
				_wait_t -= delta
				if _wait_t <= 0.0:
					_pick_search_point()
			elif _flat_dist(target_pos) < 0.8:
				_wait_t = _rng.randf_range(1.0, 2.2)
			else:
				move_target = target_pos
				speed = walk_speed
		State.RETURN:
			if _flat_dist(home_pos) < 0.8:
				facing = lerp_angle(facing, home_rot, 0.1)
				set_state(State.IDLE if patrol_points.is_empty() else State.PATROL)
			else:
				move_target = home_pos
				speed = walk_speed

	if _stagger_t > 0.0:
		speed = 0.0
	_move(delta, move_target, speed)
	_ambient_voice(delta)
	_animate(delta)


## Immobile (passive) : reste sur place, animation d'attente.
func _passive_idle(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, delta * 8.0)
	velocity.z = move_toward(velocity.z, 0.0, delta * 8.0)
	velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
	move_and_slide()
	_speed_now = 0.0
	rig.rotation.y = facing
	_animate(delta)


## Sort de la passivité : la créature repère immédiatement le joueur.
func activate_hunt() -> void:
	passive = false
	if dormant:
		wake_up()
		return
	var p := player()
	if p:
		last_known = p.global_position
		target_pos = last_known
		_contact_t = 0.0
	set_state(State.CHASE)


func _pick_search_point() -> void:
	target_pos = nav.random_point_near(last_known, 5.0, _rng) if nav else last_known
	target_pos.y = global_position.y
	_path_goal = Vector3.INF


func _check_dormant_wake() -> void:
	if deep_sleep:
		return
	var p := player()
	if p == null or p.is_dead:
		return
	var d := global_position.distance_to(p.global_position)
	if d < wake_radius:
		wake_up()


func _flat_dist(pos: Vector3) -> float:
	return Vector2(global_position.x - pos.x, global_position.z - pos.z).length()


func _move(delta: float, goal: Vector3, speed: float) -> void:
	var want := Vector3.ZERO
	if goal != Vector3.INF and speed > 0.0:
		var next := _next_waypoint(goal)
		var to := next - global_position
		to.y = 0.0
		if to.length() > 0.05:
			want = to.normalized() * speed
		# Détection de blocage : on recalcule le chemin, puis on abandonne
		_stuck_t += delta
		if _stuck_t > 1.0:
			if global_position.distance_to(_stuck_pos) < 0.25:
				_stuck_count += 1
				_path_goal = Vector3.INF
				if _stuck_count >= 3:
					_stuck_count = 0
					if state == State.CHASE or state == State.INVESTIGATE:
						set_state(State.SEARCH)
					elif state == State.PATROL:
						_patrol_i += 1
						set_state(State.IDLE)
					elif state == State.SEARCH:
						_wait_t = 1.0
					elif state == State.RETURN:
						home_pos = global_position
			else:
				_stuck_count = 0
			_stuck_t = 0.0
			_stuck_pos = global_position
	var accel := 8.0
	velocity.x = move_toward(velocity.x, want.x, accel * delta * maxf(speed, 1.0))
	velocity.z = move_toward(velocity.z, want.z, accel * delta * maxf(speed, 1.0))
	if is_on_floor():
		velocity.y = -0.5
	else:
		velocity.y -= 20.0 * delta
	move_and_slide()
	_speed_now = Vector2(velocity.x, velocity.z).length()
	for i in get_slide_collision_count():
		var col := get_slide_collision(i).get_collider()
		if col is Node and (col as Node).has_meta("door"):
			var door: Door = (col as Node).get_meta("door")
			door.bump(self)
	# Orientation : vers la marche, ou vers le joueur quand on le voit
	var face_dir := Vector3(velocity.x, 0, velocity.z)
	if _sees_player and state == State.CHASE and player():
		var tp := player().global_position - global_position
		if tp.length() < 4.0:
			face_dir = Vector3(tp.x, 0, tp.z)
	if face_dir.length() > 0.2:
		facing = lerp_angle(facing, atan2(-face_dir.x, -face_dir.z), 1.0 - exp(-turn_speed * delta))
	rig.rotation.y = facing
	# Pas
	if _speed_now > 0.3:
		_step_accum += _speed_now * delta
		if _step_accum > 0.75:
			_step_accum = 0.0
			_footstep()


func _footstep() -> void:
	pass


func _next_waypoint(goal: Vector3) -> Vector3:
	if nav == null:
		return goal
	_repath_t -= get_physics_process_delta_time()
	var need := _path.is_empty() or _path_goal == Vector3.INF or _path_goal.distance_to(goal) > 1.0 or _repath_t <= 0.0
	if need:
		_path = nav.find_path(global_position, goal)
		_path_i = 0
		_path_goal = goal
		_repath_t = 0.5 if state == State.CHASE else 2.0
	while _path_i < _path.size() and _flat_dist(_path[_path_i]) < 0.45:
		_path_i += 1
	if _path_i >= _path.size():
		# Dernier tronçon direct si la cible est proche (le joueur hors grille, par ex.)
		return goal
	var wp := _path[_path_i]
	return Vector3(wp.x, global_position.y, wp.z)


func _ambient_voice(delta: float) -> void:
	_voice_t -= delta
	if _voice_t <= 0.0:
		_voice_t = _rng.randf_range(5.0, 11.0)
		if state != State.DEAD:
			_voice("idle" if state != State.CHASE else "chase")


# --- Attaque ----------------------------------------------------------------------

func _start_attack() -> void:
	set_state(State.ATTACK)
	_attack_t = 0.0
	_attack_hit = false
	_voice("attack")


func _update_attack(delta: float) -> void:
	_attack_t += delta
	var p := player()
	if p and _attack_t < attack_windup:
		var tp := p.global_position - global_position
		facing = lerp_angle(facing, atan2(-tp.x, -tp.z), 1.0 - exp(-10.0 * delta))
	if not _attack_hit and _attack_t >= attack_windup:
		_attack_hit = true
		_resolve_hit()
	if _attack_t >= attack_windup + attack_recovery:
		set_state(State.CHASE)


func _resolve_hit() -> void:
	var p := player()
	if p == null or p.is_dead:
		return
	var to := p.global_position - global_position
	var dist := Vector2(to.x, to.z).length()
	var fwd := Basis(Vector3.UP, facing) * Vector3.FORWARD
	var ang := fwd.angle_to(Vector3(to.x, 0, to.z).normalized())
	if dist <= attack_range + 0.45 and ang < deg_to_rad(75.0) and absf(to.y) < 1.5:
		p.take_damage(attack_damage * _rng.randf_range(0.85, 1.15), global_position)
		Audio.play_3d("hit_flesh", p.global_position + Vector3.UP * 1.2, 0.0, 0.08, 15.0, 3.0)
	else:
		Audio.play_3d("swing", global_position + Vector3.UP * 1.3, -4.0, 0.1, 12.0, 3.0)


# --- Animation (surchargée par chaque créature) ------------------------------------

func _animate(delta: float) -> void:
	rig.apply(delta)


func _animate_death(delta: float) -> void:
	var t := clampf(_death_t / 1.1, 0.0, 1.0)
	var e := t * t
	rig.reset_pose()
	rig.pose("knee_l", Vector3(-1.4, 0, 0))
	rig.pose("knee_r", Vector3(-0.6, 0, 0))
	rig.pose("shoulder_l", Vector3(0.6, 0, -1.1))
	rig.pose("shoulder_r", Vector3(-0.3, 0, 1.2))
	rig.pose("head", Vector3(0.4, 0.7, 0))
	rig.apply(delta, 0.5)
	rig.rotation.x = lerpf(0.0, PI / 2.0 - 0.08, e)
	rig.position.y = lerpf(0.0, 0.2, e)
	if _death_t > 1.0 and _death_t - delta <= 1.0:
		Audio.play_3d("body_fall", global_position, 0.0, 0.1, 18.0, 3.0)


## Téléportation (chargement / événement).
func place(pos: Vector3, rot: float) -> void:
	global_position = pos
	facing = rot
	if rig:
		rig.rotation.y = rot
	velocity = Vector3.ZERO


func debug_state() -> String:
	return "%s %s hp=%d" % [enemy_id, STATE_NAMES[state], int(hp)]

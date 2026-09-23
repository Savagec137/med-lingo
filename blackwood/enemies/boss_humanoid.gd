class_name BossHumanoid
extends Hollow
## Base des boss humanoïdes (Sarah, Patient Zéro) : bond, cri qui interrompt
## Thomas (rechargement, soin), et moments de lucidité à des seuils de vie —
## le combat raconte ce qu'ils étaient.

signal boss_hp_changed(hp: float, max_hp: float)
signal hesitated(count: int)

var lunge_speed := 8.0
var lunge_time := 0.5
var lunge_damage := 26.0
var lunge_min := 3.5
var lunge_max := 9.0
var scream_sound := "sarah_scream"
var scream_pitch := 1.0
var scream_damage := 5.0
var lucid_thresholds: Array = [0.66, 0.33]
var lucid_time := 4.0
var lucid_damage_mult := 1.0
## Dégâts à la tête (après le multiplicateur de l'arme) et part maximale des
## points de vie qu'un seul coup peut enlever.
var head_armor := 0.6
var max_hit_fraction := 0.12
## Combat engagé (avant : inerte, invulnérable).
var active := false

var _hesitations := 0
var _hesitate_t := 0.0
var _lunge_wind := -1.0
var _lunge_t := -1.0
var _lunge_dir := Vector3.ZERO
var _lunge_hit := false
var _lunge_cd := 4.0
var _scream_cd := 9.0


func is_lucid() -> bool:
	return _hesitate_t > 0.0


func take_damage(amount: float, hit_pos: Vector3, dir: Vector3, is_head: bool) -> void:
	if state == State.DEAD or not active:
		return
	# Le crâne se déforme, s'épaissit : une balle dans la tête ne suffit plus
	if is_head:
		amount *= head_armor
	# Aucun coup ne décide seul du combat : il doit durer, et raconter
	amount = minf(amount, max_hp * max_hit_fraction)
	if _hesitate_t > 0.0:
		amount *= lucid_damage_mult
	super.take_damage(amount, hit_pos, dir, is_head)
	boss_hp_changed.emit(maxf(hp, 0.0), max_hp)
	if _hesitations < lucid_thresholds.size() and state != State.DEAD and hp < max_hp * float(lucid_thresholds[_hesitations]):
		_hesitations += 1
		_hesitate_t = lucid_time
		_lunge_t = -1.0
		_lunge_wind = -1.0
		hesitated.emit(_hesitations)
		_on_lucid(_hesitations)


## Surcharge : effet d'un moment de lucidité (répliques, accélération…).
func _on_lucid(_n: int) -> void:
	pass


## Surcharge : états propres (assise, mutation, cellule). true = image traitée.
func _pre_physics(_delta: float) -> bool:
	return false


func _hold_still(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, delta * 8.0)
	velocity.z = move_toward(velocity.z, 0.0, delta * 8.0)
	velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
	move_and_slide()
	_speed_now = 0.0


func _net_extra() -> Array:
	return [active, _lunge_wind >= 0.0, _lunge_t >= 0.0, _hesitate_t]


func _net_apply_extra(a: Array) -> void:
	if a.size() < 4:
		return
	active = bool(a[0])
	_lunge_wind = 0.1 if bool(a[1]) else -1.0
	_lunge_t = 0.1 if bool(a[2]) else -1.0
	_hesitate_t = float(a[3])


func _physics_process(delta: float) -> void:
	if net_puppet:
		_puppet_process(delta)
		return
	if state == State.DEAD:
		super._physics_process(delta)
		return
	if _pre_physics(delta):
		return
	if not active or _hesitate_t > 0.0:
		_hesitate_t = maxf(_hesitate_t - delta, 0.0)
		_hold_still(delta)
		_animate(delta)
		return
	_lunge_cd = maxf(_lunge_cd - delta, 0.0)
	_scream_cd = maxf(_scream_cd - delta, 0.0)
	var p := player()
	# Bond : ramassé sur lui-même, puis détente
	if _lunge_wind >= 0.0:
		_lunge_wind += delta
		if p:
			var tp := p.global_position - global_position
			facing = lerp_angle(facing, atan2(-tp.x, -tp.z), 1.0 - exp(-10.0 * delta))
			rig.rotation.y = facing
		if _lunge_wind >= 0.35:
			_lunge_wind = -1.0
			_lunge_t = 0.0
			_lunge_hit = false
			_lunge_dir = Basis(Vector3.UP, facing) * Vector3.FORWARD
		velocity = Vector3(0, -0.5, 0)
		move_and_slide()
		_animate(delta)
		return
	if _lunge_t >= 0.0:
		_lunge_t += delta
		velocity.x = _lunge_dir.x * lunge_speed
		velocity.z = _lunge_dir.z * lunge_speed
		velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
		move_and_slide()
		_speed_now = lunge_speed
		if p and not _lunge_hit and not p.is_dead and global_position.distance_to(p.global_position) < 1.4:
			_lunge_hit = true
			p.take_damage(lunge_damage, global_position)
			p.velocity += _lunge_dir * 5.0
			Audio.play_3d("hit_flesh", p.global_position + Vector3.UP, 2.0, 0.05, 20.0, 4.0)
		if _lunge_t >= lunge_time or _lunge_hit or (get_slide_collision_count() > 0 and _lunge_t > 0.15):
			_lunge_t = -1.0
			_stagger_t = 0.35
		_animate(delta)
		return
	if state == State.CHASE and p and _sees_player:
		var d := global_position.distance_to(p.global_position)
		if _lunge_cd <= 0.0 and d > lunge_min and d < lunge_max:
			_lunge_cd = randf_range(3.5, 5.5)
			_lunge_wind = 0.0
			Audio.play_3d(scream_sound, global_position + Vector3.UP * 1.5, -2.0, 0.1, 30.0, 4.0, scream_pitch * 1.25)
			_animate(delta)
			return
		if _scream_cd <= 0.0 and d < 7.0:
			_scream_cd = randf_range(9.0, 13.0)
			_scream(p)
	super._physics_process(delta)


## Cri : fait vaciller Thomas et interrompt son rechargement.
func _scream(p: Player) -> void:
	Audio.play_3d(scream_sound, global_position + Vector3.UP * 1.5, 4.0, 0.0, 50.0, 6.0, scream_pitch)
	if p.camera_rig:
		p.camera_rig.shake(0.7)
	if scream_damage > 0.0:
		p.take_damage(scream_damage, global_position)
	if p.weapons:
		p.weapons.cancel_reload()


func _animate(delta: float) -> void:
	var t := Time.get_ticks_msec() * 0.001
	if _hesitate_t > 0.0:
		# Il se tient la tête : lucidité
		rig.reset_pose()
		rig.pose("shoulder_l", Vector3(2.3, 0, -0.5))
		rig.pose("shoulder_r", Vector3(2.3, 0, 0.5))
		rig.pose("elbow_l", Vector3(1.9, 0, 0))
		rig.pose("elbow_r", Vector3(1.9, 0, 0))
		rig.pose("spine", Vector3(-0.4, sin(t * 3.0) * 0.1, 0))
		rig.pose("head", Vector3(0.5, sin(t * 2.0) * 0.3, 0))
		rig.pose("knee_l", Vector3(-0.4, 0, 0))
		rig.apply(delta, 1.2)
		return
	if _lunge_wind >= 0.0:
		rig.reset_pose()
		rig.pose("knee_l", Vector3(-1.0, 0, 0))
		rig.pose("knee_r", Vector3(-1.0, 0, 0))
		rig.pose("hip_l", Vector3(0.9, 0, 0))
		rig.pose("hip_r", Vector3(0.9, 0, 0))
		rig.pose("spine", Vector3(-0.7, 0, 0))
		rig.pose("shoulder_r", Vector3(0.3, 0, 1.2))
		rig.pose("head", Vector3(-0.4, 0, 0))
		rig.apply(delta, 2.5)
		return
	if _lunge_t >= 0.0:
		rig.reset_pose()
		rig.pose("spine", Vector3(-0.9, 0, 0))
		rig.pose("shoulder_r", Vector3(2.4, 0, 0.2))
		rig.pose("shoulder_l", Vector3(0.6, 0, -0.8))
		rig.pose("hip_l", Vector3(0.9, 0, 0))
		rig.pose("knee_r", Vector3(-0.4, 0, 0))
		rig.apply(delta, 3.0)
		return
	super._animate(delta)

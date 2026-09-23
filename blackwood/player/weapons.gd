class_name Weapons
extends Node3D
## Les cinq armes de Thomas : arme équipée, tir (balle, plombs) et coups de
## matraque, chargeurs par arme, rechargement (cartouche par cartouche pour le
## fusil), changement d'arme, flash de bouche, impacts et bruit (qui attire
## les créatures). Le modèle en main (3e personne) et le modèle à l'écran
## (1re personne, ViewModel) suivent l'arme équipée.

signal fired(id: String)
signal reloaded(id: String)
signal switched(id: String)

const SWITCH_TIME := 0.35

var player: Node3D
var view: ViewModel
var hand: Node3D
var world_model: Node3D
var current := ""
var cooldown := 0.0
var reloading := false
var reload_timer := 0.0
var switching := 0.0
## Dispersion croissante en tir soutenu (pistolet-mitrailleur).
var heat := 0.0
## Description du dernier impact (diagnostic des tests automatisés).
var last_hit := ""
var flash_light: OmniLight3D
var _flash_world: MeshInstance3D
var _flash_view: MeshInstance3D
var _flash_timer := 0.0
var _melee_t := -1.0


func setup(p_player: Node3D, p_hand: Node3D, p_view: ViewModel) -> void:
	player = p_player
	hand = p_hand
	view = p_view
	flash_light = OmniLight3D.new()
	flash_light.light_color = Color(1.0, 0.7, 0.35)
	flash_light.omni_range = 7.5
	flash_light.light_energy = 0.0
	flash_light.shadow_enabled = false
	flash_light.light_volumetric_fog_energy = 2.0
	add_child(flash_light)
	_flash_world = _flash_quad(2)
	_flash_view = _flash_quad(ViewModel.LAYER)
	equip(GameState.equipped, true)


func _flash_quad(layer: int) -> MeshInstance3D:
	var q := QuadMesh.new()
	q.size = Vector2(0.22, 0.22)
	var mi := MeshInstance3D.new()
	mi.mesh = q
	mi.material_override = Mats.get_mat("muzzle_flash")
	mi.visible = false
	mi.layers = layer
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


func def() -> Dictionary:
	return WeaponDB.get_weapon(current)


func is_melee() -> bool:
	return String(def().get("kind", "")) == "melee"


func is_auto() -> bool:
	return bool(def().get("auto", false))


func can_fire() -> bool:
	return current != "" and cooldown <= 0.0 and switching <= 0.0 and _melee_t < 0.0 \
		and (not reloading or (bool(def().get("reload_one", false)) and GameState.weapon_mag(current) > 0))


## Équipe une arme possédée (« » = mains nues).
func equip(id: String, instant: bool = false) -> void:
	if id != "" and not GameState.has_weapon(id):
		return
	if id == current and world_model != null:
		return
	cancel_reload()
	current = id
	GameState.equipped = id
	if world_model:
		world_model.queue_free()
		world_model = null
	if id != "" and hand:
		world_model = WeaponModels.build(id, 2)
		hand.add_child(world_model)
		world_model.position = Vector3(0, -0.09, 0.0)
		world_model.rotation = Vector3(-PI / 2.0, 0, 0)
	if view:
		view.set_weapon(id)
	switching = 0.0 if instant else SWITCH_TIME
	heat = 0.0
	if not instant and id != "":
		Audio.play_3d("weapon_switch" if id != "baton" else "baton_extend", global_position, -6.0, 0.05, 10.0, 2.0)
	switched.emit(id)


## Arme suivante / précédente parmi celles possédées.
func cycle(dir: int) -> void:
	var owned: Array = []
	for w in WeaponDB.ORDER:
		if GameState.has_weapon(w):
			owned.append(w)
	if owned.is_empty():
		return
	var i := owned.find(current)
	i = (i + dir + owned.size()) % owned.size() if i >= 0 else 0
	equip(owned[i])


## Presse la détente (ou frappe). Retourne true si un coup est parti.
func trigger(origin: Vector3, dir: Vector3, aimed: bool, moving: bool, exclude: Array[RID]) -> bool:
	if not can_fire():
		return false
	var d := def()
	if is_melee():
		cooldown = float(d.interval)
		_melee_t = 0.0
		if view:
			view.swing()
		Audio.play_3d("baton_swing", global_position, -4.0, 0.08, 10.0, 2.0)
		GameState.emit_noise(player.global_position, float(d.noise), player)
		fired.emit(current)
		return true
	var mag := GameState.weapon_mag(current)
	if mag <= 0:
		cooldown = 0.35
		Audio.play_3d("gun_empty", global_position, -4.0, 0.03, 12.0, 3.0)
		if GameState.weapon_reserve(current) > 0:
			start_reload()
		else:
			GameState.show_message("Plus de munitions pour : %s." % String(d.name), 2.0)
		return false
	if reloading:
		cancel_reload()
	GameState.set_weapon_mag(current, mag - 1)
	cooldown = float(d.interval)
	var pellets := int(d.get("pellets", 1))
	var spread := float(d.spread_aim if aimed else d.spread_hip) * (1.5 if moving else 1.0) + heat
	heat = minf(heat + float(d.get("spread_growth", 0.0)), 4.0)
	var hits := {}
	var blood_fx := 0
	for i in pellets:
		var shot := _spread_dir(dir, spread)
		var hit := _cast(origin, shot, float(d.range), exclude)
		if hit.is_empty():
			last_hit = "rien"
			continue
		var col: Object = hit.collider
		last_hit = "%s @ %s" % [(col as Node).name if col is Node else "?", hit.position]
		if col is Area3D and col.has_meta("enemy"):
			var enemy: Node = col.get_meta("enemy")
			var is_head: bool = col.get_meta("head", false)
			var dist: float = origin.distance_to(hit.position)
			var falloff := 1.0
			if pellets > 1:
				falloff = clampf(1.0 - (dist - 5.0) / maxf(float(d.range) - 5.0, 1.0), 0.2, 1.0)
			var dmg := float(d.damage) * (float(d.head_mult) if is_head else 1.0) * falloff * randf_range(0.9, 1.1)
			if enemy and enemy.has_method("take_damage"):
				enemy.take_damage(dmg, hit.position, shot, is_head)
				hits[enemy] = shot
			if blood_fx < 3:
				FX.blood(_world(), hit.position, -shot, 18 if is_head else 12)
				Audio.play_3d("impact_flesh", hit.position, 0.0, 0.1, 20.0, 3.0)
				blood_fx += 1
			# Magnum : la balle traverse et peut toucher ce qui se trouve derrière
			if bool(d.get("pierce", false)):
				var ex2: Array[RID] = exclude.duplicate()
				ex2.append((col as CollisionObject3D).get_rid())
				var hit2 := _cast(hit.position + shot * 0.05, shot, float(d.range), ex2)
				if not hit2.is_empty() and hit2.collider is Area3D and hit2.collider.has_meta("enemy") and hit2.collider.get_meta("enemy") != enemy:
					var e2: Node = hit2.collider.get_meta("enemy")
					e2.take_damage(dmg * 0.6, hit2.position, shot, bool(hit2.collider.get_meta("head", false)))
					hits[e2] = shot
		else:
			var metal: bool = col is Node and (col as Node).is_in_group("metal")
			if i < 4:
				FX.impact(_world(), hit.position, hit.normal, metal)
				Audio.play_3d("impact_metal" if metal else "impact_wall", hit.position, -2.0, 0.12, 25.0, 3.0)
			if col is Node and (col as Node).has_method("on_shot"):
				col.on_shot(hit.position)
	for enemy in hits:
		if is_instance_valid(enemy) and enemy.has_method("stagger"):
			enemy.stagger(float(d.get("stagger", 0.3)), hits[enemy], float(d.get("knockback", 0.0)))
	_muzzle_flash()
	var shot_sound: String = {"shotgun": "shotgun_blast", "magnum": "magnum_shot", "smg": "smg_shot"}.get(current, "gunshot")
	if not Audio.has_sound(shot_sound):
		shot_sound = "gunshot"
	Audio.play_3d(shot_sound, global_position, 3.0, 0.04, 90.0, 10.0)
	Audio.play_3d("shell_casing", global_position + Vector3(0.1, -0.5, 0.0), -10.0, 0.15, 10.0, 2.0)
	if current == "shotgun":
		_pump_later()
	if view:
		view.kick(float(d.get("recoil", 0.04)) * 12.0)
	GameState.emit_noise(global_position, float(d.noise), player)
	fired.emit(current)
	return true


func _pump_later() -> void:
	await get_tree().create_timer(0.3).timeout
	if is_inside_tree() and current == "shotgun":
		Audio.play_3d("shotgun_pump" if Audio.has_sound("shotgun_pump") else "reload", global_position, -3.0, 0.03, 14.0, 3.0)


func _spread_dir(dir: Vector3, spread_deg: float) -> Vector3:
	var d := dir.normalized()
	var s := deg_to_rad(spread_deg)
	var ref := Vector3.UP if absf(d.y) < 0.95 else Vector3.RIGHT
	var u := d.cross(ref).normalized()
	var v := d.cross(u).normalized()
	var r := sqrt(randf()) * tan(s)
	var a := randf() * TAU
	return (d + u * cos(a) * r + v * sin(a) * r).normalized()


## Rayon depuis la caméra, puis trajectoire réelle depuis le canon.
func _cast(origin: Vector3, dir: Vector3, dist: float, exclude: Array[RID]) -> Dictionary:
	var space := get_world_3d().direct_space_state
	var q1 := PhysicsRayQueryParameters3D.create(origin, origin + dir * dist, 1 | 8 | 16)
	q1.collide_with_areas = true
	q1.exclude = exclude
	var hit1 := space.intersect_ray(q1)
	var target: Vector3 = hit1.position if not hit1.is_empty() else origin + dir * dist
	var from := muzzle_position()
	var shot_dir := (target - from).normalized()
	var q2 := PhysicsRayQueryParameters3D.create(from, target + shot_dir * 0.3, 1 | 8 | 16)
	q2.collide_with_areas = true
	q2.exclude = exclude
	var hit := space.intersect_ray(q2)
	if hit.is_empty() and not hit1.is_empty():
		hit = hit1
	return hit


func muzzle_position() -> Vector3:
	var m: Node3D = world_model.get_node_or_null("Muzzle") if world_model else null
	return m.global_position if m else global_position


func _world() -> Node:
	return GameState.game if GameState.game else get_tree().current_scene


func _muzzle_flash() -> void:
	_flash_timer = 0.06
	flash_light.global_position = muzzle_position()
	flash_light.light_energy = 9.0 if current != "magnum" and current != "shotgun" else 14.0
	var wm: Node3D = world_model.get_node_or_null("Muzzle") if world_model else null
	if wm:
		_flash_world.global_transform = wm.global_transform
		_flash_world.visible = true
	var vm := view.muzzle() if view else null
	if vm:
		_flash_view.global_transform = vm.global_transform
		_flash_view.visible = true
	_flash_world.rotation.z = randf() * TAU
	_flash_view.rotation.z = randf() * TAU


## Coup de matraque : touche la créature la plus proche dans l'arc devant soi.
func _melee_hit() -> void:
	var d := def()
	var cam: Camera3D = player.camera_rig.cam if player.camera_rig else null
	var dir: Vector3 = -cam.global_transform.basis.z if cam else -player.global_transform.basis.z
	var origin: Vector3 = player.global_position + Vector3.UP * 1.3
	var space := get_world_3d().direct_space_state
	var shape := SphereShape3D.new()
	shape.radius = float(d.reach)
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = shape
	q.transform = Transform3D(Basis(), origin)
	q.collide_with_areas = true
	q.collide_with_bodies = false
	q.collision_mask = 8
	var best: Area3D = null
	var best_score := INF
	var half_arc := deg_to_rad(float(d.arc) * 0.5)
	for r in space.intersect_shape(q, 24):
		var a := r.collider as Area3D
		if a == null or not a.has_meta("enemy"):
			continue
		var to := a.global_position - origin
		if to.length() > float(d.reach) + 0.3:
			continue
		var ang := Vector3(to.x, 0, to.z).normalized().angle_to(Vector3(dir.x, 0, dir.z).normalized())
		if ang > half_arc:
			continue
		# Mur entre les deux ?
		var lq := PhysicsRayQueryParameters3D.create(origin, a.global_position, 1)
		if not space.intersect_ray(lq).is_empty():
			continue
		# Préfère la zone la plus proche de la ligne de visée (tête si on la vise)
		var score := to.length() + (to.normalized() - dir).length() * 0.8
		if score < best_score:
			best_score = score
			best = a
	if best:
		var enemy: Node = best.get_meta("enemy")
		var is_head: bool = best.get_meta("head", false)
		var dmg := float(d.damage) * (float(d.head_mult) if is_head else 1.0) * randf_range(0.9, 1.1)
		enemy.take_damage(dmg, best.global_position, dir, is_head)
		if enemy.has_method("stagger"):
			enemy.stagger(float(d.stagger), dir, 1.5)
		FX.blood(_world(), best.global_position, -dir, 10)
		Audio.play_3d("baton_hit" if Audio.has_sound("baton_hit") else "impact_flesh", best.global_position, 0.0, 0.1, 14.0, 3.0)
		if player.camera_rig:
			player.camera_rig.shake(0.12)
		last_hit = "%s (matraque)" % best.name
		return
	var wq := PhysicsRayQueryParameters3D.create(origin, origin + dir * float(d.reach), 1 | 16)
	var wh := space.intersect_ray(wq)
	if not wh.is_empty():
		var metal: bool = wh.collider is Node and (wh.collider as Node).is_in_group("metal")
		FX.impact(_world(), wh.position, wh.normal, metal)
		Audio.play_3d("impact_metal" if metal else "impact_wall", wh.position, -2.0, 0.12, 16.0, 3.0)
	last_hit = "rien (matraque)"


func start_reload() -> void:
	var d := def()
	if current == "" or is_melee() or reloading:
		return
	if GameState.weapon_mag(current) >= int(d.mag) or GameState.weapon_reserve(current) <= 0:
		return
	reloading = true
	reload_timer = float(d.reload)
	if view:
		view.play_reload(float(d.reload) if not bool(d.get("reload_one", false)) else 0.6)
	Audio.play_3d("reload_shell" if current == "shotgun" and Audio.has_sound("reload_shell") else "reload", global_position, -3.0, 0.02, 12.0, 3.0)


func cancel_reload() -> void:
	reloading = false
	if view:
		view.stop_reload()


## Un coup reçu ralentit le rechargement sans l'annuler (sinon une créature au
## contact, qui frappe plus vite qu'on ne recharge, bloquerait le joueur).
func delay_reload(seconds: float) -> void:
	if reloading:
		reload_timer = minf(reload_timer + seconds, float(def().get("reload", 1.0)))


func _process(delta: float) -> void:
	cooldown = maxf(cooldown - delta, 0.0)
	switching = maxf(switching - delta, 0.0)
	heat = maxf(heat - delta * (3.0 if not Input.is_action_pressed("fire") else 0.6), 0.0)
	if _flash_timer > 0.0:
		_flash_timer -= delta
		flash_light.global_position = muzzle_position()
		if _flash_timer <= 0.0:
			flash_light.light_energy = 0.0
			_flash_world.visible = false
			_flash_view.visible = false
	if _melee_t >= 0.0:
		var before := _melee_t
		_melee_t += delta
		if before < 0.2 and _melee_t >= 0.2:
			_melee_hit()
		if _melee_t >= 0.45:
			_melee_t = -1.0
	if reloading:
		reload_timer -= delta
		if reload_timer <= 0.0:
			var d := def()
			var ammo := String(d.ammo)
			var need := int(d.mag) - GameState.weapon_mag(current)
			var n := mini(1 if bool(d.get("reload_one", false)) else need, GameState.count_item(ammo))
			if n > 0:
				GameState.remove_item(ammo, n)
				GameState.set_weapon_mag(current, GameState.weapon_mag(current) + n)
			if bool(d.get("reload_one", false)) and GameState.weapon_mag(current) < int(d.mag) and GameState.count_item(ammo) > 0:
				reload_timer = float(d.reload)
				if view:
					view.play_reload(0.6)
				Audio.play_3d("reload_shell" if Audio.has_sound("reload_shell") else "reload", global_position, -5.0, 0.04, 10.0, 2.0)
			else:
				reloading = false
				reloaded.emit(current)

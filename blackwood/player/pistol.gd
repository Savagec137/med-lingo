class_name Pistol
extends Node3D
## Pistolet 9mm : dégâts, cadence, dispersion, recul, chargeur de 12,
## rechargement, flash de bouche, impacts, bruit (attire les créatures).

signal fired
signal reloaded

const DAMAGE := 26.0
const HEADSHOT_MULT := 2.6
const FIRE_INTERVAL := 0.32
const RELOAD_TIME := 1.7
const RANGE := 60.0
const SPREAD_AIMED := 0.7
const SPREAD_HIP := 4.0
const NOISE_RADIUS := 26.0

var player: Node3D
var muzzle: Node3D
var flash_light: OmniLight3D
var flash_mesh: MeshInstance3D
var cooldown := 0.0
var reloading := false
var reload_timer := 0.0
var _flash_timer := 0.0
var _slide: MeshInstance3D
## Description du dernier impact (diagnostic des tests automatisés).
var last_hit := ""


func _ready() -> void:
	var metal := Mats.get_mat("metal_dark")
	_slide = _part(Vector3(0.032, 0.036, 0.2), Vector3(0, 0.018, -0.06), metal)
	_part(Vector3(0.026, 0.02, 0.17), Vector3(0, -0.012, -0.05), metal)
	var grip := _part(Vector3(0.03, 0.11, 0.045), Vector3(0, -0.06, 0.02), Mats.get_mat("plastic_dark"))
	grip.rotation.x = 0.22
	_part(Vector3(0.008, 0.03, 0.04), Vector3(0, -0.03, -0.035), metal)
	muzzle = Node3D.new()
	muzzle.position = Vector3(0, 0.02, -0.17)
	add_child(muzzle)
	flash_light = OmniLight3D.new()
	flash_light.light_color = Color(1.0, 0.7, 0.35)
	flash_light.omni_range = 7.0
	flash_light.light_energy = 0.0
	flash_light.shadow_enabled = false
	flash_light.light_volumetric_fog_energy = 2.0
	muzzle.add_child(flash_light)
	flash_mesh = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.22, 0.22)
	flash_mesh.mesh = q
	flash_mesh.material_override = Mats.get_mat("muzzle_flash")
	flash_mesh.visible = false
	flash_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	muzzle.add_child(flash_mesh)


func _part(size: Vector3, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	mi.material_override = mat
	mi.position = pos
	mi.layers = 2
	add_child(mi)
	return mi


func reserve() -> int:
	return GameState.count_item("ammo_9mm")


func can_fire() -> bool:
	return cooldown <= 0.0 and not reloading


## Tire depuis « origin » vers « aim_point ». Retourne true si une balle est partie.
func fire(aim_origin: Vector3, aim_dir: Vector3, spread_deg: float, exclude: Array[RID]) -> bool:
	if not can_fire():
		return false
	if GameState.pistol_mag <= 0:
		cooldown = 0.35
		Audio.play_3d("gun_empty", global_position, -4.0, 0.03, 12.0, 3.0)
		if reserve() > 0:
			start_reload()
		else:
			GameState.show_message("Plus de munitions.", 2.0)
		return false
	GameState.pistol_mag -= 1
	cooldown = FIRE_INTERVAL

	# Dispersion dans un cône
	var dir := aim_dir.normalized()
	var spread := deg_to_rad(spread_deg)
	var ref := Vector3.UP if absf(dir.y) < 0.95 else Vector3.RIGHT
	var u := dir.cross(ref).normalized()
	var v := dir.cross(u).normalized()
	var r := sqrt(randf()) * tan(spread)
	var a := randf() * TAU
	dir = (dir + u * cos(a) * r + v * sin(a) * r).normalized()

	var space := get_world_3d().direct_space_state
	# 1) point visé depuis la caméra, 2) trajectoire réelle depuis le canon
	var q1 := PhysicsRayQueryParameters3D.create(aim_origin, aim_origin + dir * RANGE, 1 | 8 | 16)
	q1.collide_with_areas = true
	q1.exclude = exclude
	var hit1 := space.intersect_ray(q1)
	var target: Vector3 = hit1.position if not hit1.is_empty() else aim_origin + dir * RANGE
	var from := muzzle.global_position
	var shot_dir := (target - from).normalized()
	var q2 := PhysicsRayQueryParameters3D.create(from, target + shot_dir * 0.3, 1 | 8 | 16)
	q2.collide_with_areas = true
	q2.exclude = exclude
	var hit := space.intersect_ray(q2)
	if hit.is_empty() and not hit1.is_empty():
		hit = hit1
	var world := get_tree().current_scene
	if GameState.game:
		world = GameState.game
	last_hit = "rien" if hit.is_empty() else "%s @ %s" % [(hit.collider as Node).name if hit.collider is Node else "?", hit.position]
	if not hit.is_empty():
		var col: Object = hit.collider
		if col is Area3D and col.has_meta("enemy"):
			var enemy: Node = col.get_meta("enemy")
			var is_head: bool = col.get_meta("head", false)
			var dmg := DAMAGE * (HEADSHOT_MULT if is_head else 1.0) * randf_range(0.9, 1.1)
			if enemy and enemy.has_method("take_damage"):
				enemy.take_damage(dmg, hit.position, shot_dir, is_head)
			FX.blood(world, hit.position, -shot_dir, 18 if is_head else 12)
			Audio.play_3d("impact_flesh", hit.position, 0.0, 0.1, 20.0, 3.0)
		else:
			var metal: bool = col is Node and (col as Node).is_in_group("metal")
			FX.impact(world, hit.position, hit.normal, metal)
			Audio.play_3d("impact_metal" if metal else "impact_wall", hit.position, -2.0, 0.12, 25.0, 3.0)
			if col is Node and (col as Node).has_method("on_shot"):
				col.on_shot(hit.position)

	# Retours sensoriels
	_flash_timer = 0.06
	flash_light.light_energy = 9.0
	flash_mesh.visible = true
	flash_mesh.rotation.z = randf() * TAU
	_slide.position.z = -0.03
	Audio.play_3d("gunshot", from, 3.0, 0.04, 90.0, 10.0)
	Audio.play_3d("shell_casing", from + Vector3(0.1, -0.5, 0.0), -10.0, 0.15, 10.0, 2.0)
	GameState.emit_noise(from, NOISE_RADIUS, player)
	fired.emit()
	return true


func start_reload() -> void:
	if reloading or GameState.pistol_mag >= GameState.MAG_SIZE or reserve() <= 0:
		return
	reloading = true
	reload_timer = RELOAD_TIME
	Audio.play_3d("reload", global_position, -3.0, 0.02, 12.0, 3.0)


func cancel_reload() -> void:
	reloading = false


## Un coup reçu ralentit le rechargement sans l'annuler (sinon une créature au
## contact, qui frappe plus vite qu'on ne recharge, bloquerait le joueur).
func delay_reload(seconds: float) -> void:
	if reloading:
		reload_timer = minf(reload_timer + seconds, RELOAD_TIME)


func _process(delta: float) -> void:
	cooldown = maxf(cooldown - delta, 0.0)
	if _flash_timer > 0.0:
		_flash_timer -= delta
		if _flash_timer <= 0.0:
			flash_light.light_energy = 0.0
			flash_mesh.visible = false
	_slide.position.z = lerpf(_slide.position.z, -0.06, 1.0 - exp(-25.0 * delta))
	if reloading:
		reload_timer -= delta
		if reload_timer <= 0.0:
			reloading = false
			var need := GameState.MAG_SIZE - GameState.pistol_mag
			var n := mini(need, reserve())
			if n > 0:
				GameState.remove_item("ammo_9mm", n)
				GameState.pistol_mag += n
			reloaded.emit()

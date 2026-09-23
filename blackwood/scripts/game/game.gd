class_name Game
extends Node3D
## Racine d'une partie : construit Blackwood Hospital, place Thomas, fait
## apparaître les créatures selon la progression, gère les ascenseurs, la
## météo, la visibilité des étages, les sauvegardes automatiques, la mort et
## l'épilogue.

signal ended

var facility: Facility
var player: Player
var camera_rig: PlayerCamera
var zones: ZoneManager
var events: EventDirector
var enemies := {}
var rain: CPUParticles3D
var traveling := false
var _dead_handled := false
var _autosave_cd := 0.0
var _cull_t := 0.0


func setup(save: Dictionary) -> void:
	GameState.game = self
	facility = Facility.new()
	facility.name = "Facility"
	add_child(facility)
	facility.build()
	facility.apply_graphics()

	player = Player.new()
	player.name = "Player"
	add_child(player)
	camera_rig = PlayerCamera.new()
	camera_rig.name = "CameraRig"
	var start: Vector3 = facility.anchors["player_start"]
	var yaw := 0.0
	var pdata: Dictionary = save.get("player", {})
	if pdata.has("pos"):
		var arr: Array = pdata.pos
		start = Vector3(float(arr[0]), float(arr[1]) + 0.05, float(arr[2]))
		yaw = float(pdata.get("yaw", 0.0))
	camera_rig.setup(player, yaw)
	add_child(camera_rig)
	player.attach_camera(camera_rig)
	player.place(start, yaw)
	camera_rig.make_current()
	facility.set_active_floor(Facility.floor_at(start.y))

	zones = ZoneManager.new()
	zones.facility = facility
	add_child(zones)
	events = EventDirector.new()
	add_child(events)
	events.setup(self, facility)
	_spawn_initial_enemies()
	events.apply_world_state()
	_build_rain()
	player.died.connect(_on_player_died)
	Settings.changed.connect(_on_settings)
	player.flashlight._apply_visibility()
	if save.is_empty():
		events.play_intro()
	else:
		GameState.set_flag("intro_done", true)
		if GameState.ui:
			GameState.ui.fade_from_black(1.2)
	GameState.refresh_objective()


func _exit_tree() -> void:
	if GameState.game == self:
		GameState.game = null
	if GameState.player == player:
		GameState.player = null


# --- Créatures -----------------------------------------------------------------

func _spawn_initial_enemies() -> void:
	for id in facility.spawns:
		if GameState.dead_enemies.has(id):
			continue
		var def: Dictionary = facility.spawns[id]
		if bool(def.get("event", false)):
			var flag := String(def.get("flag", ""))
			if flag != "" and GameState.get_flag(flag):
				spawn_enemy(id, def.get("home", def.pos))
			continue
		spawn_enemy(id)


func spawn_enemy(id: String, at: Vector3 = Vector3.INF) -> Enemy:
	if enemies.has(id) or GameState.dead_enemies.has(id):
		return enemies.get(id)
	var def: Dictionary = facility.spawns.get(id, {})
	if def.is_empty():
		return null
	var e: Enemy
	match String(def.type):
		"surgeon":
			e = Surgeon.new()
		"veilleur":
			e = Veilleur.new()
		"neonatal":
			e = Neonatal.new()
		"colossus":
			e = Colossus.new()
		"sarah":
			e = SarahBoss.new()
		"zero":
			e = PatientZero.new()
		_:
			var h := Hollow.new()
			h.variant = String(def.get("variant", "patient"))
			e = h
	e.enemy_id = id
	e.name = id
	var pos: Vector3 = def.pos if at == Vector3.INF else at
	e.home_pos = def.get("home", def.pos)
	e.home_rot = float(def.get("rot", 0.0))
	e.dormant = bool(def.get("dormant", false)) and at == Vector3.INF
	e.deep_sleep = bool(def.get("deep_sleep", false))
	e.passive = bool(def.get("passive", false)) and at == Vector3.INF
	if not (def.patrol as Array).is_empty():
		e.patrol_points = def.patrol
	elif def.has("patrol_anchor"):
		e.patrol_points = facility.anchors.get(String(def.patrol_anchor), [])
	if def.has("vents") and e is Neonatal:
		(e as Neonatal).vents = def.vents
	e.nav = facility.nav_grid_for(pos, e.body_radius)
	add_child(e)
	e.place(pos, float(def.get("rot", 0.0)))
	enemies[id] = e
	e.died.connect(_on_enemy_died)
	return e


func _on_enemy_died(e: Enemy) -> void:
	GameState.set_flag("killed_" + e.enemy_id, true)


## N'anime que les créatures de l'étage du joueur (et celles qui le poursuivent).
func _cull_enemies() -> void:
	var pf := facility.active_floor
	for id in enemies:
		var e: Enemy = enemies[id]
		if not is_instance_valid(e):
			continue
		var ef := Facility.floor_at(e.global_position.y)
		var near: bool = absi(facility._floor_rank(ef) - facility._floor_rank(pf)) <= 1
		e.visible = near
		var active: bool = (ef == pf or e.state == Enemy.State.CHASE or e.state == Enemy.State.DEAD) and DebugTools.ai_enabled
		if e.is_physics_processing() != active:
			e.set_physics_process(active)


## Recalcule tout de suite quelles créatures sont animées (mode DEBUG).
func refresh_enemy_activity() -> void:
	_cull_enemies()


# --- Ascenseurs ----------------------------------------------------------------------

func travel_elevator(elevator_id: String, from_level: int, to_level: int) -> void:
	if traveling or player == null or player.is_dead:
		return
	var anchor: Variant = facility.anchors.get("elev_%s_%d" % [elevator_id, to_level])
	if anchor == null:
		return
	traveling = true
	events.lock_player(true)
	Audio.play_3d("elevator_ding", player.global_position + Vector3.UP * 2.0, -2.0, 0.0, 12.0, 3.0)
	if GameState.ui:
		GameState.ui.fade_to_black(0.6)
	await get_tree().create_timer(0.7, false).timeout
	Audio.play_2d("elevator_move", -3.0)
	var ride := clampf(1.4 + 0.22 * absi(to_level - from_level), 1.6, 4.0)
	await get_tree().create_timer(ride, false).timeout
	player.place((anchor as Vector3) + Vector3(0, 0.1, 0), PI)
	facility.set_active_floor(to_level)
	zones.force_refresh()
	_cull_enemies()
	Audio.play_3d("elevator_ding", player.global_position + Vector3.UP * 2.0, -2.0, 0.0, 12.0, 3.0)
	if GameState.ui:
		GameState.ui.fade_from_black(0.8)
	await get_tree().create_timer(0.4, false).timeout
	traveling = false
	events.lock_player(false)
	events.on_elevator_arrived(elevator_id, to_level)


# --- Météo : pluie autour de la caméra quand on est dehors ------------------------

func _build_rain() -> void:
	rain = CPUParticles3D.new()
	rain.amount = 1600
	rain.lifetime = 0.9
	rain.local_coords = false
	rain.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	rain.emission_box_extents = Vector3(14.0, 0.5, 14.0)
	rain.direction = Vector3(0.12, -1.0, 0.05)
	rain.spread = 3.0
	rain.gravity = Vector3.ZERO
	rain.initial_velocity_min = 17.0
	rain.initial_velocity_max = 21.0
	var q := QuadMesh.new()
	q.size = Vector2(0.012, 0.55)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.7, 0.75, 0.85, 0.28)
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	m.billboard_keep_scale = true
	q.material = m
	rain.mesh = q
	rain.visibility_aabb = AABB(Vector3(-20, -20, -20), Vector3(40, 40, 40))
	add_child(rain)


func _process(delta: float) -> void:
	GameState.playtime += delta
	_autosave_cd = maxf(_autosave_cd - delta, 0.0)
	if player and not traveling:
		facility.set_active_floor(Facility.floor_at(player.global_position.y + 0.2))
	_cull_t -= delta
	if _cull_t <= 0.0:
		_cull_t = 0.5
		_cull_enemies()
	if rain and camera_rig:
		var outdoor := GameState.current_zone == "exterior"
		rain.emitting = outdoor
		rain.global_position = camera_rig.cam.global_position + Vector3(0, 8.0, 0)


# --- Sauvegardes ------------------------------------------------------------------

func build_save_data() -> Dictionary:
	var p := player.global_position
	return {
		"state": GameState.to_dict(),
		"player": {"pos": [p.x, p.y, p.z], "yaw": player.facing_yaw},
		"zone_name": HospitalLevel.place_name(GameState.current_zone, Facility.floor_at(p.y + 0.2)),
	}


func autosave(_reason: String = "") -> void:
	if player == null or player.is_dead or GameState.get_flag("game_complete") or traveling:
		return
	if _autosave_cd > 0.0:
		return
	_autosave_cd = 1.0
	SaveSystem.save_to_slot(0, build_save_data())
	if GameState.ui:
		GameState.ui.show_autosave()


func save_to_slot(slot: int) -> bool:
	return SaveSystem.save_to_slot(slot, build_save_data())


# --- Relais pour les objets du monde -----------------------------------------------

func set_nav_door(door: Door, blocked: bool) -> void:
	if facility:
		facility.set_nav_door(door, blocked)


func on_player_hurt(amount: float) -> void:
	if GameState.ui:
		GameState.ui.damage_flash(amount)


func on_phone_answered() -> void:
	events.on_phone_answered()


func start_ending() -> void:
	events.play_ending()


func _on_player_died() -> void:
	if _dead_handled:
		return
	_dead_handled = true
	Audio.set_muffled(true)
	Audio.stop_all_loops(2.0)
	await get_tree().create_timer(2.8, false).timeout
	if GameState.ui:
		GameState.ui.show_death()


func _on_settings() -> void:
	if facility:
		facility.apply_graphics()

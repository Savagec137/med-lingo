class_name Game
extends Node3D
## Racine d'une partie : construit le centre, place Ethan, fait apparaître les
## créatures selon la progression, gère la météo, les sauvegardes automatiques,
## la mort et l'épilogue.

signal ended

## Définition des créatures. « event » : n'apparaît que via un événement
## scripté (puis à sa position d'origine lors d'un chargement).
const ENEMIES := {
	"h_guard": {"type": "hollow", "variant": "guard", "pos": Vector3(-33.4, 0.05, -1.0), "rot": -PI / 2.0,
		"home": Vector3(-24.0, 0.05, -1.0), "patrol": [Vector3(-16.0, 0.05, -1.0), Vector3(-30.5, 0.05, -1.0)],
		"flag": "security_breach", "event": true},
	"h_cafeteria": {"type": "hollow", "pos": Vector3(5.0, 0.05, -11.8), "rot": PI,
		"home": Vector3(0.0, 0.05, 1.5), "patrol": [Vector3(-6.0, 0.05, -0.5), Vector3(7.5, 0.05, 0.0), Vector3(0.5, 0.05, 3.5)],
		"flag": "fuse_inserted", "event": true},
	"h_exam": {"type": "hollow", "pos": Vector3(19.5, 0.93, 4.4), "rot": PI / 2.0, "dormant": true,
		"home": Vector3(19.5, 0.05, 2.4), "patrol": [Vector3(15.5, 0.05, -1.0), Vector3(29.0, 0.05, -1.0)]},
	"h_lab": {"type": "hollow", "pos": Vector3(21.5, 0.05, -10.9), "rot": PI,
		"home": Vector3(21.0, 0.05, -11.0), "patrol": [Vector3(17.0, 0.05, -11.0), Vector3(26.5, 0.05, -11.0), Vector3(24.5, 0.05, -5.5)],
		"flag": "lab_blackout_done", "event": true},
	"h_morgue": {"type": "hollow", "pos": Vector3(18.2, -4.45, -45.6), "rot": 0.4, "dormant": true,
		"home": Vector3(19.0, -4.45, -42.0)},
	"h_basement": {"type": "hollow", "pos": Vector3(15.0, -4.45, -36.4), "rot": PI / 2.0,
		"home": Vector3(15.0, -4.45, -36.4), "patrol_anchor": "basement_patrol"},
	"surgeon": {"type": "surgeon", "pos": Vector3(-11.0, -4.45, -32.7), "rot": PI,
		"home": Vector3(-8.0, -4.45, -38.0), "patrol_anchor": "boss_patrol"},
}

var facility: Facility
var player: Player
var camera_rig: PlayerCamera
var zones: ZoneManager
var events: EventDirector
var enemies := {}
var rain: CPUParticles3D
var _dead_handled := false
var _autosave_cd := 0.0


func setup(save: Dictionary) -> void:
	GameState.game = self
	facility = Facility.new()
	facility.name = "Facility"
	add_child(facility)
	facility.build()
	facility.apply_quality(Settings.quality)

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
	player.camera_rig = camera_rig
	player.place(start, yaw)
	camera_rig.make_current()

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
	for id in ENEMIES:
		if GameState.dead_enemies.has(id):
			continue
		var def: Dictionary = ENEMIES[id]
		if def.get("event", false):
			if GameState.get_flag(String(def.get("flag", ""))):
				spawn_enemy(id, def.home)
			continue
		spawn_enemy(id)


func spawn_enemy(id: String, at: Vector3 = Vector3.INF) -> Enemy:
	if enemies.has(id) or GameState.dead_enemies.has(id):
		return enemies.get(id)
	var def: Dictionary = ENEMIES[id]
	var e: Enemy
	if def.type == "surgeon":
		e = Surgeon.new()
	else:
		var h := Hollow.new()
		h.variant = String(def.get("variant", "patient"))
		e = h
	e.enemy_id = id
	e.name = id
	var pos: Vector3 = def.pos if at == Vector3.INF else at
	e.home_pos = def.home
	e.home_rot = float(def.get("rot", 0.0))
	e.dormant = bool(def.get("dormant", false)) and at == Vector3.INF
	if def.has("patrol"):
		e.patrol_points = def.patrol
	elif def.has("patrol_anchor"):
		e.patrol_points = facility.anchors.get(def.patrol_anchor, [])
	e.nav = facility.nav_grids[1 if pos.y < -2.0 else 0]
	add_child(e)
	e.place(pos, float(def.get("rot", 0.0)))
	enemies[id] = e
	e.died.connect(_on_enemy_died)
	return e


func _on_enemy_died(e: Enemy) -> void:
	GameState.set_flag("killed_" + e.enemy_id, true)


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
	if rain and camera_rig:
		var outdoor := GameState.current_zone == "parking"
		rain.emitting = outdoor
		rain.global_position = camera_rig.cam.global_position + Vector3(0, 8.0, 0)


# --- Sauvegardes ------------------------------------------------------------------

func build_save_data() -> Dictionary:
	var p := player.global_position
	return {
		"state": GameState.to_dict(),
		"player": {"pos": [p.x, p.y, p.z], "yaw": player.facing_yaw},
	}


func autosave(reason: String = "") -> void:
	if player == null or player.is_dead or GameState.get_flag("game_complete"):
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
		facility.apply_quality(Settings.quality)

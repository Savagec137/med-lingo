class_name Game
extends Node3D
## Racine d'une partie : construit Blackwood Hospital, place Thomas, fait
## apparaître les créatures selon la progression, gère les ascenseurs, la
## météo, la visibilité des étages, les sauvegardes automatiques, la mort et
## l'épilogue.
##
## Coopération : le même code sert en solo, chez l'hôte (serveur, qui simule
## tout) et chez l'invité (client : créatures et scénario en réplique, voir
## Coop). « players » contient le joueur local et les répliques des autres.

signal ended

## Graine du bâtiment : identique sur les deux machines d'une partie en coop.
const LEVEL_SEED := 20260923

var facility: Facility
var player: Player
## Numéro de joueur → Player (le joueur local et les répliques réseau).
var players := {}
var coop: Coop
## Clé réseau → objet interactif (identique sur les deux machines).
var net_nodes := {}
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
	# Même bâtiment au détail près chez l'hôte et chez l'invité
	seed(LEVEL_SEED)
	facility = Facility.new()
	facility.name = "Facility"
	add_child(facility)
	facility.build()
	facility.apply_graphics()
	randomize()
	_assign_net_keys()
	var client := Net.is_client()
	var coop_info: Dictionary = save.get("coop", {})

	player = Player.new()
	player.name = "Player%d" % GameState.local_slot
	player.slot = GameState.local_slot
	add_child(player)
	players[player.slot] = player
	camera_rig = PlayerCamera.new()
	camera_rig.name = "CameraRig"
	var start: Vector3 = facility.anchors["player_start"]
	var yaw := 0.0
	var pdata: Dictionary = save.get("player", {})
	var host_pos := Vector3.INF
	if pdata.has("pos"):
		var arr: Array = pdata.pos
		start = Vector3(float(arr[0]), float(arr[1]) + 0.05, float(arr[2]))
		yaw = float(pdata.get("yaw", 0.0))
	if client and coop_info.has("spawn"):
		# Invité : il apparaît à côté de l'hôte
		host_pos = start
		var sp: Array = coop_info.spawn
		start = Vector3(float(sp[0]), float(sp[1]) + 0.05, float(sp[2]))
		yaw = float(coop_info.get("yaw", yaw))
	camera_rig.setup(player, yaw)
	add_child(camera_rig)
	player.attach_camera(camera_rig)
	player.place(start, yaw)
	camera_rig.make_current()
	facility.set_active_floor(Facility.floor_at(start.y))

	if Net.active:
		coop = Coop.new()
		coop.name = "Coop"
		coop.game = self
		add_child(coop)
		if client and host_pos != Vector3.INF:
			add_remote_player(1, host_pos, float(pdata.get("yaw", 0.0)))

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
	if client:
		if coop_info.has("countdown") and float(coop_info.countdown) >= 0.0:
			Stage.apply("countdown", [float(coop_info.countdown)])
		var boss: Array = coop_info.get("boss", [])
		if boss.size() == 3:
			Stage.apply("boss_bar", boss)
		coop.rq_ready.rpc_id(1, enemies.keys())
	elif Net.active:
		# Hôte : les joueurs déjà connectés (salon) entrent dans la partie
		for peer in Net.slots:
			if int(peer) != 1:
				coop.send_snapshot(int(peer))


func _exit_tree() -> void:
	if GameState.game == self:
		GameState.game = null
	if GameState.player == player:
		GameState.player = null


# --- Coopération : joueurs, objets ---------------------------------------------------

## Donne à chaque objet interactif une clé identique sur les deux machines :
## son identifiant quand il en a un, sinon son rang dans la construction.
func _assign_net_keys() -> void:
	net_nodes.clear()
	var i := 0
	for n in get_tree().get_nodes_in_group("interactable"):
		var it := n as Interactable
		if it == null or not is_ancestor_of(it):
			continue
		var key := ""
		if it is Door and (it as Door).door_id != "":
			key = "door:" + (it as Door).door_id
		elif it is Pickup and (it as Pickup).pickup_id != "":
			key = "pk:" + (it as Pickup).pickup_id
		elif it is DocumentPickup:
			key = "doc:" + (it as DocumentPickup).doc_id
		else:
			key = "i%d" % i
		i += 1
		register_net_node(it, key)


func register_net_node(it: Interactable, key: String) -> void:
	it.net_key = key
	net_nodes[key] = it


## Objet interactif par sa clé réseau (les objets apparus plus tard, comme le
## contenu d'un casier, sont retrouvés par leur identifiant).
func net_node(key: String) -> Node:
	var n: Variant = net_nodes.get(key)
	if n != null and is_instance_valid(n):
		return n as Node
	net_nodes.erase(key)
	for c in get_tree().get_nodes_in_group("interactable"):
		var it := c as Interactable
		if it == null:
			continue
		if (it is Pickup and "pk:" + (it as Pickup).pickup_id == key) \
				or (it is DocumentPickup and "doc:" + (it as DocumentPickup).doc_id == key) \
				or it.net_key == key:
			register_net_node(it, key)
			return it
	return null


## Réplique d'un autre joueur (l'invité chez l'hôte, l'hôte chez l'invité).
func add_remote_player(slot: int, pos: Vector3, yaw: float) -> Player:
	var p: Player = players.get(slot)
	if p and is_instance_valid(p):
		if not p.is_local:
			p.place(pos, yaw)
			p.snap_net_position()
		return p
	p = Player.new()
	p.name = "Player%d" % slot
	p.slot = slot
	p.is_local = false
	p.data = GameState.data(slot)
	add_child(p)
	p.place(pos, yaw)
	p.snap_net_position()
	players[slot] = p
	return p


func remove_remote_player(slot: int) -> void:
	var p: Player = players.get(slot)
	if p == null or p.is_local:
		return
	players.erase(slot)
	if camera_rig and camera_rig.target == p:
		camera_rig.target = player
	p.queue_free()


## Point libre à côté de « pos » (apparition de l'invité).
func spawn_point_near(pos: Vector3) -> Vector3:
	var grid: NavGrid = facility.nav_grid_for(pos, 0.35)
	if grid:
		var rng := RandomNumberGenerator.new()
		rng.seed = 7
		for i in 12:
			var q := grid.random_point_near(pos, 2.2, rng)
			var d := Vector2(q.x - pos.x, q.z - pos.z).length()
			if d > 0.9 and d < 2.6:
				return Vector3(q.x, pos.y, q.z)
	return pos + Vector3(0.9, 0.0, 0.0)


## Messages pour un joueur précis (son écran).
func notify_player(slot: int, text: String, duration: float = 3.0, sound: String = "") -> void:
	if coop:
		coop.notify_slot(slot, text, duration, sound)
	else:
		GameState.show_local_message(text, duration)


## Joueurs encore debout (ni morts ni à terre).
func active_players() -> Array:
	var out: Array = []
	for slot in players:
		var p: Player = players[slot]
		if is_instance_valid(p) and not p.is_dead and not p.data.downed:
			out.append(p)
	return out


## Coop : la réanimation (touche E près d'un joueur à terre) est possible.
func coop_revive_enabled() -> bool:
	return Net.active and players.size() >= 2


## Client : l'hôte a mis à jour le monde (portes, objets, casiers…).
func refresh_world() -> void:
	for n in get_tree().get_nodes_in_group("net_refresh"):
		if n.has_method("net_refresh"):
			n.net_refresh()


## Plus aucun joueur debout : écran de fin commun.
func coop_game_over() -> void:
	if _dead_handled:
		return
	_dead_handled = true
	Audio.set_muffled(true)
	Audio.stop_all_loops(2.0)
	await get_tree().create_timer(2.5, false).timeout
	if GameState.ui:
		GameState.ui.show_death()


## Client : l'hôte a quitté la partie.
func on_server_lost() -> void:
	if GameState.ui:
		GameState.ui.show_message("L'HÔTE A QUITTÉ LA PARTIE — retour au menu.", 4.0)
	await get_tree().create_timer(2.5, true).timeout
	var main := get_tree().root.get_node_or_null("Main")
	if main and main.has_method("quit_to_menu"):
		main.quit_to_menu()


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
	e.net_puppet = Net.is_client()
	add_child(e)
	e.place(pos, float(def.get("rot", 0.0)))
	enemies[id] = e
	e.died.connect(_on_enemy_died)
	return e


func _on_enemy_died(e: Enemy) -> void:
	GameState.set_flag("killed_" + e.enemy_id, true)


## N'anime que les créatures des étages des joueurs (et celles qui les
## poursuivent). Seul l'étage du joueur local est affiché.
func _cull_enemies() -> void:
	var pf := facility.active_floor
	var floors := {pf: true}
	for slot in players:
		var p: Player = players[slot]
		if is_instance_valid(p):
			floors[Facility.floor_at(p.global_position.y + 0.2)] = true
	for id in enemies:
		var e: Enemy = enemies[id]
		if not is_instance_valid(e):
			continue
		var ef := Facility.floor_at(e.global_position.y)
		var near: bool = absi(facility._floor_rank(ef) - facility._floor_rank(pf)) <= 1
		e.visible = near and e.body_visible
		var active: bool = (floors.has(ef) or e.state == Enemy.State.CHASE or e.state == Enemy.State.DEAD) and DebugTools.ai_enabled
		if e.is_physics_processing() != active:
			e.set_physics_process(active)


## Recalcule tout de suite quelles créatures sont animées (mode DEBUG).
func refresh_enemy_activity() -> void:
	_cull_enemies()


# --- Ascenseurs ----------------------------------------------------------------------

func travel_elevator(elevator_id: String, from_level: int, to_level: int, approved: bool = false) -> void:
	if traveling or player == null or player.is_dead:
		return
	# Invité : l'hôte vérifie l'accès avant le trajet
	if Net.is_client() and not approved:
		coop.request_elevator(elevator_id, from_level, to_level)
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
	if Net.is_client():
		coop.rq_arrived.rpc_id(1, elevator_id, to_level)
	else:
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
	q.size = Vector2(0.006, 0.42)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.72, 0.77, 0.86, 0.3)
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	m.billboard_keep_scale = true
	# Traînée aux extrémités adoucies ; les gouttes qui frôlent la caméra
	# s'effacent (sinon elles barrent l'écran de grands traits blancs).
	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.35, 0.8, 1.0])
	grad.colors = PackedColorArray([Color(1, 1, 1, 0), Color(1, 1, 1, 0.9), Color(1, 1, 1, 1), Color(1, 1, 1, 0)])
	var streak := GradientTexture2D.new()
	streak.gradient = grad
	streak.fill_from = Vector2(0.5, 0.0)
	streak.fill_to = Vector2(0.5, 1.0)
	streak.width = 4
	streak.height = 64
	m.albedo_texture = streak
	m.distance_fade_mode = BaseMaterial3D.DISTANCE_FADE_PIXEL_ALPHA
	m.distance_fade_min_distance = 1.2
	m.distance_fade_max_distance = 4.0
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
	if Net.is_client():
		return
	if coop:
		_respawn_dead_partners()
	if player == null or player.is_dead or GameState.get_flag("game_complete") or traveling:
		return
	if _autosave_cd > 0.0:
		return
	_autosave_cd = 1.0
	SaveSystem.save_to_slot(0, build_save_data())
	if GameState.ui:
		GameState.ui.show_autosave()


func save_to_slot(slot: int) -> bool:
	if Net.is_client():
		return false
	return SaveSystem.save_to_slot(slot, build_save_data())


## Coop : à chaque point de sauvegarde automatique, un partenaire mort revient
## en renfort à côté d'un joueur debout.
func _respawn_dead_partners() -> void:
	var alive := active_players()
	if alive.is_empty():
		return
	var anchor: Player = alive[0]
	for slot in players:
		var p: Player = players[slot]
		if not is_instance_valid(p) or not p.data.dead:
			continue
		p.data.dead = false
		p.data.downed = false
		p.data.set_hp(50.0)
		p.data.changed.emit("state")
		var pos := spawn_point_near(anchor.global_position)
		p.revive_state()
		p.place(pos, anchor.facing_yaw)
		p.snap_net_position()
		if not p.is_local:
			coop.teleport_client(int(slot), pos, anchor.facing_yaw)
		coop.notify_all("JOUEUR %d REVIENT EN RENFORT" % int(slot), 3.5, "ui_confirm")


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
	# Coop : tant qu'un partenaire est debout, on le suit des yeux
	if coop and players.size() >= 2:
		var alive := active_players()
		if not alive.is_empty():
			if camera_rig:
				camera_rig.target = alive[0]
			GameState.show_local_message("Vous êtes mort. Votre partenaire continue : il vous ramènera au prochain point de sauvegarde.", 5.0)
			return
		if Net.is_client():
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

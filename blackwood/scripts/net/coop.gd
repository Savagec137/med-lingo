class_name Coop
extends Node
## Coopération en ligne à deux joueurs : nœud d'échanges (/root/Main/World/Game/Coop),
## présent sur les deux machines dès qu'une session réseau est ouverte.
##
## Le SERVEUR (l'hôte, joueur 1) fait autorité : il simule les créatures, le
## scénario, les portes, les objets, les dégâts, la santé et les munitions de
## chacun. Le CLIENT (joueur 2) envoie des demandes (« rq_* ») : sa position,
## une interaction, un tir, un rechargement, un code… Le serveur les valide,
## les exécute sur la réplique du joueur 2, puis renvoie l'état (« st_* »,
## « ev_* »). Le client ne décide jamais seul d'un dégât, d'un objet ou d'une
## porte.
##
## Réplication :
##   joueurs     20 fois/s, non fiable (position, orientation, visée, lampe…)
##   créatures   12 fois/s, non fiable, autour du joueur 2
##   monde       10 fois/s, fiable, par différences (drapeaux, portes, objets
##               ramassés, créatures mortes, porte-clés, documents)
##   données     à chaque changement, fiable (santé, inventaire, armes du joueur)

signal code_result(key: String, ok: bool)

const STATE_RATE := 20.0
const ENEMY_RATE := 12.0
const WORLD_RATE := 10.0
## Distance au-delà de laquelle une créature n'est pas envoyée au client.
const ENEMY_RANGE := 48.0
## Créatures par paquet (reste sous le MTU d'ENet, ~1400 octets).
const ENEMIES_PER_PACKET := 8
## Distance maximale (m) acceptée pour une interaction demandée par le client.
const INTERACT_SLACK := 1.2
## Temps d'une réanimation (s) et portée.
const REVIVE_TIME := 2.0
const REVIVE_RANGE := 2.4

# Bits de l'état d'un joueur
const F_RUN := 1
const F_AIM := 2
const F_RELOAD := 4
const F_LIGHT := 8
const F_DODGE := 16
const F_SWING := 32
const F_MOVING := 64

static var _instance: Coop = null

var game: Game
var _ready_peers := {}
var _known := {}
var _t_state := 0.0
var _t_enemy := 0.0
var _t_world := 0.0
var _t_count := 0.0
var _t_over := 0.0
var _last_world := {}
var _pdata_dirty := {}
var _fire_ack := {}
var _last_shot_t := {}
var _revive := {}
var _game_over := false
var _world_dirty := false
## Côté client : délai avant l'envoi du prochain état.
var _state_seq := 0


static func instance() -> Coop:
	return _instance if is_instance_valid(_instance) else null


func _enter_tree() -> void:
	_instance = self


func _ready() -> void:
	_instance = self
	add_to_group("rpc_nodes")
	if Net.is_server():
		Net.peer_joined.connect(_on_peer_joined)
		Net.peer_left.connect(_on_peer_left)
		GameState.player_data_changed.connect(_on_pdata_changed)
		_last_world = _world_copy()
	else:
		Net.server_lost.connect(_on_server_lost)
		Net.peer_left.connect(_on_peer_left)


func _exit_tree() -> void:
	if _instance == self:
		_instance = null


func is_server() -> bool:
	return Net.is_server()


func _peer_of(slot: int) -> int:
	return Net.peer_of_slot(slot)


func _ready_list() -> Array:
	return _ready_peers.keys()


# =============================================================================
#  Arrivée et départ des joueurs (serveur)
# =============================================================================

func _on_peer_joined(peer: int) -> void:
	send_snapshot(peer)


## Envoie l'état complet de la partie à un client (arrivée, reconnexion, RETRY).
func send_snapshot(peer: int) -> void:
	if not is_server() or game == null or game.player == null:
		return
	var slot := Net.slot_of(peer)
	var fresh := not GameState.players.has(slot)
	var pd := GameState.data(slot)
	if fresh:
		_starter_kit(pd)
	# Réanimé à l'arrivée s'il était resté à terre ou mort
	if pd.downed or pd.dead or pd.hp <= 0.0:
		pd.downed = false
		pd.dead = false
		pd.bleed_t = 0.0
		pd.hp = maxf(pd.hp, PlayerData.REVIVE_HP)
	_ready_peers.erase(peer)
	var spawn := game.spawn_point_near(game.player.global_position)
	var remote := game.add_remote_player(slot, spawn, game.player.facing_yaw)
	remote.revive_state()
	var data := game.build_save_data()
	data["coop"] = {
		"slot": slot,
		"spawn": [spawn.x, spawn.y, spawn.z],
		"yaw": game.player.facing_yaw,
		"slots": Net.slots.duplicate(),
		"friendly_fire": Net.friendly_fire,
		"countdown": game.events.countdown,
		"boss": game.events.boss_bar_state(),
	}
	Net.send_snapshot(peer, data)
	notify_all("JOUEUR %d A REJOINT LA PARTIE" % slot, 3.0, "ui_confirm")


## Équipement de départ d'un joueur qui rejoint en cours de route : les armes
## déjà trouvées par l'hôte (chargées), un spray, des piles neuves.
func _starter_kit(pd: PlayerData) -> void:
	var host := GameState.data(1)
	for w in WeaponDB.ORDER:
		if host.has_weapon(w):
			pd.give_weapon(w, true)
	if host.equipped != "":
		pd.equipped = host.equipped if pd.has_weapon(host.equipped) else pd.equipped
	pd.add_item("spray", 1)
	pd.flashlight_battery = 100.0


func _on_peer_left(peer: int, slot: int) -> void:
	_ready_peers.erase(peer)
	_known.erase(peer)
	if game == null:
		return
	if is_server():
		game.remove_remote_player(slot)
		_revive.erase(slot)
		notify_all("JOUEUR %d DÉCONNECTÉ" % slot, 4.0, "ui_error")
	else:
		game.remove_remote_player(slot)


func _on_server_lost() -> void:
	if game:
		game.on_server_lost()


## Le client a construit la partie : on lui envoie tout ce qui vit déjà.
@rpc("any_peer", "call_remote", "reliable")
func rq_ready(enemy_ids: Array) -> void:
	if not is_server():
		return
	var peer := multiplayer.get_remote_sender_id()
	_ready_peers[peer] = true
	var known := {}
	for id in enemy_ids:
		known[String(id)] = true
	_known[peer] = known
	var slot := Net.slot_of(peer)
	_send_pdata(slot)
	# Créatures apparues par événement depuis le chargement de la sauvegarde
	for id in game.enemies:
		var e: Enemy = game.enemies[id]
		if is_instance_valid(e) and not e.is_dead() and not known.has(id):
			_send_spawn(peer, e)
	# Créatures que le client a mais que le serveur n'a plus
	var gone: Array = []
	for id in known:
		if not game.enemies.has(id) and not GameState.dead_enemies.has(id):
			gone.append(id)
	if not gone.is_empty():
		ev_despawn.rpc_id(peer, gone)


func _send_spawn(peer: int, e: Enemy) -> void:
	var def: Dictionary = game.facility.spawns.get(e.enemy_id, {})
	if def.is_empty():
		return
	ev_spawn.rpc_id(peer, e.enemy_id, def, e.global_position, e.facing)
	if _known.has(peer):
		_known[peer][e.enemy_id] = true


# =============================================================================
#  Boucle
# =============================================================================

func _physics_process(delta: float) -> void:
	if game == null or not Net.active:
		return
	if is_server():
		_server_tick(delta)
	else:
		_client_tick(delta)


func _server_tick(delta: float) -> void:
	_t_state -= delta
	if _t_state <= 0.0:
		_t_state = 1.0 / STATE_RATE
		for slot in game.players:
			var p: Player = game.players[slot]
			if not is_instance_valid(p):
				continue
			for peer in _ready_list():
				if Net.slot_of(peer) != int(slot):
					st_player.rpc_id(peer, int(slot), p.net_state())
	_t_enemy -= delta
	if _t_enemy <= 0.0:
		_t_enemy = 1.0 / ENEMY_RATE
		for peer in _ready_list():
			_send_enemies(peer)
	_t_world -= delta
	if _t_world <= 0.0:
		_t_world = 1.0 / WORLD_RATE
		_sync_world()
	for slot in _pdata_dirty.keys():
		_send_pdata(int(slot))
	_pdata_dirty.clear()
	_t_count -= delta
	if _t_count <= 0.0:
		_t_count = 1.0
		if game.events and game.events.countdown >= 0.0:
			Stage.countdown(game.events.countdown)
	_tick_players(delta)


func _client_tick(delta: float) -> void:
	var p := game.player
	if p == null:
		return
	_t_state -= delta
	if _t_state <= 0.0:
		_t_state = 1.0 / STATE_RATE
		rq_state.rpc_id(1, p.net_state())
	# Compte à rebours affiché entre deux synchronisations
	if Stage.client_countdown >= 0.0:
		Stage.client_countdown = maxf(Stage.client_countdown - delta, 0.0)
		if GameState.ui:
			GameState.ui.set_countdown(Stage.client_countdown)
	if _world_dirty:
		_world_dirty = false
		game.refresh_world()


# =============================================================================
#  Joueurs : état, à terre, réanimation, fin de partie (serveur)
# =============================================================================

## Le client envoie sa position et son allure.
@rpc("any_peer", "call_remote", "unreliable_ordered")
func rq_state(s: Array) -> void:
	if not is_server():
		return
	var slot := Net.slot_of(multiplayer.get_remote_sender_id())
	var p: Player = game.players.get(slot)
	if p and not p.is_local:
		p.apply_net_state(s, true)


## L'hôte (ou l'autre joueur) : position et allure.
@rpc("authority", "call_remote", "unreliable_ordered")
func st_player(slot: int, s: Array) -> void:
	if game == null:
		return
	var p: Player = game.players.get(slot)
	if p == null:
		if slot == GameState.local_slot:
			return
		var pos := Vector3(s[0], s[1], s[2])
		p = game.add_remote_player(slot, pos, float(s[3]))
	if not p.is_local:
		p.apply_net_state(s, false)


func _tick_players(delta: float) -> void:
	# Joueurs à terre : ils se vident de leur sang
	for slot in game.players:
		var pd := GameState.data(int(slot))
		if pd.downed and not pd.dead:
			pd.bleed_t -= delta
			if int(pd.bleed_t * 4.0) != int((pd.bleed_t + delta) * 4.0):
				_pdata_dirty[slot] = true
			if pd.bleed_t <= 0.0:
				_revive.erase(int(slot))
				player_died(int(slot))
	# Réanimations en cours
	for target in _revive.keys():
		var r: Dictionary = _revive[target]
		var tp: Player = game.players.get(int(target))
		var rp: Player = game.players.get(int(r.by))
		var tpd := GameState.data(int(target))
		if tp == null or rp == null or rp.is_dead or GameState.data(int(r.by)).downed or not tpd.downed \
				or rp.global_position.distance_to(tp.global_position) > REVIVE_RANGE:
			_revive.erase(target)
			notify_slot(int(r.by), "Réanimation interrompue.", 2.0)
			continue
		r.t += delta
		if r.t >= REVIVE_TIME:
			_revive.erase(target)
			tpd.downed = false
			tpd.bleed_t = 0.0
			tpd.set_hp(PlayerData.REVIVE_HP)
			tpd.changed.emit("state")
			tp.revive_state()
			notify_all("JOUEUR %d RÉANIMÉ" % int(target), 3.0, "ui_confirm")
	# Fin de partie : plus personne debout
	_t_over -= delta
	if _t_over <= 0.0 and not _game_over and game.players.size() >= 1:
		_t_over = 0.25
		var standing := 0
		for slot in game.players:
			var pd2 := GameState.data(int(slot))
			if not pd2.dead and not pd2.downed:
				standing += 1
		if standing == 0:
			_game_over = true
			for slot in game.players:
				var pd3 := GameState.data(int(slot))
				if not pd3.dead:
					player_died(int(slot))
			game.coop_game_over()
			for peer in _ready_list():
				ev_game_over.rpc_id(peer)


## Un joueur tombe à 0 PV en coopération : à terre (réanimable).
func player_downed(slot: int) -> void:
	var pd := GameState.data(slot)
	if pd.downed or pd.dead:
		return
	pd.downed = true
	pd.bleed_t = PlayerData.BLEED_TIME
	pd.changed.emit("state")
	var p: Player = game.players.get(slot)
	if p:
		p.enter_downed()
	notify_all("JOUEUR %d EST À TERRE" % slot, 4.0, "stinger")
	_pdata_dirty[slot] = true


## Mort définitive (plus de réanimation possible).
func player_died(slot: int) -> void:
	var pd := GameState.data(slot)
	if pd.dead:
		return
	pd.downed = false
	pd.dead = true
	pd.hp = 0.0
	pd.changed.emit("state")
	var p: Player = game.players.get(slot)
	if p and not p.is_dead:
		p.die()
	notify_all("JOUEUR %d EST MORT" % slot, 4.0, "")
	_pdata_dirty[slot] = true


## Commence la réanimation de « target » par « by » (touche E près du joueur à terre).
func start_revive(by: int, target: int) -> void:
	if not is_server():
		return
	var tpd := GameState.data(target)
	if not tpd.downed or tpd.dead or _revive.has(target):
		return
	_revive[target] = {"by": by, "t": 0.0}
	notify_slot(by, "Réanimation du joueur %d… Restez près de lui." % target, REVIVE_TIME)
	notify_slot(target, "Le joueur %d vous relève…" % by, REVIVE_TIME)


func revive_progress(target: int) -> float:
	if not _revive.has(target):
		return -1.0
	return clampf(float(_revive[target].t) / REVIVE_TIME, 0.0, 1.0)


## Le serveur recommence (RETRY) : nouvelle partie, les clients rechargent.
func reset_game_over() -> void:
	_game_over = false
	_revive.clear()


# =============================================================================
#  Données des joueurs (serveur → propriétaire)
# =============================================================================

func _on_pdata_changed(slot: int, _what: String) -> void:
	_pdata_dirty[slot] = true


func _send_pdata(slot: int) -> void:
	var peer := _peer_of(slot)
	if peer <= 1 or not _ready_peers.has(peer):
		return
	ev_pdata.rpc_id(peer, slot, GameState.data(slot).to_dict(), int(_fire_ack.get(slot, 0)))


@rpc("authority", "call_remote", "reliable")
func ev_pdata(slot: int, d: Dictionary, ack: int) -> void:
	var pd := GameState.data(slot)
	var was_dead := pd.dead
	var was_down := pd.downed
	pd.from_dict(d)
	var p: Player = game.players.get(slot) if game else null
	if p and p.is_local:
		p.weapons.ack_shots(ack)
		if pd.dead and not was_dead:
			p.die()
		elif pd.downed and not was_down:
			p.enter_downed()
		elif (was_down or was_dead) and not pd.downed and not pd.dead:
			p.revive_state()


## Le joueur de l'invité revient en renfort à côté de l'hôte.
func teleport_client(slot: int, pos: Vector3, yaw: float) -> void:
	var peer := _peer_of(slot)
	var p: Player = game.players.get(slot)
	if peer > 1 and _ready_peers.has(peer) and p:
		p.tp_id += 1
		p.place(pos, yaw)
		p.snap_net_position()
		ev_teleport.rpc_id(peer, pos, yaw, p.tp_id)


@rpc("authority", "call_remote", "reliable")
func ev_teleport(pos: Vector3, yaw: float, id: int) -> void:
	if game and game.player:
		if game.player.is_dead or game.player.data.dead:
			game.player.revive_state()
		game.player.place(pos, yaw)
		game.player.tp_ack = id


# =============================================================================
#  Monde : différences (serveur → clients)
# =============================================================================

func _world_copy() -> Dictionary:
	return {
		"flags": GameState.flags.duplicate(true),
		"doors": GameState.door_states.duplicate(true),
		"taken": GameState.taken_pickups.duplicate(),
		"dead": GameState.dead_enemies.duplicate(),
		"keys": GameState.key_items.duplicate(),
		"docs": GameState.documents.duplicate(),
	}


func _sync_world() -> void:
	var now := _world_copy()
	var delta := {}
	for k in ["flags", "doors", "taken", "dead"]:
		var a: Dictionary = _last_world.get(k, {})
		var b: Dictionary = now[k]
		var changed := {}
		for key in b:
			if not a.has(key) or a[key] != b[key]:
				changed[key] = b[key]
		var removed: Array = []
		for key in a:
			if not b.has(key):
				removed.append(key)
		if not changed.is_empty():
			delta[k] = changed
		if not removed.is_empty():
			delta[k + "_rm"] = removed
	for k in ["keys", "docs"]:
		if now[k] != _last_world.get(k, []):
			delta[k] = now[k]
	_last_world = now
	if delta.is_empty():
		return
	for peer in _ready_list():
		ev_world.rpc_id(peer, delta)


@rpc("authority", "call_remote", "reliable")
func ev_world(delta: Dictionary) -> void:
	if delta.has("flags"):
		for f in delta.flags:
			GameState.set_flag(String(f), delta.flags[f])
	if delta.has("flags_rm"):
		for f in delta.flags_rm:
			GameState.flags.erase(f)
	if delta.has("doors"):
		for d in delta.doors:
			GameState.door_states[d] = delta.doors[d]
	if delta.has("taken"):
		for t in delta.taken:
			GameState.taken_pickups[t] = true
	if delta.has("dead"):
		for id in delta.dead:
			GameState.dead_enemies[id] = true
			var e: Enemy = game.enemies.get(id) if game else null
			if e and is_instance_valid(e) and not e.is_dead():
				e.die()
	if delta.has("keys"):
		GameState.key_items = (delta["keys"] as Array).duplicate()
		GameState.key_ring_changed.emit()
		GameState.inventory_changed.emit()
	if delta.has("docs"):
		for doc in delta.docs:
			if not GameState.has_document(String(doc)):
				GameState.documents.append(String(doc))
	GameState.refresh_objective()
	_world_dirty = true


# =============================================================================
#  Créatures (serveur → client)
# =============================================================================

func _send_enemies(peer: int) -> void:
	var slot := Net.slot_of(peer)
	var p: Player = game.players.get(slot)
	if p == null:
		return
	var pack: Array = []
	var known: Dictionary = _known.get(peer, {})
	for id in game.enemies:
		var e: Enemy = game.enemies[id]
		if not is_instance_valid(e) or e.is_dead():
			continue
		if e.global_position.distance_to(p.global_position) > ENEMY_RANGE \
				and absf(e.global_position.y - p.global_position.y) > 2.0:
			continue
		if not known.has(id):
			_send_spawn(peer, e)
		pack.append(e.net_state())
		if pack.size() >= ENEMIES_PER_PACKET:
			st_enemies.rpc_id(peer, pack)
			pack = []
	if not pack.is_empty():
		st_enemies.rpc_id(peer, pack)


@rpc("authority", "call_remote", "unreliable_ordered")
func st_enemies(pack: Array) -> void:
	if game == null:
		return
	for s in pack:
		var e: Enemy = game.enemies.get(String(s[0]))
		if e and is_instance_valid(e):
			e.apply_net_state(s)


@rpc("authority", "call_remote", "reliable")
func ev_spawn(id: String, def: Dictionary, pos: Vector3, rot: float) -> void:
	if game == null or game.enemies.has(id):
		return
	game.facility.spawns[id] = def
	var e := game.spawn_enemy(id, pos)
	if e:
		e.place(pos, rot)


@rpc("authority", "call_remote", "reliable")
func ev_despawn(ids: Array) -> void:
	if game == null:
		return
	for id in ids:
		var e: Enemy = game.enemies.get(String(id))
		if e and is_instance_valid(e):
			e.queue_free()
		game.enemies.erase(String(id))


# =============================================================================
#  Interactions (client → serveur)
# =============================================================================

## Le joueur local agit sur un objet : exécution directe sur le serveur, demande
## au serveur depuis le client.
func request_interact(it: Interactable) -> void:
	rq_interact.rpc_id(1, it.net_key)


@rpc("any_peer", "call_remote", "reliable")
func rq_interact(key: String) -> void:
	if not is_server():
		return
	var slot := Net.slot_of(multiplayer.get_remote_sender_id())
	var p: Player = game.players.get(slot)
	var it := game.net_node(key) as Interactable
	if p == null or it == null or p.is_dead or GameState.data(slot).downed:
		return
	if not it.can_interact():
		return
	# Le client ne se téléporte pas vers les objets : distance vérifiée ici
	var to := it.focus_position() - (p.global_position + Vector3.UP * 1.1)
	if Vector2(to.x, to.z).length() > it.interact_radius + INTERACT_SLACK or absf(to.y) > 2.2:
		return
	run_as(p, func() -> void: it.interact(p))


## Exécute une action au nom d'un joueur : ses messages et ses écrans lui reviennent.
func run_as(p: Player, action: Callable) -> void:
	var prev: Node = GameState.actor
	GameState.actor = p
	action.call()
	GameState.actor = prev


## Écran à ouvrir chez le joueur qui agit (clavier, document, ascenseur).
func open_ui_for(slot: int, kind: String, args: Array) -> void:
	var peer := _peer_of(slot)
	if peer > 1:
		ev_ui.rpc_id(peer, kind, args)


@rpc("authority", "call_remote", "reliable")
func ev_ui(kind: String, args: Array) -> void:
	var ui := GameState.ui as UIRoot
	if ui == null or game == null:
		return
	match kind:
		"keypad":
			var it := game.net_node(String(args[0])) as Interactable
			if it:
				ui.open_keypad(it)
		"document":
			Audio.play_2d("paper", -2.0)
			ui.show_document(String(args[0]))
		"elevator":
			ui.open_elevator(String(args[0]), int(args[1]))
		"save":
			ui.open_save_menu()


## Code saisi sur un clavier (le client attend la réponse du serveur).
func request_code(it: Interactable, code: String) -> void:
	rq_code.rpc_id(1, it.net_key, code)


@rpc("any_peer", "call_remote", "reliable")
func rq_code(key: String, code: String) -> void:
	if not is_server():
		return
	var peer := multiplayer.get_remote_sender_id()
	var p: Player = game.players.get(Net.slot_of(peer))
	var it := game.net_node(key)
	var res := [false]
	if p and it and it.has_method("try_code") and p.global_position.distance_to((it as Node3D).global_position) < 4.0:
		run_as(p, func() -> void: res[0] = bool(it.call("try_code", code)))
	ev_code_result.rpc_id(peer, key, bool(res[0]))


@rpc("authority", "call_remote", "reliable")
func ev_code_result(key: String, ok: bool) -> void:
	code_result.emit(key, ok)


## Ascenseur : le serveur vérifie l'accès (courant, carte, clé) puis autorise le trajet.
func request_elevator(elevator_id: String, from_level: int, to_level: int) -> void:
	rq_elevator.rpc_id(1, elevator_id, from_level, to_level)


@rpc("any_peer", "call_remote", "reliable")
func rq_elevator(elevator_id: String, from_level: int, to_level: int) -> void:
	if not is_server():
		return
	var peer := multiplayer.get_remote_sender_id()
	var slot := Net.slot_of(peer)
	var p: Player = game.players.get(slot)
	if p == null or p.is_dead:
		return
	var e: Dictionary = game.facility.elevators.get(elevator_id, {})
	var rule: Dictionary = e.get("rules", {}).get(to_level, {})
	var ok := not e.is_empty() and game.facility.anchors.has("elev_%s_%d" % [elevator_id, to_level])
	var power := String(e.get("power_flag", ""))
	if power != "" and not GameState.get_flag(power):
		ok = false
	if rule.has("flag") and not GameState.get_flag(String(rule.flag)):
		ok = false
	if rule.has("item") and not GameState.has_item_for(GameState.data(slot), String(rule.item)):
		ok = false
	if GameState.get_flag("self_destruct") and elevator_id != "freight":
		ok = false
	if ok:
		ev_travel.rpc_id(peer, elevator_id, from_level, to_level)
	else:
		notify_slot(slot, String(rule.get("msg", "Accès refusé.")), 2.5, "ui_error")


@rpc("authority", "call_remote", "reliable")
func ev_travel(elevator_id: String, from_level: int, to_level: int) -> void:
	if game:
		game.travel_elevator(elevator_id, from_level, to_level, true)


## Arrivée du client à l'étage : le scénario (serveur) réagit.
@rpc("any_peer", "call_remote", "reliable")
func rq_arrived(elevator_id: String, level: int) -> void:
	if not is_server():
		return
	var p: Player = game.players.get(Net.slot_of(multiplayer.get_remote_sender_id()))
	if p:
		p.snap_net_position()
	game.events.on_elevator_arrived(elevator_id, level)


# =============================================================================
#  Armes (client → serveur ; serveur → client pour les effets de l'hôte)
# =============================================================================

@rpc("any_peer", "call_remote", "reliable")
func rq_fire(origin: Vector3, dir: Vector3, aimed: bool, moving: bool, shot_seed: int, seq: int) -> void:
	if not is_server():
		return
	var slot := Net.slot_of(multiplayer.get_remote_sender_id())
	var p: Player = game.players.get(slot)
	_fire_ack[slot] = maxi(int(_fire_ack.get(slot, 0)), seq)
	if p == null or p.is_dead or GameState.data(slot).downed:
		_pdata_dirty[slot] = true
		return
	# Cadence : un tir ne peut pas arriver plus vite que l'arme ne le permet
	var now := Time.get_ticks_msec() / 1000.0
	var interval := float(p.weapons.def().get("interval", 0.1))
	if now - float(_last_shot_t.get(slot, -10.0)) < interval * 0.5:
		_pdata_dirty[slot] = true
		return
	_last_shot_t[slot] = now
	# L'origine annoncée doit être près du joueur (pas de tir à travers la carte)
	if origin.distance_to(p.global_position + Vector3.UP * 1.4) > 3.0:
		origin = p.global_position + Vector3.UP * 1.4
	p.weapons.remote_trigger(origin, dir.normalized(), aimed, moving, shot_seed)
	_pdata_dirty[slot] = true


@rpc("any_peer", "call_remote", "reliable")
func rq_reload() -> void:
	if not is_server():
		return
	var p: Player = game.players.get(Net.slot_of(multiplayer.get_remote_sender_id()))
	if p and not p.is_dead:
		p.weapons.start_reload()


@rpc("any_peer", "call_remote", "reliable")
func rq_equip(id: String) -> void:
	if not is_server():
		return
	var p: Player = game.players.get(Net.slot_of(multiplayer.get_remote_sender_id()))
	if p and (id == "" or p.data.has_weapon(id)):
		p.weapons.equip(id)


@rpc("any_peer", "call_remote", "reliable")
func rq_heal() -> void:
	if not is_server():
		return
	var p: Player = game.players.get(Net.slot_of(multiplayer.get_remote_sender_id()))
	if p and not p.is_dead:
		p.use_heal()


@rpc("any_peer", "call_remote", "reliable")
func rq_flashlight(on: bool) -> void:
	if not is_server():
		return
	var p: Player = game.players.get(Net.slot_of(multiplayer.get_remote_sender_id()))
	if p and p.flashlight:
		p.flashlight.set_on(on)


## Tir de l'hôte : effets (flamme, son, impacts) rejoués chez le client.
func broadcast_shot(slot: int, weapon: String, origin: Vector3, dir: Vector3, aimed: bool, moving: bool, shot_seed: int) -> void:
	for peer in _ready_list():
		if Net.slot_of(peer) != slot:
			ev_shot.rpc_id(peer, slot, weapon, origin, dir, aimed, moving, shot_seed)


@rpc("authority", "call_remote", "unreliable_ordered")
func ev_shot(slot: int, weapon: String, origin: Vector3, dir: Vector3, aimed: bool, moving: bool, shot_seed: int) -> void:
	var p: Player = game.players.get(slot) if game else null
	if p and not p.is_local:
		p.weapons.replay_shot(weapon, origin, dir, aimed, moving, shot_seed)


# =============================================================================
#  Dégâts et messages vers un joueur
# =============================================================================

## Coup reçu par la réplique d'un joueur distant : son écran réagit.
func hurt_player(slot: int, amount: float, from: Vector3) -> void:
	var peer := _peer_of(slot)
	if peer > 1 and _ready_peers.has(peer):
		ev_hurt.rpc_id(peer, amount, from)


@rpc("authority", "call_remote", "reliable")
func ev_hurt(amount: float, from: Vector3) -> void:
	if game and game.player:
		game.player.hurt_feedback(amount, from)


func notify_slot(slot: int, text: String, duration: float = 3.0, sound: String = "") -> void:
	if slot == GameState.local_slot or not Net.active:
		if sound != "":
			Audio.play_2d(sound, -4.0)
		GameState.show_local_message(text, duration)
		return
	var peer := _peer_of(slot)
	if peer > 0 and _ready_peers.has(peer):
		ev_msg.rpc_id(peer, text, duration, sound)


func notify_all(text: String, duration: float = 3.0, sound: String = "") -> void:
	if sound != "":
		Audio.play_2d(sound, -4.0)
	GameState.show_local_message(text, duration)
	if is_server():
		for peer in _ready_list():
			ev_msg.rpc_id(peer, text, duration, sound)


@rpc("authority", "call_remote", "reliable")
func ev_msg(text: String, duration: float, sound: String) -> void:
	if sound != "":
		Audio.play_2d(sound, -4.0)
	GameState.show_local_message(text, duration)


# =============================================================================
#  Mise en scène et fin de partie
# =============================================================================

func broadcast_stage(method: String, args: Array) -> void:
	for peer in _ready_list():
		ev_stage.rpc_id(peer, method, args)


@rpc("authority", "call_remote", "reliable")
func ev_stage(method: String, args: Array) -> void:
	Stage.apply(method, args)


@rpc("authority", "call_remote", "reliable")
func ev_game_over() -> void:
	if game:
		game.coop_game_over()

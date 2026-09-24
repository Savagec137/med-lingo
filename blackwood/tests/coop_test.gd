extends Node
## Test de la coopération en réseau (vrais processus, vraie connexion ENet).
##
## L'HÔTE lance lui-même l'INVITÉ (second processus Godot), puis un INTRUS
## (troisième joueur, qui doit être refusé). Les deux robots se coordonnent
## par RPC (nœud /root/Main/TestBot des deux côtés) et vérifient chacun ce
## qu'ils voient :
##   salon (HOST GAME / JOIN GAME), entrée en partie, positions répliquées,
##   objet PERSONNEL (munitions) et objet PARTAGÉ (clé), porte ouverte et
##   porte verrouillée validées par l'hôte, combat (tirs de l'invité exécutés
##   par l'hôte, munitions décomptées chez lui), tir ami désactivé, document
##   lu (écran chez l'invité, archives communes), magnétophone réservé à
##   l'hôte, clavier à code (mauvais puis bon code), ascenseur (refus sans
##   courant, puis trajet validé par l'hôte), lampes torches de chacun,
##   écran ouvert sans pause, combat de boss synchronisé (le Chirurgien :
##   réveil, barre de vie, mort), changement de cible des
##   créatures, joueur à terre et réanimation, mort, GAME OVER et RETRY,
##   déconnexion puis reconnexion en cours de partie, troisième joueur refusé.
##
## Usage (depuis blackwood/) :
##   godot --headless --path . -- --test=coop_test                 (réseau local)
##   godot --headless --path . -- --test=coop_test --latency=90    (latence simulée ±25 ms, 1 % de pertes)
## Code de sortie 0 si tout est OK des deux côtés.

var role := "host"
var addr := "127.0.0.1"
var port := 24890
var latency := 0.0
var ui: UIRoot
var failures := 0
var t0 := 0
var _inbox: Array = []
var _client_pid := -1
var _client_failures := -1
var _proxy: LatencyProxy
var _errors := ErrorCounter.new()


## Compte les erreurs du moteur et des scripts : une seule fait échouer le test.
class ErrorCounter extends Logger:
	var count := 0
	var first := ""

	func _log_error(function: String, file: String, line: int, code: String, rationale: String, _editor_notify: bool,
			error_type: int, _script_backtraces: Array[ScriptBacktrace]) -> void:
		if error_type == Logger.ERROR_TYPE_WARNING:
			return
		count += 1
		if first == "":
			first = "%s — %s:%d (%s)" % [rationale if rationale != "" else code, file.get_file(), line, function]

	func _log_message(_message: String, _error: bool) -> void:
		pass


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Engine.max_fps = 60
	OS.add_logger(_errors)
	add_to_group("rpc_nodes")
	t0 = Time.get_ticks_msec()
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--role="):
			role = a.substr(7)
		elif a.begins_with("--addr="):
			addr = a.substr(7)
		elif a.begins_with("--port="):
			port = int(a.substr(7))
		elif a.begins_with("--latency="):
			latency = float(a.substr(10))
	match role:
		"host":
			_run_host()
		"client":
			_run_client()
		"intruder":
			_run_intruder()


# --- Outils -----------------------------------------------------------------------

func _log(msg: String) -> void:
	print("[%s %6.1fs] %s" % [role.to_upper(), (Time.get_ticks_msec() - t0) / 1000.0, msg])


func _check(cond: bool, what: String) -> bool:
	if cond:
		_log("OK  " + what)
	else:
		failures += 1
		_log("ÉCHEC  " + what)
	return cond


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


## Attente en temps réel (les deux processus tournent en temps réel).
func _sleep(s: float) -> void:
	var end := Time.get_ticks_msec() + int(s * 1000.0)
	while Time.get_ticks_msec() < end:
		await get_tree().process_frame


func _wait_for(cond: Callable, timeout: float) -> bool:
	var end := Time.get_ticks_msec() + int(timeout * 1000.0)
	while Time.get_ticks_msec() < end:
		if cond.call():
			return true
		await get_tree().process_frame
	return bool(cond.call())


func key(code: int) -> void:
	var ev := InputEventKey.new()
	ev.physical_keycode = code
	ev.keycode = code
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(3)
	var up := ev.duplicate()
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(3)


func _game() -> Game:
	return GameState.game as Game


func _player() -> Player:
	return GameState.player as Player


## Bouton d'un écran par son texte (le robot « clique » comme un joueur).
func _press(container: Node, text: String) -> bool:
	for c in container.find_children("*", "Button", true, false):
		var b := c as Button
		if b.text.begins_with(text) and b.visible and not b.disabled:
			b.pressed.emit()
			return true
	_log("bouton introuvable : " + text)
	return false


func _wait_menu() -> void:
	ui = get_parent().get("ui") as UIRoot
	await _wait_for(func() -> bool: return ui.top_screen() is MainMenu, 20.0)
	await _sleep(0.3)


# --- Messages entre les deux robots -------------------------------------------------

@rpc("any_peer", "call_remote", "reliable")
func msg(kind: String, data: Dictionary) -> void:
	_inbox.append([kind, data])


func _send(kind: String, data: Dictionary = {}) -> void:
	var target := 1 if role == "client" else Net.peer_of_slot(2)
	if target > 0:
		msg.rpc_id(target, kind, data)


func _expect(kind: String, timeout: float = 20.0) -> Dictionary:
	var end := Time.get_ticks_msec() + int(timeout * 1000.0)
	while Time.get_ticks_msec() < end:
		for i in _inbox.size():
			if String(_inbox[i][0]) == kind:
				var d: Dictionary = _inbox[i][1]
				_inbox.remove_at(i)
				return d
		await get_tree().process_frame
	_log("message « %s » non reçu" % kind)
	return {"_timeout": true}


func _next_msg() -> Array:
	while _inbox.is_empty():
		await get_tree().process_frame
	_last_msg_ms = Time.get_ticks_msec()
	var m: Array = _inbox.pop_front()
	_log("    ← %s" % String(m[0]))
	return m


var _last_msg_ms := 0


## Invité : si l'hôte ne dit plus rien pendant 90 s, on décrit l'état et on
## s'arrête (pas de processus orphelin).
func _watchdog() -> void:
	_last_msg_ms = Time.get_ticks_msec()
	while true:
		await _sleep(5.0)
		if Time.get_ticks_msec() - _last_msg_ms > 90000:
			var main := get_parent()
			_log("CHIEN DE GARDE : plus de message de l'hôte depuis 90 s — écran %s, chargement %s, partie %s, session %s (client %s), pairs %s" % [
				ui.top_screen().get_class() if ui.top_screen() else "aucun", str(main.get("_busy")), str(_game() != null),
				str(Net.active), str(Net.is_client()), str(multiplayer.get_peers())])
			failures += 1
			get_parent().call("quit_game", 99)
			return


# =================================================================================
#  HÔTE
# =================================================================================

func _run_host() -> void:
	await _wait_menu()
	ui.open_coop()
	await _frames(3)
	_press(ui.coop_menu, "HOST GAME")
	await _frames(3)
	_check(Net.active and Net.is_server(), "HOST GAME : session ouverte (port %d)" % port)
	var join_port := port
	if latency > 0.0:
		_proxy = LatencyProxy.new()
		_proxy.listen_port = port + 10
		_proxy.server_port = port
		_proxy.delay_ms = latency
		_proxy.jitter_ms = 25.0
		_proxy.loss = 0.01
		add_child(_proxy)
		_check(_proxy.start() == OK, "relais de latence : %d ms ± 25 ms, 1 %% de pertes (port %d)" % [int(latency), _proxy.listen_port])
		join_port = _proxy.listen_port
	_client_pid = _spawn("client", join_port)
	_check(_client_pid > 0, "second processus lancé (invité)")
	var joined := await _wait_for(func() -> bool: return Net.player_count() >= 2, 40.0)
	_check(joined, "salon : le joueur 2 est connecté")
	await _frames(5)
	_check("connecté" in ui.coop_menu.info.text, "salon : « Joueur 2 : connecté » affiché")
	_press(ui.coop_menu, "NOUVELLE PARTIE")
	var in_game := await _wait_for(func() -> bool:
		return _game() != null and _game().coop != null and _game().players.size() >= 2 \
			and not _game().coop._ready_peers.is_empty(), 60.0)
	if not _check(in_game, "nouvelle partie : les deux joueurs sont dans le monde"):
		await _finish()
		return
	var intro := await _wait_for(func() -> bool: return GameState.get_flag("intro_done"), 90.0)
	_check(intro, "introduction terminée")
	await _sleep(1.0)
	_send("start")
	await _test_movement()
	await _test_pickups()
	await _test_weapon_copies()
	await _test_doors()
	await _test_document()
	await _test_save_point()
	await _test_keypad()
	await _test_elevator()
	await _test_combat()
	await _test_friendly_fire()
	await _test_flashlights()
	await _test_no_pause()
	await _test_boss()
	await _test_targeting()
	await _test_downed_revive()
	await _test_game_over_retry()
	await _test_disconnect_rejoin()
	await _test_intruder()
	await _finish()


func _spawn(r: String, p: int) -> int:
	var args := PackedStringArray(["--headless"])
	# Exécutable exporté : le jeu est intégré ; depuis Godot : chemin du projet
	if not OS.has_feature("template"):
		args.append_array(["--path", ProjectSettings.globalize_path("res://")])
	args.append_array(["--", "--test=coop_test", "--role=" + r, "--addr=127.0.0.1", "--port=%d" % p])
	return OS.create_process(OS.get_executable_path(), args, false)


func _p2() -> Player:
	return _game().players.get(2) as Player


## Place l'invité (sa réplique ici et son joueur chez lui), tourné vers « look ».
func _place_client(pos: Vector3, look: Vector3) -> void:
	var to := look - pos
	var yaw := atan2(-to.x, -to.z)
	var p2 := _p2()
	p2.place(pos, yaw)
	p2.snap_net_position()
	_game().coop.teleport_client(2, pos, yaw)
	await _sleep(0.6 + latency / 1000.0 * 2.0)


func _place_host(pos: Vector3, look: Vector3) -> void:
	var to := look - pos
	var yaw := atan2(-to.x, -to.z)
	_player().place(pos, yaw)
	await _frames(2)


## Point au sol à « dist » mètres d'un objet, du côté libre de la grille.
func _stand_near(target: Vector3, dist: float) -> Vector3:
	var grid: NavGrid = _game().facility.nav_grid_for(target, 0.35)
	var best := target + Vector3(0, 0, dist)
	if grid:
		for i in 16:
			var a := TAU * float(i) / 16.0
			var q := target + Vector3(cos(a), 0, sin(a)) * dist
			if grid.is_walkable(q):
				best = q
				break
	var fy := float(Facility.FLOOR_Y.get(Facility.floor_at(target.y + 0.3), 0.0))
	return Vector3(best.x, fy + 0.05, best.z)


func _test_movement() -> void:
	_log("── Positions répliquées")
	var d := await _expect("moved", 20.0)
	await _sleep(0.5 + latency / 500.0)
	if d.has("pos"):
		var p2 := _p2()
		var dist: float = p2.global_position.distance_to(d.pos)
		_check(dist < 1.0, "l'invité a marché : sa réplique chez l'hôte est à %.2f m de sa position" % dist)
	_send("host_pos", {"pos": _player().global_position})
	var r := await _expect("host_pos_seen", 15.0)
	_check(bool(r.get("ok", false)), "chez l'invité, la réplique de l'hôte est en place (%.2f m)" % float(r.get("dist", -1.0)))


func _test_pickups() -> void:
	_log("── Objets : personnel (munitions) et partagé (clé)")
	var fac := _game().facility
	var pk: Pickup = fac.nodes.get("f0_sec_ammo")
	if not _check(pk != null and is_instance_valid(pk), "munitions du poste de sécurité présentes"):
		return
	var p1_ammo := GameState.data(1).count_item("ammo_9mm")
	var p2_ammo := GameState.data(2).count_item("ammo_9mm")
	await _place_client(_stand_near(pk.global_position, 0.9), pk.global_position)
	_send("interact", {"key": pk.net_key})
	var r := await _expect("interacted", 15.0)
	await _sleep(0.3)
	_check(GameState.taken_pickups.has("f0_sec_ammo"), "l'hôte a validé le ramassage")
	_check(GameState.data(2).count_item("ammo_9mm") > p2_ammo, "munitions PERSONNELLES : dans l'inventaire du joueur 2 (%d → %d)" % [
		p2_ammo, GameState.data(2).count_item("ammo_9mm")])
	_check(GameState.data(1).count_item("ammo_9mm") == p1_ammo, "…et pas dans celui du joueur 1 (%d)" % p1_ammo)
	_check(bool(r.get("gone", false)) and int(r.get("ammo", 0)) > 0, "chez l'invité : objet disparu, munitions reçues (%d)" % int(r.get("ammo", 0)))
	var key: Pickup = fac.nodes.get("f0_pharmacy_key")
	if not _check(key != null and is_instance_valid(key), "clé de la pharmacie présente"):
		return
	await _place_client(_stand_near(key.global_position, 0.9), key.global_position)
	_send("interact", {"key": key.net_key})
	r = await _expect("interacted", 15.0)
	await _sleep(0.3)
	var kid := key.item_id if is_instance_valid(key) else "key_pharmacy"
	_check("key_pharmacy" in GameState.key_items, "clé PARTAGÉE : sur le porte-clés commun chez l'hôte")
	_check(not GameState.data(2).has_item("key_pharmacy"), "…pas dans les 6 cases du joueur 2")
	_check(bool(r.get("has_key", false)), "chez l'invité : la clé est aussi sur son porte-clés (%s)" % kid)


## Les armes sont personnelles : chaque joueur prend son exemplaire.
func _test_weapon_copies() -> void:
	_log("── Arme : un exemplaire par joueur")
	var gun: Pickup = _game().facility.nodes.get("f3_shotgun")
	if not _check(gun != null and is_instance_valid(gun), "fusil à pompe du 3e présent"):
		return
	await _place_client(_stand_near(gun.global_position, 0.9), gun.global_position)
	_send("interact", {"key": gun.net_key})
	var r := await _expect("interacted", 15.0)
	await _sleep(0.3)
	_check(GameState.data(2).has_weapon("shotgun") and not GameState.data(1).has_weapon("shotgun"), "l'invité prend le fusil (et pas l'hôte)")
	_check(is_instance_valid(gun) and not GameState.taken_pickups.has("f3_shotgun"), "le fusil reste en place pour l'hôte")
	_check(not bool(r.get("gone", true)), "…aussi chez l'invité")
	var spot := _stand_near(gun.global_position, 0.9)
	await _place_host(spot, gun.global_position)
	var focus := await _wait_for(func() -> bool: return is_instance_valid(gun) and _player().focused == gun, 3.0)
	_check(focus, "l'hôte vise le fusil")
	await key(KEY_E)
	await _sleep(0.3)
	_check(GameState.data(1).has_weapon("shotgun") and GameState.taken_pickups.has("f3_shotgun"), "l'hôte prend le sien : l'objet disparaît")
	await _sleep(0.5 + latency / 500.0)
	_send("check_gone", {"key": "pk:f3_shotgun"})
	r = await _expect("gone_state", 10.0)
	_check(bool(r.get("gone", false)), "…chez l'invité aussi")


func _find_door(want_locked: bool) -> Door:
	var best: Door = null
	var best_d := INF
	for id in _game().facility.doors:
		var d: Door = _game().facility.doors[id]
		if Facility.floor_at(d.global_position.y + 0.3) != 0 or d.is_open:
			continue
		# Verrouillée pour de bon, ou à clé sans la clé
		var locked := d.lock == Door.Lock.LOCKED or d.lock == Door.Lock.EVENT \
			or (d.lock == Door.Lock.KEY and not GameState.has_item(d.key_item))
		if locked != want_locked or (not want_locked and (d.lock != Door.Lock.NONE or d.double)):
			continue
		var fr := d.global_transform * Vector3(0, 0, 1.2)
		var bk := d.global_transform * Vector3(0, 0, -1.2)
		var grid: NavGrid = _game().facility.nav_grid_for(d.global_position, 0.35)
		if grid and not grid.is_walkable(fr) and not grid.is_walkable(bk):
			continue
		var dist := d.global_position.distance_to(Vector3(0, 0, -14))
		if dist < best_d:
			best_d = dist
			best = d
	return best


func _test_doors() -> void:
	_log("── Portes validées par l'hôte")
	var door := _find_door(false)
	if not _check(door != null, "porte ordinaire trouvée au rez-de-chaussée"):
		return
	var front := door.global_transform * Vector3(0, 0, 1.2)
	if not _game().facility.nav_grid_for(front, 0.35).is_walkable(front):
		front = door.global_transform * Vector3(0, 0, -1.2)
	await _place_client(Vector3(front.x, door.global_position.y + 0.05, front.z), door.global_position + Vector3.UP)
	_send("interact", {"key": door.net_key})
	var r := await _expect("interacted", 15.0)
	var opened := await _wait_for(func() -> bool: return door.is_open, 5.0)
	_check(opened, "l'invité ouvre %s : ouverte chez l'hôte" % door.door_id)
	await _sleep(0.5 + latency / 500.0)
	_send("check_door", {"key": door.net_key})
	r = await _expect("door_state", 10.0)
	_check(bool(r.get("open", false)), "…et chez l'invité (état renvoyé par l'hôte)")
	var locked := _find_door(true)
	if not _check(locked != null, "porte verrouillée trouvée"):
		return
	var f2 := locked.global_transform * Vector3(0, 0, 1.2)
	if not _game().facility.nav_grid_for(f2, 0.35).is_walkable(f2):
		f2 = locked.global_transform * Vector3(0, 0, -1.2)
	await _place_client(Vector3(f2.x, locked.global_position.y + 0.05, f2.z), locked.global_position + Vector3.UP)
	_send("interact", {"key": locked.net_key})
	r = await _expect("interacted", 15.0)
	await _sleep(0.4)
	_check(not locked.is_open and locked.lock != Door.Lock.NONE, "porte verrouillée : l'hôte refuse (%s)" % locked.door_id)
	_check("verrouill" in String(r.get("message", "")).to_lower() or String(r.get("message", "")) != "",
		"…et l'invité reçoit le message sur SON écran (« %s »)" % String(r.get("message", "")))


func _test_document() -> void:
	_log("── Document lu par l'invité")
	var doc: DocumentPickup = _game().facility.nodes.get("doc_security_log")
	if not _check(doc != null and is_instance_valid(doc), "document du poste de sécurité présent"):
		return
	await _place_client(_stand_near(doc.global_position, 0.9), doc.global_position)
	_send("read_doc", {"key": doc.net_key})
	var r := await _expect("doc_read", 15.0)
	_check(GameState.has_document("doc_security_log"), "document ajouté aux archives communes (hôte)")
	_check(bool(r.get("viewer", false)), "le document s'ouvre sur l'écran de l'invité")
	_check(bool(r.get("has", false)), "…et figure dans ses archives")
	_check(not (ui.top_screen() is DocumentViewer), "rien ne s'ouvre chez l'hôte")


func _test_save_point() -> void:
	_log("── Magnétophone : sauvegarde réservée à l'hôte")
	var sp: SavePoint = null
	for n in get_tree().get_nodes_in_group("save_points"):
		if Facility.floor_at((n as Node3D).global_position.y + 0.3) == 0:
			sp = n
			break
	if not _check(sp != null, "magnétophone du rez-de-chaussée trouvé"):
		return
	await _place_client(_stand_near(sp.global_position, 0.9), sp.global_position)
	_send("interact", {"key": sp.net_key})
	var r := await _expect("interacted", 15.0)
	_check("Seul l'hôte" in String(r.get("message", "")), "l'invité : « %s »" % String(r.get("message", "")).left(60))
	_check(not (ui.top_screen() is SaveScreen), "aucun écran de sauvegarde ouvert chez l'hôte")


func _test_keypad() -> void:
	_log("── Clavier à code de l'escalier B, validé par l'hôte")
	var cp: CodePanel = _game().facility.nodes.get("stair_b_code")
	if not _check(cp != null, "clavier de l'escalier B trouvé"):
		return
	await _place_client(_stand_near(cp.global_position, 0.8), cp.global_position)
	_send("keypad", {"key": cp.net_key, "codes": ["1234", "0612"]})
	var r := await _expect("keypad_done", 30.0)
	_check(bool(r.get("opened", false)), "l'écran du clavier s'ouvre chez l'invité")
	_check(String(r.get("first", "")) == "CODE INCORRECT", "mauvais code refusé par l'hôte (« %s »)" % String(r.get("first", "")))
	_check(GameState.get_flag("stair_b_open"), "bon code : l'hôte déverrouille l'escalier B")
	_check(bool(r.get("accepted", false)), "l'invité voit « CODE ACCEPTÉ »")


func _test_elevator() -> void:
	_log("── Ascenseur : trajet de l'invité validé par l'hôte")
	var panel: ElevatorPanel = _game().facility.nodes.get("elev_panel_main_0")
	if not _check(panel != null, "panneau de l'ascenseur principal (RDC) trouvé"):
		return
	await _place_client(_stand_near(panel.global_position, 0.9), panel.global_position)
	if not GameState.get_flag("power_restored"):
		_send("interact", {"key": panel.net_key})
		var r0 := await _expect("interacted", 15.0)
		_check("aliment" in String(r0.get("message", "")), "sans courant : refus sur l'écran de l'invité (« %s »)" % String(r0.get("message", "")).left(50))
		GameState.set_flag("power_restored", true)
		_game().events.visual_power(false)
		await _sleep(0.5 + latency / 500.0)
	_send("ride", {"key": panel.net_key, "level": 1})
	var r := await _expect("rode", 40.0)
	_check(bool(r.get("screen", false)), "l'écran de l'ascenseur s'ouvre chez l'invité")
	await _sleep(0.5)
	_check(Facility.floor_at(_p2().global_position.y + 0.2) == 1, "arrivé au 1er : réplique chez l'hôte à %s" % _p2().global_position.snapped(Vector3.ONE * 0.1))
	_check(GameState.get_flag("visited_1"), "arrivée signalée au scénario de l'hôte (visited_1)")


func _test_friendly_fire() -> void:
	_log("── Tir ami (désactivé par défaut)")
	_check(not Net.friendly_fire, "option « tir ami » : NON")
	var pd1 := GameState.data(1)
	GameState.give_weapon_for(pd1, "pistol")
	pd1.set_weapon_mag("pistol", 12)
	_player().weapons.equip("pistol", true)
	await _place_client(Vector3(0.0, 0.05, -14.0), Vector3(-3.0, 1.0, -14.0))
	await _place_host(Vector3(-3.5, 0.05, -14.0), Vector3(0.0, 1.2, -14.0))
	var hp0 := GameState.data(2).hp
	var p2 := _p2()
	var shots := await _fire_at(func() -> Vector3: return p2.global_position + Vector3.UP * 1.25, 3, 8.0)
	await _sleep(0.4)
	_check(shots >= 3 and is_equal_approx(GameState.data(2).hp, hp0) and not GameState.data(2).downed,
		"%d balles de l'hôte traversent l'invité sans le blesser (%d PV)" % [shots, int(GameState.data(2).hp)])


func _test_flashlights() -> void:
	_log("── Lampes torches (une par joueur)")
	GameState.set_flag("has_flashlight", true)
	await _sleep(0.4 + latency / 500.0)
	_send("flashlight")
	var r := await _expect("flashlight_on", 10.0)
	await _sleep(0.3 + latency / 500.0)
	_check(bool(r.get("ok", false)) and _p2().flashlight.spot.visible and GameState.data(2).flashlight_on,
		"l'invité allume SA lampe : allumée chez lui et sur sa réplique chez l'hôte")
	_check(not GameState.data(1).flashlight_on, "…la lampe de l'hôte reste éteinte")
	await key(KEY_F)
	_check(GameState.data(1).flashlight_on, "l'hôte allume la sienne")
	await _sleep(0.4 + latency / 500.0)
	_send("host_light?")
	r = await _expect("host_light", 10.0)
	_check(bool(r.get("on", false)), "chez l'invité, la lampe de la réplique de l'hôte est allumée")


func _test_no_pause() -> void:
	_log("── Écrans sans pause en coopération")
	ui.open_inventory()
	await _frames(5)
	_check(ui.top_screen() is InventoryScreen and not get_tree().paused, "inventaire ouvert chez l'hôte : le monde continue (pas de pause)")
	var p2_before := _p2().global_position
	_send("walk")
	await _expect("walked", 10.0)
	await _sleep(0.3 + latency / 500.0)
	_check(_p2().global_position.distance_to(p2_before) > 0.5, "l'invité se déplace pendant ce temps (%.1f m)" % _p2().global_position.distance_to(p2_before))
	ui.close_screen(ui.inventory)
	await _frames(3)


func _test_boss() -> void:
	_log("── Boss synchronisé : le Chirurgien")
	var boss := _game().enemies.get("f3_surgeon") as Surgeon
	if not _check(boss != null and not boss.is_dead(), "Chirurgien présent au 3e"):
		return
	await _place_host(Vector3(-10.0, 12.05, -14.0), Vector3(20.0, 13.0, -14.0))
	await _place_client(Vector3(-12.0, 12.05, -14.5), Vector3(20.0, 13.0, -14.0))
	_game().events._surgeon_intro()
	var woke := await _wait_for(func() -> bool: return GameState.get_flag("surgeon_started") and boss.active, 12.0)
	_check(woke, "l'hôte déclenche le réveil (une seule fois, côté serveur)")
	await _sleep(3.0)
	_send("boss_check", {"id": "f3_surgeon"})
	var r := await _expect("boss_state", 10.0)
	_check(bool(r.get("bar", false)), "chez l'invité : barre de vie « %s »" % String(r.get("title", "")))
	_check(bool(r.get("active", false)) and float(r.get("moved", 0.0)) > 1.0, "chez l'invité : le Chirurgien est éveillé et se déplace (%.1f m)" % float(r.get("moved", 0.0)))
	boss.die()
	await _sleep(1.0 + latency / 500.0)
	_check(GameState.get_flag("surgeon_dead"), "mort du boss enregistrée par l'hôte")
	_send("boss_check", {"id": "f3_surgeon"})
	r = await _expect("boss_state", 10.0)
	_check(bool(r.get("dead", false)) and not bool(r.get("bar", true)), "chez l'invité : Chirurgien mort, barre de vie retirée")


## Vise (caméra) et tire « n » coups sur une cible ; retourne le nombre de tirs.
func _fire_at(target: Callable, n: int, timeout: float) -> int:
	var p := _player()
	var shots := 0
	var end := Time.get_ticks_msec() + int(timeout * 1000.0)
	Input.action_press("aim")
	while shots < n and Time.get_ticks_msec() < end:
		_aim_camera(target.call())
		if p.aim_blend > 0.85 and p.weapons.can_fire() and p.weapons.mag_now() > 0:
			Input.action_press("fire")
			await _frames(2)
			Input.action_release("fire")
			shots += 1
			await _sleep(0.35)
		await get_tree().process_frame
	Input.action_release("aim")
	return shots


func _aim_camera(point: Vector3) -> void:
	var rig := _game().camera_rig
	var cam := rig.cam
	var to := point - cam.global_position
	var fwd := -cam.global_transform.basis.z
	rig.yaw += wrapf(atan2(-to.x, -to.z) - atan2(-fwd.x, -fwd.z), -PI, PI)
	rig.pitch = clampf(rig.pitch + atan2(to.y, Vector2(to.x, to.z).length()) - atan2(fwd.y, Vector2(fwd.x, fwd.z).length()), -1.0, 0.8)


func _spawn_enemy(kind: String, pos: Vector3, rot: float) -> Enemy:
	var g := _game()
	var id := "coop_test_%d" % Time.get_ticks_msec()
	g.facility.spawns[id] = {"type": "hollow", "variant": kind, "pos": pos, "rot": rot, "patrol": [],
		"floor": Facility.floor_at(pos.y + 0.2), "event": true, "flag": "__debug"}
	return g.spawn_enemy(id)


## Les combats précédents ont pu blesser (voire mettre à terre) un joueur :
## l'hôte remet les deux joueurs debout, pleine santé (autorité du serveur).
func _restore_players() -> void:
	for slot in _game().players:
		var pd := GameState.data(int(slot))
		var p: Player = _game().players[slot]
		pd.downed = false
		pd.dead = false
		pd.bleed_t = 0.0
		pd.set_hp(PlayerData.MAX_HP)
		pd.changed.emit("state")
		p.revive_state()
	await _sleep(1.2 + latency / 500.0)


func _test_combat() -> void:
	_log("── Combat : tirs de l'invité exécutés par l'hôte")
	var pd2 := GameState.data(2)
	GameState.give_weapon_for(pd2, "pistol")
	pd2.equipped = "pistol"
	pd2.set_weapon_mag("pistol", 12)
	GameState.add_item_for(pd2, "ammo_9mm", 24)
	var center := Vector3(0, 0.05, -14.0)
	await _place_host(Vector3(-8.0, 0.05, -14.0), center)
	await _place_client(Vector3(6.0, 0.05, -14.0), Vector3(0, 1, -14.0))
	_send("equip", {"id": "pistol"})
	await _expect("equipped", 10.0)
	var e := _spawn_enemy("patient", Vector3(1.5, 0.05, -14.0), -PI * 0.5)
	if not _check(e != null, "créature apparue entre les deux joueurs"):
		return
	e.activate_hunt()
	var mag0 := pd2.weapon_mag("pistol") + pd2.count_item("ammo_9mm")
	var targeted_p2 := false
	_send("shoot", {"id": e.enemy_id})
	var end := Time.get_ticks_msec() + 30000
	while Time.get_ticks_msec() < end and not e.is_dead():
		if e._target == _p2():
			targeted_p2 = true
		# L'hôte reste hors de portée : l'invité doit s'en charger
		_player().place(Vector3(-8.0, 0.05, -14.0), 0.0)
		await get_tree().process_frame
	var r := await _expect("shot_done", 15.0)
	_check(e.is_dead(), "la créature meurt sous les balles de l'invité (%d tirs envoyés)" % int(r.get("shots", 0)))
	_check(targeted_p2, "elle visait le joueur 2 (le plus proche)")
	var used := mag0 - (pd2.weapon_mag("pistol") + pd2.count_item("ammo_9mm"))
	_check(used > 0 and used <= int(r.get("shots", 0)) + 1, "munitions décomptées par l'hôte : %d balle(s) (invité : %d tir(s))" % [used, int(r.get("shots", 0))])
	_check(bool(r.get("dead_seen", false)), "chez l'invité, la créature est morte aussi")


func _test_targeting() -> void:
	_log("── Changement de cible des créatures")
	await _place_host(Vector3(-2.5, 0.05, -14.0), Vector3(0.0, 1.0, -14.0))
	await _place_client(Vector3(9.0, 0.05, -14.0), Vector3(0.0, 1.0, -14.0))
	var e := _spawn_enemy("patient", Vector3(0.0, 0.05, -14.0), 0.0)
	if not _check(e != null, "créature apparue"):
		return
	e._choose_target()
	_log("    créature %s, hôte %s, invité %s" % [e.global_position.snapped(Vector3.ONE * 0.1), _player().global_position.snapped(Vector3.ONE * 0.1), _p2().global_position.snapped(Vector3.ONE * 0.1)])
	_check(e._target == _player(), "l'hôte est le plus proche : il est visé (hôte à %.1f m, invité à %.1f m, cible : %s)" % [
		e.global_position.distance_to(_player().global_position), e.global_position.distance_to(_p2().global_position),
		e._target.name if e._target else "aucune"])
	await _place_host(Vector3(-14.0, 0.05, -14.0), e.global_position)
	await _place_client(Vector3(2.5, 0.05, -14.0), e.global_position)
	e._choose_target()
	_check(e._target == _p2(), "l'invité s'approche, l'hôte s'éloigne : la créature change de cible")
	e.die()
	await _sleep(0.3)


func _test_downed_revive() -> void:
	_log("── Joueur à terre et réanimation")
	# Pas de créature de l'étage attirée par les coups de feu pendant le test
	DebugTools.kill_all(false)
	_log("    avant : hôte %d PV%s, invité %d PV%s" % [int(GameState.data(1).hp), " (à terre)" if GameState.data(1).downed else "",
		int(GameState.data(2).hp), " (à terre)" if GameState.data(2).downed else ""])
	await _restore_players()
	var p2 := _p2()
	var center := Vector3(0, 0.05, -14.0)
	await _place_client(center, center + Vector3(0, 0, -3))
	p2.take_damage(500.0, center + Vector3(0, 0, -1))
	await _sleep(0.3)
	_check(GameState.data(2).downed and not GameState.data(2).dead, "joueur 2 à terre (30 s pour le relever)")
	_check("À TERRE" in ui.message_label.text, "message chez l'hôte : « %s »" % ui.message_label.text)
	var r := await _expect("downed_seen", 10.0)
	_check(bool(r.get("ok", false)), "chez l'invité : à terre, bandeau affiché (« %s »)" % String(r.get("banner", "")))
	await _place_host(center + Vector3(1.2, 0, 0), p2.global_position + Vector3.UP * 0.4)
	var focus := await _wait_for(func() -> bool: return _player().focused == p2.revive_spot, 3.0)
	_check(focus, "invite « [E] %s »" % p2.revive_spot.get_prompt())
	await key(KEY_E)
	var revived := await _wait_for(func() -> bool: return not GameState.data(2).downed, 6.0)
	_check(revived and is_equal_approx(GameState.data(2).hp, PlayerData.REVIVE_HP), "réanimé en 2 s avec %d PV" % int(GameState.data(2).hp))
	r = await _expect("revived_seen", 10.0)
	_check(bool(r.get("ok", false)), "chez l'invité : relevé, %d PV" % int(r.get("hp", 0)))
	# Dans l'autre sens : l'hôte à terre, l'invité le relève
	await _sleep(1.2)
	var me := _player()
	me.take_damage(500.0, me.global_position + Vector3.FORWARD)
	await _sleep(0.2)
	_check(GameState.data(1).downed, "joueur 1 (l'hôte) à terre")
	await _place_client(me.global_position + Vector3(1.2, 0, 0), me.global_position + Vector3.UP * 0.4)
	_send("revive_host")
	var up := await _wait_for(func() -> bool: return not GameState.data(1).downed, 10.0)
	_check(up and not me.is_dead and is_equal_approx(GameState.data(1).hp, PlayerData.REVIVE_HP),
		"l'invité relève l'hôte ([E] près de lui) : %d PV" % int(GameState.data(1).hp))
	await _expect("revive_host_done", 10.0)


func _test_game_over_retry() -> void:
	_log("── Mort, GAME OVER, RETRY")
	DebugTools.kill_all(false)
	await _restore_players()
	# Répit d'une seconde après la réanimation
	await _sleep(1.2)
	var p2 := _p2()
	p2.take_damage(500.0, p2.global_position)
	await _sleep(0.2)
	GameState.data(2).bleed_t = 0.4
	var dead := await _wait_for(func() -> bool: return GameState.data(2).dead, 4.0)
	_check(dead, "joueur 2 mort après son temps à terre")
	_player().take_damage(500.0, _player().global_position + Vector3.FORWARD)
	var over := await _wait_for(func() -> bool: return ui.top_screen() is DeathScreen, 8.0)
	_check(over and ui.death_screen.title.text == "GAME OVER", "plus personne debout : GAME OVER chez l'hôte")
	var r := await _expect("gameover_seen", 12.0)
	_check(bool(r.get("ok", false)), "GAME OVER chez l'invité (RETRY réservé à l'hôte : %s)" % str(r.get("retry_hidden", false)))
	_press(ui.death_screen, "RETRY")
	var back := await _wait_for(func() -> bool:
		return _game() != null and _game().coop != null and _game().players.size() >= 2 \
			and not _game().coop._ready_peers.is_empty() and not _player().is_dead, 40.0)
	_check(back, "RETRY : partie rechargée pour les deux joueurs")
	r = await _expect("reloaded", 30.0)
	_check(bool(r.get("ok", false)), "l'invité a rechargé la partie (joueur %d, %d PV)" % [int(r.get("slot", 0)), int(r.get("hp", 0))])


func _test_disconnect_rejoin() -> void:
	_log("── Déconnexion et reconnexion")
	await _sleep(1.0)
	_send("leave")
	var gone := await _wait_for(func() -> bool: return _game().players.size() == 1, 15.0)
	_check(gone, "l'invité quitte : sa réplique disparaît, la partie continue")
	_check("DÉCONNECTÉ" in ui.message_label.text, "message « %s »" % ui.message_label.text)
	_check(GameState.players.has(2), "ses données sont gardées pour son retour")
	var p2_items := GameState.data(2).to_dict()
	var back := await _wait_for(func() -> bool:
		return _game().players.size() >= 2 and not _game().coop._ready_peers.is_empty(), 45.0)
	_check(back, "l'invité revient en cours de partie (reconnexion)")
	var r := await _expect("rejoined", 30.0)
	_check(bool(r.get("ok", false)), "chez l'invité : de retour dans le monde, inventaire retrouvé (%s)" % str(r.get("inv", "")))
	_check(str(p2_items.get("inventory", [])) == str(GameState.data(2).to_dict().get("inventory", [])), "inventaire du joueur 2 identique après la reconnexion")


func _test_intruder() -> void:
	_log("── Troisième joueur (refusé)")
	# Directement sur le port de l'hôte (le relais de latence ne sert qu'un client)
	var pid := _spawn("intruder", port)
	var done := await _wait_for(func() -> bool: return not OS.is_process_running(pid), 40.0)
	var code := OS.get_process_exit_code(pid) if done else -1
	_check(done and code == 0, "troisième joueur refusé : « partie complète » (code %d)" % code)
	_check(_game().players.size() == 2, "toujours deux joueurs dans la partie")


func _finish() -> void:
	if _client_pid > 0 and Net.player_count() >= 2:
		# Dernier scénario : l'hôte quitte, l'invité doit revenir au menu sans planter
		_log("── L'hôte quitte la partie")
		_send("host_leaving")
		await _expect("ready_for_host_quit", 10.0)
		ui.request_quit_to_menu()
		var menu := await _wait_for(func() -> bool: return ui.top_screen() is MainMenu, 15.0)
		_check(menu and not Net.active, "hôte : retour au menu, session fermée")
		var ended := await _wait_for(func() -> bool: return not OS.is_process_running(_client_pid), 30.0)
		_client_failures = OS.get_process_exit_code(_client_pid) if ended else -1
		if not ended:
			OS.kill(_client_pid)
		_check(ended, "l'invité revient au menu (« L'HÔTE A QUITTÉ LA PARTIE ») et termine son test")
	elif _client_pid > 0:
		_send("done")
		var r := await _expect("client_result", 20.0)
		_client_failures = int(r.get("failures", -1))
		if not await _wait_for(func() -> bool: return not OS.is_process_running(_client_pid), 15.0):
			OS.kill(_client_pid)
	if _proxy:
		_log("relais : %d paquets transmis, %d perdus" % [_proxy.forwarded, _proxy.dropped])
	_check(_errors.count == 0, "hôte : aucune erreur de script ou du moteur (%d%s)" % [_errors.count, (" : " + _errors.first) if _errors.first != "" else ""])
	var total := failures + maxi(_client_failures, 0) + (1 if _client_failures < 0 else 0)
	_log("Coopération en réseau : %s (hôte : %d échec(s), invité : %s)." % [
		"tout est OK" if total == 0 else "ÉCHECS", failures, str(_client_failures) if _client_failures >= 0 else "sans réponse"])
	get_parent().call("quit_game", 0 if total == 0 else 1)


# =================================================================================
#  INVITÉ
# =================================================================================

func _run_client() -> void:
	_watchdog()
	await _wait_menu()
	await _join()
	var in_game := await _wait_for(func() -> bool: return _game() != null and _player() != null and _game().coop != null, 60.0)
	_check(in_game and GameState.local_slot == 2, "l'hôte lance la partie : je suis le joueur 2 dans le monde")
	_check(_game() != null and _game().players.has(1), "la réplique de l'hôte est là")
	while true:
		var m := await _next_msg()
		var kind := String(m[0])
		var d: Dictionary = m[1]
		match kind:
			"start":
				await _client_move()
			"host_pos":
				await _sleep(0.3)
				var hp1: Player = _game().players.get(1)
				var dist: float = hp1.global_position.distance_to(d.pos) if hp1 else 99.0
				_send("host_pos_seen", {"ok": dist < 1.0, "dist": dist})
			"interact":
				await _client_interact(String(d.key))
			"check_gone":
				var n := _game().net_node(String(d.key))
				_send("gone_state", {"gone": n == null or not is_instance_valid(n) or n.is_queued_for_deletion()})
			"check_door":
				await _sleep(0.2)
				var door := _game().net_node(String(d.key)) as Door
				_send("door_state", {"open": door != null and door.is_open})
			"equip":
				await key(KEY_2)
				await _sleep(0.5)
				_send("equipped", {"id": _player().weapons.current})
			"shoot":
				await _client_shoot(String(d.id))
			"read_doc":
				await _client_read_doc(String(d.key))
			"flashlight":
				await key(KEY_F)
				await _sleep(0.2)
				_send("flashlight_on", {"ok": GameState.flashlight_on and _player().flashlight.spot.visible})
			"host_light?":
				var hp1: Player = _game().players.get(1)
				_send("host_light", {"on": hp1 != null and hp1.flashlight.spot.visible})
			"walk":
				Input.action_press("move_right")
				await _sleep(1.0)
				Input.action_release("move_right")
				_send("walked")
			"boss_check":
				var b: Enemy = _game().enemies.get(String(d.id))
				if not _boss_start.has(String(d.id)) and b:
					_boss_start[String(d.id)] = b.global_position
				await _sleep(0.8)
				_send("boss_state", {"bar": ui.boss_box.visible, "title": ui.boss_name.text,
					"active": b != null and bool(b.get("active")),
					"moved": b.global_position.distance_to(_boss_start.get(String(d.id), b.global_position)) if b else 0.0,
					"dead": b != null and b.is_dead()})
			"keypad":
				await _client_keypad(String(d.key), d.codes)
			"ride":
				await _client_ride(String(d.key), int(d.level))
			"host_downed":
				pass
			"leave":
				await _client_leave_and_rejoin()
			"revive_host":
				var hp1: Player = _game().players.get(1)
				if await _focus_and_press("revive:1"):
					await _wait_for(func() -> bool: return hp1 != null and not hp1.data.downed, 8.0)
				_send("revive_host_done")
			"host_leaving":
				_send("ready_for_host_quit")
				var back := await _wait_for(func() -> bool: return ui.top_screen() is MainMenu, 20.0)
				_check(back and not Net.active, "l'hôte est parti : retour au menu principal, sans plantage")
				_check(_errors.count == 0, "invité : aucune erreur de script ou du moteur (%d%s)" % [_errors.count, (" : " + _errors.first) if _errors.first != "" else ""])
				_log("Invité : %d échec(s)." % failures)
				get_parent().call("quit_game", mini(failures, 100))
				return
			"done":
				_check(_errors.count == 0, "invité : aucune erreur de script ou du moteur (%d%s)" % [_errors.count, (" : " + _errors.first) if _errors.first != "" else ""])
				_send("client_result", {"failures": failures})
				await _sleep(0.5)
				get_parent().call("quit_game", 0 if failures == 0 else 1)
				return
		# Réactions automatiques (état poussé par l'hôte)
	await _frames(1)


func _join() -> void:
	ui.open_coop()
	await _frames(3)
	_press(ui.coop_menu, "JOIN GAME")
	await _frames(3)
	if not _rejoining:
		# SEARCH SESSION : la partie de l'hôte doit apparaître (réseau local)
		var found := [[]]
		var cb := func(list: Array) -> void: found[0] = list
		Net.sessions_found.connect(cb)
		_press(ui.coop_menu, "SEARCH SESSION")
		await _sleep(2.2)
		Net.sessions_found.disconnect(cb)
		var hosts: Array = found[0]
		_check(not hosts.is_empty() and String(hosts[0].get("protocol", "")) == Net.PROTOCOL,
			"SEARCH SESSION : %d partie(s) trouvée(s) (%s)" % [hosts.size(), ", ".join(hosts.map(func(h: Dictionary) -> String: return "%s:%d" % [h.get("ip", "?"), int(h.get("port", 0))]))])
	ui.coop_menu.ip_edit.text = "%s:%d" % [addr, port]
	_press(ui.coop_menu, "REJOINDRE")
	var ok := await _wait_for(func() -> bool: return ui.coop_menu.page == "waiting" or _game() != null, 20.0)
	_check(ok, "JOIN GAME : connecté à %s:%d" % [addr, port])


func _client_move() -> void:
	_watch_state()
	var p := _player()
	Input.action_press("move_forward")
	await _sleep(1.5)
	Input.action_release("move_forward")
	await _sleep(0.4)
	_send("moved", {"pos": p.global_position})


## Suit les changements poussés par l'hôte (à terre, relevé, GAME OVER, rechargement).
func _watch_state() -> void:
	var was_down := false
	var was_over := false
	var game_ref := _game()
	while true:
		await get_tree().process_frame
		var g := _game()
		var p := _player()
		if g == null or p == null:
			continue
		if g != game_ref:
			# Nouvelle partie reçue de l'hôte (RETRY ou reconnexion)
			game_ref = g
			was_down = false
			was_over = false
			await _sleep(1.0)
			if _player():
				_send("reloaded" if not _rejoining else "rejoined", {"ok": GameState.local_slot == 2 and not _player().is_dead,
					"slot": GameState.local_slot, "hp": GameState.hp, "inv": _inv_text()})
			continue
		if p.data.downed and not was_down:
			was_down = true
			await _sleep(0.3)
			_send("downed_seen", {"ok": ui.hud.downed_label.visible, "banner": ui.hud.downed_label.text.get_slice("\n", 0)})
		elif was_down and not p.data.downed:
			was_down = false
			if not p.data.dead:
				_send("revived_seen", {"ok": not p.is_dead and p.controls_enabled, "hp": p.data.hp})
		if ui.top_screen() is DeathScreen and not was_over:
			was_over = true
			await _sleep(0.3)
			_send("gameover_seen", {"ok": ui.death_screen.title.text == "GAME OVER",
				"retry_hidden": not ui.death_screen.retry_btn.visible})


var _rejoining := false
var _boss_start := {}


func _inv_text() -> String:
	var out: Array = []
	for s in GameState.inventory:
		if String(s.id) != "":
			out.append("%s x%d" % [s.id, int(s.count)])
	return ", ".join(out)


func _client_interact(net_key: String) -> void:
	var p := _player()
	var it := _game().net_node(net_key) as Interactable
	var ok := await _wait_for(func() -> bool: return p.focused != null and p.focused.net_key == net_key, 5.0)
	if not _check(ok, "objet ciblé (%s ; ciblé : %s)" % [net_key, p.focused.net_key if p.focused else "rien"]):
		_send("interacted", {})
		return
	ui.message_label.text = ""
	await key(KEY_E)
	await _sleep(0.8 + latency / 500.0)
	_send("interacted", {
		"gone": it == null or not is_instance_valid(it) or it.is_queued_for_deletion(),
		"ammo": GameState.count_item("ammo_9mm"),
		"has_key": GameState.has_item("key_pharmacy"),
		"message": ui.message_label.text,
	})


func _client_shoot(enemy_id: String) -> void:
	var p := _player()
	var ok := await _wait_for(func() -> bool: return _game().enemies.has(enemy_id), 8.0)
	_check(ok, "la créature apparue chez l'hôte est là (réplique)")
	var e: Enemy = _game().enemies.get(enemy_id)
	var shots := 0
	var end := Time.get_ticks_msec() + 25000
	Input.action_press("aim")
	while e and is_instance_valid(e) and not e.is_dead() and Time.get_ticks_msec() < end:
		var target := e.rig.joint("chest").global_position
		var cam := _game().camera_rig.cam
		var to := target - cam.global_position
		var fwd := -cam.global_transform.basis.z
		_game().camera_rig.yaw += wrapf(atan2(-to.x, -to.z) - atan2(-fwd.x, -fwd.z), -PI, PI)
		_game().camera_rig.pitch = clampf(_game().camera_rig.pitch + atan2(to.y, Vector2(to.x, to.z).length()) - atan2(fwd.y, Vector2(fwd.x, fwd.z).length()), -1.0, 0.8)
		if p.aim_blend > 0.85 and p.weapons.can_fire():
			if p.weapons.mag_now() == 0:
				Input.action_release("fire")
				await key(KEY_R)
				await _sleep(1.6)
				continue
			Input.action_press("fire")
			await _frames(2)
			Input.action_release("fire")
			shots += 1
			await _sleep(0.3)
		await get_tree().process_frame
	Input.action_release("aim")
	await _sleep(0.8 + latency / 500.0)
	_send("shot_done", {"shots": shots, "dead_seen": e != null and is_instance_valid(e) and e.is_dead()})


func _focus_and_press(net_key: String) -> bool:
	var p := _player()
	var ok := await _wait_for(func() -> bool: return p.focused != null and p.focused.net_key == net_key, 5.0)
	if not _check(ok, "objet ciblé (%s ; ciblé : %s)" % [net_key, p.focused.net_key if p.focused else "rien"]):
		return false
	await key(KEY_E)
	return true


func _client_read_doc(net_key: String) -> void:
	var doc_id := net_key.substr(4)
	var viewer := false
	if await _focus_and_press(net_key):
		viewer = await _wait_for(func() -> bool: return ui.top_screen() is DocumentViewer, 4.0)
		await _sleep(0.5)
		await key(KEY_E)
		await _sleep(0.3)
	_send("doc_read", {"viewer": viewer, "has": GameState.has_document(doc_id)})


func _client_keypad(net_key: String, codes: Array) -> void:
	var res := {"opened": false, "first": "", "accepted": false}
	if await _focus_and_press(net_key):
		res.opened = await _wait_for(func() -> bool: return ui.top_screen() is KeypadScreen, 4.0)
		if res.opened:
			var kp := ui.keypad
			for c in String(codes[0]):
				await key(KEY_0 + int(c))
			await _wait_for(func() -> bool: return kp.status.text == "CODE INCORRECT", 5.0)
			res.first = kp.status.text
			await _sleep(0.9)
			for c in String(codes[1]):
				await key(KEY_0 + int(c))
			res.accepted = await _wait_for(func() -> bool: return kp.status.text == "CODE ACCEPTÉ", 5.0)
			await _wait_for(func() -> bool: return not (ui.top_screen() is KeypadScreen), 3.0)
	_send("keypad_done", res)


func _client_ride(net_key: String, level: int) -> void:
	var res := {"screen": false}
	if await _focus_and_press(net_key):
		res.screen = await _wait_for(func() -> bool: return ui.top_screen() is ElevatorScreen, 4.0)
		if res.screen:
			var want := HospitalLevel.floor_label(level).rpad(8)
			var found := false
			for dir in [KEY_DOWN, KEY_UP]:
				for i in 18:
					var f := get_viewport().gui_get_focus_owner() as Button
					if f and f.text.begins_with(want) and not f.disabled:
						found = true
						break
					await key(dir)
				if found:
					break
			_check(found, "étage %d dans la liste de l'ascenseur" % level)
			await key(KEY_ENTER)
			var arrived := await _wait_for(func() -> bool:
				return Facility.floor_at(_player().global_position.y + 0.2) == level and not _game().traveling, 15.0)
			_check(arrived, "trajet autorisé par l'hôte : arrivé au niveau %d" % level)
			await _sleep(0.5 + latency / 500.0)
	_send("rode", res)


func _client_leave_and_rejoin() -> void:
	# Comme un joueur : pause → QUIT TO MENU (la session se ferme), puis CO-OP → JOIN
	ui.open_screen(ui.pause_menu)
	await _frames(3)
	_press(ui.pause_menu, "QUIT TO MENU")
	await _frames(3)
	_press(ui.pause_menu, "OUI, QUITTER")
	var menu := await _wait_for(func() -> bool: return ui.top_screen() is MainMenu, 15.0)
	_check(menu and not Net.active, "quitté : retour au menu, session fermée")
	await _sleep(2.0)
	_rejoining = true
	await _join()


# =================================================================================
#  INTRUS (troisième joueur)
# =================================================================================

func _run_intruder() -> void:
	await _wait_menu()
	var reason := [""]
	Net.connection_failed.connect(func(r: String) -> void: reason[0] = r)
	ui.open_coop()
	await _frames(3)
	_press(ui.coop_menu, "JOIN GAME")
	await _frames(3)
	ui.coop_menu.ip_edit.text = "%s:%d" % [addr, port]
	_press(ui.coop_menu, "REJOINDRE")
	var failed := await _wait_for(func() -> bool: return String(reason[0]) != "", 25.0)
	_check(failed and "complète" in String(reason[0]), "refusé : « %s »" % String(reason[0]))
	_check(ui.coop_menu.page == "failed" and ui.coop_menu.title.text == "CONNECTION FAILED", "écran CONNECTION FAILED")
	_check(_errors.count == 0, "intrus : aucune erreur (%d%s)" % [_errors.count, (" : " + _errors.first) if _errors.first != "" else ""])
	get_parent().call("quit_game", 0 if failures == 0 else 1)

extends Node
## Test de bout en bout : joue la campagne complète avec de vraies entrées
## (actions clavier, rotation de caméra, touche E, tir, clavier du coffre,
## menus), du parking jusqu'à l'écran de fin. Affiche un rapport étape par
## étape et quitte avec le code 0 si la campagne est terminée.
##
## Lancement : godot --headless --fixed-fps 60 --path . -- --autoplay
## Options : --shots=DOSSIER (captures, en mode rendu), --from=ÉTAPE

var game: Game
var player: Player
var log_lines: Array[String] = []
var shots_dir := ""
var step_name := ""
var t0 := 0
var _last_hp := 100.0
var deaths := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			shots_dir = a.substr(8)
	t0 = Time.get_ticks_msec()
	_run()


func _log(msg: String) -> void:
	var line := "[%6.1fs | jeu %6.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, GameState.playtime, msg]
	print(line)
	log_lines.append(line)


func _fail(msg: String) -> void:
	_log("ÉCHEC à l'étape « %s » : %s" % [step_name, msg])
	_log("Position joueur : %s  PV : %d  zone : %s" % [player.global_position if player else Vector3.ZERO, int(GameState.hp), GameState.current_zone])
	_log("Drapeaux : %s" % str(GameState.flags.keys()))
	await _shot("echec")
	_quit(1)


func _step(n: String) -> void:
	_keep_checkpoint()
	step_name = n
	_log("── ÉTAPE : " + n)


## Copie chaque nouvelle sauvegarde automatique dans user://test_checkpoints/
## (rechargées ensuite par tests/checkpoints.gd).
const CHECKPOINT_DIR := "user://test_checkpoints"
var _last_checkpoint := -1.0
var _checkpoint_count := 0


func _keep_checkpoint() -> void:
	var d := SaveSystem.load_slot(0)
	if d.is_empty():
		return
	var t := float(d.get("saved_at", 0.0))
	if t == _last_checkpoint:
		return
	_last_checkpoint = t
	d["checkpoint_step"] = step_name
	DirAccess.make_dir_recursive_absolute(CHECKPOINT_DIR)
	var f := FileAccess.open("%s/%02d.json" % [CHECKPOINT_DIR, _checkpoint_count], FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(d))
		_checkpoint_count += 1


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


func _secs(s: float) -> void:
	await _frames(int(s * 60.0))


func _shot(label: String) -> void:
	if shots_dir == "" or DisplayServer.get_name() == "headless":
		return
	await _frames(2)
	var img := get_viewport().get_texture().get_image()
	if img:
		img.save_png("%s/%s.png" % [shots_dir, label])
	_log("  [rendu %s] %s" % [label, PerfOverlay.summary().replace("\n", "  ·  ")])


# --- Entrées simulées --------------------------------------------------------------

func press(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(2)
	var up := InputEventAction.new()
	up.action = action
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(2)


func key(code: int) -> void:
	var ev := InputEventKey.new()
	ev.physical_keycode = code
	ev.keycode = code
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(2)
	var up := ev.duplicate()
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(3)


func release_all() -> void:
	for a in ["move_forward", "move_back", "move_left", "move_right", "run", "aim", "fire"]:
		Input.action_release(a)


func face(point: Vector3, pitch: bool = false) -> void:
	var to := point - (player.global_position + Vector3.UP * 1.5)
	if pitch:
		# Visée : le rayon part de la caméra (placée au-dessus de l'épaule),
		# pas du joueur — on vise donc depuis la caméra, en corrigeant l'écart
		# entre l'orientation voulue et l'orientation réelle (lissage, recul).
		var cam := game.camera_rig.cam
		var from := cam.global_position
		to = point - from
		var want_yaw := atan2(-to.x, -to.z)
		var want_pitch := atan2(to.y, Vector2(to.x, to.z).length())
		var fwd := -cam.global_transform.basis.z
		var cur_yaw := atan2(-fwd.x, -fwd.z)
		var cur_pitch := atan2(fwd.y, Vector2(fwd.x, fwd.z).length())
		game.camera_rig.yaw += wrapf(want_yaw - cur_yaw, -PI, PI)
		game.camera_rig.pitch = clampf(game.camera_rig.pitch + (want_pitch - cur_pitch), -1.0, 0.8)
		return
	game.camera_rig.yaw = atan2(-to.x, -to.z)
	game.camera_rig.pitch = -0.12


## Vrai si le rayon de visée actuel de la caméra passe près de « point ».
func aimed_at(point: Vector3, tol: float = 0.12) -> bool:
	var cam := game.camera_rig.cam
	var from := cam.global_position
	var fwd := -cam.global_transform.basis.z
	var to := point - from
	var along := to.dot(fwd)
	if along <= 0.0:
		return false
	return (to - fwd * along).length() < tol


# --- Déplacement ----------------------------------------------------------------------

func _grid_for(p: Vector3) -> NavGrid:
	return game.facility.nav_grids[1 if p.y < -2.0 else 0]


## Se rend à « target » en suivant la grille de navigation. Retourne true si atteint.
func goto(target: Vector3, tol: float = 0.7, run: bool = false, timeout: float = 60.0, fight: bool = true) -> bool:
	var elapsed := 0.0
	var path := PackedVector3Array()
	var idx := 0
	var repath := 0.0
	var stuck_t := 0.0
	var last := player.global_position
	while elapsed < timeout:
		if player.is_dead:
			return false
		if fight and await _handle_threats():
			path = PackedVector3Array()
		if not player.controls_enabled or get_tree().paused:
			release_all()
			await _frames(1)
			elapsed += 1.0 / 60.0
			continue
		var pos := player.global_position
		var flat := Vector2(target.x - pos.x, target.z - pos.z)
		if flat.length() < tol:
			release_all()
			return true
		repath -= 1.0 / 60.0
		if path.is_empty() or repath <= 0.0:
			var grid := _grid_for(pos)
			path = grid.find_path(pos, target)
			idx = 0
			repath = 1.0
		var wp := target
		while idx < path.size() and Vector2(path[idx].x - pos.x, path[idx].z - pos.z).length() < 0.5:
			idx += 1
		if idx < path.size():
			wp = path[idx]
		face(Vector3(wp.x, pos.y + 1.5, wp.z))
		Input.action_press("move_forward")
		if run:
			Input.action_press("run")
		else:
			Input.action_release("run")
		await _frames(1)
		elapsed += 1.0 / 60.0
		stuck_t += 1.0 / 60.0
		if stuck_t > 1.5:
			if player.global_position.distance_to(last) < 0.3:
				# Coincé : petit pas de côté et nouveau chemin
				Input.action_release("move_forward")
				Input.action_press("move_left" if randf() < 0.5 else "move_right")
				await _secs(0.4)
				Input.action_release("move_left")
				Input.action_release("move_right")
				path = PackedVector3Array()
			last = player.global_position
			stuck_t = 0.0
	release_all()
	return false


## Marche en ligne droite (escaliers, rampes).
func walk_straight(target: Vector3, tol: float = 0.6, timeout: float = 20.0) -> bool:
	var elapsed := 0.0
	while elapsed < timeout:
		var pos := player.global_position
		if Vector2(target.x - pos.x, target.z - pos.z).length() < tol:
			release_all()
			return true
		face(Vector3(target.x, pos.y + 1.5, target.z))
		Input.action_press("move_forward")
		await _frames(1)
		elapsed += 1.0 / 60.0
	release_all()
	return false


func interact_with(node: Node3D, approach: float = 0.9) -> bool:
	if node == null or not is_instance_valid(node):
		await _fail("objet d'interaction introuvable")
		return false
	var it := node as Interactable
	var fp := it.focus_position()
	var stand := Vector3(fp.x, player.global_position.y, fp.z)
	# On s'approche jusqu'à ce que l'objet soit ciblé
	var ok := await goto(stand, approach + 0.2, false, 40.0)
	for attempt in 3:
		face(fp)
		await _frames(12)
		if player.focused == it:
			await press("interact")
			await _frames(6)
			return true
		# Rapprochement supplémentaire
		await goto(stand, 0.45, false, 6.0)
	face(fp)
	await _frames(12)
	if player.focused == it:
		await press("interact")
		await _frames(6)
		return true
	_log("Impossible de cibler %s (ciblé : %s, distance %.2f)" % [node.name, player.focused.name if player.focused else "rien", player.global_position.distance_to(fp)])
	return false


func node(name: String) -> Node3D:
	return game.facility.nodes.get(name)


func door(id: String) -> Door:
	return game.facility.doors.get(id)


func open_door(id: String) -> bool:
	var d := door(id)
	if d == null:
		await _fail("porte %s introuvable" % id)
		return false
	if d.is_open:
		return true
	if not await interact_with(d, 1.0):
		return false
	for i in 90:
		if d.is_open:
			return true
		await _frames(1)
	_log("La porte %s ne s'est pas ouverte (verrou %d) : %s" % [id, d.lock, d.locked_msg])
	return false


func close_modal() -> void:
	# Ferme document / message modal éventuel
	for i in 30:
		if GameState.ui.top_screen() == null:
			return
		var top: UIScreen = GameState.ui.top_screen()
		if top is DocumentViewer:
			await press("interact")
		elif top is SaveScreen or top is InventoryScreen or top is PauseMenu:
			await press("pause")
		else:
			await _frames(5)
		await _frames(6)


func read_doc(doc_id: String) -> bool:
	var d := node(doc_id)
	if d == null or not is_instance_valid(d):
		if GameState.has_document(doc_id):
			return true
		await _fail("document %s introuvable" % doc_id)
		return false
	if not await interact_with(d, 0.9):
		return false
	await _frames(20)
	if not GameState.has_document(doc_id):
		_log("Document %s non collecté" % doc_id)
		return false
	if not (GameState.ui.top_screen() is DocumentViewer):
		_log("La visionneuse de document ne s'est pas ouverte")
		return false
	await _secs(0.6)
	await press("interact")
	await _frames(10)
	_log("Document lu : %s" % DocumentDB.get_doc(doc_id).title)
	return true


func pick(id: String) -> bool:
	var p := node(id)
	if p == null or not is_instance_valid(p):
		if GameState.taken_pickups.has(id):
			return true
		await _fail("objet %s introuvable" % id)
		return false
	if not await interact_with(p, 0.8):
		return false
	await _frames(10)
	if not GameState.taken_pickups.has(id):
		_log("Objet %s non ramassé (%s)" % [id, GameState.ui.message_label.text])
		return false
	_log("Ramassé : %s  — inventaire %s" % [id, _inv()])
	return true


func _inv() -> String:
	var parts := []
	for s in GameState.inventory:
		if s.id != "":
			parts.append("%s x%d" % [s.id, s.count])
	return ", ".join(parts)


func wait_controls(timeout: float = 30.0) -> void:
	var t := 0.0
	while t < timeout and (not player.controls_enabled or get_tree().paused):
		if GameState.ui.top_screen() is DocumentViewer:
			await press("interact")
		await _frames(6)
		t += 0.1


func wait_flag(flag: String, timeout: float = 20.0) -> bool:
	var t := 0.0
	while t < timeout:
		if GameState.get_flag(flag):
			return true
		await _frames(6)
		t += 0.1
	return false


# --- Combat -----------------------------------------------------------------------------

func _visible_threat(max_dist: float = 11.0) -> Enemy:
	var best: Enemy = null
	var best_d := max_dist
	for e in get_tree().get_nodes_in_group("enemies"):
		var en := e as Enemy
		if en == null or en.is_dead() or en.dormant or (en is Surgeon and not (en as Surgeon).active):
			continue
		if absf(en.global_position.y - player.global_position.y) > 2.0:
			continue
		var d := en.global_position.distance_to(player.global_position)
		if d < best_d and en.state in [Enemy.State.CHASE, Enemy.State.ATTACK, Enemy.State.INVESTIGATE]:
			var q := PhysicsRayQueryParameters3D.create(player.global_position + Vector3.UP * 1.5, en.global_position + Vector3.UP * 1.4, 1 | 16)
			if player.get_world_3d().direct_space_state.intersect_ray(q).is_empty():
				best = en
				best_d = d
	return best


## Si une créature menace et qu'on est armé : on la combat. Retourne true si un combat a eu lieu.
func _handle_threats() -> bool:
	if not player.has_pistol() or not player.controls_enabled:
		return false
	var e := _visible_threat()
	if e == null:
		return false
	await fight(e)
	return true


func fight(e: Enemy, timeout: float = 45.0) -> bool:
	_log("Combat : %s (%s, %d PV)" % [e.enemy_id, Enemy.STATE_NAMES[e.state], int(e.hp)])
	var t := 0.0
	release_all()
	while t < timeout and not e.is_dead() and not player.is_dead:
		if not player.controls_enabled or get_tree().paused:
			release_all()
			await _frames(3)
			t += 0.05
			continue
		if GameState.hp < 45.0 and GameState.has_item("spray"):
			await press("quick_heal")
		if GameState.weapon_mag() == 0:
			if GameState.count_item("ammo_9mm") == 0:
				_log("Plus de munitions : on fuit")
				release_all()
				return false
			Input.action_release("fire")
			Input.action_release("aim")
			if player.weapons.reloading:
				# Rechargement en cours : on recule sans esquiver (l'esquive l'annulerait).
				face(e.global_position + Vector3.UP * 1.5)
				Input.action_press("move_back")
				await _frames(4)
				t += 4.0 / 60.0
				continue
			Input.action_release("move_back")
			# Au contact, on prend d'abord de la distance (esquive) avant de recharger.
			if e.global_position.distance_to(player.global_position) < 3.0:
				await dodge_away_from(e)
			await press("reload")
			await _frames(6)
			t += 0.1
			continue
		var head := e.rig.joint("head").global_position + Vector3.UP * 0.1
		var d := e.global_position.distance_to(player.global_position)
		Input.action_press("aim")
		face(head, true)
		# Recul si trop près
		if d < 2.4:
			Input.action_press("move_back")
		else:
			Input.action_release("move_back")
		if player.aim_blend > 0.85 and player.weapons.can_fire() and aimed_at(head, 0.1):
			var mag := GameState.weapon_mag()
			Input.action_press("fire")
			await _frames(2)
			Input.action_release("fire")
			if GameState.weapon_mag() < mag:
				_log("  tir → %s  (cible %s, d=%.1f, PV %d)" % [player.weapons.last_hit, head, d, int(e.hp)])
		await _frames(2)
		t += 4.0 / 60.0
	release_all()
	if e.is_dead():
		_log("  %s abattu. Munitions : %d | %d  PV : %d" % [e.enemy_id, GameState.weapon_mag(), GameState.count_item("ammo_9mm"), int(GameState.hp)])
		await _secs(0.8)
	return e.is_dead()


func dodge_away_from(e: Enemy) -> void:
	var away := player.global_position - e.global_position
	face(player.global_position + away.normalized() * 3.0 + Vector3.UP * 1.5)
	Input.action_press("move_forward")
	await press("dodge")
	await _secs(0.3)
	Input.action_release("move_forward")


# --- Campagne --------------------------------------------------------------------------

func _run() -> void:
	# Repart d'une ardoise propre : anciens points de passage et sauvegarde auto.
	for f in DirAccess.get_files_at(CHECKPOINT_DIR):
		DirAccess.remove_absolute("%s/%s" % [CHECKPOINT_DIR, f])
	if SaveSystem.has_slot(0):
		DirAccess.remove_absolute(SaveSystem.slot_path(0))
	_step("Menu principal → NEW GAME")
	var ui := get_parent().get("ui") as UIRoot
	for i in 300:
		await _frames(1)
		if ui and ui.top_screen() is MainMenu:
			break
	if ui == null or not (ui.top_screen() is MainMenu):
		await _fail("le menu principal ne s'affiche pas")
		return
	await _secs(2.5)
	await _shot("00_menu")
	var focus := get_viewport().gui_get_focus_owner() as Button
	_log("Menu principal affiché, bouton sélectionné : %s" % (focus.text if focus else "aucun"))
	# Entrée sur le bouton sélectionné (NEW GAME), comme au clavier / à la manette.
	await key(KEY_ENTER)
	for i in 600:
		await _frames(1)
		if GameState.game != null and GameState.player != null:
			break
	await _frames(10)
	game = GameState.game as Game
	player = GameState.player as Player
	if game == null or player == null:
		await _fail("la partie n'a pas démarré")
		return
	game.camera_rig.accept_uncaptured = true
	player.died.connect(func(): _log("!!! Ethan est mort (%s)" % step_name))

	_step("Introduction (appel de Lena)")
	await _shot("00_intro")
	if not await wait_flag("intro_done", 60.0):
		await _fail("l'introduction ne se termine pas")
		return
	await wait_controls()
	await _shot("01_parking")

	_step("Parking → entrée principale")
	if not await open_door("main_entrance"):
		await _fail("porte d'entrée")
		return
	if not await goto(Vector3(0, 0, 9.5)):
		await _fail("vestibule")
		return
	await _shot("02_entree")
	if not await open_door("vestibule_door"):
		await _fail("porte du vestibule")
		return
	if not await goto(Vector3(0, 0, 3.5)):
		await _fail("hall")
		return
	if not await wait_flag("entered_building", 5.0):
		await _fail("entrée dans le bâtiment non détectée")
		return
	await _shot("03_hall")

	_step("Hall : le téléphone sonne")
	await _secs(3.5)
	var phone := node("phone") as Phone
	if phone and phone.ringing:
		if not await interact_with(phone, 0.8):
			await _fail("décrocher le téléphone")
			return
		await wait_controls(20.0)
		_log("Téléphone décroché : %s" % GameState.get_flag("phone_answered"))
	if not await read_doc("doc_incident"):
		await _fail("rapport d'incident")
		return

	_step("Clé de l'administration")
	if not await pick("hall_admin_key"):
		await _fail("clé")
		return
	if not GameState.has_item("admin_key"):
		await _fail("la clé n'est pas dans l'inventaire")
		return
	await pick("hall_spray")

	_step("Sauvegarde au magnétophone (emplacement 1)")
	var sp: SavePoint = null
	for s in get_tree().get_nodes_in_group("save_points"):
		if (s as Node3D).global_position.distance_to(Vector3(2.25, 0.76, -3.0)) < 1.0:
			sp = s
	if sp and await interact_with(sp, 0.8):
		await _frames(20)
		if GameState.ui.top_screen() is SaveScreen:
			await press("ui_accept")
			await _frames(20)
			if GameState.ui.top_screen() is SaveScreen:
				await press("ui_accept")
				await _frames(20)
		await close_modal()
		_log("Sauvegarde emplacement 1 : %s" % SaveSystem.has_slot(1))

	_step("Porte de l'administration (clé)")
	if not await open_door("admin_door"):
		await _fail("porte de l'administration")
		return
	if not GameState.get_flag("admin_unlocked"):
		await _fail("drapeau admin_unlocked absent")
		return
	if not await goto(Vector3(-15.0, 0, -1.0)):
		await _fail("couloir administratif")
		return
	await _shot("04_couloir")

	_step("Bureau de Lena")
	if not await open_door("office_door"):
		await _fail("porte du bureau")
		return
	await goto(Vector3(-20.5, 0, 2.2))
	await _secs(2.5)
	if not await read_doc("doc_journal_lena"):
		await _fail("journal de Lena")
		return
	await interact_with(_examine_near(Vector3(-19.75, 0.9, 4.95)), 0.8)
	await _frames(20)

	_step("Salle d'archives : le noir")
	if not await goto(Vector3(-20.5, 0, -0.5)):
		await _fail("retour au couloir")
		return
	if not await open_door("archives_door"):
		await _fail("porte des archives")
		return
	if not await goto(Vector3(-20.5, 0, -4.4)):
		await _fail("entrée des archives")
		return
	if not await wait_flag("archives_event_done", 15.0):
		await _fail("événement des archives")
		return
	await _shot("05_archives")

	_step("Lampe torche")
	if not await pick("archives_flashlight"):
		await _fail("lampe torche")
		return
	if not GameState.flashlight_on:
		await press("flashlight")
	_log("Lampe allumée : %s" % GameState.flashlight_on)
	for sym in [Vector3(-25.6, 0, -4.2), Vector3(-17.2, 0, -11.55), Vector3(-25.55, 0, -11.2)]:
		var ex := _examine_near(sym + Vector3(0, 1.0, 0))
		if ex:
			await interact_with(ex, 0.9)
			await _frames(30)
	_log("Symboles examinés : lune=%s cœur=%s œil=%s" % [GameState.get_flag("symbol_moon"), GameState.get_flag("symbol_heart"), GameState.get_flag("symbol_eye")])

	_step("Premier ennemi : la créature de la salle de sécurité")
	if not door("archives_door").is_open:
		await open_door("archives_door")
	if not await goto(Vector3(-20.5, 0, -1.0), 0.7, false, 20.0, false):
		await _fail("sortie des archives")
		return
	if not await wait_flag("security_breach", 8.0):
		await _fail("l'événement de la salle de sécurité ne se déclenche pas")
		return
	await _secs(1.5)
	await _shot("06_premier_ennemi")
	# Sans arme : on court vers la salle de sécurité en contournant la créature
	var guard: Enemy = game.enemies.get("h_guard")
	_log("Créature : %s" % (guard.debug_state() if guard else "absente"))
	if not await _reach_security(guard):
		await _fail("atteindre la salle de sécurité")
		return

	_step("Pistolet 9mm")
	if not await pick("security_pistol"):
		await _fail("pistolet")
		return
	if GameState.weapon_mag() != 12:
		await _fail("chargeur du pistolet = %d" % GameState.weapon_mag())
		return
	await pick("security_ammo")
	_log("Munitions : %d | %d (attendu 12 | 12 = 24 au total)" % [GameState.weapon_mag(), GameState.count_item("ammo_9mm")])
	if guard and not guard.is_dead():
		if not await fight(guard):
			await _fail("combat contre la créature de la sécurité")
			return
	await _shot("07_pistolet")
	await read_doc("doc_memo")
	if not await read_doc("doc_archivist"):
		await _fail("aide-mémoire de l'archiviste")
		return
	await pick("security_spray")

	_step("Énigme : coffre des archives (3-1-4)")
	if not await goto(Vector3(-20.5, 0, -1.0)):
		await _fail("retour au couloir")
		return
	if not door("archives_door").is_open:
		await open_door("archives_door")
	var safe := node("safe") as KeypadSafe
	if not await interact_with(safe, 0.8):
		await _fail("clavier du coffre")
		return
	await _frames(20)
	if not (GameState.ui.top_screen() is KeypadScreen):
		await _fail("l'écran du clavier ne s'ouvre pas")
		return
	await key(KEY_1)
	await key(KEY_2)
	await key(KEY_3)
	await key(KEY_ENTER)
	await _frames(30)
	_log("Code erroné 123 → coffre ouvert : %s (attendu : non)" % safe.is_open)
	for k in [KEY_3, KEY_1, KEY_4]:
		await key(k)
	await key(KEY_ENTER)
	await _secs(1.5)
	if not safe.is_open:
		await _fail("le code 314 n'ouvre pas le coffre")
		return
	await close_modal()
	await _secs(2.0)
	await _shot("08_coffre")
	for id in ["safe_fuse", "safe_ammo"]:
		var p := _find_pickup(id)
		if p and await interact_with(p, 0.7):
			await _frames(10)
	var dm := _find_doc("doc_marrow")
	if dm and await interact_with(dm, 0.7):
		await _frames(20)
		await close_modal()
	if not GameState.has_item("fuse"):
		await _fail("fusible non récupéré")
		return
	_log("Coffre vidé : %s" % _inv())

	_step("Infirmerie (piles, rapport médical)")
	if await goto(Vector3(-29.0, 0, -1.0)):
		await pick("infirmary_battery")
		await read_doc("doc_medical")

	_step("Boîtier électrique : confinement")
	if not await goto(Vector3(-11.0, 0, -1.0), 0.8, true):
		await _fail("retour au hall")
		return
	var fuse_box := node("fuse_box")
	if not await interact_with(fuse_box, 0.8):
		await _fail("boîtier électrique")
		return
	if not await wait_flag("fuse_inserted", 3.0):
		await _fail("fusible non inséré")
		return
	await _secs(6.0)
	await _shot("09_confinement")
	var caf: Enemy = game.enemies.get("h_cafeteria")
	if caf and not caf.is_dead():
		await fight(caf)
	if not door("main_entrance").lock == Door.Lock.EVENT:
		await _fail("l'entrée principale n'est pas condamnée")
		return

	_step("Aile des laboratoires")
	if not await open_door("wing_door"):
		await _fail("porte de l'aile des laboratoires")
		return
	if not await goto(Vector3(18.0, 0, -1.0)):
		await _fail("couloir des laboratoires")
		return
	await _secs(2.0)
	var exam: Enemy = game.enemies.get("h_exam")
	if exam and not exam.is_dead():
		if exam.dormant:
			await goto(Vector3(19.5, 0, -0.2), 0.6, false, 10.0, false)
			await _secs(1.0)
		await _secs(2.0)
		if not exam.dormant:
			await fight(exam)
	await goto(Vector3(22.0, 0, -1.0))

	_step("Laboratoire : la lampe s'éteint")
	if not await open_door("lab_main_door"):
		await _fail("porte du laboratoire")
		return
	if not await goto(Vector3(23.0, 0, -4.5), 0.7, false, 20.0, false):
		await _fail("entrée du laboratoire")
		return
	await _secs(5.5)
	await _shot("10_labo")
	var lab_e: Enemy = game.enemies.get("h_lab")
	if lab_e and not lab_e.is_dead():
		await fight(lab_e)
	await pick("lab_ammo")

	_step("Bureau vitré : dernier journal, carte d'accès")
	if not await open_door("lab_office_door"):
		await _fail("porte du bureau vitré")
		return
	if not await read_doc("doc_last_entry"):
		await _fail("dernière entrée du journal")
		return
	if not await pick("lab_keycard"):
		await _fail("carte d'accès")
		return
	await _secs(5.0)

	_step("Sous-sol : lecteur de carte, escalier")
	var reader := _find_mechanism("card")
	if not await interact_with(reader, 0.7):
		await _fail("lecteur de carte")
		return
	if not await wait_flag("basement_unlocked", 3.0):
		await _fail("niveau B non déverrouillé")
		return
	if not await open_door("basement_door"):
		await _fail("porte du niveau B")
		return
	if not await goto(Vector3(27.0, 0, -22.7), 0.4):
		await _fail("palier de l'escalier")
		return
	if not await walk_straight(Vector3(27.0, -4.5, -32.5), 0.6):
		await _fail("descente de l'escalier")
		return
	await _secs(1.0)
	_log("Arrivé au niveau B : y=%.2f zone=%s" % [player.global_position.y, GameState.current_zone])
	if player.global_position.y > -3.5:
		await _fail("le joueur n'est pas descendu")
		return
	await _shot("11_sous_sol")

	_step("Local de maintenance (pied-de-biche)")
	if not await open_door("maintenance_door"):
		await _fail("porte de la maintenance")
		return
	if not await pick("maintenance_crowbar"):
		await _fail("pied-de-biche")
		return
	await read_doc("doc_generator")
	await pick("maintenance_ammo")
	await pick("maintenance_battery")

	_step("Morgue (registre, munitions)")
	if await open_door("morgue_door"):
		await read_doc("doc_morgue")
		await pick("morgue_ammo")
		var mg: Enemy = game.enemies.get("h_morgue")
		if mg and not mg.is_dead() and not mg.dormant:
			await fight(mg)

	_step("Porte du générateur (pied-de-biche)")
	if not await goto(Vector3(1.2, -4.5, -36.5)):
		await _fail("devant la salle du générateur")
		return
	var bm: Enemy = game.enemies.get("h_basement")
	if bm and not bm.is_dead() and bm.global_position.distance_to(player.global_position) < 12.0:
		await fight(bm)
	if not await open_door("generator_door"):
		await _fail("porte du générateur")
		return
	if not GameState.get_flag("generator_door_forced"):
		await _fail("la porte n'a pas été forcée")
		return

	_step("Boss : le Chirurgien")
	if not await goto(Vector3(-1.4, -4.5, -36.5), 0.5, false, 10.0, false):
		await _fail("entrée de la salle du générateur")
		return
	if not await wait_flag("boss_started", 5.0):
		await _fail("le combat ne démarre pas")
		return
	await wait_controls(20.0)
	await _shot("12_boss")
	if not await boss_fight():
		await _fail("combat contre le Chirurgien")
		return
	await _shot("13_boss_vaincu")

	_step("Sortie : tunnel de service")
	await _secs(6.0)
	var tdoor := door("tunnel_door")
	if tdoor.lock != Door.Lock.NONE:
		await _fail("la porte du tunnel est toujours verrouillée")
		return
	if not tdoor.is_open:
		await open_door("tunnel_door")
	if not await goto(Vector3(-8.0, -4.5, -58.0), 0.8, true, 40.0, false):
		await _fail("tunnel")
		return
	if not await walk_straight(Vector3(-8.0, 0.0, -72.8), 0.6):
		await _fail("rampe de sortie")
		return
	await _shot("14_sortie")
	if not await interact_with(node("exit_gate"), 0.8):
		await _fail("portail de sortie")
		return

	_step("Fin")
	_keep_checkpoint()
	if not await wait_flag("game_complete", 5.0):
		await _fail("épilogue non déclenché")
		return
	var t := 0.0
	while t < 80.0 and GameState.ui.top_screen() != GameState.ui.ending_screen:
		await _secs(1.0)
		t += 1.0
		if t == 12.0:
			await _shot("15_epilogue")
	if GameState.ui.top_screen() != GameState.ui.ending_screen:
		await _fail("l'écran de fin ne s'affiche pas")
		return
	await _secs(3.0)
	await _shot("16_fin")
	_log("════ CAMPAGNE TERMINÉE ════")
	_log("Temps de jeu : %s · Documents : %d/%d · Créatures abattues : %d · PV : %d · Morts : %d" % [
		SaveSystem.format_time(GameState.playtime), GameState.documents.size(), DocumentDB.DOCS.size(),
		GameState.dead_enemies.size(), int(GameState.hp), deaths])
	ui = GameState.ui
	focus = get_viewport().gui_get_focus_owner() as Button
	_log("Retour au menu (bouton sélectionné : %s, souris : %s)…" % [focus.text if focus else "aucun",
		"visible" if Input.mouse_mode == Input.MOUSE_MODE_VISIBLE else "capturée"])
	await key(KEY_ENTER)
	await _secs(3.0)
	var back := ui.top_screen() == ui.main_menu
	_log("Menu principal affiché : %s · CONTINUE disponible : %s" % [back, not ui.main_menu.continue_btn.disabled])
	await _shot("17_menu_retour")
	_quit(0 if back else 1)


func _reach_security(guard: Enemy) -> bool:
	# Infiltration : lampe éteinte, on se cache dans le bureau de Lena puis la
	# salle de repos, on laisse la créature passer, et on file dans son dos.
	if GameState.flashlight_on:
		await press("flashlight")
	var hide := [Vector3(-20.5, 0, 2.2), Vector3(-22.6, 0, 4.0), Vector3(-26.2, 0, 4.2)]
	for p in hide:
		if not await goto(p, 0.6, false, 12.0, false):
			break
	var t := 0.0
	while t < 25.0:
		if player.is_dead:
			return false
		if guard == null or guard.is_dead():
			break
		var gp := guard.global_position
		_log("  créature %s à (%.1f, %.1f), %.1f m" % [Enemy.STATE_NAMES[guard.state], gp.x, gp.z, gp.distance_to(player.global_position)])
		if guard.state == Enemy.State.CHASE:
			break
		if gp.x > -24.5 or (guard.state == Enemy.State.SEARCH and gp.x > -26.0):
			break
		await _secs(1.0)
		t += 1.0
	var route := [Vector3(-28.0, 0, 1.6), Vector3(-29.8, 0, -1.0), Vector3(-33.6, 0, -1.0)]
	var run := guard != null and guard.state == Enemy.State.CHASE
	for p in route:
		var tries := 0.0
		while tries < 20.0:
			if player.is_dead:
				return false
			if guard and not guard.is_dead() and guard.state == Enemy.State.CHASE:
				run = true
				var d := guard.global_position.distance_to(player.global_position)
				if d < 1.8 and guard.state == Enemy.State.ATTACK:
					await dodge_away_from(guard)
			if await goto(p, 0.7, run, 0.5, false):
				break
			tries += 0.5
			if guard and fmod(tries, 2.0) < 0.01:
				_log("  → %s : joueur %s PV %d, créature %s à %.1f m" % [p, player.global_position, int(GameState.hp), Enemy.STATE_NAMES[guard.state], guard.global_position.distance_to(player.global_position)])
	await goto(Vector3(-35.0, 0, -2.5), 0.8, run, 6.0, false)
	return Facility.zone_at(player.global_position) == "security"


func boss_fight() -> bool:
	var boss := game.enemies.get("surgeon") as Surgeon
	var breakers: Array = game.facility.nodes["breakers"]
	var rect: Rect2 = game.facility.anchors["trap_rect"]
	var spots := [Vector3(-15.0, -4.5, -38.0), Vector3(-1.0, -4.5, -42.0)]
	var cur := 0
	var t := 0.0
	var electro := 0
	await goto(spots[cur], 0.6, true, 15.0, false)
	while t < 240.0 and not boss.is_dead():
		if player.is_dead:
			_log("Ethan est mort pendant le combat")
			return false
		var bp := boss.global_position
		var in_water := rect.has_point(Vector2(bp.x, bp.z))
		var panel: BreakerPanel = breakers[cur]
		var d := bp.distance_to(player.global_position)
		if GameState.hp < 50.0 and GameState.has_item("spray"):
			await press("quick_heal")
		if in_water and panel.is_ready() and player.focused == panel:
			release_all()
			await press("interact")
			electro += 1
			_log("  Disjoncteur actionné (Chirurgien dans l'eau) — PV boss : %d" % int(boss.hp))
			await _secs(0.5)
		elif d < 3.2:
			# Trop près : on change de disjoncteur en contournant la machine
			release_all()
			cur = 1 - cur
			await dodge_away_from(boss)
			await goto(spots[cur], 0.6, true, 8.0, false)
		else:
			# Face au panneau quand il est prêt et que le boss approche, sinon on tire
			if panel.is_ready() and d < 9.0:
				face(panel.focus_position())
				release_all()
			else:
				var head := boss.rig.joint("head").global_position
				Input.action_press("aim")
				face(head, true)
				if player.aim_blend > 0.85 and player.weapons.can_fire() and GameState.weapon_mag() > 0:
					Input.action_press("fire")
					await _frames(2)
					Input.action_release("fire")
				elif GameState.weapon_mag() == 0 and GameState.count_item("ammo_9mm") > 0:
					Input.action_release("aim")
					await press("reload")
		await _frames(3)
		t += 0.05
	release_all()
	_log("Chirurgien vaincu : %s (décharges : %d, munitions restantes : %d | %d)" % [boss.is_dead(), electro, GameState.weapon_mag(), GameState.count_item("ammo_9mm")])
	return boss.is_dead()


func _examine_near(p: Vector3) -> ExaminePoint:
	var best: ExaminePoint = null
	var bd := 1.5
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is ExaminePoint:
			var d := (n as Node3D).global_position.distance_to(p)
			if d < bd:
				bd = d
				best = n
	return best


func _find_pickup(id: String) -> Pickup:
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is Pickup and (n as Pickup).pickup_id == id:
			return n
	return null


func _find_doc(id: String) -> DocumentPickup:
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is DocumentPickup and (n as DocumentPickup).doc_id == id:
			return n
	return null


func _find_mechanism(kind: String) -> Mechanism:
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is Mechanism and (n as Mechanism).kind == kind:
			return n
	return null


func _quit(code: int) -> void:
	var main := get_parent()
	if main and main.has_method("quit_game"):
		main.quit_game(code)
	else:
		get_tree().quit(code)

extends Node
## Test de bout en bout de BLACKWOOD HOSPITAL : joue le chapitre 1 complet avec
## de vraies entrées (actions clavier, rotation de caméra, touche E, tir,
## claviers à code, ascenseurs, menus), de la voiture de Thomas jusqu'à l'écran
## de fin, puis retourne au menu. Rapport étape par étape ; code de sortie 0 si
## la campagne est terminée.
##
## Lancement : godot --headless --fixed-fps 60 --path . -- --autoplay
## Options :
##   --shots=DOSSIER    captures d'écran (en mode rendu)
##   --from=CHAPITRE    reprend au point de passage du robot enregistré à la fin
##                      du chapitre précédent (user://bot_checkpoints/)

const CHAPTERS := ["exterieur", "urgences", "rdc", "premier", "sous_sol", "neurologie", "chirurgien",
	"escalier_b", "sixieme", "monte_charge", "huitieme", "onzieme", "douzieme", "evasion", "fin"]
const BOT_CK_DIR := "user://bot_checkpoints"
const CHECKPOINT_DIR := "user://test_checkpoints"
## Cages d'escalier : x ouest / est. Palier d'étage z ∈ [-17.6, -16], palier
## intermédiaire z < -22.6 (voir HKit.stairwell).
const STAIRS := {"a": Vector2(-12.0, -6.0), "b": Vector2(24.0, 32.0), "c": Vector2(-32.0, -24.0)}
const Z_LANDING := -17.2
const Z_TURN := -23.5

var game: Game
var player: Player
var log_lines: Array[String] = []
var shots_dir := ""
var from_chapter := ""
var step_name := ""
var t0 := 0
var deaths := 0
var kills_at_start := 0
var _last_checkpoint := -1.0
var _checkpoint_count := 0
var _min_fps := 999.0
var _fps_samples := 0
var _fps_sum := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			shots_dir = a.substr(8)
		elif a.begins_with("--from="):
			from_chapter = a.substr(7)
	t0 = Time.get_ticks_msec()
	_run()


func _process(_delta: float) -> void:
	if player and is_instance_valid(player) and DisplayServer.get_name() != "headless":
		var fps := Engine.get_frames_per_second()
		if fps > 0.0 and Time.get_ticks_msec() - t0 > 20000:
			_min_fps = minf(_min_fps, fps)
			_fps_sum += fps
			_fps_samples += 1


func _log(msg: String) -> void:
	var line := "[%6.1fs | jeu %6.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, GameState.playtime, msg]
	print(line)
	log_lines.append(line)


func _fail(msg: String) -> void:
	_log("ÉCHEC à l'étape « %s » : %s" % [step_name, msg])
	if player and is_instance_valid(player):
		_log("Position joueur : %s  PV : %d  zone : %s  étage : %d" % [player.global_position, int(GameState.hp), GameState.current_zone,
			Facility.floor_at(player.global_position.y)])
	_log("Inventaire : %s | porte-clés : %s | armes : %s" % [_inv(), str(GameState.key_items), str(GameState.weapons.keys())])
	_log("Drapeaux : %s" % str(GameState.flags.keys()))
	await _shot("echec")
	_quit(1)


func _step(n: String) -> void:
	_keep_checkpoint()
	step_name = n
	_log("── ÉTAPE : " + n)


## Copie chaque nouvelle sauvegarde automatique dans user://test_checkpoints/
## (rechargées ensuite par tests/checkpoints.gd).
func _keep_checkpoint() -> void:
	if from_chapter != "":
		return  # seule une campagne complète alimente tests/checkpoints.gd
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


## Point de passage du robot : l'état complet au début du chapitre « name ».
func _save_bot_checkpoint(chapter: String) -> void:
	DirAccess.make_dir_recursive_absolute(BOT_CK_DIR)
	var d := game.build_save_data()
	d["bot_chapter"] = chapter
	var f := FileAccess.open("%s/%s.json" % [BOT_CK_DIR, chapter], FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(d))


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
		# Visée : le rayon part de la caméra (au-dessus de l'épaule) — on corrige
		# l'écart entre l'orientation voulue et l'orientation réelle.
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

func _level() -> int:
	return Facility.floor_at(player.global_position.y + 0.2)


## Se rend à « target » en suivant la grille de navigation de l'étage courant
## (en ligne droite dehors). Retourne true si atteint.
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
		if not player.controls_enabled or get_tree().paused or game.traveling:
			release_all()
			await _frames(1)
			elapsed += 1.0 / 60.0
			continue
		if GameState.ui.top_screen() is DocumentViewer:
			await press("interact")
			continue
		var pos := player.global_position
		var flat := Vector2(target.x - pos.x, target.z - pos.z)
		if flat.length() < tol:
			release_all()
			return true
		repath -= 1.0 / 60.0
		if path.is_empty() or repath <= 0.0:
			var grid := game.facility.nav_grid_at(pos)
			path = grid.find_path(pos, target) if grid and GameState.current_zone != "exterior" else PackedVector3Array()
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
		if stuck_t > 1.0:
			if player.global_position.distance_to(last) < 0.3:
				Input.action_release("move_forward")
				# Une porte fermée devant ? On l'ouvre, comme un joueur.
				var dr := _closed_door_near(1.8)
				if dr:
					face(dr.focus_position())
					await _frames(8)
					if player.focused == dr:
						await press("interact")
						await _secs(0.8)
				else:
					# Coincé : petit pas de côté et nouveau chemin
					Input.action_press("move_left" if randf() < 0.5 else "move_right")
					await _secs(0.4)
					Input.action_release("move_left")
					Input.action_release("move_right")
				path = PackedVector3Array()
			last = player.global_position
			stuck_t = 0.0
	release_all()
	return false


## Porte fermée (et non verrouillée) la plus proche.
func _closed_door_near(radius: float) -> Door:
	var best: Door = null
	var bd := radius
	for n in get_tree().get_nodes_in_group("doors"):
		var d := n as Door
		if d == null or d.is_open or d.lock != Door.Lock.NONE:
			continue
		var dist := d.global_position.distance_to(player.global_position)
		if dist < bd and absf(d.global_position.y - player.global_position.y) < 1.5:
			bd = dist
			best = d
	return best


## Se soigne (spray) jusqu'à « threshold » PV si possible.
func heal_up(threshold: float = 60.0) -> void:
	var guard := 0
	while GameState.hp < threshold and GameState.has_item("spray") and guard < 4:
		guard += 1
		await press("quick_heal")
		await _secs(1.2)
	if guard > 0:
		_log("Soins : %d PV (sprays restants : %d)" % [int(GameState.hp), GameState.count_item("spray")])


## Enchaîne des points de passage.
func route(points: Array, run: bool = false, fight: bool = true) -> bool:
	for p in points:
		if not await goto(p, 0.7, run, 60.0, fight):
			_log("Point de passage %s non atteint" % [p])
			return false
	return true


## Marche en ligne droite (escaliers, rampes, extérieur).
func walk_straight(target: Vector3, tol: float = 0.5, timeout: float = 20.0, run: bool = false) -> bool:
	var elapsed := 0.0
	while elapsed < timeout:
		if player.is_dead:
			return false
		if not player.controls_enabled or get_tree().paused:
			release_all()
			await _frames(1)
			elapsed += 1.0 / 60.0
			continue
		var pos := player.global_position
		if Vector2(target.x - pos.x, target.z - pos.z).length() < tol:
			release_all()
			return true
		face(Vector3(target.x, pos.y + 1.5, target.z))
		Input.action_press("move_forward")
		if run:
			Input.action_press("run")
		await _frames(1)
		elapsed += 1.0 / 60.0
	release_all()
	_log("walk_straight vers %s interrompu à %s" % [target, player.global_position])
	return false


## Monte ou descend une cage d'escalier, du palier de « from_lv » à celui de
## « to_lv ». Le joueur doit être sur le palier (côté cage, porte franchie).
func climb(stair: String, from_lv: int, to_lv: int, run: bool = false) -> bool:
	var sx: Vector2 = STAIRS[stair]
	var xm := (sx.x + sx.y) * 0.5
	var west := (sx.x + xm) * 0.5
	var east := (xm + sx.y) * 0.5
	var lv := from_lv
	while lv != to_lv:
		var up := to_lv > lv
		var y0 := HKit.floor_y(lv)
		var y1 := HKit.floor_y(lv + (1 if up else -1))
		var pts: Array
		if up:
			pts = [Vector3(west, y0, Z_LANDING), Vector3(west, y0, Z_TURN), Vector3(east, y0, Z_TURN), Vector3(east, y1, Z_LANDING)]
		else:
			pts = [Vector3(east, y0, Z_LANDING), Vector3(east, y0, Z_TURN), Vector3(west, y0, Z_TURN), Vector3(west, y1, Z_LANDING)]
		for p in pts:
			if not await walk_straight(p, 0.45, 12.0, run):
				await _fail("escalier %s : bloqué entre %d et %d" % [stair.to_upper(), lv, to_lv])
				return false
		lv += 1 if up else -1
		if absf(player.global_position.y - y1) > 0.6:
			await _fail("escalier %s : hauteur inattendue %.2f (attendu %.2f)" % [stair.to_upper(), player.global_position.y, y1])
			return false
	await walk_straight(Vector3(xm, 0, Z_LANDING), 0.4, 4.0)
	return true


## Du couloir vers le palier de la cage (porte comprise).
func enter_stair(stair: String, door_id: String) -> bool:
	var sx: Vector2 = STAIRS[stair]
	var xm := (sx.x + sx.y) * 0.5
	var y := player.global_position.y
	if not await goto(Vector3(xm, y, -14.2), 0.5):
		await _fail("devant l'escalier %s" % stair.to_upper())
		return false
	if not await open_door(door_id):
		await _fail("porte %s" % door_id)
		return false
	return await walk_straight(Vector3(xm, y, Z_LANDING), 0.4, 6.0)


## Du palier vers le couloir de l'étage (porte comprise).
func leave_stair(stair: String, door_id: String) -> bool:
	var sx: Vector2 = STAIRS[stair]
	var xm := (sx.x + sx.y) * 0.5
	var y := player.global_position.y
	if not await open_door(door_id):
		return false
	return await walk_straight(Vector3(xm, y, -14.0), 0.5, 6.0)


func interact_with(n: Node3D, approach: float = 0.9) -> bool:
	if n == null or not is_instance_valid(n):
		_log("objet d'interaction introuvable")
		return false
	var it := n as Interactable
	var fp := it.focus_position()
	var stand := Vector3(fp.x, player.global_position.y, fp.z)
	await goto(stand, approach + 0.2, false, 40.0)
	for attempt in 4:
		face(fp)
		await _frames(12)
		if player.focused == it:
			await press("interact")
			await _frames(6)
			return true
		await goto(stand, 0.45, false, 6.0)
	face(fp)
	await _frames(12)
	if player.focused == it:
		await press("interact")
		await _frames(6)
		return true
	_log("Impossible de cibler %s (ciblé : %s, distance %.2f)" % [n.name, player.focused.name if player.focused else "rien", player.global_position.distance_to(fp)])
	return false


func node(n: String) -> Node3D:
	var v: Variant = game.facility.nodes.get(n)
	return v as Node3D if v is Node3D else null


func door(id: String) -> Door:
	return game.facility.doors.get(id)


func open_door(id: String) -> bool:
	var d := door(id)
	if d == null:
		_log("porte %s introuvable" % id)
		return false
	if d.is_open:
		return true
	if not await interact_with(d, 1.0):
		return false
	for i in 90:
		if d.is_open:
			await _frames(20)
			return true
		await _frames(1)
	_log("La porte %s ne s'est pas ouverte (verrou %d) : %s" % [id, d.lock, d.locked_msg])
	return false


func close_modal() -> void:
	for i in 30:
		if GameState.ui.top_screen() == null:
			return
		var top: UIScreen = GameState.ui.top_screen()
		if top is DocumentViewer:
			await press("interact")
		elif top is SaveScreen or top is InventoryScreen or top is PauseMenu or top is KeypadScreen or top is ElevatorScreen:
			await press("pause")
		else:
			await _frames(5)
		await _frames(6)


func read_doc(doc_id: String) -> bool:
	var d: Node3D = _find_doc(doc_id)
	if d == null:
		d = node(doc_id)
	if d == null or not is_instance_valid(d):
		if GameState.has_document(doc_id):
			return true
		_log("document %s introuvable" % doc_id)
		return false
	if not await interact_with(d, 0.9):
		return false
	await _frames(20)
	if not GameState.has_document(doc_id):
		_log("Document %s non collecté" % doc_id)
		return false
	if GameState.ui.top_screen() is DocumentViewer:
		await _secs(0.6)
		await press("interact")
		await _frames(10)
	_log("Document lu : %s" % DocumentDB.get_doc(doc_id).title)
	return true


func pick(id: String) -> bool:
	if GameState.taken_pickups.has(id):
		return true
	var p: Node3D = _find_pickup(id)
	if p == null:
		p = node(id)
	if p == null or not is_instance_valid(p):
		_log("objet %s introuvable" % id)
		return false
	if not await interact_with(p, 0.8):
		return false
	await _frames(10)
	if not GameState.taken_pickups.has(id):
		_log("Objet %s non ramassé (%s)" % [id, GameState.ui.message_label.text])
		return false
	_log("Ramassé : %s  — inventaire %s" % [id, _inv()])
	return true


func examine(p: Vector3) -> bool:
	var ex := _examine_near(p)
	if ex == null:
		return false
	if not await interact_with(ex, 0.9):
		return false
	await _frames(30)
	return true


func _inv() -> String:
	var parts := []
	for s in GameState.inventory:
		if s.id != "":
			parts.append("%s x%d" % [s.id, s.count])
	return ", ".join(parts)


func wait_controls(timeout: float = 30.0) -> void:
	var t := 0.0
	while t < timeout and (not player.controls_enabled or get_tree().paused or game.traveling):
		if GameState.ui.top_screen() is DocumentViewer:
			await press("interact")
		await _frames(6)
		t += 0.1


## Attend en restant sur ses gardes (combat les créatures qui approchent).
func idle(secs: float) -> void:
	var t := 0.0
	while t < secs:
		if player.is_dead:
			return
		if await _handle_threats():
			continue
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


## Saisit un code sur l'écran de clavier ouvert.
func type_code(code: String) -> void:
	for c in code:
		await key(KEY_0 + int(c))
	await key(KEY_ENTER)
	await _frames(30)


## Appelle l'ascenseur et choisit l'étage dans la liste, au clavier.
func ride(elevator_id: String, to_lv: int) -> bool:
	var from_lv := _level()
	var panel := node("elev_panel_%s_%d" % [elevator_id, from_lv])
	if panel == null:
		await _fail("panneau d'ascenseur %s au niveau %d introuvable" % [elevator_id, from_lv])
		return false
	if not await interact_with(panel, 0.9):
		await _fail("panneau d'ascenseur %s" % elevator_id)
		return false
	await _frames(15)
	var scr := GameState.ui.top_screen() as ElevatorScreen
	if scr == null:
		await _fail("l'écran de l'ascenseur ne s'ouvre pas (%s)" % GameState.ui.message_label.text)
		return false
	var want := HospitalLevel.floor_label(to_lv).rpad(8)
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
	if not found:
		await _fail("étage %d introuvable dans la liste de l'ascenseur" % to_lv)
		return false
	await key(KEY_ENTER)
	await _frames(10)
	if GameState.ui.top_screen() is ElevatorScreen:
		await _fail("l'ascenseur refuse l'étage %d : %s" % [to_lv, scr.status.text])
		return false
	var t := 0.0
	while t < 15.0 and (game.traveling or _level() != to_lv):
		await _frames(6)
		t += 0.1
	await wait_controls(5.0)
	if _level() != to_lv:
		await _fail("l'ascenseur n'est pas arrivé au niveau %d (niveau %d)" % [to_lv, _level()])
		return false
	_log("Ascenseur %s : niveau %d → %d" % [elevator_id, from_lv, to_lv])
	return true


# --- Combat -----------------------------------------------------------------------------

func _is_threat(en: Enemy) -> bool:
	if en == null or not is_instance_valid(en) or en.is_dead() or en.dormant or en.passive:
		return false
	if en.get("active") == false:
		return false
	if en is PatientZero and (en as PatientZero).in_cell:
		return false
	return true


func _visible_threat(max_dist: float = 11.0) -> Enemy:
	var best: Enemy = null
	var best_d := max_dist
	for e in get_tree().get_nodes_in_group("enemies"):
		var en := e as Enemy
		if not _is_threat(en) or en is Colossus:
			continue
		if absf(en.global_position.y - player.global_position.y) > 2.0:
			continue
		var d := en.global_position.distance_to(player.global_position)
		if d < best_d and en.state in [Enemy.State.CHASE, Enemy.State.ATTACK, Enemy.State.INVESTIGATE]:
			if _clear_line(en.global_position + Vector3.UP * 1.4):
				best = en
				best_d = d
	return best


## Ligne de vue dégagée (décor et portes).
func _clear_line(to: Vector3) -> bool:
	var q := PhysicsRayQueryParameters3D.create(player.global_position + Vector3.UP * 1.5, to, 1 | 16)
	q.exclude = [player.get_rid()]
	return player.get_world_3d().direct_space_state.intersect_ray(q).is_empty()


## Si une créature menace : on la combat. Retourne true si un combat a eu lieu.
func _handle_threats() -> bool:
	if not player.controls_enabled or GameState.weapons.is_empty():
		return false
	var e := _visible_threat()
	if e == null:
		return false
	await fight(e)
	return true


func _ammo_total(w: String) -> int:
	return GameState.weapon_mag(w) + GameState.weapon_reserve(w)


## Meilleure arme disponible contre « e » à la distance « d ».
func _choose_weapon(e: Enemy, d: float) -> String:
	var big := e is Surgeon or e is BossHumanoid or e is Colossus
	var order: Array
	if big:
		order = ["magnum", "shotgun", "smg", "pistol"] if d < 5.5 else ["magnum", "pistol", "smg"]
	elif e is Neonatal:
		order = ["shotgun", "smg", "pistol"]
	else:
		order = ["shotgun", "pistol", "smg"] if d < 3.5 else ["pistol", "smg", "shotgun"]
	for w in order:
		if GameState.has_weapon(w) and _ammo_total(w) > 0:
			return w
	return "baton" if GameState.has_weapon("baton") else ""


func _equip(w: String) -> void:
	if w == "" or GameState.equipped == w:
		return
	var i := WeaponDB.ORDER.find(w)
	if i < 0:
		return
	release_all()
	await key(KEY_1 + i)
	await _secs(0.45)


func _aim_point(e: Enemy, w: String) -> Vector3:
	var head := e.rig.joint("head").global_position + Vector3.UP * 0.08
	if w in ["shotgun", "smg"] or e is Colossus or e is Neonatal:
		return e.rig.joint("chest").global_position if e.rig.joints.has("chest") else head - Vector3.UP * 0.4
	return head


func fight(e: Enemy, timeout: float = 60.0) -> bool:
	_log("Combat : %s (%s, %d PV)" % [e.enemy_id, Enemy.STATE_NAMES[e.state], int(e.hp)])
	var t := 0.0
	var no_los := 0.0
	var misses := 0
	release_all()
	while t < timeout and is_instance_valid(e) and not e.is_dead() and not player.is_dead:
		if not player.controls_enabled or get_tree().paused:
			release_all()
			await _frames(3)
			t += 0.05
			continue
		if not _is_threat(e):
			break
		# Une autre créature au contact passe en priorité
		var close := _visible_threat(2.6)
		if close and close != e:
			_log("  cible changée : %s au contact" % close.enemy_id)
			e = close
		if not _clear_line(e.global_position + Vector3.UP * 1.3):
			no_los += 4.0 / 60.0
			if no_los > 1.5:
				_log("  %s hors de vue : on arrête" % e.enemy_id)
				break
		else:
			no_los = 0.0
		if GameState.hp < 45.0 and GameState.has_item("spray"):
			await press("quick_heal")
		var d := e.global_position.distance_to(player.global_position)
		var w := _choose_weapon(e, d)
		if w == "":
			_log("Aucune arme : on fuit")
			return false
		await _equip(w)
		if w == "baton":
			await _melee_step(e)
			t += 0.1
			continue
		if GameState.weapon_mag() == 0:
			Input.action_release("fire")
			Input.action_release("aim")
			if not player.weapons.reloading:
				if d < 3.0:
					await dodge_away_from(e)
				await press("reload")
			face(e.global_position + Vector3.UP * 1.5)
			Input.action_press("move_back")
			await _frames(4)
			Input.action_release("move_back")
			t += 0.1
			continue
		var target := _aim_point(e, w)
		Input.action_press("aim")
		face(target, true)
		if d < 2.2:
			Input.action_press("move_back")
		else:
			Input.action_release("move_back")
		if player.aim_blend > 0.85 and player.weapons.can_fire() and aimed_at(target, 0.13 if w != "shotgun" else 0.3):
			var mag := GameState.weapon_mag()
			var hp0 := e.hp
			Input.action_press("fire")
			await _frames(2 if w != "smg" else 8)
			Input.action_release("fire")
			if GameState.weapon_mag() < mag:
				_log("  tir %s → %s (d=%.1f, PV %d)" % [w, player.weapons.last_hit, d, int(e.hp)])
				await _frames(2)
				misses = misses + 1 if e.hp >= hp0 else 0
				if misses >= 3:
					# Quelque chose gêne le tir : pas de côté
					misses = 0
					release_all()
					Input.action_press("move_left" if randf() < 0.5 else "move_right")
					await _secs(0.5)
					release_all()
		await _frames(2)
		t += 4.0 / 60.0
	release_all()
	if is_instance_valid(e) and e.is_dead():
		_log("  %s abattu. Arme %s %d | %d  PV : %d" % [e.enemy_id, GameState.equipped, GameState.weapon_mag(), GameState.weapon_reserve(), int(GameState.hp)])
		await _secs(0.8)
		return true
	return false


## Matraque : on s'approche, on frappe, on recule d'un pas.
func _melee_step(e: Enemy) -> void:
	var d := e.global_position.distance_to(player.global_position)
	var chest := e.global_position + Vector3.UP * 1.2
	face(chest)
	if d > 1.45:
		Input.action_press("move_forward")
		await _frames(4)
		Input.action_release("move_forward")
		return
	Input.action_press("fire")
	await _frames(3)
	Input.action_release("fire")
	await _secs(0.35)
	if e.state == Enemy.State.ATTACK:
		Input.action_press("move_back")
		await _secs(0.3)
		Input.action_release("move_back")


func dodge_away_from(e: Node3D) -> void:
	var away := player.global_position - e.global_position
	away.y = 0.0
	face(player.global_position + away.normalized() * 3.0 + Vector3.UP * 1.5)
	Input.action_press("move_forward")
	await press("dodge")
	await _secs(0.3)
	Input.action_release("move_forward")


## Tue toutes les créatures actives de l'étage à portée (nettoyage).
func clear_area(radius: float = 12.0) -> void:
	for i in 6:
		var e := _visible_threat(radius)
		if e == null:
			return
		await fight(e)


# --- Campagne --------------------------------------------------------------------------

func _run() -> void:
	var start := 0
	if from_chapter != "":
		start = CHAPTERS.find(from_chapter)
		if start < 0:
			_log("Chapitre inconnu : %s (disponibles : %s)" % [from_chapter, ", ".join(CHAPTERS)])
			_quit(2)
			return
	if start == 0:
		for f in DirAccess.get_files_at(CHECKPOINT_DIR):
			DirAccess.remove_absolute("%s/%s" % [CHECKPOINT_DIR, f])
		if SaveSystem.has_slot(0):
			DirAccess.remove_absolute(SaveSystem.slot_path(0))
		if not await _start_from_menu():
			return
	else:
		if not await _start_from_checkpoint(from_chapter):
			return
	for i in range(start, CHAPTERS.size()):
		var ch: String = CHAPTERS[i]
		if i > start:
			_save_bot_checkpoint(ch)
		var ok: bool = await call("_ch_" + ch)
		if not ok:
			if step_name != "":
				_log("Chapitre « %s » interrompu." % ch)
			return
	_log("════ CAMPAGNE TERMINÉE ════")


func _start_from_menu() -> bool:
	_step("Menu principal → NEW GAME")
	var ui := get_parent().get("ui") as UIRoot
	for i in 300:
		await _frames(1)
		if ui and ui.top_screen() is MainMenu:
			break
	if ui == null or not (ui.top_screen() is MainMenu):
		await _fail("le menu principal ne s'affiche pas")
		return false
	await _secs(2.5)
	await _shot("00_menu")
	var focus := get_viewport().gui_get_focus_owner() as Button
	_log("Menu principal affiché, bouton sélectionné : %s" % (focus.text if focus else "aucun"))
	await key(KEY_ENTER)
	return await _attach_game()


func _start_from_checkpoint(chapter: String) -> bool:
	_step("Reprise au chapitre « %s »" % chapter)
	var f := FileAccess.open("%s/%s.json" % [BOT_CK_DIR, chapter], FileAccess.READ)
	if f == null:
		_log("Point de passage %s absent : lancer d'abord la campagne complète." % chapter)
		_quit(2)
		return false
	var data: Variant = JSON.parse_string(f.get_as_text())
	if not (data is Dictionary):
		_quit(2)
		return false
	for i in 300:
		await _frames(1)
		if get_parent().get("ui") and (get_parent().get("ui") as UIRoot).top_screen() is MainMenu:
			break
	get_parent().call("load_data", data)
	return await _attach_game()


func _attach_game() -> bool:
	for i in 900:
		await _frames(1)
		if GameState.game != null and GameState.player != null:
			break
	await _frames(10)
	game = GameState.game as Game
	player = GameState.player as Player
	if game == null or player == null:
		await _fail("la partie n'a pas démarré")
		return false
	game.camera_rig.accept_uncaptured = true
	player.died.connect(func() -> void:
		deaths += 1
		_log("!!! Thomas est mort (%s)" % step_name))
	return true


# --- Chapitre 1 : l'arrivée ---------------------------------------------------------------

func _ch_exterieur() -> bool:
	_step("Introduction : le message de Sarah")
	await _shot("01_intro")
	if not await wait_flag("intro_done", 60.0):
		await _fail("l'introduction ne se termine pas")
		return false
	await wait_controls()
	_log("Objectif : %s" % Objectives.current(GameState))
	await _shot("02_voiture")

	_step("Parvis : l'entrée principale est enchaînée")
	for p in [Vector3(-2.0, 0, 16.0), Vector3(0.0, 0, 3.2)]:
		if not await walk_straight(p, 0.6, 20.0):
			await _fail("parvis")
			return false
	if not await examine(Vector3(0, 1.1, 0.7)):
		await _fail("examiner la porte principale")
		return false
	await close_modal()
	if not GameState.get_flag("main_door_seen"):
		await _fail("la porte principale n'a pas été examinée")
		return false
	var main_door := door("main_entrance")
	await interact_with(main_door, 1.0)
	await _frames(20)
	_log("Porte principale : verrou %d — « %s »" % [main_door.lock, GameState.ui.message_label.text])
	await _shot("03_entree")

	_step("Rampe des ambulances")
	for p in [Vector3(4.0, 0, 9.0), Vector3(20.0, 0, 17.0), Vector3(30.0, 0, 22.5), Vector3(38.0, 0, 23.5), Vector3(38.0, 0, 0.5), Vector3(38.5, 0, -4.0)]:
		if not await walk_straight(p, 0.6, 25.0):
			await _fail("rampe")
			return false
	if player.global_position.y > -3.5:
		await _fail("le joueur n'est pas descendu au quai (y=%.2f)" % player.global_position.y)
		return false
	await _shot("04_quai")
	return true


func _ch_urgences() -> bool:
	_step("Quai : la lampe torche de l'ambulance")
	if not await pick("b1_flashlight"):
		await _fail("lampe torche")
		return false
	if not GameState.flashlight_on:
		await press("flashlight")
	_log("Lampe allumée : %s — pile %d %%" % [GameState.flashlight_on, int(GameState.flashlight_battery)])

	_step("Urgences : portes automatiques, accueil")
	if not await goto(Vector3(28.5, -4, -8.0), 0.7):
		await _fail("accueil des urgences")
		return false
	if not await wait_flag("entered_hospital", 5.0):
		await _fail("entrée dans l'hôpital non détectée")
		return false
	await _shot("05_accueil")
	await _secs(3.0)
	var phone := node("triage_phone") as Phone
	if phone and phone.ringing:
		if not await interact_with(phone, 0.8):
			await _fail("décrocher le téléphone")
			return false
		await _secs(1.0)
		await wait_controls(30.0)
		_log("Téléphone décroché : %s" % GameState.get_flag("phone_answered"))
	if not await read_doc("doc_triage"):
		await _fail("rapport de tri")
		return false
	if not await pick("b1_key_boxes"):
		await _fail("clé des box")
		return false

	_step("Box de soins")
	if not await open_door("b1_triage_boxes"):
		await _fail("porte des box")
		return false
	await pick("b1_spray")
	if not await open_door("b1_boxes_exit"):
		await _fail("sortie des box")
		return false

	_step("Couloir : l'infirmière")
	if not await goto(Vector3(6.0, -4, -13.6), 0.5, false, 15.0, false):
		await _fail("couloir des urgences")
		return false
	if not await wait_flag("nurse_seen", 5.0):
		await _fail("la rencontre avec l'infirmière ne se déclenche pas")
		return false
	await _shot("06_infirmiere")
	await wait_controls(10.0)
	_log("Infirmière : %s" % game.enemies["b1_nurse"].debug_state())

	_step("Fuite vers l'escalier A")
	if not await goto(Vector3(-9.0, -4, -14.3), 0.6, true, 20.0, false):
		await _fail("fuite dans le couloir")
		return false
	if not await walk_straight(Vector3(-9.0, -4, Z_LANDING), 0.4, 5.0, true):
		await _fail("entrée dans la cage A")
		return false
	if not await wait_flag("nurse_escaped", 5.0):
		await _fail("la porte de l'escalier ne se referme pas")
		return false
	await _secs(3.0)
	var sd := door("stair_a_b1")
	_log("Porte de l'escalier A (-1) : verrou %d, ouverte %s" % [sd.lock, sd.is_open])
	if sd.lock == Door.Lock.NONE:
		await _fail("la porte de l'escalier A n'est pas condamnée")
		return false
	await _shot("07_escalier_a")
	return true


func _ch_rdc() -> bool:
	_step("Escalier A : montée au rez-de-chaussée")
	if not await climb("a", -1, 0):
		return false
	if not await leave_stair("a", "stair_a_0"):
		await _fail("sortie de l'escalier au RDC")
		return false
	if not await wait_flag("reached_ground", 5.0):
		await _fail("arrivée au RDC non détectée")
		return false

	_step("Hall d'accueil")
	if not await goto(Vector3(0.0, 0, -6.0), 0.8):
		await _fail("hall")
		return false
	await _shot("08_hall")
	await _secs(2.0)

	_step("Poste de sécurité : la matraque")
	if not await open_door("f0_security_door"):
		await _fail("porte de la sécurité")
		return false
	await read_doc("doc_security_log")
	if not await pick("f0_baton"):
		await _fail("matraque")
		return false
	await _equip("baton")
	await _secs(1.8)
	var guard: Enemy = game.enemies.get("f0_guard")
	if guard and not guard.is_dead():
		_log("Agent : %s" % guard.debug_state())
		if not await fight(guard, 40.0):
			await _fail("combat contre l'agent (matraque)")
			return false
	await pick("f0_sec_battery")
	await pick("f0_sec_ammo")
	await _shot("09_securite")
	await pick("f0_kiosk_ammo")

	_step("Retour à l'escalier A")
	if not await enter_stair("a", "stair_a_0"):
		return false
	return true


func _ch_premier() -> bool:
	_step("Escalier A : 1er étage")
	if not await climb("a", 0, 1):
		return false
	if not await leave_stair("a", "stair_a_1"):
		await _fail("sortie de l'escalier au 1er")
		return false

	_step("Radiologie")
	if not await open_door("f1_radiology_door"):
		await _fail("porte de la radiologie")
		return false
	var rad: Enemy = game.enemies.get("f1_radiologist")
	if rad and not rad.is_dead():
		await goto(Vector3(16.0, 4, -9.5), 0.8)
		if not rad.is_dead() and rad.global_position.distance_to(player.global_position) < 10.0:
			await fight(rad, 40.0)

	_step("Salle de radiographie : le pistolet de Diaz")
	if not await open_door("f1_xray_door"):
		await _fail("porte de la radiographie")
		return false
	if not await pick("f1_pistol"):
		await _fail("pistolet")
		return false
	if GameState.weapon_mag("pistol") != 12:
		await _fail("chargeur du pistolet = %d" % GameState.weapon_mag("pistol"))
		return false
	await _equip("pistol")
	if not await pick("f1_tech_key"):
		await _fail("clé du local technique")
		return false
	var neuro: Enemy = game.enemies.get("f1_xray_neuro")
	if neuro and not neuro.is_dead():
		await fight(neuro, 30.0)
	await pick("f1_xray_ammo")
	_log("Munitions 9mm : %d | %d" % [GameState.weapon_mag("pistol"), GameState.weapon_reserve("pistol")])
	await _shot("10_radiographie")

	_step("Salle de pause et archives médicales : munitions")
	if await open_door("f1_staff_door"):
		await pick("f1_staff_ammo")
	if await open_door("f1_records_door"):
		await pick("f1_records_ammo")
		await pick("f1_records_battery")

	_step("Retour à l'escalier A, descente au -2")
	if not await goto(Vector3(-9.0, 4, -14.0), 0.8):
		await _fail("couloir du 1er")
		return false
	if not await enter_stair("a", "stair_a_1"):
		return false
	if not await climb("a", 1, -2):
		return false
	return true


func _ch_sous_sol() -> bool:
	_step("Sous-sol -2 : porte du local technique (clé)")
	if not await leave_stair("a", "stair_a_b2"):
		await _fail("porte de l'escalier au -2")
		return false
	if not await wait_flag("b2_arrived", 5.0):
		await _fail("arrivée au -2 non détectée")
		return false
	await _secs(4.0)

	_step("Local technique : la procédure")
	if not await open_door("b2_technical_door"):
		await _fail("porte du local technique")
		return false
	if not await read_doc("doc_generator"):
		await _fail("procédure des groupes électrogènes")
		return false
	await pick("b2_tech_spray")

	_step("Groupes électrogènes : dans l'ordre")
	if not await goto(Vector3(-11.0, -8, -14.0), 0.8):
		await _fail("retour au couloir")
		return false
	if not await open_door("b2_generator_door"):
		await _fail("porte des groupes")
		return false
	# Une erreur d'abord (le groupe cale), puis la bonne procédure.
	if not await interact_with(node("switch_g1"), 0.8):
		await _fail("commutateur G1")
		return false
	await _secs(1.5)
	_log("Mauvais ordre → message : %s" % GameState.ui.message_label.text)
	await clear_area(14.0)
	for id in ["pump", "g1", "transfer"]:
		if not await interact_with(node("switch_" + id), 0.8):
			await _fail("commutateur %s" % id)
			return false
		await _secs(1.2)
		await clear_area(14.0)
	if not await wait_flag("power_restored", 5.0):
		await _fail("le courant n'est pas rétabli")
		return false
	await _shot("11_courant")
	await _secs(3.0)
	await clear_area(16.0)
	await pick("b2_gen_ammo")
	_step("Chaufferie et atelier : munitions")
	if await open_door("b2_boiler_door"):
		await pick("b2_boiler_ammo")
	if await open_door("b2_workshop_door"):
		await pick("b2_workshop_shells")
		await pick("b2_workshop_battery")

	_step("Ascenseurs : vers le 3e")
	if not await goto(Vector3(0.0, -8, -14.2), 0.8):
		await _fail("ascenseurs du -2")
		return false
	return await ride("main", 3)


func _ch_neurologie() -> bool:
	_step("Neurologie : le service de Sarah")
	if not await wait_flag("reached_f3", 5.0):
		await _fail("arrivée au 3e non détectée")
		return false
	await _shot("12_neurologie")
	await clear_area(12.0)

	_step("Poste de soins : la clé du casier")
	if not await pick("f3_locker_key"):
		await _fail("clé du casier de Sarah")
		return false
	await read_doc("doc_patient_list")
	await pick("f3_station_battery")
	await pick("f3_station_ammo")

	_step("Sécurité du 3e : le fusil à pompe")
	if not await open_door("f3_security_door"):
		await _fail("porte de la sécurité du 3e")
		return false
	if not await pick("f3_shotgun"):
		await _fail("fusil à pompe")
		return false
	await pick("f3_shells")

	_step("Chambre 306 : munitions")
	await pick("f3_room306_ammo")
	await pick("f3_room301_spray")

	_step("Salle des infirmières : le casier de Sarah")
	if not await goto(Vector3(-18.0, 12, -14.0), 0.8):
		await _fail("couloir")
		return false
	if not await open_door("f3_nurses_door"):
		await _fail("porte des infirmières")
		return false
	await examine(Vector3(-23.4, 13.5, -20.0))
	await close_modal()
	if not await interact_with(node("sarah_locker"), 0.8):
		await _fail("casier de Sarah")
		return false
	if not await wait_flag("sarah_locker_open", 3.0):
		await _fail("le casier ne s'ouvre pas")
		return false
	await _secs(1.0)
	if not await read_doc("doc_sarah_letter"):
		await _fail("lettre de Sarah")
		return false
	if not await read_doc("doc_sarah_note"):
		await _fail("note de Sarah (code)")
		return false
	await pick("f3_nurses_spray")
	await _shot("13_casier")
	return true


func _ch_chirurgien() -> bool:
	_step("Boss : le Chirurgien")
	if not await wait_flag("surgeon_started", 10.0):
		await _fail("le Chirurgien ne se réveille pas")
		return false
	await _secs(1.0)
	var boss := game.enemies.get("f3_surgeon") as Surgeon
	if boss == null:
		await _fail("Chirurgien absent")
		return false
	if not boss.is_dead():
		await heal_up(70.0)
		if not await goto(Vector3(-18.0, 12, -14.0), 0.8, true, 10.0, false):
			await _fail("sortie de la salle des infirmières")
			return false
		if not await boss_fight(boss, 300.0):
			await _fail("combat contre le Chirurgien")
			return false
	await _shot("14_chirurgien")
	await _secs(3.0)
	await clear_area(12.0)

	_step("Retour au 1er étage (ascenseurs)")
	await read_doc("doc_keller")
	if not await goto(Vector3(0.0, 12, -14.2), 0.8):
		await _fail("ascenseurs du 3e")
		return false
	return await ride("main", 1)


func _ch_escalier_b() -> bool:
	_step("Escalier de service B : le code 0612")
	if not await goto(Vector3(26.0, 4, -14.2), 0.8):
		await _fail("couloir du 1er, côté est")
		return false
	var cp := node("stair_b_code")
	if not await interact_with(cp, 0.8):
		await _fail("clavier de l'escalier B")
		return false
	await _frames(20)
	if not (GameState.ui.top_screen() is KeypadScreen):
		await _fail("l'écran du clavier ne s'ouvre pas")
		return false
	await type_code("1234")
	_log("Code erroné 1234 → escalier ouvert : %s (attendu : non)" % GameState.get_flag("stair_b_open"))
	await type_code("0612")
	await _secs(1.2)
	await close_modal()
	if not GameState.get_flag("stair_b_open"):
		await _fail("le code 0612 n'ouvre pas l'escalier B")
		return false

	_step("Escalier B : montée au 6e")
	if not await enter_stair("b", "stair_b_1"):
		return false
	if not await climb("b", 1, 6):
		return false
	_log("Grattements à la porte du 5e : %s" % GameState.ui.subtitle_label.text if GameState.ui.get("subtitle_label") else "")
	if not await leave_stair("b", "stair_b_6"):
		await _fail("porte du 6e")
		return false
	return true


func _ch_sixieme() -> bool:
	_step("6e étage : le sas de décontamination")
	if not await wait_flag("reached_floor_6", 5.0):
		await _fail("arrivée au 6e non détectée")
		return false
	if not await goto(Vector3(20.0, 24, -14.0), 0.6, false, 20.0, false):
		await _fail("sas")
		return false
	await _secs(1.0)
	await wait_controls(10.0)
	if not await goto(Vector3(12.0, 24, -14.0), 0.7):
		await _fail("sortie du sas")
		return false
	await _shot("15_sixieme")

	_step("Vestiaire : le fusible")
	if not await open_door("f6_suits_door"):
		await _fail("porte du vestiaire")
		return false
	if not await pick("f6_fuse"):
		await _fail("fusible")
		return false
	await pick("f6_suits_shells")

	_step("Laboratoire d'analyses : la vérité sur Sarah")
	if not await goto(Vector3(8.0, 24, -14.0), 0.8):
		await _fail("couloir du 6e")
		return false
	if not await open_door("f6_lab_door"):
		await _fail("porte du laboratoire")
		return false
	await clear_area(12.0)
	if not await read_doc("doc_echo_protocol"):
		await _fail("protocole ECHO")
		return false
	if not await read_doc("doc_sabotage"):
		await _fail("journal de sabotage")
		return false
	await pick("f6_lab_ammo")

	_step("La chambre 604")
	if not await goto(Vector3(-4.0, 24, -14.0), 0.8, false, 30.0, false):
		await _fail("devant la 604")
		return false
	await _secs(1.5)
	var q := game.enemies.get("f6_q604") as Enemy
	if q and not q.is_dead():
		await fight(q, 30.0)
	await clear_area(12.0)

	_step("Cellule de crise : le fusible")
	if not await interact_with(node("f6_fuse_box"), 0.8):
		await _fail("boîtier électrique")
		return false
	if not await wait_flag("f6_fuse_inserted", 3.0):
		await _fail("fusible non inséré")
		return false
	if not await open_door("f6_crisis_door"):
		await _fail("porte de la cellule de crise")
		return false
	await read_doc("doc_crisis")
	if not await pick("f6_smg"):
		await _fail("pistolet-mitrailleur")
		return false
	await pick("f6_smg_ammo")
	if not await pick("f6_research_card"):
		await _fail("carte recherche")
		return false
	await clear_area(10.0)
	await _shot("16_carte")

	_step("Ascenseurs : retour au -2")
	if not await goto(Vector3(0.0, 24, -14.2), 0.8):
		await _fail("ascenseurs du 6e")
		return false
	return await ride("main", -2)


func _ch_monte_charge() -> bool:
	_step("Parking : le Veilleur entre Thomas et le monte-charge")
	await _secs(2.0)
	var v: Enemy = game.enemies.get("b2_veilleur")
	if v and not v.is_dead():
		_log("Veilleur : %s" % v.debug_state())
		# Il est aveugle : on marche sans bruit, lampe éteinte. S'il charge, on tire.
		if GameState.flashlight_on:
			await press("flashlight")
	if not await goto(Vector3(19.1, -8, -14.3), 0.7):
		await _fail("monte-charge du -2")
		return false
	if v and not v.is_dead() and v.state in [Enemy.State.CHASE, Enemy.State.ATTACK]:
		await fight(v, 40.0)
	if not GameState.flashlight_on:
		await press("flashlight")

	_step("Monte-charge : carte recherche → 8e")
	return await ride("freight", 8)


func _ch_huitieme() -> bool:
	_step("8e étage : laboratoire expérimental")
	if not await wait_flag("reached_f8", 5.0):
		await _fail("arrivée au 8e non détectée")
		return false
	await _shot("17_huitieme")

	_step("Bureau de recherche : la vidéo de Sarah")
	if not await open_door("f8_video_door"):
		await _fail("porte du bureau de recherche")
		return false
	if not await interact_with(node("sarah_video_point"), 0.9):
		await _fail("ordinateur de la vidéo")
		return false
	if not await wait_flag("sarah_video_seen", 60.0):
		await _fail("la vidéo de Sarah ne se termine pas")
		return false
	await wait_controls(10.0)
	await _shot("18_video")

	_step("Bureau du Dr Vance : le coffre (0309)")
	if not await goto(Vector3(11.0, 32, -14.0), 0.8):
		await _fail("couloir du 8e")
		return false
	if not await open_door("f8_vance_door"):
		await _fail("porte du bureau de Vance")
		return false
	await read_doc("doc_vance_memo")
	var safe := node("vance_safe") as KeypadSafe
	if not await interact_with(safe, 0.8):
		await _fail("clavier du coffre")
		return false
	await _frames(20)
	if not (GameState.ui.top_screen() is KeypadScreen):
		await _fail("l'écran du coffre ne s'ouvre pas")
		return false
	await type_code("0309")
	await _secs(1.5)
	await close_modal()
	if not GameState.get_flag("vance_safe_open"):
		await _fail("le code 0309 n'ouvre pas le coffre")
		return false
	await _secs(1.0)
	for id in ["f8_magnum", "f8_magnum_ammo"]:
		if not await pick(id):
			await _fail("contenu du coffre : %s" % id)
			return false

	_step("La clé de direction : le Colossus se libère")
	if not await pick("f8_private_key"):
		await _fail("clé de l'ascenseur de direction")
		return false
	if not await wait_flag("colossus_free", 5.0):
		await _fail("le Colossus ne se libère pas")
		return false
	await _secs(1.5)
	await _shot("19_colossus")
	if not await goto(Vector3(11.0, 32, -14.0), 0.6, true, 10.0, false):
		await _fail("sortie du bureau")
		return false
	if not await goto(Vector3(22.8, 32, -14.4), 0.6, true, 15.0, false):
		await _fail("fuite vers l'ascenseur de direction")
		return false

	_step("Ascenseur de direction → 11e")
	return await ride("private", 11)


func _ch_onzieme() -> bool:
	_step("11e étage : la direction")
	if not await wait_flag("reached_f11", 5.0):
		await _fail("arrivée au 11e non détectée")
		return false
	await open_door("f11_board_door")
	await read_doc("doc_board")
	for id in ["f11_board_ammo", "f11_board_shells", "f11_board_spray"]:
		await pick(id)
	if not await goto(Vector3(22.0, 44, -14.0), 0.8):
		await _fail("couloir du 11e")
		return false
	if not await open_door("f11_director_door"):
		await _fail("porte du directeur")
		return false
	await read_doc("doc_director")
	await pick("f11_dir_magammo")
	await pick("f11_dir_spray")

	_step("Centre de contrôle : Sarah")
	if not await goto(Vector3(-24.0, 44, -14.0), 0.8):
		await _fail("couloir")
		return false
	if not await open_door("f11_control_door"):
		await _fail("porte du centre de contrôle")
		return false
	await heal_up(80.0)
	await goto(Vector3(0.0, 44, -9.0), 0.8, false, 12.0, false)
	if not await wait_flag("sarah_talked", 5.0):
		await _fail("la scène avec Sarah ne se déclenche pas")
		return false
	await _shot("20_sarah")
	await wait_controls(60.0)
	if not GameState.has_item("key_main_lab"):
		await _fail("Sarah n'a pas donné sa carte")
		return false

	_step("Boss : Sarah")
	var sarah := game.enemies.get("f11_sarah") as SarahBoss
	if sarah == null:
		await _fail("Sarah absente")
		return false
	await _secs(3.0)
	if not await boss_fight(sarah, 300.0):
		await _fail("combat contre Sarah")
		return false
	if not await wait_flag("sarah_dead", 5.0):
		await _fail("mort de Sarah non enregistrée")
		return false
	await idle(12.0)
	await _shot("21_adieux")

	_step("Escalier C : montée au 12e")
	if not await enter_stair("c", "stair_c_11"):
		return false
	if not await climb("c", 11, 12):
		return false
	if not await leave_stair("c", "stair_c_12"):
		await _fail("porte du 12e (carte de Sarah)")
		return false
	return true


func _ch_douzieme() -> bool:
	_step("12e étage : le laboratoire principal")
	if not await wait_flag("reached_f12", 5.0):
		await _fail("arrivée au 12e non détectée")
		return false
	await _shot("22_labo")
	await read_doc("doc_zero")
	if not await interact_with(node("zero_intercom"), 0.8):
		await _fail("interphone de la cellule")
		return false
	await _secs(18.0)
	for id in ["f12_magammo", "f12_ammo", "f12_shells", "f12_spray"]:
		await pick(id)

	await heal_up(80.0)
	_step("Console Oméga : le Patient Zéro se libère")
	if not await open_door("f12_core_door"):
		await _fail("porte du poste de commande")
		return false
	if not await interact_with(node("self_destruct_point"), 0.9):
		await _fail("console d'autodestruction")
		return false
	if not await wait_flag("zero_released", 5.0):
		await _fail("le Patient Zéro ne sort pas")
		return false
	await _secs(2.0)
	await _shot("23_zero")

	_step("Boss final : le Patient Zéro")
	var zero := game.enemies.get("f12_zero") as PatientZero
	if not await boss_fight(zero, 420.0):
		await _fail("combat contre le Patient Zéro")
		return false
	if not await wait_flag("zero_dead", 5.0):
		await _fail("mort du Patient Zéro non enregistrée")
		return false
	await clear_area(20.0)
	await idle(8.0)
	await clear_area(20.0)
	await heal_up(60.0)

	_step("Autodestruction")
	if not await goto(Vector3(11.0, 48, -14.0), 0.8):
		await _fail("retour au poste de commande")
		return false
	if not await interact_with(node("self_destruct_point"), 0.9):
		await _fail("console d'autodestruction (2)")
		return false
	if not await wait_flag("self_destruct", 5.0):
		await _fail("l'autodestruction ne s'engage pas")
		return false
	await read_doc("doc_order")
	await _shot("24_autodestruction")
	return true


func _ch_evasion() -> bool:
	_step("Évasion : escalier C jusqu'au 8e")
	if not await goto(Vector3(-28.0, 48, -14.2), 0.7, true, 40.0):
		await _fail("vers l'escalier C")
		return false
	if not await enter_stair("c", "stair_c_12"):
		return false
	if not await climb("c", 12, 8, true):
		return false
	# Le Colossus rôde au 8e : on recharge tout avant d'ouvrir la porte
	await reload_all()
	await heal_up(70.0)
	await _equip("magnum")
	if not await leave_stair("c", "stair_c_8"):
		await _fail("porte du 8e")
		return false

	_step("8e : passer le Colossus")
	var c := game.enemies.get("f8_colossus") as Colossus
	if not await colossus_pass(c):
		await _fail("le Colossus barre le couloir")
		return false

	_step("Monte-charge → -1")
	if not await goto(Vector3(19.1, 32, -14.3), 0.6, true, 20.0, false):
		await _fail("monte-charge du 8e")
		return false
	# Le Colossus talonne : on le remet à genoux avant d'appeler le monte-charge
	await _stun_if_near(c, 11.0)
	if not await ride("freight", -1):
		return false
	if not await wait_flag("esc_b1", 3.0):
		await _fail("arrivée au -1 non détectée")
		return false

	_step("-1 : box, accueil, quai, rampe")
	for p in [Vector3(6.0, -4, -14.0), Vector3(6.0, -4, -10.0), Vector3(19.0, -4, -6.0), Vector3(30.0, -4, -8.0), Vector3(38.0, -4, -4.0)]:
		if not await goto(p, 0.8, true, 40.0):
			await _fail("évasion : %s" % [p])
			return false
	for p in [Vector3(38.0, -4, -1.0), Vector3(38.0, 0, 21.8)]:
		if not await walk_straight(p, 0.6, 20.0, true):
			if GameState.get_flag("game_complete"):
				break
			await _fail("remontée de la rampe")
			return false
	return true


func _ch_fin() -> bool:
	_step("Fin : l'explosion, l'appel")
	_keep_checkpoint()
	if not await wait_flag("game_complete", 8.0):
		await _fail("la cinématique de fin ne se déclenche pas")
		return false
	var t := 0.0
	while t < 90.0 and GameState.ui.top_screen() != GameState.ui.ending_screen:
		await _secs(1.0)
		t += 1.0
		if t == 4.0:
			await _shot("25_explosion")
		if t == 16.0:
			await _shot("26_appel")
	if GameState.ui.top_screen() != GameState.ui.ending_screen:
		await _fail("l'écran de fin ne s'affiche pas")
		return false
	await _secs(3.0)
	await _shot("27_fin")
	_log("Temps de jeu : %s · Documents : %d/%d · Créatures abattues : %d · PV : %d · Morts : %d" % [
		SaveSystem.format_time(GameState.playtime), GameState.documents.size(), DocumentDB.DOCS.size(),
		GameState.dead_enemies.size(), int(GameState.hp), deaths])
	if _fps_samples > 0:
		_log("FPS (rendu) : moyenne %.1f, minimum %.1f" % [_fps_sum / _fps_samples, _min_fps])
	var ui: UIRoot = GameState.ui
	var focus := get_viewport().gui_get_focus_owner() as Button
	_log("Retour au menu (bouton sélectionné : %s)…" % (focus.text if focus else "aucun"))
	await key(KEY_ENTER)
	await _secs(3.0)
	var back := ui.top_screen() == ui.main_menu
	_log("Menu principal affiché : %s · CONTINUE disponible : %s" % [back, not ui.main_menu.continue_btn.disabled])
	await _shot("28_menu_retour")
	_quit(0 if back else 1)
	return true


# --- Boss ------------------------------------------------------------------------------

## Combat de boss générique : garder la distance, viser, recharger à couvert,
## esquiver les charges, utiliser les bouteilles d'oxygène quand il y en a.
func boss_fight(boss: Enemy, timeout: float) -> bool:
	var t := 0.0
	var tanks: Array = []
	for n in get_tree().get_nodes_in_group("explosive_tanks"):
		tanks.append(n)
	_log("Boss %s : %d PV — bouteilles disponibles : %d" % [boss.enemy_id, int(boss.hp), tanks.size()])
	var last_log := 0.0
	var shots := 0
	var hits := 0
	while t < timeout and is_instance_valid(boss) and not boss.is_dead():
		if player.is_dead:
			_log("Thomas est mort pendant le combat contre %s" % boss.enemy_id)
			return false
		if not player.controls_enabled or get_tree().paused:
			release_all()
			await _frames(3)
			t += 0.05
			continue
		if t - last_log > 10.0:
			last_log = t
			_log("  … %s : %d PV, Thomas %d PV à %s, %s %d | %d — boss %s" % [boss.enemy_id, int(boss.hp), int(GameState.hp),
				_fmt(player.global_position), GameState.equipped, GameState.weapon_mag(), GameState.weapon_reserve(), boss.debug_state() + " à " + _fmt(boss.global_position)])
		if GameState.hp < 50.0 and GameState.has_item("spray"):
			release_all()
			await press("quick_heal")
		# Sbires (mutants du Patient Zéro) : d'abord eux s'ils sont au contact
		var minion := _visible_threat(6.0)
		if minion and minion != boss:
			await fight(minion, 20.0)
			continue
		var d := boss.global_position.distance_to(player.global_position)
		# Le Chirurgien rugit avant de charger : pas de côté
		if boss is Surgeon and float(boss.get("_roar_t")) >= 0.0 and d < 12.0:
			await _sidestep_from(boss)
			t += 0.6
			continue
		# Plus rien à tirer : on va chercher des munitions sur l'étage
		if _choose_weapon(boss, 3.0) in ["baton", ""]:
			if await _resupply(boss):
				continue
		# Bouteille d'oxygène à côté du boss, loin de Thomas : on tire dedans
		var tank := _tank_near(tanks, boss)
		if tank:
			await _equip("pistol" if _ammo_total("pistol") > 0 else _choose_weapon(boss, d))
			var tp := tank.global_position + Vector3.UP * 0.7
			Input.action_press("aim")
			face(tp, true)
			if player.aim_blend > 0.85 and player.weapons.can_fire() and GameState.weapon_mag() > 0 and aimed_at(tp, 0.1):
				Input.action_press("fire")
				await _frames(2)
				Input.action_release("fire")
				_log("  Bouteille visée près du boss (boss %d PV)" % int(boss.hp))
			await _frames(2)
			t += 4.0 / 60.0
			continue
		if d < 4.2:
			# Trop près : on prend le large
			release_all()
			await _retreat_from(boss)
			t += 1.2
			continue
		var w := _choose_weapon(boss, d)
		await _equip(w)
		if w == "baton" or w == "":
			await _retreat_from(boss)
			t += 1.0
			continue
		if GameState.weapon_mag() == 0:
			Input.action_release("fire")
			Input.action_release("aim")
			if not player.weapons.reloading:
				await press("reload")
			await _frames(6)
			t += 0.1
			continue
		var target := _aim_point(boss, w)
		if not _clear_line(target):
			# Pas de ligne de vue : on se rapproche prudemment
			Input.action_release("aim")
			Input.action_release("fire")
			if d > 7.0:
				await goto(boss.global_position, 6.5, false, 1.0, false)
			else:
				await _retreat_from(boss)
			t += 1.0
			continue
		Input.action_press("aim")
		face(target, true)
		if player.aim_blend > 0.85 and player.weapons.can_fire() and aimed_at(target, 0.15 if w != "shotgun" else 0.35):
			var hp0 := boss.hp
			Input.action_press("fire")
			await _frames(2 if w != "smg" else 10)
			Input.action_release("fire")
			await _frames(2)
			shots += 1
			if boss.hp < hp0:
				hits += 1
		await _frames(2)
		t += 4.0 / 60.0
	release_all()
	_log("  Tirs sur %s : %d, touchés : %d" % [boss.enemy_id, shots, hits])
	if is_instance_valid(boss) and boss.is_dead():
		_log("%s vaincu en %.0f s. Munitions : pistolet %d, fusil %d, PM %d, magnum %d · PV %d" % [boss.enemy_id, t,
			_ammo_total("pistol"), _ammo_total("shotgun"), _ammo_total("smg"), _ammo_total("magnum"), int(GameState.hp)])
		return true
	_log("%s toujours debout (%d PV) après %.0f s" % [boss.enemy_id, int(boss.hp) if is_instance_valid(boss) else -1, t])
	return false


func _fmt(v: Vector3) -> String:
	return "(%.1f, %.1f, %.1f)" % [v.x, v.y, v.z]


## Esquive latérale (perpendiculaire à l'axe boss → joueur).
func _sidestep_from(boss: Enemy) -> void:
	release_all()
	var to := boss.global_position - player.global_position
	to.y = 0.0
	var side := to.cross(Vector3.UP).normalized()
	var grid := game.facility.nav_grid_at(player.global_position)
	if grid and not grid.is_walkable(player.global_position + side * 2.0):
		side = -side
	face(player.global_position + side * 3.0 + Vector3.UP * 1.5)
	Input.action_press("move_forward")
	await press("dodge")
	await _secs(0.35)
	Input.action_release("move_forward")


## Munitions encore au sol sur l'étage, la plus proche d'abord (loin du boss).
func _resupply(boss: Enemy) -> bool:
	var best: Pickup = null
	var best_d := INF
	for n in get_tree().get_nodes_in_group("interactable"):
		var p := n as Pickup
		if p == null or not is_instance_valid(p) or not p.visible:
			continue
		if not (p.item_id in ["ammo_9mm", "ammo_shells", "ammo_magnum"]):
			continue
		if absf(p.global_position.y - player.global_position.y) > 2.5:
			continue
		var dp := p.global_position.distance_to(player.global_position)
		var db := p.global_position.distance_to(boss.global_position)
		if db < 4.0:
			continue
		if dp < best_d:
			best_d = dp
			best = p
	if best == null:
		return false
	_log("  À court de munitions : ravitaillement (%s)" % best.pickup_id)
	return await pick(best.pickup_id)


func _tank_near(tanks: Array, boss: Enemy) -> Node3D:
	for n in tanks:
		var tk := n as ExplosiveTank
		if tk == null or not is_instance_valid(tk) or tk.exploded:
			continue
		var tp := tk.global_position
		if absf(tp.y - player.global_position.y) > 2.0:
			continue
		if Vector2(tp.x - boss.global_position.x, tp.z - boss.global_position.z).length() < 2.6 \
				and tp.distance_to(player.global_position) > 6.0 and _clear_line(tp + Vector3.UP * 0.7):
			return tk
	return null


## Recule en courant vers un point libre, à l'opposé du boss.
func _retreat_from(boss: Enemy) -> void:
	var grid := game.facility.nav_grid_at(player.global_position)
	var pos := player.global_position
	var away := pos - boss.global_position
	away.y = 0.0
	if away.length() < 0.1:
		away = Vector3.RIGHT
	away = away.normalized()
	var best := pos
	var best_score := -INF
	for i in 16:
		var a := i * TAU / 16.0
		var dir := Vector3(cos(a), 0, sin(a))
		for dist in [9.0, 6.0]:
			var p: Vector3 = pos + dir * float(dist)
			if grid == null or not grid.is_walkable(p) or not grid.has_point_path(pos, p):
				continue
			# On fuit à l'opposé, loin du boss, et jamais dans un coin
			var open := 0
			for j in 8:
				var o := Vector3(cos(j * TAU / 8.0), 0, sin(j * TAU / 8.0)) * 1.8
				if grid.is_walkable(p + o):
					open += 1
			var score := dir.dot(away) * 2.0 + p.distance_to(boss.global_position) * 0.3 + open * 0.45
			if score > best_score:
				best_score = score
				best = p
			break
	if boss.global_position.distance_to(pos) < 2.6:
		await dodge_away_from(boss)
	await goto(best, 0.8, true, 2.0, false)


## Évasion au 8e : le Colossus attend dans le couloir. On le met à genoux
## (magnum, fusil) et on passe pendant qu'il est sonné ; s'il arrive au contact,
## on l'esquive par le côté libre du couloir.
func colossus_pass(c: Colossus) -> bool:
	var goal := Vector3(19.1, 32, -14.3)
	var t := 0.0
	while t < 90.0:
		if player.is_dead:
			return false
		if c == null or not is_instance_valid(c) or c.is_dead():
			return true
		var cp := c.global_position
		if player.global_position.x > cp.x + 2.5:
			return true
		var d := cp.distance_to(player.global_position)
		var down: bool = float(c.get("_down_t")) > 0.8
		if down:
			_log("  Colossus à genoux : on passe (d=%.1f)" % d)
			release_all()
			await _slip_past(c)
			t += 2.0
			continue
		if d < 3.4:
			_log("  Colossus au contact : esquive par le côté (d=%.1f)" % d)
			await _slip_past(c)
			t += 1.0
			continue
		var w := _choose_weapon(c, d)
		await _equip(w)
		if GameState.weapon_mag() == 0:
			if not player.weapons.reloading:
				await press("reload")
			await _frames(6)
			t += 0.1
			continue
		var target := _aim_point(c, w)
		Input.action_press("aim")
		face(target, true)
		if player.aim_blend > 0.85 and player.weapons.can_fire() and aimed_at(target, 0.3):
			Input.action_press("fire")
			await _frames(2 if w != "smg" else 10)
			Input.action_release("fire")
		await _frames(2)
		t += 4.0 / 60.0
	return false


## Tire sur le Colossus jusqu'à ce qu'il soit à genoux s'il est trop près.
func _stun_if_near(c: Colossus, radius: float) -> void:
	var t := 0.0
	while t < 20.0 and c and is_instance_valid(c) and not c.is_dead() and not player.is_dead:
		var d := c.global_position.distance_to(player.global_position)
		if d > radius or float(c.get("_down_t")) > 1.5:
			break
		var w := _choose_weapon(c, d)
		await _equip(w)
		if GameState.weapon_mag() == 0:
			if not player.weapons.reloading:
				await press("reload")
			await _frames(6)
			t += 0.1
			continue
		var target := _aim_point(c, w)
		Input.action_press("aim")
		face(target, true)
		if player.aim_blend > 0.85 and player.weapons.can_fire() and aimed_at(target, 0.3):
			Input.action_press("fire")
			await _frames(2 if w != "smg" else 10)
			Input.action_release("fire")
		await _frames(2)
		t += 4.0 / 60.0
	release_all()


## Passe à côté d'une grande créature dans le couloir (côté le plus libre),
## puis file vers l'est.
func _slip_past(c: Enemy) -> void:
	release_all()
	var cp := c.global_position
	var lane := -12.7 if cp.z < -14.0 else -15.3
	var beyond := Vector3(cp.x + 3.5, player.global_position.y, lane)
	face(Vector3(beyond.x, player.global_position.y + 1.5, beyond.z))
	Input.action_press("move_forward")
	Input.action_press("run")
	await press("dodge")
	await walk_straight(beyond, 0.6, 2.5, true)
	release_all()


## Recharge toutes les armes à feu avant un passage difficile.
func reload_all() -> void:
	for w in ["magnum", "shotgun", "smg", "pistol"]:
		if not GameState.has_weapon(w):
			continue
		var full := int(WeaponDB.get_weapon(w).get("mag", 0))
		if GameState.weapon_mag(w) >= full or GameState.weapon_reserve(w) == 0:
			continue
		await _equip(w)
		await press("reload")
		var t := 0.0
		while t < 6.0 and (player.weapons.reloading or GameState.weapon_mag(w) < mini(full, GameState.weapon_mag(w) + GameState.weapon_reserve(w))):
			await _frames(6)
			t += 0.1
			if not player.weapons.reloading and GameState.weapon_mag(w) < full and GameState.weapon_reserve(w) > 0:
				await press("reload")
	_log("Armes rechargées : magnum %d, fusil %d, PM %d, pistolet %d" % [GameState.weapon_mag("magnum"), GameState.weapon_mag("shotgun"),
		GameState.weapon_mag("smg"), GameState.weapon_mag("pistol")])


func _examine_near(p: Vector3) -> ExaminePoint:
	var best: ExaminePoint = null
	var bd := 1.6
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


func _quit(code: int) -> void:
	var main := get_parent()
	if main and main.has_method("quit_game"):
		main.quit_game(code)
	else:
		get_tree().quit(code)

extends Node
## Test de la manette : tout se fait avec de vrais évènements de manette
## (boutons, sticks, gâchettes), comme un joueur.
##   · menu principal : le stick déplace la sélection (avec répétition), A valide ;
##   · en jeu : stick gauche (déplacement), stick droit (caméra), L3 (course
##     enclenchée), A (interagir), LT / RT (viser / tirer), LB / RB (armes) ;
##   · MENU (pause), B (retour), VUE (inventaire), LB / RB (onglets) ;
##   · clavier à code piloté au stick ; options (onglets, réglages manette) ;
##   · libellés affichés : boutons de manette quand on joue à la manette ;
##   · manette débranchée : la partie se met en pause.
## Usage : godot --headless --fixed-fps 60 --path . -- --test=gamepad

var ui: UIRoot
var game: Game
var player: Player
var failures := 0
var t0 := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	t0 = Time.get_ticks_msec()
	_run()


func _log(msg: String) -> void:
	print("[%6.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, msg])


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


func _secs(s: float) -> void:
	await _frames(int(s * 60.0))


func button(b: int, hold: int = 3) -> void:
	var ev := InputEventJoypadButton.new()
	ev.device = 0
	ev.button_index = b
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(hold)
	var up := ev.duplicate() as InputEventJoypadButton
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(3)


func axis(a: int, v: float) -> void:
	var ev := InputEventJoypadMotion.new()
	ev.device = 0
	ev.axis = a
	ev.axis_value = v
	Input.parse_input_event(ev)


## Pousse le stick gauche un instant (déplacement dans un menu).
func nudge(a: int, v: float) -> void:
	axis(a, v)
	await _frames(4)
	axis(a, 0.0)
	await _frames(4)


func focus_text() -> String:
	var f := get_viewport().gui_get_focus_owner() as Button
	return f.text if f else ""


func wait_top(kind, timeout: float = 5.0) -> bool:
	var t := 0.0
	while t < timeout:
		var top := ui.top_screen()
		if (kind == null and top == null) or (kind != null and is_instance_of(top, kind)):
			return true
		await _frames(6)
		t += 0.1
	return false


func _run() -> void:
	ui = get_parent().get("ui") as UIRoot
	if not _check(await wait_top(MainMenu, 10.0), "menu principal affiché"):
		return _finish()
	await _secs(0.5)

	# --- Menu principal : navigation au stick, répétition, A valide
	var first := focus_text()
	await nudge(JOY_AXIS_LEFT_Y, 1.0)
	var second := focus_text()
	_check(second != first and second != "", "stick vers le bas : sélection %s → %s" % [first, second])
	await nudge(JOY_AXIS_LEFT_Y, -1.0)
	_check(focus_text() == first, "stick vers le haut : retour sur %s" % first)
	_check(Pad.using_pad, "le jeu sait qu'on joue à la manette")
	_check(InputSetup.key_label("interact") == "A" and InputSetup.key_label("fire") == "RT",
		"libellés manette : interagir = %s, tirer = %s" % [InputSetup.key_label("interact"), InputSetup.key_label("fire")])
	# Maintenu : la sélection défile toute seule
	var seen := {}
	axis(JOY_AXIS_LEFT_Y, 1.0)
	for i in 50:
		await _frames(2)
		seen[focus_text()] = true
	axis(JOY_AXIS_LEFT_Y, 0.0)
	await _frames(4)
	_check(seen.size() >= 3, "stick maintenu : la sélection défile (%d boutons parcourus)" % seen.size())
	for i in 8:
		if focus_text() == "NEW GAME":
			break
		await nudge(JOY_AXIS_LEFT_Y, -1.0)
	# OPTIONS : RB change d'onglet, B revient
	for i in 8:
		if focus_text() == "OPTIONS":
			break
		await nudge(JOY_AXIS_LEFT_Y, 1.0)
	await button(JOY_BUTTON_A)
	if _check(await wait_top(OptionsMenu), "A sur OPTIONS ouvre les options"):
		var tab0 := ui.options_menu.current
		await button(JOY_BUTTON_RIGHT_SHOULDER)
		_check(ui.options_menu.current == (tab0 + 1) % OptionsMenu.TABS.size(), "RB : onglet suivant (%s)" % OptionsMenu.TABS[ui.options_menu.current])
		await button(JOY_BUTTON_LEFT_SHOULDER)
		_check(ui.options_menu.current == tab0, "LB : onglet précédent")
		await button(JOY_BUTTON_B)
		_check(await wait_top(MainMenu), "B referme les options")
	for i in 8:
		if focus_text() == "NEW GAME":
			break
		await nudge(JOY_AXIS_LEFT_Y, -1.0)
	_check(focus_text() == "NEW GAME", "retour sur NEW GAME")
	await button(JOY_BUTTON_A)
	for i in 3600:
		await _frames(1)
		if GameState.player and GameState.get_flag("intro_done") and (GameState.player as Player).controls_enabled:
			break
	game = GameState.game as Game
	player = GameState.player as Player
	if not _check(game != null and player != null and player.controls_enabled, "A sur NEW GAME lance la partie"):
		return _finish()
	game.camera_rig.accept_uncaptured = true
	DebugTools.god_mode = true
	await _secs(0.5)

	# --- Déplacement au stick gauche
	var p0 := player.global_position
	axis(JOY_AXIS_LEFT_Y, -1.0)
	await _secs(1.2)
	var walked := player.global_position.distance_to(p0)
	_check(walked > 1.5, "stick gauche : Thomas avance (%.1f m en 1,2 s)" % walked)
	# Course : L3 enclenche, reste active tant qu'on avance, se coupe à l'arrêt
	await button(JOY_BUTTON_LEFT_STICK)
	await _secs(0.4)
	_check(player.running, "L3 : Thomas court (stick toujours poussé, sans maintenir L3)")
	axis(JOY_AXIS_LEFT_Y, 0.0)
	await _secs(0.4)
	axis(JOY_AXIS_LEFT_Y, -1.0)
	await _secs(0.4)
	_check(not player.running, "à l'arrêt, la course se coupe")
	axis(JOY_AXIS_LEFT_Y, 0.0)
	await _secs(0.3)

	# --- Caméra au stick droit
	var yaw0 := game.camera_rig.yaw
	axis(JOY_AXIS_RIGHT_X, 1.0)
	await _secs(0.5)
	axis(JOY_AXIS_RIGHT_X, 0.0)
	var dyaw := absf(wrapf(game.camera_rig.yaw - yaw0, -PI, PI))
	_check(dyaw > 0.8, "stick droit : la caméra tourne (%.2f rad en 0,5 s)" % dyaw)
	var pitch0 := game.camera_rig.pitch
	axis(JOY_AXIS_RIGHT_Y, -1.0)
	await _secs(0.3)
	axis(JOY_AXIS_RIGHT_Y, 0.0)
	_check(game.camera_rig.pitch > pitch0 + 0.2, "stick droit vers le haut : la caméra lève les yeux")

	# --- A : interagir (la porte principale enchaînée)
	player.place(Vector3(0.0, 0.1, 2.2), 0.0)
	game.camera_rig.yaw = 0.0
	game.camera_rig.pitch = -0.1
	await _secs(0.6)
	_check(ui.hud.prompt_key.text == "A", "invite à l'écran : [%s] %s" % [ui.hud.prompt_key.text, ui.hud.prompt_label.text])
	await button(JOY_BUTTON_A)
	await _secs(0.5)
	_check(GameState.get_flag("main_door_seen"), "A : Thomas examine la porte principale")

	# --- Armes : LT vise, RT tire, RB / LB changent d'arme
	DebugTools.give_weapon("pistol")
	DebugTools.give_weapon("smg")
	DebugTools.give_ammo()
	await _secs(0.3)
	player.weapons.equip("pistol")
	await _secs(0.8)
	axis(JOY_AXIS_TRIGGER_LEFT, 1.0)
	await _secs(0.4)
	_check(player.aiming, "LT : Thomas vise")
	var mag0 := GameState.weapon_mag("pistol")
	axis(JOY_AXIS_TRIGGER_RIGHT, 1.0)
	await _secs(0.25)
	axis(JOY_AXIS_TRIGGER_RIGHT, 0.0)
	await _secs(0.4)
	_check(GameState.weapon_mag("pistol") < mag0, "RT : tir (chargeur %d → %d)" % [mag0, GameState.weapon_mag("pistol")])
	axis(JOY_AXIS_TRIGGER_LEFT, 0.0)
	await _secs(0.3)
	var w0: String = player.weapons.current
	await button(JOY_BUTTON_RIGHT_SHOULDER)
	await _secs(0.6)
	_check(player.weapons.current != w0, "RB : arme suivante (%s → %s)" % [w0, player.weapons.current])
	await button(JOY_BUTTON_LEFT_SHOULDER)
	await _secs(0.6)
	_check(player.weapons.current == w0, "LB : arme précédente (%s)" % player.weapons.current)

	# --- MENU : pause, croix (sans déclencher les actions de jeu), B : reprendre
	await button(JOY_BUTTON_START)
	_check(await wait_top(PauseMenu), "MENU met en pause")
	var f0 := focus_text()
	await button(JOY_BUTTON_DPAD_DOWN, 6)
	_check(ui.top_screen() is PauseMenu and focus_text() != f0,
		"croix bas dans la pause : sélection %s → %s (l'inventaire ne s'ouvre pas)" % [f0, focus_text()])
	await button(JOY_BUTTON_DPAD_UP, 6)
	_check(focus_text() == f0, "croix haut : retour sur %s" % f0)
	await button(JOY_BUTTON_B)
	_check(await wait_top(null), "B reprend la partie")

	# --- VUE : inventaire, LB / RB : onglets, B : fermer
	await button(JOY_BUTTON_BACK)
	if _check(await wait_top(InventoryScreen), "VUE ouvre l'inventaire"):
		await button(JOY_BUTTON_RIGHT_SHOULDER)
		_check(ui.inventory.tab == 1, "RB : onglet DOCUMENTS")
		await button(JOY_BUTTON_LEFT_SHOULDER)
		_check(ui.inventory.tab == 0, "LB : onglet OBJETS")
		var sel0 := ui.inventory.selected
		await nudge(JOY_AXIS_LEFT_X, 1.0)
		_check(ui.inventory.selected == (sel0 + 1) % GameState.INVENTORY_SLOTS, "stick : case suivante (%d → %d)" % [sel0, ui.inventory.selected])
		var sel1 := ui.inventory.selected
		await button(JOY_BUTTON_DPAD_DOWN, 6)
		_check(ui.top_screen() is InventoryScreen and ui.inventory.selected != sel1,
			"croix bas : case du dessous (%d → %d), l'inventaire reste ouvert" % [sel1, ui.inventory.selected])
		await button(JOY_BUTTON_B)
		_check(await wait_top(null), "B referme l'inventaire")

	# --- Clavier à code au stick : 3 1 4
	var safe := KeypadSafe.new()
	safe.code = "314"
	safe.position = Vector3(0, -50, 0)
	game.add_child(safe)
	ui.open_keypad(safe)
	if _check(await wait_top(KeypadScreen), "clavier à code ouvert"):
		await nudge(JOY_AXIS_LEFT_Y, -1.0)     # 5 → 2
		await nudge(JOY_AXIS_LEFT_X, 1.0)      # 2 → 3
		await button(JOY_BUTTON_A)
		await nudge(JOY_AXIS_LEFT_X, -1.0)     # 3 → 2
		await nudge(JOY_AXIS_LEFT_X, -1.0)     # 2 → 1
		await button(JOY_BUTTON_A)
		await nudge(JOY_AXIS_LEFT_Y, 1.0)      # 1 → 4
		await button(JOY_BUTTON_A)
		await _secs(1.5)
		_check(safe.is_open, "code 314 composé à la manette : le coffre s'ouvre")
		if ui.top_screen() is KeypadScreen:
			await button(JOY_BUTTON_B)
		_check(await wait_top(null), "clavier refermé")

	# --- Manette débranchée : pause automatique
	Pad._on_joy_connection(0, false)
	_check(await wait_top(PauseMenu), "manette débranchée : la partie se met en pause")
	await button(JOY_BUTTON_START)
	await wait_top(null)

	# --- Retour au clavier : les libellés reviennent au clavier
	var k := InputEventKey.new()
	k.physical_keycode = KEY_SHIFT
	k.keycode = KEY_SHIFT
	k.pressed = true
	Input.parse_input_event(k)
	await _frames(2)
	k = k.duplicate() as InputEventKey
	k.pressed = false
	Input.parse_input_event(k)
	await _frames(2)
	_check(not Pad.using_pad and InputSetup.key_label("interact") != "A", "clavier : libellés clavier (%s)" % InputSetup.key_label("interact"))
	Pad.rumble(0.5)
	_finish()


func _finish() -> void:
	_log("Manette : %s" % ("tout est OK." if failures == 0 else "%d échec(s)." % failures))
	get_tree().quit(0 if failures == 0 else 1)

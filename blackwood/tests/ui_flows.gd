extends Node
## Parcours des menus qu'un joueur utilise en dehors de la campagne :
## OPTIONS, NEW GAME, pause (RESUME / OPTIONS), inventaire, mort → YOU DIED →
## RETRY, QUIT TO MENU (avec confirmation), CONTINUE → chargement.
## Usage : godot --headless --fixed-fps 60 --path . -- --test=ui_flows

var ui: UIRoot
var t0 := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	t0 = Time.get_ticks_msec()
	_run()


func _log(msg: String) -> void:
	print("[%5.1fs | jeu %6.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, GameState.playtime, msg])


func _fail(msg: String) -> void:
	_log("ÉCHEC : " + msg)
	_quit(1)


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


func _secs(s: float) -> void:
	await _frames(int(s * 60.0))


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


func _find_button(root: Node, text: String) -> Button:
	for n in root.find_children("*", "Button", true, false):
		var b := n as Button
		if b.text == text and b.is_visible_in_tree() and not b.disabled:
			return b
	return null


## Sélectionne le bouton au clavier puis le valide avec Entrée, comme un joueur.
func choose(text: String) -> bool:
	var top := ui.top_screen()
	var b := _find_button(top, text) if top else null
	if b == null:
		await _fail("bouton « %s » introuvable sur %s" % [text, top.get_class() if top else "aucun écran"])
		return false
	b.grab_focus()
	await _frames(2)
	await key(KEY_ENTER)
	await _frames(4)
	return true


func wait_top(cls: Variant, timeout: float = 5.0) -> bool:
	var t := 0.0
	while t < timeout:
		var top := ui.top_screen()
		if cls == null and top == null:
			return true
		if cls != null and is_instance_of(top, cls):
			return true
		await _frames(3)
		t += 0.05
	return false


func wait_game(timeout: float = 20.0) -> bool:
	var t := 0.0
	while t < timeout:
		var p := GameState.player as Player
		if GameState.game != null and p != null and not p.is_dead and p.controls_enabled and not get_tree().paused:
			return true
		await _frames(3)
		t += 0.05
	return false


func expect(cond: bool, what: String) -> bool:
	if not cond:
		await _fail(what)
		return false
	_log("OK  " + what)
	return true


func _run() -> void:
	ui = get_parent().get("ui") as UIRoot
	if not await expect(await wait_top(MainMenu, 10.0), "menu principal affiché"):
		return
	var focus := get_viewport().gui_get_focus_owner() as Button
	if not await expect(focus != null and focus.text == "NEW GAME", "NEW GAME sélectionné par défaut"):
		return

	# OPTIONS depuis le menu principal, puis retour avec Échap
	await choose("OPTIONS")
	if not await expect(await wait_top(OptionsMenu), "OPTIONS s'ouvre"):
		return
	await key(KEY_ESCAPE)
	if not await expect(await wait_top(MainMenu), "Échap ramène au menu principal"):
		return

	# NEW GAME
	await choose("NEW GAME")
	if not await expect(await wait_game(60.0), "NEW GAME lance la partie (introduction terminée)"):
		return
	await _secs(1.0)

	# Pause : RESUME
	await key(KEY_ESCAPE)
	if not await expect(await wait_top(PauseMenu) and get_tree().paused, "Échap met en pause"):
		return
	focus = get_viewport().gui_get_focus_owner() as Button
	if not await expect(focus != null and focus.text == "RESUME", "RESUME sélectionné par défaut"):
		return
	await key(KEY_ENTER)
	if not await expect(await wait_top(null) and not get_tree().paused, "RESUME reprend la partie"):
		return

	# Pause : OPTIONS, puis Échap deux fois
	await key(KEY_ESCAPE)
	await wait_top(PauseMenu)
	await choose("OPTIONS")
	if not await expect(await wait_top(OptionsMenu), "OPTIONS depuis la pause"):
		return
	await key(KEY_ESCAPE)
	if not await expect(await wait_top(PauseMenu), "Échap revient à la pause"):
		return
	await key(KEY_ESCAPE)
	if not await expect(await wait_top(null) and not get_tree().paused, "Échap ferme la pause"):
		return

	# Pause : INVENTORY
	await key(KEY_ESCAPE)
	await wait_top(PauseMenu)
	await choose("INVENTORY")
	if not await expect(await wait_top(InventoryScreen) and get_tree().paused, "INVENTORY depuis la pause"):
		return
	await key(KEY_TAB)
	if not await expect(await wait_top(null), "Tab ferme l'inventaire"):
		return

	# Inventaire direct avec Tab
	await key(KEY_TAB)
	if not await expect(await wait_top(InventoryScreen), "Tab ouvre l'inventaire"):
		return
	await key(KEY_TAB)
	await wait_top(null)

	# Mort → YOU DIED → RETRY
	var p := GameState.player as Player
	p.take_damage(500.0, p.global_position + Vector3(0, 0, -1))
	if not await expect(await wait_top(DeathScreen, 8.0), "écran de mort affiché"):
		return
	var died := false
	for n in ui.top_screen().find_children("*", "Label", true, false):
		if (n as Label).text == "YOU DIED":
			died = true
	if not await expect(died, "texte « YOU DIED »"):
		return
	await _secs(1.5)
	focus = get_viewport().gui_get_focus_owner() as Button
	if not await expect(focus != null and focus.text == "RETRY", "RETRY sélectionné par défaut"):
		return
	await key(KEY_ENTER)
	await _secs(1.0)
	if not await expect(await wait_game(60.0), "RETRY relance depuis la sauvegarde automatique"):
		return
	p = GameState.player as Player
	if not await expect(p != null and not p.is_dead and GameState.hp > 0.0, "Ethan est vivant (%d PV) dans la zone « %s »" % [int(GameState.hp), GameState.current_zone]):
		return

	# QUIT TO MENU (avec confirmation)
	await key(KEY_ESCAPE)
	await wait_top(PauseMenu)
	await choose("QUIT TO MENU")
	await choose("OUI, QUITTER")
	if not await expect(await wait_top(MainMenu, 5.0), "QUIT TO MENU → menu principal"):
		return

	# CONTINUE → liste des sauvegardes → chargement
	await _secs(1.0)
	await choose("CONTINUE")
	if not await expect(await wait_top(SaveScreen), "CONTINUE ouvre la liste des sauvegardes"):
		return
	focus = get_viewport().gui_get_focus_owner() as Button
	_log("    sauvegarde proposée : %s" % (focus.text if focus else "aucune"))
	await key(KEY_ENTER)
	if not await expect(await wait_game(60.0), "la sauvegarde se charge et la partie reprend"):
		return
	_log("Parcours des menus : tout est OK.")
	_quit(0)


func _quit(code: int) -> void:
	var main := get_parent()
	if main and main.has_method("quit_game"):
		main.quit_game(code)
	else:
		get_tree().quit(code)

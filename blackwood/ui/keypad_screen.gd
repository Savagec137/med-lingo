class_name KeypadScreen
extends UIScreen
## Clavier à code (coffres, portes) : le nombre de chiffres suit le code attendu.
## « safe » est un KeypadSafe ou un CodePanel (code, title, success_msg, try_code).

var safe: Interactable
var title_label: Label
var entry := ""
var display: Label
var status: Label
var pad: GridContainer
var _error_t := 0.0
var _busy := false
## Manette : touche sélectionnée (stick / croix), A l'enfonce.
const KEYS := ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"]
var _sel := 4
var _keys: Array[Button] = []
var hint: Label


func _ready() -> void:
	super._ready()
	add_dim(0.75)
	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	var plate := PanelContainer.new()
	var st := StyleBoxFlat.new()
	st.bg_color = Color(0.16, 0.17, 0.18)
	st.border_color = Color(0.35, 0.36, 0.37)
	st.set_border_width_all(3)
	st.set_corner_radius_all(6)
	st.content_margin_left = 34
	st.content_margin_right = 34
	st.content_margin_top = 26
	st.content_margin_bottom = 26
	plate.add_theme_stylebox_override("panel", st)
	center.add_child(plate)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 14)
	plate.add_child(col)
	title_label = UITheme.label("COFFRE", 22, UITheme.COL_DIM, UITheme.font_ui_bold())
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(title_label)
	var screen := PanelContainer.new()
	var ss := StyleBoxFlat.new()
	ss.bg_color = Color(0.02, 0.06, 0.03)
	ss.content_margin_top = 8
	ss.content_margin_bottom = 8
	screen.add_theme_stylebox_override("panel", ss)
	col.add_child(screen)
	display = UITheme.label("_ _ _", 48, Color(0.3, 1.0, 0.45), UITheme.font_typed())
	display.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	screen.add_child(display)
	status = UITheme.label("Code à 3 chiffres", 16, UITheme.COL_DIM)
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(status)
	pad = GridContainer.new()
	pad.columns = 3
	pad.add_theme_constant_override("h_separation", 8)
	pad.add_theme_constant_override("v_separation", 8)
	col.add_child(pad)
	for k in KEYS:
		var b := UITheme.button(k, 30)
		# Pas de focus clavier : sinon Entrée « appuie » sur le bouton focalisé
		# au lieu de valider le code, et les chiffres tapés se perdent.
		b.focus_mode = Control.FOCUS_NONE
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.custom_minimum_size = Vector2(84, 62)
		var bs := StyleBoxFlat.new()
		bs.bg_color = Color(0.28, 0.29, 0.3)
		bs.set_corner_radius_all(4)
		b.add_theme_stylebox_override("normal", bs)
		b.pressed.connect(_press.bind(k))
		pad.add_child(b)
		_keys.append(b)
	hint = UITheme.label("", 13, UITheme.COL_FAINT)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(hint)


func _digits() -> int:
	return String(safe.get("code")).length() if safe else 3


func on_open() -> void:
	entry = ""
	_update()
	title_label.text = String(safe.get("title")) if safe and safe.get("title") != null else "COFFRE"
	status.text = "Code à %d chiffres" % _digits()
	display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45))
	_busy = false


func _press(k: String) -> void:
	if _busy:
		return
	match k:
		"C":
			entry = ""
			Audio.ui("keypad_beep", -8.0)
		"OK":
			submit()
			return
		_:
			if entry.length() < _digits():
				entry += k
				Audio.ui("keypad_beep", -6.0)
	_update()
	# Validation automatique au dernier chiffre.
	if entry.length() == _digits():
		_busy = true
		await get_tree().create_timer(0.25, true).timeout
		_busy = false
		if entry.length() == _digits() and visible:
			submit()


func submit() -> void:
	if _busy:
		return
	if entry.length() < _digits():
		status.text = "Il faut %d chiffres." % _digits()
		Audio.ui("keypad_error", -6.0)
		return
	var ok := false
	if safe and Net.is_client() and Coop.instance():
		# Invité : l'hôte vérifie le code (et ouvre ce qu'il faut chez lui)
		_busy = true
		status.text = "VÉRIFICATION…"
		ok = await _server_check(String(safe.get("net_key")), entry)
		_busy = false
	elif safe:
		ok = bool(safe.call("try_code", entry))
	if ok:
		status.text = "CODE ACCEPTÉ"
		display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45))
		_busy = true
		await get_tree().create_timer(0.6, true).timeout
		_busy = false
		ui.close_screen(self)
		GameState.show_message(String(safe.get("success_msg")), 3.0)
	else:
		status.text = "CODE INCORRECT"
		_error_t = 0.8
		entry = ""
		_update()


## Envoie le code à l'hôte et attend sa réponse (3 s au plus).
func _server_check(key: String, code: String) -> bool:
	var res := [false, false]
	var cb := func(k: String, ok: bool) -> void:
		if k == key:
			res[0] = true
			res[1] = ok
	var c := Coop.instance()
	c.code_result.connect(cb)
	c.request_code(safe, code)
	var t := 0
	while not bool(res[0]) and t < 180:
		await get_tree().process_frame
		t += 1
	if is_instance_valid(c) and c.code_result.is_connected(cb):
		c.code_result.disconnect(cb)
	if not bool(res[0]):
		Audio.ui("keypad_error", -6.0)
	return bool(res[1])


func _update() -> void:
	var shown := ""
	var n := _digits()
	for i in n:
		shown += (entry[i] if i < entry.length() else "_") + (" " if i < n - 1 else "")
	display.text = shown


## Touche sélectionnée en surbrillance (manette) et aide selon le périphérique.
func _show_pad_cursor() -> void:
	for i in _keys.size():
		_keys[i].modulate = Color(1.45, 1.4, 1.1) if Pad.using_pad and i == _sel else Color.WHITE
	if Pad.using_pad:
		hint.text = "Stick / croix : choisir · %s : appuyer · %s : quitter" % [Pad.button_name(JOY_BUTTON_A), Pad.button_name(JOY_BUTTON_B)]
	else:
		hint.text = "Chiffres du clavier · Entrée : valider · Échap : quitter"


func _process(delta: float) -> void:
	if visible:
		_show_pad_cursor()
	if _error_t > 0.0:
		_error_t -= delta
		display.add_theme_color_override("font_color", Color(1.0, 0.2, 0.15) if int(_error_t * 10) % 2 == 0 else Color(0.3, 1.0, 0.45))
		if _error_t <= 0.0:
			display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45))


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("pause") or event.is_action_pressed("inventory") or event.is_action_pressed("ui_cancel"):
		ui.close_screen(self)
		return true
	# Manette : déplacer la sélection, A enfonce la touche
	if event is InputEventAction or event is InputEventJoypadButton:
		var col := _sel % 3
		var row := int(_sel / 3.0)
		if event.is_action_pressed("ui_left"):
			col = (col + 2) % 3
		elif event.is_action_pressed("ui_right"):
			col = (col + 1) % 3
		elif event.is_action_pressed("ui_up"):
			row = (row + 3) % 4
		elif event.is_action_pressed("ui_down"):
			row = (row + 1) % 4
		elif event.is_action_pressed("ui_accept"):
			_press(KEYS[_sel])
			return true
		else:
			return false
		_sel = row * 3 + col
		Audio.ui("ui_move", -14.0)
		return true
	if event is InputEventKey and event.pressed and not event.echo:
		var kc: int = event.physical_keycode
		if kc >= KEY_0 and kc <= KEY_9:
			_press(str(kc - KEY_0))
			return true
		if kc >= KEY_KP_0 and kc <= KEY_KP_9:
			_press(str(kc - KEY_KP_0))
			return true
		if kc == KEY_BACKSPACE:
			if _busy:
				return true
			entry = entry.substr(0, maxi(entry.length() - 1, 0))
			_update()
			return true
		if kc == KEY_ENTER or kc == KEY_KP_ENTER:
			submit()
			return true
	return false

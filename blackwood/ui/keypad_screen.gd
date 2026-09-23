class_name KeypadScreen
extends UIScreen
## Clavier du coffre des archives : code à 3 chiffres.

var safe: KeypadSafe
var entry := ""
var display: Label
var status: Label
var pad: GridContainer
var _error_t := 0.0
var _busy := false


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
	var t := UITheme.label("COFFRE — ARCHIVES", 22, UITheme.COL_DIM, UITheme.font_ui_bold())
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
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
	for k in ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"]:
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
	var hint := UITheme.label("Chiffres du clavier · Entrée : valider · Échap : quitter", 13, UITheme.COL_FAINT)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(hint)


func on_open() -> void:
	entry = ""
	_update()
	status.text = "Code à 3 chiffres"
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
			if entry.length() < 3:
				entry += k
				Audio.ui("keypad_beep", -6.0)
	_update()
	# Validation automatique au troisième chiffre.
	if entry.length() == 3:
		_busy = true
		await get_tree().create_timer(0.25, true).timeout
		_busy = false
		if entry.length() == 3 and visible:
			submit()


func submit() -> void:
	if _busy:
		return
	if entry.length() < 3:
		status.text = "Il faut trois chiffres."
		Audio.ui("keypad_error", -6.0)
		return
	if safe and safe.try_code(entry):
		status.text = "CODE ACCEPTÉ"
		display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45))
		_busy = true
		await get_tree().create_timer(0.6, true).timeout
		_busy = false
		ui.close_screen(self)
		GameState.show_message("Le coffre s'ouvre dans un déclic lourd.", 3.0)
	else:
		status.text = "CODE INCORRECT"
		_error_t = 0.8
		entry = ""
		_update()


func _update() -> void:
	var shown := ""
	for i in 3:
		shown += (entry[i] if i < entry.length() else "_") + (" " if i < 2 else "")
	display.text = shown


func _process(delta: float) -> void:
	if _error_t > 0.0:
		_error_t -= delta
		display.add_theme_color_override("font_color", Color(1.0, 0.2, 0.15) if int(_error_t * 10) % 2 == 0 else Color(0.3, 1.0, 0.45))
		if _error_t <= 0.0:
			display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45))


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("pause") or event.is_action_pressed("inventory"):
		ui.close_screen(self)
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

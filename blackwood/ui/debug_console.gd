class_name DebugConsole
extends UIScreen
## Console du mode DEBUG (F1) : saisie de commandes (voir DebugTools) et
## raccourcis pour les plus courantes. Met le jeu en pause.

var output: Label
var input: LineEdit
var _history: Array[String] = []
var _hist_i := -1


func _ready() -> void:
	super._ready()
	add_dim(0.72)
	var box := centered_vbox(900)
	box.add_child(UITheme.label("MODE DEBUG", 30, UITheme.COL_TEXT, UITheme.font_title()))
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 8)
	box.add_child(buttons)
	for b in [["GOD MODE", "god"], ["MUNITIONS", "ammo"], ["ARMES", "weapon all"], ["TUER TOUT", "killall"],
			["IA ON/OFF", "ai"], ["LUMIÈRE", "light"], ["SOIN", "heal"]]:
		var btn := UITheme.button(String(b[0]), 15)
		btn.pressed.connect(_exec.bind(String(b[1])))
		buttons.add_child(btn)
	output = UITheme.label("", 15, UITheme.COL_TEXT)
	output.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	output.custom_minimum_size = Vector2(900, 330)
	output.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	output.clip_text = true
	box.add_child(output)
	input = LineEdit.new()
	input.placeholder_text = "commande (help, god, ammo, weapon, tp, spawn, killall, ai, light…)"
	input.custom_minimum_size = Vector2(900, 36)
	# Rester en saisie après Entrée : on enchaîne les commandes
	input.keep_editing_on_text_submit = true
	input.text_submitted.connect(_on_submit)
	box.add_child(input)
	var close := UITheme.button("FERMER (F1 / Échap)", 17)
	close.pressed.connect(func() -> void: ui.close_screen(self))
	box.add_child(close)


func on_open() -> void:
	if output.text == "":
		output.text = DebugTools.help()
	input.clear()
	input.grab_focus()
	input.edit()


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("debug_console") or event.is_action_pressed("pause"):
		ui.close_screen(self)
		return true
	if event is InputEventKey and event.pressed and input.has_focus():
		var kc := (event as InputEventKey).keycode
		if kc == KEY_UP or kc == KEY_DOWN:
			_browse(-1 if kc == KEY_UP else 1)
			return true
	return false


func _browse(dir: int) -> void:
	if _history.is_empty():
		return
	_hist_i = clampi(_hist_i + dir, 0, _history.size() - 1)
	input.text = _history[_hist_i]
	input.caret_column = input.text.length()


func _on_submit(text: String) -> void:
	_exec(text)
	input.clear()
	input.grab_focus()


func _exec(line: String) -> void:
	if line.strip_edges() == "":
		return
	_history.append(line)
	_hist_i = _history.size()
	var result := DebugTools.run(line)
	var lines := (output.text + "\n> " + line + "\n" + result).split("\n")
	# On ne garde que les dernières lignes
	var start := maxi(lines.size() - 18, 0)
	output.text = "\n".join(lines.slice(start))

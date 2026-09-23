class_name OptionsMenu
extends UIScreen
## Options : volumes, souris, image, qualité graphique, rappel des commandes.

var box: VBoxContainer
var quality_btn: Button


func _ready() -> void:
	super._ready()
	add_dim(0.85)
	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	var panel := PanelContainer.new()
	center.add_child(panel)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 48)
	panel.add_child(cols)
	box = VBoxContainer.new()
	box.custom_minimum_size = Vector2(430, 0)
	box.add_theme_constant_override("separation", 6)
	cols.add_child(box)
	var t := UITheme.label("OPTIONS", 42, UITheme.COL_TEXT, UITheme.font_title())
	box.add_child(t)
	_slider("Volume général", "master_volume", 0.0, 1.0)
	_slider("Musique", "music_volume", 0.0, 1.0)
	_slider("Effets sonores", "sfx_volume", 0.0, 1.0)
	_slider("Ambiance", "ambience_volume", 0.0, 1.0)
	_slider("Sensibilité de la souris", "mouse_sensitivity", 0.2, 3.0)
	_slider("Luminosité", "brightness", 0.6, 1.8)
	_slider("Intensité de la lampe torche", "flashlight_intensity", 0.5, 1.6)
	_slider("Champ de vision", "fov", 55.0, 90.0)
	_toggle("Inverser l'axe vertical", "invert_y")
	_toggle("Plein écran", "fullscreen")
	quality_btn = UITheme.button("", 22)
	quality_btn.pressed.connect(_cycle_quality)
	box.add_child(quality_btn)
	_update_quality_label()
	var back := UITheme.button("RETOUR", 26)
	back.pressed.connect(func(): ui.close_screen(self))
	box.add_child(back)
	# Commandes
	var ctrl := VBoxContainer.new()
	ctrl.custom_minimum_size = Vector2(330, 0)
	ctrl.add_theme_constant_override("separation", 4)
	cols.add_child(ctrl)
	ctrl.add_child(UITheme.label("COMMANDES", 30, UITheme.COL_TEXT, UITheme.font_title()))
	var lines := [
		["Se déplacer", "%s %s %s %s" % [InputSetup.key_label("move_forward"), InputSetup.key_label("move_left"), InputSetup.key_label("move_back"), InputSetup.key_label("move_right")]],
		["Courir (bruyant !)", "Maj"],
		["Caméra", "Souris"],
		["Interagir / ramasser", InputSetup.key_label("interact")],
		["Viser", "Clic droit"],
		["Tirer", "Clic gauche"],
		["Recharger", InputSetup.key_label("reload")],
		["Lampe torche", InputSetup.key_label("flashlight")],
		["Esquive", "Espace"],
		["Soin rapide (spray)", InputSetup.key_label("quick_heal")],
		["Inventaire", "Tab"],
		["Pause", "Échap"],
	]
	for l in lines:
		var row := HBoxContainer.new()
		var a := UITheme.label(l[0], 17, UITheme.COL_DIM)
		a.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(a)
		row.add_child(UITheme.label(l[1], 17, UITheme.COL_TEXT, UITheme.font_ui_bold()))
		ctrl.add_child(row)
	var tip := UITheme.label("Les créatures entendent vos pas quand vous courez, et voient la lumière de votre lampe. Visez la tête.", 15, UITheme.COL_FAINT)
	tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tip.custom_minimum_size = Vector2(330, 0)
	ctrl.add_child(tip)


func _slider(label_text: String, key: String, min_v: float, max_v: float) -> void:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	var head := HBoxContainer.new()
	var l := UITheme.label(label_text, 17, UITheme.COL_DIM)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(l)
	var val := UITheme.label("", 17, UITheme.COL_TEXT)
	head.add_child(val)
	row.add_child(head)
	var s := HSlider.new()
	s.min_value = min_v
	s.max_value = max_v
	s.step = (max_v - min_v) / 100.0
	s.value = float(Settings.get(key))
	s.custom_minimum_size = Vector2(0, 18)
	s.focus_mode = Control.FOCUS_ALL
	var update := func(v: float) -> void:
		val.text = str(int(v)) if max_v > 10.0 else "%d %%" % int(round((v - min_v) / (max_v - min_v) * 100.0))
	update.call(s.value)
	s.value_changed.connect(func(v: float) -> void:
		update.call(v)
		Settings.set_value(key, v)
	)
	row.add_child(s)
	box.add_child(row)


func _toggle(label_text: String, key: String) -> void:
	var c := CheckButton.new()
	c.text = label_text
	c.button_pressed = bool(Settings.get(key))
	c.add_theme_font_size_override("font_size", 18)
	c.toggled.connect(func(on: bool) -> void:
		Settings.set_value(key, on)
	)
	box.add_child(c)


func _cycle_quality() -> void:
	Settings.set_value("quality", (Settings.quality + 1) % 3)
	_update_quality_label()


func _update_quality_label() -> void:
	quality_btn.text = "Qualité graphique : " + ["BASSE", "MOYENNE", "HAUTE"][Settings.quality]


func on_open() -> void:
	focus_first(box)

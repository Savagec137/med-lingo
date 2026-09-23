class_name OptionsMenu
extends UIScreen
## Options en onglets : GRAPHISMES · AFFICHAGE · AUDIO · JEU · COMMANDES.
## Chaque ligne est un sélecteur (◀ valeur ▶, flèches gauche/droite ou clic),
## un curseur ou une case. Les préréglages de qualité mettent à jour toutes
## les options graphiques ; en changer une passe en « PERSONNALISÉE ».

const TABS := ["GRAPHISMES", "AFFICHAGE", "AUDIO", "JEU", "COMMANDES"]

var tab_bar: HBoxContainer
var pages: Array[VBoxContainer] = []
var tab_buttons: Array[Button] = []
var current := 0
var _refreshers: Array[Callable] = []
var _page_parent: Control


func _ready() -> void:
	super._ready()
	add_dim(0.88)
	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(860, 560)
	center.add_child(panel)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	panel.add_child(col)
	col.add_child(UITheme.label("OPTIONS", 40, UITheme.COL_TEXT, UITheme.font_title()))
	tab_bar = HBoxContainer.new()
	tab_bar.add_theme_constant_override("separation", 6)
	col.add_child(tab_bar)
	for i in TABS.size():
		var b := UITheme.button(TABS[i], 19)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.custom_minimum_size = Vector2(160, 0)
		b.pressed.connect(_show_tab.bind(i))
		tab_bar.add_child(b)
		tab_buttons.append(b)
	col.add_child(HSeparator.new())
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 400)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	col.add_child(scroll)
	var stack := VBoxContainer.new()
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(stack)
	_page_parent = stack
	for i in TABS.size():
		var page := VBoxContainer.new()
		page.add_theme_constant_override("separation", 4)
		page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		page.visible = false
		stack.add_child(page)
		pages.append(page)
	_build_graphics(pages[0])
	_build_display(pages[1])
	_build_audio(pages[2])
	_build_game(pages[3])
	_build_controls(pages[4])
	var back := UITheme.button("RETOUR", 24)
	back.alignment = HORIZONTAL_ALIGNMENT_CENTER
	back.pressed.connect(func(): ui.close_screen(self))
	col.add_child(back)
	Settings.changed.connect(_refresh)
	_show_tab(0)


func _show_tab(i: int) -> void:
	current = i
	for k in pages.size():
		pages[k].visible = k == i
		tab_buttons[k].add_theme_color_override("font_color", UITheme.COL_TEXT if k == i else UITheme.COL_FAINT)
	if is_inside_tree() and visible:
		focus_first(pages[i])


func on_open() -> void:
	_refresh()
	_show_tab(current)


func handle_input(event: InputEvent) -> bool:
	# Q / E ou Page préc./suiv. : changer d'onglet
	if event is InputEventKey and event.pressed and not event.echo:
		var kc: int = event.physical_keycode
		if kc == KEY_PAGEUP:
			_show_tab((current + TABS.size() - 1) % TABS.size())
			return true
		if kc == KEY_PAGEDOWN:
			_show_tab((current + 1) % TABS.size())
			return true
	return super.handle_input(event)


func _refresh() -> void:
	for r in _refreshers:
		r.call()


# --- Onglets -----------------------------------------------------------------

func _build_graphics(p: VBoxContainer) -> void:
	_choice(p, "Qualité (préréglage)", "quality", Settings.QUALITY_NAMES, [0, 1, 2, 3])
	_choice(p, "Ombres", "shadows", Settings.SHADOW_NAMES)
	_toggle(p, "Brouillard volumétrique", "volumetric_fog")
	_toggle(p, "Occlusion ambiante (SSAO)", "ssao")
	_toggle(p, "Éclairage indirect (SSIL)", "ssil")
	_toggle(p, "Reflets en espace écran (SSR)", "ssr")
	_toggle(p, "Halo lumineux (glow)", "glow")
	_choice(p, "Anticrénelage", "antialiasing", Settings.AA_NAMES)
	_slider(p, "Résolution de rendu (FSR sous 100 %)", "render_scale", 0.5, 1.0, "%")
	_toggle(p, "Grain de film", "film_grain")
	_toggle(p, "Aberration chromatique", "chromatic_aberration")
	_hint(p, "Machine modeste : qualité BASSE ou MOYENNE. F3 en jeu affiche les images par seconde.")


func _build_display(p: VBoxContainer) -> void:
	_choice(p, "Mode d'affichage", "window_mode", Settings.WINDOW_NAMES)
	_toggle(p, "Synchronisation verticale", "vsync")
	var fps_names: Array = []
	for f in Settings.FPS_CHOICES:
		fps_names.append("ILLIMITÉ" if f == 0 else str(f))
	_choice(p, "Limite d'images par seconde", "max_fps", fps_names, Settings.FPS_CHOICES)
	_slider(p, "Luminosité", "brightness", 0.6, 1.8, "%")
	_slider(p, "Champ de vision", "fov", 55.0, 100.0, "°")
	_slider(p, "Tremblements de caméra", "camera_shake", 0.0, 1.5, "%")
	_toggle(p, "Balancement de la tête (1re personne)", "head_bob")


func _build_audio(p: VBoxContainer) -> void:
	_slider(p, "Volume général", "master_volume", 0.0, 1.0, "%")
	_slider(p, "Musique", "music_volume", 0.0, 1.0, "%")
	_slider(p, "Effets sonores", "sfx_volume", 0.0, 1.0, "%")
	_slider(p, "Ambiance", "ambience_volume", 0.0, 1.0, "%")
	_toggle(p, "Sous-titres", "subtitles")
	_choice(p, "Taille des sous-titres", "subtitle_size", Settings.SUBTITLE_NAMES)


func _build_game(p: VBoxContainer) -> void:
	_choice(p, "Vue (V en jeu)", "camera_view", Settings.VIEW_NAMES)
	_choice(p, "Difficulté", "difficulty", Settings.DIFFICULTY_NAMES)
	_slider(p, "Sensibilité de la souris", "mouse_sensitivity", 0.2, 3.0, "%")
	_toggle(p, "Inverser l'axe vertical", "invert_y")
	_toggle(p, "Réticule", "crosshair")
	_slider(p, "Intensité de la lampe torche", "flashlight_intensity", 0.5, 1.6, "%")
	_hint(p, "La difficulté règle les dégâts reçus, la résistance des créatures et les munitions trouvées.")
	_toggle(p, "Mode DEBUG (F1 : console · F3 : infos)", "debug_mode")


func _build_controls(p: VBoxContainer) -> void:
	var lines := [
		["Se déplacer", "%s %s %s %s" % [InputSetup.key_label("move_forward"), InputSetup.key_label("move_left"), InputSetup.key_label("move_back"), InputSetup.key_label("move_right")]],
		["Courir (bruyant !)", "Maj"],
		["Caméra", "Souris"],
		["Interagir / ramasser / lire", InputSetup.key_label("interact")],
		["Viser", "Clic droit"],
		["Tirer / frapper", "Clic gauche"],
		["Recharger", InputSetup.key_label("reload")],
		["Armes", "1 à 5 · molette"],
		["Lampe torche", InputSetup.key_label("flashlight")],
		["Esquive", "Espace"],
		["Soin rapide (spray)", InputSetup.key_label("quick_heal")],
		["Vue 1re / 3e personne", InputSetup.key_label("toggle_view")],
		["Inventaire", "Tab"],
		["Pause", "Échap"],
		["Compteur de performances", "F3"],
	]
	for l in lines:
		var row := HBoxContainer.new()
		var a := UITheme.label(l[0], 18, UITheme.COL_DIM)
		a.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(a)
		row.add_child(UITheme.label(l[1], 18, UITheme.COL_TEXT, UITheme.font_ui_bold()))
		p.add_child(row)
	_hint(p, "Les créatures entendent vos pas quand vous courez et voient la lumière de votre lampe. Visez la tête.")


# --- Lignes ------------------------------------------------------------------

func _row(p: VBoxContainer, label_text: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	var l := UITheme.label(label_text, 18, UITheme.COL_DIM)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(l)
	p.add_child(row)
	return row


## Sélecteur à valeurs discrètes. values : valeurs stockées (par défaut 0..n-1).
func _choice(p: VBoxContainer, label_text: String, key: String, names: Array, values: Array = []) -> void:
	var row := _row(p, label_text)
	var b := UITheme.button("", 18)
	b.alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.custom_minimum_size = Vector2(300, 0)
	row.add_child(b)
	var vals: Array = values if not values.is_empty() else range(names.size())
	var show := func() -> void:
		var cur = Settings.get(key)
		var idx := vals.find(cur)
		if idx < 0 and key == "quality":
			b.text = "◂  %s  ▸" % names[names.size() - 1]
		else:
			b.text = "◂  %s  ▸" % names[maxi(idx, 0)]
	var step := func(dir: int) -> void:
		var idx := vals.find(Settings.get(key))
		idx = (idx + dir + vals.size()) % vals.size() if idx >= 0 else 0
		Settings.set_value(key, vals[idx])
		Audio.ui("ui_move", -10.0)
	b.pressed.connect(step.bind(1))
	b.gui_input.connect(_choice_input.bind(step))
	_refreshers.append(show)
	show.call()


func _choice_input(event: InputEvent, step: Callable) -> void:
	if event.is_action_pressed("ui_left"):
		step.call(-1)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_right"):
		step.call(1)
		get_viewport().set_input_as_handled()


func _slider(p: VBoxContainer, label_text: String, key: String, min_v: float, max_v: float, unit: String) -> void:
	var row := _row(p, label_text)
	var s := HSlider.new()
	s.min_value = min_v
	s.max_value = max_v
	s.step = (max_v - min_v) / 100.0
	s.custom_minimum_size = Vector2(220, 18)
	s.focus_mode = Control.FOCUS_ALL
	row.add_child(s)
	var val := UITheme.label("", 18, UITheme.COL_TEXT)
	val.custom_minimum_size = Vector2(70, 0)
	row.add_child(val)
	var fmt := func(v: float) -> String:
		if unit == "°":
			return "%d°" % int(v)
		return "%d %%" % int(round(v * 100.0)) if max_v <= 3.0 else str(int(v))
	var show := func() -> void:
		s.set_value_no_signal(float(Settings.get(key)))
		val.text = fmt.call(s.value)
	s.value_changed.connect(_slider_changed.bind(key, val, fmt))
	_refreshers.append(show)
	show.call()


func _slider_changed(v: float, key: String, val: Label, fmt: Callable) -> void:
	val.text = fmt.call(v)
	Settings.set_value(key, v)


func _toggle(p: VBoxContainer, label_text: String, key: String) -> void:
	var row := _row(p, label_text)
	var c := CheckButton.new()
	c.focus_mode = Control.FOCUS_ALL
	row.add_child(c)
	var show := func() -> void:
		c.set_pressed_no_signal(bool(Settings.get(key)))
	c.toggled.connect(func(on: bool) -> void:
		Settings.set_value(key, on)
	)
	_refreshers.append(show)
	show.call()


func _hint(p: VBoxContainer, text: String) -> void:
	var t := UITheme.label(text, 15, UITheme.COL_FAINT)
	t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	t.custom_minimum_size = Vector2(780, 0)
	p.add_child(t)

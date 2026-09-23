class_name UIRoot
extends CanvasLayer
## Racine de l'interface : HUD, messages, sous-titres, titres de zone, fondus,
## bandes cinéma, barre du boss, post-traitement, et pile d'écrans modaux.

signal new_game_requested
signal load_requested(slot: int)
signal retry_requested
signal quit_to_menu_requested
signal quit_requested

var root: Control
var hud: HUD
var post: ColorRect
var post_mat: ShaderMaterial
var message_label: Label
var subtitle_label: Label
var zone_label: Label
var autosave_label: Label
var boss_box: VBoxContainer
var boss_bar: ProgressBar
var boss_name: Label
var letterbox_top: ColorRect
var letterbox_bottom: ColorRect
var black: ColorRect
var title_card: VBoxContainer
var title_main: Label
var title_sub: Label

var main_menu: MainMenu
var pause_menu: PauseMenu
var options_menu: OptionsMenu
var inventory: InventoryScreen
var doc_viewer: DocumentViewer
var keypad: KeypadScreen
var elevator_screen: ElevatorScreen
var save_screen: SaveScreen
var death_screen: DeathScreen
var ending_screen: EndingScreen
var debug_console: DebugConsole

var in_game := false
var _stack: Array[UIScreen] = []
var _msg_t := 0.0
var _sub_t := 0.0
var _damage := 0.0
var _letterbox := 0.0
var _letterbox_target := 0.0
var _black_tween: Tween


func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	GameState.ui = self
	# Post-traitement sous l'interface
	var post_layer := CanvasLayer.new()
	post_layer.layer = 1
	add_child(post_layer)
	post = ColorRect.new()
	post.mouse_filter = Control.MOUSE_FILTER_IGNORE
	post_mat = ShaderMaterial.new()
	post_mat.shader = preload("res://materials/shaders/screen_fx.gdshader")
	post.material = post_mat
	post_layer.add_child(post)
	UITheme.fill(post)

	root = Control.new()
	root.theme = UITheme.theme()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	UITheme.fill(root)

	hud = HUD.new()
	hud.visible = false
	root.add_child(hud)

	var perf := PerfOverlay.new()
	root.add_child(perf)

	letterbox_top = _bar()
	letterbox_bottom = _bar()

	message_label = _center_label(21, UITheme.COL_TEXT)
	UITheme.anchor(message_label, 0.5, 1.0, 0, -96, 0, -1)
	subtitle_label = _center_label(24, Color(0.95, 0.93, 0.88))
	subtitle_label.add_theme_font_override("font", UITheme.font_title())
	subtitle_label.add_theme_font_size_override("font_size", 30)
	UITheme.anchor(subtitle_label, 0.5, 1.0, 0, -210, 0, -1)
	zone_label = _center_label(34, UITheme.COL_TEXT)
	zone_label.add_theme_font_override("font", UITheme.font_title())
	UITheme.anchor(zone_label, 0.5, 0.0, 0, 70, 0, 1)
	zone_label.modulate.a = 0.0
	autosave_label = UITheme.label("● SAUVEGARDE AUTOMATIQUE", 14, UITheme.COL_DIM)
	root.add_child(autosave_label)
	UITheme.anchor(autosave_label, 1.0, 0.0, -30, 24, -1, 1)
	autosave_label.modulate.a = 0.0

	boss_box = VBoxContainer.new()
	boss_box.visible = false
	root.add_child(boss_box)
	UITheme.anchor(boss_box, 0.5, 0.0, 0, 34, 0, 1)
	boss_box.custom_minimum_size = Vector2(620, 0)
	boss_name = UITheme.label("", 20, UITheme.COL_TEXT, UITheme.font_title())
	boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	boss_box.add_child(boss_name)
	boss_bar = ProgressBar.new()
	boss_bar.custom_minimum_size = Vector2(620, 10)
	boss_bar.show_percentage = false
	var bb := StyleBoxFlat.new()
	bb.bg_color = Color(0.1, 0.02, 0.02, 0.8)
	var bf := StyleBoxFlat.new()
	bf.bg_color = Color(0.6, 0.06, 0.05)
	boss_bar.add_theme_stylebox_override("background", bb)
	boss_bar.add_theme_stylebox_override("fill", bf)
	boss_box.add_child(boss_bar)

	title_card = VBoxContainer.new()
	title_card.alignment = BoxContainer.ALIGNMENT_CENTER
	title_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(title_card)
	UITheme.fill(title_card)
	title_main = _plain_label(96, Color(0.86, 0.84, 0.8), UITheme.font_title())
	title_card.add_child(title_main)
	title_sub = _plain_label(24, UITheme.COL_ACCENT_HI, UITheme.font_ui())
	title_card.add_child(title_sub)
	title_card.modulate.a = 0.0

	# Écrans
	main_menu = _screen(MainMenu.new())
	pause_menu = _screen(PauseMenu.new())
	options_menu = _screen(OptionsMenu.new())
	inventory = _screen(InventoryScreen.new())
	doc_viewer = _screen(DocumentViewer.new())
	keypad = _screen(KeypadScreen.new())
	elevator_screen = _screen(ElevatorScreen.new())
	save_screen = _screen(SaveScreen.new())
	death_screen = _screen(DeathScreen.new())
	ending_screen = _screen(EndingScreen.new())
	debug_console = _screen(DebugConsole.new())

	black = ColorRect.new()
	black.color = Color(0, 0, 0, 1)
	black.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(black)
	UITheme.fill(black)
	black.modulate.a = 0.0

	GameState.message.connect(show_message)
	Settings.changed.connect(_apply_settings)
	_apply_settings()


func _bar() -> ColorRect:
	var r := ColorRect.new()
	r.color = Color(0, 0, 0, 1)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(r)
	r.anchor_left = 0.0
	r.anchor_right = 1.0
	return r


func _center_label(size: int, color: Color) -> Label:
	var l := UITheme.label("", size, color)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(900, 0)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(l)
	return l


func _plain_label(size: int, color: Color, font: Font) -> Label:
	var l := UITheme.label("", size, color, font)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _screen(s: UIScreen) -> Variant:
	s.ui = self
	root.add_child(s)
	return s


func _apply_settings() -> void:
	post_mat.set_shader_parameter("brightness", Settings.brightness)
	post_mat.set_shader_parameter("grain", 0.06 if Settings.film_grain else 0.0)
	post_mat.set_shader_parameter("aberration", 0.0015 if Settings.chromatic_aberration else 0.0)
	subtitle_label.add_theme_font_size_override("font_size", [24, 30, 38][clampi(Settings.subtitle_size, 0, 2)])
	subtitle_label.visible = Settings.subtitles


# --- Pile d'écrans -----------------------------------------------------------------

func open_screen(s: UIScreen) -> void:
	if not _stack.is_empty() and _stack.back() == s:
		return
	if s in _stack:
		_stack.erase(s)
	for other in _stack:
		other.visible = false
	_stack.append(s)
	s.visible = true
	s.on_open()
	_update_pause()


func close_screen(s: UIScreen) -> void:
	if not s in _stack:
		return
	_stack.erase(s)
	s.visible = false
	s.closed.emit()
	if not _stack.is_empty():
		_stack.back().visible = true
		_stack.back().on_open()
	_update_pause()


func close_all() -> void:
	for s in _stack:
		s.visible = false
	_stack.clear()
	_update_pause()


func top_screen() -> UIScreen:
	return null if _stack.is_empty() else _stack.back()


func _update_pause() -> void:
	var modal := false
	for s in _stack:
		if s.pauses_game:
			modal = true
	if in_game:
		get_tree().paused = modal
	var want_mouse := modal or not in_game
	if DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if want_mouse else Input.MOUSE_MODE_CAPTURED
	hud.visible = in_game and _stack.is_empty()


func _unhandled_input(event: InputEvent) -> void:
	var top := top_screen()
	if top:
		if top.handle_input(event):
			get_viewport().set_input_as_handled()
		return
	if not in_game:
		return
	var p := GameState.player as Player
	if p == null or p.is_dead:
		return
	if event.is_action_pressed("pause"):
		open_screen(pause_menu)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("debug_console") and DebugTools.enabled():
		open_screen(debug_console)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("inventory") and p.controls_enabled:
		open_inventory()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED and DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


# --- API utilisée par le jeu ---------------------------------------------------------

func enter_game() -> void:
	in_game = true
	close_all()
	_update_pause()


func leave_game() -> void:
	in_game = false
	get_tree().paused = false
	close_all()
	hud.visible = false
	boss_box.visible = false
	set_letterbox(false)
	_letterbox = 0.0
	subtitle_label.text = ""
	message_label.text = ""


func show_main_menu() -> void:
	leave_game()
	open_screen(main_menu)


func open_elevator(elevator_id: String, level: int) -> void:
	elevator_screen.open_for(elevator_id, level)
	open_screen(elevator_screen)


func open_inventory() -> void:
	open_screen(inventory)


func open_options() -> void:
	open_screen(options_menu)


func open_load_menu() -> void:
	save_screen.mode = "load"
	open_screen(save_screen)


func open_save_menu() -> void:
	save_screen.mode = "save"
	open_screen(save_screen)


func show_document(doc_id: String, from_inventory: bool = false) -> void:
	doc_viewer.from_inventory = from_inventory
	doc_viewer.show_doc(doc_id)
	open_screen(doc_viewer)
	if not from_inventory:
		show_message("Document ajouté : « %s » (Tab → Documents)" % String(DocumentDB.get_doc(doc_id).title), 3.5)


func open_keypad(safe: Interactable) -> void:
	keypad.safe = safe
	open_screen(keypad)


func show_death() -> void:
	open_screen(death_screen)


func show_ending() -> void:
	hud.visible = false
	open_screen(ending_screen)


func request_new_game() -> void:
	new_game_requested.emit()


func request_load(slot: int) -> void:
	load_requested.emit(slot)


func request_retry() -> void:
	retry_requested.emit()


func request_quit_to_menu() -> void:
	quit_to_menu_requested.emit()


func request_quit() -> void:
	quit_requested.emit()


func show_message(text: String, duration: float = 3.0) -> void:
	message_label.text = text
	message_label.modulate.a = 1.0
	_msg_t = duration


func show_subtitle(text: String, duration: float = 3.5) -> void:
	subtitle_label.text = text
	subtitle_label.modulate.a = 1.0
	_sub_t = duration


func show_zone_title(zone_name: String) -> void:
	zone_label.text = zone_name.to_upper()
	var tw := create_tween()
	tw.tween_property(zone_label, "modulate:a", 1.0, 1.2)
	tw.tween_interval(2.0)
	tw.tween_property(zone_label, "modulate:a", 0.0, 1.5)


func show_autosave() -> void:
	var tw := create_tween()
	tw.tween_property(autosave_label, "modulate:a", 1.0, 0.3)
	tw.tween_interval(1.6)
	tw.tween_property(autosave_label, "modulate:a", 0.0, 0.6)


func show_title_card(main: String, sub: String, duration: float) -> void:
	title_main.text = main
	title_sub.text = sub
	var tw := create_tween()
	tw.tween_property(title_card, "modulate:a", 1.0, 1.2)
	tw.tween_interval(maxf(duration - 2.4, 0.2))
	tw.tween_property(title_card, "modulate:a", 0.0, 1.2)


func set_letterbox(on: bool) -> void:
	_letterbox_target = 1.0 if on else 0.0


func set_black(alpha: float) -> void:
	if _black_tween:
		_black_tween.kill()
	black.modulate.a = alpha


func fade_to_black(t: float) -> void:
	if _black_tween:
		_black_tween.kill()
	_black_tween = create_tween()
	_black_tween.tween_property(black, "modulate:a", 1.0, t)


func fade_from_black(t: float) -> void:
	if _black_tween:
		_black_tween.kill()
	_black_tween = create_tween()
	_black_tween.tween_property(black, "modulate:a", 0.0, t)


func damage_flash(amount: float) -> void:
	_damage = clampf(_damage + amount / 30.0, 0.0, 1.0)


func show_boss_bar(boss_title: String, hp: float, max_hp: float) -> void:
	boss_name.text = boss_title
	boss_bar.max_value = max_hp
	boss_bar.value = hp
	boss_box.visible = true


func update_boss_bar(hp: float, max_hp: float) -> void:
	boss_bar.max_value = max_hp
	var tw := create_tween()
	tw.tween_property(boss_bar, "value", hp, 0.25)


func hide_boss_bar() -> void:
	boss_box.visible = false


func set_countdown(t: float) -> void:
	if hud:
		hud.set_countdown(t)


func _process(delta: float) -> void:
	if _msg_t > 0.0:
		_msg_t -= delta
		if _msg_t < 0.6:
			message_label.modulate.a = maxf(_msg_t / 0.6, 0.0)
	if _sub_t > 0.0:
		_sub_t -= delta
		if _sub_t < 0.5:
			subtitle_label.modulate.a = maxf(_sub_t / 0.5, 0.0)
	# Bandes cinéma
	_letterbox = move_toward(_letterbox, _letterbox_target, delta * 2.0)
	var h := root.size.y * 0.1 * _letterbox
	letterbox_top.offset_top = 0.0
	letterbox_top.offset_bottom = h
	letterbox_bottom.anchor_top = 1.0
	letterbox_bottom.anchor_bottom = 1.0
	letterbox_bottom.offset_top = -h
	letterbox_bottom.offset_bottom = 0.0
	# Post-traitement : dégâts, santé basse
	_damage = maxf(_damage - delta * 1.2, 0.0)
	var low := 0.0
	if in_game and GameState.player:
		low = clampf((35.0 - GameState.hp) / 35.0, 0.0, 1.0)
	post_mat.set_shader_parameter("damage", _damage)
	post_mat.set_shader_parameter("low_health", low)
	post.visible = in_game or top_screen() == main_menu

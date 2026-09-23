class_name MainMenu
extends UIScreen
## Menu principal : BLACKWOOD — NEW GAME / CONTINUE / OPTIONS / QUIT

var title: Label
var buttons: VBoxContainer
var continue_btn: Button
var _t := 0.0


func _init() -> void:
	super._init()
	pauses_game = false
	closable = false


func _ready() -> void:
	super._ready()
	var shade := ColorRect.new()
	shade.color = Color(0, 0, 0, 0.35)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	UITheme.fill(shade)
	var grad := TextureRect.new()
	var g := Gradient.new()
	g.colors = PackedColorArray([Color(0, 0, 0, 0.92), Color(0, 0, 0, 0.0)])
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(1, 0)
	grad.texture = gt
	grad.stretch_mode = TextureRect.STRETCH_SCALE
	grad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(grad)
	grad.anchor_right = 0.6
	grad.anchor_bottom = 1.0

	var col := VBoxContainer.new()
	add_child(col)
	UITheme.anchor(col, 0.0, 0.5, 110, 0, 1, 0)
	col.add_theme_constant_override("separation", 6)
	title = UITheme.label("BLACKWOOD", 104, Color(0.86, 0.84, 0.8), UITheme.font_title())
	title.add_theme_constant_override("outline_size", 0)
	col.add_child(title)
	var sub := UITheme.label("CHAPITRE 1  —  LE SIGNAL", 20, UITheme.COL_ACCENT_HI, UITheme.font_ui())
	col.add_child(sub)
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 40)
	col.add_child(spacer)
	buttons = VBoxContainer.new()
	buttons.add_theme_constant_override("separation", 4)
	buttons.custom_minimum_size = Vector2(320, 0)
	col.add_child(buttons)
	var b_new := UITheme.button("NEW GAME", 30)
	b_new.pressed.connect(func(): ui.request_new_game())
	buttons.add_child(b_new)
	continue_btn = UITheme.button("CONTINUE", 30)
	continue_btn.pressed.connect(func(): ui.open_load_menu())
	buttons.add_child(continue_btn)
	var b_opt := UITheme.button("OPTIONS", 30)
	b_opt.pressed.connect(func(): ui.open_options())
	buttons.add_child(b_opt)
	var b_quit := UITheme.button("QUIT", 30)
	b_quit.pressed.connect(func(): ui.request_quit())
	buttons.add_child(b_quit)

	var footer := UITheme.label("Survival horror — version personnelle 0.1  ·  ZQSD/WASD : se déplacer  ·  Souris : caméra  ·  E : interagir", 14, UITheme.COL_FAINT)
	add_child(footer)
	UITheme.anchor(footer, 0.0, 1.0, 110, -28, 1, -1)


func on_open() -> void:
	continue_btn.disabled = not SaveSystem.has_any()
	focus_first(buttons)


func _process(delta: float) -> void:
	if not visible:
		return
	_t += delta
	# Le titre vacille comme une enseigne fatiguée
	var flick := 1.0
	if fmod(_t, 7.0) < 0.35:
		flick = 0.55 + randf() * 0.45
	title.modulate = Color(1, 1, 1, flick)


func handle_input(event: InputEvent) -> bool:
	return false

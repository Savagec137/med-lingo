class_name UITheme
extends RefCounted
## Identité visuelle de l'interface : polices, couleurs, styles de boutons.

const COL_TEXT := Color(0.86, 0.84, 0.79)
const COL_DIM := Color(0.55, 0.53, 0.5)
const COL_FAINT := Color(0.35, 0.34, 0.32)
const COL_ACCENT := Color(0.62, 0.09, 0.07)
const COL_ACCENT_HI := Color(0.9, 0.22, 0.16)
const COL_PANEL := Color(0.015, 0.015, 0.02, 0.9)
const COL_BORDER := Color(0.4, 0.37, 0.33, 0.55)
const COL_FINE := Color(0.35, 0.8, 0.45)
const COL_CAUTION := Color(0.92, 0.72, 0.2)
const COL_DANGER := Color(0.9, 0.18, 0.12)
const COL_PAPER := Color(0.83, 0.8, 0.71)
const COL_INK := Color(0.12, 0.1, 0.09)

static var _fonts := {}
static var _theme: Theme


static func _font(key: String, path: String, weight: int = 0) -> Font:
	if _fonts.has(key):
		return _fonts[key]
	var base: FontFile = load(path)
	var f: Font = base
	if weight > 0:
		var fv := FontVariation.new()
		fv.base_font = base
		fv.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): weight}
		f = fv
	_fonts[key] = f
	return f


static func font_title() -> Font:
	return _font("title", "res://assets/fonts/CormorantGaramond.ttf", 600)


static func font_title_light() -> Font:
	return _font("title_light", "res://assets/fonts/CormorantGaramond.ttf", 400)


static func font_ui() -> Font:
	return _font("ui", "res://assets/fonts/Oswald.ttf", 400)


static func font_ui_bold() -> Font:
	return _font("ui_bold", "res://assets/fonts/Oswald.ttf", 600)


static func font_typed() -> Font:
	return _font("typed", "res://assets/fonts/SpecialElite-Regular.ttf")


static func font_hand() -> Font:
	return _font("hand", "res://assets/fonts/Caveat.ttf", 500)


static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font = font_ui()
	t.default_font_size = 22
	t.set_color("font_color", "Label", COL_TEXT)
	# Boutons de menu : texte seul, soulignement rouge au survol / focus
	var empty := StyleBoxEmpty.new()
	var hover := StyleBoxFlat.new()
	hover.bg_color = Color(0.5, 0.06, 0.04, 0.18)
	hover.border_color = COL_ACCENT_HI
	hover.border_width_left = 3
	hover.content_margin_left = 14
	hover.content_margin_right = 14
	hover.content_margin_top = 4
	hover.content_margin_bottom = 4
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 4
	normal.content_margin_bottom = 4
	t.set_stylebox("normal", "Button", normal)
	t.set_stylebox("hover", "Button", hover)
	t.set_stylebox("pressed", "Button", hover)
	t.set_stylebox("focus", "Button", hover)
	t.set_stylebox("disabled", "Button", normal)
	t.set_stylebox("hover_pressed", "Button", hover)
	t.set_color("font_color", "Button", COL_TEXT)
	t.set_color("font_hover_color", "Button", Color(1, 0.93, 0.88))
	t.set_color("font_focus_color", "Button", Color(1, 0.93, 0.88))
	t.set_color("font_pressed_color", "Button", COL_ACCENT_HI)
	t.set_color("font_disabled_color", "Button", COL_FAINT)
	t.set_font_size("font_size", "Button", 26)
	# Curseurs (options)
	var slider_bg := StyleBoxFlat.new()
	slider_bg.bg_color = Color(0.25, 0.24, 0.22, 0.8)
	slider_bg.content_margin_top = 2
	slider_bg.content_margin_bottom = 2
	var slider_fill := StyleBoxFlat.new()
	slider_fill.bg_color = COL_ACCENT
	slider_fill.content_margin_top = 2
	slider_fill.content_margin_bottom = 2
	t.set_stylebox("slider", "HSlider", slider_bg)
	t.set_stylebox("grabber_area", "HSlider", slider_fill)
	t.set_stylebox("grabber_area_highlight", "HSlider", slider_fill)
	t.set_icon("grabber", "HSlider", _grabber_icon(COL_TEXT))
	t.set_icon("grabber_highlight", "HSlider", _grabber_icon(COL_ACCENT_HI))
	# Panneaux
	t.set_stylebox("panel", "PanelContainer", panel_style())
	t.set_stylebox("panel", "Panel", panel_style())
	# Défilement
	var sb_bg := StyleBoxFlat.new()
	sb_bg.bg_color = Color(0, 0, 0, 0.2)
	var sb_grab := StyleBoxFlat.new()
	sb_grab.bg_color = Color(0.4, 0.38, 0.35, 0.6)
	t.set_stylebox("scroll", "VScrollBar", sb_bg)
	t.set_stylebox("grabber", "VScrollBar", sb_grab)
	t.set_stylebox("grabber_highlight", "VScrollBar", sb_grab)
	t.set_stylebox("grabber_pressed", "VScrollBar", sb_grab)
	# Cases à cocher
	t.set_color("font_color", "CheckButton", COL_TEXT)
	t.set_color("font_hover_color", "CheckButton", Color(1, 0.93, 0.88))
	t.set_color("font_focus_color", "CheckButton", Color(1, 0.93, 0.88))
	t.set_stylebox("normal", "CheckButton", normal)
	t.set_stylebox("hover", "CheckButton", hover)
	t.set_stylebox("focus", "CheckButton", hover)
	t.set_stylebox("pressed", "CheckButton", hover)
	t.set_stylebox("hover_pressed", "CheckButton", hover)
	_theme = t
	return t


static func panel_style(alpha: float = 0.9) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(COL_PANEL.r, COL_PANEL.g, COL_PANEL.b, alpha)
	sb.border_color = COL_BORDER
	sb.border_width_left = 1
	sb.border_width_right = 1
	sb.border_width_top = 1
	sb.border_width_bottom = 1
	sb.content_margin_left = 22
	sb.content_margin_right = 22
	sb.content_margin_top = 18
	sb.content_margin_bottom = 18
	return sb


static func _grabber_icon(c: Color) -> ImageTexture:
	var img := Image.create(14, 22, false, Image.FORMAT_RGBA8)
	img.fill(c)
	return ImageTexture.create_from_image(img)


static func label(text: String, size: int = 22, color: Color = COL_TEXT, font: Font = null) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if font:
		l.add_theme_font_override("font", font)
	return l


static func button(text: String, size: int = 26) -> Button:
	var b := Button.new()
	b.text = text
	b.flat = false
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.focus_mode = Control.FOCUS_ALL
	b.add_theme_font_size_override("font_size", size)
	b.mouse_entered.connect(_focus_on_hover.bind(b))
	b.focus_entered.connect(_ui_sound.bind("ui_move", -12.0))
	b.pressed.connect(_ui_sound.bind("ui_select", -8.0))
	return b


static func _focus_on_hover(b: Control) -> void:
	if b is BaseButton and (b as BaseButton).disabled:
		return
	b.grab_focus()


static func _ui_sound(sound: String, vol: float) -> void:
	Audio.ui(sound, vol)


## Ancre un contrôle sur un point de son parent (0..1) avec un décalage en pixels.
## gx / gy : sens de croissance (-1 vers la gauche / le haut, 0 centré, 1 vers la droite / le bas).
static func anchor(c: Control, ax: float, ay: float, ox: float, oy: float, gx: int = 1, gy: int = 1) -> void:
	c.anchor_left = ax
	c.anchor_right = ax
	c.anchor_top = ay
	c.anchor_bottom = ay
	c.offset_left = ox
	c.offset_right = ox
	c.offset_top = oy
	c.offset_bottom = oy
	c.grow_horizontal = Control.GROW_DIRECTION_BEGIN if gx < 0 else (Control.GROW_DIRECTION_BOTH if gx == 0 else Control.GROW_DIRECTION_END)
	c.grow_vertical = Control.GROW_DIRECTION_BEGIN if gy < 0 else (Control.GROW_DIRECTION_BOTH if gy == 0 else Control.GROW_DIRECTION_END)


## Remplit tout le parent.
static func fill(c: Control) -> void:
	c.anchor_left = 0.0
	c.anchor_top = 0.0
	c.anchor_right = 1.0
	c.anchor_bottom = 1.0
	c.offset_left = 0.0
	c.offset_top = 0.0
	c.offset_right = 0.0
	c.offset_bottom = 0.0

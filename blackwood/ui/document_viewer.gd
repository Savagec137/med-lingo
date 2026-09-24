class_name DocumentViewer
extends UIScreen
## Lecture d'un document : feuille de papier, police machine à écrire ou manuscrite.

var paper: PanelContainer
var title_label: Label
var body: RichTextLabel
var from_inventory := false
var hint: Label


func _ready() -> void:
	super._ready()
	add_dim(0.8)
	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	paper = PanelContainer.new()
	paper.custom_minimum_size = Vector2(680, 560)
	var st := StyleBoxFlat.new()
	st.bg_color = UITheme.COL_PAPER
	st.content_margin_left = 48
	st.content_margin_right = 48
	st.content_margin_top = 36
	st.content_margin_bottom = 30
	st.shadow_color = Color(0, 0, 0, 0.6)
	st.shadow_size = 18
	paper.add_theme_stylebox_override("panel", st)
	center.add_child(paper)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 16)
	paper.add_child(col)
	title_label = UITheme.label("", 30, Color(0.1, 0.08, 0.07), UITheme.font_typed())
	title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(title_label)
	var line := ColorRect.new()
	line.color = Color(0.35, 0.1, 0.08, 0.6)
	line.custom_minimum_size = Vector2(0, 2)
	col.add_child(line)
	body = RichTextLabel.new()
	body.fit_content = false
	body.scroll_active = true
	body.custom_minimum_size = Vector2(584, 400)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_color_override("default_color", UITheme.COL_INK)
	body.selection_enabled = false
	col.add_child(body)
	hint = UITheme.label("", 14, Color(0.35, 0.3, 0.26))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	col.add_child(hint)
	_update_hint(Pad.using_pad)
	Pad.device_changed.connect(_update_hint)


func _update_hint(using_pad: bool) -> void:
	if using_pad:
		hint.text = "%s / %s : fermer   ·   Stick gauche : faire défiler" % [Pad.button_name(JOY_BUTTON_A), Pad.button_name(JOY_BUTTON_B)]
	else:
		hint.text = "E / Échap : fermer   ·   Molette : faire défiler"


func show_doc(doc_id: String) -> void:
	var d := DocumentDB.get_doc(doc_id)
	title_label.text = String(d.title)
	var hand: bool = d.get("style", "typed") == "hand"
	body.add_theme_font_override("normal_font", UITheme.font_hand() if hand else UITheme.font_typed())
	body.add_theme_font_size_override("normal_font_size", 25 if hand else 18)
	body.text = String(d.body)
	body.scroll_to_line(0)
	title_label.add_theme_font_override("font", UITheme.font_hand() if hand else UITheme.font_typed())
	title_label.add_theme_font_size_override("font_size", 34 if hand else 26)


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("interact") or event.is_action_pressed("pause") or event.is_action_pressed("inventory") or event.is_action_pressed("ui_accept") or event.is_action_pressed("ui_cancel"):
		ui.close_screen(self)
		Audio.ui("paper", -8.0)
		return true
	if event.is_action_pressed("move_back") or event.is_action_pressed("ui_down"):
		body.get_v_scroll_bar().value += 60
		return true
	if event.is_action_pressed("move_forward") or event.is_action_pressed("ui_up"):
		body.get_v_scroll_bar().value -= 60
		return true
	return false

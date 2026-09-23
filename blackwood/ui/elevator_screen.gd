class_name ElevatorScreen
extends UIScreen
## Choix de l'étage : toute la tour est listée (12 étages + 2 sous-sols) ;
## seuls les étages desservis par cet ascenseur sont sélectionnables, et
## certains exigent une carte, une clé ou un événement.

var elevator_id := ""
var level := 0
var title: Label
var list: VBoxContainer
var status: Label


func _ready() -> void:
	super._ready()
	add_dim(0.8)
	var box := centered_vbox(640)
	title = UITheme.label("ASCENSEUR", 34, UITheme.COL_TEXT, UITheme.font_title())
	box.add_child(title)
	status = UITheme.label("", 17, UITheme.COL_CAUTION)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 2)
	box.add_child(list)
	box.add_child(status)
	var back := UITheme.button("FERMER", 22)
	back.pressed.connect(func(): ui.close_screen(self))
	box.add_child(back)


func open_for(p_id: String, p_level: int) -> void:
	elevator_id = p_id
	level = p_level


func on_open() -> void:
	status.text = ""
	for c in list.get_children():
		c.queue_free()
	var e := _def()
	title.text = "%s — %s" % [String(e.get("name", "ASCENSEUR")), HospitalLevel.floor_label(level)]
	var first: Button = null
	for lv in range(12, -3, -1):
		var served: bool = lv in e.get("stops", [])
		var text := "%s   %s" % [HospitalLevel.floor_label(lv).rpad(8), String(HospitalLevel.FLOOR_NAMES.get(lv, ""))]
		var b := UITheme.button(text, 17)
		if lv == level:
			b.text = text + "   ◂ VOUS ÊTES ICI"
			b.disabled = true
		elif not served:
			b.text = text + "   —  " + String(HospitalLevel.FLOOR_CLOSED.get(lv, "NON DESSERVI"))
			b.disabled = true
		else:
			b.pressed.connect(_choose.bind(lv))
			if first == null:
				first = b
		list.add_child(b)
	if first:
		first.grab_focus()


func _def() -> Dictionary:
	var g := GameState.game as Game
	return g.facility.elevators.get(elevator_id, {}) if g and g.facility else {}


func _choose(lv: int) -> void:
	var e := _def()
	var rule: Dictionary = e.get("rules", {}).get(lv, {})
	var ok := true
	if rule.has("flag") and not GameState.get_flag(String(rule.flag)):
		ok = false
	if rule.has("item") and not GameState.has_item(String(rule.item)):
		ok = false
	if not ok:
		status.text = String(rule.get("msg", "Accès refusé."))
		Audio.ui("ui_error", -6.0)
		return
	if rule.has("item") and bool(rule.get("announce", true)):
		GameState.show_message("%s : accès autorisé." % ItemDB.item_name(String(rule.item)), 2.5)
	ui.close_screen(self)
	var g := GameState.game as Game
	if g:
		g.travel_elevator(elevator_id, level, lv)

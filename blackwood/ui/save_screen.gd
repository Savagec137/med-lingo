class_name SaveScreen
extends UIScreen
## Sauvegarde (magnétophone) ou chargement : 3 emplacements manuels
## (+ la sauvegarde automatique en chargement).

var mode := "save"   # « save » ou « load »
var title: Label
var list: VBoxContainer
var confirm_slot := -1
var note: Label


func _ready() -> void:
	super._ready()
	add_dim(0.85)
	var box := centered_vbox(640)
	title = UITheme.label("", 40, UITheme.COL_TEXT, UITheme.font_title())
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	note = UITheme.label("", 16, UITheme.COL_DIM)
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(note)
	list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	box.add_child(list)
	var back := UITheme.button("RETOUR", 24)
	back.alignment = HORIZONTAL_ALIGNMENT_CENTER
	back.pressed.connect(func(): ui.close_screen(self))
	box.add_child(back)


func on_open() -> void:
	confirm_slot = -1
	title.text = "ENREGISTRER UNE NOTE VOCALE" if mode == "save" else "CONTINUER"
	note.text = "Ethan enregistre sa progression sur le magnétophone." if mode == "save" else "Choisissez une sauvegarde."
	_fill()


func _fill() -> void:
	for c in list.get_children():
		c.queue_free()
	var first: Button = null
	var slots := [1, 2, 3] if mode == "save" else [0, 1, 2, 3]
	if mode == "load":
		var latest := SaveSystem.latest_slot()
		if latest > 0:
			slots.erase(latest)
			slots.push_front(latest)
		elif latest == 0:
			pass
	for slot in slots:
		var info := SaveSystem.slot_info(slot)
		var label := ("AUTO" if slot == 0 else "EMPLACEMENT %d" % slot)
		var text := ""
		if info.exists:
			text = "%s   —   %s   ·   %s   ·   %s" % [label, info.zone, info.playtime, info.date]
		else:
			text = "%s   —   vide" % label
		if confirm_slot == slot:
			text = "Écraser « %s » ? Cliquer à nouveau pour confirmer." % label
		var b := UITheme.button(text, 19)
		b.disabled = mode == "load" and not info.exists
		b.pressed.connect(_choose.bind(slot, info.exists))
		list.add_child(b)
		if first == null and not b.disabled:
			first = b
	if first:
		first.grab_focus()


func _choose(slot: int, exists: bool) -> void:
	if mode == "load":
		ui.request_load(slot)
		return
	if exists and confirm_slot != slot:
		confirm_slot = slot
		_fill()
		return
	if GameState.game and GameState.game.save_to_slot(slot):
		Audio.ui("tape_save", -4.0)
		GameState.show_message("Progression enregistrée (emplacement %d)." % slot, 3.0)
	ui.close_screen(self)

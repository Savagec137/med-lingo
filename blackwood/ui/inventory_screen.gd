class_name InventoryScreen
extends UIScreen
## Inventaire : 6 emplacements (objets) + onglet DOCUMENTS.
## Navigation souris ou clavier (flèches / ZQSD, E pour utiliser, Tab pour fermer).

var tab := 0
var selected := 0
var slot_panels: Array[PanelContainer] = []
var slot_icons: Array[ItemIcon] = []
var slot_counts: Array[Label] = []
var name_label: Label
var desc_label: Label
var use_btn: Button
var tab_items: Button
var tab_docs: Button
var items_view: Control
var docs_view: VBoxContainer
var docs_list: VBoxContainer
var status_label: Label
var ecg: ECGDisplay
var info_label: Label
var objective_label: Label
var _style_normal: StyleBoxFlat
var _style_sel: StyleBoxFlat


func _ready() -> void:
	super._ready()
	add_dim(0.86)
	_style_normal = StyleBoxFlat.new()
	_style_normal.bg_color = Color(0.06, 0.06, 0.07, 0.95)
	_style_normal.border_color = Color(0.3, 0.29, 0.27)
	_style_normal.set_border_width_all(1)
	_style_sel = _style_normal.duplicate()
	_style_sel.border_color = UITheme.COL_ACCENT_HI
	_style_sel.set_border_width_all(2)
	_style_sel.bg_color = Color(0.16, 0.04, 0.03, 0.95)

	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	var root := VBoxContainer.new()
	root.custom_minimum_size = Vector2(900, 540)
	root.add_theme_constant_override("separation", 14)
	center.add_child(root)
	# En-tête et onglets
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 18)
	root.add_child(head)
	head.add_child(UITheme.label("INVENTAIRE", 40, UITheme.COL_TEXT, UITheme.font_title()))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(spacer)
	tab_items = UITheme.button("OBJETS", 22)
	tab_items.pressed.connect(func(): _set_tab(0))
	head.add_child(tab_items)
	tab_docs = UITheme.button("DOCUMENTS", 22)
	tab_docs.pressed.connect(func(): _set_tab(1))
	head.add_child(tab_docs)

	# Vue objets
	items_view = HBoxContainer.new()
	items_view.add_theme_constant_override("separation", 30)
	items_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(items_view)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	items_view.add_child(grid)
	for i in GameState.INVENTORY_SLOTS:
		var p := PanelContainer.new()
		p.custom_minimum_size = Vector2(124, 124)
		p.add_theme_stylebox_override("panel", _style_normal)
		p.mouse_filter = Control.MOUSE_FILTER_STOP
		p.gui_input.connect(_on_slot_input.bind(i))
		var stack := Control.new()
		p.add_child(stack)
		var icon := ItemIcon.new()
		stack.add_child(icon)
		UITheme.fill(icon)
		var count := UITheme.label("", 18, UITheme.COL_TEXT, UITheme.font_ui_bold())
		stack.add_child(count)
		UITheme.anchor(count, 1.0, 1.0, -6, -2, -1, -1)
		grid.add_child(p)
		slot_panels.append(p)
		slot_icons.append(icon)
		slot_counts.append(count)
	var detail := VBoxContainer.new()
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail.add_theme_constant_override("separation", 10)
	items_view.add_child(detail)
	name_label = UITheme.label("", 30, UITheme.COL_TEXT, UITheme.font_title())
	detail.add_child(name_label)
	desc_label = UITheme.label("", 19, UITheme.COL_DIM)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.custom_minimum_size = Vector2(380, 90)
	detail.add_child(desc_label)
	use_btn = UITheme.button("UTILISER", 24)
	use_btn.pressed.connect(_use_selected)
	detail.add_child(use_btn)

	# Vue documents
	docs_view = VBoxContainer.new()
	docs_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	docs_view.visible = false
	root.add_child(docs_view)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 330)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	docs_view.add_child(scroll)
	docs_list = VBoxContainer.new()
	docs_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(docs_list)

	# Bandeau d'état
	var status := HBoxContainer.new()
	status.add_theme_constant_override("separation", 24)
	root.add_child(status)
	var hb := VBoxContainer.new()
	status.add_child(hb)
	status_label = UITheme.label("", 20, UITheme.COL_FINE, UITheme.font_ui_bold())
	hb.add_child(status_label)
	ecg = ECGDisplay.new()
	hb.add_child(ecg)
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status.add_child(info)
	info_label = UITheme.label("", 17, UITheme.COL_DIM)
	info.add_child(info_label)
	objective_label = UITheme.label("", 17, UITheme.COL_TEXT)
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(560, 0)
	info.add_child(objective_label)
	var hint := UITheme.label("Tab : fermer   ·   E / Entrée : utiliser   ·   Flèches : naviguer", 14, UITheme.COL_FAINT)
	root.add_child(hint)
	GameState.inventory_changed.connect(_refresh)


func on_open() -> void:
	_set_tab(tab)
	_refresh()
	Audio.ui("inventory_open", -6.0)


func _set_tab(t: int) -> void:
	tab = t
	items_view.visible = tab == 0
	docs_view.visible = tab == 1
	tab_items.add_theme_color_override("font_color", UITheme.COL_ACCENT_HI if tab == 0 else UITheme.COL_DIM)
	tab_docs.add_theme_color_override("font_color", UITheme.COL_ACCENT_HI if tab == 1 else UITheme.COL_DIM)
	if tab == 1:
		_fill_docs()
	_refresh()


func _fill_docs() -> void:
	for c in docs_list.get_children():
		c.queue_free()
	if GameState.documents.is_empty():
		docs_list.add_child(UITheme.label("Aucun document.", 19, UITheme.COL_DIM))
		return
	for id in GameState.documents:
		var d := DocumentDB.get_doc(id)
		var b := UITheme.button("  " + String(d.title), 22)
		b.pressed.connect(func(): ui.show_document(id, true))
		docs_list.add_child(b)
	await get_tree().process_frame
	focus_first(docs_list)


func _refresh() -> void:
	if not is_inside_tree():
		return
	for i in slot_panels.size():
		var slot: Dictionary = GameState.inventory[i]
		slot_icons[i].set_icon(ItemDB.get_item(slot.id).get("icon", "") if slot.id != "" else "")
		slot_counts[i].text = str(slot.count) if slot.id != "" and ItemDB.max_stack(slot.id) > 1 else ""
		slot_panels[i].add_theme_stylebox_override("panel", _style_sel if i == selected else _style_normal)
	var sel: Dictionary = GameState.inventory[selected]
	if sel.id == "":
		name_label.text = "—"
		desc_label.text = "Emplacement vide."
		use_btn.visible = false
	else:
		var item := ItemDB.get_item(sel.id)
		name_label.text = String(item.name) + ("  x%d" % sel.count if ItemDB.max_stack(sel.id) > 1 else "")
		var extra := ""
		match String(item.kind):
			"key":
				extra = "\n\nS'utilise automatiquement au bon endroit."
			"ammo":
				extra = "\n\nArmes : " + _ammo_users(sel.id)
		desc_label.text = String(item.desc) + extra
		use_btn.visible = String(item.kind) == "heal"
		use_btn.text = "UTILISER"
	var status := GameState.health_status()
	status_label.text = "ÉTAT : " + {"fine": "BON", "caution": "ATTENTION", "danger": "DANGER"}[status] + "   (%d PV)" % int(ceil(GameState.hp))
	status_label.add_theme_color_override("font_color", UITheme.COL_FINE if status == "fine" else (UITheme.COL_CAUTION if status == "caution" else UITheme.COL_DANGER))
	var lamp := "Lampe torche : %d %%" % int(GameState.flashlight_battery) if GameState.get_flag("has_flashlight") else "Pas de lampe torche"
	info_label.text = lamp + "   ·   Documents : %d" % GameState.documents.size()
	objective_label.text = "Objectif : " + GameState.objective()


func _on_slot_input(event: InputEvent, i: int) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		selected = i
		_refresh()
		Audio.ui("ui_move", -12.0)
		if event.double_click:
			_use_selected()


func _use_selected() -> void:
	var sel: Dictionary = GameState.inventory[selected]
	if sel.id == "":
		return
	match ItemDB.kind(sel.id):
		"heal":
			var p := GameState.player as Player
			if p and p.use_heal():
				_refresh()
		_:
			pass


func _ammo_users(ammo: String) -> String:
	var names: Array = []
	for w in WeaponDB.ORDER:
		if String(WeaponDB.get_weapon(w).get("ammo", "")) == ammo:
			names.append(String(WeaponDB.get_weapon(w).name))
	return ", ".join(names)


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("inventory") or event.is_action_pressed("pause"):
		ui.close_screen(self)
		Audio.ui("inventory_close", -6.0)
		return true
	if tab == 0:
		var moved := false
		if event.is_action_pressed("move_right") or event.is_action_pressed("ui_right"):
			selected = (selected + 1) % GameState.INVENTORY_SLOTS
			moved = true
		elif event.is_action_pressed("move_left") or event.is_action_pressed("ui_left"):
			selected = (selected + GameState.INVENTORY_SLOTS - 1) % GameState.INVENTORY_SLOTS
			moved = true
		elif event.is_action_pressed("move_back") or event.is_action_pressed("ui_down"):
			selected = (selected + 3) % GameState.INVENTORY_SLOTS
			moved = true
		elif event.is_action_pressed("move_forward") or event.is_action_pressed("ui_up"):
			selected = (selected + 3) % GameState.INVENTORY_SLOTS
			moved = true
		elif event.is_action_pressed("interact") or event.is_action_pressed("ui_accept"):
			_use_selected()
			return true
		if moved:
			Audio.ui("ui_move", -12.0)
			_refresh()
			return true
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_1:
			_set_tab(0)
			return true
		if event.physical_keycode == KEY_2:
			_set_tab(1)
			return true
	return false

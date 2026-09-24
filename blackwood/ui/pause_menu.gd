class_name PauseMenu
extends UIScreen
## Pause : RESUME / INVENTORY / OPTIONS / QUIT TO MENU

var box: VBoxContainer
var objective: Label
var confirm: VBoxContainer


func _ready() -> void:
	super._ready()
	add_dim(0.72)
	box = centered_vbox(460)
	var t := UITheme.label("PAUSE", 56, UITheme.COL_TEXT, UITheme.font_title())
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(t)
	objective = UITheme.label("", 17, UITheme.COL_DIM)
	objective.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(objective)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 16)
	box.add_child(sp)
	for entry in [["RESUME", "_resume"], ["INVENTORY", "_inventory"], ["OPTIONS", "_options"], ["QUIT TO MENU", "_quit"]]:
		var b := UITheme.button(entry[0], 28)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.pressed.connect(Callable(self, entry[1]))
		box.add_child(b)
	confirm = VBoxContainer.new()
	confirm.visible = false
	box.add_child(confirm)
	var warn := UITheme.label("Revenir au menu ? La progression depuis la dernière sauvegarde sera perdue.", 17, UITheme.COL_CAUTION)
	warn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	warn.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	confirm.add_child(warn)
	var yes := UITheme.button("OUI, QUITTER", 22)
	yes.alignment = HORIZONTAL_ALIGNMENT_CENTER
	yes.pressed.connect(func(): ui.request_quit_to_menu())
	confirm.add_child(yes)
	var no := UITheme.button("ANNULER", 22)
	no.alignment = HORIZONTAL_ALIGNMENT_CENTER
	no.pressed.connect(func():
		confirm.visible = false
		focus_first(box)
	)
	confirm.add_child(no)


func on_open() -> void:
	confirm.visible = false
	objective.text = "Objectif : " + GameState.objective()
	if Net.active:
		objective.text += "\nCO-OP — vous êtes le joueur %d (%s) · %d joueur(s). Le jeu n'est pas en pause." % [
			GameState.local_slot, "hôte" if Net.is_server() else "invité", Net.player_count()]
		(confirm.get_child(0) as Label).text = "Quitter la session ? " + ("Votre partenaire sera renvoyé au menu ; la progression depuis la dernière sauvegarde sera perdue." if Net.is_server() else "L'hôte continue sans vous ; vous pourrez revenir.")
	else:
		(confirm.get_child(0) as Label).text = "Revenir au menu ? La progression depuis la dernière sauvegarde sera perdue."
	focus_first(box)


func _resume() -> void:
	ui.close_screen(self)


func _inventory() -> void:
	ui.close_screen(self)
	ui.open_inventory()


func _options() -> void:
	ui.open_options()


func _quit() -> void:
	confirm.visible = true
	focus_first(confirm)


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("ui_cancel") and confirm.visible:
		confirm.visible = false
		focus_first(box)
		return true
	if event.is_action_pressed("pause") or event.is_action_pressed("ui_cancel"):
		ui.close_screen(self)
		return true
	if event.is_action_pressed("inventory"):
		_inventory()
		return true
	return false

class_name UIScreen
extends Control
## Écran modal (menus, inventaire, documents…). Géré en pile par UIRoot.

signal closed

var ui: Node
## Met le jeu en pause tant que l'écran est ouvert.
var pauses_game := true
## Échap / Tab (manette : B, MENU, VUE) ferment l'écran.
var closable := true


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = UITheme.theme()
	visible = false


func _ready() -> void:
	UITheme.fill(self)


## Appelé à chaque ouverture (rafraîchir le contenu).
func on_open() -> void:
	pass


## Retourne true si l'évènement a été consommé.
func handle_input(event: InputEvent) -> bool:
	if closable and (event.is_action_pressed("pause") or event.is_action_pressed("inventory") or event.is_action_pressed("ui_cancel")):
		ui.close_screen(self)
		return true
	return false


## Donne le focus clavier au premier bouton actif.
func focus_first(container: Node) -> void:
	for c in container.get_children():
		if c is BaseButton and not (c as BaseButton).disabled and (c as Control).visible:
			(c as Control).grab_focus()
			return
		if c.get_child_count() > 0:
			var before := get_viewport().gui_get_focus_owner() if get_viewport() else null
			focus_first(c)
			if get_viewport() and get_viewport().gui_get_focus_owner() != before:
				return


## Fond assombri plein écran.
func add_dim(alpha: float = 0.82) -> ColorRect:
	var r := ColorRect.new()
	r.color = Color(0, 0, 0, alpha)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(r)
	UITheme.fill(r)
	return r


func centered_vbox(width: float = 520.0) -> VBoxContainer:
	var center := CenterContainer.new()
	add_child(center)
	UITheme.fill(center)
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(width, 0)
	box.add_theme_constant_override("separation", 10)
	center.add_child(box)
	return box

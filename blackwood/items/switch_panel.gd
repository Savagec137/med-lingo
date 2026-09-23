class_name SwitchPanel
extends Interactable
## Commande murale à levier (procédure de démarrage du groupe électrogène).
## L'ordre des manœuvres est vérifié par le directeur d'événements.

signal switched(panel: SwitchPanel)

var switch_id := ""
var label_text := ""
var is_on := false
var locked := false
var _lever: Node3D
var _led: StandardMaterial3D


func _ready() -> void:
	interact_radius = 1.6
	focus_offset = Vector3(0, 1.3, 0.14)
	ItemModels._box(self, Vector3(0.46, 0.62, 0.12), Vector3(0, 1.3, 0.06), "metal_gray")
	ItemModels._box(self, Vector3(0.42, 0.11, 0.01), Vector3(0, 1.54, 0.125), "metal_yellow")
	var lbl := Label3D.new()
	lbl.text = label_text
	lbl.font = UITheme.font_ui_bold()
	lbl.font_size = 40
	lbl.pixel_size = 0.0022
	lbl.modulate = Color(0.08, 0.07, 0.03)
	lbl.shaded = true
	lbl.position = Vector3(0, 1.54, 0.132)
	add_child(lbl)
	_lever = Node3D.new()
	_lever.position = Vector3(0, 1.25, 0.13)
	add_child(_lever)
	ItemModels._box(_lever, Vector3(0.05, 0.26, 0.05), Vector3(0, 0.12, 0.03), "metal_steel")
	ItemModels._box(_lever, Vector3(0.12, 0.05, 0.06), Vector3(0, 0.26, 0.03), "plastic_orange")
	var led_mesh := ItemModels._box(self, Vector3(0.035, 0.035, 0.01), Vector3(0.16, 1.1, 0.125), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.emission_enabled = true
	_led.emission_energy_multiplier = 4.0
	led_mesh.material_override = _led
	_apply(false)


func set_on(on: bool, animate: bool = true) -> void:
	is_on = on
	_apply(animate)


func _apply(animate: bool) -> void:
	var target := -1.1 if is_on else 0.0
	if animate and is_inside_tree():
		var tw := create_tween()
		tw.tween_property(_lever, "rotation:x", target, 0.18)
	else:
		_lever.rotation.x = target
	_led.emission = Color(0.1, 1.0, 0.3) if is_on else Color(1.0, 0.2, 0.05)
	_led.albedo_color = Color(0.02, 0.3, 0.05) if is_on else Color(0.3, 0.04, 0.02)


func get_prompt() -> String:
	return "%s — EN SERVICE" % label_text if is_on else "ACTIONNER : %s" % label_text


func can_interact() -> bool:
	return enabled and not locked and not is_on and is_visible_in_tree()


func interact(_player: Node) -> void:
	Audio.play_3d("breaker", global_position + focus_offset, -2.0, 0.03, 16.0, 3.0)
	switched.emit(self)

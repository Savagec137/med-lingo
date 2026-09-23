class_name BreakerPanel
extends Interactable
## Disjoncteur mural de la salle du générateur. Envoie une décharge dans
## l'eau qui inonde le sol : c'est l'arme principale contre le Chirurgien.

signal triggered(panel: BreakerPanel)

const RECHARGE := 12.0

var timer := 0.0
var _lever: Node3D
var _led: StandardMaterial3D


func _ready() -> void:
	interact_radius = 1.6
	focus_offset = Vector3(0, 1.35, 0.15)
	ItemModels._box(self, Vector3(0.6, 0.9, 0.2), Vector3(0, 1.35, 0.1), "metal_yellow")
	ItemModels._box(self, Vector3(0.5, 0.12, 0.01), Vector3(0, 1.72, 0.205), "black")
	_lever = Node3D.new()
	_lever.position = Vector3(0, 1.3, 0.22)
	add_child(_lever)
	ItemModels._box(_lever, Vector3(0.05, 0.3, 0.05), Vector3(0, 0.15, 0.03), "metal_steel")
	ItemModels._box(_lever, Vector3(0.14, 0.05, 0.06), Vector3(0, 0.3, 0.03), "plastic_orange")
	var led_mesh := ItemModels._box(self, Vector3(0.04, 0.04, 0.01), Vector3(0.2, 1.62, 0.205), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.emission_enabled = true
	_led.emission_energy_multiplier = 4.0
	led_mesh.material_override = _led
	var lbl := Label3D.new()
	lbl.text = "DISJONCTEUR\n! DANGER !"
	lbl.font = UITheme.font_ui_bold()
	lbl.font_size = 40
	lbl.pixel_size = 0.0028
	lbl.modulate = Color(0.1, 0.08, 0.02)
	lbl.shaded = true
	lbl.position = Vector3(0, 1.72, 0.21)
	add_child(lbl)
	_update_led()


func is_ready() -> bool:
	return timer <= 0.0


func get_prompt() -> String:
	return "ACTIVER LE DISJONCTEUR" if is_ready() else "RÉARMEMENT EN COURS…"


func interact(_player: Node) -> void:
	if not is_ready():
		GameState.show_message("Le disjoncteur se réarme…", 1.5)
		return
	timer = RECHARGE
	Audio.play_3d("breaker", global_position + focus_offset, 2.0, 0.02, 20.0, 4.0)
	var tw := create_tween()
	tw.tween_property(_lever, "rotation:x", 1.2, 0.12)
	tw.tween_property(_lever, "rotation:x", 0.0, 0.6).set_delay(RECHARGE - 0.8)
	_update_led()
	triggered.emit(self)


func _process(delta: float) -> void:
	if timer > 0.0:
		timer -= delta
		if timer <= 0.0:
			Audio.play_3d("relay_click", global_position + focus_offset, -4.0, 0.02, 10.0, 2.0)
		_update_led()


func _update_led() -> void:
	var ok := is_ready()
	_led.emission = Color(0.1, 1.0, 0.3) if ok else Color(1.0, 0.25, 0.05)
	_led.albedo_color = Color(0.02, 0.3, 0.05) if ok else Color(0.3, 0.05, 0.02)

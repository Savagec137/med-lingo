class_name ElevatorPanel
extends Interactable
## Panneau d'appel d'ascenseur : ouvre la liste des étages desservis.

var elevator_id := ""
var level := 0
var _led: MeshInstance3D


func _ready() -> void:
	prompt_text = "APPELER L'ASCENSEUR"
	interact_radius = 1.6
	focus_offset = Vector3.ZERO
	var plate := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(0.14, 0.26, 0.03)
	plate.mesh = b
	plate.material_override = Mats.get_mat("metal_steel")
	add_child(plate)
	for i in 2:
		var btn := MeshInstance3D.new()
		var c := CylinderMesh.new()
		c.top_radius = 0.022
		c.bottom_radius = 0.022
		c.height = 0.015
		btn.mesh = c
		btn.rotation.x = PI / 2.0
		btn.position = Vector3(0, 0.05 - i * 0.1, 0.02)
		btn.material_override = Mats.get_mat("emit_amber")
		add_child(btn)
		if i == 0:
			_led = btn


func get_prompt() -> String:
	var e: Dictionary = _def()
	if e.is_empty():
		return prompt_text
	return "APPELER — %s" % String(e.get("short", "ASCENSEUR"))


func _def() -> Dictionary:
	var g := GameState.game as Game
	return g.facility.elevators.get(elevator_id, {}) if g and g.facility else {}


func interact(player: Node) -> void:
	var e := _def()
	if GameState.get_flag("self_destruct") and elevator_id != "freight":
		Audio.play_3d("ui_error", global_position, -6.0, 0.0, 6.0, 1.0)
		GameState.show_message("ÉVACUATION : ascenseurs verrouillés. Seul le monte-charge descend encore.", 3.0)
		return
	var power := String(e.get("power_flag", ""))
	if power != "" and not GameState.get_flag(power):
		Audio.play_3d("ui_error", global_position, -6.0, 0.0, 6.0, 1.0)
		GameState.show_message(String(e.get("no_power_msg", "Aucune réaction. L'ascenseur n'est pas alimenté.")), 3.0)
		return
	Audio.play_3d("keypad_beep", global_position, -6.0, 0.05, 6.0, 1.0)
	if GameState.open_remote_ui(player, "elevator", [elevator_id, level]):
		return
	if GameState.ui:
		GameState.ui.open_elevator(elevator_id, level)

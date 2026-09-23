class_name CodePanel
extends Interactable
## Clavier à code mural qui déverrouille une porte (escalier de service B…).
## Même écran de saisie que les coffres (KeypadScreen), longueur libre.

var code := "0000"
var panel_id := ""
var title := "CLAVIER D'ACCÈS"
var success_msg := "Un déclic. La porte est déverrouillée."
var door_id := ""
var done_flag := ""
var _led: StandardMaterial3D


func _ready() -> void:
	prompt_text = "SAISIR LE CODE"
	interact_radius = 1.6
	focus_offset = Vector3.ZERO
	ItemModels._box(self, Vector3(0.17, 0.24, 0.04), Vector3(0, 0, 0.02), "metal_steel")
	var scr := ItemModels._box(self, Vector3(0.12, 0.035, 0.005), Vector3(0, 0.08, 0.043), "screen_off")
	scr.material_override = Mats.screen(3, Color(0.3, 1.0, 0.4))
	for r in 4:
		for c in 3:
			ItemModels._box(self, Vector3(0.03, 0.025, 0.01), Vector3(-0.04 + c * 0.04, 0.03 - r * 0.033, 0.045), "plastic_dark")
	var led_mesh := ItemModels._box(self, Vector3(0.015, 0.015, 0.01), Vector3(0.065, 0.1, 0.045), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.emission_enabled = true
	_led.emission_energy_multiplier = 4.0
	led_mesh.material_override = _led
	_update_led()
	add_to_group("net_refresh")


func net_refresh() -> void:
	_update_led()


func is_open() -> bool:
	return done_flag != "" and GameState.get_flag(done_flag)


func _update_led() -> void:
	var ok := is_open()
	_led.emission = Color(0.1, 1.0, 0.3) if ok else Color(1.0, 0.1, 0.05)
	_led.albedo_color = Color(0.02, 0.3, 0.05) if ok else Color(0.3, 0.02, 0.02)


func get_prompt() -> String:
	return "DÉVERROUILLÉ" if is_open() else "SAISIR LE CODE"


func can_interact() -> bool:
	return enabled and not is_open() and is_shown()


func interact(player: Node) -> void:
	if GameState.open_remote_ui(player, "keypad", [net_key]):
		return
	if GameState.ui:
		GameState.ui.open_keypad(self)


## Appelé par l'écran du clavier. Retourne true si le code est bon.
func try_code(entry: String) -> bool:
	if entry != code:
		Audio.play_3d("keypad_error", global_position, -2.0, 0.0, 10.0, 2.0)
		return false
	if done_flag != "":
		GameState.set_flag(done_flag, true)
	_update_led()
	Audio.play_3d("keypad_success", global_position, -2.0, 0.0, 10.0, 2.0)
	var g := GameState.game as Game
	if g and g.facility and g.facility.doors.has(door_id):
		var d: Door = g.facility.doors[door_id]
		d.unlock()
		Audio.play_3d("door_unlock", d.global_position + Vector3.UP, 0.0, 0.03, 12.0, 3.0)
	return true

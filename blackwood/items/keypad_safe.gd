class_name KeypadSafe
extends Interactable
## Coffre mural à code (bureau du Dr Vance…). Le code peut avoir 3 ou 4 chiffres.

signal opened

var code := "314"
var safe_id := "archives_safe"
var title := "COFFRE"
var success_msg := "Le coffre s'ouvre dans un déclic lourd."
## Drapeau posé à l'ouverture (état sauvegardé).
var open_flag := "safe_open"
## Contenu : [{item, count, id}] ou [{doc, id}]
var contents: Array = []
var is_open := false
var _door_pivot: Node3D
var _led: StandardMaterial3D
var _content_root: Node3D


func _ready() -> void:
	prompt_text = "EXAMINER LE COFFRE"
	interact_radius = 1.6
	focus_offset = Vector3(0, 0.0, 0.25)
	# Caisson (encastré dans le mur, face vers +Z local)
	ItemModels._box(self, Vector3(0.62, 0.62, 0.05), Vector3(0, 0, -0.27), "metal_dark")
	ItemModels._box(self, Vector3(0.05, 0.62, 0.5), Vector3(-0.285, 0, -0.03), "metal_dark")
	ItemModels._box(self, Vector3(0.05, 0.62, 0.5), Vector3(0.285, 0, -0.03), "metal_dark")
	ItemModels._box(self, Vector3(0.62, 0.05, 0.5), Vector3(0, 0.285, -0.03), "metal_dark")
	ItemModels._box(self, Vector3(0.62, 0.05, 0.5), Vector3(0, -0.285, -0.03), "metal_dark")
	# Porte pivotante avec clavier
	_door_pivot = Node3D.new()
	_door_pivot.position = Vector3(-0.29, 0, 0.23)
	add_child(_door_pivot)
	var door := ItemModels._box(_door_pivot, Vector3(0.58, 0.58, 0.05), Vector3(0.29, 0, 0), "metal_gray")
	door.name = "SafeDoor"
	ItemModels._box(_door_pivot, Vector3(0.16, 0.2, 0.012), Vector3(0.29, 0.08, 0.03), "plastic_dark")
	var screen := ItemModels._box(_door_pivot, Vector3(0.12, 0.035, 0.005), Vector3(0.29, 0.15, 0.037), "screen_off")
	screen.material_override = Mats.screen(3, Color(0.3, 1.0, 0.4))
	var led_mesh := ItemModels._box(_door_pivot, Vector3(0.02, 0.02, 0.01), Vector3(0.42, 0.15, 0.03), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.emission_enabled = true
	_led.emission = Color(1.0, 0.1, 0.05)
	_led.emission_energy_multiplier = 3.0
	_led.albedo_color = Color(0.3, 0.02, 0.02)
	led_mesh.material_override = _led
	ItemModels._cyl(_door_pivot, 0.035, 0.03, Vector3(0.44, -0.08, 0.035), "metal_steel", Vector3(PI / 2.0, 0, 0))
	_content_root = Node3D.new()
	_content_root.position = Vector3(0, -0.25, -0.05)
	add_child(_content_root)
	if GameState.get_flag(open_flag):
		is_open = true
		_door_pivot.rotation.y = -1.9
		_set_led(true)
		_spawn_contents()
	add_to_group("net_refresh")


## Invité : ouvert chez l'hôte (bon code saisi par l'un des joueurs).
func net_refresh() -> void:
	if not is_open and GameState.get_flag(open_flag):
		open_safe()


func get_prompt() -> String:
	return "EXAMINER" if is_open else "SAISIR LE CODE"


func can_interact() -> bool:
	return enabled and not is_open


func interact(player: Node) -> void:
	if GameState.open_remote_ui(player, "keypad", [net_key]):
		return
	if GameState.ui:
		GameState.ui.open_keypad(self)


## Appelé par l'écran du clavier. Retourne true si le code est bon.
func try_code(entry: String) -> bool:
	if entry == code:
		open_safe()
		return true
	Audio.play_3d("keypad_error", global_position, -2.0, 0.0, 10.0, 2.0)
	return false


func open_safe() -> void:
	if is_open:
		return
	is_open = true
	GameState.set_flag(open_flag, true)
	_set_led(true)
	Audio.play_3d("keypad_success", global_position, -2.0, 0.0, 10.0, 2.0)
	Audio.play_3d("safe_open", global_position, 0.0, 0.0, 14.0, 3.0)
	var tw := create_tween()
	tw.tween_interval(0.6)
	tw.tween_property(_door_pivot, "rotation:y", -1.9, 1.4).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	_spawn_contents()
	opened.emit()


func _set_led(ok: bool) -> void:
	_led.emission = Color(0.1, 1.0, 0.3) if ok else Color(1.0, 0.1, 0.05)
	_led.albedo_color = Color(0.02, 0.3, 0.05) if ok else Color(0.3, 0.02, 0.02)


func _spawn_contents() -> void:
	var x := -0.18
	for c in contents:
		var node: Interactable
		if c.has("doc"):
			var d := DocumentPickup.new()
			d.doc_id = c.doc
			d.model_kind = "folder"
			node = d
		else:
			var p := Pickup.new()
			p.item_id = c.item
			p.count = int(c.get("count", 1))
			p.pickup_id = c.id
			node = p
		node.interact_radius = 1.5
		_content_root.add_child(node)
		node.position = Vector3(x, 0.0, 0.0)
		node.rotation.y = randf_range(-0.3, 0.3)
		x += 0.18

class_name Mechanism
extends Interactable
## Mécanismes qui débloquent une porte à l'aide d'un objet :
##   « fuse »   : boîtier électrique (fusible) — porte des laboratoires
##   « card »   : lecteur de carte magnétique — accès au niveau B
## « porte nécessitant un objet » : l'objet s'utilise sur le mécanisme.

var kind := "fuse"
var required_item := ""
var target_door: Door
var done_flag := ""
var idle_text := ""
var done_text := ""
var success_text := ""
var _led: StandardMaterial3D
var _cover: Node3D


func _ready() -> void:
	interact_radius = 1.5
	focus_offset = Vector3(0, 1.3, 0.1)
	if kind == "fuse":
		ItemModels._box(self, Vector3(0.5, 0.7, 0.16), Vector3(0, 1.3, 0.08), "metal_gray")
		_cover = Node3D.new()
		_cover.position = Vector3(-0.25, 1.3, 0.17)
		add_child(_cover)
		ItemModels._box(_cover, Vector3(0.5, 0.7, 0.02), Vector3(0.25, 0, 0), "metal_gray")
		var sticker := ItemModels._box(_cover, Vector3(0.18, 0.12, 0.005), Vector3(0.25, 0.18, 0.012), "metal_yellow")
		sticker.name = "Warning"
		_cover.rotation.y = -1.2
		ItemModels._box(self, Vector3(0.36, 0.5, 0.02), Vector3(0, 1.3, 0.155), "plastic_dark")
		for i in 3:
			ItemModels._cyl(self, 0.022, 0.1, Vector3(-0.1 + i * 0.1, 1.38, 0.17), "plastic_white", Vector3(0, 0, PI / 2.0 * 0))
		var cable := ItemModels._box(self, Vector3(0.06, 1.0, 0.06), Vector3(0.1, 1.95, 0.05), "rubber")
		cable.name = "Cable"
	else:
		ItemModels._box(self, Vector3(0.12, 0.2, 0.04), Vector3(0, 1.3, 0.02), "plastic_dark")
		ItemModels._box(self, Vector3(0.08, 0.012, 0.03), Vector3(0, 1.26, 0.045), "metal_dark")
		var scr := ItemModels._box(self, Vector3(0.08, 0.04, 0.005), Vector3(0, 1.36, 0.042), "screen_off")
		scr.material_override = Mats.screen(3, Color(1.0, 0.2, 0.1))
	var led_mesh := ItemModels._box(self, Vector3(0.02, 0.02, 0.01), Vector3(0.0 if kind == "card" else 0.2, 1.42 if kind == "card" else 1.6, 0.17 if kind == "fuse" else 0.045), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.emission_enabled = true
	_led.emission_energy_multiplier = 4.0
	led_mesh.material_override = _led
	_update_led()
	add_to_group("net_refresh")
	if _is_done() and _cover:
		_cover.rotation.y = 0.0


## Invité : fusible posé / carte passée chez l'hôte.
func net_refresh() -> void:
	var was_off := _led.emission.g < 0.5
	_update_led()
	if was_off and _is_done() and _cover:
		var tw := create_tween()
		tw.tween_property(_cover, "rotation:y", 0.0, 0.5)


func _is_done() -> bool:
	return done_flag != "" and GameState.get_flag(done_flag)


func _update_led() -> void:
	var ok := _is_done()
	_led.emission = Color(0.1, 1.0, 0.3) if ok else Color(1.0, 0.1, 0.05)
	_led.albedo_color = Color(0.02, 0.3, 0.05) if ok else Color(0.3, 0.02, 0.02)


func get_prompt() -> String:
	if _is_done():
		return "EXAMINER"
	if GameState.has_item(required_item):
		return ("INSÉRER : " if kind == "fuse" else "UTILISER : ") + ItemDB.item_name(required_item).to_upper()
	return "EXAMINER"


func interact(_player: Node) -> void:
	if _is_done():
		GameState.show_message(done_text, 3.0)
		return
	if not GameState.has_item(required_item):
		GameState.show_message(idle_text, 5.0)
		Audio.play_3d("keypad_error" if kind == "card" else "metal_rattle", global_position + focus_offset, -4.0, 0.05, 8.0, 2.0)
		return
	GameState.remove_item(required_item, 1)
	GameState.set_flag(done_flag, true)
	_update_led()
	if kind == "fuse":
		Audio.play_3d("fuse_insert", global_position + focus_offset, 0.0, 0.0, 12.0, 3.0)
		FX.sparks(get_tree().current_scene if GameState.game == null else GameState.game, global_position + focus_offset + Vector3(0, 0, 0.2), 30)
		var tw := create_tween()
		tw.tween_property(_cover, "rotation:y", 0.0, 0.5)
	else:
		Audio.play_3d("keypad_success", global_position + focus_offset, -2.0, 0.0, 10.0, 2.0)
	if target_door:
		target_door.unlock()
	GameState.show_message(success_text, 4.0)

class_name LockerBox
extends Interactable
## Casier individuel fermé à clé (vestiaire) : la clé l'ouvre et révèle son
## contenu (documents, objets), qu'on ramasse ensuite un par un.

var key_item := ""
var open_flag := ""
var name_tag := ""
var locked_msg := "Le casier est fermé à clé."
## Contenu : [{doc, id}] ou [{item, count, id}]
var contents: Array = []
var is_open := false
var _door: Node3D
var _content_root: Node3D


func _ready() -> void:
	prompt_text = "OUVRIR LE CASIER"
	interact_radius = 1.5
	focus_offset = Vector3(0, 1.2, 0.3)
	ItemModels._box(self, Vector3(0.44, 1.9, 0.02), Vector3(0, 0.95, -0.24), "metal_blue")
	ItemModels._box(self, Vector3(0.02, 1.9, 0.48), Vector3(-0.21, 0.95, 0.0), "metal_blue")
	ItemModels._box(self, Vector3(0.02, 1.9, 0.48), Vector3(0.21, 0.95, 0.0), "metal_blue")
	ItemModels._box(self, Vector3(0.44, 0.02, 0.48), Vector3(0, 1.9, 0.0), "metal_blue")
	ItemModels._box(self, Vector3(0.44, 0.02, 0.48), Vector3(0, 0.02, 0.0), "metal_blue")
	ItemModels._box(self, Vector3(0.4, 0.015, 0.44), Vector3(0, 1.15, 0.0), "metal_blue")
	_door = Node3D.new()
	_door.position = Vector3(-0.21, 0, 0.245)
	add_child(_door)
	ItemModels._box(_door, Vector3(0.42, 1.86, 0.02), Vector3(0.21, 0.95, 0), "metal_blue")
	for j in 4:
		ItemModels._box(_door, Vector3(0.26, 0.012, 0.005), Vector3(0.21, 1.62 - j * 0.05, 0.012), "black")
	ItemModels._box(_door, Vector3(0.025, 0.1, 0.02), Vector3(0.37, 1.0, 0.02), "metal_steel")
	if name_tag != "":
		var lbl := Label3D.new()
		lbl.text = name_tag
		lbl.font = UITheme.font_typed()
		lbl.font_size = 40
		lbl.pixel_size = 0.0025
		lbl.modulate = Color(0.1, 0.1, 0.1)
		lbl.shaded = true
		lbl.position = Vector3(0.21, 1.4, 0.014)
		_door.add_child(lbl)
		ItemModels._box(_door, Vector3(0.14, 0.05, 0.004), Vector3(0.21, 1.4, 0.011), "paper")
	_content_root = Node3D.new()
	_content_root.position = Vector3(0, 1.17, 0.02)
	add_child(_content_root)
	if open_flag != "" and GameState.get_flag(open_flag):
		is_open = true
		_door.rotation.y = -1.9
		_spawn_contents()
	add_to_group("net_refresh")


## Invité : ouvert chez l'hôte.
func net_refresh() -> void:
	if not is_open and open_flag != "" and GameState.get_flag(open_flag):
		_open_visual()


func get_prompt() -> String:
	if key_item != "" and GameState.has_item(key_item):
		return "UTILISER : " + ItemDB.item_name(key_item).to_upper()
	return prompt_text


func can_interact() -> bool:
	return enabled and not is_open and is_shown()


func interact(_player: Node) -> void:
	if key_item != "" and not GameState.has_item(key_item):
		GameState.show_message(locked_msg, 3.0)
		Audio.play_3d("door_locked", global_position + Vector3.UP, -4.0, 0.05, 8.0, 2.0)
		return
	if key_item != "":
		GameState.remove_item(key_item, 1)
	if open_flag != "":
		GameState.set_flag(open_flag, true)
	_open_visual()


func _open_visual() -> void:
	is_open = true
	Audio.play_3d("door_unlock", global_position + Vector3.UP, -2.0, 0.03, 8.0, 2.0)
	var tw := create_tween()
	tw.tween_property(_door, "rotation:y", -1.9, 0.8).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	_spawn_contents()


func _spawn_contents() -> void:
	var x := -0.1
	for c in contents:
		var node: Interactable
		if c.has("doc"):
			if GameState.has_document(String(c.doc)):
				continue
			var d := DocumentPickup.new()
			d.doc_id = c.doc
			d.model_kind = String(c.get("model", "document"))
			node = d
		else:
			if GameState.taken_pickups.has(String(c.id)):
				continue
			var p := Pickup.new()
			p.item_id = c.item
			p.count = int(c.get("count", 1))
			p.pickup_id = c.id
			node = p
		node.interact_radius = 1.5
		_content_root.add_child(node)
		node.position = Vector3(x, 0.0, 0.0)
		node.rotation.y = 0.3 * x
		x += 0.16

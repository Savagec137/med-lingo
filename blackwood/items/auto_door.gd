class_name AutoDoor
extends Node3D
## Porte automatique coulissante vitrée (urgences, sas) : les deux vantaux
## s'écartent quand quelqu'un s'approche — joueur ou créature. Elle peut être
## privée de courant (reste fermée) ou verrouillée par un événement.

var door_id := ""
var width := 3.0
var height := 2.4
var powered := true
var locked := false
var locked_msg := "La porte automatique ne réagit pas."
var sensor := 2.6

var _leaves: Array[AnimatableBody3D] = []
var _amount := 0.0
var _target := 0.0
var _check_t := 0.0
var _was_open := false


func _ready() -> void:
	add_to_group("auto_doors")
	add_to_group("net_refresh")
	var fw := 0.1
	_part(self, Vector3(-width * 0.5 - fw * 0.5, height * 0.5, 0), Vector3(fw, height, 0.22), "metal_dark")
	_part(self, Vector3(width * 0.5 + fw * 0.5, height * 0.5, 0), Vector3(fw, height, 0.22), "metal_dark")
	_part(self, Vector3(0, height + 0.18, 0), Vector3(width + fw * 2.0, 0.36, 0.3), "metal_dark")
	for i in 2:
		var side := -1.0 if i == 0 else 1.0
		var body := AnimatableBody3D.new()
		body.collision_layer = 16
		body.collision_mask = 0
		body.sync_to_physics = false
		body.set_meta("door", self)
		body.position = Vector3(side * width * 0.25, 0, 0)
		add_child(body)
		var cs := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(width * 0.5, height, 0.05)
		cs.shape = shape
		cs.position = Vector3(0, height * 0.5, 0)
		body.add_child(cs)
		var w := width * 0.5 - 0.02
		_part(body, Vector3(0, height * 0.5, 0), Vector3(w, height - 0.1, 0.02), "glass")
		_part(body, Vector3(0, 0.06, 0), Vector3(w, 0.12, 0.05), "metal_steel")
		_part(body, Vector3(0, height - 0.04, 0), Vector3(w, 0.08, 0.05), "metal_steel")
		_part(body, Vector3(side * -(w * 0.5 - 0.03), height * 0.5, 0), Vector3(0.05, height, 0.05), "metal_steel")
		# Bandes adhésives de sécurité sur le verre
		_part(body, Vector3(0, 1.1, 0.012), Vector3(w - 0.1, 0.05, 0.004), "plastic_white")
		_leaves.append(body)
	if door_id != "" and GameState.door_states.has(door_id):
		var st: Dictionary = GameState.door_states[door_id]
		locked = bool(st.get("locked", locked))
		powered = bool(st.get("powered", powered))


func _part(parent: Node3D, pos: Vector3, size: Vector3, mat: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	mi.material_override = Mats.get_mat(mat)
	mi.position = pos
	parent.add_child(mi)
	return mi


func set_locked(on: bool, msg: String = "") -> void:
	locked = on
	if msg != "":
		locked_msg = msg
	_store()


func set_powered(on: bool) -> void:
	powered = on
	_store()


func _store() -> void:
	if door_id != "":
		GameState.door_states[door_id] = {"locked": locked, "powered": powered}


## Une créature heurte les vantaux fermés.
func bump(_by: Node3D) -> void:
	if powered and not locked:
		_target = 1.0


func is_open() -> bool:
	return _amount > 0.8


func _physics_process(delta: float) -> void:
	_check_t -= delta
	if _check_t <= 0.0:
		_check_t = 0.12
		_target = 1.0 if powered and not locked and _someone_near() else 0.0
	if not is_equal_approx(_amount, _target):
		_amount = move_toward(_amount, _target, delta * 1.6)
		var e := _amount * _amount * (3.0 - 2.0 * _amount)
		for i in _leaves.size():
			var side := -1.0 if i == 0 else 1.0
			_leaves[i].position.x = side * (width * 0.25 + e * width * 0.47)
		var now_open := _target > 0.5
		if now_open != _was_open:
			_was_open = now_open
			Audio.play_3d("door_open_glass" if now_open else "door_close_glass", global_position + Vector3.UP * 2.0, -4.0, 0.05, 16.0, 3.0)


## Invité : état de la porte (verrouillée, alimentée) tenu par l'hôte.
func net_refresh() -> void:
	if door_id != "" and GameState.door_states.has(door_id):
		var st: Dictionary = GameState.door_states[door_id]
		locked = bool(st.get("locked", locked))
		powered = bool(st.get("powered", powered))


func _someone_near() -> bool:
	for p in get_tree().get_nodes_in_group("players"):
		if _near((p as Node3D).global_position):
			return true
	for e in get_tree().get_nodes_in_group("enemies"):
		var en := e as Enemy
		if en and not en.is_dead() and _near(en.global_position):
			return true
	return false


func _near(pos: Vector3) -> bool:
	var local := to_local(pos)
	return absf(local.y) < 2.0 and absf(local.x) < width * 0.5 + 0.8 and absf(local.z) < sensor

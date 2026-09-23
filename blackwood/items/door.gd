class_name Door
extends Interactable
## Porte animée. Types :
##   NONE    : porte normale (E pour ouvrir / fermer)
##   LOCKED  : verrouillée définitivement (décor, bâtiment plus grand qu'il n'y paraît)
##   KEY     : s'ouvre avec un objet de l'inventaire (clé, carte, pied-de-biche)
##   ITEM    : verrouillée par un mécanisme externe (boîtier, lecteur de carte)
##   EVENT   : inaccessible tant qu'un événement ne l'a pas débloquée
## Les créatures poussent les portes non verrouillées ; une porte verrouillée
## bloque aussi leur navigation.

signal opened
signal closed

enum Lock { NONE, LOCKED, KEY, ITEM, EVENT }

var door_id := ""
var width := 1.3
var height := 2.2
var thickness := 0.06
var double := false
var lock: int = Lock.NONE
var key_item := ""
var consume_key := true
var locked_msg := "Cette porte est verrouillée."
var unlock_msg := "La clé ouvre cette porte."
var unlock_flag := ""
var leaf_mat := "wood_door"
var frame_mat := "metal_gray"
var has_window := false
var sign_text := ""
var along_z := false
var nav_floor := 0
var is_open := false
var open_angle := deg_to_rad(95.0)
var sound_open := "door_open"
var sound_close := "door_close"
var heavy := false
var start_open := false

var _pivots: Array[Node3D] = []
var _bodies: Array[AnimatableBody3D] = []
var _amount := 0.0
var _target := 0.0
var _dir := 1.0
var _moving := false
var _bang_cd := 0.0


func _ready() -> void:
	add_to_group("doors")
	interact_radius = 1.9
	focus_offset = Vector3(0, 1.1, 0)
	_build()
	if start_open and not GameState.door_states.has(door_id):
		is_open = true
		_amount = 1.0
		_target = 1.0
		for i in _pivots.size():
			var side := 1.0 if i == 0 else -1.0
			_pivots[i].rotation.y = open_angle * _dir * side
	_apply_saved_state()
	_update_nav()


func _build() -> void:
	var frame := Mats.get_mat(frame_mat)
	var fw := 0.07
	_static_part(Vector3(-width * 0.5 - fw * 0.5, height * 0.5, 0), Vector3(fw, height, 0.24), frame)
	_static_part(Vector3(width * 0.5 + fw * 0.5, height * 0.5, 0), Vector3(fw, height, 0.24), frame)
	_static_part(Vector3(0, height + fw * 0.5, 0), Vector3(width + fw * 2.0, fw, 0.24), frame)
	var leaves := 2 if double else 1
	var leaf_w := width / leaves - 0.01
	for i in leaves:
		var hinge_x := -width * 0.5 if i == 0 else width * 0.5
		var side := 1.0 if i == 0 else -1.0
		var pivot := Node3D.new()
		pivot.position = Vector3(hinge_x, 0, 0)
		add_child(pivot)
		_pivots.append(pivot)
		var body := AnimatableBody3D.new()
		body.collision_layer = 16
		body.collision_mask = 0
		body.sync_to_physics = false
		body.set_meta("door", self)
		pivot.add_child(body)
		_bodies.append(body)
		var cs := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(leaf_w, height - 0.02, thickness)
		cs.shape = shape
		cs.position = Vector3(side * leaf_w * 0.5, height * 0.5, 0)
		body.add_child(cs)
		_build_leaf(body, side, leaf_w)
	if sign_text != "":
		var lbl := Label3D.new()
		lbl.text = sign_text
		lbl.font = UITheme.font_ui()
		lbl.font_size = 48
		lbl.pixel_size = 0.0035
		lbl.modulate = Color(0.85, 0.85, 0.8)
		lbl.outline_size = 0
		lbl.shaded = true
		lbl.double_sided = false
		for s in [-1.0, 1.0]:
			var l2: Label3D = lbl.duplicate()
			l2.position = Vector3(0, height + 0.28, s * 0.13)
			l2.rotation.y = 0.0 if s > 0 else PI
			add_child(l2)
		lbl.free()


func _static_part(pos: Vector3, size: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	add_child(mi)


func _build_leaf(body: Node3D, side: float, leaf_w: float) -> void:
	var mat := Mats.get_mat(leaf_mat)
	var cx := side * leaf_w * 0.5
	if has_window:
		# Vantail avec hublot : quatre pièces autour d'une vitre
		var wy0 := 1.25
		var wy1 := 1.85
		var ww := leaf_w * 0.45
		_leaf_part(body, Vector3(cx, wy0 * 0.5, 0), Vector3(leaf_w, wy0, thickness), mat)
		_leaf_part(body, Vector3(cx, (wy1 + height) * 0.5, 0), Vector3(leaf_w, height - wy1, thickness), mat)
		var side_w := (leaf_w - ww) * 0.5
		_leaf_part(body, Vector3(cx - (ww + side_w) * 0.5, (wy0 + wy1) * 0.5, 0), Vector3(side_w, wy1 - wy0, thickness), mat)
		_leaf_part(body, Vector3(cx + (ww + side_w) * 0.5, (wy0 + wy1) * 0.5, 0), Vector3(side_w, wy1 - wy0, thickness), mat)
		_leaf_part(body, Vector3(cx, (wy0 + wy1) * 0.5, 0), Vector3(ww, wy1 - wy0, 0.01), Mats.get_mat("glass_dirty"))
	else:
		_leaf_part(body, Vector3(cx, height * 0.5, 0), Vector3(leaf_w, height - 0.02, thickness), mat)
	# Plaque de protection et poignées
	_leaf_part(body, Vector3(cx, 0.15, 0), Vector3(leaf_w - 0.04, 0.25, thickness + 0.01), Mats.get_mat("metal_steel"))
	var hx := side * (leaf_w - 0.1)
	for s in [-1.0, 1.0]:
		_leaf_part(body, Vector3(hx, 1.02, s * (thickness * 0.5 + 0.03)), Vector3(0.14, 0.025, 0.025), Mats.get_mat("metal_steel"))


func _leaf_part(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)


func get_prompt() -> String:
	if lock == Lock.NONE:
		return "FERMER" if is_open else "OUVRIR"
	if lock == Lock.KEY and key_item != "" and GameState.has_item(key_item):
		return "UTILISER : " + ItemDB.item_name(key_item).to_upper()
	return "OUVRIR"


func can_interact() -> bool:
	return enabled and not _moving


func interact(player: Node) -> void:
	match lock:
		Lock.NONE:
			if is_open:
				close_door()
			else:
				open_door(player.global_position)
		Lock.KEY:
			if key_item != "" and GameState.has_item(key_item):
				if consume_key:
					GameState.remove_item(key_item, 1)
				unlock()
				GameState.show_message(unlock_msg, 3.0)
				Audio.play_3d("door_unlock", global_position + Vector3.UP, 0.0, 0.03, 12.0, 3.0)
				await get_tree().create_timer(0.5).timeout
				open_door(player.global_position)
			else:
				_locked_feedback()
		_:
			_locked_feedback()


func _locked_feedback() -> void:
	GameState.show_message(locked_msg, 3.0)
	Audio.play_3d("door_locked", global_position + Vector3.UP, -2.0, 0.05, 12.0, 3.0)
	var tw := create_tween()
	for p in _pivots:
		tw.parallel().tween_property(p, "rotation:y", p.rotation.y + 0.012, 0.05)
	for p in _pivots:
		tw.parallel().tween_property(p, "rotation:y", p.rotation.y, 0.08).set_delay(0.05)


func unlock() -> void:
	lock = Lock.NONE
	if unlock_flag != "":
		GameState.set_flag(unlock_flag, true)
	_store_state()
	_update_nav()


func set_lock(new_lock: int, msg: String = "") -> void:
	lock = new_lock
	if msg != "":
		locked_msg = msg
	if lock != Lock.NONE and is_open:
		close_door(true)
	_store_state()
	_update_nav()


## Ouvre en s'écartant de « from » (la porte pousse du côté opposé).
func open_door(from: Vector3 = Vector3.INF, silent: bool = false) -> void:
	if is_open and not _moving:
		return
	if from != Vector3.INF:
		var local := to_local(from)
		_dir = 1.0 if local.z > 0.0 else -1.0
	is_open = true
	_target = 1.0
	_moving = true
	_set_collision(false)
	if not silent:
		Audio.play_3d(sound_open, global_position + Vector3.UP, -2.0 if not heavy else 1.0, 0.08, 16.0, 3.0)
	_store_state()
	opened.emit()


func close_door(silent: bool = false) -> void:
	if not is_open:
		return
	is_open = false
	_target = 0.0
	_moving = true
	_set_collision(false)
	if not silent:
		Audio.play_3d(sound_close, global_position + Vector3.UP, -2.0, 0.08, 16.0, 3.0)
	_store_state()
	closed.emit()


## Claquement brutal (événement scripté).
func slam() -> void:
	if not is_open:
		return
	is_open = false
	_target = 0.0
	_moving = true
	_set_collision(false)
	Audio.play_3d("door_slam", global_position + Vector3.UP, 4.0, 0.05, 30.0, 5.0)
	_store_state()
	closed.emit()


## Une créature heurte la porte : elle l'enfonce si elle n'est pas verrouillée.
func bump(by: Node3D) -> void:
	if _bang_cd > 0.0 or is_open:
		return
	_bang_cd = 1.2
	Audio.play_3d("door_bang", global_position + Vector3.UP, 2.0, 0.1, 25.0, 4.0)
	if lock == Lock.NONE:
		open_door(by.global_position, true)


func _set_collision(on: bool) -> void:
	for b in _bodies:
		for c in b.get_children():
			if c is CollisionShape3D:
				c.set_deferred("disabled", not on)


func _process(delta: float) -> void:
	_bang_cd = maxf(_bang_cd - delta, 0.0)
	if not _moving:
		return
	var speed := 1.6 if not heavy else 0.9
	_amount = move_toward(_amount, _target, delta * speed)
	var eased := _ease(_amount)
	for i in _pivots.size():
		var side := 1.0 if i == 0 else -1.0
		_pivots[i].rotation.y = eased * open_angle * _dir * side
	if is_equal_approx(_amount, _target):
		_moving = false
		# Porte fermée : collision ; ouverte : collision rétablie (le vantail
		# plaqué contre le mur ne gêne pas le passage).
		_set_collision(true)


static func _ease(t: float) -> float:
	return t * t * (3.0 - 2.0 * t)


func _store_state() -> void:
	if door_id == "":
		return
	GameState.door_states[door_id] = {"lock": lock, "open": is_open, "dir": _dir}


func _apply_saved_state() -> void:
	if door_id == "" or not GameState.door_states.has(door_id):
		return
	var st: Dictionary = GameState.door_states[door_id]
	lock = int(st.get("lock", lock))
	_dir = float(st.get("dir", 1.0))
	if bool(st.get("open", false)):
		is_open = true
		_amount = 1.0
		_target = 1.0
		for i in _pivots.size():
			var side := 1.0 if i == 0 else -1.0
			_pivots[i].rotation.y = open_angle * _dir * side


func _update_nav() -> void:
	if GameState.game and GameState.game.has_method("set_nav_door"):
		GameState.game.set_nav_door(self, lock != Lock.NONE)


## Emprise de l'ouverture au sol (pour la grille de navigation).
func footprint() -> Rect2:
	var a := global_transform * Vector3(-width * 0.5, 0, -0.25)
	var b := global_transform * Vector3(width * 0.5, 0, 0.25)
	var r := Rect2(Vector2(minf(a.x, b.x), minf(a.z, b.z)), Vector2(absf(a.x - b.x), absf(a.z - b.z)))
	return r

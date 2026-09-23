extends Node3D
## Audit des objets interactifs : pour chacun, vérifie qu'il existe un endroit
## où le joueur peut se tenir (capsule libre, sol dessous) depuis lequel l'objet
## est à portée et visible selon les mêmes règles que Player._update_focus.
## Usage : godot --headless --path . res://tests/interact_audit.tscn

const PLAYER_RADIUS := 0.3
const EYE := 1.1

var facility: Facility


func _ready() -> void:
	facility = Facility.new()
	add_child(facility)
	facility.build()
	await get_tree().physics_frame
	await get_tree().physics_frame
	var space := get_world_3d().direct_space_state
	var capsule := CapsuleShape3D.new()
	capsule.radius = PLAYER_RADIUS
	capsule.height = 1.7
	var sq := PhysicsShapeQueryParameters3D.new()
	sq.shape = capsule
	sq.collision_mask = 1
	var bad := 0
	var total := 0
	for n in get_tree().get_nodes_in_group("interactable"):
		var it := n as Interactable
		if it == null:
			continue
		total += 1
		var fp := it.focus_position()
		var pq := PhysicsPointQueryParameters3D.new()
		pq.position = fp
		pq.collision_mask = 1
		var inside := not space.intersect_point(pq, 1).is_empty()
		var floor_y := -4.5 if fp.y < -2.2 else 0.0
		var best := INF
		var reach := it.interact_radius - 0.08
		var r := 0.35
		while r <= reach and best == INF:
			for k in 24:
				var a := TAU * float(k) / 24.0
				var p := Vector3(fp.x + cos(a) * r, floor_y, fp.z + sin(a) * r)
				# Sol sous les pieds
				var dq := PhysicsRayQueryParameters3D.create(p + Vector3.UP * 0.6, p + Vector3.DOWN * 0.6, 1)
				var dh := space.intersect_ray(dq)
				if dh.is_empty():
					continue
				p.y = (dh.position as Vector3).y
				var eye := p + Vector3.UP * EYE
				if absf(fp.y - eye.y) > 1.6:
					continue
				sq.transform = Transform3D(Basis(), p + Vector3.UP * 0.9)
				if not space.intersect_shape(sq, 1).is_empty():
					continue
				var q := PhysicsRayQueryParameters3D.create(eye, fp, 1)
				var hit := space.intersect_ray(q)
				if not hit.is_empty() and (hit.position as Vector3).distance_to(fp) > 0.45:
					continue
				best = r
				break
			r += 0.1
		if best == INF:
			bad += 1
			print("PROBLÈME %-28s %s  inaccessible%s" % [_label(it), fp, " (dans une collision)" if inside else ""])
		elif inside:
			print("note     %-28s %s  rangé dans un meuble, accessible à %.2f m" % [_label(it), fp, best])
	print("Objets interactifs : %d, problèmes : %d" % [total, bad])
	get_tree().quit(1 if bad > 0 else 0)


func _label(it: Interactable) -> String:
	for key in ["pickup_id", "doc_id", "door_id", "uid"]:
		if key in it:
			if str(it.get(key)) != "":
				return str(it.get(key))
	return it.name

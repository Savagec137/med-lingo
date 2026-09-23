class_name ItemModels
extends RefCounted
## Petits modèles 3D provisoires des objets (primitives). Remplaçables par des
## modèles importés : il suffit de retourner une autre scène pour l'id voulu.


static func build(id: String) -> Node3D:
	var root := Node3D.new()
	match id:
		"pistol":
			_box(root, Vector3(0.2, 0.034, 0.032), Vector3(0, 0.03, 0), "metal_dark")
			var g := _box(root, Vector3(0.045, 0.1, 0.028), Vector3(0.06, -0.02, 0), "plastic_dark")
			g.rotation.z = -0.25
		"ammo_9mm":
			_box(root, Vector3(0.14, 0.06, 0.09), Vector3(0, 0.03, 0), "cardboard")
			_box(root, Vector3(0.141, 0.02, 0.091), Vector3(0, 0.05, 0), "metal_yellow")
		"spray":
			_cyl(root, 0.03, 0.15, Vector3(0, 0.075, 0), "plastic_white")
			_cyl(root, 0.018, 0.03, Vector3(0, 0.165, 0), "plastic_dark")
			_box(root, Vector3(0.062, 0.03, 0.02), Vector3(0, 0.1, 0.022), "emit_red")
		"admin_key":
			_box(root, Vector3(0.07, 0.005, 0.018), Vector3(0.02, 0.003, 0), "metal_yellow")
			_cyl(root, 0.018, 0.006, Vector3(-0.025, 0.003, 0), "metal_yellow")
			_box(root, Vector3(0.05, 0.004, 0.035), Vector3(-0.07, 0.002, 0.02), "paper")
		"fuse":
			_cyl(root, 0.025, 0.12, Vector3(0, 0.025, 0), "plastic_white", Vector3(0, 0, PI / 2.0))
			_cyl(root, 0.028, 0.02, Vector3(-0.065, 0.025, 0), "metal_steel", Vector3(0, 0, PI / 2.0))
			_cyl(root, 0.028, 0.02, Vector3(0.065, 0.025, 0), "metal_steel", Vector3(0, 0, PI / 2.0))
		"keycard_b":
			_box(root, Vector3(0.085, 0.003, 0.054), Vector3(0, 0.002, 0), "plastic_white")
			_box(root, Vector3(0.086, 0.004, 0.012), Vector3(0, 0.003, -0.015), "metal_blue")
		"crowbar":
			_box(root, Vector3(0.75, 0.025, 0.03), Vector3(0, 0.015, 0), "metal_rust")
			var hook := _box(root, Vector3(0.12, 0.025, 0.03), Vector3(0.39, 0.05, 0), "metal_rust")
			hook.rotation.z = 1.0
		"battery":
			_cyl(root, 0.017, 0.07, Vector3(-0.02, 0.035, 0), "metal_dark")
			_cyl(root, 0.017, 0.07, Vector3(0.02, 0.035, 0), "metal_dark")
			_box(root, Vector3(0.075, 0.02, 0.036), Vector3(0, 0.035, 0), "metal_yellow")
		"flashlight":
			_cyl(root, 0.025, 0.2, Vector3(0, 0.03, 0), "metal_dark", Vector3(0, 0, PI / 2.0))
			_cyl(root, 0.035, 0.05, Vector3(0.11, 0.03, 0), "metal_dark", Vector3(0, 0, PI / 2.0))
		"document":
			var p := _box(root, Vector3(0.21, 0.004, 0.29), Vector3(0, 0.002, 0), "paper")
			p.rotation.y = 0.2
			var p2 := _box(root, Vector3(0.21, 0.004, 0.29), Vector3(0.02, 0.006, 0.01), "paper")
			p2.rotation.y = -0.1
		"folder":
			_box(root, Vector3(0.24, 0.02, 0.32), Vector3(0, 0.01, 0), "cardboard")
			_box(root, Vector3(0.21, 0.004, 0.29), Vector3(0.01, 0.022, 0), "paper")
		_:
			_box(root, Vector3(0.1, 0.1, 0.1), Vector3(0, 0.05, 0), "metal_gray")
	return root


static func _box(parent: Node3D, size: Vector3, pos: Vector3, mat: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	mi.material_override = Mats.get_mat(mat)
	mi.position = pos
	parent.add_child(mi)
	return mi


static func _cyl(parent: Node3D, r: float, h: float, pos: Vector3, mat: String, rot: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var c := CylinderMesh.new()
	c.top_radius = r
	c.bottom_radius = r
	c.height = h
	c.radial_segments = 10
	mi.mesh = c
	mi.material_override = Mats.get_mat(mat)
	mi.position = pos
	mi.rotation = rot
	parent.add_child(mi)
	return mi

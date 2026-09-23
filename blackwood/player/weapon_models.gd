class_name WeaponModels
extends RefCounted
## Modèles des cinq armes, construits par code avec les matériaux PBR du jeu
## (métal brossé, polymère, bois). build() renvoie un Node3D orienté vers -Z
## avec un enfant « Muzzle » au bout du canon. Le même modèle sert en main
## (troisième personne) et à l'écran (première personne, calque 11).


static func build(id: String, layer: int) -> Node3D:
	var root := Node3D.new()
	root.name = "Weapon_" + id
	var muzzle := Node3D.new()
	muzzle.name = "Muzzle"
	root.add_child(muzzle)
	match id:
		"baton":
			_cyl(root, "metal_dark", Vector3(0, 0, 0.02), Vector3(0, 0, -0.16), 0.016, layer)
			_cyl(root, "metal_steel", Vector3(0, 0, -0.16), Vector3(0, 0, -0.34), 0.012, layer)
			_cyl(root, "metal_steel", Vector3(0, 0, -0.34), Vector3(0, 0, -0.5), 0.009, layer)
			_sphere(root, "metal_steel", Vector3(0, 0, -0.505), 0.014, layer)
			_cyl(root, "rubber", Vector3(0, 0, 0.1), Vector3(0, 0, 0.0), 0.019, layer)
			muzzle.position = Vector3(0, 0, -0.5)
		"pistol":
			_box(root, "metal_dark", Vector3(0.032, 0.036, 0.2), Vector3(0, 0.018, -0.06), layer)
			_box(root, "metal_dark", Vector3(0.026, 0.02, 0.17), Vector3(0, -0.012, -0.05), layer)
			var grip := _box(root, "plastic_dark", Vector3(0.03, 0.11, 0.045), Vector3(0, -0.06, 0.02), layer)
			grip.rotation.x = 0.22
			_box(root, "metal_dark", Vector3(0.008, 0.03, 0.04), Vector3(0, -0.03, -0.035), layer)
			_box(root, "metal_steel", Vector3(0.006, 0.008, 0.006), Vector3(0, 0.04, -0.15), layer)
			muzzle.position = Vector3(0, 0.02, -0.17)
		"shotgun":
			_cyl(root, "metal_dark", Vector3(0, 0.02, 0.05), Vector3(0, 0.02, -0.62), 0.013, layer)
			_cyl(root, "metal_dark", Vector3(0, -0.012, -0.1), Vector3(0, -0.012, -0.55), 0.012, layer)
			var pump := _box(root, "wood_desk", Vector3(0.045, 0.045, 0.16), Vector3(0, -0.012, -0.34), layer)
			pump.name = "Pump"
			_box(root, "metal_dark", Vector3(0.05, 0.07, 0.2), Vector3(0, 0.0, 0.1), layer)
			var stock := _box(root, "wood_desk", Vector3(0.042, 0.1, 0.32), Vector3(0, -0.04, 0.34), layer)
			stock.rotation.x = 0.12
			_box(root, "metal_dark", Vector3(0.01, 0.05, 0.03), Vector3(0, -0.05, 0.12), layer)
			muzzle.position = Vector3(0, 0.02, -0.63)
		"smg":
			_box(root, "metal_dark", Vector3(0.05, 0.07, 0.3), Vector3(0, 0.0, -0.06), layer)
			_cyl(root, "metal_dark", Vector3(0, 0.01, -0.2), Vector3(0, 0.01, -0.32), 0.012, layer)
			var mag := _box(root, "metal_dark", Vector3(0.03, 0.16, 0.035), Vector3(0, -0.11, -0.08), layer)
			mag.rotation.x = -0.12
			mag.name = "Mag"
			var grip2 := _box(root, "plastic_dark", Vector3(0.035, 0.11, 0.045), Vector3(0, -0.08, 0.06), layer)
			grip2.rotation.x = 0.25
			_box(root, "metal_steel", Vector3(0.012, 0.02, 0.2), Vector3(0, 0.04, 0.12), layer)
			_box(root, "plastic_dark", Vector3(0.03, 0.05, 0.03), Vector3(0, -0.02, 0.2), layer)
			muzzle.position = Vector3(0, 0.01, -0.33)
		"magnum":
			_cyl(root, "metal_steel", Vector3(0, 0.03, -0.02), Vector3(0, 0.03, -0.24), 0.014, layer)
			_box(root, "metal_steel", Vector3(0.028, 0.02, 0.2), Vector3(0, 0.05, -0.12), layer)
			var cyl := _cyl(root, "metal_steel", Vector3(0, 0.02, 0.03), Vector3(0, 0.02, -0.04), 0.032, layer)
			cyl.name = "Cylinder"
			_box(root, "metal_steel", Vector3(0.03, 0.06, 0.09), Vector3(0, 0.02, 0.06), layer)
			var grip3 := _box(root, "wood_desk", Vector3(0.034, 0.12, 0.05), Vector3(0, -0.06, 0.1), layer)
			grip3.rotation.x = 0.35
			_box(root, "metal_steel", Vector3(0.006, 0.014, 0.01), Vector3(0, 0.068, -0.22), layer)
			muzzle.position = Vector3(0, 0.03, -0.25)
	return root


static func _mesh(parent: Node3D, mesh: Mesh, mat: String, pos: Vector3, layer: int) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = Mats.get_mat(mat)
	mi.position = pos
	mi.layers = layer
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if layer != ViewModel.LAYER else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi


static func _box(parent: Node3D, mat: String, size: Vector3, pos: Vector3, layer: int) -> MeshInstance3D:
	var b := BoxMesh.new()
	b.size = size
	return _mesh(parent, b, mat, pos, layer)


static func _sphere(parent: Node3D, mat: String, pos: Vector3, r: float, layer: int) -> MeshInstance3D:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = 12
	s.rings = 6
	return _mesh(parent, s, mat, pos, layer)


## Cylindre de a à b (axe local), rayon r.
static func _cyl(parent: Node3D, mat: String, a: Vector3, b: Vector3, r: float, layer: int) -> MeshInstance3D:
	var c := CylinderMesh.new()
	c.top_radius = r
	c.bottom_radius = r
	c.height = a.distance_to(b)
	c.radial_segments = 14
	var mi := _mesh(parent, c, mat, (a + b) * 0.5, layer)
	var dir := (b - a).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.999:
		mi.basis = Basis(Quaternion(Vector3.UP, dir))
	return mi

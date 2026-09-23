class_name FX
extends RefCounted
## Effets visuels ponctuels : impacts, étincelles, sang, poussière, impacts de balle.

static var _decals: Array[Node3D] = []
static var _hole_tex: GradientTexture2D
static var _spark_mat: StandardMaterial3D
static var _dust_mat: StandardMaterial3D
static var _blood_mat: StandardMaterial3D

const MAX_DECALS := 40


static func _spark_material() -> StandardMaterial3D:
	if _spark_mat == null:
		_spark_mat = StandardMaterial3D.new()
		_spark_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_spark_mat.albedo_color = Color(1.0, 0.75, 0.35)
		_spark_mat.emission_enabled = true
		_spark_mat.emission = Color(1.0, 0.6, 0.2)
		_spark_mat.emission_energy_multiplier = 6.0
		_spark_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		_spark_mat.vertex_color_use_as_albedo = true
	return _spark_mat


static func _dust_material() -> StandardMaterial3D:
	if _dust_mat == null:
		_dust_mat = StandardMaterial3D.new()
		_dust_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_dust_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_dust_mat.albedo_color = Color(0.5, 0.48, 0.44, 0.35)
		_dust_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		_dust_mat.vertex_color_use_as_albedo = true
	return _dust_mat


static func _blood_material() -> StandardMaterial3D:
	if _blood_mat == null:
		_blood_mat = StandardMaterial3D.new()
		_blood_mat.albedo_color = Color(0.25, 0.01, 0.01)
		_blood_mat.roughness = 0.2
		_blood_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		_blood_mat.vertex_color_use_as_albedo = true
	return _blood_mat


static func _burst(parent: Node, pos: Vector3, dir: Vector3, amount: int, mat: Material, size: float,
		speed: float, spread: float, lifetime: float, gravity: float, color: Color) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.95
	p.amount = amount
	p.lifetime = lifetime
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	quad.material = mat
	p.mesh = quad
	p.direction = dir
	p.spread = spread
	p.initial_velocity_min = speed * 0.4
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -gravity, 0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.2
	p.color = color
	var ramp := Gradient.new()
	ramp.colors = PackedColorArray([color, Color(color.r, color.g, color.b, 0.0)])
	p.color_ramp = ramp
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	p.finished.connect(p.queue_free)
	return p


## Impact de balle sur le décor : étincelles, poussière, trou.
static func impact(parent: Node, pos: Vector3, normal: Vector3, metal: bool = false) -> void:
	_burst(parent, pos + normal * 0.02, normal, 10 if metal else 5, _spark_material(), 0.025, 5.0, 35.0, 0.35, 9.0, Color(1, 0.8, 0.5))
	_burst(parent, pos + normal * 0.03, normal, 6, _dust_material(), 0.12, 1.2, 40.0, 0.9, 0.5, Color(0.55, 0.52, 0.48, 0.4))
	bullet_hole(parent, pos, normal)


static func blood(parent: Node, pos: Vector3, dir: Vector3, amount: int = 14) -> void:
	_burst(parent, pos, dir, amount, _blood_material(), 0.035, 3.5, 30.0, 0.7, 9.8, Color(0.3, 0.01, 0.01))


static func sparks(parent: Node, pos: Vector3, amount: int = 24) -> void:
	_burst(parent, pos, Vector3.UP, amount, _spark_material(), 0.03, 4.5, 90.0, 0.6, 9.0, Color(0.7, 0.85, 1.0))


static func dust(parent: Node, pos: Vector3, amount: int = 16, size: float = 0.35) -> void:
	_burst(parent, pos, Vector3.UP, amount, _dust_material(), size, 0.8, 80.0, 1.6, -0.1, Color(0.45, 0.43, 0.4, 0.35))


static func bullet_hole(parent: Node, pos: Vector3, normal: Vector3) -> void:
	if _hole_tex == null:
		var g := Gradient.new()
		g.offsets = PackedFloat32Array([0.0, 0.25, 0.45, 1.0])
		g.colors = PackedColorArray([Color(0, 0, 0, 1), Color(0.03, 0.03, 0.03, 0.95), Color(0.1, 0.1, 0.1, 0.4), Color(0, 0, 0, 0)])
		_hole_tex = GradientTexture2D.new()
		_hole_tex.gradient = g
		_hole_tex.fill = GradientTexture2D.FILL_RADIAL
		_hole_tex.fill_from = Vector2(0.5, 0.5)
		_hole_tex.fill_to = Vector2(0.5, 0.0)
		_hole_tex.width = 64
		_hole_tex.height = 64
	var d := Decal.new()
	d.texture_albedo = _hole_tex
	d.size = Vector3(0.09, 0.08, 0.09)
	d.cull_mask = 1
	parent.add_child(d)
	var up := normal.normalized()
	var ref := Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.9 else Vector3.RIGHT
	var x := up.cross(ref).normalized()
	var z := x.cross(up).normalized()
	d.global_transform = Transform3D(Basis(x, up, z), pos)
	_decals = _decals.filter(func(n): return is_instance_valid(n))
	_decals.append(d)
	while _decals.size() > MAX_DECALS:
		var old: Node3D = _decals.pop_front()
		if is_instance_valid(old):
			old.queue_free()


## Tache de sang au sol (quad), utilisée pour le décor et les blessures.
static func blood_decal(parent: Node, pos: Vector3, size: float = 1.0, mat: String = "blood",
		normal: Vector3 = Vector3.UP, rot: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	mi.mesh = quad
	mi.material_override = Mats.get_mat(mat)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	var up := normal.normalized()
	var ref := Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.9 else Vector3.RIGHT
	var t := up.cross(ref).normalized().rotated(up, rot)
	# Le quad est dans le plan XY local : sa normale (+Z) doit suivre « up »
	mi.global_transform = Transform3D(Basis(t, up.cross(t), up), pos + up * 0.006)
	return mi

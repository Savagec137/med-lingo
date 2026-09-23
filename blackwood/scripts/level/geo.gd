class_name Geo
extends RefCounted
## Construction du décor statique.
## Les boîtes et cylindres sont accumulés par (zone, matériau) puis fusionnés en
## un maillage unique par lot : quelques dizaines d'appels de dessin pour tout
## le bâtiment. Les collisions sont ajoutées à un StaticBody3D par zone, et les
## empreintes au sol sont mémorisées pour construire les grilles de navigation.

const FLOOR_LEVELS := [0.0, -4.5]

var root: Node3D
var obstacles: Array = []        # {floor:int, rect:Rect2}
var _batches := {}
var _bodies := {}
var _zone_roots := {}


class Batch:
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var tangents := PackedFloat32Array()
	var uvs := PackedVector2Array()
	var idx := PackedInt32Array()
	var mat := ""
	var zone := ""
	var shadow := true


func _init(p_root: Node3D) -> void:
	root = p_root


func zone_root(zone: String) -> Node3D:
	if not _zone_roots.has(zone):
		var n := Node3D.new()
		n.name = "Zone_" + zone
		root.add_child(n)
		_zone_roots[zone] = n
	return _zone_roots[zone]


func _batch(zone: String, mat: String, shadow: bool) -> Batch:
	var key := "%s|%s|%s" % [zone, mat, shadow]
	if not _batches.has(key):
		var b := Batch.new()
		b.mat = mat
		b.zone = zone
		b.shadow = shadow
		_batches[key] = b
	return _batches[key]


func _body(zone: String) -> StaticBody3D:
	if not _bodies.has(zone):
		var body := StaticBody3D.new()
		body.name = "Collision_" + zone
		body.collision_layer = 1
		body.collision_mask = 0
		zone_root(zone).add_child(body)
		_bodies[zone] = body
	return _bodies[zone]


## Boîte statique. opts : rot (radians autour de Y), collide (bool),
## nav (bool : obstacle pour l'IA), shadow (bool), basis (Basis complète).
func box(zone: String, mat: String, center: Vector3, size: Vector3, opts: Dictionary = {}) -> void:
	var basis: Basis = opts.get("basis", Basis(Vector3.UP, float(opts.get("rot", 0.0))))
	var xf := Transform3D(basis, center)
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	_emit_box(b, xf, size)
	if opts.get("collide", true):
		add_collision_box(zone, xf, size)
		if opts.get("nav", true):
			_record_obstacle(xf, size)


func add_collision_box(zone: String, xf: Transform3D, size: Vector3) -> void:
	var body := _body(zone)
	var shape := BoxShape3D.new()
	shape.size = size
	var owner_id := body.create_shape_owner(body)
	body.shape_owner_add_shape(owner_id, shape)
	body.shape_owner_set_transform(owner_id, xf)


## Volume de collision invisible (et obstacle IA) : sert à simplifier les
## collisions des accessoires composés de nombreux petits éléments.
func solid(zone: String, center: Vector3, size: Vector3, basis: Basis = Basis.IDENTITY, nav: bool = true) -> void:
	var xf := Transform3D(basis, center)
	add_collision_box(zone, xf, size)
	if nav:
		_record_obstacle(xf, size)


## Obstacle de navigation sans géométrie (ex. zone inondée à éviter).
func nav_block(center: Vector3, size: Vector3, rot: float = 0.0) -> void:
	_record_obstacle(Transform3D(Basis(Vector3.UP, rot), center), size)


func _record_obstacle(xf: Transform3D, size: Vector3) -> void:
	var aabb := xf * AABB(-size * 0.5, size)
	for f in FLOOR_LEVELS.size():
		var y0: float = FLOOR_LEVELS[f]
		if aabb.position.y < y0 + 1.7 and aabb.end.y > y0 + 0.12:
			obstacles.append({"floor": f, "rect": Rect2(aabb.position.x, aabb.position.z, aabb.size.x, aabb.size.z)})


## Cylindre entre deux points (tuyaux, piliers, pieds de meubles).
func cylinder(zone: String, mat: String, a: Vector3, b_pt: Vector3, radius: float,
		opts: Dictionary = {}) -> void:
	var segments: int = int(opts.get("segments", 10))
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var axis := b_pt - a
	var length := axis.length()
	if length < 0.001:
		return
	var dir := axis / length
	var ref := Vector3.UP if absf(dir.y) < 0.95 else Vector3.RIGHT
	var u := dir.cross(ref).normalized()
	var v := dir.cross(u).normalized()
	var radius_b: float = float(opts.get("radius_b", radius))
	var start := b.verts.size()
	for i in segments + 1:
		var ang := TAU * float(i) / float(segments)
		var n := u * cos(ang) + v * sin(ang)
		for end in [0, 1]:
			var p: Vector3 = (a if end == 0 else b_pt) + n * (radius if end == 0 else radius_b)
			b.verts.append(p)
			b.norms.append(n)
			var t := dir
			b.tangents.append_array([t.x, t.y, t.z, 1.0])
			b.uvs.append(Vector2(ang * radius, length * end))
	for i in segments:
		var i0 := start + i * 2
		var i1 := i0 + 1
		var i2 := i0 + 2
		var i3 := i0 + 3
		b.idx.append_array([i0, i1, i2, i2, i1, i3])
	if opts.get("caps", true):
		for end in [0, 1]:
			var c: Vector3 = a if end == 0 else b_pt
			var n2: Vector3 = -dir if end == 0 else dir
			var rr0: float = radius if end == 0 else radius_b
			if rr0 < 0.0005:
				continue
			var cs := b.verts.size()
			b.verts.append(c)
			b.norms.append(n2)
			b.tangents.append_array([u.x, u.y, u.z, 1.0])
			b.uvs.append(Vector2.ZERO)
			var rr: float = rr0
			for i in segments + 1:
				var ang2 := TAU * float(i) / float(segments)
				b.verts.append(c + (u * cos(ang2) + v * sin(ang2)) * rr)
				b.norms.append(n2)
				b.tangents.append_array([u.x, u.y, u.z, 1.0])
				b.uvs.append(Vector2(cos(ang2), sin(ang2)) * radius)
			for i in segments:
				if end == 0:
					b.idx.append_array([cs, cs + 1 + i, cs + 2 + i])
				else:
					b.idx.append_array([cs, cs + 2 + i, cs + 1 + i])
	if opts.get("collide", false):
		var mid := (a + b_pt) * 0.5
		var basis := Basis.looking_at(dir, ref) if absf(dir.y) < 0.95 else Basis.IDENTITY
		var size := Vector3(radius * 2.0, radius * 2.0, length) if absf(dir.y) < 0.95 else Vector3(radius * 2.0, length, radius * 2.0)
		add_collision_box(zone, Transform3D(basis, mid), size)
		if opts.get("nav", true):
			_record_obstacle(Transform3D(basis, mid), size)


func _emit_box(b: Batch, xf: Transform3D, size: Vector3) -> void:
	var h := size * 0.5
	# [normale, axe u, axe v, demi-extensions (n, u, v)]
	var faces := [
		[Vector3.RIGHT, Vector3.FORWARD, Vector3.UP, h.x, h.z, h.y],
		[Vector3.LEFT, Vector3.BACK, Vector3.UP, h.x, h.z, h.y],
		[Vector3.UP, Vector3.RIGHT, Vector3.FORWARD, h.y, h.x, h.z],
		[Vector3.DOWN, Vector3.RIGHT, Vector3.BACK, h.y, h.x, h.z],
		[Vector3.BACK, Vector3.RIGHT, Vector3.UP, h.z, h.x, h.y],
		[Vector3.FORWARD, Vector3.LEFT, Vector3.UP, h.z, h.x, h.y],
	]
	var basis := xf.basis
	for f in faces:
		var n: Vector3 = f[0]
		var u: Vector3 = f[1]
		var v: Vector3 = f[2]
		var hn: float = f[3]
		var hu: float = f[4]
		var hv: float = f[5]
		var c := n * hn
		var corners := [c - u * hu - v * hv, c + u * hu - v * hv, c + u * hu + v * hv, c - u * hu + v * hv]
		var uv_c := [Vector2(0, 2.0 * hv), Vector2(2.0 * hu, 2.0 * hv), Vector2(2.0 * hu, 0), Vector2(0, 0)]
		var wn := (basis * n).normalized()
		var wu := (basis * u).normalized()
		var start := b.verts.size()
		for i in 4:
			b.verts.append(xf * (corners[i] as Vector3))
			b.norms.append(wn)
			b.tangents.append_array([wu.x, wu.y, wu.z, 1.0])
			b.uvs.append(uv_c[i])
		# Godot : faces avant dans le sens horaire vu de l'extérieur.
		if u.cross(v).dot(n) > 0.0:
			b.idx.append_array([start, start + 2, start + 1, start, start + 3, start + 2])
		else:
			b.idx.append_array([start, start + 1, start + 2, start, start + 2, start + 3])


## Mur parallèle à l'axe X (de x1 à x2, à la profondeur z).
## openings : [{a, b, bottom, top}] en coordonnées X absolues.
## mat_b : matériau de la face +Z (si différent).
func wall_x(zone: String, mat: String, x1: float, x2: float, z: float, y0: float, height: float,
		thick: float, openings: Array = [], mat_b: String = "") -> void:
	_wall(zone, mat, mat_b, x1, x2, z, y0, height, thick, openings, false)


## Mur parallèle à l'axe Z (de z1 à z2, à l'abscisse x). mat_b : face +X.
func wall_z(zone: String, mat: String, z1: float, z2: float, x: float, y0: float, height: float,
		thick: float, openings: Array = [], mat_b: String = "") -> void:
	_wall(zone, mat, mat_b, z1, z2, x, y0, height, thick, openings, true)


func _wall(zone: String, mat: String, mat_b: String, s1: float, s2: float, depth: float,
		y0: float, height: float, thick: float, openings: Array, along_z: bool) -> void:
	var ops := openings.duplicate()
	ops.sort_custom(func(p, q): return float(p.a) < float(q.a))
	var cursor := s1
	var pieces: Array = []   # [start, end, bottom, top]
	for op in ops:
		var a: float = maxf(float(op.a), s1)
		var bb: float = minf(float(op.b), s2)
		if a > cursor:
			pieces.append([cursor, a, 0.0, height])
		var bottom: float = float(op.get("bottom", 0.0))
		var top: float = float(op.get("top", 2.2))
		if bottom > 0.0:
			pieces.append([a, bb, 0.0, bottom])
		if top < height:
			pieces.append([a, bb, top, height])
		cursor = bb
	if cursor < s2:
		pieces.append([cursor, s2, 0.0, height])
	for p in pieces:
		var length: float = p[1] - p[0]
		var ph: float = p[3] - p[2]
		if length <= 0.001 or ph <= 0.001:
			continue
		var mid: float = (p[0] + p[1]) * 0.5
		var cy: float = y0 + (p[2] + p[3]) * 0.5
		if mat_b == "" or mat_b == mat:
			var center := Vector3(depth, cy, mid) if along_z else Vector3(mid, cy, depth)
			var size := Vector3(thick, ph, length) if along_z else Vector3(length, ph, thick)
			box(zone, mat, center, size)
		else:
			for side in [-1, 1]:
				var off: float = thick * 0.25 * side
				var c2 := Vector3(depth + off, cy, mid) if along_z else Vector3(mid, cy, depth + off)
				var s2v := Vector3(thick * 0.5, ph, length) if along_z else Vector3(length, ph, thick * 0.5)
				box(zone, mat if side < 0 else mat_b, c2, s2v, {"collide": false})
			# Une seule collision couvrant toute l'épaisseur du mur
			var cfull := Vector3(depth, cy, mid) if along_z else Vector3(mid, cy, depth)
			var sfull := Vector3(thick, ph, length) if along_z else Vector3(length, ph, thick)
			add_collision_box(zone, Transform3D(Basis.IDENTITY, cfull), sfull)
			_record_obstacle(Transform3D(Basis.IDENTITY, cfull), sfull)


## Dalle de sol (dessus à y_top) sur un rectangle XZ.
func slab(zone: String, mat: String, x1: float, z1: float, x2: float, z2: float, y_top: float,
		thick: float = 0.3) -> void:
	box(zone, mat, Vector3((x1 + x2) * 0.5, y_top - thick * 0.5, (z1 + z2) * 0.5),
		Vector3(absf(x2 - x1), thick, absf(z2 - z1)), {"nav": false})


## Plafond (dessous à y_bottom).
func ceiling(zone: String, mat: String, x1: float, z1: float, x2: float, z2: float, y_bottom: float,
		thick: float = 0.3) -> void:
	box(zone, mat, Vector3((x1 + x2) * 0.5, y_bottom + thick * 0.5, (z1 + z2) * 0.5),
		Vector3(absf(x2 - x1), thick, absf(z2 - z1)), {"nav": false})


## Construit tous les maillages fusionnés. À appeler une fois le décor décrit.
func build() -> void:
	for key in _batches:
		var b: Batch = _batches[key]
		if b.verts.is_empty():
			continue
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = b.verts
		arrays[Mesh.ARRAY_NORMAL] = b.norms
		arrays[Mesh.ARRAY_TANGENT] = b.tangents
		arrays[Mesh.ARRAY_TEX_UV] = b.uvs
		arrays[Mesh.ARRAY_INDEX] = b.idx
		var mesh := ArrayMesh.new()
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		mesh.surface_set_material(0, Mats.get_mat(b.mat))
		var mi := MeshInstance3D.new()
		mi.name = "Mesh_%s" % b.mat
		mi.mesh = mesh
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if b.shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		zone_root(b.zone).add_child(mi)
	_batches.clear()

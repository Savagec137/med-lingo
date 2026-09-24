class_name Geo
extends RefCounted
## Construction du décor statique.
## Les boîtes et cylindres sont accumulés par (zone, matériau) puis fusionnés en
## un maillage unique par lot : quelques dizaines d'appels de dessin pour tout
## le bâtiment. Les collisions sont ajoutées à un StaticBody3D par zone, et les
## empreintes au sol sont mémorisées pour construire les grilles de navigation.

## Hauteurs des sols (une grille de navigation par sol) : les obstacles sont
## enregistrés pour chaque sol qu'ils traversent.
var floor_levels: Array = [0.0]
## Callable(zone) → Node3D parent de la zone (visibilité par étage).
var zone_parent: Callable

## Collision par défaut des boîtes (désactivée pour le décor inaccessible).
var collide_default := true
var root: Node3D
var obstacles: Array = []        # {floor:int, rect:Rect2, big_only:bool}
var _batches := {}
var _obstacle_aabbs: Array = []   # {aabb: AABB, big_only: bool}
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
		var parent: Node3D = zone_parent.call(zone) if zone_parent.is_valid() else root
		parent.add_child(n)
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
	if opts.get("collide", collide_default):
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
	# Petit meuble que les créatures frôlent (nav = false) : seules les grandes
	# créatures (Chirurgien, Colossus) le contournent, pour ne pas s'y coincer.
	_record_obstacle(xf, size, not nav)


## Obstacle de navigation sans géométrie (ex. zone inondée à éviter).
func nav_block(center: Vector3, size: Vector3, rot: float = 0.0) -> void:
	_record_obstacle(Transform3D(Basis(Vector3.UP, rot), center), size)


func _record_obstacle(xf: Transform3D, size: Vector3, big_only: bool = false) -> void:
	var aabb := xf * AABB(-size * 0.5, size)
	_obstacle_aabbs.append({"aabb": aabb, "big_only": big_only})


## Répartit les obstacles par sol (appelé à la construction, une fois les
## hauteurs de sols connues).
func _dispatch_obstacles() -> void:
	obstacles.clear()
	for o in _obstacle_aabbs:
		var aabb: AABB = o.aabb
		for f in floor_levels.size():
			var y0: float = floor_levels[f]
			if aabb.position.y < y0 + 1.7 and aabb.end.y > y0 + 0.12:
				obstacles.append({"floor": f, "rect": Rect2(aabb.position.x, aabb.position.z, aabb.size.x, aabb.size.z),
					"big_only": bool(o.big_only)})


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


## Gabarits d'accessoires : la géométrie d'un accessoire identique (même
## fonction, mêmes paramètres) est générée une seule fois en coordonnées
## locales (la génération sommet par sommet coûte cher en GDScript), puis
## affichée par instanciation (MultiMesh) : un seul maillage par zone et par
## gabarit, quel que soit le nombre d'exemplaires. Conservés d'un niveau à
## l'autre. {clé: [maillage avec ombre, maillage sans ombre]}
static var templates := {}
var _stamps := {}   # "zone|clé" → {zone, key, xfs}


## Ajoute un exemplaire du gabarit « key » à la transformation « xf ». Au
## premier appel, le gabarit est construit par build.call(geo, zone, xf), sur
## une géométrie temporaire (aucune collision ne doit y être créée).
func stamp(zone: String, key: String, xf: Transform3D, build: Callable) -> void:
	if not templates.has(key):
		var tmp := Geo.new(null)
		tmp.collide_default = false
		build.call(tmp, "tpl", Transform3D.IDENTITY)
		templates[key] = tmp._template_meshes()
	var sk := zone + "|" + key
	if not _stamps.has(sk):
		_stamps[sk] = {"zone": zone, "key": key, "xfs": []}
	_stamps[sk].xfs.append(xf)


## Maillages d'un gabarit : les lots avec ombre d'un côté, sans ombre de l'autre.
func _template_meshes() -> Array:
	var out: Array = [null, null]
	for k in _batches:
		var b: Batch = _batches[k]
		if b.verts.is_empty():
			continue
		var slot := 0 if b.shadow else 1
		if out[slot] == null:
			out[slot] = ArrayMesh.new()
		var m: ArrayMesh = out[slot]
		m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, _arrays(b))
		m.surface_set_material(m.get_surface_count() - 1, Mats.get_mat(b.mat))
	return out


func _arrays(b: Batch) -> Array:
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = b.verts
	arrays[Mesh.ARRAY_NORMAL] = b.norms
	arrays[Mesh.ARRAY_TANGENT] = b.tangents
	arrays[Mesh.ARRAY_TEX_UV] = b.uvs
	arrays[Mesh.ARRAY_INDEX] = b.idx
	return arrays


## Triangle orienté d'après les normales de ses sommets (faces avant dans le
## sens horaire vu de l'extérieur) ; les triangles dégénérés sont ignorés.
func _tri(b: Batch, i0: int, i1: int, i2: int) -> void:
	var p0 := b.verts[i0]
	var c := (b.verts[i1] - p0).cross(b.verts[i2] - p0)
	if c.length_squared() < 1e-14:
		return
	var n := b.norms[i0] + b.norms[i1] + b.norms[i2]
	if c.dot(n) > 0.0:
		b.idx.append_array([i0, i2, i1])
	else:
		b.idx.append_array([i0, i1, i2])


static var _TANGENT := PackedFloat32Array([1.0, 0.0, 0.0, 1.0])


## Sommet des primitives courbes (tangente constante : les shaders du décor
## travaillent en coordonnées monde et ne l'utilisent pas).
func _vert(b: Batch, p: Vector3, n: Vector3, uv: Vector2 = Vector2.ZERO) -> int:
	b.verts.append(p)
	b.norms.append(n)
	b.tangents.append_array(_TANGENT)
	b.uvs.append(uv)
	return b.verts.size() - 1


## Grille de sommets (rows + 1) × (cols + 1) déjà ajoutés à partir de « start ».
func _grid(b: Batch, start: int, rows: int, cols: int) -> void:
	for r in rows:
		for c in cols:
			var i0 := start + r * (cols + 1) + c
			var i2 := i0 + cols + 1
			_tri(b, i0, i0 + 1, i2)
			_tri(b, i0 + 1, i2 + 1, i2)


## Sphère, ou ellipsoïde (opts.scale), centrée en « center ».
## opts : basis, scale (Vector3), segments, rings, shadow.
func sphere(zone: String, mat: String, center: Vector3, radius: float, opts: Dictionary = {}) -> void:
	var seg: int = int(opts.get("segments", 12))
	var rings: int = int(opts.get("rings", 8))
	var sc: Vector3 = opts.get("scale", Vector3.ONE)
	var basis: Basis = opts.get("basis", Basis.IDENTITY)
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var start := b.verts.size()
	for r in rings + 1:
		var phi := PI * float(r) / float(rings)
		for s in seg + 1:
			var th := TAU * float(s) / float(seg)
			var n := Vector3(sin(phi) * cos(th), cos(phi), sin(phi) * sin(th))
			_vert(b, center + basis * (n * sc * radius), (basis * (n / sc)).normalized(),
				Vector2(th * radius, phi * radius))
	_grid(b, start, rings, seg)


## Tore (pneus, mains courantes, anneaux) : axe de révolution « axis ».
## opts : segments (autour de l'axe), sides (autour du tube), shadow, arc (radians).
func torus(zone: String, mat: String, center: Vector3, axis: Vector3, major: float, minor: float,
		opts: Dictionary = {}) -> void:
	var seg: int = int(opts.get("segments", 20))
	var sides: int = int(opts.get("sides", 8))
	var arc: float = float(opts.get("arc", TAU))
	var a := axis.normalized()
	var u := a.cross(Vector3.UP if absf(a.y) < 0.95 else Vector3.RIGHT).normalized()
	var v := a.cross(u).normalized()
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var start := b.verts.size()
	for i in seg + 1:
		var th := arc * float(i) / float(seg)
		var e := u * cos(th) + v * sin(th)
		for j in sides + 1:
			var ph := TAU * float(j) / float(sides)
			var n := e * cos(ph) + a * sin(ph)
			_vert(b, center + e * major + n * minor, n, Vector2(th * major, ph * minor))
	_grid(b, start, seg, sides)


## Boîte aux arêtes chanfreinées (normales adoucies : les arêtes paraissent
## arrondies). opts : basis, rot, collide, nav, shadow.
func rbox(zone: String, mat: String, center: Vector3, size: Vector3, bevel: float, opts: Dictionary = {}) -> void:
	var basis: Basis = opts.get("basis", Basis(Vector3.UP, float(opts.get("rot", 0.0))))
	var xf := Transform3D(basis, center)
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var h := size * 0.5
	var bv := minf(bevel, minf(h.x, minf(h.y, h.z)) * 0.95)
	var hi := h - Vector3(bv, bv, bv)
	var axes := [Vector3.RIGHT, Vector3.UP, Vector3.BACK]
	var nb := basis.inverse().transposed()
	# Faces
	for ai in 3:
		for sgn in [-1.0, 1.0]:
			var n: Vector3 = axes[ai] * sgn
			var ua: Vector3 = axes[(ai + 1) % 3]
			var va: Vector3 = axes[(ai + 2) % 3]
			var hu: float = hi[(ai + 1) % 3]
			var hv: float = hi[(ai + 2) % 3]
			var c: Vector3 = n * h[ai]
			var wn := (nb * n).normalized()
			var s0 := b.verts.size()
			for k in [[-1, -1], [1, -1], [1, 1], [-1, 1]]:
				_vert(b, xf * (c + ua * hu * float(k[0]) + va * hv * float(k[1])), wn)
			_tri(b, s0, s0 + 1, s0 + 2)
			_tri(b, s0, s0 + 2, s0 + 3)
	if bv <= 0.0005:
		_rbox_collide(zone, xf, size, opts)
		return
	# Arêtes : bande entre deux faces voisines (normales de chaque face)
	for ai in 3:
		var e: Vector3 = axes[ai]
		var he: float = hi[ai]
		var a1: int = (ai + 1) % 3
		var a2: int = (ai + 2) % 3
		for s1 in [-1.0, 1.0]:
			for s2 in [-1.0, 1.0]:
				var n1: Vector3 = axes[a1] * s1
				var n2: Vector3 = axes[a2] * s2
				var p_face1 := n1 * h[a1] + n2 * hi[a2]
				var p_face2 := n1 * hi[a1] + n2 * h[a2]
				var s0 := b.verts.size()
				var w1 := (nb * n1).normalized()
				var w2 := (nb * n2).normalized()
				_vert(b, xf * (p_face1 - e * he), w1)
				_vert(b, xf * (p_face1 + e * he), w1)
				_vert(b, xf * (p_face2 + e * he), w2)
				_vert(b, xf * (p_face2 - e * he), w2)
				_tri(b, s0, s0 + 1, s0 + 2)
				_tri(b, s0, s0 + 2, s0 + 3)
	# Coins
	for sx in [-1.0, 1.0]:
		for sy in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				var corner := Vector3(hi.x * sx, hi.y * sy, hi.z * sz)
				var s0 := b.verts.size()
				_vert(b, xf * (corner + Vector3(bv * sx, 0, 0)), (nb * Vector3(sx, 0, 0)).normalized())
				_vert(b, xf * (corner + Vector3(0, bv * sy, 0)), (nb * Vector3(0, sy, 0)).normalized())
				_vert(b, xf * (corner + Vector3(0, 0, bv * sz)), (nb * Vector3(0, 0, sz)).normalized())
				_tri(b, s0, s0 + 1, s0 + 2)
	_rbox_collide(zone, xf, size, opts)


func _rbox_collide(zone: String, xf: Transform3D, size: Vector3, opts: Dictionary) -> void:
	if opts.get("collide", false):
		add_collision_box(zone, xf, size)
		if opts.get("nav", true):
			_record_obstacle(xf, size)


## Surface de révolution autour de l'axe Y local de « xf » : profil de points
## (rayon, hauteur). Normales lissées sauf aux angles vifs (opts.smooth,
## degrés). Un profil qui commence ou finit sur l'axe (rayon 0) est fermé.
## opts : segments, smooth, shadow, arc.
func lathe(zone: String, mat: String, xf: Transform3D, profile: PackedVector2Array, opts: Dictionary = {}) -> void:
	var seg: int = int(opts.get("segments", 16))
	var arc: float = float(opts.get("arc", TAU))
	var smooth: float = deg_to_rad(float(opts.get("smooth", 40.0)))
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var nb := xf.basis.inverse().transposed()
	# Anneaux : [point du profil, normale 2D] (doublés aux angles vifs)
	var rings: Array = []
	var n_pts := profile.size()
	for k in n_pts:
		var p := profile[k]
		var d_in := (p - profile[k - 1]).normalized() if k > 0 else Vector2.ZERO
		var d_out := (profile[k + 1] - p).normalized() if k < n_pts - 1 else Vector2.ZERO
		if d_in == Vector2.ZERO:
			d_in = d_out
		if d_out == Vector2.ZERO:
			d_out = d_in
		# Normale 2D : à droite du sens de parcours (le profil monte le long de l'axe, rayon > 0)
		var n_in := Vector2(d_in.y, -d_in.x)
		var n_out := Vector2(d_out.y, -d_out.x)
		if d_in.angle_to(d_out) > smooth or d_in.angle_to(d_out) < -smooth:
			rings.append([p, n_in])
			rings.append([p, n_out])
		else:
			rings.append([p, (n_in + n_out).normalized()])
	var start := b.verts.size()
	for ring in rings:
		var p: Vector2 = ring[0]
		var n2: Vector2 = ring[1]
		for i in seg + 1:
			var th := arc * float(i) / float(seg)
			var dir := Vector3(cos(th), 0.0, sin(th))
			var n := dir * n2.x + Vector3.UP * n2.y
			_vert(b, xf * (dir * p.x + Vector3.UP * p.y), (nb * n).normalized(), Vector2(th * p.x, p.y))
	_grid(b, start, rings.size() - 1, seg)


## Prisme extrudé le long de l'axe X local de « xf », de x0 à x1, à partir d'un
## profil (z, y) (silhouette de véhicule, montants…). opts : bevel (chanfrein
## des deux faces), smooth (degrés : angles du profil lissés en dessous),
## caps (bool), shadow.
func extrude_x(zone: String, mat: String, xf: Transform3D, poly: PackedVector2Array, x0: float, x1: float,
		opts: Dictionary = {}) -> void:
	var pts := poly.duplicate()
	# Sens trigonométrique dans le plan (z, y)
	var area := 0.0
	for k in pts.size():
		var q0 := pts[k]
		var q1 := pts[(k + 1) % pts.size()]
		area += q0.x * q1.y - q1.x * q0.y
	if area < 0.0:
		pts.reverse()
	var n_pts := pts.size()
	var bv: float = minf(float(opts.get("bevel", 0.0)), (x1 - x0) * 0.45)
	var smooth: float = deg_to_rad(float(opts.get("smooth", 30.0)))
	var b := _batch(zone, mat, bool(opts.get("shadow", true)))
	var nb := xf.basis.inverse().transposed()
	# Normales des arêtes et des sommets
	var edge_n: Array = []
	for k in n_pts:
		var d := (pts[(k + 1) % n_pts] - pts[k]).normalized()
		edge_n.append(Vector2(d.y, -d.x))
	var vert_n: Array = []   # [normale avant le sommet, normale après]
	var inset := PackedVector2Array()
	for k in n_pts:
		var na: Vector2 = edge_n[k - 1 if k > 0 else n_pts - 1]
		var nbv: Vector2 = edge_n[k]
		var avg := (na + nbv).normalized()
		if absf(na.angle_to(nbv)) <= smooth:
			vert_n.append([avg, avg])
		else:
			vert_n.append([na, nbv])
		var miter := avg / maxf(avg.dot(nbv), 0.5)
		inset.append(pts[k] - miter * bv)
	var xa := x0 + bv
	var xb := x1 - bv
	# Flancs
	for k in n_pts:
		var k2 := (k + 1) % n_pts
		var n0: Vector2 = vert_n[k][1]
		var n1: Vector2 = vert_n[k2][0]
		var s0 := b.verts.size()
		for q in [[pts[k], n0, xa], [pts[k2], n1, xa], [pts[k2], n1, xb], [pts[k], n0, xb]]:
			var p2: Vector2 = q[0]
			var n2: Vector2 = q[1]
			_vert(b, xf * Vector3(float(q[2]), p2.y, p2.x), (nb * Vector3(0, n2.y, n2.x)).normalized())
		_tri(b, s0, s0 + 1, s0 + 2)
		_tri(b, s0, s0 + 2, s0 + 3)
	if not opts.get("caps", true):
		return
	var tris := Geometry2D.triangulate_polygon(inset) if bv > 0.0 else PackedInt32Array()
	var cap := inset
	if tris.is_empty():
		cap = pts
		tris = Geometry2D.triangulate_polygon(pts)
	for side in [-1.0, 1.0]:
		var xc := x0 if side < 0.0 else x1
		var xe := xa if side < 0.0 else xb
		var wn := (nb * Vector3(side, 0, 0)).normalized()
		# Chanfrein : du profil complet (normale du flanc) au profil rentré (normale de la face)
		if cap == inset and bv > 0.0:
			for k in n_pts:
				var k2 := (k + 1) % n_pts
				var s1 := b.verts.size()
				var n0: Vector2 = vert_n[k][1]
				var n1: Vector2 = vert_n[k2][0]
				_vert(b, xf * Vector3(xe, pts[k].y, pts[k].x), (nb * Vector3(0, n0.y, n0.x)).normalized())
				_vert(b, xf * Vector3(xe, pts[k2].y, pts[k2].x), (nb * Vector3(0, n1.y, n1.x)).normalized())
				_vert(b, xf * Vector3(xc, cap[k2].y, cap[k2].x), wn)
				_vert(b, xf * Vector3(xc, cap[k].y, cap[k].x), wn)
				_tri(b, s1, s1 + 1, s1 + 2)
				_tri(b, s1, s1 + 2, s1 + 3)
		else:
			xc = xe
		var s2 := b.verts.size()
		for k in n_pts:
			_vert(b, xf * Vector3(xc, cap[k].y, cap[k].x), wn)
		for t in range(0, tris.size(), 3):
			_tri(b, s2 + tris[t], s2 + tris[t + 1], s2 + tris[t + 2])


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
			if collide_default:
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
	_dispatch_obstacles()
	for key in _batches:
		var b: Batch = _batches[key]
		if b.verts.is_empty():
			continue
		var mesh := ArrayMesh.new()
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, _arrays(b))
		mesh.surface_set_material(0, Mats.get_mat(b.mat))
		var mi := MeshInstance3D.new()
		mi.name = "Mesh_%s" % b.mat
		mi.mesh = mesh
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if b.shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		zone_root(b.zone).add_child(mi)
	_batches.clear()
	# Accessoires instanciés
	for sk in _stamps:
		var st: Dictionary = _stamps[sk]
		var xfs: Array = st.xfs
		var meshes: Array = templates[st.key]
		for slot in 2:
			if meshes[slot] == null:
				continue
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.mesh = meshes[slot]
			mm.instance_count = xfs.size()
			for i in xfs.size():
				mm.set_instance_transform(i, xfs[i])
			var mmi := MultiMeshInstance3D.new()
			mmi.name = "Props_%s" % String(st.key).replace("|", "_")
			mmi.multimesh = mm
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if slot == 0 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			zone_root(st.zone).add_child(mmi)
	_stamps.clear()

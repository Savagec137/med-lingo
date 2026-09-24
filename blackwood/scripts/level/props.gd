class_name Props
extends RefCounted
## Accessoires de décor construits en primitives et fusionnés par Geo.
## Chaque fonction reçoit une position au sol et une rotation autour de Y.
## Les accessoires complexes reçoivent une collision simplifiée (Geo.solid).


static func _xf(pos: Vector3, rot: float) -> Transform3D:
	return Transform3D(Basis(Vector3.UP, rot), pos)


## Boîte en coordonnées locales à l'accessoire (sans collision par défaut).
static func _b(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, s: Vector3,
		collide: bool = false, extra: Basis = Basis.IDENTITY) -> void:
	g.box(zone, mat, xf * c, s, {"basis": xf.basis * extra, "collide": collide})


static func _c(g: Geo, zone: String, mat: String, xf: Transform3D, a: Vector3, b: Vector3, r: float,
		opts: Dictionary = {}) -> void:
	g.cylinder(zone, mat, xf * a, xf * b, r, opts)


static func _solid(g: Geo, zone: String, xf: Transform3D, c: Vector3, s: Vector3, nav: bool = true) -> void:
	g.solid(zone, xf * c, s, xf.basis, nav)


static func _rng(pos: Vector3) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = hash(Vector3i(int(pos.x * 10.0), int(pos.y * 10.0), int(pos.z * 10.0)))
	return r


## Boîte chanfreinée en coordonnées locales (arêtes adoucies).
static func _r(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, s: Vector3, bevel: float,
		extra: Basis = Basis.IDENTITY, shadow: bool = true) -> void:
	g.rbox(zone, mat, xf * c, s, bevel, {"basis": xf.basis * extra, "shadow": shadow})


## Sphère ou ellipsoïde (scale) en coordonnées locales.
static func _s(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, r: float,
		scale: Vector3 = Vector3.ONE, extra: Basis = Basis.IDENTITY, opts: Dictionary = {}) -> void:
	var o := {"basis": xf.basis * extra, "scale": scale}
	o.merge(opts, true)
	g.sphere(zone, mat, xf * c, r, o)


## Tore d'axe local « axis ».
static func _t(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, axis: Vector3, major: float,
		minor: float, opts: Dictionary = {}) -> void:
	g.torus(zone, mat, xf * c, xf.basis * axis, major, minor, opts)


## Surface de révolution : profil (rayon, hauteur) autour de l'axe local
## « axis » passant par « c ».
static func _l(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, axis: Vector3,
		profile: PackedVector2Array, opts: Dictionary = {}) -> void:
	var a := axis.normalized()
	var basis := Basis(Quaternion(Vector3.UP, a)) if a.dot(Vector3.UP) > -0.999 else Basis(Vector3.RIGHT, PI)
	g.lathe(zone, mat, xf * Transform3D(basis, c), profile, opts)


## Tube coudé passant par une suite de points locaux (cadres, poignées).
static func _tube(g: Geo, zone: String, mat: String, xf: Transform3D, pts: Array, r: float,
		opts: Dictionary = {}) -> void:
	var o := {"segments": 8}
	o.merge(opts, true)
	for i in pts.size() - 1:
		g.cylinder(zone, mat, xf * (pts[i] as Vector3), xf * (pts[i + 1] as Vector3), r, o)
	for i in range(1, pts.size() - 1):
		g.sphere(zone, mat, xf * (pts[i] as Vector3), r, {"segments": 8, "rings": 4, "shadow": o.get("shadow", true)})


## Roue d'axe X local, face extérieure du côté « side » (±1).
## style : « car » (jante alliage), « van » (jante tôle), « chair » (fauteuil
## roulant : rayons et main courante).
static func wheel(g: Geo, zone: String, xf: Transform3D, c: Vector3, radius: float, width: float,
		side: float, style: String = "car") -> void:
	var ax := Vector3(side, 0, 0)
	var hw := width * 0.5
	if style == "chair":
		_t(g, zone, "tire", xf, c, ax, radius - 0.017, 0.017, {"segments": 30, "sides": 8})
		_t(g, zone, "metal_chrome", xf, c, ax, radius - 0.04, 0.008, {"segments": 30, "sides": 6})
		_c(g, zone, "metal_chrome", xf, c - ax * 0.035, c + ax * 0.03, 0.026, {"segments": 10})
		for i in 16:
			var a := TAU * float(i) / 16.0
			var d := Vector3(0, cos(a), sin(a))
			var off := ax * (0.024 if i % 2 == 0 else -0.024)
			_c(g, zone, "metal_chrome", xf, c + off, c + d * (radius - 0.045), 0.0022,
				{"segments": 4, "caps": false, "shadow": false})
		# Main courante et ses pattes
		var hr := radius - 0.03
		_t(g, zone, "metal_chrome", xf, c + ax * 0.05, ax, hr, 0.009, {"segments": 30, "sides": 6})
		for i in 5:
			var a2 := TAU * float(i) / 5.0 + 0.3
			var d2 := Vector3(0, cos(a2), sin(a2)) * hr
			_c(g, zone, "metal_chrome", xf, c + d2 + ax * 0.012, c + d2 + ax * 0.05, 0.005, {"segments": 5, "shadow": false})
		return
	var rim := radius * (0.62 if style == "car" else 0.56)
	# Pneu : flancs arrondis, bande de roulement (profil le long de l'axe, +y vers l'extérieur)
	var tp := PackedVector2Array([Vector2(rim, -hw * 0.88), Vector2(rim + (radius - rim) * 0.45, -hw),
		Vector2(radius - 0.03, -hw * 0.94), Vector2(radius, -hw * 0.7), Vector2(radius, hw * 0.7),
		Vector2(radius - 0.03, hw * 0.94), Vector2(rim + (radius - rim) * 0.45, hw), Vector2(rim, hw * 0.88)])
	_l(g, zone, "tire", xf, c, ax, tp, {"segments": 24, "smooth": 55.0})
	# Jante : voile creusé vers l'intérieur, moyeu
	var face := hw * 0.8
	var rp := PackedVector2Array([Vector2(rim, face), Vector2(rim * 0.96, face * 0.55), Vector2(rim * 0.35, face * 0.3),
		Vector2(rim * 0.24, face * 0.62), Vector2(0.0, face * 0.66)])
	_l(g, zone, "metal_dark" if style == "car" else "metal_gray", xf, c, ax, rp, {"segments": 20, "smooth": 50.0})
	_t(g, zone, "metal_alu" if style == "car" else "metal_gray", xf, c + ax * face * 0.95, ax, rim - 0.012, 0.014,
		{"segments": 24, "sides": 6})
	if style == "car":
		# Cinq branches
		for i in 5:
			var a3 := TAU * float(i) / 5.0
			var d3 := Vector3(0, cos(a3), sin(a3))
			var mid := c + ax * face * 0.62 + d3 * rim * 0.58
			var basis := Basis(Vector3.RIGHT, a3)
			_r(g, zone, "metal_alu", xf, mid, Vector3(0.035, rim * 0.78, 0.055), 0.012, basis)
		_s(g, zone, "metal_alu", xf, c + ax * face * 0.62, rim * 0.26, Vector3(0.45, 1, 1), Basis.IDENTITY,
			{"segments": 12, "rings": 6})
	else:
		# Enjoliveur et trous d'aération
		_s(g, zone, "metal_chrome", xf, c + ax * face * 0.6, rim * 0.34, Vector3(0.35, 1, 1), Basis.IDENTITY,
			{"segments": 14, "rings": 6})
		for i in 6:
			var a4 := TAU * float(i) / 6.0
			var p4 := c + ax * face * 0.42 + Vector3(0, cos(a4), sin(a4)) * rim * 0.64
			_c(g, zone, "black", xf, p4 - ax * 0.01, p4 + ax * 0.012, rim * 0.1, {"segments": 8, "shadow": false})


## Roulette pivotante posée au sol en « p » (coordonnées locales) ; tige jusqu'à
## la hauteur « top ».
static func caster(g: Geo, zone: String, xf: Transform3D, p: Vector3, r: float, w: float, top: float,
		mat: String = "plastic_black", fork_mat: String = "metal_chrome") -> void:
	var c := p + Vector3(0, r, 0.025)
	var hw := w * 0.5
	_l(g, zone, mat, xf, c, Vector3.RIGHT, PackedVector2Array([Vector2(0.0, -hw), Vector2(r * 0.78, -hw),
		Vector2(r, -hw * 0.45), Vector2(r, hw * 0.45), Vector2(r * 0.78, hw), Vector2(0.0, hw)]), {"segments": 14, "smooth": 50.0})
	var fork_h := r * 1.25
	for s in [-1.0, 1.0]:
		_b(g, zone, fork_mat, xf, Vector3(p.x + s * (hw + 0.005), c.y + r * 0.3, p.z + 0.012), Vector3(0.005, fork_h, 0.028))
	_b(g, zone, fork_mat, xf, Vector3(p.x, c.y + r * 0.3 + fork_h * 0.5, p.z + 0.012), Vector3(w + 0.016, 0.01, 0.034))
	if top > c.y + r:
		_c(g, zone, fork_mat, xf, Vector3(p.x, c.y + r * 0.3 + fork_h * 0.5, p.z), Vector3(p.x, top, p.z), 0.008,
			{"segments": 6})


# --- Mobilier de bureau -------------------------------------------------

static func desk(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "wood_desk",
		w: float = 1.4, d: float = 0.7) -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "desk|%s|%.2f|%.2f" % [mat, w, d], xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_desk(tg, tz, txf, mat, w, d))
	_solid(g, zone, xf, Vector3(0, 0.38, 0), Vector3(w, 0.76, d))


static func _geo_desk(g: Geo, zone: String, xf: Transform3D, mat: String, w: float, d: float) -> void:
	_r(g, zone, mat, xf, Vector3(0, 0.74, 0), Vector3(w, 0.04, d), 0.01)
	_r(g, zone, mat, xf, Vector3(-w * 0.5 + 0.03, 0.36, 0), Vector3(0.04, 0.72, d - 0.04), 0.008)
	_r(g, zone, mat, xf, Vector3(w * 0.5 - 0.22, 0.36, 0), Vector3(0.42, 0.72, d - 0.04), 0.008)
	_r(g, zone, mat, xf, Vector3(0, 0.5, d * 0.5 - 0.04), Vector3(w - 0.1, 0.44, 0.02), 0.005)
	for i in 3:
		var y := 0.6 - i * 0.22
		_r(g, zone, mat, xf, Vector3(w * 0.5 - 0.22, y, -d * 0.5 + 0.01), Vector3(0.38, 0.19, 0.012), 0.004)
		_r(g, zone, "metal_chrome", xf, Vector3(w * 0.5 - 0.22, y + 0.04, -d * 0.5 - 0.008), Vector3(0.12, 0.015, 0.015), 0.005)


## Siège de bureau : piétement cinq branches à roulettes, vérin, assise et
## dossier rembourrés, accoudoirs. « tipped » : renversé sur le dos.
static func office_chair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, tipped: bool = false) -> void:
	var xf := _xf(pos, rot)
	if tipped:
		xf = xf * Transform3D(Basis(Vector3.RIGHT, PI / 2.0), Vector3(0, 0.36, 0))
	g.stamp(zone, "office_chair", xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_office_chair(tg, tz, txf))
	if not tipped:
		_solid(g, zone, xf, Vector3(0, 0.45, 0.05), Vector3(0.5, 0.9, 0.5), false)


static func _geo_office_chair(g: Geo, zone: String, xf: Transform3D) -> void:
	# Piétement et roulettes
	for i in 5:
		var a := TAU * float(i) / 5.0 + 0.31
		var d := Vector3(sin(a), 0, cos(a))
		_r(g, zone, "plastic_black", xf, d * 0.155 + Vector3(0, 0.1, 0), Vector3(0.045, 0.034, 0.3), 0.012,
			Basis(Vector3.UP, a) * Basis(Vector3.RIGHT, 0.09))
		caster(g, zone, xf, d * 0.3, 0.028, 0.034, 0.085, "plastic_black", "plastic_black")
	_s(g, zone, "plastic_black", xf, Vector3(0, 0.1, 0), 0.062, Vector3(1, 0.55, 1), Basis.IDENTITY, {"segments": 12, "rings": 6})
	# Vérin à gaz : fourreau et tige chromée
	_c(g, zone, "plastic_black", xf, Vector3(0, 0.1, 0), Vector3(0, 0.29, 0), 0.028, {"radius_b": 0.024, "segments": 12})
	_c(g, zone, "metal_chrome", xf, Vector3(0, 0.29, 0), Vector3(0, 0.43, 0), 0.015, {"segments": 10})
	# Mécanisme et manette
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.44, 0.0), Vector3(0.2, 0.045, 0.24), 0.012)
	_c(g, zone, "plastic_black", xf, Vector3(0.09, 0.44, -0.06), Vector3(0.21, 0.43, -0.1), 0.006, {"segments": 6})
	# Assise : coque et coussin
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.475, 0), Vector3(0.47, 0.025, 0.45), 0.01)
	_r(g, zone, "fabric_office", xf, Vector3(0, 0.515, -0.005), Vector3(0.5, 0.075, 0.48), 0.032)
	# Lame de dossier et dossier
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.445, 0.2), Vector3(0.07, 0.022, 0.2), 0.008)
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.6, 0.305), Vector3(0.07, 0.3, 0.022), 0.008, Basis(Vector3.RIGHT, 0.1))
	var back := Basis(Vector3.RIGHT, 0.13)
	_r(g, zone, "fabric_office", xf, Vector3(0, 0.9, 0.3), Vector3(0.45, 0.5, 0.075), 0.032, back)
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.9, 0.3) + back * Vector3(0, 0, 0.042), Vector3(0.43, 0.48, 0.02), 0.009, back)
	# Accoudoirs
	for s in [-1.0, 1.0]:
		_r(g, zone, "plastic_black", xf, Vector3(s * 0.2, 0.455, 0.04), Vector3(0.14, 0.02, 0.05), 0.006)
		_r(g, zone, "plastic_black", xf, Vector3(s * 0.268, 0.565, 0.04), Vector3(0.028, 0.2, 0.05), 0.009)
		_r(g, zone, "plastic_black", xf, Vector3(s * 0.268, 0.675, 0.0), Vector3(0.07, 0.03, 0.26), 0.013)


static func chair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "metal_gray",
		seat_mat: String = "plastic_orange") -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "chair|%s|%s" % [mat, seat_mat], xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_chair(tg, tz, txf, mat, seat_mat))
	_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.46, 0.9, 0.46), false)


static func _geo_chair(g: Geo, zone: String, xf: Transform3D, mat: String, seat_mat: String) -> void:
	for x in [-0.2, 0.2]:
		# Pied avant ; pied arrière prolongé en montant de dossier
		_tube(g, zone, mat, xf, [Vector3(x, 0.02, -0.2), Vector3(x, 0.44, -0.18)], 0.011)
		_tube(g, zone, mat, xf, [Vector3(x, 0.02, 0.21), Vector3(x, 0.44, 0.19), Vector3(x, 0.9, 0.25)], 0.011)
		_c(g, zone, mat, xf, Vector3(x, 0.43, -0.18), Vector3(x, 0.43, 0.19), 0.009, {"segments": 6})
		for z in [-0.2, 0.21]:
			_c(g, zone, "plastic_black", xf, Vector3(x, 0.0, z), Vector3(x, 0.025, z), 0.013, {"segments": 8})
	_c(g, zone, mat, xf, Vector3(-0.2, 0.2, 0.2), Vector3(0.2, 0.2, 0.2), 0.008, {"segments": 6})
	_r(g, zone, seat_mat, xf, Vector3(0, 0.455, 0), Vector3(0.44, 0.03, 0.42), 0.012)
	_r(g, zone, seat_mat, xf, Vector3(0, 0.76, 0.232), Vector3(0.43, 0.25, 0.025), 0.01, Basis(Vector3.RIGHT, 0.13))


static func bench_row(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, n: int = 4,
		seat_mat: String = "fabric_blue") -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "bench|%d|%s" % [n, seat_mat], xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_bench_row(tg, tz, txf, n, seat_mat))
	_solid(g, zone, xf, Vector3(0, 0.45, 0.05), Vector3(n * 0.56, 0.9, 0.55))


static func _geo_bench_row(g: Geo, zone: String, xf: Transform3D, n: int, seat_mat: String) -> void:
	var w := n * 0.56
	# Poutre porteuse et pieds
	_r(g, zone, "metal_dark", xf, Vector3(0, 0.3, 0.06), Vector3(w, 0.07, 0.07), 0.015)
	for x in [-w * 0.5 + 0.12, w * 0.5 - 0.12]:
		_r(g, zone, "metal_dark", xf, Vector3(x, 0.15, 0.06), Vector3(0.05, 0.3, 0.06), 0.01)
		_r(g, zone, "metal_dark", xf, Vector3(x, 0.015, 0.06), Vector3(0.07, 0.03, 0.5), 0.01)
	for i in n:
		var x := -w * 0.5 + 0.28 + i * 0.56
		_r(g, zone, "metal_dark", xf, Vector3(x, 0.37, 0.06), Vector3(0.04, 0.12, 0.3), 0.008)
		_r(g, zone, seat_mat, xf, Vector3(x, 0.45, 0), Vector3(0.5, 0.07, 0.46), 0.025)
		_r(g, zone, seat_mat, xf, Vector3(x, 0.76, 0.23), Vector3(0.5, 0.44, 0.06), 0.025, Basis(Vector3.RIGHT, 0.1))
		if i > 0:
			# Accoudoir entre deux sièges
			_r(g, zone, "plastic_black", xf, Vector3(x - 0.28, 0.62, 0.02), Vector3(0.05, 0.03, 0.34), 0.01)
			_r(g, zone, "metal_dark", xf, Vector3(x - 0.28, 0.54, 0.1), Vector3(0.03, 0.15, 0.03), 0.006)


static func table(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, w: float = 1.2, d: float = 0.8,
		h: float = 0.75, mat: String = "wood_light", leg_mat: String = "metal_gray") -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, h - 0.02, 0), Vector3(w, 0.04, d))
	for x in [-w * 0.5 + 0.06, w * 0.5 - 0.06]:
		for z in [-d * 0.5 + 0.06, d * 0.5 - 0.06]:
			_c(g, zone, leg_mat, xf, Vector3(x, 0, z), Vector3(x, h - 0.04, z), 0.02, {"caps": false, "segments": 6})
	_solid(g, zone, xf, Vector3(0, h * 0.5, 0), Vector3(w, h, d))


static func shelf(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, w: float = 1.2, h: float = 2.0,
		d: float = 0.45, fill: float = 0.8, mat: String = "metal_gray") -> void:
	var xf := _xf(pos, rot)
	var rng := _rng(pos)
	for x in [-w * 0.5 + 0.02, w * 0.5 - 0.02]:
		_b(g, zone, mat, xf, Vector3(x, h * 0.5, 0), Vector3(0.04, h, d))
	var levels := 5
	for i in levels:
		var y := 0.08 + i * (h - 0.12) / (levels - 1)
		_b(g, zone, mat, xf, Vector3(0, y, 0), Vector3(w - 0.04, 0.025, d))
		if i == levels - 1:
			continue
		var x := -w * 0.5 + 0.06
		while x < w * 0.5 - 0.12:
			var bw := rng.randf_range(0.08, 0.4)
			if x + bw > w * 0.5 - 0.05:
				break
			if rng.randf() < fill:
				var kind := rng.randi() % 3
				var bh := rng.randf_range(0.18, (h - 0.12) / (levels - 1) - 0.06)
				var m := ["cardboard", "paper", "plastic_beige"][kind] as String
				if kind == 1:
					# Classeurs serrés
					bh = rng.randf_range(0.25, 0.32)
					m = ["fabric_blue", "fabric_green", "fabric_brown", "plastic_dark"][rng.randi() % 4]
				var tilt := Basis(Vector3.FORWARD, rng.randf_range(-0.05, 0.05)) if kind == 1 else Basis.IDENTITY
				_b(g, zone, m, xf, Vector3(x + bw * 0.5, y + 0.0125 + bh * 0.5, rng.randf_range(-0.03, 0.03)), Vector3(bw - 0.01, bh, d * rng.randf_range(0.6, 0.9)), false, tilt)
			x += bw + rng.randf_range(0.0, 0.06)
	_solid(g, zone, xf, Vector3(0, h * 0.5, 0), Vector3(w, h, d))


static func filing_cabinet(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, h: float = 1.32,
		mat: String = "metal_gray", open_drawer: int = -1) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, h * 0.5, 0), Vector3(0.47, h, 0.62))
	var n := 4
	for i in n:
		var y := h - (i + 0.5) * h / n
		var dz := -0.31 - (0.25 if i == open_drawer else 0.0)
		_b(g, zone, mat, xf, Vector3(0, y, dz), Vector3(0.43, h / n - 0.03, 0.02))
		_b(g, zone, "metal_steel", xf, Vector3(0, y + 0.06, dz - 0.015), Vector3(0.12, 0.02, 0.02))
		_b(g, zone, "paper", xf, Vector3(0, y + 0.07, dz - 0.012), Vector3(0.08, 0.04, 0.005))
		if i == open_drawer:
			_b(g, zone, mat, xf, Vector3(-0.2, y, -0.2), Vector3(0.02, h / n - 0.06, 0.3))
			_b(g, zone, mat, xf, Vector3(0.2, y, -0.2), Vector3(0.02, h / n - 0.06, 0.3))
			_b(g, zone, "paper", xf, Vector3(0, y + 0.02, -0.2), Vector3(0.36, h / n - 0.1, 0.25))
	_solid(g, zone, xf, Vector3(0, h * 0.5, 0), Vector3(0.47, h, 0.62))


static func lockers(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, n: int = 3,
		mat: String = "metal_green", open_index: int = -1) -> void:
	var xf := _xf(pos, rot)
	var w := 0.42
	for i in n:
		var x := (i - (n - 1) * 0.5) * w
		_b(g, zone, mat, xf, Vector3(x, 0.95, 0.02), Vector3(w - 0.01, 1.9, 0.46))
		if i == open_index:
			_b(g, zone, "black", xf, Vector3(x, 0.95, -0.2), Vector3(w - 0.06, 1.8, 0.01))
			_b(g, zone, mat, xf, Vector3(x - w * 0.5 - 0.15, 0.95, -0.4), Vector3(0.02, 1.8, w - 0.04), false, Basis(Vector3.UP, 1.2))
		else:
			_b(g, zone, mat, xf, Vector3(x, 0.95, -0.215), Vector3(w - 0.05, 1.82, 0.015))
			for j in 4:
				_b(g, zone, "black", xf, Vector3(x, 1.62 - j * 0.05, -0.224), Vector3(w - 0.16, 0.012, 0.004))
			_b(g, zone, "metal_steel", xf, Vector3(x + w * 0.3, 1.0, -0.23), Vector3(0.025, 0.12, 0.02))
	_solid(g, zone, xf, Vector3(0, 0.95, 0.02), Vector3(w * n, 1.9, 0.48))


static func bookcase(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, w: float = 1.0) -> void:
	shelf(g, zone, pos, rot, w, 2.1, 0.35, 0.9, "wood_desk")


# --- Médical --------------------------------------------------------------

static func hospital_bed(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, stained: bool = false,
		unmade: bool = true) -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "bed|%s|%s" % [stained, unmade], xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_hospital_bed(tg, tz, txf, stained, unmade))
	# Collision à hauteur du matelas : les objets posés dessus restent visibles et atteignables.
	_solid(g, zone, xf, Vector3(0, 0.33, 0), Vector3(0.95, 0.66, 2.05))


static func _geo_hospital_bed(g: Geo, zone: String, xf: Transform3D, stained: bool, unmade: bool) -> void:
	# Base roulante carénée et vérins
	for x in [-0.36, 0.36]:
		for z in [-0.86, 0.86]:
			caster(g, zone, xf, Vector3(x, 0, z), 0.055, 0.04, 0.16, "tire", "metal_chrome")
	_r(g, zone, "plastic_beige", xf, Vector3(0, 0.2, 0), Vector3(0.8, 0.09, 1.86), 0.035)
	for z in [-0.5, 0.5]:
		_c(g, zone, "metal_chrome", xf, Vector3(0, 0.24, z), Vector3(0, 0.46, z), 0.035, {"segments": 10})
	# Sommier
	_r(g, zone, "metal_steel", xf, Vector3(0, 0.49, 0), Vector3(0.9, 0.06, 1.98), 0.02)
	# Matelas, drap, oreiller
	_r(g, zone, "mattress", xf, Vector3(0, 0.595, 0.02), Vector3(0.86, 0.15, 1.92), 0.055)
	_r(g, zone, "linen", xf, Vector3(0, 0.672, 0.2), Vector3(0.87, 0.012, 1.5), 0.005)
	_s(g, zone, "linen", xf, Vector3(0, 0.72, 0.74), 0.3, Vector3(1.05, 0.22, 0.55), Basis(Vector3.RIGHT, -0.15),
		{"segments": 14, "rings": 7})
	# Tête et pied de lit, poignée découpée
	_r(g, zone, "plastic_beige", xf, Vector3(0, 0.83, 1.01), Vector3(0.96, 0.6, 0.05), 0.024)
	_r(g, zone, "plastic_beige", xf, Vector3(0, 0.73, -1.01), Vector3(0.96, 0.42, 0.05), 0.024)
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.87, -1.037), Vector3(0.36, 0.05, 0.01), 0.004)
	# Barrières latérales côté tête (panneaux ajourés)
	for s in [-1.0, 1.0]:
		_r(g, zone, "plastic_beige", xf, Vector3(s * 0.475, 0.81, 0.45), Vector3(0.025, 0.24, 0.82), 0.01)
		_r(g, zone, "plastic_gray", xf, Vector3(s * 0.49, 0.83, 0.45), Vector3(0.006, 0.1, 0.55), 0.003)
	if unmade:
		# Couverture tirée de travers, un pan qui pend
		_r(g, zone, "fabric_green", xf, Vector3(0.08, 0.69, -0.35), Vector3(0.9, 0.035, 1.1), 0.015,
			Basis(Vector3.FORWARD, 0.06) * Basis(Vector3.UP, 0.15))
		_r(g, zone, "fabric_green", xf, Vector3(0.52, 0.56, -0.45), Vector3(0.03, 0.26, 0.8), 0.01,
			Basis(Vector3.UP, 0.15) * Basis(Vector3.FORWARD, -0.12))
	if stained:
		_b(g, zone, "gown", xf, Vector3(-0.05, 0.68, 0.1), Vector3(0.7, 0.01, 0.9))


## Brancard : châssis à roulettes, colonnes à soufflet, matelas en similicuir
## (dossier relevé côté +Z), barrières repliées, poignée de poussée.
static func gurney(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, tipped: bool = false) -> void:
	var xf := _xf(pos, rot)
	if tipped:
		xf = xf * Transform3D(Basis(Vector3.BACK, PI / 2.0 - 0.1), Vector3(0.45, 0.32, 0))
	g.stamp(zone, "gurney", xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_gurney(tg, tz, txf))
	if not tipped:
		_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.62, 0.9, 1.9))
	else:
		_solid(g, zone, _xf(pos, rot), Vector3(0, 0.35, 0), Vector3(0.9, 0.7, 1.9))


static func _geo_gurney(g: Geo, zone: String, xf: Transform3D) -> void:
	var fr := "metal_alu"
	# Châssis bas et roulettes
	for s in [-1.0, 1.0]:
		_c(g, zone, fr, xf, Vector3(s * 0.24, 0.17, -0.85), Vector3(s * 0.24, 0.17, 0.85), 0.018, {"segments": 8})
		for z in [-0.8, 0.8]:
			caster(g, zone, xf, Vector3(s * 0.24, 0.0, z), 0.065, 0.035, 0.17, "tire", "metal_chrome")
	for z in [-0.85, 0.85]:
		_c(g, zone, fr, xf, Vector3(-0.24, 0.17, z), Vector3(0.24, 0.17, z), 0.018, {"segments": 8})
	# Colonnes télescopiques à soufflet
	for z in [-0.45, 0.45]:
		_r(g, zone, "plastic_gray", xf, Vector3(0, 0.2, z), Vector3(0.52, 0.04, 0.14), 0.012)
		_c(g, zone, "plastic_black", xf, Vector3(0, 0.22, z), Vector3(0, 0.6, z), 0.05, {"segments": 12})
		for k in 5:
			_t(g, zone, "plastic_black", xf, Vector3(0, 0.27 + k * 0.07, z), Vector3.UP, 0.05, 0.009,
				{"segments": 12, "sides": 4, "shadow": false})
		_c(g, zone, fr, xf, Vector3(0, 0.6, z), Vector3(0, 0.71, z), 0.028, {"segments": 10})
	# Plateau
	_r(g, zone, fr, xf, Vector3(0, 0.725, 0), Vector3(0.56, 0.035, 1.9), 0.012)
	for s in [-1.0, 1.0]:
		_c(g, zone, fr, xf, Vector3(s * 0.3, 0.73, -0.95), Vector3(s * 0.3, 0.73, 0.95), 0.016, {"segments": 8})
	# Matelas : partie pieds à plat, dossier relevé
	_r(g, zone, "vinyl_gray", xf, Vector3(0, 0.79, -0.26), Vector3(0.58, 0.09, 1.36), 0.04)
	var hb := Basis(Vector3.RIGHT, -0.38)
	_r(g, zone, "vinyl_gray", xf, Vector3(0, 0.894, 0.7), Vector3(0.58, 0.09, 0.56), 0.04, hb)
	# Sangles
	for z in [-0.75, -0.1]:
		_r(g, zone, "plastic_black", xf, Vector3(0, 0.837, z), Vector3(0.6, 0.006, 0.05), 0.002)
	# Barrières latérales repliées
	for s in [-1.0, 1.0]:
		_tube(g, zone, "metal_chrome", xf, [Vector3(s * 0.33, 0.74, -0.55), Vector3(s * 0.33, 0.86, -0.5),
			Vector3(s * 0.33, 0.86, 0.35), Vector3(s * 0.33, 0.74, 0.4)], 0.011)
	# Poignée de poussée côté pieds, mât de perfusion replié
	_tube(g, zone, "metal_chrome", xf, [Vector3(-0.25, 0.74, -0.97), Vector3(-0.25, 0.94, -1.02),
		Vector3(0.25, 0.94, -1.02), Vector3(0.25, 0.74, -0.97)], 0.013)
	_c(g, zone, "metal_chrome", xf, Vector3(0.28, 0.72, 0.97), Vector3(0.28, 1.25, 0.97), 0.008, {"segments": 6})


## Fauteuil roulant pliant : grandes roues à rayons et mains courantes,
## roulettes pivotantes, cadre tubulaire chromé, toile d'assise et de dossier,
## accoudoirs, repose-pieds, poignées de poussée. Face vers -Z.
static func wheelchair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "wheelchair", xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_wheelchair(tg, tz, txf))
	_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.66, 0.9, 0.8), false)


static func _geo_wheelchair(g: Geo, zone: String, xf: Transform3D) -> void:
	var fr := "metal_chrome"
	for s in [-1.0, 1.0]:
		var x: float = s * 0.235
		wheel(g, zone, xf, Vector3(s * 0.3, 0.305, 0.1), 0.305, 0.03, s, "chair")
		# Platine d'axe
		_r(g, zone, "metal_dark", xf, Vector3(s * 0.26, 0.3, 0.1), Vector3(0.012, 0.1, 0.09), 0.004)
		# Cadre : montant avant, longeron d'assise, montant de dossier, poignée
		_tube(g, zone, fr, xf, [Vector3(x, 0.2, -0.3), Vector3(x, 0.5, -0.27), Vector3(x, 0.5, 0.16),
			Vector3(x, 0.94, 0.24), Vector3(x, 0.975, 0.33)], 0.012)
		_tube(g, zone, fr, xf, [Vector3(x, 0.2, -0.3), Vector3(x, 0.24, 0.12), Vector3(x, 0.5, 0.16)], 0.011)
		_c(g, zone, "plastic_black", xf, Vector3(x, 0.975, 0.32), Vector3(x, 0.985, 0.45), 0.017, {"segments": 8})
		# Accoudoir
		_tube(g, zone, fr, xf, [Vector3(x, 0.5, -0.12), Vector3(x, 0.68, -0.12)], 0.01)
		_tube(g, zone, fr, xf, [Vector3(x, 0.5, 0.13), Vector3(x, 0.68, 0.13)], 0.01)
		_r(g, zone, "plastic_black", xf, Vector3(x, 0.695, 0.0), Vector3(0.055, 0.035, 0.36), 0.014)
		# Flanc de protection des vêtements
		_r(g, zone, "plastic_gray", xf, Vector3(s * 0.248, 0.6, 0.0), Vector3(0.006, 0.17, 0.26), 0.003)
		# Potence et palette de repose-pied
		_tube(g, zone, fr, xf, [Vector3(x, 0.5, -0.27), Vector3(x * 0.92, 0.18, -0.42)], 0.011)
		_r(g, zone, "plastic_black", xf, Vector3(s * 0.11, 0.165, -0.45), Vector3(0.18, 0.016, 0.13), 0.006,
			Basis(Vector3.RIGHT, 0.12))
		# Roulette avant pivotante
		caster(g, zone, xf, Vector3(x, 0.0, -0.33), 0.085, 0.028, 0.2, "tire", fr)
	# Croisillon de pliage sous l'assise
	_c(g, zone, fr, xf, Vector3(-0.235, 0.49, -0.02), Vector3(0.235, 0.24, -0.02), 0.01, {"segments": 6})
	_c(g, zone, fr, xf, Vector3(0.235, 0.49, -0.02), Vector3(-0.235, 0.24, -0.02), 0.01, {"segments": 6})
	# Toile d'assise et de dossier
	_r(g, zone, "vinyl_dark", xf, Vector3(0, 0.505, -0.05), Vector3(0.46, 0.028, 0.42), 0.01)
	_r(g, zone, "vinyl_dark", xf, Vector3(0, 0.75, 0.205), Vector3(0.45, 0.36, 0.022), 0.008, Basis(Vector3.RIGHT, 0.18))


static func iv_stand(g: Geo, zone: String, pos: Vector3) -> void:
	g.stamp(zone, "iv_stand", _xf(pos, 0.0), func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_iv_stand(tg, tz, txf))


static func _geo_iv_stand(g: Geo, zone: String, xf: Transform3D) -> void:
	# Piétement cinq branches à roulettes
	for i in 5:
		var a := TAU * float(i) / 5.0
		var d := Vector3(sin(a), 0, cos(a))
		_r(g, zone, "metal_alu", xf, d * 0.13 + Vector3(0, 0.07, 0), Vector3(0.024, 0.016, 0.27), 0.006,
			Basis(Vector3.UP, a) * Basis(Vector3.RIGHT, 0.12))
		caster(g, zone, xf, d * 0.25, 0.022, 0.02, 0.06, "plastic_black", "metal_chrome")
	_s(g, zone, "metal_alu", xf, Vector3(0, 0.08, 0), 0.035, Vector3(1, 0.6, 1), Basis.IDENTITY, {"segments": 10, "rings": 5})
	# Mât télescopique et molette de serrage
	_c(g, zone, "metal_alu", xf, Vector3(0, 0.08, 0), Vector3(0, 1.22, 0), 0.014, {"segments": 8})
	_c(g, zone, "metal_chrome", xf, Vector3(0, 1.22, 0), Vector3(0, 1.9, 0), 0.01, {"segments": 8})
	_c(g, zone, "plastic_black", xf, Vector3(0, 1.19, 0), Vector3(0, 1.24, 0), 0.021, {"segments": 10})
	# Crochets
	for i in 4:
		var a2 := TAU * float(i) / 4.0 + PI / 4.0
		var d2 := Vector3(sin(a2), 0, cos(a2))
		_tube(g, zone, "metal_chrome", xf, [Vector3(0, 1.88, 0), d2 * 0.12 + Vector3(0, 1.9, 0),
			d2 * 0.135 + Vector3(0, 1.95, 0)], 0.004, {"segments": 5, "shadow": false})
	# Poche de perfusion et tubulure
	var bag := Vector3(0.12, 1.77, 0.0)
	_r(g, zone, "glass_dirty", xf, bag, Vector3(0.1, 0.19, 0.035), 0.016)
	_r(g, zone, "linen", xf, bag + Vector3(0, 0.02, -0.019), Vector3(0.06, 0.07, 0.003), 0.002, Basis.IDENTITY, false)
	_c(g, zone, "glass_dirty", xf, bag - Vector3(0, 0.095, 0), bag - Vector3(0, 0.16, 0), 0.008, {"segments": 6, "shadow": false})
	cable(g, zone, xf * (bag - Vector3(0, 0.16, 0)), xf * Vector3(0.28, 0.9, 0.12), 0.25, 0.003, "glass_dirty")


static func medical_cabinet(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.9, 0), Vector3(0.8, 1.8, 0.4))
	_b(g, zone, "glass_dirty", xf, Vector3(0, 1.25, -0.205), Vector3(0.74, 0.9, 0.01))
	var rng := _rng(pos)
	for i in 2:
		var y := 0.95 + i * 0.4
		_b(g, zone, "metal_steel", xf, Vector3(0, y, 0), Vector3(0.74, 0.015, 0.35))
		for k in 5:
			if rng.randf() < 0.6:
				_c(g, zone, ["plastic_white", "glass_dirty", "plastic_orange"][rng.randi() % 3], xf, Vector3(-0.3 + k * 0.15, y + 0.01, rng.randf_range(-0.1, 0.1)), Vector3(-0.3 + k * 0.15, y + rng.randf_range(0.08, 0.2), rng.randf_range(-0.1, 0.1)), 0.03, {"segments": 8})
	_solid(g, zone, xf, Vector3(0, 0.9, 0), Vector3(0.8, 1.8, 0.4))


static func operating_table(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.05, 0), Vector3(0, 0.8, 0), 0.12, {"segments": 12})
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.03, 0), Vector3(0.6, 0.06, 0.9))
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.84, 0), Vector3(0.62, 0.06, 2.0))
	_b(g, zone, "rubber", xf, Vector3(0, 0.89, 0), Vector3(0.58, 0.05, 1.95))
	_b(g, zone, "fabric_green", xf, Vector3(0, 0.92, -0.2), Vector3(0.64, 0.02, 1.2), false, Basis(Vector3.FORWARD, 0.03))
	_solid(g, zone, xf, Vector3(0, 0.46, 0), Vector3(0.64, 0.92, 2.0))


static func instrument_tray(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.02, 0), Vector3(0, 0.95, 0), 0.02, {"segments": 6})
	_b(g, zone, "metal_steel", xf, Vector3(0.2, 0.97, 0), Vector3(0.6, 0.02, 0.4))
	var rng := _rng(pos)
	for i in 6:
		_b(g, zone, "metal_steel", xf, Vector3(rng.randf_range(0.0, 0.4), 0.985, rng.randf_range(-0.15, 0.15)), Vector3(0.18, 0.008, 0.015), false, Basis(Vector3.UP, rng.randf() * PI))
	_solid(g, zone, xf, Vector3(0.2, 0.5, 0), Vector3(0.6, 1.0, 0.4), false)


static func steel_table(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.88, 0), Vector3(0.8, 0.04, 2.1))
	for s in [-1.0, 1.0]:
		_b(g, zone, "metal_steel", xf, Vector3(s * 0.39, 0.93, 0), Vector3(0.02, 0.08, 2.1))
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.05, 0.6), Vector3(0, 0.86, 0.6), 0.08, {"segments": 10})
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.05, -0.6), Vector3(0, 0.86, -0.6), 0.08, {"segments": 10})
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.9, 1.0), Vector3(0, 0.6, 1.1), 0.03, {"segments": 6})
	_solid(g, zone, xf, Vector3(0, 0.46, 0), Vector3(0.8, 0.95, 2.1))


static func body_bag(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, on_floor: bool = true) -> void:
	var xf := _xf(pos, rot)
	var y := 0.13 if on_floor else 1.03
	_b(g, zone, "rubber", xf, Vector3(0, y, 0), Vector3(0.55, 0.24, 1.75))
	_b(g, zone, "rubber", xf, Vector3(0, y + 0.02, 0.85), Vector3(0.4, 0.22, 0.2))
	_b(g, zone, "metal_steel", xf, Vector3(0.05, y + 0.121, 0), Vector3(0.012, 0.004, 1.6))


static func morgue_wall(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, cols: int = 4, rows: int = 3,
		open_cells: Array = []) -> void:
	var xf := _xf(pos, rot)
	var cw := 0.75
	var rh := 0.7
	var w := cols * cw
	_b(g, zone, "metal_steel", xf, Vector3(0, rows * rh * 0.5 + 0.1, 0.3), Vector3(w + 0.1, rows * rh + 0.2, 0.6), true)
	for c in cols:
		for r in rows:
			var x := -w * 0.5 + cw * (c + 0.5)
			var y := 0.1 + rh * (r + 0.5)
			if [c, r] in open_cells:
				_b(g, zone, "black", xf, Vector3(x, y, -0.005), Vector3(cw - 0.12, rh - 0.12, 0.01))
				_b(g, zone, "metal_steel", xf, Vector3(x, y - 0.25, -0.6), Vector3(cw - 0.14, 0.03, 1.2))
				_b(g, zone, "rubber", xf, Vector3(x, y - 0.14, -0.8), Vector3(0.45, 0.2, 0.9))
			else:
				_b(g, zone, "metal_steel", xf, Vector3(x, y, -0.015), Vector3(cw - 0.06, rh - 0.06, 0.03))
				_b(g, zone, "metal_dark", xf, Vector3(x + cw * 0.3, y, -0.04), Vector3(0.03, 0.18, 0.03))
				_b(g, zone, "paper", xf, Vector3(x - 0.1, y + 0.18, -0.032), Vector3(0.12, 0.06, 0.003))


# --- Divers ---------------------------------------------------------------

static func crate(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, size: Vector3 = Vector3(0.9, 0.7, 0.7),
		mat: String = "wood_light") -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, size.y * 0.5, 0), size, true)
	for y in [0.12, size.y - 0.12]:
		_b(g, zone, "wood_desk", xf, Vector3(0, y, 0), Vector3(size.x + 0.02, 0.08, size.z + 0.02))


static func boxes(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, n: int = 4) -> void:
	var xf := _xf(pos, rot)
	var rng := _rng(pos)
	var y := 0.0
	var x := 0.0
	for i in n:
		var s := Vector3(rng.randf_range(0.35, 0.6), rng.randf_range(0.25, 0.45), rng.randf_range(0.3, 0.5))
		if i > 0 and rng.randf() < 0.5 and y < 1.0:
			y += s.y * 0.5
		else:
			y = 0.0
			x += 0.55
		_b(g, zone, "cardboard", xf, Vector3(x + rng.randf_range(-0.05, 0.05), y + s.y * 0.5, rng.randf_range(-0.1, 0.1)), s, true, Basis(Vector3.UP, rng.randf_range(-0.3, 0.3)))
		y += s.y * 0.5


static func papers(g: Geo, zone: String, center: Vector3, radius: float = 1.0, n: int = 8) -> void:
	var rng := _rng(center)
	for i in n:
		var a := rng.randf() * TAU
		var r := sqrt(rng.randf()) * radius
		var p := center + Vector3(cos(a) * r, 0.003 + i * 0.0005, sin(a) * r)
		g.box(zone, "paper", p, Vector3(0.21, 0.003, 0.29), {"rot": rng.randf() * TAU, "collide": false, "shadow": false})


static func rubble(g: Geo, zone: String, center: Vector3, radius: float = 1.2, n: int = 10,
		mat: String = "wall_concrete") -> void:
	var rng := _rng(center)
	for i in n:
		var a := rng.randf() * TAU
		var r := sqrt(rng.randf()) * radius
		var s := Vector3(rng.randf_range(0.1, 0.55), rng.randf_range(0.08, 0.35), rng.randf_range(0.1, 0.5))
		var p := center + Vector3(cos(a) * r, s.y * 0.4, sin(a) * r)
		var basis := Basis(Vector3(rng.randf(), rng.randf(), rng.randf()).normalized(), rng.randf_range(-0.5, 0.5))
		g.box(zone, mat, p, s, {"basis": basis, "collide": s.x > 0.35, "nav": s.x > 0.35})


static func plant(g: Geo, zone: String, pos: Vector3) -> void:
	var xf := _xf(pos, 0.0)
	_l(g, zone, "plastic_dark", xf, Vector3.ZERO, Vector3.UP, PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.2, 0.0),
		Vector2(0.25, 0.42), Vector2(0.27, 0.45), Vector2(0.235, 0.45), Vector2(0.23, 0.43), Vector2(0.0, 0.43)]),
		{"segments": 14, "smooth": 30.0})
	var rng := _rng(pos)
	# Tiges et touffes de feuilles (plante verte desséchée)
	for i in 7:
		var a := rng.randf() * TAU
		var tip := Vector3(cos(a) * rng.randf_range(0.15, 0.35), rng.randf_range(0.8, 1.3), sin(a) * rng.randf_range(0.15, 0.35))
		_c(g, zone, "bark", xf, Vector3(0, 0.43, 0), tip, 0.012, {"radius_b": 0.005, "segments": 5, "caps": false})
		_s(g, zone, "foliage", xf, tip, rng.randf_range(0.12, 0.2), Vector3(1.0, 0.8, 1.0), Basis.IDENTITY,
			{"segments": 8, "rings": 5})
	_solid(g, zone, xf, Vector3(0, 0.3, 0), Vector3(0.5, 0.6, 0.5), false)


static func pipe(g: Geo, zone: String, a: Vector3, b: Vector3, r: float = 0.08, mat: String = "metal_rust",
		brackets: bool = true) -> void:
	g.cylinder(zone, mat, a, b, r, {"segments": 10})
	if brackets:
		var len := a.distance_to(b)
		var n := int(len / 2.5)
		for i in range(1, n + 1):
			var p := a.lerp(b, float(i) / float(n + 1))
			var d := (b - a).abs()
			var s := Vector3(r * 2.6, r * 2.6, r * 2.6)
			if d.x >= d.y and d.x >= d.z:
				s.x = 0.06
			elif d.z >= d.y:
				s.z = 0.06
			else:
				s.y = 0.06
			g.box(zone, "metal_dark", p, s, {"collide": false})


static func cable(g: Geo, zone: String, a: Vector3, b: Vector3, sag: float = 0.4, r: float = 0.012,
		mat: String = "rubber") -> void:
	var n := 6
	var prev := a
	for i in range(1, n + 1):
		var t := float(i) / float(n)
		var p := a.lerp(b, t) + Vector3.DOWN * sag * 4.0 * t * (1.0 - t)
		g.cylinder(zone, mat, prev, p, r, {"segments": 5, "caps": false, "shadow": false})
		prev = p


static func railing(g: Geo, zone: String, a: Vector3, b: Vector3, h: float = 1.05, mat: String = "metal_dark") -> void:
	var len := a.distance_to(b)
	var n := maxi(1, int(len / 1.2))
	for i in n + 1:
		var p := a.lerp(b, float(i) / float(n))
		g.cylinder(zone, mat, p, p + Vector3(0, h, 0), 0.025, {"segments": 6})
	g.cylinder(zone, mat, a + Vector3(0, h, 0), b + Vector3(0, h, 0), 0.03, {"segments": 8})
	g.cylinder(zone, mat, a + Vector3(0, h * 0.5, 0), b + Vector3(0, h * 0.5, 0), 0.015, {"segments": 6})
	var mid := (a + b) * 0.5 + Vector3(0, h * 0.5, 0)
	var dir := (b - a).normalized()
	g.solid(zone, mid, Vector3(len, h, 0.1), Basis(Vector3.UP, atan2(-dir.z, dir.x)))


## Distributeur de boissons : caisson, vitrine éclairée (rayons de canettes et
## de bouteilles), monnayeur, trappe de distribution. Face vers -Z.
static func vending_machine(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_r(g, zone, "car_red", xf, Vector3(0, 0.95, 0.02), Vector3(0.9, 1.82, 0.76), 0.03)
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.03, 0.02), Vector3(0.86, 0.06, 0.72), 0.01)
	# Vitrine : fond sombre, rayons, produits
	_r(g, zone, "plastic_black", xf, Vector3(-0.1, 1.12, -0.33), Vector3(0.62, 1.22, 0.02), 0.005)
	var rng := _rng(pos)
	var colors := ["plastic_orange", "metal_blue", "plastic_white", "metal_yellow", "car_red", "fabric_green"]
	for r in 5:
		var y := 0.6 + r * 0.23
		_r(g, zone, "metal_steel", xf, Vector3(-0.1, y - 0.01, -0.25), Vector3(0.6, 0.012, 0.14), 0.003)
		var m: String = colors[rng.randi() % colors.size()]
		var bottle := rng.randf() < 0.4
		for c in 6:
			if rng.randf() < 0.18:
				continue
			var p := Vector3(-0.35 + c * 0.1, y, -0.26)
			if bottle:
				_l(g, zone, m, xf, p, Vector3.UP, PackedVector2Array([Vector2(0.0, 0.0), Vector2(0.03, 0.0), Vector2(0.03, 0.12),
					Vector2(0.013, 0.16), Vector2(0.012, 0.185), Vector2(0.0, 0.185)]), {"segments": 8})
			else:
				_c(g, zone, m, xf, p, p + Vector3(0, 0.12, 0), 0.032, {"segments": 10})
	_r(g, zone, "glass_dirty", xf, Vector3(-0.1, 1.12, -0.383), Vector3(0.64, 1.24, 0.012), 0.004, Basis.IDENTITY, false)
	# Cadre de vitrine
	_r(g, zone, "metal_dark", xf, Vector3(-0.1, 1.12, -0.385), Vector3(0.68, 1.28, 0.01), 0.004)
	# Monnayeur : afficheur, boutons, fente
	_r(g, zone, "plastic_black", xf, Vector3(0.33, 1.2, -0.37), Vector3(0.16, 0.5, 0.03), 0.01)
	_r(g, zone, "emit_green", xf, Vector3(0.33, 1.38, -0.387), Vector3(0.1, 0.035, 0.005), 0.002, Basis.IDENTITY, false)
	for k in 6:
		_r(g, zone, "metal_steel", xf, Vector3(0.3 + (k % 2) * 0.06, 1.3 - int(k / 2) * 0.05, -0.388), Vector3(0.035, 0.03, 0.01), 0.004, Basis.IDENTITY, false)
	_r(g, zone, "metal_chrome", xf, Vector3(0.33, 1.08, -0.388), Vector3(0.05, 0.08, 0.01), 0.004, Basis.IDENTITY, false)
	# Bandeau lumineux et trappe de distribution
	_r(g, zone, "emit_white_dim", xf, Vector3(0, 1.8, -0.365), Vector3(0.82, 0.14, 0.02), 0.01, Basis.IDENTITY, false)
	_r(g, zone, "plastic_black", xf, Vector3(-0.1, 0.33, -0.37), Vector3(0.6, 0.2, 0.04), 0.012)
	_r(g, zone, "metal_dark", xf, Vector3(-0.1, 0.34, -0.393), Vector3(0.54, 0.14, 0.01), 0.006, Basis(Vector3.RIGHT, -0.15))
	_solid(g, zone, xf, Vector3(0, 0.95, 0.02), Vector3(0.9, 1.9, 0.8))


static func sofa(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "fabric_brown") -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, 0.25, 0), Vector3(1.9, 0.3, 0.85))
	_b(g, zone, mat, xf, Vector3(0, 0.6, 0.35), Vector3(1.9, 0.5, 0.18))
	for s in [-1.0, 1.0]:
		_b(g, zone, mat, xf, Vector3(s * 0.88, 0.5, 0), Vector3(0.16, 0.3, 0.85))
	_b(g, zone, mat, xf, Vector3(-0.45, 0.44, -0.05), Vector3(0.85, 0.1, 0.7))
	_b(g, zone, mat, xf, Vector3(0.45, 0.44, -0.05), Vector3(0.85, 0.1, 0.7), false, Basis(Vector3.FORWARD, 0.1))
	_solid(g, zone, xf, Vector3(0, 0.4, 0), Vector3(1.9, 0.8, 0.85))


static func fridge(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.9, 0), Vector3(0.7, 1.8, 0.7), true)
	_b(g, zone, "plastic_white", xf, Vector3(0, 1.35, -0.36), Vector3(0.66, 0.8, 0.02))
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.5, -0.36), Vector3(0.66, 0.9, 0.02))
	_b(g, zone, "metal_steel", xf, Vector3(0.27, 0.9, -0.38), Vector3(0.03, 0.4, 0.03))


static func sink(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.85, 0), Vector3(0.6, 0.15, 0.45), true)
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.95, 0.15), Vector3(0.04, 0.2, 0.04))
	_b(g, zone, "black", xf, Vector3(0, 0.93, -0.02), Vector3(0.45, 0.01, 0.3))


static func notice_board(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "cardboard", xf, Vector3(0, 1.5, 0), Vector3(1.2, 0.8, 0.03))
	var rng := _rng(pos)
	for i in 7:
		_b(g, zone, "paper", xf, Vector3(rng.randf_range(-0.45, 0.45), 1.5 + rng.randf_range(-0.28, 0.28), -0.02), Vector3(0.18, 0.24, 0.003), false, Basis(Vector3.BACK, rng.randf_range(-0.2, 0.2)))


static func computer(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, screen: String = "screen_terminal") -> MeshInstance3D:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_beige", xf, Vector3(0, 0.19, 0.04), Vector3(0.4, 0.34, 0.36))
	_b(g, zone, "plastic_beige", xf, Vector3(0, 0.02, 0.05), Vector3(0.26, 0.04, 0.22))
	_b(g, zone, "plastic_beige", xf, Vector3(0, 0.012, -0.28), Vector3(0.44, 0.024, 0.15))
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.32, 0.25)
	mi.mesh = q
	mi.material_override = Mats.get_mat(screen)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.zone_root(zone).add_child(mi)
	mi.global_transform = Transform3D(xf.basis * Basis(Vector3.UP, PI), xf * Vector3(0, 0.2, -0.142))
	return mi


static func tv_on_wall(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> MeshInstance3D:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_dark", xf, Vector3(0, 0, 0.2), Vector3(0.7, 0.55, 0.45))
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.3, 0.35), Vector3(0.1, 0.1, 0.3))
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.56, 0.42)
	mi.mesh = q
	mi.material_override = Mats.get_mat("screen_snow")
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.zone_root(zone).add_child(mi)
	mi.global_transform = Transform3D(xf.basis * Basis(Vector3.UP, PI), xf * Vector3(0, 0, -0.026))
	return mi


# --- Extérieur ------------------------------------------------------------

## Berline : caisse extrudée (capot, malle, passages de roues), habitacle
## vitré avec montants, roues à jantes alliage, optiques, pare-chocs,
## rétroviseurs, poignées. Avant vers -Z. « lights » : phares allumés.
static func car(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "car_gray",
		door_open: bool = false, lights: bool = false) -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "car|%s|%s|%s" % [mat, door_open, lights], xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_car(tg, tz, txf, mat, door_open, lights))
	_solid(g, zone, xf, Vector3(0, 0.75, 0), Vector3(1.9, 1.5, 4.4))


static func _geo_car(g: Geo, zone: String, xf: Transform3D, mat: String, door_open: bool, lights: bool) -> void:
	var wr := 0.32
	var body := PackedVector2Array([Vector2(-2.2, 0.3), Vector2(-2.25, 0.46), Vector2(-2.23, 0.62), Vector2(-2.12, 0.74),
		Vector2(-1.85, 0.81), Vector2(-1.2, 0.88), Vector2(-0.75, 0.93), Vector2(1.35, 0.95), Vector2(1.75, 0.93),
		Vector2(2.1, 0.88), Vector2(2.22, 0.78), Vector2(2.26, 0.56), Vector2(2.2, 0.3)])
	# Bas de caisse avec passages de roues (arrière puis avant)
	for zc in [1.35, -1.35]:
		for k in 9:
			var t := float(k) / 8.0 * PI
			body.append(Vector2(zc + 0.42 * cos(t), 0.3 + 0.1 * sin(t) + 0.32 * sin(t)))
	g.extrude_x(zone, mat, xf, body, -0.89, 0.89, {"bevel": 0.1, "smooth": 32.0})
	# Habitacle vitré, toit et montants
	var cabin := PackedVector2Array([Vector2(-0.72, 0.93), Vector2(-0.12, 1.36), Vector2(0.9, 1.38), Vector2(1.48, 0.96)])
	g.extrude_x(zone, "glass_car", xf, cabin, -0.76, 0.76, {"bevel": 0.12, "smooth": 10.0})
	var roof := PackedVector2Array([Vector2(-0.16, 1.34), Vector2(-0.06, 1.395), Vector2(0.86, 1.41), Vector2(0.96, 1.35)])
	g.extrude_x(zone, mat, xf, roof, -0.68, 0.68, {"bevel": 0.02})
	for s in [-1.0, 1.0]:
		var x: float = s * 0.7
		_tube(g, zone, mat, xf, [Vector3(x, 0.94, -0.7), Vector3(x * 0.97, 1.36, -0.12)], 0.035, {"shadow": false})
		_r(g, zone, mat, xf, Vector3(s * 0.71, 1.16, 0.4), Vector3(0.05, 0.42, 0.09), 0.015, Basis(Vector3.FORWARD, s * 0.06))
		_tube(g, zone, mat, xf, [Vector3(x * 0.97, 1.37, 0.88), Vector3(x, 0.97, 1.42)], 0.05, {"shadow": false})
		# Joints de portes, poignées, rétroviseur
		for zc2 in [-0.62, 0.42, 1.3]:
			_b(g, zone, "black", xf, Vector3(s * 0.895, 0.66, zc2), Vector3(0.012, 0.5, 0.01))
		for zc3 in [-0.2, 0.85]:
			_r(g, zone, "metal_chrome", xf, Vector3(s * 0.9, 0.86, zc3), Vector3(0.02, 0.025, 0.14), 0.008)
		_r(g, zone, mat, xf, Vector3(s * 0.97, 1.0, -0.62), Vector3(0.14, 0.1, 0.07), 0.03)
		_r(g, zone, "glass_car", xf, Vector3(s * 0.99, 1.0, -0.586), Vector3(0.1, 0.07, 0.01), 0.004)
		# Optiques
		_r(g, zone, "emit_headlight" if lights else "light_off", xf, Vector3(s * 0.62, 0.7, -2.19), Vector3(0.36, 0.1, 0.06), 0.03)
		_r(g, zone, "emit_taillight", xf, Vector3(s * 0.64, 0.8, 2.21), Vector3(0.36, 0.11, 0.06), 0.03)
	# Calandre, pare-chocs, plaques
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.62, -2.21), Vector3(0.78, 0.13, 0.05), 0.02)
	for k in 3:
		_b(g, zone, "metal_chrome", xf, Vector3(0, 0.58 + k * 0.04, -2.235), Vector3(0.72, 0.008, 0.01))
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.4, -2.2), Vector3(1.8, 0.2, 0.14), 0.05)
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.42, 2.2), Vector3(1.8, 0.22, 0.14), 0.05)
	_r(g, zone, "paper", xf, Vector3(0, 0.44, -2.275), Vector3(0.5, 0.11, 0.01), 0.004)
	_r(g, zone, "paper", xf, Vector3(0, 0.62, 2.265), Vector3(0.5, 0.11, 0.01), 0.004)
	# Roues
	for s in [-1.0, 1.0]:
		for zc4 in [-1.35, 1.35]:
			wheel(g, zone, xf, Vector3(s * 0.77, wr, zc4), wr, 0.21, s, "car")
	# Soubassement (ombre sous la caisse)
	_b(g, zone, "black", xf, Vector3(0, 0.22, 0), Vector3(1.5, 0.1, 3.6))
	if door_open:
		# Portière conducteur (côté -X) ouverte : ouverture sombre et porte pivotée
		_b(g, zone, "black", xf, Vector3(-0.886, 0.72, -0.1), Vector3(0.02, 0.5, 1.02))
		var hinge := Vector3(-0.9, 0.0, -0.62)
		var db := Basis(Vector3.UP, -0.95)
		var dxf := xf * Transform3D(db, hinge)
		_r(g, zone, mat, dxf, Vector3(-0.03, 0.66, 0.52), Vector3(0.06, 0.56, 1.02), 0.025)
		_r(g, zone, "glass_car", dxf, Vector3(-0.02, 1.13, 0.56), Vector3(0.025, 0.38, 0.9), 0.02)
		_r(g, zone, "plastic_dark", dxf, Vector3(0.02, 0.7, 0.5), Vector3(0.02, 0.45, 0.9), 0.02)


## Ambulance à cellule : cabine extrudée (capot, pare-brise incliné), cellule
## sanitaire aux arêtes arrondies, bandes, rampe de gyrophares, roues à jantes
## tôle. Avant vers -Z. « open_rear » : portes arrière ouvertes sur la cellule
## aménagée (banquette, rangements, rails du brancard). « lights » : gyrophares
## allumés.
static func ambulance(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, open_rear: bool = false,
		lights: bool = false) -> void:
	var xf := _xf(pos, rot)
	g.stamp(zone, "ambulance|%s|%s" % [open_rear, lights], xf,
		func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_ambulance(tg, tz, txf, open_rear, lights, _rng(pos)))
	# Inscriptions
	for s in [-1.0, 1.0]:
		_label(g, zone, "AMBULANCE", xf * Transform3D(Basis(Vector3.UP, s * PI / 2.0), Vector3(s * 1.112, 2.05, 0.75)),
			1.15, Color(0.08, 0.22, 0.75))
	if not open_rear:
		_label(g, zone, "SAMU", xf * Transform3D(Basis.IDENTITY, Vector3(0.53, 1.72, 2.612)), 0.9, Color(0.08, 0.22, 0.75))
	# Collisions : l'arrière reste accessible au regard quand il est ouvert
	_solid(g, zone, xf, Vector3(0, 1.375, -0.55), Vector3(2.2, 2.75, 4.9))
	if open_rear:
		_solid(g, zone, xf, Vector3(0, 0.475, 2.25), Vector3(2.2, 0.95, 0.7))
		for s in [-1.0, 1.0]:
			_solid(g, zone, xf, Vector3(s * 1.05, 1.85, 2.25), Vector3(0.1, 1.8, 0.7))
		_solid(g, zone, xf, Vector3(0, 2.68, 2.25), Vector3(2.2, 0.15, 0.7))
		for s in [-1.0, 1.0]:
			var dxf := xf * Transform3D(Basis(Vector3.UP, s * 1.75), Vector3(s * 1.1, 0.0, 2.58))
			g.solid(zone, dxf * Vector3(-s * 0.53, 1.78, 0.0), Vector3(1.04, 1.62, 0.12), dxf.basis, false)
	else:
		_solid(g, zone, xf, Vector3(0, 1.375, 2.25), Vector3(2.2, 2.75, 0.7))
	_solid(g, zone, xf, Vector3(0, 0.275, 2.72), Vector3(2.0, 0.55, 0.3))


static func _geo_ambulance(g: Geo, zone: String, xf: Transform3D, open_rear: bool, lights: bool,
		rng: RandomNumberGenerator) -> void:
	var paint := "paint_white"
	var lens := "emit_blue" if lights else "lens_blue"
	# Cabine
	var cab := PackedVector2Array([Vector2(-1.15, 0.45), Vector2(-1.15, 2.3), Vector2(-1.45, 2.33), Vector2(-1.62, 2.28),
		Vector2(-1.75, 2.18), Vector2(-2.36, 1.33), Vector2(-2.72, 1.2), Vector2(-2.9, 1.08), Vector2(-2.96, 0.9),
		Vector2(-2.97, 0.52), Vector2(-2.9, 0.42)])
	for k in 9:
		var t := PI - float(k) / 8.0 * PI
		cab.append(Vector2(-1.95 + 0.47 * cos(t), 0.42 + 0.41 * sin(t)))
	g.extrude_x(zone, paint, xf, cab, -1.0, 1.0, {"bevel": 0.1, "smooth": 30.0})
	# Pare-brise, vitres latérales, joints et poignées de portes
	var wb := Basis(Vector3.RIGHT, 0.6225)
	_r(g, zone, "glass_car", xf, Vector3(0, 1.755, -2.055) + Vector3(0, 0.583, -0.8126) * 0.012, Vector3(1.74, 1.0, 0.02), 0.03, wb)
	var side_win := PackedVector2Array([Vector2(-2.2, 1.38), Vector2(-1.76, 2.04), Vector2(-1.28, 2.06), Vector2(-1.28, 1.38)])
	for s in [-1.0, 1.0]:
		g.extrude_x(zone, "glass_car", xf, side_win, 0.994 if s > 0.0 else -1.012, 1.012 if s > 0.0 else -0.994)
		_b(g, zone, "black", xf, Vector3(s * 1.003, 1.3, -1.25), Vector3(0.008, 1.55, 0.012))
		_r(g, zone, "metal_chrome", xf, Vector3(s * 1.008, 1.3, -1.45), Vector3(0.02, 0.03, 0.14), 0.01)
		# Rétroviseur de fourgon sur son bras
		_tube(g, zone, "plastic_black", xf, [Vector3(s * 0.97, 1.9, -1.8), Vector3(s * 1.2, 1.88, -1.84)], 0.014)
		_r(g, zone, "plastic_black", xf, Vector3(s * 1.24, 1.74, -1.84), Vector3(0.07, 0.32, 0.17), 0.025)
		_r(g, zone, "glass_car", xf, Vector3(s * 1.24, 1.74, -1.752), Vector3(0.05, 0.28, 0.01), 0.004)
		# Optiques avant et clignotants
		_r(g, zone, "light_off", xf, Vector3(s * 0.66, 0.98, -2.93), Vector3(0.34, 0.19, 0.07), 0.035)
		_r(g, zone, "metal_chrome", xf, Vector3(s * 0.66, 0.98, -2.915), Vector3(0.37, 0.22, 0.05), 0.03)
		_r(g, zone, "emit_amber" if lights else "plastic_orange", xf, Vector3(s * 0.88, 0.82, -2.93), Vector3(0.14, 0.07, 0.05), 0.02)
		# Bande bleue et liseré orange sur la cabine
		_b(g, zone, "paint_blue", xf, Vector3(s * 1.004, 1.12, -1.72), Vector3(0.012, 0.2, 0.9))
	# Calandre, pare-chocs, plaque
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.95, -2.95), Vector3(0.92, 0.28, 0.05), 0.03)
	for k in 4:
		_b(g, zone, "metal_chrome", xf, Vector3(0, 0.86 + k * 0.06, -2.978), Vector3(0.84, 0.012, 0.01))
	_r(g, zone, "plastic_gray", xf, Vector3(0, 0.56, -2.93), Vector3(1.98, 0.28, 0.2), 0.06)
	_r(g, zone, "paper", xf, Vector3(0, 0.56, -3.035), Vector3(0.52, 0.11, 0.01), 0.004)
	# Rampe de gyrophares sur le toit de cabine
	_r(g, zone, "plastic_black", xf, Vector3(0, 2.37, -1.45), Vector3(1.5, 0.07, 0.3), 0.02)
	for s in [-1.0, 1.0]:
		_r(g, zone, lens, xf, Vector3(s * 0.5, 2.45, -1.45), Vector3(0.46, 0.1, 0.26), 0.035)
	_r(g, zone, "light_off", xf, Vector3(0, 2.44, -1.45), Vector3(0.52, 0.08, 0.24), 0.03)
	# Cellule : parois, toit, plancher, arêtes arrondies
	for s in [-1.0, 1.0]:
		_r(g, zone, paint, xf, Vector3(s * 1.07, 1.85, 0.7), Vector3(0.06, 1.8, 3.7), 0.02)
	_r(g, zone, paint, xf, Vector3(0, 2.71, 0.7), Vector3(2.2, 0.08, 3.7), 0.03)
	_r(g, zone, paint, xf, Vector3(0, 1.85, -1.12), Vector3(2.2, 1.85, 0.06), 0.02)
	_r(g, zone, "plastic_gray", xf, Vector3(0, 0.91, 0.7), Vector3(2.12, 0.1, 3.66), 0.02)
	for s in [-1.0, 1.0]:
		for zc in [-1.12, 2.53]:
			g.cylinder(zone, paint, xf * Vector3(s * 1.075, 0.93, zc), xf * Vector3(s * 1.075, 2.69, zc), 0.055, {"segments": 10})
			g.sphere(zone, paint, xf * Vector3(s * 1.075, 2.69, zc), 0.055, {"segments": 10, "rings": 5})
		g.cylinder(zone, paint, xf * Vector3(s * 1.075, 2.69, -1.12), xf * Vector3(s * 1.075, 2.69, 2.53), 0.055, {"segments": 10, "caps": false})
	for zc in [-1.12, 2.53]:
		g.cylinder(zone, paint, xf * Vector3(-1.075, 2.69, zc), xf * Vector3(1.075, 2.69, zc), 0.055, {"segments": 10, "caps": false})
	# Jupes latérales avec passage de roue arrière, châssis
	var skirt := PackedVector2Array([Vector2(-1.15, 0.52), Vector2(-1.15, 0.96), Vector2(2.53, 0.96), Vector2(2.53, 0.52)])
	for k in 9:
		var t2 := float(k) / 8.0 * PI
		skirt.append(Vector2(1.45 + 0.5 * cos(t2), 0.52 + 0.33 * sin(t2)))
	for s in [-1.0, 1.0]:
		g.extrude_x(zone, paint, xf, skirt, 1.02 if s > 0.0 else -1.1, 1.1 if s > 0.0 else -1.02, {"bevel": 0.02})
	_b(g, zone, "plastic_black", xf, Vector3(0, 0.66, 0.7), Vector3(1.4, 0.36, 3.6))
	_r(g, zone, "plastic_black", xf, Vector3(0, 0.52, 2.72), Vector3(2.0, 0.07, 0.3), 0.02)
	# Bandes réfléchissantes, feux de cellule, fenêtres dépolies
	for s in [-1.0, 1.0]:
		_b(g, zone, "paint_blue", xf, Vector3(s * 1.104, 1.12, 0.7), Vector3(0.012, 0.2, 3.62))
		_b(g, zone, "paint_orange", xf, Vector3(s * 1.104, 1.27, 0.7), Vector3(0.012, 0.05, 3.62))
		_r(g, zone, "glass_car", xf, Vector3(s * 1.104, 2.15, -0.3), Vector3(0.012, 0.36, 0.7), 0.01)
		for zc2 in [-1.18, 2.6]:
			_r(g, zone, lens, xf, Vector3(s * 0.95, 2.6, zc2), Vector3(0.16, 0.12, 0.07), 0.025)
		_r(g, zone, "emit_taillight", xf, Vector3(s * 1.075, 1.25, 2.6), Vector3(0.08, 0.34, 0.04), 0.015)
	_r(g, zone, paint, xf, Vector3(0, 2.6, 2.55), Vector3(2.12, 0.1, 0.08), 0.02)
	# Roues
	for s in [-1.0, 1.0]:
		wheel(g, zone, xf, Vector3(s * 0.84, 0.36, -1.95), 0.36, 0.24, s, "van")
		wheel(g, zone, xf, Vector3(s * 0.86, 0.36, 1.45), 0.36, 0.26, s, "van")
	# Portes arrière
	for s in [-1.0, 1.0]:
		var hinge := Vector3(s * 1.1, 0.0, 2.58)
		var db: Basis = Basis(Vector3.UP, s * 1.75) if open_rear else Basis.IDENTITY
		var dxf := xf * Transform3D(db, hinge)
		var cx: float = -s * 0.53
		_r(g, zone, paint, dxf, Vector3(cx, 1.78, 0.0), Vector3(1.04, 1.62, 0.05), 0.02)
		_r(g, zone, "glass_car", dxf, Vector3(cx, 2.2, 0.028), Vector3(0.56, 0.42, 0.01), 0.02)
		_b(g, zone, "paint_blue", dxf, Vector3(cx, 1.12, 0.028), Vector3(1.0, 0.2, 0.008))
		_b(g, zone, "paint_orange", dxf, Vector3(cx, 1.27, 0.028), Vector3(1.0, 0.05, 0.008))
		_r(g, zone, "metal_chrome", dxf, Vector3(-s * 0.95, 1.55, 0.035), Vector3(0.03, 0.16, 0.025), 0.01)
		# Face intérieure
		_r(g, zone, "plastic_white", dxf, Vector3(cx, 1.78, -0.03), Vector3(0.98, 1.52, 0.012), 0.005, Basis.IDENTITY, false)
	if open_rear:
		# Cellule aménagée : rails du brancard, banquette, rangements, siège, oxygène
		_r(g, zone, "plastic_gray", xf, Vector3(0, 0.97, 0.75), Vector3(2.0, 0.02, 3.5), 0.005)
		for s in [-1.0, 1.0]:
			_r(g, zone, "metal_alu", xf, Vector3(s * 0.3, 1.0, 1.25), Vector3(0.05, 0.04, 2.5), 0.01)
		_r(g, zone, "plastic_white", xf, Vector3(-0.82, 1.2, 1.15), Vector3(0.42, 0.42, 1.7), 0.02)
		_r(g, zone, "vinyl_blue", xf, Vector3(-0.82, 1.45, 1.15), Vector3(0.44, 0.09, 1.7), 0.03)
		_r(g, zone, "vinyl_blue", xf, Vector3(-0.99, 1.85, 1.15), Vector3(0.08, 0.55, 1.7), 0.03)
		_r(g, zone, "paint_orange", xf, Vector3(-0.8, 1.51, 0.75), Vector3(0.34, 0.035, 0.42), 0.012, Basis(Vector3.UP, 0.3))
		_r(g, zone, "plastic_white", xf, Vector3(0.86, 1.22, 0.4), Vector3(0.4, 0.56, 2.3), 0.02)
		_r(g, zone, "metal_steel", xf, Vector3(0.84, 1.52, 0.4), Vector3(0.46, 0.04, 2.34), 0.01)
		_r(g, zone, "plastic_white", xf, Vector3(0.88, 2.25, 0.4), Vector3(0.36, 0.7, 2.3), 0.02)
		for k in 3:
			_r(g, zone, "glass_dirty", xf, Vector3(0.695, 2.25, -0.35 + k * 0.75), Vector3(0.01, 0.6, 0.7), 0.01, Basis.IDENTITY, false)
		for k in 7:
			var m: String = ["plastic_white", "plastic_orange", "metal_blue", "glass_dirty"][rng.randi() % 4]
			_r(g, zone, m, xf, Vector3(0.82 + rng.randf_range(-0.08, 0.08), 1.6, -0.6 + k * 0.3), Vector3(0.12, 0.12 + rng.randf() * 0.08, 0.14), 0.01)
		_r(g, zone, "vinyl_blue", xf, Vector3(0.0, 1.42, -0.8), Vector3(0.46, 0.09, 0.44), 0.03)
		_r(g, zone, "vinyl_blue", xf, Vector3(0.0, 1.78, -1.02), Vector3(0.46, 0.6, 0.08), 0.03)
		_c(g, zone, "metal_green", xf, Vector3(-0.8, 1.0, -0.85), Vector3(-0.8, 1.85, -0.85), 0.09, {"segments": 12})
		_r(g, zone, "screen_off", xf, Vector3(0.55, 2.2, -1.07), Vector3(0.36, 0.28, 0.06), 0.015)
		for zc3 in [0.1, 1.5]:
			_r(g, zone, "emit_white_dim", xf, Vector3(0, 2.665, zc3), Vector3(0.9, 0.012, 0.22), 0.005, Basis.IDENTITY, false)


## Inscription peinte (Label3D) posée à plat sur une carrosserie.
static func _label(g: Geo, zone: String, text: String, at: Transform3D, size: float, color: Color) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = UITheme.font_ui_bold()
	l.font_size = 64
	l.pixel_size = 0.004 * size
	l.modulate = color
	l.outline_size = 0
	l.shaded = true
	l.double_sided = false
	g.zone_root(zone).add_child(l)
	l.global_transform = at
	return l


## Arbre : feuillu (tronc, charpentières, houppier en masses de feuilles) ou
## conifère (étages de branches retombantes). kind : « pine », « leafy » ou
## vide (tiré d'après la position). Quatre silhouettes de chaque essence,
## tournées et mises à l'échelle ; le feuillage est ajouré par le shader.
## Seul le tronc a une collision.
static func tree(g: Geo, zone: String, pos: Vector3, h: float = 9.0, kind: String = "") -> void:
	var rng := _rng(pos)
	var pine := rng.randf() < 0.4 if kind == "" else kind == "pine"
	var variant := rng.randi() % 4
	var k := h / 9.0
	var xf := Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(k, k, k)), pos)
	g.stamp(zone, "tree|%s|%d" % [pine, variant], xf,
		func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_tree(tg, tz, txf, pine, variant))
	g.solid(zone, pos + Vector3(0, 1.5, 0), Vector3(0.5, 3.0, 0.5))


static func _geo_tree(g: Geo, zone: String, xf: Transform3D, pine: bool, variant: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7919 * (variant + 1) + (101 if pine else 0)
	var h := 9.0
	var lean := Vector3(rng.randf_range(-0.04, 0.04), 1.0, rng.randf_range(-0.04, 0.04)).normalized()
	if pine:
		# Conifère : tronc jusqu'à la cime, verticilles de branches retombantes
		var top := lean * h
		g.cylinder(zone, "bark", xf * Vector3.ZERO, xf * top, 0.2, {"radius_b": 0.03, "segments": 9})
		var layers := 8
		for i in layers:
			var t := float(i) / float(layers - 1)
			var y := h * (0.16 + t * 0.78)
			var reach := h * (0.3 - t * 0.25) * rng.randf_range(0.9, 1.1)
			var base := lean * y
			var n_br := 7 if t < 0.7 else 5
			var a0 := rng.randf() * TAU
			for j in n_br:
				var a := a0 + TAU * float(j) / float(n_br) + rng.randf_range(-0.25, 0.25)
				var dir := Vector3(cos(a), 0, sin(a))
				var droop := rng.randf_range(0.25, 0.45)
				var basis := Basis.looking_at(-(dir * cos(droop) - Vector3.UP * sin(droop)), Vector3.UP)
				var c := base + dir * reach * 0.5 - Vector3.UP * reach * 0.5 * sin(droop)
				g.sphere(zone, "foliage_pine", xf * c, reach * 0.55, {"scale": Vector3(0.42, 0.2, 1.0), "basis": xf.basis.orthonormalized() * basis,
					"segments": 8, "rings": 5})
			# Cœur plein qui cache le tronc entre les branches
			g.sphere(zone, "foliage_pine", xf * (base + Vector3(0, h * 0.04, 0)), reach * 0.45, {"scale": Vector3(1.0, 0.6, 1.0),
				"basis": xf.basis.orthonormalized(), "segments": 8, "rings": 5})
		g.sphere(zone, "foliage_pine", xf * (top - Vector3(0, h * 0.04, 0)), h * 0.05, {"scale": Vector3(0.6, 1.6, 0.6),
			"basis": xf.basis.orthonormalized(), "segments": 8, "rings": 5})
		return
	# Feuillu : tronc, charpentières, houppier
	var trunk_top := lean * h * 0.5
	g.cylinder(zone, "bark", xf * Vector3.ZERO, xf * trunk_top, 0.24, {"radius_b": 0.15, "segments": 10})
	var crown := Vector3(0, h * 0.68, 0)
	for i in 5:
		var a2 := TAU * float(i) / 5.0 + rng.randf_range(-0.4, 0.4)
		var tip := crown + Vector3(cos(a2) * h * 0.22, rng.randf_range(-h * 0.04, h * 0.12), sin(a2) * h * 0.22)
		g.cylinder(zone, "bark", xf * trunk_top, xf * tip, 0.1, {"radius_b": 0.025, "segments": 7, "caps": false})
	for i in 11:
		var a3 := rng.randf() * TAU
		var d := sqrt(rng.randf()) * h * 0.24
		var c2 := crown + Vector3(cos(a3) * d, rng.randf_range(-h * 0.1, h * 0.17), sin(a3) * d)
		g.sphere(zone, "foliage", xf * c2, h * rng.randf_range(0.13, 0.19), {"scale": Vector3(1.0, rng.randf_range(0.7, 0.9), 1.0),
			"basis": xf.basis.orthonormalized() * Basis(Vector3.UP, rng.randf() * TAU), "segments": 12, "rings": 8})


static func fence(g: Geo, zone: String, a: Vector3, b: Vector3, h: float = 2.2) -> void:
	var len := a.distance_to(b)
	var n := maxi(1, int(len / 2.5))
	for i in n + 1:
		var p := a.lerp(b, float(i) / float(n))
		g.cylinder(zone, "metal_gray", p, p + Vector3(0, h, 0), 0.03, {"segments": 6})
	for y in [0.1, h * 0.5, h]:
		g.cylinder(zone, "metal_gray", a + Vector3(0, y, 0), b + Vector3(0, y, 0), 0.018, {"segments": 6, "caps": false})
	var dir := (b - a).normalized()
	g.solid(zone, (a + b) * 0.5 + Vector3(0, h * 0.5, 0), Vector3(len, h, 0.1), Basis(Vector3.UP, atan2(-dir.z, dir.x)))


## Réverbère : mât conique, crosse cintrée, lanterne. Renvoie la position de la
## vasque (sous la lanterne), pour y placer l'optique et la lumière.
static func lamp_post(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, h: float = 6.0) -> Vector3:
	var xf := _xf(pos, rot)
	g.stamp(zone, "lamp_post|%.2f" % h, xf, func(tg: Geo, tz: String, txf: Transform3D) -> void: _geo_lamp_post(tg, tz, txf, h))
	_solid(g, zone, xf, Vector3(0, h * 0.5, 0), Vector3(0.3, h, 0.3))
	return xf * Vector3(0, h - 0.07, -1.3)


static func _geo_lamp_post(g: Geo, zone: String, xf: Transform3D, h: float) -> void:
	_r(g, zone, "metal_dark", xf, Vector3(0, 0.25, 0), Vector3(0.3, 0.5, 0.3), 0.03)
	_c(g, zone, "metal_dark", xf, Vector3(0, 0.5, 0), Vector3(0, h - 0.3, 0), 0.085, {"radius_b": 0.05, "segments": 10})
	_tube(g, zone, "metal_dark", xf, [Vector3(0, h - 0.3, 0), Vector3(0, h - 0.05, -0.12), Vector3(0, h + 0.05, -0.45),
		Vector3(0, h, -1.05)], 0.04, {"segments": 8})
	# Lanterne : capot bombé, vasque dessous
	_r(g, zone, "metal_dark", xf, Vector3(0, h - 0.07, -1.3), Vector3(0.36, 0.14, 0.7), 0.05)
	_s(g, zone, "metal_dark", xf, Vector3(0, h - 0.01, -1.3), 0.2, Vector3(0.85, 0.35, 1.7), Basis.IDENTITY,
		{"segments": 12, "rings": 6})




## Applique murale extérieure (boîtier, visière) ; +Z local sort du mur. La
## vasque lumineuse est le panneau de la LightFixture associée.
static func wall_lamp(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_r(g, zone, "metal_dark", xf, Vector3(0, 0, 0.015), Vector3(0.36, 0.3, 0.03), 0.01)
	_r(g, zone, "metal_dark", xf, Vector3(0, -0.02, 0.12), Vector3(0.32, 0.2, 0.2), 0.03)
	_r(g, zone, "metal_dark", xf, Vector3(0, 0.085, 0.14), Vector3(0.36, 0.03, 0.26), 0.012, Basis(Vector3.RIGHT, 0.12))
	for s in [-1.0, 1.0]:
		_c(g, zone, "metal_chrome", xf, Vector3(s * 0.14, 0.11, 0.03), Vector3(s * 0.14, 0.11, 0.0), 0.008, {"segments": 6})

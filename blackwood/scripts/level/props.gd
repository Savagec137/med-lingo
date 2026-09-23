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


# --- Mobilier de bureau -------------------------------------------------

static func desk(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "wood_desk",
		w: float = 1.4, d: float = 0.7) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, 0.74, 0), Vector3(w, 0.04, d))
	_b(g, zone, mat, xf, Vector3(-w * 0.5 + 0.03, 0.36, 0), Vector3(0.04, 0.72, d - 0.04))
	_b(g, zone, mat, xf, Vector3(w * 0.5 - 0.22, 0.36, 0), Vector3(0.42, 0.72, d - 0.04))
	_b(g, zone, mat, xf, Vector3(0, 0.5, d * 0.5 - 0.04), Vector3(w - 0.1, 0.44, 0.02))
	for i in 3:
		var y := 0.6 - i * 0.22
		_b(g, zone, mat, xf, Vector3(w * 0.5 - 0.22, y, -d * 0.5 + 0.01), Vector3(0.38, 0.19, 0.01))
		_b(g, zone, "metal_steel", xf, Vector3(w * 0.5 - 0.22, y + 0.04, -d * 0.5 - 0.005), Vector3(0.12, 0.015, 0.015))
	_solid(g, zone, xf, Vector3(0, 0.38, 0), Vector3(w, 0.76, d))


static func office_chair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, tipped: bool = false) -> void:
	var xf := _xf(pos, rot)
	if tipped:
		xf = xf * Transform3D(Basis(Vector3.RIGHT, PI / 2.0), Vector3(0, 0.25, 0))
	_b(g, zone, "fabric_blue", xf, Vector3(0, 0.47, 0), Vector3(0.46, 0.07, 0.44))
	_b(g, zone, "fabric_blue", xf, Vector3(0, 0.8, 0.21), Vector3(0.44, 0.52, 0.06))
	_c(g, zone, "plastic_dark", xf, Vector3(0, 0.08, 0), Vector3(0, 0.45, 0), 0.03)
	_b(g, zone, "plastic_dark", xf, Vector3(0, 0.06, 0), Vector3(0.6, 0.04, 0.06))
	_b(g, zone, "plastic_dark", xf, Vector3(0, 0.06, 0), Vector3(0.06, 0.04, 0.6))
	if not tipped:
		_solid(g, zone, xf, Vector3(0, 0.45, 0.05), Vector3(0.5, 0.9, 0.5), false)


static func chair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "metal_gray",
		seat_mat: String = "plastic_orange") -> void:
	var xf := _xf(pos, rot)
	for x in [-0.2, 0.2]:
		for z in [-0.19, 0.19]:
			_c(g, zone, mat, xf, Vector3(x, 0, z), Vector3(x, 0.44, z), 0.015, {"caps": false, "segments": 6})
	_b(g, zone, seat_mat, xf, Vector3(0, 0.46, 0), Vector3(0.44, 0.04, 0.42))
	_b(g, zone, seat_mat, xf, Vector3(0, 0.75, 0.2), Vector3(0.44, 0.34, 0.03), false, Basis(Vector3.RIGHT, -0.12))
	_c(g, zone, mat, xf, Vector3(-0.2, 0.44, 0.19), Vector3(-0.2, 0.9, 0.23), 0.012, {"caps": false, "segments": 6})
	_c(g, zone, mat, xf, Vector3(0.2, 0.44, 0.19), Vector3(0.2, 0.9, 0.23), 0.012, {"caps": false, "segments": 6})
	_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.46, 0.9, 0.46), false)


static func bench_row(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, n: int = 4,
		seat_mat: String = "fabric_blue") -> void:
	var xf := _xf(pos, rot)
	var w := n * 0.56
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.26, 0.05), Vector3(w, 0.06, 0.07))
	for x in [-w * 0.5 + 0.1, w * 0.5 - 0.1]:
		_b(g, zone, "metal_dark", xf, Vector3(x, 0.14, 0.05), Vector3(0.05, 0.28, 0.4))
	for i in n:
		var x := -w * 0.5 + 0.28 + i * 0.56
		_b(g, zone, seat_mat, xf, Vector3(x, 0.45, 0), Vector3(0.5, 0.07, 0.46))
		_b(g, zone, seat_mat, xf, Vector3(x, 0.75, 0.22), Vector3(0.5, 0.45, 0.06), false, Basis(Vector3.RIGHT, -0.1))
		_b(g, zone, "metal_dark", xf, Vector3(x, 0.35, 0.05), Vector3(0.04, 0.16, 0.3))
	_solid(g, zone, xf, Vector3(0, 0.45, 0.05), Vector3(w, 0.9, 0.55))


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
	for x in [-0.42, 0.42]:
		for z in [-0.9, 0.9]:
			_c(g, zone, "metal_steel", xf, Vector3(x, 0.08, z), Vector3(x, 0.5, z), 0.018, {"caps": false, "segments": 6})
			_c(g, zone, "rubber", xf, Vector3(x - 0.02, 0.05, z), Vector3(x + 0.02, 0.05, z), 0.045, {"segments": 8})
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.5, 0), Vector3(0.92, 0.06, 2.0))
	_b(g, zone, "mattress", xf, Vector3(0, 0.6, 0.02), Vector3(0.86, 0.14, 1.92))
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.72, 0.78), Vector3(0.58, 0.1, 0.34), false, Basis(Vector3.RIGHT, 0.2))
	_b(g, zone, "plastic_beige", xf, Vector3(0, 0.82, 1.0), Vector3(0.94, 0.55, 0.05))
	_b(g, zone, "plastic_beige", xf, Vector3(0, 0.72, -1.0), Vector3(0.94, 0.4, 0.05))
	if unmade:
		_b(g, zone, "fabric_green", xf, Vector3(0.1, 0.69, -0.35), Vector3(0.9, 0.04, 1.1), false, Basis(Vector3.FORWARD, 0.08) * Basis(Vector3.UP, 0.15))
	if stained:
		_b(g, zone, "gown", xf, Vector3(-0.05, 0.675, 0.1), Vector3(0.7, 0.01, 0.9))
	for s in [-1.0, 1.0]:
		_b(g, zone, "metal_steel", xf, Vector3(s * 0.47, 0.78, 0.1), Vector3(0.02, 0.2, 0.9))
	_solid(g, zone, xf, Vector3(0, 0.5, 0), Vector3(0.95, 1.0, 2.05))


static func gurney(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, tipped: bool = false) -> void:
	var xf := _xf(pos, rot)
	if tipped:
		xf = xf * Transform3D(Basis(Vector3.BACK, PI / 2.0 - 0.1), Vector3(0.45, 0.32, 0))
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.78, 0), Vector3(0.62, 0.04, 1.9))
	_b(g, zone, "mattress", xf, Vector3(0, 0.84, 0), Vector3(0.58, 0.08, 1.85))
	for z in [-0.8, 0.8]:
		_c(g, zone, "metal_steel", xf, Vector3(0, 0.12, z), Vector3(0, 0.76, z), 0.025, {"caps": false, "segments": 6})
		_b(g, zone, "metal_steel", xf, Vector3(0, 0.1, z), Vector3(0.5, 0.03, 0.05))
	if not tipped:
		_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.62, 0.9, 1.9))
	else:
		_solid(g, zone, _xf(pos, rot), Vector3(0, 0.35, 0), Vector3(0.9, 0.7, 1.9))


static func wheelchair(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	for s in [-1.0, 1.0]:
		_c(g, zone, "rubber", xf, Vector3(s * 0.3, 0.3, 0.05), Vector3(s * 0.33, 0.3, 0.05), 0.3, {"segments": 14})
		_c(g, zone, "rubber", xf, Vector3(s * 0.2, 0.07, -0.35), Vector3(s * 0.22, 0.07, -0.35), 0.07, {"segments": 8})
		_c(g, zone, "metal_steel", xf, Vector3(s * 0.25, 0.45, 0.25), Vector3(s * 0.25, 0.95, 0.3), 0.012, {"caps": false, "segments": 6})
	_b(g, zone, "fabric_blue", xf, Vector3(0, 0.5, -0.05), Vector3(0.46, 0.04, 0.42))
	_b(g, zone, "fabric_blue", xf, Vector3(0, 0.75, 0.22), Vector3(0.46, 0.42, 0.03))
	_solid(g, zone, xf, Vector3(0, 0.45, 0), Vector3(0.66, 0.9, 0.8), false)


static func iv_stand(g: Geo, zone: String, pos: Vector3) -> void:
	var xf := _xf(pos, 0.0)
	_c(g, zone, "metal_steel", xf, Vector3(0, 0.05, 0), Vector3(0, 1.85, 0), 0.012, {"segments": 6})
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.04, 0), Vector3(0.5, 0.03, 0.04))
	_b(g, zone, "metal_steel", xf, Vector3(0, 0.04, 0), Vector3(0.04, 0.03, 0.5))
	_b(g, zone, "metal_steel", xf, Vector3(0, 1.84, 0), Vector3(0.3, 0.015, 0.015))
	_b(g, zone, "glass_dirty", xf, Vector3(0.12, 1.7, 0), Vector3(0.08, 0.18, 0.03))


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
	_c(g, zone, "plastic_dark", xf, Vector3(0, 0, 0), Vector3(0, 0.45, 0), 0.22, {"radius_b": 0.26, "segments": 12})
	_c(g, zone, "ground", xf, Vector3(0, 0.44, 0), Vector3(0, 0.46, 0), 0.24, {"segments": 12})
	var rng := _rng(pos)
	for i in 7:
		var a := rng.randf() * TAU
		var tip := Vector3(cos(a) * rng.randf_range(0.2, 0.5), rng.randf_range(0.8, 1.4), sin(a) * rng.randf_range(0.2, 0.5))
		_c(g, zone, "bark", xf, Vector3(0, 0.45, 0), tip, 0.012, {"radius_b": 0.004, "segments": 5, "caps": false})
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


static func vending_machine(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "car_red", xf, Vector3(0, 0.93, 0), Vector3(0.9, 1.86, 0.8), true)
	_b(g, zone, "glass_dirty", xf, Vector3(-0.1, 1.1, -0.405), Vector3(0.6, 1.2, 0.01))
	var rng := _rng(pos)
	for r in 5:
		for c in 4:
			if rng.randf() < 0.7:
				_b(g, zone, ["plastic_orange", "metal_blue", "plastic_white", "metal_yellow"][rng.randi() % 4], xf, Vector3(-0.35 + c * 0.16, 0.6 + r * 0.22, -0.3), Vector3(0.1, 0.16, 0.12))
	_b(g, zone, "plastic_dark", xf, Vector3(0.33, 1.2, -0.405), Vector3(0.14, 0.4, 0.01))
	_b(g, zone, "black", xf, Vector3(0, 0.25, -0.405), Vector3(0.6, 0.18, 0.01))


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

static func car(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, mat: String = "car_gray",
		door_open: bool = false) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, 0.62, 0), Vector3(1.78, 0.62, 4.3))
	_b(g, zone, mat, xf, Vector3(0, 1.18, 0.35), Vector3(1.6, 0.52, 2.2))
	_b(g, zone, "glass_dirty", xf, Vector3(0, 1.2, -0.76), Vector3(1.5, 0.44, 0.04), false, Basis(Vector3.RIGHT, -0.55))
	_b(g, zone, "glass_dirty", xf, Vector3(0, 1.2, 1.45), Vector3(1.5, 0.42, 0.04), false, Basis(Vector3.RIGHT, 0.5))
	for s in [-1.0, 1.0]:
		_b(g, zone, "glass_dirty", xf, Vector3(s * 0.805, 1.2, 0.35), Vector3(0.01, 0.38, 2.0))
		for z in [-1.35, 1.35]:
			_c(g, zone, "rubber", xf, Vector3(s * 0.78, 0.33, z), Vector3(s * 0.95, 0.33, z), 0.33, {"segments": 12})
			_c(g, zone, "metal_steel", xf, Vector3(s * 0.955, 0.33, z), Vector3(s * 0.96, 0.33, z), 0.18, {"segments": 10})
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.45, -2.17), Vector3(1.8, 0.2, 0.08))
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.45, 2.17), Vector3(1.8, 0.2, 0.08))
	for s in [-1.0, 1.0]:
		_b(g, zone, "light_off", xf, Vector3(s * 0.65, 0.72, -2.16), Vector3(0.32, 0.12, 0.04))
		_b(g, zone, "emit_taillight", xf, Vector3(s * 0.65, 0.75, 2.16), Vector3(0.3, 0.1, 0.04))
	if door_open:
		_b(g, zone, mat, xf, Vector3(-1.35, 0.85, -0.05), Vector3(0.06, 0.9, 1.1), false, Basis(Vector3.UP, -0.9))
	_solid(g, zone, xf, Vector3(0, 0.75, 0), Vector3(1.9, 1.5, 4.4))


static func ambulance(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "car_white", xf, Vector3(0, 1.35, 0.6), Vector3(2.1, 2.1, 3.9))
	_b(g, zone, "car_white", xf, Vector3(0, 0.95, -2.05), Vector3(2.0, 1.3, 1.5))
	_b(g, zone, "glass_dirty", xf, Vector3(0, 1.35, -2.72), Vector3(1.8, 0.55, 0.04), false, Basis(Vector3.RIGHT, -0.35))
	for s in [-1.0, 1.0]:
		_b(g, zone, "car_red", xf, Vector3(s * 1.06, 1.3, 0.6), Vector3(0.01, 0.2, 3.9))
		for z in [-1.9, 1.6]:
			_c(g, zone, "rubber", xf, Vector3(s * 0.85, 0.38, z), Vector3(s * 1.02, 0.38, z), 0.38, {"segments": 12})
	_b(g, zone, "light_off", xf, Vector3(0, 2.45, -0.9), Vector3(1.4, 0.12, 0.25))
	_b(g, zone, "black", xf, Vector3(0, 1.3, 2.56), Vector3(1.9, 1.8, 0.02))
	_solid(g, zone, xf, Vector3(0, 1.2, 0.0), Vector3(2.2, 2.4, 5.5))


static func tree(g: Geo, zone: String, pos: Vector3, h: float = 9.0) -> void:
	var rng := _rng(pos)
	g.cylinder(zone, "bark", pos, pos + Vector3(0, h * 0.5, 0), 0.22, {"radius_b": 0.14, "segments": 8, "collide": true})
	var layers := 4
	for i in layers:
		var y := h * (0.25 + i * 0.18)
		var r := (1.0 - float(i) / layers) * h * 0.26 + 0.4
		g.cylinder(zone, "foliage", pos + Vector3(rng.randf_range(-0.1, 0.1), y, 0), pos + Vector3(0, y + h * 0.3, 0), r,
			{"radius_b": 0.0, "segments": 9, "caps": true})


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


static func lamp_post(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, h: float = 6.0) -> Vector3:
	var xf := _xf(pos, rot)
	_c(g, zone, "metal_dark", xf, Vector3(0, 0, 0), Vector3(0, h, 0), 0.08, {"radius_b": 0.05, "segments": 8, "collide": true})
	_c(g, zone, "metal_dark", xf, Vector3(0, h - 0.1, 0), Vector3(0, h, -1.2), 0.04, {"segments": 6})
	_b(g, zone, "metal_dark", xf, Vector3(0, h - 0.02, -1.3), Vector3(0.35, 0.12, 0.6))
	return xf * Vector3(0, h - 0.12, -1.3)

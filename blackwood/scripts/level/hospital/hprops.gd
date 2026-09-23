class_name HProps
extends RefCounted
## Accessoires propres à l'hôpital : cadavres, rideaux de box, comptoirs,
## négatoscopes, générateurs, baies informatiques, cuves, vaccins ECHO…
## Même convention que Props : position au sol, rotation autour de Y, la face
## « avant » de l'objet regarde -Z local.


static func _xf(pos: Vector3, rot: float) -> Transform3D:
	return Transform3D(Basis(Vector3.UP, rot), pos)


static func _b(g: Geo, zone: String, mat: String, xf: Transform3D, c: Vector3, s: Vector3,
		collide: bool = false, extra: Basis = Basis.IDENTITY) -> void:
	g.box(zone, mat, xf * c, s, {"basis": xf.basis * extra, "collide": collide})


static func corpse(f: Facility, zone: String, pos: Vector3, rot: float = 0.0, kind: String = "back",
		look: Dictionary = {}, h: float = 1.0) -> Corpse:
	var c := Corpse.new()
	c.kind = kind
	c.look = look
	c.body_height = h
	c.position = pos
	c.rotation.y = rot
	f.geo.zone_root(zone).add_child(c)
	return c


## Rail et rideau de box (urgences, chambres doubles). open : fraction repliée.
static func curtain(g: Geo, zone: String, a: Vector3, b: Vector3, h: float = 2.3, open: float = 0.3,
		mat: String = "fabric_green") -> void:
	g.cylinder(zone, "metal_steel", a + Vector3(0, h, 0), b + Vector3(0, h, 0), 0.015, {"segments": 6, "shadow": false})
	var length := a.distance_to(b)
	var dir := (b - a).normalized()
	var closed := length * (1.0 - open)
	var n := maxi(2, int(closed / 0.22))
	var side := dir.cross(Vector3.UP).normalized()
	for i in n:
		var t := (i + 0.5) / float(n) * closed
		var p := a + dir * t + side * (0.04 if i % 2 == 0 else -0.04)
		g.box(zone, mat, p + Vector3(0, h * 0.5 + 0.05, 0), Vector3(0.25, h - 0.3, 0.03),
			{"basis": Basis(Vector3.UP, atan2(-dir.z, dir.x) + (0.35 if i % 2 == 0 else -0.35)), "collide": false})
	# Partie repliée : plis serrés
	var fold := a + dir * (closed + length * open * 0.5)
	if open > 0.05:
		g.box(zone, mat, fold + Vector3(0, h * 0.5 + 0.05, 0), Vector3(0.12, h - 0.3, 0.16),
			{"basis": Basis(Vector3.UP, atan2(-dir.z, dir.x)), "collide": false})
	if closed > 0.3:
		g.solid(zone, a + dir * closed * 0.5 + Vector3(0, 1.0, 0), Vector3(closed, 2.0, 0.08), Basis(Vector3.UP, atan2(-dir.z, dir.x)), false)


## Comptoir d'accueil (w de long) ; le public est côté -Z local.
static func reception_desk(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, w: float = 4.0,
		mat: String = "wood_desk") -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, mat, xf, Vector3(0, 0.55, -0.25), Vector3(w, 1.1, 0.08))
	_b(g, zone, "metal_steel", xf, Vector3(0, 1.12, -0.32), Vector3(w + 0.1, 0.04, 0.34))
	_b(g, zone, mat, xf, Vector3(0, 0.74, 0.1), Vector3(w - 0.1, 0.04, 0.7))
	for x in [-w * 0.5 + 0.05, w * 0.5 - 0.05]:
		_b(g, zone, mat, xf, Vector3(x, 0.55, 0.05), Vector3(0.08, 1.1, 0.6))
	_b(g, zone, "fabric_blue", xf, Vector3(0, 0.3, -0.3), Vector3(w - 0.3, 0.3, 0.01))
	g.solid(zone, xf * Vector3(0, 0.55, -0.05), Vector3(w, 1.1, 0.5), xf.basis)


## Négatoscope mural (écran lumineux pour radiographies).
static func lightbox(f: Facility, zone: String, pos: Vector3, rot: float = 0.0, lit: bool = true) -> void:
	var g := f.geo
	var xf := _xf(pos, rot)
	_b(g, zone, "metal_white", xf, Vector3(0, 0, 0.03), Vector3(1.3, 0.62, 0.06))
	_b(g, zone, "emit_white_dim" if lit else "screen_off", xf, Vector3(0, 0, -0.005), Vector3(1.22, 0.54, 0.01))
	_b(g, zone, "black", xf, Vector3(-0.3, 0, -0.012), Vector3(0.4, 0.5, 0.004))
	_b(g, zone, "black", xf, Vector3(0.3, 0, -0.012), Vector3(0.4, 0.5, 0.004))


## Appareil de radiologie : table + bras en C.
static func xray(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.45, 0), Vector3(0.8, 0.9, 2.2), true)
	_b(g, zone, "plastic_white", xf, Vector3(0, 0.93, 0), Vector3(0.7, 0.06, 2.0))
	_b(g, zone, "plastic_white", xf, Vector3(-0.75, 1.3, 0), Vector3(0.25, 2.6, 0.4), true)
	_b(g, zone, "plastic_white", xf, Vector3(-0.3, 2.4, 0), Vector3(0.9, 0.25, 0.35))
	_b(g, zone, "metal_dark", xf, Vector3(0.05, 2.1, 0), Vector3(0.45, 0.4, 0.45))
	g.cylinder(zone, "plastic_dark", xf * Vector3(0.05, 1.9, 0), xf * Vector3(0.05, 1.85, 0), 0.2, {"segments": 14})


## Groupe électrogène diesel.
static func generator(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "metal_green", xf, Vector3(0, 1.0, 0), Vector3(3.6, 2.0, 1.7), true)
	_b(g, zone, "metal_dark", xf, Vector3(0, 0.08, 0), Vector3(3.9, 0.16, 1.9), true)
	for i in 6:
		_b(g, zone, "metal_dark", xf, Vector3(-1.2 + i * 0.3, 1.3, -0.86), Vector3(0.18, 0.9, 0.02))
	_b(g, zone, "metal_yellow", xf, Vector3(1.3, 1.5, -0.86), Vector3(0.6, 0.4, 0.02))
	g.cylinder(zone, "metal_rust", xf * Vector3(1.4, 2.0, 0.3), xf * Vector3(1.4, 3.6, 0.3), 0.14, {"segments": 10})
	g.cylinder(zone, "metal_dark", xf * Vector3(-1.9, 0.6, 0.0), xf * Vector3(-2.4, 0.6, 0.0), 0.08, {"segments": 8})


static func fuel_tank(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	g.cylinder(zone, "metal_rust", xf * Vector3(-1.4, 0.8, 0), xf * Vector3(1.4, 0.8, 0), 0.75, {"segments": 16, "collide": true})
	for x in [-1.0, 1.0]:
		_b(g, zone, "metal_dark", xf, Vector3(x, 0.2, 0), Vector3(0.15, 0.4, 1.2))
	_b(g, zone, "metal_yellow", xf, Vector3(0, 0.95, -0.76), Vector3(0.8, 0.3, 0.01))


## Armoire électrique (n modules côte à côte).
static func electrical_cabinet(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, n: int = 3) -> void:
	var xf := _xf(pos, rot)
	for i in n:
		var x := (i - (n - 1) * 0.5) * 0.82
		_b(g, zone, "metal_gray", xf, Vector3(x, 1.0, 0), Vector3(0.8, 2.0, 0.5))
		_b(g, zone, "metal_gray", xf, Vector3(x, 1.0, -0.26), Vector3(0.74, 1.9, 0.02))
		_b(g, zone, "metal_yellow", xf, Vector3(x, 1.65, -0.275), Vector3(0.2, 0.14, 0.005))
		_b(g, zone, "metal_steel", xf, Vector3(x + 0.3, 1.0, -0.29), Vector3(0.03, 0.2, 0.03))
	g.solid(zone, xf * Vector3(0, 1.0, 0), Vector3(n * 0.82, 2.0, 0.5), xf.basis)


## Baie de serveurs avec diodes.
static func server_rack(g: Geo, zone: String, pos: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_dark", xf, Vector3(0, 1.0, 0), Vector3(0.62, 2.0, 1.0), true)
	for i in 10:
		_b(g, zone, "metal_dark", xf, Vector3(0, 0.25 + i * 0.17, -0.505), Vector3(0.56, 0.14, 0.01))
		_b(g, zone, "emit_green" if i % 3 != 0 else "emit_amber", xf, Vector3(0.22, 0.25 + i * 0.17, -0.512), Vector3(0.02, 0.02, 0.005))


## Pupitre de contrôle avec écrans (retourne les écrans pour les animer).
static func console(f: Facility, zone: String, pos: Vector3, rot: float = 0.0, w: float = 3.0,
		screen: String = "screen_terminal", n_screens: int = 3) -> Array:
	var g := f.geo
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_dark", xf, Vector3(0, 0.45, 0.1), Vector3(w, 0.9, 0.7))
	_b(g, zone, "plastic_dark", xf, Vector3(0, 0.95, -0.1), Vector3(w, 0.08, 0.55), false, Basis(Vector3.RIGHT, 0.25))
	for i in 12:
		_b(g, zone, ["emit_green", "emit_amber", "emit_red"][i % 3], xf, Vector3(-w * 0.4 + i * w * 0.07, 1.0, -0.2), Vector3(0.03, 0.01, 0.03))
	g.solid(zone, xf * Vector3(0, 0.5, 0.05), Vector3(w, 1.0, 0.8), xf.basis)
	var screens := []
	for i in n_screens:
		var x := (i - (n_screens - 1) * 0.5) * (w / n_screens)
		_b(g, zone, "plastic_dark", xf, Vector3(x, 1.35, 0.25), Vector3(w / n_screens - 0.08, 0.5, 0.06))
		var mi := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(w / n_screens - 0.14, 0.42)
		mi.mesh = q
		mi.material_override = Mats.get_mat(screen)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		g.zone_root(zone).add_child(mi)
		mi.global_transform = Transform3D(xf.basis * Basis(Vector3.UP, PI), xf * Vector3(x, 1.35, 0.215))
		screens.append(mi)
	return screens


## Mur d'écrans de vidéosurveillance.
static func monitor_wall(f: Facility, zone: String, pos: Vector3, rot: float = 0.0, cols: int = 4, rows: int = 2) -> void:
	var g := f.geo
	var xf := _xf(pos, rot)
	_b(g, zone, "plastic_dark", xf, Vector3(0, 1.55, 0.06), Vector3(cols * 0.62 + 0.1, rows * 0.45 + 0.1, 0.12))
	for c in cols:
		for r in rows:
			var mi := MeshInstance3D.new()
			var q := QuadMesh.new()
			q.size = Vector2(0.56, 0.4)
			mi.mesh = q
			mi.material_override = Mats.get_mat(["screen_snow", "screen_terminal", "screen_error", "screen_snow"][(c + r * 3) % 4])
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			g.zone_root(zone).add_child(mi)
			var local := Vector3((c - (cols - 1) * 0.5) * 0.62, 1.55 + (r - (rows - 1) * 0.5) * 0.45, -0.005)
			mi.global_transform = Transform3D(xf.basis * Basis(Vector3.UP, PI), xf * local)


## Cuve de culture avec un corps en suspension.
static func tank(f: Facility, zone: String, pos: Vector3, occupant: bool = true, liquid: String = "liquid_green",
		radius: float = 0.65, height: float = 2.4) -> void:
	var g := f.geo
	g.cylinder(zone, "metal_dark", pos, pos + Vector3(0, 0.3, 0), radius + 0.12, {"segments": 18, "collide": true})
	g.cylinder(zone, "metal_dark", pos + Vector3(0, height + 0.3, 0), pos + Vector3(0, height + 0.55, 0), radius + 0.12, {"segments": 18})
	g.cylinder(zone, "rubber", pos + Vector3(0.2, height + 0.55, 0), pos + Vector3(0.2, 3.4, 0.1), 0.04, {"segments": 6})
	g.cylinder(zone, "rubber", pos + Vector3(-0.25, height + 0.55, 0.1), pos + Vector3(-0.3, 3.4, 0.2), 0.03, {"segments": 6})
	g.solid(zone, pos + Vector3(0, (height + 0.55) * 0.5, 0), Vector3(radius * 2.0, height + 0.55, radius * 2.0))
	var root := g.zone_root(zone)
	var glass := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = 22
	glass.mesh = cm
	glass.material_override = Mats.get_mat("tank_glass")
	glass.position = pos + Vector3(0, 0.3 + height * 0.5, 0)
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(glass)
	var liq := MeshInstance3D.new()
	var lm := CylinderMesh.new()
	lm.top_radius = radius - 0.03
	lm.bottom_radius = radius - 0.03
	lm.height = height - 0.2
	lm.radial_segments = 22
	liq.mesh = lm
	liq.material_override = Mats.get_mat(liquid)
	liq.position = pos + Vector3(0, 0.3 + height * 0.5 - 0.08, 0)
	liq.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(liq)
	if occupant:
		var c := corpse(f, zone, pos + Vector3(0, 0.45, 0), randf() * TAU, "float", {"pallor": 0.7, "blood": 0.1, "wet": 1.0}, 0.92)
		var tw := c.create_tween().set_loops()
		tw.tween_property(c, "position:y", c.position.y + 0.07, 3.2).set_trans(Tween.TRANS_SINE)
		tw.tween_property(c, "position:y", c.position.y, 3.2).set_trans(Tween.TRANS_SINE)


## Étagère réfrigérée de doses (flacons lumineux).
static func dose_rack(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, w: float = 2.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "metal_white", xf, Vector3(0, 1.0, 0.05), Vector3(w, 2.0, 0.5), true)
	_b(g, zone, "glass", xf, Vector3(0, 1.05, -0.21), Vector3(w - 0.06, 1.8, 0.01))
	for i in 5:
		var y := 0.35 + i * 0.36
		_b(g, zone, "metal_steel", xf, Vector3(0, y, 0), Vector3(w - 0.1, 0.02, 0.4))
		var n := int((w - 0.2) / 0.06)
		for k in n:
			_b(g, zone, "emit_green" if (k + i) % 7 != 0 else "emit_amber", xf, Vector3(-w * 0.5 + 0.13 + k * 0.06, y + 0.05, -0.1), Vector3(0.025, 0.08, 0.025))


## Barrière de quarantaine avec bâche.
static func barrier(g: Geo, zone: String, a: Vector3, b: Vector3) -> void:
	var dir := (b - a)
	var length := dir.length()
	var rot := atan2(-dir.z, dir.x)
	var mid := (a + b) * 0.5
	g.box(zone, "metal_yellow", mid + Vector3(0, 1.0, 0), Vector3(length, 0.1, 0.06), {"rot": rot, "collide": false})
	g.box(zone, "metal_yellow", mid + Vector3(0, 0.5, 0), Vector3(length, 0.1, 0.06), {"rot": rot, "collide": false})
	var n := maxi(1, int(length / 2.0))
	for i in n + 1:
		var p := a.lerp(b, float(i) / float(n))
		g.box(zone, "metal_dark", p + Vector3(0, 0.55, 0), Vector3(0.06, 1.1, 0.06), {"collide": false})
		g.box(zone, "metal_dark", p + Vector3(0, 0.02, 0), Vector3(0.5, 0.04, 0.5), {"rot": rot, "collide": false})
	g.box(zone, "plastic_sheet", mid + Vector3(0, 0.75, 0.02), Vector3(length, 0.45, 0.01), {"rot": rot, "collide": false})
	g.solid(zone, mid + Vector3(0, 0.55, 0), Vector3(length, 1.1, 0.2), Basis(Vector3.UP, rot))


## Chariot de soins.
static func cart(g: Geo, zone: String, pos: Vector3, rot: float = 0.0, tipped: bool = false) -> void:
	var xf := _xf(pos, rot)
	if tipped:
		xf = xf * Transform3D(Basis(Vector3.FORWARD, PI / 2.0 - 0.05), Vector3(0.3, 0.3, 0))
	for y in [0.2, 0.55, 0.9]:
		_b(g, zone, "metal_steel", xf, Vector3(0, y, 0), Vector3(0.7, 0.03, 0.45))
	for x in [-0.33, 0.33]:
		for z in [-0.2, 0.2]:
			_b(g, zone, "metal_steel", xf, Vector3(x, 0.47, z), Vector3(0.025, 0.9, 0.025))
	_b(g, zone, "plastic_white", xf, Vector3(-0.1, 0.97, 0.05), Vector3(0.2, 0.1, 0.15))
	_b(g, zone, "plastic_orange", xf, Vector3(0.18, 0.95, -0.05), Vector3(0.14, 0.06, 0.1))
	g.solid(zone, _xf(pos, rot) * Vector3(0, 0.45, 0), Vector3(0.75, 0.9, 0.5), Basis(Vector3.UP, rot), false)


## Traînée de sang de a vers b.
static func blood_trail(f: Facility, zone: String, a: Vector3, b: Vector3, n: int = 6) -> void:
	for i in n:
		var t := (i + 0.5) / float(n)
		var p := a.lerp(b, t) + Vector3(randf_range(-0.12, 0.12), 0, randf_range(-0.12, 0.12))
		f.add_blood(zone, p, randf_range(0.35, 0.7), "blood_smear" if i % 2 == 0 else "blood_dry", Vector3.UP, randf() * TAU)


## Bloc de climatisation / machinerie de toit.
static func rooftop_unit(g: Geo, zone: String, pos: Vector3, size: Vector3, rot: float = 0.0) -> void:
	var xf := _xf(pos, rot)
	_b(g, zone, "metal_gray", xf, Vector3(0, size.y * 0.5, 0), size)
	for i in 3:
		g.cylinder(zone, "metal_dark", xf * Vector3(-size.x * 0.3 + i * size.x * 0.3, size.y, 0), xf * Vector3(-size.x * 0.3 + i * size.x * 0.3, size.y + 0.08, 0), minf(size.z, size.x / 3.5) * 0.4, {"segments": 12})


## Lit d'hôpital + perfusion + moniteur (chambre).
static func patient_bed(f: Facility, zone: String, pos: Vector3, rot: float = 0.0, stained: bool = false) -> void:
	var g := f.geo
	Props.hospital_bed(g, zone, pos, rot, stained)
	var xf := _xf(pos, rot)
	Props.iv_stand(g, zone, xf * Vector3(0.7, 0, 0.7))
	var mon := xf * Vector3(-0.72, 0, 0.9)
	g.box(zone, "metal_gray", mon + Vector3(0, 0.5, 0), Vector3(0.35, 1.0, 0.35))
	Props.computer(g, zone, mon + Vector3(0, 1.0, 0), rot + PI, "screen_ecg" if randf() < 0.3 else "screen_off")

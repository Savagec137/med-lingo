class_name HExterior
extends RefCounted
## Extérieur de Blackwood Hospital : la rue sous la pluie, le parking vide,
## le parvis et l'entrée principale enchaînée, la rampe des ambulances qui
## descend aux urgences (-1), et l'enveloppe complète de la tour de 12 étages
## (façades, fenêtres, toit, enseigne) — toujours visible.

const Z := "exterior"
const SHELL := "shell"
const TOP_Y := 52.0
const SODIUM := Color(1.0, 0.62, 0.3)

## Plages X des fenêtres laissées dégagées (sans store) sur la façade sud.
const OPEN_SOUTH := {
	0: [Vector2(-32, 32)], 1: [Vector2(-32, 32)], 3: [Vector2(-32, 8)], 6: [Vector2(-24, 20)],
	8: [Vector2(-32, 32)], 11: [Vector2(-16, 16)], 12: [Vector2(-32, 32)],
}
## Revêtement intérieur des murs de façade, par étage.
const INNER := {
	-2: "wall_concrete", -1: "wall_hospital_dirty", 0: "wall_hospital", 1: "wall_hospital", 3: "wall_neuro",
	6: "wall_infect", 8: "wall_lab", 11: "wall_admin", 12: "wall_lab",
}


static func build(f: Facility) -> void:
	var g := f.geo
	Facility.ZONES[Z] = {"name": "Blackwood Hospital", "always": true,
		"rects": [Rect2(-120, 0.3, 240, 90), Rect2(-120, -80, 87.7, 80.3), Rect2(32.3, -80, 87.7, 80.3), Rect2(-32.3, -80, 64.6, 53.7)],
		"ymin": -5.0, "ymax": 60.0, "reverb": "outdoor", "surface": "outdoor",
		"ambience": {"amb_rain": 0.9, "amb_wind": 0.45}, "neighbors": [], "moon": true}
	_ground(f, g)
	_ramp(f, g)
	_shell(f, g)
	_entrance(f, g)
	_roof(f, g)
	_street_props(f, g)
	_city(g)


# --- Sol --------------------------------------------------------------------------

static func _ground(f: Facility, g: Geo) -> void:
	var grounds := [
		Rect2(-120, -80, 86, 102), Rect2(-34, -80, 154, 53.7), Rect2(32.3, -26.3, 1.7, 48.3),
		Rect2(34, -26.3, 12, 24.3), Rect2(46, -26.3, 74, 24.3), Rect2(42, -2, 78, 24), Rect2(-34, -26.3, 1.7, 26.6),
	]
	for r in grounds:
		g.slab(Z, "ground", r.position.x, r.position.y, r.end.x, r.end.y, 0.0, 0.3)
	# Parvis, parking, trottoirs, rue
	g.slab(Z, "floor_concrete", -34, 0.3, 32.3, 4.0, 0.0, 0.3)
	g.slab(Z, "asphalt", -34, 4.0, 32.3, 22.0, 0.0, 0.3)
	g.slab(Z, "curb", -120, 22.0, 120, 26.0, 0.0, 0.3)
	g.slab(Z, "asphalt", -120, 26.0, 120, 38.0, 0.0, 0.3)
	g.slab(Z, "curb", -120, 38.0, 120, 42.0, 0.0, 0.3)
	g.slab(Z, "ground", -120, 42.0, 120, 90.0, 0.0, 0.3)
	# Bordures de trottoir (décor : on les franchit sans à-coup)
	for bz in [26.0, 38.0]:
		g.box(Z, "curb", Vector3(0, 0.03, bz), Vector3(240.0, 0.06, 0.25), {"collide": false})
	# Marquages du parking (vide : pas une seule voiture)
	for row_z in [9.0, 17.0]:
		for i in 22:
			var x := -30.0 + i * 2.7
			g.box(Z, "paper", Vector3(x, 0.004, row_z), Vector3(0.1, 0.008, 4.8), {"collide": false, "shadow": false})
		g.box(Z, "paper", Vector3(-1.0, 0.004, row_z - 2.4), Vector3(58.0, 0.008, 0.1), {"collide": false, "shadow": false})
	# Flèches peintes vers les urgences
	for x in [10.0, 18.0, 26.0]:
		g.box(Z, "metal_yellow", Vector3(x, 0.005, 13.0), Vector3(2.2, 0.01, 0.25), {"collide": false, "shadow": false})
		g.box(Z, "metal_yellow", Vector3(x + 1.0, 0.005, 12.75), Vector3(0.7, 0.01, 0.2), {"rot": -0.6, "collide": false, "shadow": false})
		g.box(Z, "metal_yellow", Vector3(x + 1.0, 0.005, 13.25), Vector3(0.7, 0.01, 0.2), {"rot": 0.6, "collide": false, "shadow": false})
	# Ligne médiane de la rue
	for i in 24:
		g.box(Z, "paper", Vector3(-115.0 + i * 10.0, 0.004, 32.0), Vector3(4.0, 0.008, 0.14), {"collide": false, "shadow": false})


# --- Rampe des ambulances : de la rue (y = 0, z = 22) aux urgences (y = -4, z = -2) --

static func _ramp(f: Facility, g: Geo) -> void:
	var z0 := 22.0
	var z1 := -2.0
	var drop := 4.0
	var run := z0 - z1
	var ang := atan2(drop, run)
	var length := sqrt(run * run + drop * drop)
	# Montée vers +Z (la rue) : rotation négative autour de X
	var basis := Basis(Vector3.RIGHT, -ang)
	g.box(Z, "asphalt", Vector3(38.0, -drop * 0.5 - 0.15 / cos(ang), (z0 + z1) * 0.5), Vector3(8.0, 0.3, length), {"basis": basis, "nav": false})
	# Bandes jaunes de rive
	for x in [34.35, 41.65]:
		g.box(Z, "metal_yellow", Vector3(x, -drop * 0.5 + 0.005, (z0 + z1) * 0.5), Vector3(0.12, 0.012, length), {"basis": basis, "collide": false, "shadow": false})
	# Murs de soutènement (le haut reste 0.9 m au-dessus du sol comme garde-corps)
	for x in [33.85, 42.15]:
		g.box(Z, "wall_concrete", Vector3(x, -1.7, (z0 + z1) * 0.5), Vector3(0.3, 5.2, run), {"nav": true})
	Props.railing(g, Z, Vector3(33.85, 0.9, z0), Vector3(33.85, 0.9, z1 + 0.5), 0.9, "metal_dark")
	Props.railing(g, Z, Vector3(42.15, 0.9, z0), Vector3(42.15, 0.9, z1 + 0.5), 0.9, "metal_dark")
	# Portique « URGENCES » au-dessus de l'entrée de la rampe
	for x in [33.85, 42.15]:
		g.cylinder(Z, "metal_dark", Vector3(x, 0.9, 21.0), Vector3(x, 5.2, 21.0), 0.12, {"segments": 10, "collide": true})
	g.box(Z, "metal_dark", Vector3(38.0, 5.0, 21.0), Vector3(8.2, 0.9, 0.3))
	g.box(Z, "emit_red", Vector3(38.0, 5.0, 21.16), Vector3(7.6, 0.7, 0.02), {"collide": false, "shadow": false})
	f.add_label(Z, "URGENCES — AMBULANCES", Vector3(38.0, 5.0, 21.2), 0.0, 1.6, Color(1.0, 1.0, 1.0), true)
	g.box(Z, "metal_dark", Vector3(38.0, 3.9, 21.0), Vector3(5.5, 0.4, 0.2), {"collide": false})
	f.add_label(Z, "HAUTEUR LIMITE 3,60 m", Vector3(38.0, 3.9, 21.12), 0.0, 0.7, Color(1.0, 0.85, 0.2))
	f.add_light(Z, Vector3(38.0, 4.3, 20.3), Color(1.0, 0.3, 0.25), 1.6, 9.0, LightFixture.Mode.STEADY, {"fog": 1.2})
	# Applique murale au sodium sur le mur de soutènement (la vasque grésille)
	var lamp := Vector3(34.0, -0.3, 6.0)
	Props.wall_lamp(g, Z, lamp, PI / 2.0)
	f.add_light(Z, lamp + Vector3(0.45, -0.25, 0.0), SODIUM, 1.3, 11.0, LightFixture.Mode.FLICKER,
		{"panel": Vector3(0.12, 0.02, 0.22), "panel_offset": Vector3(-0.33, 0.125, 0.0), "panel_energy": 2.2, "fog": 0.6, "buzz": true})
	# Traînée de sang qui descend la rampe
	for i in 7:
		var z := 14.0 - i * 2.2
		var y := -drop * (z0 - z) / run
		f.add_blood(Z, Vector3(37.0 + sin(i * 1.3) * 0.6, y + 0.02, z), randf_range(0.5, 0.9), "blood_dry", basis * Vector3.UP, randf() * TAU)
	f.add_trigger("ramp_top", Vector3(38.0, 1.0, 17.0), Vector3(8.0, 3.0, 4.0))
	f.add_trigger("escape_out", Vector3(38.0, 1.0, 21.5), Vector3(9.0, 3.0, 3.0), false)


# --- Enveloppe de la tour ---------------------------------------------------------

static func _shell(f: Facility, g: Geo) -> void:
	for lv in range(-2, 13):
		var y := HKit.floor_y(lv)
		var built: bool = lv in HospitalLevel.BUILT
		g.collide_default = built
		var inner: String = INNER.get(lv, "wall_hospital")
		var windows := lv >= 0
		var rng := RandomNumberGenerator.new()
		rng.seed = 7000 + lv * 31
		var lit := 0.0 if built else 0.16
		# Façade sud (rue), z ∈ [0, 0.3]
		if lv == -2:
			g.wall_x(SHELL, inner, -32.3, -4.0, 0.15, y, HKit.H, 0.3)
		elif lv == -1:
			g.wall_x(SHELL, inner, -32.3, 32.3, 0.15, y, HKit.H, 0.3)
		elif lv == 0 or lv == 1:
			_facade_x(g, lv, 0.15, -32.3, -12.0, inner, true, OPEN_SOUTH.get(lv, []), lit, rng)
			_facade_x(g, lv, 0.15, 12.0, 32.3, inner, true, OPEN_SOUTH.get(lv, []), lit, rng)
		else:
			_facade_x(g, lv, 0.15, -32.3, 32.3, inner, true, OPEN_SOUTH.get(lv, []) if built else [], lit, rng)
		# Façade nord, z ∈ [-26.3, -26]
		if windows:
			_facade_x(g, lv, -26.15, -32.3, 32.3, inner, false, [], lit, rng)
		else:
			g.wall_x(SHELL, "wall_concrete", -32.3, 32.3, -26.15, y, HKit.H, 0.3, [], inner)
		# Pignons ouest et est
		if windows:
			_facade_z(g, lv, -32.15, inner, false, lit, rng)
			_facade_z(g, lv, 32.15, inner, true, lit, rng)
		else:
			g.wall_z(SHELL, "wall_concrete", -26.0, 0.0, -32.15, y, HKit.H, 0.3, [], inner)
			var east_ops: Array = []
			if lv == -1:
				east_ops = [{"a": -9.55, "b": -6.45, "top": 2.6}]
			g.wall_z(SHELL, inner, -26.0, 0.0, 32.15, y, HKit.H, 0.3, east_ops, "wall_tile_dirty" if lv == -1 else "wall_concrete")
		# Bandeau de nez de dalle entre les étages (lecture des étages de loin)
		if lv >= 1:
			g.box(SHELL, "wall_facade_dark", Vector3(0, y - 0.1, 0.33), Vector3(64.8, 0.35, 0.08), {"collide": false})
	g.collide_default = true


## Façade parallèle à X à la profondeur z (fenêtres tous les 4 m).
static func _facade_x(g: Geo, lv: int, z: float, x1: float, x2: float, inner: String, south: bool,
		open_ranges: Array, lit: float, rng: RandomNumberGenerator) -> void:
	var y := HKit.floor_y(lv)
	var ops: Array = []
	var centers: Array = []
	for i in 16:
		var cx := -30.0 + i * 4.0
		if cx - 1.3 < x1 or cx + 1.3 > x2:
			continue
		ops.append({"a": cx - 1.25, "b": cx + 1.25, "bottom": 0.95, "top": 2.65})
		centers.append(cx)
	if south:
		g.wall_x(SHELL, inner, x1, x2, z, y, HKit.H, 0.3, ops, "wall_ext")
	else:
		g.wall_x(SHELL, "wall_ext", x1, x2, z, y, HKit.H, 0.3, ops, inner)
	var in_side := -1.0 if south else 1.0
	for cx in centers:
		g.box(SHELL, "glass_dirty", Vector3(cx, y + 1.8, z), Vector3(2.5, 1.7, 0.03))
		g.box(SHELL, "metal_dark", Vector3(cx, y + 1.8, z), Vector3(0.06, 1.7, 0.08), {"collide": false})
		g.box(SHELL, "metal_dark", Vector3(cx, y + 0.93, z + in_side * 0.12), Vector3(2.6, 0.05, 0.28), {"collide": false})
		var open := false
		for r in open_ranges:
			if cx > (r as Vector2).x and cx < (r as Vector2).y:
				open = true
		if not open:
			var m := "emit_window" if rng.randf() < lit else ("emit_window_cold" if rng.randf() < lit * 0.5 else "blinds")
			g.box(SHELL, m, Vector3(cx, y + 1.8, z + in_side * 0.2), Vector3(2.5, 1.7, 0.03), {"collide": false})


## Pignon (mur parallèle à Z) : fenêtres tous les 4 m, aux stores baissés.
static func _facade_z(g: Geo, lv: int, x: float, inner: String, east: bool, lit: float, rng: RandomNumberGenerator) -> void:
	var y := HKit.floor_y(lv)
	var ops: Array = []
	var centers := [-23.0, -19.0, -14.0, -9.0, -5.0, -1.8]
	for cz in centers:
		ops.append({"a": cz - 1.0, "b": cz + 1.0, "bottom": 0.95, "top": 2.65})
	if east:
		g.wall_z(SHELL, inner, -26.3, 0.3, x, y, HKit.H, 0.3, ops, "wall_ext")
	else:
		g.wall_z(SHELL, "wall_ext", -26.3, 0.3, x, y, HKit.H, 0.3, ops, inner)
	var in_side := -1.0 if east else 1.0
	for cz in centers:
		g.box(SHELL, "glass_dirty", Vector3(x, y + 1.8, cz), Vector3(0.03, 1.7, 2.0))
		# Fenêtre de bout de couloir dégagée ; les autres ont leur store baissé
		if absf(cz + 14.0) > 0.5 or not (lv in HospitalLevel.BUILT):
			var m := "emit_window_cold" if rng.randf() < lit else "blinds"
			g.box(SHELL, m, Vector3(x + in_side * 0.2, y + 1.8, cz), Vector3(0.03, 1.7, 2.0), {"collide": false})


# --- Entrée principale : mur-rideau vitré du hall (RDC + 1er) ----------------------------

static func _entrance(f: Facility, g: Geo) -> void:
	var z := 0.15
	# Allège de dalle du 1er étage
	g.box(SHELL, "wall_facade_dark", Vector3(0, 3.85, z), Vector3(24.0, 0.3, 0.3))
	# Montants et traverses
	var x := -12.0
	while x <= 12.01:
		if absf(x) < 0.5:
			g.box(SHELL, "metal_dark", Vector3(x, 5.4, z), Vector3(0.12, 5.2, 0.28))
		else:
			g.box(SHELL, "metal_dark", Vector3(x, 4.0, z), Vector3(0.12, 8.0, 0.28))
		x += 2.0
	for yy in [0.05, 2.8, 5.6, 7.9]:
		g.box(SHELL, "metal_dark", Vector3(0, yy, z), Vector3(24.0, 0.1, 0.26), {"collide": false})
	# Vitrages (l'ouverture de la porte principale reste libre)
	for i in 12:
		var cx := -11.0 + i * 2.0
		for band in [[0.1, 2.75], [2.85, 3.7], [4.0, 5.55], [5.65, 7.85]]:
			if absf(cx) < 1.6 and band[0] < 1.0:
				# Porte principale : vitrages étroits de part et d'autre du bâti
				g.box(SHELL, "glass", Vector3(signf(cx) * 1.76, 1.4, z), Vector3(0.34, 2.7, 0.03))
				continue
			g.box(SHELL, "glass", Vector3(cx, (band[0] + band[1]) * 0.5, z), Vector3(1.88, band[1] - band[0], 0.03))
	# Porte principale enchaînée (de l'intérieur)
	f.add_door("main_entrance", Z, Vector3(0, 0, z), false, 3.0, {"double": true, "mat": "glass", "frame": "metal_dark",
		"lock": Door.Lock.EVENT, "height": 2.72,
		"locked_msg": "Les portes sont enchaînées. De l'intérieur."})
	for yy in [0.95, 1.1]:
		g.cylinder(Z, "metal_steel", Vector3(-0.9, yy, -0.12), Vector3(0.9, yy + 0.05, -0.12), 0.018, {"segments": 6})
	g.box(Z, "metal_dark", Vector3(0.05, 0.9, -0.14), Vector3(0.09, 0.12, 0.05), {"collide": false})
	f.add_examine(Z, Vector3(0, 1.1, 0.7), "Les portes vitrées sont fermées par une chaîne et un cadenas… posés de l'intérieur. Une affiche scotchée : « ENTRÉE PRINCIPALE FERMÉE — MESURE SANITAIRE. Accès unique : URGENCES, rampe côté est. »",
		{"flag": "main_door_seen", "radius": 2.2})
	# Auvent et enseigne
	g.slab(Z, "wall_ext", -6.0, 0.3, 6.0, 6.2, 4.4, 0.35)
	g.box(Z, "wall_facade_dark", Vector3(0, 4.25, 6.15), Vector3(12.0, 0.65, 0.12), {"collide": false})
	for cx in [-5.5, 5.5]:
		g.cylinder(Z, "wall_concrete", Vector3(cx, 0, 5.6), Vector3(cx, 4.05, 5.6), 0.2, {"collide": true, "segments": 12})
	f.add_label(Z, "CENTRE HOSPITALIER UNIVERSITAIRE BLACKWOOD", Vector3(0, 4.25, 6.23), 0.0, 1.15, Color(0.75, 0.85, 1.0), true)
	f.add_light(Z, Vector3(-3.0, 4.0, 3.0), Color(0.8, 0.88, 1.0), 1.0, 7.0, LightFixture.Mode.FLICKER,
		{"panel": Vector3(0.6, 0.05, 0.6), "fog": 1.0, "buzz": true})
	f.add_light(Z, Vector3(3.0, 4.0, 3.0), Color(0.8, 0.88, 1.0), 0.0, 7.0, LightFixture.Mode.OFF, {"panel": Vector3(0.6, 0.05, 0.6)})
	# Panneau « URGENCES → »
	g.cylinder(Z, "metal_dark", Vector3(9.0, 0, 4.5), Vector3(9.0, 2.6, 4.5), 0.05, {"segments": 8, "collide": true})
	g.box(Z, "metal_white", Vector3(9.0, 2.35, 4.5), Vector3(2.2, 0.5, 0.05))
	f.add_label(Z, "URGENCES  →", Vector3(9.0, 2.35, 4.53), 0.0, 1.1, Color(0.75, 0.05, 0.05))
	f.add_label(Z, "←  URGENCES", Vector3(9.0, 2.35, 4.47), PI, 1.1, Color(0.75, 0.05, 0.05))
	# Barrières de quarantaine
	HProps.barrier(g, Z, Vector3(-14, 0, 7.5), Vector3(-6.5, 0, 7.5))
	HProps.barrier(g, Z, Vector3(6.5, 0, 7.5), Vector3(14, 0, 7.5))
	f.add_examine(Z, Vector3(-10.0, 1.0, 7.9), "« QUARANTAINE — ARRÊTÉ PRÉFECTORAL n° 2231. Périmètre sanitaire. Ne pas franchir. » Il n'y a personne pour le faire respecter.", {"radius": 2.0})
	Props.gurney(g, Z, Vector3(-4.0, 0, 3.0), 0.4, true)
	Props.wheelchair(g, Z, Vector3(3.5, 0, 2.2), 2.2)
	Props.papers(g, Z, Vector3(-1.0, 0, 3.5), 2.5, 14)
	f.add_blood(Z, Vector3(-3.2, 0.01, 2.2), 1.1, "blood_dry")


# --- Toit, enseigne lumineuse, balisage ---------------------------------------------------

static func _roof(f: Facility, g: Geo) -> void:
	g.box(SHELL, "ceiling_concrete", Vector3(0, TOP_Y - 0.15, -13.0), Vector3(64.6, 0.3, 26.6), {"collide": false})
	for seg in [[Vector3(0, TOP_Y + 0.5, 0.15), Vector3(64.6, 1.0, 0.3)], [Vector3(0, TOP_Y + 0.5, -26.15), Vector3(64.6, 1.0, 0.3)],
			[Vector3(-32.15, TOP_Y + 0.5, -13.0), Vector3(0.3, 1.0, 26.6)], [Vector3(32.15, TOP_Y + 0.5, -13.0), Vector3(0.3, 1.0, 26.6)]]:
		g.box(SHELL, "wall_ext", seg[0], seg[1], {"collide": false})
	HProps.rooftop_unit(g, SHELL, Vector3(-18, TOP_Y, -14), Vector3(6, 2.2, 4))
	HProps.rooftop_unit(g, SHELL, Vector3(16, TOP_Y, -18), Vector3(5, 1.8, 3.5))
	g.box(SHELL, "wall_ext", Vector3(0, TOP_Y + 2.0, -20.0), Vector3(12.0, 4.0, 6.0), {"collide": false})
	g.cylinder(SHELL, "metal_dark", Vector3(8, TOP_Y, -8), Vector3(8, TOP_Y + 9.0, -8), 0.12, {"radius_b": 0.05, "segments": 8})
	# Enseigne « BLACKWOOD » en lettres lumineuses sur l'acrotère (deux lettres mortes)
	var word := "BLACKWOOD"
	for i in word.length():
		var dead := i == 5 or i == 7
		var lbl := f.add_label(SHELL, word[i], Vector3(-12.8 + i * 3.2, TOP_Y + 2.7, 0.3), 0.0, 12.0,
			Color(0.08, 0.08, 0.09) if dead else Color(0.95, 0.95, 0.9), not dead, UITheme.font_title())
		lbl.name = "SignLetter%d" % i
		if i == 6:
			f.nodes["sign_flicker"] = lbl
	g.box(SHELL, "metal_dark", Vector3(0, TOP_Y + 1.2, 0.3), Vector3(30.0, 0.15, 0.3), {"collide": false})
	for i in 10:
		g.box(SHELL, "metal_dark", Vector3(-14.4 + i * 3.2, TOP_Y + 2.0, 0.45), Vector3(0.08, 1.6, 0.08), {"collide": false})
	f.add_light(SHELL, Vector3(0, TOP_Y + 3.0, 3.5), Color(0.9, 0.92, 1.0), 2.0, 16.0, LightFixture.Mode.STEADY, {"fog": 0.4})
	# Feux de balisage aériens
	for p in [Vector3(-32.0, TOP_Y + 1.2, 0.0), Vector3(32.0, TOP_Y + 1.2, 0.0), Vector3(-32.0, TOP_Y + 1.2, -26.0),
			Vector3(32.0, TOP_Y + 1.2, -26.0), Vector3(8.0, TOP_Y + 9.2, -8.0)]:
		g.box(SHELL, "emit_red", p, Vector3(0.25, 0.25, 0.25), {"collide": false, "shadow": false})
		f.add_light(SHELL, p + Vector3(0, 0.3, 0), Color(1.0, 0.1, 0.05), 2.5, 10.0, LightFixture.Mode.PULSE, {"fog": 1.5})


# --- Rue, parking, voiture de Thomas -------------------------------------------------------

static func _street_props(f: Facility, g: Geo) -> void:
	# La voiture de Thomas, garée le long du trottoir, portière ouverte, phares allumés
	Props.car(g, Z, Vector3(-8.0, 0.0, 27.6), PI / 2.0, "car_gray", true, true)
	f.add_light(Z, Vector3(-10.4, 0.8, 27.6), Color(1.0, 0.95, 0.85), 3.0, 22.0, LightFixture.Mode.STEADY,
		{"spot_dir": Vector3(-1.0, -0.08, -0.05), "spot_angle": 38.0, "fog": 1.4})
	f.add_examine(Z, Vector3(-6.6, 1.0, 26.2), "Ma voiture. J'ai roulé trois heures sans m'arrêter. Le message de Sarah tourne en boucle dans ma tête.", {"radius": 1.8})
	f.anchors["player_start"] = Vector3(-4.6, 0.15, 25.0)
	f.anchors["ending_player"] = Vector3(-4.0, 0.15, 30.0)
	f.anchors["ending_cam"] = Vector3(-14.0, 1.7, 34.5)
	f.anchors["ending_look"] = Vector3(4.0, 14.0, -6.0)
	f.anchors["explosion_center"] = Vector3(0, 24.0, -13.0)
	# Borne d'entrée
	g.box(Z, "wall_concrete", Vector3(-16.0, 0.8, 22.8), Vector3(5.0, 1.6, 0.6))
	f.add_label(Z, "BLACKWOOD", Vector3(-16.0, 1.15, 23.12), 0.0, 1.3, Color(0.8, 0.8, 0.76), false, UITheme.font_title())
	f.add_label(Z, "CENTRE HOSPITALIER UNIVERSITAIRE", Vector3(-16.0, 0.62, 23.12), 0.0, 0.55, Color(0.7, 0.7, 0.66))
	f.add_examine(Z, Vector3(-16.0, 1.0, 23.5), "« Centre hospitalier universitaire Blackwood — 1 200 lits, 12 étages. Soigner, chercher, transmettre. » Sarah y travaille depuis six ans. Au 3e, en neurologie.", {"radius": 2.0})
	# Réverbères (sodium) : parking et rue — certains grillés
	var modes := [LightFixture.Mode.STEADY, LightFixture.Mode.FLICKER, LightFixture.Mode.OFF, LightFixture.Mode.STEADY]
	var i := 0
	for x in [-24.0, -8.0, 8.0, 24.0]:
		var head := Props.lamp_post(g, Z, Vector3(x, 0, 13.0), PI if i % 2 == 0 else 0.0, 7.0)
		g.box(Z, "emit_sodium" if modes[i] != LightFixture.Mode.OFF else "light_off", head + Vector3(0, -0.07, 0), Vector3(0.3, 0.03, 0.5), {"collide": false, "shadow": false})
		if modes[i] != LightFixture.Mode.OFF:
			f.add_light(Z, head + Vector3(0, -0.2, 0), SODIUM, 2.2, 16.0, modes[i], {"fog": 1.3, "shadow": i == 0})
		i += 1
	for x in [-60.0, -30.0, 0.0, 30.0, 60.0]:
		var head2 := Props.lamp_post(g, Z, Vector3(x, 0.12, 25.3), PI, 8.0)
		g.box(Z, "emit_sodium", head2 + Vector3(0, -0.07, 0), Vector3(0.3, 0.03, 0.5), {"collide": false, "shadow": false})
		f.add_light(Z, head2 + Vector3(0, -0.2, 0), SODIUM, 2.0, 16.0, LightFixture.Mode.STEADY, {"fog": 1.1})
	for x in [-50.0, -40.0, 50.0, 62.0]:
		Props.tree(g, Z, Vector3(x, 0.12, 24.0), randf_range(7.0, 10.0))
	for x in [-70.0, -46.0, 52.0, 74.0]:
		Props.tree(g, Z, Vector3(x, 0.12, 40.5), randf_range(7.0, 9.0))
	# Bouches d'égout et flaques
	for p in [Vector3(-20, 0.005, 30), Vector3(12, 0.005, 34), Vector3(-2, 0.005, 12)]:
		g.box(Z, "metal_dark", p, Vector3(0.7, 0.01, 0.7), {"collide": false, "shadow": false})
	# Limites invisibles : on ne s'éloigne pas de l'hôpital
	for r in [[Vector3(0, 2, 41.0), Vector3(120, 4, 0.5)], [Vector3(-47.0, 2, 10), Vector3(0.5, 4, 62)], [Vector3(55.0, 2, 10), Vector3(0.5, 4, 62)],
			[Vector3(-39.9, 2, -13.0), Vector3(15.2, 4, 0.5)], [Vector3(43.9, 2, -13.0), Vector3(23.2, 4, 0.5)]]:
		g.solid(Z, r[0], r[1])
	f.add_examine(Z, Vector3(-40.0, 1.0, 30.0), "La rue est déserte dans les deux sens. Pas une voiture. Pas une sirène. Seulement la pluie.", {"radius": 3.0})


## Immeubles de l'autre côté de la rue : façades rythmées (fenêtres, bandeaux
## d'étage, rez-de-chaussée à rideaux métalliques), acrotères et édicules sur
## les toits ; quelques fenêtres encore allumées.
static func _city(g: Geo) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 424242
	# Détails tirés à part : la silhouette de la ville (et le bosquet) reste
	# celle d'origine.
	var rng2 := RandomNumberGenerator.new()
	rng2.seed = 515151
	var x := -118.0
	while x < 118.0:
		var w := rng.randf_range(10.0, 22.0)
		var h := rng.randf_range(9.0, 34.0)
		var d := rng.randf_range(10.0, 18.0)
		var cz := 50.0 + d * 0.5
		var fz := cz - d * 0.5
		var bw := w - 1.0
		var cx := x + w * 0.5
		g.box(Z, "wall_facade_dark" if rng.randf() < 0.5 else "wall_ext", Vector3(cx, h * 0.5, cz), Vector3(bw, h, d), {"collide": false})
		for fl in int(h / 3.2):
			for k in int((w - 2.0) / 2.4):
				if rng.randf() < 0.07:
					rng.randf()
		# Acrotère et édicules techniques
		g.box(Z, "wall_concrete_dark", Vector3(cx, h + 0.45, fz + 0.15), Vector3(bw + 0.2, 0.9, 0.3), {"collide": false})
		for k in rng2.randi_range(1, 3):
			var ux := cx + rng2.randf_range(-bw * 0.35, bw * 0.35)
			var uz := cz + rng2.randf_range(-d * 0.2, d * 0.3)
			if rng2.randf() < 0.3:
				g.cylinder(Z, "metal_gray", Vector3(ux, h, uz), Vector3(ux, h + 2.2, uz), 1.1, {"segments": 10})
			else:
				g.box(Z, "metal_gray", Vector3(ux, h + 0.8, uz), Vector3(rng2.randf_range(1.5, 3.5), 1.6, rng2.randf_range(1.5, 3.0)), {"collide": false})
		# Rez-de-chaussée : vitrines fermées par des rideaux métalliques, auvent
		var shops := maxi(1, int(bw / 5.0))
		for k in shops:
			var sx := x + 0.5 + (float(k) + 0.5) * bw / float(shops)
			g.box(Z, "shutter", Vector3(sx, 1.45, fz - 0.05), Vector3(bw / float(shops) - 1.0, 2.7, 0.1), {"collide": false})
		g.box(Z, "wall_concrete_dark", Vector3(cx, 3.2, fz - 0.15), Vector3(bw, 0.45, 0.3), {"collide": false})
		# Étages : bandeaux et fenêtres (vitres sombres, stores, quelques lumières)
		var floors := int((h - 3.6) / 3.2)
		var cols := maxi(1, int((bw - 1.0) / 2.4))
		var pitch := (bw - 1.0) / float(cols)
		for fl in floors:
			var y0 := 3.6 + fl * 3.2
			g.box(Z, "wall_concrete_dark", Vector3(cx, y0 + 0.05, fz - 0.06), Vector3(bw, 0.12, 0.12), {"collide": false, "shadow": false})
			for k in cols:
				var wx := x + 1.0 + (float(k) + 0.5) * pitch
				var r := rng2.randf()
				var wm := "glass_car"
				if r < 0.05:
					wm = "emit_window"
				elif r < 0.07:
					wm = "emit_window_cold"
				elif r < 0.14:
					wm = "emit_window_dim"
				elif r < 0.28:
					wm = "blinds"
				g.box(Z, wm, Vector3(wx, y0 + 1.6, fz - 0.03), Vector3(pitch * 0.55, 1.5, 0.06), {"collide": false, "shadow": false})
				g.box(Z, "wall_concrete_dark", Vector3(wx, y0 + 0.8, fz - 0.07), Vector3(pitch * 0.6, 0.08, 0.14), {"collide": false, "shadow": false})
		x += w
	# Arrière de l'hôpital : bosquet
	for i in 18:
		Props.tree(g, Z, Vector3(rng.randf_range(-60, 60), 0, rng.randf_range(-70, -34)), rng.randf_range(8.0, 13.0))

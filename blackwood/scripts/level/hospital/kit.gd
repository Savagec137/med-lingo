class_name HKit
extends RefCounted
## Boîte à outils de construction de l'hôpital Blackwood (tour de 12 étages).
##
## Trame commune à tous les étages (mètres) :
##   façade sud (rue) z = 0, façade nord z = -26, murs est/ouest x = ±32
##   couloir central z ∈ [-16, -12] ; bande sud z ∈ [-12, 0] ; bande nord z ∈ [-26, -16]
##   bande nord : cage C [-32,-24] · pièce [-24,-12] · cage A [-12,-6] · ascenseurs [-6,6]
##                pièce [6,16] · monte-charge [16,20] · ascenseur de direction [20,24] · cage B [24,32]
## Un étage mesure 4 m ; faux plafond à 3 m.

const H := 4.0
const CEIL := 3.0
const X0 := -32.0
const X1 := 32.0
const ZN := -26.0
const ZS := 0.0
const CN := -16.0
const CS := -12.0
const T := 0.2
const STAIR_A := Vector2(-12.0, -6.0)
const STAIR_B := Vector2(24.0, 32.0)
const STAIR_C := Vector2(-32.0, -24.0)
const ELEV := Vector2(-6.0, 6.0)
const FREIGHT := Vector2(16.0, 20.0)
const PRIVATE := Vector2(20.0, 24.0)
## Cages d'escalier : profondeur du palier d'étage et de la volée.
const LANDING := 1.6
const FLIGHT := 5.0

var f: Facility
var g: Geo
var level: int
var y: float


func _init(p_f: Facility, p_level: int) -> void:
	f = p_f
	g = p_f.geo
	level = p_level
	y = floor_y(p_level)


static func floor_y(p_level: int) -> float:
	return p_level * H


## Déclare une zone de cet étage (voir Facility.ZONES).
func zone(id: String, display: String, rects: Array, opts: Dictionary = {}) -> void:
	var d := {"name": display, "floor": level, "rects": rects, "ymin": y - 1.0, "ymax": y + H - 0.4,
		"reverb": "corridor", "surface": "lino", "ambience": {"amb_vent": 0.6, "amb_hum": 0.35},
		"neighbors": [], "moon": false}
	d.merge(opts, true)
	Facility.ZONES[id] = d


func p(x: float, z: float, h: float = 0.0) -> Vector3:
	return Vector3(x, y + h, z)


# --- Structure ------------------------------------------------------------------

func slab(zone_id: String, mat: String, x1: float, z1: float, x2: float, z2: float) -> void:
	g.slab(zone_id, mat, x1, z1, x2, z2, y, 0.3)


func ceiling(zone_id: String, mat: String, x1: float, z1: float, x2: float, z2: float, h: float = CEIL) -> void:
	g.box(zone_id, mat, Vector3((x1 + x2) * 0.5, y + h + 0.03, (z1 + z2) * 0.5), Vector3(absf(x2 - x1), 0.06, absf(z2 - z1)), {"nav": false, "collide": h < 3.5})


func wall_x(zone_id: String, mat: String, x1: float, x2: float, z: float, openings: Array = [], mat_b: String = "", h: float = CEIL, thick: float = T) -> void:
	g.wall_x(zone_id, mat, x1, x2, z, y, h, thick, openings, mat_b)


func wall_z(zone_id: String, mat: String, z1: float, z2: float, x: float, openings: Array = [], mat_b: String = "", h: float = CEIL, thick: float = T) -> void:
	g.wall_z(zone_id, mat, z1, z2, x, y, h, thick, openings, mat_b)


## Ouverture de porte centrée en c (largeur w).
static func op(c: float, w: float = 1.3, top: float = 2.25) -> Dictionary:
	return {"a": c - w * 0.5 - 0.06, "b": c + w * 0.5 + 0.06, "top": top}


## Ouverture de fenêtre intérieure (vitrage) centrée en c.
static func win(c: float, w: float = 2.0, bottom: float = 1.0, top: float = 2.2) -> Dictionary:
	return {"a": c - w * 0.5, "b": c + w * 0.5, "bottom": bottom, "top": top}


func door(id: String, zone_id: String, x: float, z: float, along_z: bool = false, w: float = 1.3, opts: Dictionary = {}) -> Door:
	return f.add_door(id, zone_id, Vector3(x, y, z), along_z, w, opts)


## Vitre (fine plaque de verre) dans une ouverture.
func glass_x(zone_id: String, x1: float, x2: float, z: float, bottom: float, top: float, mat: String = "glass") -> void:
	g.box(zone_id, mat, Vector3((x1 + x2) * 0.5, y + (bottom + top) * 0.5, z), Vector3(x2 - x1, top - bottom, 0.03), {"nav": true})
	g.box(zone_id, "metal_dark", Vector3((x1 + x2) * 0.5, y + bottom - 0.03, z), Vector3(x2 - x1 + 0.06, 0.06, 0.12), {"collide": false})


func glass_z(zone_id: String, z1: float, z2: float, x: float, bottom: float, top: float, mat: String = "glass") -> void:
	g.box(zone_id, mat, Vector3(x, y + (bottom + top) * 0.5, (z1 + z2) * 0.5), Vector3(0.03, top - bottom, z2 - z1), {"nav": true})
	g.box(zone_id, "metal_dark", Vector3(x, y + bottom - 0.03, (z1 + z2) * 0.5), Vector3(0.12, 0.06, z2 - z1 + 0.06), {"collide": false})


# --- Étage standard ---------------------------------------------------------------

## Couloir + bandes nord et sud. spec :
##   corridor : Vector2(x_min, x_max) partie ouverte du couloir (barricades au-delà)
##   north_walls / south_walls : abscisses des cloisons entre pièces
##   doors : [{id, x, side ("n"|"s"), w, zone, opts}]
##   windows : [{x, side, w}] vitrages intérieurs sur le couloir
##   skip_north : [Vector2] plages sans mur nord de couloir (cages, gaines)
##   mats : {wall, corridor_floor, floor_n, floor_s, ceiling}
##   zone : zone du couloir ; zones_n / zones_s : [{zone, x1, x2}] pour sols et plafonds
func standard(spec: Dictionary) -> void:
	var mats: Dictionary = {"wall": "wall_hospital", "corridor_floor": "floor_lino", "floor_n": "floor_lino",
		"floor_s": "floor_lino", "ceiling": "ceiling_tile"}
	mats.merge(spec.get("mats", {}), true)
	var cz: String = spec.zone
	var cor: Vector2 = spec.get("corridor", Vector2(X0, X1))
	# Sols et plafonds
	slab(cz, mats.corridor_floor, X0, CN, X1, CS)
	ceiling(cz, mats.ceiling, X0, CN, X1, CS)
	for r in spec.get("zones_s", []):
		if String(r.get("floor", "")) != "none":
			slab(r.zone, r.get("floor", mats.floor_s), r.x1, CS, r.x2, ZS)
		if String(r.get("ceiling", "")) != "none":
			ceiling(r.zone, r.get("ceiling", mats.ceiling), r.x1, CS, r.x2, ZS, float(r.get("h", CEIL)))
	for r in spec.get("zones_n", []):
		if String(r.get("floor", "")) != "none":
			slab(r.zone, r.get("floor", mats.floor_n), r.x1, ZN, r.x2, CN)
		if String(r.get("ceiling", "")) != "none":
			ceiling(r.zone, r.get("ceiling", mats.ceiling), r.x1, ZN, r.x2, CN, float(r.get("h", CEIL)))
	# Ouvertures du couloir
	var n_ops: Array = []
	var s_ops: Array = []
	for d in spec.get("doors", []):
		var w: float = float(d.get("w", 1.3))
		if String(d.side) == "n":
			n_ops.append(op(d.x, w))
		else:
			s_ops.append(op(d.x, w))
	# Ouvertures pleine hauteur (hall ouvert sur le couloir, poste de soins…)
	for o in spec.get("south_open", []):
		s_ops.append({"a": (o as Vector2).x, "b": (o as Vector2).y, "top": CEIL + 1.0})
	for o in spec.get("north_open", []):
		n_ops.append({"a": (o as Vector2).x, "b": (o as Vector2).y, "top": CEIL + 1.0})
	for wdw in spec.get("windows", []):
		var o := win(wdw.x, float(wdw.get("w", 2.0)), float(wdw.get("bottom", 1.0)), float(wdw.get("top", 2.2)))
		if String(wdw.side) == "n":
			n_ops.append(o)
		else:
			s_ops.append(o)
	# Mur nord du couloir, sauf devant les cages et gaines (elles ont leur propre façade)
	var cuts: Array = spec.get("skip_north", [STAIR_A, STAIR_B, STAIR_C, ELEV, FREIGHT, PRIVATE])
	var segs := _subtract(X0, X1, cuts)
	for sgm in segs:
		var ops2: Array = []
		for o in n_ops:
			if float(o.a) >= sgm.x - 0.01 and float(o.b) <= sgm.y + 0.01:
				ops2.append(o)
		wall_x(cz, mats.wall, sgm.x, sgm.y, CN, ops2, spec.get("wall_n_room", mats.wall))
	wall_x(cz, mats.wall, X0, X1, CS, s_ops, spec.get("wall_s_room", mats.wall))
	for x in spec.get("north_walls", []):
		wall_z(cz, mats.wall, ZN, CN, x)
	for x in spec.get("south_walls", []):
		wall_z(cz, mats.wall, CS, ZS, x)
	# Portes
	for d in spec.get("doors", []):
		var dz := CN if String(d.side) == "n" else CS
		door(d.id, d.get("zone", cz), d.x, dz, false, float(d.get("w", 1.3)), d.get("opts", {}))
	# Barricades aux extrémités du couloir condamnées
	if cor.x > X0 + 0.5:
		barricade(cz, cor.x, spec.get("barricade_text_w", "AILE FERMÉE — QUARANTAINE"))
	if cor.y < X1 - 0.5:
		barricade(cz, cor.y, spec.get("barricade_text_e", "AILE FERMÉE — QUARANTAINE"))
	# Plafonniers du couloir
	var x := cor.x + 3.0
	if bool(spec.get("no_lights", false)):
		x = INF
	while x < cor.y - 1.0:
		f.ceiling_light(cz, p(x, (CN + CS) * 0.5, CEIL), spec.get("light_mode", LightFixture.Mode.STEADY), float(spec.get("light_energy", 0.9)), {"range": 6.5})
		x += float(spec.get("light_step", 7.0))


## Segments de [a, b] privés des plages cuts.
static func _subtract(a: float, b: float, cuts: Array) -> Array:
	var segs: Array = [Vector2(a, b)]
	for c in cuts:
		var nxt: Array = []
		for s in segs:
			var sv := s as Vector2
			var cv := c as Vector2
			if cv.y <= sv.x or cv.x >= sv.y:
				nxt.append(sv)
				continue
			if cv.x > sv.x:
				nxt.append(Vector2(sv.x, cv.x))
			if cv.y < sv.y:
				nxt.append(Vector2(cv.y, sv.y))
		segs = nxt
	return segs


## Barricade de quarantaine en travers du couloir à l'abscisse x.
func barricade(zone_id: String, x: float, text: String) -> void:
	g.box(zone_id, "metal_yellow", Vector3(x, y + 0.5, (CN + CS) * 0.5), Vector3(0.12, 1.0, CS - CN - 0.1))
	g.box(zone_id, "plastic_sheet", Vector3(x + 0.08, y + 1.5, (CN + CS) * 0.5), Vector3(0.03, 3.0, CS - CN - 0.1), {"collide": true})
	for i in 3:
		g.box(zone_id, "metal_yellow", Vector3(x - 0.2, y + 0.35 + i * 0.35, (CN + CS) * 0.5), Vector3(0.06, 0.08, CS - CN - 0.3), {"collide": false})
	# Panneau lisible depuis la partie ouverte du couloir
	var side := -signf(x)
	f.add_label(zone_id, text, p(x + side * 0.25, (CN + CS) * 0.5, 1.9), side * PI / 2.0, 0.9, Color(0.9, 0.75, 0.1))
	Props.rubble(g, zone_id, p(x - 0.7 * signf(x), (CN + CS) * 0.5 + 0.8), 1.0, 6)


# --- Cages d'escalier -----------------------------------------------------------

## Cage d'escalier en double volée entre les étages low et high (x1..x2 en bande nord).
## doors : {étage: opts de porte (+ "none": true pour un mur plein)}.
## blocked_above : volée au-dessus de high encombrée de gravats (cage effondrée).
static func stairwell(fac: Facility, zone_id: String, x1: float, x2: float, low: int, high: int,
		doors: Dictionary, blocked_above: bool = false) -> void:
	var g2 := fac.geo
	var xm := (x1 + x2) * 0.5
	var y_low := floor_y(low)
	var y_top := floor_y(high) + H
	var zl := CN - LANDING           # fin du palier d'étage
	var zt := zl - FLIGHT            # début du palier intermédiaire
	# Parois de la cage
	g2.wall_z(zone_id, "wall_stair", ZN, CN, x1, y_low, y_top - y_low, 0.25)
	g2.wall_z(zone_id, "wall_stair", ZN, CN, x2, y_low, y_top - y_low, 0.25)
	g2.wall_x(zone_id, "wall_stair", x1, x2, ZN, y_low, y_top - y_low, 0.25)
	for lv in range(low, high + 1):
		var yl := floor_y(lv)
		var dopts: Dictionary = doors.get(lv, {"none": true})
		var ops: Array = [] if bool(dopts.get("none", false)) else [op(xm, 1.3)]
		g2.wall_x(zone_id, "wall_stair", x1, x2, CN, yl, H, 0.25, ops, "wall_hospital")
		# Palier d'étage
		g2.slab(zone_id, "floor_stair", x1 + 0.12, zl, x2 - 0.12, CN, yl, 0.3)
		if not bool(dopts.get("none", false)):
			# Porte coupe-feu : elle s'ouvre toujours côté couloir, jamais sur le
			# palier (le vantail y bloquerait l'accès aux marches).
			var o: Dictionary = {"swing": -1.0}
			o.merge(dopts, true)
			var d := fac.add_door(String(o.get("id", "%s_%d" % [zone_id, lv])), zone_id, Vector3(xm, yl, CN), false, 1.3, o)
			d.rotation.y = 0.0
		var sign_text := "ÉTAGE %d" % lv if lv > 0 else ("REZ-DE-CHAUSSÉE" if lv == 0 else "SOUS-SOL %d" % lv)
		fac.add_label(zone_id, sign_text, Vector3(x1 + 0.2, yl + 2.0, zl - 0.2), PI / 2.0, 1.0, Color(0.85, 0.85, 0.78))
		fac.add_label(zone_id, sign_text, Vector3(xm, yl + 2.5, CN - 0.15), PI, 0.8, Color(0.85, 0.85, 0.78))
		fac.add_light(zone_id, Vector3(xm, yl + 2.75, zl + 0.6), Color(0.85, 0.92, 1.0), 0.7, 6.0, LightFixture.Mode.STEADY,
			{"panel": Vector3(0.35, 0.05, 0.35), "fog": 0.3})
		# Les créatures ne suivent pas dans les volées (la grille d'un étage est
		# plane) : elles s'arrêtent au palier. Les escaliers restent un refuge.
		g2.nav_block(Vector3(xm, yl + 0.8, (ZN + zl - 0.3) * 0.5), Vector3(x2 - x1, 1.2, (zl - 0.3) - ZN))
		if lv < high or blocked_above:
			_flights(fac, zone_id, x1, x2, yl, zl, zt, lv == high and blocked_above)


static func _flights(fac: Facility, zone_id: String, x1: float, x2: float, yl: float, zl: float, zt: float, blocked: bool) -> void:
	var g2 := fac.geo
	var xm := (x1 + x2) * 0.5
	var half := H * 0.5
	# Volée 1 (moitié ouest, vers le nord) puis palier, volée 2 (moitié est, vers le sud)
	_flight(g2, zone_id, x1 + 0.12, xm - 0.05, zl, zt, yl, yl + half)
	g2.slab(zone_id, "floor_stair", x1 + 0.12, ZN + 0.12, x2 - 0.12, zt, yl + half, 0.3)
	_flight(g2, zone_id, xm + 0.05, x2 - 0.12, zt, zl, yl + half, yl + H)
	# Mur d'échiffre entre les volées + rampes
	g2.box(zone_id, "wall_stair", Vector3(xm, yl + H * 0.5, (zl + zt) * 0.5), Vector3(0.12, H, zl - zt - 0.2), {"nav": false})
	Props.railing(g2, zone_id, Vector3(xm - 0.12, yl + 0.1, zl), Vector3(xm - 0.12, yl + half + 0.1, zt), 0.95, "metal_dark")
	Props.railing(g2, zone_id, Vector3(xm + 0.12, yl + half + 0.1, zt), Vector3(xm + 0.12, yl + H + 0.1, zl), 0.95, "metal_dark")
	if blocked:
		# Plafond effondré : la volée est condamnée
		Props.rubble(g2, zone_id, Vector3((x1 + xm) * 0.5, yl + 0.9, zl - 2.2), 1.3, 14)
		g2.box(zone_id, "wall_concrete_dark", Vector3((x1 + xm) * 0.5, yl + 1.4, zl - 2.4), Vector3(xm - x1, 2.6, 0.6),
			{"basis": Basis(Vector3.RIGHT, 0.5) * Basis(Vector3.FORWARD, 0.15)})
		fac.add_label(zone_id, "ESCALIER EFFONDRÉ", Vector3((x1 + xm) * 0.5, yl + 2.2, zl - 0.3), PI, 0.8, Color(0.9, 0.7, 0.1))


## Une volée de marches de (z_from, y0) à (z_to, y1) entre xa et xb. Collision en
## rampe lisse (les marches sont visuelles) pour un déplacement sans à-coups.
static func _flight(g2: Geo, zone_id: String, xa: float, xb: float, z_from: float, z_to: float, y0: float, y1: float) -> void:
	var run := absf(z_to - z_from)
	var rise := y1 - y0
	var dirz := signf(z_to - z_from)
	var steps := int(round(rise / 0.17))
	var tread := run / steps
	var sr := rise / steps
	var xm := (xa + xb) * 0.5
	var w := xb - xa
	for i in steps:
		var zc := z_from + dirz * (i + 0.5) * tread
		var top := y0 + (i + 1) * sr
		g2.box(zone_id, "floor_stair", Vector3(xm, top - 0.09, zc), Vector3(w, 0.18, tread + 0.02), {"collide": false})
		g2.box(zone_id, "metal_dark", Vector3(xm, top - 0.01, zc - dirz * (tread * 0.5 - 0.02)), Vector3(w, 0.02, 0.04), {"collide": false, "shadow": false})
	# Rampe de collision + sous-face
	var ang := atan2(rise, run)
	var length := sqrt(run * run + rise * rise)
	var basis := Basis(Vector3.RIGHT, ang * (-dirz))
	# Le dessus de la rampe rejoint exactement les paliers (pas de rebord bloquant)
	g2.box(zone_id, "wall_concrete", Vector3(xm, (y0 + y1) * 0.5 - 0.1 / cos(ang), (z_from + z_to) * 0.5), Vector3(w, 0.2, length), {"basis": basis, "nav": false})


# --- Ascenseurs -------------------------------------------------------------------

## Portes palières d'ascenseur (coulissantes, fermées) sur le mur nord du couloir,
## entre x1 et x2, aux abscisses xs, avec un panneau d'appel. Retourne le panneau.
func elevator_doors(zone_id: String, x1: float, x2: float, xs: Array, elevator_id: String, label: String = "") -> ElevatorPanel:
	var z := CN
	var ops: Array = []
	for x in xs:
		ops.append(op(x, 1.2))
	wall_x(zone_id, "wall_hospital", x1, x2, z, ops, "metal_steel")
	for x in xs:
		g.box(zone_id, "metal_steel", p(x, z + 0.02, 1.1), Vector3(1.5, 2.3, 0.1), {"collide": false})
		for s in [-1.0, 1.0]:
			g.box(zone_id, "metal_steel", p(x + s * 0.3, z - 0.05, 1.1), Vector3(0.58, 2.2, 0.06))
		g.box(zone_id, "black", p(x, z - 0.03, 1.1), Vector3(0.02, 2.2, 0.07), {"collide": false})
		g.box(zone_id, "black", p(x, z - 0.6, 1.5), Vector3(1.4, 3.0, 0.05), {"collide": false})
		# Indicateur d'étage au-dessus de la porte
		g.box(zone_id, "black", p(x, z + 0.07, 2.55), Vector3(0.5, 0.18, 0.04), {"collide": false})
		f.add_label(zone_id, str(level) if level != 0 else "RDC", p(x, z + 0.1, 2.55), 0.0, 0.7, Color(1.0, 0.35, 0.1), true)
	var cx: float = (float(xs[0]) + float(xs[xs.size() - 1])) * 0.5 if xs.size() > 1 else float(xs[0]) + 1.1
	if label != "":
		f.add_label(zone_id, label, p(cx, z + 0.1, 2.85), 0.0, 0.55, Color(0.8, 0.8, 0.75))
	var panel := ElevatorPanel.new()
	panel.elevator_id = elevator_id
	panel.level = level
	panel.position = p(cx, z + 0.12, 1.2)
	g.zone_root(zone_id).add_child(panel)
	f.nodes["elev_panel_%s_%d" % [elevator_id, level]] = panel
	f.anchors["elev_%s_%d" % [elevator_id, level]] = p(cx, z + 1.4)
	return panel


# --- Façade ------------------------------------------------------------------------

## Fenêtres de façade d'un étage : x centres des fenêtres (façade sud à z = 0).
## open_ranges : plages X où l'intérieur est construit (sinon store baissé).
func facade_south(zone_id: String, open_ranges: Array, collide: bool = true, lit_chance: float = 0.0) -> void:
	var ops: Array = []
	for i in 16:
		var cx := X0 + 2.0 + i * 4.0
		ops.append({"a": cx - 1.25, "b": cx + 1.25, "bottom": 0.95, "top": 2.65})
	g.collide_default = collide
	g.wall_x(zone_id, "wall_hospital", X0, X1, ZS - 0.15, y, H, 0.3, ops, "wall_ext")
	_window_panes(zone_id, open_ranges, lit_chance)
	g.collide_default = true


func _window_panes(zone_id: String, open_ranges: Array, lit_chance: float) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1000 + level * 37
	for i in 16:
		var cx := X0 + 2.0 + i * 4.0
		g.box(zone_id, "glass_dirty", p(cx, ZS - 0.1, 1.8), Vector3(2.5, 1.7, 0.03))
		g.box(zone_id, "metal_dark", p(cx, ZS - 0.1, 1.8), Vector3(0.06, 1.7, 0.06), {"collide": false})
		var inside := false
		for r in open_ranges:
			if cx > (r as Vector2).x and cx < (r as Vector2).y:
				inside = true
		if not inside:
			var lit := rng.randf() < lit_chance
			g.box(zone_id, "emit_window" if lit else "blinds", p(cx, ZS - 0.35, 1.8), Vector3(2.5, 1.7, 0.04), {"collide": false})

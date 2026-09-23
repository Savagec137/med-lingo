class_name NavGrid
extends RefCounted
## Grille de navigation d'un étage (A* sur cellules de 25 cm).
## Les obstacles du décor sont rastérisés et gonflés du rayon des créatures ;
## les portes verrouillées sont bloquantes, les autres restent franchissables
## (les créatures les poussent).

const CELL := 0.25
const INFLATE := 0.28

var astar := AStarGrid2D.new()
var origin := Vector2.ZERO
var size := Vector2i.ZERO
var floor_y := 0.0
## Marge autour du décor : rayon des créatures qui utilisent cette grille.
var inflate := INFLATE
var _base_solid := {}      # cellules bloquées par le décor
var _door_cells := {}      # door_id → [Vector2i]
var _door_blocked := {}    # door_id → bool
var _cell_door := {}       # cellule → door_id (ouverture de porte)
var _jamb := {}            # cellules de la baie trop proches des montants (toujours bloquées)
var _overlay := {}         # id → [Vector2i] (vantaux ouverts…)
var _overlay_count := {}   # cellule → nombre d'overlays qui la bloquent


func _init(rect: Rect2, p_floor_y: float, p_inflate: float = INFLATE) -> void:
	origin = rect.position
	floor_y = p_floor_y
	inflate = p_inflate
	size = Vector2i(ceili(rect.size.x / CELL), ceili(rect.size.y / CELL))
	astar.region = Rect2i(Vector2i.ZERO, size)
	astar.cell_size = Vector2(CELL, CELL)
	astar.offset = origin + Vector2(CELL, CELL) * 0.5
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()


func world_to_cell(p: Vector3) -> Vector2i:
	return Vector2i(floori((p.x - origin.x) / CELL), floori((p.z - origin.y) / CELL))


func cell_to_world(c: Vector2i) -> Vector3:
	return Vector3(origin.x + (c.x + 0.5) * CELL, floor_y, origin.y + (c.y + 0.5) * CELL)


func in_bounds(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < size.x and c.y < size.y


## Bloque toutes les cellules dont le centre tombe dans le rectangle gonflé.
func block_rect(r: Rect2, grow_by: float = -1.0) -> void:
	var rr := r.grow(inflate if grow_by < 0.0 else grow_by)
	var c0 := world_to_cell(Vector3(rr.position.x, 0, rr.position.y))
	var c1 := world_to_cell(Vector3(rr.end.x, 0, rr.end.y))
	for x in range(maxi(c0.x, 0), mini(c1.x + 1, size.x)):
		for y in range(maxi(c0.y, 0), mini(c1.y + 1, size.y)):
			var wc := cell_to_world(Vector2i(x, y))
			if rr.has_point(Vector2(wc.x, wc.z)):
				astar.set_point_solid(Vector2i(x, y), true)
				_base_solid[Vector2i(x, y)] = true


## Libère une zone (ouverture de porte) sans toucher au décor environnant.
func clear_rect(r: Rect2) -> Array:
	var cells: Array = []
	var c0 := world_to_cell(Vector3(r.position.x, 0, r.position.y))
	var c1 := world_to_cell(Vector3(r.end.x, 0, r.end.y))
	for x in range(maxi(c0.x, 0), mini(c1.x + 1, size.x)):
		for y in range(maxi(c0.y, 0), mini(c1.y + 1, size.y)):
			var wc := cell_to_world(Vector2i(x, y))
			if r.has_point(Vector2(wc.x, wc.z)):
				cells.append(Vector2i(x, y))
	return cells


## Déclare les cellules d'une porte (baie « r »). Une porte fermée à clé les
## bloque. Si « passage » est fourni, seules ses cellules sont franchissables
## une fois la porte ouverte : le reste de la baie (contre les montants) reste
## bloqué, pour que les créatures passent au milieu.
func register_door(door_id: String, r: Rect2, passage: Rect2 = Rect2()) -> void:
	var cells := clear_rect(r)
	_door_cells[door_id] = cells
	for c in cells:
		_base_solid.erase(c)
		_cell_door[c] = door_id
		if passage.has_area():
			var wc := cell_to_world(c)
			if not passage.has_point(Vector2(wc.x, wc.z)):
				_jamb[c] = true
		_refresh(c)


func set_door_blocked(door_id: String, blocked: bool) -> void:
	if not _door_cells.has(door_id):
		return
	_door_blocked[door_id] = blocked
	for c in _door_cells[door_id]:
		_refresh(c)


## Bloque temporairement les cellules le long de segments (vantail ouvert qui
## dépasse du mur). Remplace l'overlay précédent du même identifiant.
func set_overlay_segments(id: String, segments: Array, radius: float = 0.18) -> void:
	for c in _overlay.get(id, []):
		_overlay_count[c] = int(_overlay_count.get(c, 1)) - 1
		if int(_overlay_count[c]) <= 0:
			_overlay_count.erase(c)
		_refresh(c)
	var cells := {}
	for seg in segments:
		var a: Vector3 = seg[0]
		var b: Vector3 = seg[1]
		var n := maxi(int(a.distance_to(b) / (CELL * 0.5)), 1)
		for i in n + 1:
			var p := a.lerp(b, float(i) / n)
			var c0 := world_to_cell(p)
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					var c := c0 + Vector2i(dx, dy)
					if not in_bounds(c):
						continue
					var wc := cell_to_world(c)
					if Vector2(wc.x - p.x, wc.z - p.z).length() <= radius + CELL * 0.5:
						cells[c] = true
	var list: Array = cells.keys()
	_overlay[id] = list
	for c in list:
		_overlay_count[c] = int(_overlay_count.get(c, 0)) + 1
		_refresh(c)


## État d'une cellule : décor, porte verrouillée ou overlay.
func _refresh(c: Vector2i) -> void:
	var solid := _base_solid.has(c) or _jamb.has(c) or int(_overlay_count.get(c, 0)) > 0
	if not solid and _cell_door.has(c):
		solid = bool(_door_blocked.get(_cell_door[c], false))
	astar.set_point_solid(c, solid)


func is_walkable(p: Vector3) -> bool:
	var c := world_to_cell(p)
	return in_bounds(c) and not astar.is_point_solid(c)


## Cellule libre la plus proche (recherche en spirale).
func nearest_free(c: Vector2i, max_radius: int = 12) -> Vector2i:
	if in_bounds(c) and not astar.is_point_solid(c):
		return c
	for r in range(1, max_radius + 1):
		for dx in range(-r, r + 1):
			for dy in [-r, r]:
				var cc := c + Vector2i(dx, dy)
				if in_bounds(cc) and not astar.is_point_solid(cc):
					return cc
		for dy in range(-r + 1, r):
			for dx in [-r, r]:
				var cc := c + Vector2i(dx, dy)
				if in_bounds(cc) and not astar.is_point_solid(cc):
					return cc
	return Vector2i(-1, -1)


## Chemin lissé du point « from » vers « to » (liste de positions monde).
func find_path(from: Vector3, to: Vector3) -> PackedVector3Array:
	var out := PackedVector3Array()
	var a := nearest_free(world_to_cell(from))
	var b := nearest_free(world_to_cell(to))
	if a.x < 0 or b.x < 0:
		return out
	if a == b:
		out.append(cell_to_world(b))
		return out
	var ids: Array[Vector2i] = astar.get_id_path(a, b, true)
	if ids.is_empty():
		return out
	# Lissage : on saute les points intermédiaires visibles en ligne droite
	var i := 0
	var smoothed: Array[Vector2i] = [ids[0]]
	while i < ids.size() - 1:
		var j := ids.size() - 1
		while j > i + 1 and not grid_los(ids[i], ids[j]):
			j -= 1
		smoothed.append(ids[j])
		i = j
	for k in range(1, smoothed.size()):
		out.append(cell_to_world(smoothed[k]))
	return out


## Ligne de vue sur la grille (Bresenham), en tenant compte de la largeur.
func grid_los(a: Vector2i, b: Vector2i) -> bool:
	var x0 := a.x
	var y0 := a.y
	var dx := absi(b.x - a.x)
	var dy := -absi(b.y - a.y)
	var sx := 1 if a.x < b.x else -1
	var sy := 1 if a.y < b.y else -1
	var err := dx + dy
	while true:
		if astar.is_point_solid(Vector2i(x0, y0)):
			return false
		if x0 == b.x and y0 == b.y:
			return true
		var e2 := 2 * err
		if e2 >= dy:
			err += dy
			x0 += sx
		if e2 <= dx:
			err += dx
			y0 += sy
		# Évite de couper les coins en diagonale
		if astar.is_point_solid(Vector2i(x0 - sx, y0)) and astar.is_point_solid(Vector2i(x0, y0 - sy)):
			return false
	return true


## Point libre aléatoire autour de « center » (fouille d'une zone).
func random_point_near(center: Vector3, radius: float, rng: RandomNumberGenerator = null) -> Vector3:
	var r := rng if rng else RandomNumberGenerator.new()
	for i in 20:
		var a := r.randf() * TAU
		var d := r.randf_range(radius * 0.3, radius)
		var p := center + Vector3(cos(a) * d, 0, sin(a) * d)
		var c := world_to_cell(p)
		if in_bounds(c) and not astar.is_point_solid(c):
			var ids: Array[Vector2i] = astar.get_id_path(nearest_free(world_to_cell(center)), c, false)
			if not ids.is_empty() and ids.size() < int(radius * 3.0 / CELL):
				return cell_to_world(c)
	return center


func has_point_path(from: Vector3, to: Vector3) -> bool:
	var a := nearest_free(world_to_cell(from))
	var b := nearest_free(world_to_cell(to))
	if a.x < 0 or b.x < 0:
		return false
	return not astar.get_id_path(a, b, false).is_empty()

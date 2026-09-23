class_name Facility
extends Node3D
## Le niveau : l'hôpital Blackwood (voir scripts/level/hospital/). Contient le
## décor statique (Geo), les étages, les zones, les portes, lumières, objets,
## déclencheurs, points d'apparition et une grille de navigation par étage.
## Seul l'étage du joueur et ses voisins sont affichés (performances).

## Zones : {nom: {name, floor, rects: [Rect2 XZ], ymin, ymax, reverb, surface,
## ambience, neighbors, moon}} — remplies par le niveau à la construction.
static var ZONES := {}
## Niveaux des étages : numéro d'étage → hauteur du sol (m).
static var FLOOR_Y := {}

var geo: Geo
var doors := {}            # id → Door
var lights: Array[LightFixture] = []
var zone_lights := {}      # zone → [LightFixture]
var triggers := {}         # nom → TriggerZone
var spawns := {}           # id ennemi → définition
var anchors := {}          # nom → Vector3 (points d'intérêt des événements)
var nodes := {}            # nom → Node (objets référencés par les événements)
var nav_grids := {}        # étage → NavGrid
var nav_grids_big := {}    # étage → NavGrid pour les grandes créatures (Chirurgien, Colossus)
var nav_rects := {}        # étage → Rect2 couvert par la grille
var floor_roots := {}      # étage → Node3D (visibilité par étage)
var elevators := {}        # id → définition d'ascenseur (arrêts, règles d'accès)
var grid_lights: Array[LightFixture] = []   # éteintes tant que le courant n'est pas rétabli
var moon: DirectionalLight3D
var world_env: WorldEnvironment
var env: Environment
var sky_material: ShaderMaterial
var active_floor := 999

## Au-delà de ce rayon, une créature utilise la grille « grandes créatures ».
const BIG_RADIUS := 0.5
const BIG_INFLATE := 0.6
## Types de créatures qui utilisent la grille « grandes créatures ».
const BIG_TYPES := ["surgeon", "colossus"]


func build() -> void:
	geo = Geo.new(self)
	geo.zone_parent = _zone_parent
	_build_environment()
	HospitalLevel.build(self)
	geo.floor_levels = FLOOR_Y.values()
	geo.build()
	_build_nav()


## Version allégée (menu principal) : extérieur et façade seulement.
func build_exterior_only() -> void:
	geo = Geo.new(self)
	geo.zone_parent = _zone_parent
	_build_environment()
	HospitalLevel.build_exterior_only(self)
	geo.build()


## Étage (numéro) d'une hauteur donnée : le plus haut dont le sol est sous y + 1.
static func floor_at(y: float) -> int:
	var best := -99
	var best_y := -INF
	for f in FLOOR_Y:
		var fy: float = FLOOR_Y[f]
		if fy <= y + 1.0 and fy > best_y:
			best_y = fy
			best = f
	return best if best != -99 else 0


func floor_root(f: int) -> Node3D:
	if not floor_roots.has(f):
		var n := Node3D.new()
		n.name = "Floor_%d" % f
		# Masqué quand le joueur local est loin : affichage seulement (voir
		# Interactable.is_shown : en coop, l'autre joueur peut y être)
		n.add_to_group("floor_root")
		add_child(n)
		floor_roots[f] = n
	return floor_roots[f]


func _zone_parent(zone: String) -> Node3D:
	var def: Dictionary = ZONES.get(zone, {})
	if def.has("floor") and not bool(def.get("always", false)):
		return floor_root(int(def.floor))
	return self


## N'affiche que l'étage du joueur, ses voisins et les zones toujours visibles.
func set_active_floor(f: int) -> void:
	if f == active_floor:
		return
	active_floor = f
	for k in floor_roots:
		var d := absi(_floor_rank(int(k)) - _floor_rank(f))
		(floor_roots[k] as Node3D).visible = d <= 1


## Rang d'un étage dans la pile (les étages non construits ne comptent pas).
func _floor_rank(f: int) -> int:
	var keys := FLOOR_Y.keys()
	keys.sort()
	return keys.find(f)


func nav_grid_at(p: Vector3) -> NavGrid:
	return nav_grids.get(floor_at(p.y))


## Grille adaptée au gabarit d'une créature (les très grandes ont leur propre
## grille, plus gonflée, pour ne pas se coincer dans les encadrements).
func nav_grid_for(p: Vector3, radius: float) -> NavGrid:
	var f := floor_at(p.y)
	if radius > BIG_RADIUS and nav_grids_big.has(f):
		return nav_grids_big[f]
	return nav_grids.get(f)


# --- Environnement --------------------------------------------------------

func _build_environment() -> void:
	world_env = WorldEnvironment.new()
	env = Environment.new()
	var sky_mat := ShaderMaterial.new()
	sky_mat.shader = preload("res://materials/shaders/night_sky.gdshader")
	sky_mat.set_shader_parameter("noise_a", Mats.noise_a())
	sky_mat.set_shader_parameter("noise_b", Mats.noise_b())
	var sky := Sky.new()
	sky.sky_material = sky_mat
	sky.radiance_size = Sky.RADIANCE_SIZE_32
	env.sky = sky
	env.background_mode = Environment.BG_SKY
	env.reflected_light_source = Environment.REFLECTION_SOURCE_DISABLED
	env.volumetric_fog_sky_affect = 0.35
	sky_material = sky_mat
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.32, 0.36, 0.48)
	env.ambient_light_energy = 0.1
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.05
	env.volumetric_fog_enabled = true
	env.volumetric_fog_density = 0.018
	env.volumetric_fog_albedo = Color(0.75, 0.78, 0.85)
	env.volumetric_fog_anisotropy = 0.55
	env.volumetric_fog_length = 48.0
	env.volumetric_fog_emission = Color(0.0, 0.0, 0.0)
	env.volumetric_fog_ambient_inject = 0.0
	env.volumetric_fog_temporal_reprojection_enabled = true
	env.fog_enabled = false
	env.ssao_enabled = true
	env.ssao_radius = 1.2
	env.ssao_intensity = 2.2
	env.glow_enabled = true
	env.glow_intensity = 0.7
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.1
	env.adjustment_enabled = true
	env.adjustment_contrast = 1.08
	env.adjustment_saturation = 0.82
	world_env.environment = env
	add_child(world_env)

	moon = DirectionalLight3D.new()
	moon.light_color = Color(0.55, 0.64, 0.9)
	moon.light_energy = 0.32
	moon.shadow_enabled = true
	moon.directional_shadow_max_distance = 60.0
	moon.light_volumetric_fog_energy = 1.4
	moon.rotation = Vector3(deg_to_rad(-38.0), deg_to_rad(-28.0), 0.0)
	add_child(moon)


## Applique le préréglage de qualité (options).
func apply_quality(_q: int = 0) -> void:
	apply_graphics()


## Applique les options graphiques (Settings) à l'environnement et aux lumières.
func apply_graphics() -> void:
	env.volumetric_fog_enabled = Settings.volumetric_fog
	env.ssao_enabled = Settings.ssao
	env.ssil_enabled = Settings.ssil
	env.ssr_enabled = Settings.ssr
	env.ssr_max_steps = 48
	env.ssr_fade_in = 0.2
	env.ssr_fade_out = 2.5
	env.glow_enabled = Settings.glow
	moon.shadow_enabled = Settings.shadows >= 1
	for l in lights:
		if l.light and l.has_meta("shadow"):
			l.light.shadow_enabled = Settings.shadows >= 2
	# Sans brouillard volumétrique : brouillard classique pour garder l'ambiance
	env.fog_enabled = not Settings.volumetric_fog
	env.fog_light_color = Color(0.05, 0.055, 0.07)
	env.fog_density = 0.03


# --- Aides de construction -------------------------------------------------

func add_light(zone: String, pos: Vector3, color: Color, energy: float, light_range: float,
		mode: int = LightFixture.Mode.STEADY, opts: Dictionary = {}) -> LightFixture:
	var f := LightFixture.make(zone, pos, color, energy, light_range, mode, bool(opts.get("shadow", false)),
		float(opts.get("fog", 0.0)), opts.get("spot_dir", Vector3.ZERO), float(opts.get("spot_angle", 45.0)))
	if opts.get("shadow", false):
		f.set_meta("shadow", true)
	f.buzz = bool(opts.get("buzz", false))
	if opts.has("panel"):
		var panel: Vector3 = opts.panel
		f.add_panel(panel, opts.get("panel_offset", Vector3.ZERO), opts.get("panel_color", color), float(opts.get("panel_energy", 4.0)))
		# Boîtier du luminaire
		geo.box(zone, "metal_gray", pos + opts.get("panel_offset", Vector3.ZERO) + Vector3(0, panel.y * 0.5 + 0.02, 0),
			Vector3(panel.x + 0.08, 0.05, panel.z + 0.08), {"collide": false, "shadow": false})
	if opts.has("power"):
		f.power = bool(opts.power)
	# Réseau principal : éteint jusqu'au rétablissement du courant (groupes du -2)
	if bool(opts.get("grid", false)):
		f.power = false
		grid_lights.append(f)
	geo.zone_root(zone).add_child(f)
	lights.append(f)
	if not zone_lights.has(zone):
		zone_lights[zone] = []
	zone_lights[zone].append(f)
	if opts.has("name"):
		nodes[opts.name] = f
	return f


## Plafonnier fluorescent standard.
func ceiling_light(zone: String, pos: Vector3, mode: int = LightFixture.Mode.STEADY, energy: float = 1.0,
		opts: Dictionary = {}) -> LightFixture:
	var o := {"panel": Vector3(1.2, 0.04, 0.3), "panel_offset": Vector3(0, 0.02, 0), "buzz": true, "fog": 0.35}
	o.merge(opts, true)
	return add_light(zone, pos - Vector3(0, 0.08, 0), Color(0.82, 0.9, 1.0), energy, float(opts.get("range", 7.0)), mode, o)


func add_door(id: String, zone: String, pos: Vector3, along_z: bool, width: float, opts: Dictionary = {}) -> Door:
	var d := Door.new()
	d.door_id = id
	d.width = width
	d.height = float(opts.get("height", 2.2))
	d.double = bool(opts.get("double", width > 1.8))
	d.lock = int(opts.get("lock", Door.Lock.NONE))
	d.key_item = String(opts.get("key", ""))
	d.consume_key = bool(opts.get("consume_key", true))
	d.locked_msg = String(opts.get("locked_msg", d.locked_msg))
	d.unlock_msg = String(opts.get("unlock_msg", d.unlock_msg))
	d.unlock_flag = String(opts.get("unlock_flag", ""))
	d.leaf_mat = String(opts.get("mat", "wood_door"))
	d.frame_mat = String(opts.get("frame", "metal_gray"))
	d.has_window = bool(opts.get("window", false))
	d.sign_text = String(opts.get("sign", ""))
	d.heavy = bool(opts.get("heavy", false))
	d.start_open = bool(opts.get("open", false))
	# Sens d'ouverture initial (+1 : le vantail part vers -Z local ; -1 : vers +Z).
	# Les portes déjà ouvertes s'effacent dans la pièce, pas dans le couloir.
	d.start_dir = float(opts.get("dir", 1.0))
	# Sens d'ouverture imposé (portes coupe-feu : toujours côté couloir)
	d.fixed_dir = float(opts.get("swing", 0.0))
	d.sound_open = String(opts.get("sound_open", "door_open_metal" if d.heavy else "door_open"))
	d.sound_close = String(opts.get("sound_close", "door_close_metal" if d.heavy else "door_close"))
	d.nav_floor = floor_at(pos.y)
	d.position = pos
	d.rotation.y = PI / 2.0 if along_z else 0.0
	d.along_z = along_z
	geo.zone_root(zone).add_child(d)
	doors[id] = d
	return d


func add_pickup(id: String, zone: String, item: String, count: int, pos: Vector3, rot: float = 0.0,
		opts: Dictionary = {}) -> Pickup:
	var p := Pickup.new()
	p.pickup_id = id
	p.item_id = item
	p.count = count
	p.pickup_msg = String(opts.get("msg", ""))
	if opts.has("prompt"):
		p.prompt_text = opts.prompt
	p.position = pos
	p.rotation.y = rot
	geo.zone_root(zone).add_child(p)
	nodes[id] = p
	return p


func add_doc(doc_id: String, zone: String, pos: Vector3, rot: float = 0.0, kind: String = "document") -> DocumentPickup:
	var d := DocumentPickup.new()
	d.doc_id = doc_id
	d.model_kind = kind
	d.position = pos
	d.rotation.y = rot
	geo.zone_root(zone).add_child(d)
	nodes[doc_id] = d
	return d


func add_examine(zone: String, pos: Vector3, text: String, opts: Dictionary = {}) -> ExaminePoint:
	var e := ExaminePoint.new()
	e.text = text
	e.alt_text = String(opts.get("alt_text", ""))
	e.alt_flag = String(opts.get("alt_flag", ""))
	e.set_flag_on_examine = String(opts.get("flag", ""))
	e.prompt_text = String(opts.get("prompt", "EXAMINER"))
	e.interact_radius = float(opts.get("radius", 1.7))
	e.focus_offset = Vector3.ZERO
	e.position = pos
	geo.zone_root(zone).add_child(e)
	if opts.has("name"):
		nodes[opts.name] = e
	return e


func add_save_point(zone: String, pos: Vector3, rot: float = 0.0) -> SavePoint:
	var s := SavePoint.new()
	s.position = pos
	s.rotation.y = rot
	geo.zone_root(zone).add_child(s)
	return s


func add_trigger(trig_name: String, center: Vector3, size: Vector3, once: bool = true) -> TriggerZone:
	var t := TriggerZone.make(trig_name, center, size, once)
	add_child(t)
	triggers[trig_name] = t
	return t


func add_label(zone: String, text: String, pos: Vector3, rot: float, size: float = 1.0,
		color: Color = Color(0.85, 0.85, 0.8), glow: bool = false, font: Font = null) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = font if font else UITheme.font_ui_bold()
	l.font_size = 64
	l.pixel_size = 0.004 * size
	l.modulate = color
	l.outline_size = 0
	l.shaded = not glow
	l.double_sided = false
	l.position = pos
	l.rotation.y = rot
	if glow:
		l.modulate = Color(color.r * 2.0, color.g * 2.0, color.b * 2.0)
	geo.zone_root(zone).add_child(l)
	return l


func add_blood(zone: String, pos: Vector3, size: float = 1.0, mat: String = "blood",
		normal: Vector3 = Vector3.UP, rot: float = 0.0) -> void:
	FX.blood_decal(geo.zone_root(zone), pos, size, mat, normal, rot)


## Définit un point d'apparition d'ennemi.
func add_spawn(id: String, type: String, pos: Vector3, rot: float, patrol: Array = [], opts: Dictionary = {}) -> void:
	var d := {"type": type, "pos": pos, "rot": rot, "patrol": patrol, "floor": floor_at(pos.y)}
	d.merge(opts, true)
	spawns[id] = d


# --- Zones ------------------------------------------------------------------

static func zone_at(p: Vector3) -> String:
	var best := ""
	var best_area := INF
	for z in ZONES:
		var def: Dictionary = ZONES[z]
		if p.y < float(def.get("ymin", -INF)) or p.y > float(def.get("ymax", INF)):
			continue
		for r in def.rects:
			var rr := r as Rect2
			# La plus petite zone contenant le point l'emporte (pièce > couloir > étage)
			if rr.has_point(Vector2(p.x, p.z)) and rr.get_area() < best_area:
				best = z
				best_area = rr.get_area()
	return best if best != "" else "exterior"


# --- Navigation ---------------------------------------------------------------

## Déclare la grille de navigation d'un étage (rectangle XZ couvert).
func add_nav_floor(f: int, rect: Rect2) -> void:
	nav_rects[f] = rect


func _build_nav() -> void:
	nav_grids.clear()
	nav_grids_big.clear()
	var big_floors := {}
	for id in spawns:
		if String(spawns[id].type) in BIG_TYPES:
			big_floors[floor_at((spawns[id].pos as Vector3).y)] = true
	for f in nav_rects:
		nav_grids[f] = NavGrid.new(nav_rects[f], float(FLOOR_Y[f]))
		if big_floors.has(f):
			nav_grids_big[f] = NavGrid.new(nav_rects[f], float(FLOOR_Y[f]), BIG_INFLATE)
	for o in geo.obstacles:
		var fl := _floor_of_level_index(o.floor)
		if bool(o.get("big_only", false)):
			if nav_grids_big.has(fl):
				(nav_grids_big[fl] as NavGrid).block_rect(o.rect)
			continue
		for grid in _grids(fl):
			grid.block_rect(o.rect)
	for id in doors:
		var d: Door = doors[id]
		for grid in _grids(d.nav_floor):
			grid.register_door(id, d.footprint(), d.footprint(grid.inflate))
			grid.set_door_blocked(id, d.lock != Door.Lock.NONE)
	for id in doors:
		(doors[id] as Door).update_leaf_nav()
	# Vitres pleine hauteur : infranchissables pour l'IA tant qu'elles tiennent
	for n in nodes.values():
		if not (n is BreakableGlass) or not (n as BreakableGlass).blocks_nav():
			continue
		var bg: BreakableGlass = n
		for grid in _grids(floor_at(bg.position.y)):
			grid.register_door(bg.nav_id(), bg.footprint())
			grid.set_door_blocked(bg.nav_id(), not bg.broken)


## Grilles d'un étage (normale, puis « grandes créatures » s'il y en a une).
func _grids(f: int) -> Array[NavGrid]:
	var out: Array[NavGrid] = []
	if nav_grids.has(f):
		out.append(nav_grids[f])
	if nav_grids_big.has(f):
		out.append(nav_grids_big[f])
	return out


func _floor_of_level_index(i: int) -> int:
	var y: float = geo.floor_levels[i]
	for f in FLOOR_Y:
		if is_equal_approx(float(FLOOR_Y[f]), y):
			return f
	return 0


func set_nav_door(door: Door, blocked: bool) -> void:
	for grid in _grids(door.nav_floor):
		grid.set_door_blocked(door.door_id, blocked)


## Vantaux ouverts d'une porte : obstacles temporaires de la grille.
func set_nav_overlay(f: int, id: String, segments: Array) -> void:
	for grid in _grids(f):
		grid.set_overlay_segments(id, segments)


## Bloque / libère un passage déclaré dans la grille d'un étage (vitre brisée…).
func set_nav_blocked(f: int, id: String, blocked: bool) -> void:
	for grid in _grids(f):
		grid.set_door_blocked(id, blocked)

class_name Facility
extends Node3D
## Le centre de recherche Blackwood : construit tout le niveau (décor, lumières,
## portes, objets, déclencheurs, points d'apparition) à partir des sections
## décrites dans build_*.gd, puis prépare les grilles de navigation.

const GROUND_Y := 0.0
const BASEMENT_Y := -4.5

## Zones : rectangles XZ (x, z, largeur, profondeur), bornes verticales,
## ambiance sonore, réverbération, surface de pas et voisines (éclairage).
const ZONES := {
	"parking": {"name": "Parking", "rects": [], "ymin": -1.0, "ymax": 30.0, "reverb": "outdoor", "surface": "outdoor",
		"ambience": {"amb_rain": 0.9, "amb_wind": 0.6}, "neighbors": ["entrance", "hall"], "moon": true},
	"entrance": {"name": "Entrée principale", "rects": [Rect2(-4, 6, 8, 6)], "ymin": -1.0, "ymax": 4.0, "reverb": "room", "surface": "tile",
		"ambience": {"amb_rain_inside": 0.8, "amb_room": 0.5}, "neighbors": ["parking", "hall"], "moon": true},
	"hall": {"name": "Hall d'accueil", "rects": [Rect2(-12, -10, 24, 16)], "ymin": -1.0, "ymax": 7.0, "reverb": "hall", "surface": "tile",
		"ambience": {"amb_rain_inside": 0.55, "amb_room": 0.7, "amb_hum": 0.3}, "neighbors": ["entrance", "admin", "lab_wing", "parking"], "moon": true},
	"admin": {"name": "Couloir administratif", "rects": [Rect2(-32, -2.5, 20, 3), Rect2(-32, -12, 6, 9.5), Rect2(-15, -6, 3, 3.5), Rect2(-32, 0.5, 20, 6.5)], "ymin": -1.0, "ymax": 4.0,
		"reverb": "corridor", "surface": "lino", "ambience": {"amb_vent": 0.7, "amb_hum": 0.35}, "neighbors": ["hall", "archives", "security"], "moon": true},
	"archives": {"name": "Salle d'archives", "rects": [Rect2(-26, -12, 11, 9.5)], "ymin": -1.0, "ymax": 4.0, "reverb": "room", "surface": "lino",
		"ambience": {"amb_room": 0.6, "amb_vent": 0.3}, "neighbors": ["admin"], "moon": true},
	"security": {"name": "Salle de sécurité", "rects": [Rect2(-40, -7, 8, 12)], "ymin": -1.0, "ymax": 4.0, "reverb": "room", "surface": "lino",
		"ambience": {"amb_room": 0.5, "amb_hum": 0.6}, "neighbors": ["admin"], "moon": false},
	"lab_wing": {"name": "Aile des laboratoires", "rects": [Rect2(12, -2.5, 20, 3), Rect2(12, 0.5, 20, 6.5)], "ymin": -1.0, "ymax": 4.0, "reverb": "corridor", "surface": "tile",
		"ambience": {"amb_vent": 0.6, "amb_hum": 0.5}, "neighbors": ["hall", "lab"], "moon": true},
	"lab": {"name": "Laboratoire", "rects": [Rect2(14, -22, 18, 19.5), Rect2(25.5, -27, 3, 5)], "ymin": -2.2, "ymax": 5.0, "reverb": "room", "surface": "tile",
		"ambience": {"amb_lab": 0.8, "amb_hum": 0.4}, "neighbors": ["lab_wing", "basement"], "moon": false},
	"basement": {"name": "Sous-sol — Niveau B", "rects": [Rect2(25.5, -35, 3, 13), Rect2(0, -38, 30, 3), Rect2(2, -48, 22, 10), Rect2(8, -35, 8, 6)], "ymin": -6.0, "ymax": -1.0,
		"reverb": "basement", "surface": "concrete", "ambience": {"amb_basement": 0.9, "amb_generator": 0.25}, "neighbors": ["lab", "generator"], "moon": false},
	"generator": {"name": "Salle du générateur", "rects": [Rect2(-16, -46, 16, 16)], "ymin": -6.0, "ymax": 1.5, "reverb": "basement", "surface": "metal",
		"ambience": {"amb_generator": 0.8, "amb_basement": 0.4}, "neighbors": ["basement", "exit"], "moon": false},
	"exit": {"name": "Tunnel de service", "rects": [Rect2(-9.5, -74, 3, 28), Rect2(-40, -120, 70, 46)], "ymin": -6.0, "ymax": 30.0, "reverb": "tunnel", "surface": "concrete",
		"ambience": {"amb_tunnel": 0.8}, "neighbors": ["generator"], "moon": false},
}

var geo: Geo
var doors := {}            # id → Door
var lights: Array[LightFixture] = []
var zone_lights := {}      # zone → [LightFixture]
var triggers := {}         # nom → TriggerZone
var spawns := {}           # id ennemi → définition
var anchors := {}          # nom → Vector3 (points d'intérêt des événements)
var nodes := {}            # nom → Node (objets référencés par les événements)
var nav_grids: Array[NavGrid] = []
var moon: DirectionalLight3D
var world_env: WorldEnvironment
var env: Environment
var sky_material: ShaderMaterial


func build() -> void:
	geo = Geo.new(self)
	_build_environment()
	BuildExterior.build(self)
	BuildGround.build(self)
	BuildBasement.build(self)
	geo.build()
	_build_nav()


## Version allégée (menu principal) : extérieur et façade seulement.
func build_exterior_only() -> void:
	geo = Geo.new(self)
	_build_environment()
	BuildExterior.build(self)
	# Hall et entrée visibles à travers les portes vitrées
	var g := geo
	g.slab("hall", "floor_tile", -12, -10, 12, 6, 0.0)
	g.slab("entrance", "floor_tile", -4, 6, 4, 12, 0.0)
	g.box("entrance", "black", Vector3(0, 1.6, 5.5), Vector3(8.0, 3.2, 0.2))
	g.wall_x("entrance", "wall_hospital", -4.15, 4.15, 12.0, 0.0, 3.6, 0.3, [
		{"a": -1.3, "b": 1.3, "top": 2.6}, {"a": -3.5, "b": -1.9, "bottom": 0.9, "top": 2.5},
		{"a": 1.9, "b": 3.5, "bottom": 0.9, "top": 2.5}], "wall_ext")
	g.wall_z("entrance", "wall_ext", 6.0, 12.2, -4.0, 0.0, 3.6, 0.3, [], "wall_hospital")
	g.wall_z("entrance", "wall_hospital", 6.0, 12.2, 4.0, 0.0, 3.6, 0.3, [], "wall_ext")
	g.ceiling("entrance", "ceiling_tile", -4.15, 6, 4.15, 12.2, 3.2)
	g.wall_x("hall", "wall_hospital", -12.0, -4.0, 6.0, 0.0, 9.0, 0.3, [], "wall_ext")
	g.wall_x("hall", "wall_hospital", 4.0, 12.0, 6.0, 0.0, 9.0, 0.3, [], "wall_ext")
	g.wall_x("hall", "wall_hospital", -4.0, 4.0, 6.0, 3.2, 5.8, 0.3, [], "wall_ext")
	g.slab("hall", "ceiling_concrete", -12.2, -22.2, 12.2, 6.2, 9.3, 0.3)
	ceiling_light("entrance", Vector3(0, 3.2, 9.0), LightFixture.Mode.FLICKER, 0.9, {"range": 6.5})
	geo.build()


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
func apply_quality(q: int) -> void:
	env.volumetric_fog_enabled = q >= Settings.Quality.MEDIUM
	env.ssao_enabled = q >= Settings.Quality.HIGH
	env.glow_enabled = q >= Settings.Quality.MEDIUM
	moon.shadow_enabled = q >= Settings.Quality.MEDIUM
	for l in lights:
		if l.light and l.has_meta("shadow"):
			l.light.shadow_enabled = q >= Settings.Quality.HIGH
	var fallback_fog := q < Settings.Quality.MEDIUM
	env.fog_enabled = fallback_fog
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
	d.sound_open = String(opts.get("sound_open", "door_open_metal" if d.heavy else "door_open"))
	d.sound_close = String(opts.get("sound_close", "door_close_metal" if d.heavy else "door_close"))
	d.nav_floor = 1 if pos.y < -2.0 else 0
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
	var d := {"type": type, "pos": pos, "rot": rot, "patrol": patrol, "floor": 1 if pos.y < -2.0 else 0}
	d.merge(opts, true)
	spawns[id] = d


# --- Zones ------------------------------------------------------------------

static func zone_at(p: Vector3) -> String:
	for z in ZONES:
		var def: Dictionary = ZONES[z]
		if p.y < def.ymin or p.y > def.ymax:
			continue
		for r in def.rects:
			if (r as Rect2).has_point(Vector2(p.x, p.z)):
				return z
	return "parking" if p.y > -1.0 else "basement"


# --- Navigation ---------------------------------------------------------------

func _build_nav() -> void:
	nav_grids.clear()
	nav_grids.append(NavGrid.new(Rect2(-41, -24, 75, 33), GROUND_Y))
	nav_grids.append(NavGrid.new(Rect2(-17, -75, 49, 46), BASEMENT_Y))
	for o in geo.obstacles:
		var f: int = o.floor
		if f < nav_grids.size():
			nav_grids[f].block_rect(o.rect)
	for id in doors:
		var d: Door = doors[id]
		var grid := nav_grids[d.nav_floor]
		grid.register_door(id, d.footprint())
		grid.set_door_blocked(id, d.lock != Door.Lock.NONE)


func set_nav_door(door: Door, blocked: bool) -> void:
	if nav_grids.is_empty():
		return
	nav_grids[door.nav_floor].set_door_blocked(door.door_id, blocked)

class_name Mats
extends RefCounted
## Bibliothèque de matériaux procéduraux, créés à la demande et mis en cache.
## Pour remplacer un matériau provisoire par une vraie texture, il suffit de
## modifier son entrée ici : tout le niveau référence les matériaux par nom.

const SURFACE_SHADER := preload("res://materials/shaders/surface.gdshader")
const BLOOD_SHADER := preload("res://materials/shaders/blood.gdshader")
const SCREEN_SHADER := preload("res://materials/shaders/screen.gdshader")
const LIQUID_SHADER := preload("res://materials/shaders/liquid.gdshader")
const WATER_SHADER := preload("res://materials/shaders/water.gdshader")
const FLESH_SHADER := preload("res://materials/shaders/flesh.gdshader")

## Surfaces du décor (shader surface.gdshader).
const SURFACES := {
	"wall_hospital": {"pattern": 2, "base": Color(0.60, 0.60, 0.55), "alt": Color(0.29, 0.37, 0.34), "line": Color(0.16, 0.2, 0.18), "grime": 0.55},
	"wall_hospital_dirty": {"pattern": 2, "base": Color(0.50, 0.50, 0.45), "alt": Color(0.25, 0.31, 0.28), "line": Color(0.14, 0.16, 0.15), "grime": 0.95},
	"wall_admin": {"pattern": 2, "base": Color(0.56, 0.53, 0.46), "alt": Color(0.36, 0.27, 0.19), "line": Color(0.2, 0.14, 0.09), "grime": 0.5, "band": 0.95},
	"wall_tile_white": {"pattern": 1, "base": Color(0.70, 0.72, 0.70), "alt": Color(0.66, 0.69, 0.68), "line": Color(0.32, 0.33, 0.31), "tile": 0.2, "grime": 0.55, "rough": 0.35, "variation": 0.05},
	"wall_concrete": {"pattern": 4, "base": Color(0.40, 0.40, 0.38), "alt": Color(0.30, 0.31, 0.30), "line": Color(0.2, 0.2, 0.19), "grime": 0.7},
	"wall_concrete_dark": {"pattern": 4, "base": Color(0.27, 0.27, 0.26), "alt": Color(0.2, 0.2, 0.19), "line": Color(0.12, 0.12, 0.12), "grime": 0.85},
	"wall_ext": {"pattern": 4, "base": Color(0.36, 0.36, 0.35), "alt": Color(0.26, 0.27, 0.27), "line": Color(0.15, 0.15, 0.15), "grime": 0.8},
	"wall_plaster": {"pattern": 9, "base": Color(0.55, 0.53, 0.48), "alt": Color(0.34, 0.31, 0.27), "grime": 0.7},
	"floor_tile": {"pattern": 1, "base": Color(0.50, 0.50, 0.47), "alt": Color(0.20, 0.22, 0.22), "line": Color(0.12, 0.12, 0.11), "tile": 0.4, "grime": 0.6, "rough": 0.55, "wet": 0.5},
	"floor_tile_lab": {"pattern": 1, "base": Color(0.56, 0.58, 0.57), "alt": Color(0.50, 0.53, 0.52), "line": Color(0.25, 0.26, 0.25), "tile": 0.3, "grime": 0.5, "rough": 0.4, "wet": 0.6},
	"floor_lino": {"pattern": 6, "base": Color(0.34, 0.32, 0.28), "line": Color(0.15, 0.14, 0.12), "tile": 1.0, "grime": 0.55, "rough": 0.6, "variation": 0.15},
	"floor_carpet": {"pattern": 0, "base": Color(0.22, 0.07, 0.06), "grime": 0.6, "rough": 1.0, "variation": 0.2, "bump": 2.0},
	"floor_concrete": {"pattern": 4, "base": Color(0.28, 0.28, 0.27), "alt": Color(0.22, 0.22, 0.21), "line": Color(0.14, 0.14, 0.13), "grime": 0.75, "wet": 0.7},
	"ceiling_tile": {"pattern": 3, "base": Color(0.58, 0.58, 0.55), "line": Color(0.35, 0.35, 0.33), "grime": 0.7},
	"ceiling_concrete": {"pattern": 4, "base": Color(0.24, 0.24, 0.23), "alt": Color(0.18, 0.18, 0.18), "line": Color(0.1, 0.1, 0.1), "grime": 0.8},
	"asphalt": {"pattern": 5, "base": Color(0.11, 0.11, 0.12), "line": Color(0.04, 0.04, 0.04), "grime": 0.2, "wet": 0.75, "rough": 0.8},
	"ground": {"pattern": 0, "base": Color(0.07, 0.08, 0.05), "grime": 0.8, "rough": 1.0, "variation": 0.4, "bump": 3.0, "grime_color": Color(0.04, 0.035, 0.02)},
	"curb": {"pattern": 4, "base": Color(0.38, 0.38, 0.36), "grime": 0.6},
	"metal_gray": {"pattern": 7, "base": Color(0.36, 0.38, 0.39), "alt": Color(0.28, 0.14, 0.07), "rough": 0.5, "metallic": 0.6, "grime": 0.35},
	"metal_dark": {"pattern": 7, "base": Color(0.13, 0.14, 0.15), "alt": Color(0.22, 0.11, 0.06), "rough": 0.45, "metallic": 0.7, "grime": 0.3},
	"metal_green": {"pattern": 7, "base": Color(0.18, 0.27, 0.22), "alt": Color(0.26, 0.13, 0.07), "rough": 0.55, "metallic": 0.4, "grime": 0.4},
	"metal_blue": {"pattern": 7, "base": Color(0.14, 0.2, 0.3), "alt": Color(0.26, 0.13, 0.07), "rough": 0.55, "metallic": 0.4, "grime": 0.4},
	"metal_rust": {"pattern": 7, "base": Color(0.3, 0.2, 0.14), "alt": Color(0.24, 0.1, 0.04), "rough": 0.85, "metallic": 0.3, "grime": 0.6},
	"metal_steel": {"pattern": 7, "base": Color(0.55, 0.56, 0.57), "alt": Color(0.3, 0.2, 0.15), "rough": 0.3, "metallic": 0.9, "grime": 0.25},
	"metal_yellow": {"pattern": 7, "base": Color(0.55, 0.42, 0.06), "alt": Color(0.2, 0.12, 0.05), "rough": 0.6, "metallic": 0.3, "grime": 0.5},
	"wood_door": {"pattern": 8, "base": Color(0.32, 0.2, 0.11), "alt": Color(0.22, 0.13, 0.07), "rough": 0.55, "grime": 0.35},
	"wood_desk": {"pattern": 8, "base": Color(0.38, 0.27, 0.17), "alt": Color(0.27, 0.18, 0.1), "rough": 0.5, "grime": 0.3},
	"wood_light": {"pattern": 8, "base": Color(0.55, 0.45, 0.32), "alt": Color(0.42, 0.33, 0.22), "rough": 0.6, "grime": 0.3},
	"plastic_white": {"pattern": 0, "base": Color(0.66, 0.66, 0.63), "rough": 0.45, "grime": 0.45},
	"plastic_beige": {"pattern": 0, "base": Color(0.58, 0.54, 0.46), "rough": 0.5, "grime": 0.45},
	"plastic_dark": {"pattern": 0, "base": Color(0.07, 0.07, 0.08), "rough": 0.4, "grime": 0.2},
	"plastic_orange": {"pattern": 0, "base": Color(0.55, 0.22, 0.05), "rough": 0.5, "grime": 0.5},
	"fabric_blue": {"pattern": 0, "base": Color(0.11, 0.16, 0.26), "rough": 1.0, "grime": 0.5, "variation": 0.2},
	"fabric_green": {"pattern": 0, "base": Color(0.14, 0.24, 0.2), "rough": 1.0, "grime": 0.5, "variation": 0.2},
	"fabric_brown": {"pattern": 0, "base": Color(0.25, 0.16, 0.1), "rough": 1.0, "grime": 0.5, "variation": 0.25},
	"mattress": {"pattern": 0, "base": Color(0.55, 0.57, 0.55), "rough": 0.95, "grime": 0.9, "variation": 0.15},
	"cardboard": {"pattern": 0, "base": Color(0.42, 0.32, 0.2), "rough": 0.95, "grime": 0.5, "variation": 0.2},
	"paper": {"pattern": 0, "base": Color(0.78, 0.76, 0.68), "rough": 0.95, "grime": 0.35},
	"rubber": {"pattern": 0, "base": Color(0.03, 0.03, 0.03), "rough": 0.8, "grime": 0.1},
	"bark": {"pattern": 8, "base": Color(0.09, 0.07, 0.05), "alt": Color(0.05, 0.04, 0.03), "rough": 1.0, "grime": 0.2},
	"foliage": {"pattern": 0, "base": Color(0.03, 0.06, 0.035), "rough": 1.0, "grime": 0.4, "variation": 0.5},
	"car_red": {"pattern": 7, "base": Color(0.28, 0.04, 0.04), "alt": Color(0.2, 0.1, 0.05), "rough": 0.3, "metallic": 0.5, "grime": 0.4},
	"car_gray": {"pattern": 7, "base": Color(0.25, 0.26, 0.27), "alt": Color(0.2, 0.1, 0.05), "rough": 0.35, "metallic": 0.5, "grime": 0.4},
	"car_white": {"pattern": 7, "base": Color(0.62, 0.62, 0.6), "alt": Color(0.3, 0.15, 0.07), "rough": 0.35, "metallic": 0.3, "grime": 0.5},
	"car_black": {"pattern": 7, "base": Color(0.03, 0.035, 0.04), "alt": Color(0.1, 0.06, 0.04), "rough": 0.25, "metallic": 0.6, "grime": 0.2},
	"cloth_jacket": {"pattern": 0, "base": Color(0.17, 0.11, 0.075), "rough": 0.65, "grime": 0.3, "variation": 0.15},
	"cloth_jeans": {"pattern": 0, "base": Color(0.09, 0.11, 0.16), "rough": 0.95, "grime": 0.3, "variation": 0.15},
	"cloth_shirt": {"pattern": 0, "base": Color(0.25, 0.26, 0.27), "rough": 0.95, "grime": 0.2},
	"leather_boots": {"pattern": 0, "base": Color(0.06, 0.045, 0.035), "rough": 0.5, "grime": 0.3},
	"hair_dark": {"pattern": 0, "base": Color(0.045, 0.035, 0.03), "rough": 0.7, "grime": 0.0, "variation": 0.3},
	"skin_human": {"pattern": 0, "base": Color(0.6, 0.45, 0.36), "rough": 0.6, "grime": 0.15, "variation": 0.05},
	"gown": {"pattern": 0, "base": Color(0.42, 0.48, 0.5), "rough": 0.95, "grime": 0.95, "variation": 0.2, "grime_color": Color(0.22, 0.05, 0.03)},
	"uniform_guard": {"pattern": 0, "base": Color(0.1, 0.12, 0.16), "rough": 0.9, "grime": 0.8, "variation": 0.2, "grime_color": Color(0.2, 0.04, 0.03)},
	"apron": {"pattern": 0, "base": Color(0.2, 0.17, 0.14), "rough": 0.35, "grime": 1.0, "variation": 0.3, "grime_color": Color(0.22, 0.02, 0.015)},
	"surgical_cloth": {"pattern": 0, "base": Color(0.3, 0.42, 0.38), "rough": 0.9, "grime": 0.9, "variation": 0.25, "grime_color": Color(0.2, 0.03, 0.02)},
}

static var _cache := {}
static var _noise_a: NoiseTexture2D
static var _noise_b: NoiseTexture2D


static func noise_a() -> NoiseTexture2D:
	if _noise_a == null:
		var n := FastNoiseLite.new()
		n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
		n.frequency = 0.012
		n.fractal_type = FastNoiseLite.FRACTAL_FBM
		n.fractal_octaves = 5
		n.seed = 1337
		_noise_a = NoiseTexture2D.new()
		_noise_a.width = 512
		_noise_a.height = 512
		_noise_a.seamless = true
		_noise_a.generate_mipmaps = true
		_noise_a.noise = n
	return _noise_a


static func noise_b() -> NoiseTexture2D:
	if _noise_b == null:
		var n := FastNoiseLite.new()
		n.noise_type = FastNoiseLite.TYPE_SIMPLEX
		n.frequency = 0.035
		n.fractal_type = FastNoiseLite.FRACTAL_FBM
		n.fractal_octaves = 4
		n.seed = 4242
		_noise_b = NoiseTexture2D.new()
		_noise_b.width = 512
		_noise_b.height = 512
		_noise_b.seamless = true
		_noise_b.generate_mipmaps = true
		_noise_b.noise = n
	return _noise_b


## Matériau par nom (mis en cache).
static func get_mat(mat_name: String) -> Material:
	if _cache.has(mat_name):
		return _cache[mat_name]
	var m: Material
	if SURFACES.has(mat_name):
		m = _surface(SURFACES[mat_name])
	else:
		m = _special(mat_name)
	_cache[mat_name] = m
	return m


static func _surface(def: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = SURFACE_SHADER
	m.set_shader_parameter("pattern", int(def.get("pattern", 0)))
	m.set_shader_parameter("base_color", def.get("base", Color(0.5, 0.5, 0.5)))
	m.set_shader_parameter("alt_color", def.get("alt", def.get("base", Color(0.5, 0.5, 0.5))))
	m.set_shader_parameter("line_color", def.get("line", Color(0.18, 0.18, 0.17)))
	m.set_shader_parameter("grime_color", def.get("grime_color", Color(0.1, 0.085, 0.07)))
	m.set_shader_parameter("tile_size", float(def.get("tile", 0.5)))
	m.set_shader_parameter("band_height", float(def.get("band", 1.1)))
	m.set_shader_parameter("grime", float(def.get("grime", 0.5)))
	m.set_shader_parameter("roughness", float(def.get("rough", 0.85)))
	m.set_shader_parameter("metallic", float(def.get("metallic", 0.0)))
	m.set_shader_parameter("wetness", float(def.get("wet", 0.0)))
	m.set_shader_parameter("bump", float(def.get("bump", 1.0)))
	m.set_shader_parameter("variation", float(def.get("variation", 0.08)))
	m.set_shader_parameter("noise_a", noise_a())
	m.set_shader_parameter("noise_b", noise_b())
	return m


static func _special(mat_name: String) -> Material:
	match mat_name:
		"glass":
			var g := StandardMaterial3D.new()
			g.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			g.albedo_color = Color(0.55, 0.65, 0.7, 0.12)
			g.roughness = 0.05
			g.metallic = 0.2
			g.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
			g.cull_mode = BaseMaterial3D.CULL_DISABLED
			return g
		"glass_dirty":
			var g2 := StandardMaterial3D.new()
			g2.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			g2.albedo_color = Color(0.4, 0.45, 0.42, 0.35)
			g2.roughness = 0.4
			g2.cull_mode = BaseMaterial3D.CULL_DISABLED
			return g2
		"tank_glass":
			var g3 := StandardMaterial3D.new()
			g3.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			g3.albedo_color = Color(0.6, 0.8, 0.75, 0.1)
			g3.roughness = 0.02
			g3.metallic = 0.4
			return g3
		"emit_cold":
			return _emissive(Color(0.8, 0.9, 1.0), 4.0)
		"emit_warm":
			return _emissive(Color(1.0, 0.78, 0.5), 3.5)
		"emit_red":
			return _emissive(Color(1.0, 0.08, 0.04), 5.0)
		"emit_green":
			return _emissive(Color(0.15, 1.0, 0.35), 3.0)
		"emit_sodium":
			return _emissive(Color(1.0, 0.55, 0.2), 5.0)
		"emit_headlight":
			return _emissive(Color(1.0, 0.95, 0.85), 8.0)
		"emit_taillight":
			return _emissive(Color(0.8, 0.02, 0.02), 1.5)
		"emit_blue":
			return _emissive(Color(0.3, 0.55, 1.0), 4.0)
		"emit_amber":
			return _emissive(Color(1.0, 0.6, 0.1), 3.0)
		"emit_white_dim":
			return _emissive(Color(0.9, 0.92, 1.0), 1.2)
		"light_off":
			var off := StandardMaterial3D.new()
			off.albedo_color = Color(0.3, 0.3, 0.3)
			off.roughness = 0.3
			return off
		"black":
			var b := StandardMaterial3D.new()
			b.albedo_color = Color(0.01, 0.01, 0.01)
			b.roughness = 0.9
			return b
		"shadow_figure":
			var s := StandardMaterial3D.new()
			s.albedo_color = Color(0.0, 0.0, 0.0)
			s.roughness = 1.0
			s.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
			return s
		"blood":
			return _blood(0.35, 0.0)
		"blood_dry":
			return _blood(0.85, 0.0)
		"blood_smear":
			return _blood(0.55, 1.0)
		"liquid_green":
			var l := ShaderMaterial.new()
			l.shader = LIQUID_SHADER
			l.set_shader_parameter("noise_b", noise_b())
			return l
		"liquid_amber":
			var la := ShaderMaterial.new()
			la.shader = LIQUID_SHADER
			la.set_shader_parameter("color", Color(0.8, 0.45, 0.1))
			la.set_shader_parameter("glow", 1.0)
			la.set_shader_parameter("noise_b", noise_b())
			return la
		"water":
			var w := ShaderMaterial.new()
			w.shader = WATER_SHADER
			w.set_shader_parameter("noise_b", noise_b())
			return w
		"screen_terminal":
			return screen(0, Color(0.3, 1.0, 0.5))
		"screen_amber":
			return screen(0, Color(1.0, 0.65, 0.2))
		"screen_snow":
			return screen(1, Color(1, 1, 1))
		"screen_error":
			return screen(3, Color(1.0, 0.15, 0.1))
		"screen_ecg":
			return screen(4, Color(0.3, 1.0, 0.4))
		"screen_off":
			var so := StandardMaterial3D.new()
			so.albedo_color = Color(0.02, 0.025, 0.03)
			so.roughness = 0.15
			so.metallic = 0.3
			return so
		"flesh_hollow":
			return flesh(Color(0.5, 0.49, 0.44), 0.35)
		"flesh_surgeon":
			return flesh(Color(0.46, 0.4, 0.37), 0.55)
		"flesh_corpse":
			return flesh(Color(0.42, 0.4, 0.38), 0.2)
		"eye_glow":
			return _emissive(Color(0.9, 0.85, 0.6), 0.6)
		"muzzle_flash":
			var mf := StandardMaterial3D.new()
			mf.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
			mf.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			mf.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
			mf.albedo_color = Color(1.0, 0.75, 0.35, 1.0)
			mf.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
			mf.cull_mode = BaseMaterial3D.CULL_DISABLED
			return mf
	push_warning("Matériau inconnu : %s" % mat_name)
	var fallback := StandardMaterial3D.new()
	fallback.albedo_color = Color(1, 0, 1)
	return fallback


static func _emissive(c: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c * 0.6
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = energy
	m.roughness = 0.4
	return m


static func _blood(dryness: float, smear: float) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = BLOOD_SHADER
	m.set_shader_parameter("dryness", dryness)
	m.set_shader_parameter("smear", smear)
	m.set_shader_parameter("noise_a", noise_a())
	m.set_shader_parameter("noise_b", noise_b())
	m.render_priority = 1
	return m


static func screen(mode: int, tint: Color, feed: Texture2D = null) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = SCREEN_SHADER
	m.set_shader_parameter("mode", mode)
	m.set_shader_parameter("tint", tint)
	m.set_shader_parameter("noise_b", noise_b())
	if feed:
		m.set_shader_parameter("feed", feed)
	return m


static func flesh(skin: Color, wounds: float) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = FLESH_SHADER
	m.set_shader_parameter("skin", skin)
	m.set_shader_parameter("wound_amount", wounds)
	m.set_shader_parameter("noise_a", noise_a())
	m.set_shader_parameter("noise_b", noise_b())
	return m


## Copie indépendante (pour les matériaux animés individuellement).
static func unique(mat_name: String) -> Material:
	return get_mat(mat_name).duplicate()

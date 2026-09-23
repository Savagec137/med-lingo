extends Node
## Réglages persistants (user://settings.cfg) : graphismes, affichage, audio,
## jeu (vue première / troisième personne, difficulté…).
##
## Les préréglages de qualité fixent d'un coup les options graphiques ;
## modifier une option à la main passe en qualité « PERSONNALISÉE ».

signal changed

const PATH := "user://settings.cfg"

enum Quality { LOW, MEDIUM, HIGH, ULTRA, CUSTOM }
enum View { FIRST_PERSON, THIRD_PERSON }
enum WinMode { WINDOWED, BORDERLESS, FULLSCREEN }
enum AA { NONE, FXAA, MSAA2, MSAA4, TAA }

const QUALITY_NAMES := ["BASSE", "MOYENNE", "HAUTE", "ULTRA", "PERSONNALISÉE"]
const SHADOW_NAMES := ["DÉSACTIVÉES", "BASSES", "HAUTES", "ULTRA"]
const AA_NAMES := ["AUCUN", "FXAA", "MSAA 2×", "MSAA 4×", "TAA"]
const WINDOW_NAMES := ["FENÊTRÉ", "PLEIN ÉCRAN FENÊTRÉ", "PLEIN ÉCRAN"]
const VIEW_NAMES := ["PREMIÈRE PERSONNE", "TROISIÈME PERSONNE"]
const DIFFICULTY_NAMES := ["FACILE", "NORMALE", "DIFFICILE"]
const FPS_CHOICES := [0, 30, 60, 120, 144, 240]
const SUBTITLE_NAMES := ["PETITS", "MOYENS", "GRANDS"]

## Options pilotées par les préréglages de qualité.
const PRESETS := {
	Quality.LOW: {"shadows": 1, "volumetric_fog": false, "ssao": false, "ssil": false, "ssr": false, "glow": true, "antialiasing": AA.FXAA, "render_scale": 0.75},
	Quality.MEDIUM: {"shadows": 1, "volumetric_fog": true, "ssao": false, "ssil": false, "ssr": false, "glow": true, "antialiasing": AA.FXAA, "render_scale": 0.9},
	Quality.HIGH: {"shadows": 2, "volumetric_fog": true, "ssao": true, "ssil": false, "ssr": false, "glow": true, "antialiasing": AA.FXAA, "render_scale": 1.0},
	Quality.ULTRA: {"shadows": 3, "volumetric_fog": true, "ssao": true, "ssil": true, "ssr": true, "glow": true, "antialiasing": AA.TAA, "render_scale": 1.0},
}

# --- Graphismes
var quality: int = Quality.HIGH
var shadows := 2
var volumetric_fog := true
var ssao := true
var ssil := false
var ssr := false
var glow := true
var antialiasing: int = AA.FXAA
var render_scale := 1.0
var film_grain := true
var chromatic_aberration := true
# --- Affichage
var window_mode: int = WinMode.WINDOWED
var vsync := true
var max_fps := 0
var brightness := 1.0
var fov := 70.0
var camera_shake := 1.0
var head_bob := true
# --- Audio
var master_volume := 0.9
var music_volume := 0.7
var sfx_volume := 0.9
var ambience_volume := 0.85
var subtitles := true
var subtitle_size := 1
# --- Jeu
var camera_view: int = View.THIRD_PERSON
var mouse_sensitivity := 1.0
var invert_y := false
var difficulty := 1
var crosshair := true
var flashlight_intensity := 1.0

const _KEYS := [
	"quality", "shadows", "volumetric_fog", "ssao", "ssil", "ssr", "glow", "antialiasing", "render_scale",
	"film_grain", "chromatic_aberration",
	"window_mode", "vsync", "max_fps", "brightness", "fov", "camera_shake", "head_bob",
	"master_volume", "music_volume", "sfx_volume", "ambience_volume", "subtitles", "subtitle_size",
	"camera_view", "mouse_sensitivity", "invert_y", "difficulty", "crosshair", "flashlight_intensity",
]
const _GRAPHIC_KEYS := ["shadows", "volumetric_fog", "ssao", "ssil", "ssr", "glow", "antialiasing", "render_scale"]
const _WINDOW_KEYS := ["window_mode", "vsync", "max_fps"]


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	InputSetup.setup()
	load_settings()
	apply_window()
	apply_viewport(get_tree().root)


func load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	for key in _KEYS:
		if cfg.has_section_key("settings", key):
			set(key, cfg.get_value("settings", key))
	# Ancien format : « fullscreen » booléen
	if cfg.has_section_key("settings", "fullscreen") and not cfg.has_section_key("settings", "window_mode"):
		window_mode = WinMode.FULLSCREEN if cfg.get_value("settings", "fullscreen") else WinMode.WINDOWED
	quality = clampi(quality, 0, Quality.CUSTOM)


func save_settings() -> void:
	var cfg := ConfigFile.new()
	for key in _KEYS:
		cfg.set_value("settings", key, get(key))
	cfg.save(PATH)


func set_value(key: String, value) -> void:
	set(key, value)
	if key == "quality" and int(value) != Quality.CUSTOM:
		apply_preset(int(value))
	elif key in _GRAPHIC_KEYS:
		quality = Quality.CUSTOM
	if key in _WINDOW_KEYS:
		apply_window()
	if key in _GRAPHIC_KEYS or key == "quality":
		apply_viewport(get_tree().root)
	save_settings()
	changed.emit()


func apply_preset(q: int) -> void:
	if not PRESETS.has(q):
		return
	var p: Dictionary = PRESETS[q]
	for key in p:
		set(key, p[key])
	quality = q


func apply_window() -> void:
	if DisplayServer.get_name() == "headless":
		return
	match window_mode:
		WinMode.FULLSCREEN:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN)
		WinMode.BORDERLESS:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		_:
			if DisplayServer.window_get_mode() != DisplayServer.WINDOW_MODE_WINDOWED:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if vsync else DisplayServer.VSYNC_DISABLED)
	Engine.max_fps = max_fps


## Anticrénelage et résolution de rendu (mise à l'échelle FSR sous 100 %).
func apply_viewport(vp: Viewport) -> void:
	if vp == null:
		return
	vp.msaa_3d = Viewport.MSAA_2X if antialiasing == AA.MSAA2 else (Viewport.MSAA_4X if antialiasing == AA.MSAA4 else Viewport.MSAA_DISABLED)
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if antialiasing == AA.FXAA else Viewport.SCREEN_SPACE_AA_DISABLED
	vp.use_taa = antialiasing == AA.TAA
	vp.scaling_3d_scale = clampf(render_scale, 0.5, 1.0)
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR if render_scale < 0.99 else Viewport.SCALING_3D_MODE_BILINEAR
	# Ombres : taille des atlas et qualité du filtrage
	var atlas: int = [1024, 2048, 4096, 8192][clampi(shadows, 0, 3)]
	vp.positional_shadow_atlas_size = atlas
	RenderingServer.directional_shadow_atlas_set_size([1024, 2048, 4096, 4096][clampi(shadows, 0, 3)], true)
	var soft: int = [RenderingServer.SHADOW_QUALITY_HARD, RenderingServer.SHADOW_QUALITY_SOFT_VERY_LOW,
		RenderingServer.SHADOW_QUALITY_SOFT_LOW, RenderingServer.SHADOW_QUALITY_SOFT_MEDIUM][clampi(shadows, 0, 3)]
	RenderingServer.positional_soft_shadow_filter_set_quality(soft as RenderingServer.ShadowQuality)
	RenderingServer.directional_soft_shadow_filter_set_quality(soft as RenderingServer.ShadowQuality)


## Multiplicateurs de difficulté.
func damage_taken_mult() -> float:
	return [0.6, 1.0, 1.4][clampi(difficulty, 0, 2)]


func ammo_mult() -> float:
	return [1.5, 1.0, 0.7][clampi(difficulty, 0, 2)]


func enemy_hp_mult() -> float:
	return [0.8, 1.0, 1.2][clampi(difficulty, 0, 2)]


## Conversion linéaire → dB pour les bus audio.
static func to_db(v: float) -> float:
	return linear_to_db(maxf(v, 0.0001))

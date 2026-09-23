extends Node
## Réglages persistants (user://settings.cfg) : audio, souris, image, qualité.

signal changed

const PATH := "user://settings.cfg"

enum Quality { LOW, MEDIUM, HIGH }

var master_volume := 0.9
var music_volume := 0.7
var sfx_volume := 0.9
var ambience_volume := 0.85
var mouse_sensitivity := 1.0
var invert_y := false
var brightness := 1.0
var flashlight_intensity := 1.0
var quality: int = Quality.HIGH
var fullscreen := false
var fov := 70.0

const _KEYS := [
	"master_volume", "music_volume", "sfx_volume", "ambience_volume",
	"mouse_sensitivity", "invert_y", "brightness", "flashlight_intensity",
	"quality", "fullscreen", "fov",
]


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	InputSetup.setup()
	load_settings()
	apply_window()


func load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	for key in _KEYS:
		if cfg.has_section_key("settings", key):
			set(key, cfg.get_value("settings", key))


func save_settings() -> void:
	var cfg := ConfigFile.new()
	for key in _KEYS:
		cfg.set_value("settings", key, get(key))
	cfg.save(PATH)


func set_value(key: String, value) -> void:
	set(key, value)
	if key == "fullscreen":
		apply_window()
	save_settings()
	changed.emit()


func apply_window() -> void:
	if DisplayServer.get_name() == "headless":
		return
	if fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	elif DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)


## Conversion linéaire → dB pour les bus audio.
static func to_db(v: float) -> float:
	return linear_to_db(maxf(v, 0.0001))

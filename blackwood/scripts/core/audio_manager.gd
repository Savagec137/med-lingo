extends Node
## Gestion audio : bus, sons ponctuels 2D/3D, boucles (ambiances, musique) avec fondus.
##
## Les sons sont chargés depuis res://audio/. Les variantes « nom_1 », « nom_2 »…
## sont regroupées : jouer « nom » en choisit une au hasard.

const AUDIO_DIR := "res://audio"
const BUSES := ["Music", "SFX", "Ambience", "UI"]
const MAX_3D := 40

## Préréglages de réverbération par type d'espace : [room_size, damping, wet, spread]
const REVERB := {
	"outdoor": [0.15, 0.8, 0.03, 0.4],
	"room": [0.35, 0.6, 0.12, 0.6],
	"corridor": [0.55, 0.45, 0.2, 0.8],
	"hall": [0.8, 0.35, 0.28, 1.0],
	"basement": [0.7, 0.3, 0.3, 1.0],
	"tunnel": [0.9, 0.2, 0.35, 1.0],
}

var streams := {}      # nom → AudioStream
var variants := {}     # nom de base → [noms]
var _pool: Array[AudioStreamPlayer3D] = []
var _loops := {}       # nom → {player, target, speed}
var _reverb: AudioEffectReverb
var _lowpass: AudioEffectLowPassFilter
var _reverb_target := [0.3, 0.5, 0.1, 0.6]
var _muffle_target := 20000.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_buses()
	_load_streams()
	apply_volumes()
	Settings.changed.connect(apply_volumes)


func _setup_buses() -> void:
	for bus_name in BUSES:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			var idx := AudioServer.bus_count - 1
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, "Master")
	var sfx := AudioServer.get_bus_index("SFX")
	_reverb = AudioEffectReverb.new()
	_reverb.room_size = 0.3
	_reverb.damping = 0.5
	_reverb.wet = 0.1
	_reverb.dry = 1.0
	_reverb.spread = 0.6
	AudioServer.add_bus_effect(sfx, _reverb)
	_lowpass = AudioEffectLowPassFilter.new()
	_lowpass.cutoff_hz = 20000.0
	AudioServer.add_bus_effect(sfx, _lowpass)
	var master := AudioServer.get_bus_index("Master")
	var limiter := AudioEffectHardLimiter.new()
	AudioServer.add_bus_effect(master, limiter)


func _load_streams() -> void:
	var files: PackedStringArray = ResourceLoader.list_directory(AUDIO_DIR)
	for f in files:
		if not f.ends_with(".wav") and not f.ends_with(".ogg"):
			continue
		var sound_name := f.get_basename()
		var stream: AudioStream = load(AUDIO_DIR + "/" + f)
		if stream == null:
			continue
		if _is_loop(sound_name):
			if stream is AudioStreamOggVorbis:
				(stream as AudioStreamOggVorbis).loop = true
			elif stream is AudioStreamWAV:
				(stream as AudioStreamWAV).loop_mode = AudioStreamWAV.LOOP_FORWARD
		streams[sound_name] = stream
		var base := sound_name
		var parts := sound_name.rsplit("_", true, 1)
		if parts.size() == 2 and parts[1].is_valid_int():
			base = parts[0]
		if not variants.has(base):
			variants[base] = []
		variants[base].append(sound_name)


const LOOPS := ["light_buzz", "heartbeat", "alarm", "phone_static", "phone_ring", "surgeon_breath", "metal_scrape"]


static func _is_loop(sound_name: String) -> bool:
	return sound_name.begins_with("amb_") or sound_name.begins_with("music_") or sound_name in LOOPS


func has_sound(sound_name: String) -> bool:
	return streams.has(sound_name) or variants.has(sound_name)


func get_stream(sound_name: String) -> AudioStream:
	if streams.has(sound_name):
		return streams[sound_name]
	if variants.has(sound_name):
		var list: Array = variants[sound_name]
		return streams[list[randi() % list.size()]]
	return null


func apply_volumes() -> void:
	_set_bus_volume("Master", Settings.master_volume)
	_set_bus_volume("Music", Settings.music_volume)
	_set_bus_volume("SFX", Settings.sfx_volume)
	_set_bus_volume("Ambience", Settings.ambience_volume)
	_set_bus_volume("UI", Settings.sfx_volume)


func _set_bus_volume(bus_name: String, v: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx >= 0:
		AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(v, 0.0001)))


## Son positionné dans le monde.
func play_3d(sound_name: String, pos: Vector3, volume_db: float = 0.0, pitch_var: float = 0.06,
		max_distance: float = 40.0, unit_size: float = 5.0) -> AudioStreamPlayer3D:
	var stream := get_stream(sound_name)
	if stream == null:
		return null
	var p := _get_3d_player()
	p.stream = stream
	p.global_position = pos
	p.volume_db = volume_db
	p.pitch_scale = 1.0 + randf_range(-pitch_var, pitch_var)
	p.max_distance = max_distance
	p.unit_size = unit_size
	p.play()
	return p


func _get_3d_player() -> AudioStreamPlayer3D:
	for p in _pool:
		if not p.playing:
			return p
	if _pool.size() < MAX_3D:
		var p := AudioStreamPlayer3D.new()
		p.bus = "SFX"
		p.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
		p.panning_strength = 1.0
		add_child(p)
		_pool.append(p)
		return p
	return _pool[randi() % _pool.size()]


## Son non spatialisé (interface, sons du joueur, voix).
func play_2d(sound_name: String, volume_db: float = 0.0, pitch: float = 1.0, bus: String = "SFX") -> AudioStreamPlayer:
	var stream := get_stream(sound_name)
	if stream == null:
		return null
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.volume_db = volume_db
	p.pitch_scale = pitch
	p.bus = bus
	add_child(p)
	p.finished.connect(p.queue_free)
	p.play()
	return p


func ui(sound_name: String, volume_db: float = -6.0) -> void:
	play_2d(sound_name, volume_db, 1.0, "UI")


## Boucle 2D avec fondu (ambiances, musique, battements de cœur).
## volume linéaire 0..1 ; 0 = fondu jusqu'à l'arrêt.
func set_loop(sound_name: String, volume: float, fade: float = 2.0, bus: String = "Ambience") -> void:
	var entry: Dictionary = _loops.get(sound_name, {})
	if entry.is_empty():
		if volume <= 0.0:
			return
		var stream := get_stream(sound_name)
		if stream == null:
			return
		var p := AudioStreamPlayer.new()
		p.stream = stream
		p.bus = bus
		p.volume_db = -60.0
		add_child(p)
		p.play()
		entry = {"player": p, "current": 0.0, "target": volume, "speed": 1.0 / maxf(fade, 0.01)}
		_loops[sound_name] = entry
	else:
		entry.target = volume
		entry.speed = 1.0 / maxf(fade, 0.01)
		if not entry.player.playing and volume > 0.0:
			entry.player.play()


func stop_all_loops(fade: float = 1.0) -> void:
	for sound_name in _loops:
		set_loop(sound_name, 0.0, fade)


func play_music(sound_name: String, volume: float = 1.0, fade: float = 3.0) -> void:
	set_loop(sound_name, volume, fade, "Music")


func set_reverb(preset: String) -> void:
	_reverb_target = REVERB.get(preset, REVERB["room"])


## Assourdit les effets (mort, sonnerie d'oreilles, séquences).
func set_muffled(on: bool) -> void:
	_muffle_target = 900.0 if on else 20000.0


func _process(delta: float) -> void:
	var finished: Array = []
	for sound_name in _loops:
		var e: Dictionary = _loops[sound_name]
		e.current = move_toward(e.current, e.target, e.speed * delta)
		e.player.volume_db = linear_to_db(maxf(e.current, 0.0001))
		if e.current <= 0.0 and e.target <= 0.0:
			finished.append(sound_name)
	for sound_name in finished:
		_loops[sound_name].player.queue_free()
		_loops.erase(sound_name)
	if _reverb:
		var k := clampf(delta * 1.5, 0.0, 1.0)
		_reverb.room_size = lerpf(_reverb.room_size, _reverb_target[0], k)
		_reverb.damping = lerpf(_reverb.damping, _reverb_target[1], k)
		_reverb.wet = lerpf(_reverb.wet, _reverb_target[2], k)
		_reverb.spread = lerpf(_reverb.spread, _reverb_target[3], k)
	if _lowpass:
		_lowpass.cutoff_hz = lerpf(_lowpass.cutoff_hz, _muffle_target, clampf(delta * 3.0, 0.0, 1.0))

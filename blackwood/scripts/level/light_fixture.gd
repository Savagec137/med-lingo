class_name LightFixture
extends Node3D
## Source lumineuse du décor, rattachée à une zone (activée/désactivée selon la
## position du joueur pour les performances) avec plusieurs comportements :
##   STEADY  : stable
##   FLICKER : stable avec des coupures brèves et irrégulières
##   BROKEN  : éteinte la plupart du temps, grésille par salves
##   PULSE   : pulsation lente (veilleuses, gyrophares de confinement)
##   OFF     : éteinte (peut être rallumée par un événement)

enum Mode { STEADY, FLICKER, BROKEN, PULSE, OFF }

var zone := ""
var mode: int = Mode.STEADY
var light: Light3D
var base_energy := 1.0
var emissive: Array[MeshInstance3D] = []
var emissive_energy := 4.0
var buzz := false
var power := true           # coupure scriptée (black-out)
var rotate_speed := 0.0     # gyrophare
var zone_active := true

var _mat: StandardMaterial3D
var _t := 0.0
var _state := 1.0
var _timer := 0.0
var _burst := 0
var _buzz_player: AudioStreamPlayer3D
var _phase := randf() * TAU


## Crée une lumière ponctuelle (omni) ou un projecteur (spot).
static func make(p_zone: String, pos: Vector3, color: Color, energy: float, light_range: float,
		p_mode: int = Mode.STEADY, shadow: bool = false, fog: float = 0.0, spot_dir: Vector3 = Vector3.ZERO,
		spot_angle: float = 45.0) -> LightFixture:
	var f := LightFixture.new()
	f.zone = p_zone
	f.mode = p_mode
	f.position = pos
	var l: Light3D
	if spot_dir != Vector3.ZERO:
		var s := SpotLight3D.new()
		s.spot_range = light_range
		s.spot_angle = spot_angle
		s.spot_attenuation = 0.8
		s.spot_angle_attenuation = 1.5
		l = s
		f.add_child(s)
		var up := Vector3.UP if absf(spot_dir.normalized().y) < 0.95 else Vector3.FORWARD
		s.basis = Basis.looking_at(spot_dir.normalized(), up)
	else:
		var o := OmniLight3D.new()
		o.omni_range = light_range
		o.omni_attenuation = 1.3
		l = o
		f.add_child(o)
	l.light_color = color
	l.light_energy = energy
	l.shadow_enabled = shadow
	l.shadow_bias = 0.06
	l.shadow_normal_bias = 1.5
	l.light_volumetric_fog_energy = fog
	l.light_specular = 0.4
	f.light = l
	f.base_energy = energy
	return f


## Ajoute un tube / panneau émissif associé (même comportement que la lumière).
func add_panel(size: Vector3, offset: Vector3 = Vector3.ZERO, color: Color = Color(0.85, 0.92, 1.0),
		energy: float = 4.0) -> MeshInstance3D:
	if _mat == null:
		_mat = StandardMaterial3D.new()
		_mat.albedo_color = color * 0.5
		_mat.emission_enabled = true
		_mat.emission = color
		_mat.emission_energy_multiplier = energy
		_mat.roughness = 0.4
		emissive_energy = energy
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	mi.material_override = _mat
	mi.position = offset
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	emissive.append(mi)
	return mi


func _ready() -> void:
	add_to_group("light_fixtures")
	if buzz and mode != Mode.OFF:
		_buzz_player = AudioStreamPlayer3D.new()
		_buzz_player.stream = Audio.get_stream("light_buzz")
		_buzz_player.bus = "Ambience"
		_buzz_player.unit_size = 1.2
		_buzz_player.max_distance = 9.0
		_buzz_player.volume_db = -14.0
		add_child(_buzz_player)
		_buzz_player.play()
	_apply(1.0 if mode != Mode.OFF else 0.0)


func set_mode(m: int) -> void:
	mode = m
	if mode == Mode.OFF:
		_apply(0.0)


func set_power(on: bool) -> void:
	power = on
	if not on:
		_apply(0.0)


func set_zone_active(active: bool) -> void:
	zone_active = active
	if light:
		light.visible = active and power and mode != Mode.OFF and _state > 0.01
	if _buzz_player:
		if active and not _buzz_player.playing and mode != Mode.OFF:
			_buzz_player.play()
		elif not active and _buzz_player.playing:
			_buzz_player.stop()


func _apply(k: float) -> void:
	_state = k
	if light:
		light.light_energy = base_energy * k
		light.visible = zone_active and power and k > 0.01
	if _mat:
		_mat.emission_energy_multiplier = emissive_energy * k
		_mat.albedo_color.a = 1.0


func _process(delta: float) -> void:
	if not power or mode == Mode.OFF:
		if _state != 0.0:
			_apply(0.0)
		return
	_t += delta
	if rotate_speed != 0.0 and light:
		light.rotate_y(rotate_speed * delta)
	match mode:
		Mode.STEADY:
			if _state != 1.0:
				_apply(1.0)
		Mode.PULSE:
			_apply(0.35 + 0.65 * (0.5 + 0.5 * sin(_t * 2.2 + _phase)))
		Mode.FLICKER:
			_timer -= delta
			if _timer <= 0.0:
				if _burst > 0:
					_burst -= 1
					_apply(randf_range(0.0, 0.35) if _state > 0.5 else 1.0)
					_timer = randf_range(0.03, 0.09)
				elif randf() < 0.18:
					_burst = randi_range(2, 7)
					_timer = 0.02
					_spark()
				else:
					_apply(randf_range(0.88, 1.0))
					_timer = randf_range(0.15, 1.2)
		Mode.BROKEN:
			_timer -= delta
			if _timer <= 0.0:
				if _burst > 0:
					_burst -= 1
					_apply(randf_range(0.4, 1.0) if _state < 0.3 else 0.0)
					_timer = randf_range(0.03, 0.12)
				elif randf() < 0.35:
					_burst = randi_range(3, 9)
					_timer = 0.02
					_spark()
				else:
					_apply(0.0)
					_timer = randf_range(0.8, 4.0)


func _spark() -> void:
	if zone_active and buzz and randf() < 0.5:
		Audio.play_3d("light_flicker", global_position, -12.0, 0.1, 10.0, 2.0)

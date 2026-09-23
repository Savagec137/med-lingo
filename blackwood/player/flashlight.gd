class_name Flashlight
extends Node3D
## Lampe torche d'épaule : suit le regard de la caméra, projette des ombres,
## éclaire le brouillard volumétrique, consomme sa batterie et peut être
## perturbée (clignotements) ou coupée par des événements scriptés.

const DRAIN_PER_SEC := 0.1       # 100 % ≈ 16 min allumée
const BASE_ENERGY := 5.0

var spot: SpotLight3D
var bounce: OmniLight3D
var lens: MeshInstance3D
var lens_mat: StandardMaterial3D
var interference := 0.0          # 0..1, clignotements (zones perturbées)
var _forced_off := 0.0           # coupure scriptée (secondes)
var _flicker := 1.0
var _flicker_timer := 0.0
var _aim_dir := Vector3.FORWARD
var _space_state: PhysicsDirectSpaceState3D


func _ready() -> void:
	spot = SpotLight3D.new()
	spot.light_color = Color(1.0, 0.94, 0.84)
	spot.spot_range = 24.0
	spot.spot_angle = 27.0
	spot.spot_angle_attenuation = 1.1
	spot.spot_attenuation = 0.9
	spot.shadow_enabled = true
	spot.shadow_bias = 0.04
	spot.shadow_normal_bias = 1.2
	spot.shadow_blur = 1.2
	spot.light_volumetric_fog_energy = 0.7
	spot.light_specular = 0.55
	spot.light_projector = _make_projector()
	spot.light_cull_mask = 0xFFFFF & ~2
	add_child(spot)
	# Rebond lumineux : éclaire faiblement autour du point visé (faux éclairage indirect)
	bounce = OmniLight3D.new()
	bounce.light_color = Color(1.0, 0.92, 0.82)
	bounce.omni_range = 4.5
	bounce.omni_attenuation = 1.6
	bounce.light_energy = 0.0
	bounce.shadow_enabled = false
	bounce.light_volumetric_fog_energy = 0.0
	bounce.light_specular = 0.0
	bounce.top_level = true
	add_child(bounce)
	# Petit boîtier visible sur l'épaule
	lens = MeshInstance3D.new()
	var body := CylinderMesh.new()
	body.top_radius = 0.028
	body.bottom_radius = 0.032
	body.height = 0.13
	lens.mesh = body
	lens.rotation.x = PI / 2.0
	lens_mat = StandardMaterial3D.new()
	lens_mat.albedo_color = Color(0.08, 0.08, 0.09)
	lens_mat.metallic = 0.6
	lens_mat.roughness = 0.4
	lens_mat.emission_enabled = true
	lens_mat.emission = Color(1.0, 0.95, 0.8)
	lens_mat.emission_energy_multiplier = 0.0
	lens.material_override = lens_mat
	lens.layers = 2
	add_child(lens)
	_apply_visibility()


func _make_projector() -> GradientTexture2D:
	# Motif réaliste : point chaud, anneau, halo qui décroît
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.18, 0.3, 0.38, 0.62, 1.0])
	g.colors = PackedColorArray([
		Color(1, 1, 1), Color(0.95, 0.95, 0.95), Color(0.62, 0.62, 0.62),
		Color(0.8, 0.8, 0.8), Color(0.25, 0.25, 0.25), Color(0, 0, 0)])
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 0.0)
	tex.width = 256
	tex.height = 256
	return tex


func is_on() -> bool:
	return GameState.flashlight_on


func set_on(on: bool) -> void:
	if on and not GameState.get_flag("has_flashlight"):
		return
	GameState.flashlight_on = on
	Audio.play_3d("flashlight_click", global_position, -6.0, 0.05, 10.0, 2.0)
	_apply_visibility()


func toggle() -> void:
	set_on(not is_on())


## Coupe la lampe quelques secondes (événement scripté).
func force_off(seconds: float) -> void:
	_forced_off = seconds
	Audio.play_3d("light_flicker", global_position, -8.0, 0.1, 8.0, 2.0)


func _apply_visibility() -> void:
	var lit := is_on() and _forced_off <= 0.0
	spot.visible = lit
	bounce.visible = lit


func _physics_process(delta: float) -> void:
	# Recherche du point éclairé pour le rebond lumineux
	if not spot.visible:
		return
	_space_state = get_world_3d().direct_space_state
	var from := spot.global_position
	var to := from + _aim_dir * 14.0
	var q := PhysicsRayQueryParameters3D.create(from, to, 1 | 16)
	var hit := _space_state.intersect_ray(q)
	if hit:
		var p: Vector3 = hit.position
		bounce.global_position = p - _aim_dir * 0.6 + (hit.normal as Vector3) * 0.3
		var dist := from.distance_to(p)
		bounce.light_energy = clampf(0.55 - dist * 0.03, 0.08, 0.55) * _energy_scale()
	else:
		bounce.light_energy = 0.0


func _energy_scale() -> float:
	var b := GameState.flashlight_battery
	var e := 1.0
	if b <= 0.0:
		e = 0.12
	elif b < 20.0:
		e = 0.35 + b / 20.0 * 0.65
	return e * _flicker * Settings.flashlight_intensity


## Appelé par le joueur à chaque image avec la direction visée.
func update_light(delta: float, aim_dir: Vector3) -> void:
	_aim_dir = _aim_dir.slerp(aim_dir.normalized(), 1.0 - exp(-16.0 * delta)).normalized()
	if _aim_dir.length() < 0.5:
		_aim_dir = aim_dir.normalized()
	var up := Vector3.UP if absf(_aim_dir.y) < 0.98 else Vector3.RIGHT
	spot.global_transform = Transform3D(Basis.looking_at(_aim_dir, up), spot.global_position)
	lens.global_transform = Transform3D(Basis.looking_at(_aim_dir, up) * Basis(Vector3.RIGHT, PI / 2.0), lens.global_position)

	if _forced_off > 0.0:
		_forced_off -= delta
		if _forced_off <= 0.0:
			Audio.play_3d("flashlight_click", global_position, -8.0, 0.05, 8.0, 2.0)
		_apply_visibility()

	if is_on():
		GameState.flashlight_battery = maxf(GameState.flashlight_battery - DRAIN_PER_SEC * delta, 0.0)

	# Clignotements : batterie faible ou interférences
	_flicker_timer -= delta
	var chance := interference
	if GameState.flashlight_battery < 20.0:
		chance = maxf(chance, 0.15 + (20.0 - GameState.flashlight_battery) / 40.0)
	if _flicker_timer <= 0.0:
		if randf() < chance * 0.5:
			_flicker = randf_range(0.0, 0.5)
			_flicker_timer = randf_range(0.03, 0.12)
		else:
			_flicker = 1.0
			_flicker_timer = randf_range(0.05, 0.4)
	spot.light_energy = BASE_ENERGY * _energy_scale()
	lens_mat.emission_energy_multiplier = 3.0 * _energy_scale() if spot.visible else 0.0

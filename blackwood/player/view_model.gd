class_name ViewModel
extends Node3D
## Bras et arme vus en première personne (calque de rendu 11, invisible en
## troisième personne). Position de hanche / de visée, balancement lié aux
## mouvements de la souris, balancement de marche, recul, rechargement,
## changement d'arme et coup de matraque.

const LAYER := 1 << 10

## Placement de l'arme par rapport à la caméra : hanche (hip) et visée (ads).
const POSES := {
	"baton": {"hip": Vector3(0.24, -0.26, -0.42), "hip_rot": Vector3(0.35, 0.25, -0.35), "ads": Vector3(0.18, -0.2, -0.4), "ads_rot": Vector3(0.45, 0.2, -0.3)},
	"pistol": {"hip": Vector3(0.16, -0.13, -0.36), "hip_rot": Vector3(0.02, 0.06, 0.0), "ads": Vector3(0.0, -0.075, -0.3), "ads_rot": Vector3.ZERO},
	"shotgun": {"hip": Vector3(0.2, -0.2, -0.3), "hip_rot": Vector3(0.0, 0.05, 0.0), "ads": Vector3(0.0, -0.1, -0.2), "ads_rot": Vector3.ZERO},
	"smg": {"hip": Vector3(0.16, -0.15, -0.32), "hip_rot": Vector3(0.02, 0.06, 0.0), "ads": Vector3(0.0, -0.09, -0.24), "ads_rot": Vector3.ZERO},
	"magnum": {"hip": Vector3(0.16, -0.14, -0.36), "hip_rot": Vector3(0.02, 0.06, 0.0), "ads": Vector3(0.0, -0.085, -0.3), "ads_rot": Vector3.ZERO},
}
## Mains (repère de l'arme) : main droite sur la poignée, main gauche en soutien.
const HANDS := {
	"baton": {"r": Vector3(0, -0.01, 0.06), "l": Vector3.INF},
	"pistol": {"r": Vector3(0, -0.07, 0.03), "l": Vector3(-0.025, -0.08, 0.0)},
	"shotgun": {"r": Vector3(0, -0.06, 0.13), "l": Vector3(-0.01, -0.04, -0.34)},
	"smg": {"r": Vector3(0, -0.1, 0.06), "l": Vector3(-0.01, -0.06, -0.2)},
	"magnum": {"r": Vector3(0, -0.07, 0.1), "l": Vector3(-0.025, -0.08, 0.06)},
}

var weapon_id := ""
var holder: Node3D
var model: Node3D
var ads := 0.0
var aiming := false
var _sway := Vector2.ZERO
var _last_yaw := 0.0
var _last_pitch := 0.0
var _bob_phase := 0.0
var _bob_amt := 0.0
var _recoil := 0.0
var _reload := 0.0
var _switch := 0.0
var _melee := -1.0
var _pump := -1.0


func _ready() -> void:
	holder = Node3D.new()
	holder.name = "Holder"
	add_child(holder)


func set_weapon(id: String) -> void:
	if id == weapon_id:
		return
	weapon_id = id
	if model:
		model.queue_free()
		model = null
	if id == "":
		return
	model = WeaponModels.build(id, LAYER)
	holder.add_child(model)
	var hands: Dictionary = HANDS.get(id, {})
	_arm(model, hands.get("r", Vector3.INF), true)
	_arm(model, hands.get("l", Vector3.INF), false)
	_switch = 1.0


## Avant-bras en veste de cuir + main, partant hors champ vers le bas.
func _arm(parent: Node3D, hand_pos: Vector3, right: bool) -> void:
	if hand_pos == Vector3.INF:
		return
	# Gants tactiques (ancien ambulancier militaire) sur manche de blouson
	var skin := Mats.get_mat("glove")
	var sleeve := Mats.get_mat("cloth_jacket")
	var hand := MeshInstance3D.new()
	var hb := CapsuleMesh.new()
	hb.radius = 0.04
	hb.height = 0.11
	hand.mesh = hb
	hand.rotation.x = PI / 2.0
	hand.material_override = skin
	hand.position = hand_pos
	hand.layers = LAYER
	hand.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(hand)
	var fore := MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = 0.048
	cap.height = 0.42
	fore.mesh = cap
	fore.material_override = sleeve
	fore.layers = LAYER
	fore.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var elbow := hand_pos + Vector3(0.16 if right else -0.2, -0.24, 0.26)
	fore.position = (hand_pos + elbow) * 0.5 + (elbow - hand_pos).normalized() * 0.05
	fore.basis = Basis(Quaternion(Vector3.UP, (elbow - hand_pos).normalized()))
	parent.add_child(fore)


func muzzle() -> Node3D:
	return model.get_node_or_null("Muzzle") if model else null


func kick(amount: float) -> void:
	_recoil = minf(_recoil + amount, 1.5)
	if weapon_id == "shotgun":
		_pump = 0.0


func play_reload(duration: float) -> void:
	_reload = maxf(duration, 0.1)


func stop_reload() -> void:
	_reload = 0.0


func swing() -> void:
	_melee = 0.0


func update(delta: float, cam_yaw: float, cam_pitch: float, move_speed: float, running: bool) -> void:
	if model == null:
		return
	ads = move_toward(ads, 1.0 if aiming else 0.0, delta * 6.0)
	# Balancement : l'arme traîne derrière les mouvements de la caméra
	var dy := wrapf(cam_yaw - _last_yaw, -PI, PI)
	var dp := cam_pitch - _last_pitch
	_last_yaw = cam_yaw
	_last_pitch = cam_pitch
	var lag := 1.0 - ads * 0.7
	_sway = _sway.lerp(Vector2(clampf(dy * 2.5, -0.12, 0.12), clampf(dp * 2.5, -0.1, 0.1)) * lag, 1.0 - exp(-10.0 * delta))
	# Balancement de marche
	var target_bob := clampf(move_speed / 4.0, 0.0, 1.2) * (1.0 - ads * 0.8) if Settings.head_bob else 0.0
	_bob_amt = lerpf(_bob_amt, target_bob, 1.0 - exp(-8.0 * delta))
	_bob_phase += delta * (9.5 if running else 6.5) * clampf(move_speed / 2.3, 0.3, 1.6)
	var bob := Vector3(sin(_bob_phase) * 0.012, -absf(cos(_bob_phase)) * 0.014, 0.0) * _bob_amt
	_recoil = lerpf(_recoil, 0.0, 1.0 - exp(-12.0 * delta))
	var p: Dictionary = POSES.get(weapon_id, POSES["pistol"])
	var pos: Vector3 = (p.hip as Vector3).lerp(p.ads, ads) + bob
	var rot: Vector3 = (p.hip_rot as Vector3).lerp(p.ads_rot, ads)
	pos += Vector3(-_sway.x * 0.35, _sway.y * 0.3, 0.0)
	rot += Vector3(_sway.y * 0.6, _sway.x * 0.8, _sway.x * 0.5)
	pos.z += _recoil * 0.06
	rot.x += _recoil * 0.22
	if running and ads < 0.1:
		rot += Vector3(-0.35, 0.5, 0.2)
		pos += Vector3(-0.04, -0.03, 0.02)
	# Rechargement : l'arme descend et bascule
	if _reload > 0.0:
		_reload = maxf(_reload - delta, 0.0)
		var k := sin(clampf(_reload, 0.0, 1.0) * PI) if _reload < 1.0 else 1.0
		rot += Vector3(-0.6 * k, 0.3 * k, 0.4 * k)
		pos += Vector3(-0.02, -0.08 * k, 0.03)
	# Changement d'arme : l'arme remonte depuis le bas de l'écran
	if _switch > 0.0:
		_switch = maxf(_switch - delta * 3.0, 0.0)
		pos.y -= _switch * 0.3
		rot.x -= _switch * 0.6
	# Coup de matraque : armé puis balayage de droite à gauche
	if _melee >= 0.0:
		_melee += delta
		var t := _melee / 0.45
		if t >= 1.0:
			_melee = -1.0
		else:
			var wind := smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.25, 0.55, t))
			var strike := smoothstep(0.25, 0.55, t) * (1.0 - smoothstep(0.7, 1.0, t))
			rot += Vector3(0.7 * wind - 0.3 * strike, -0.6 * wind + 1.2 * strike, 0.4 * wind - 0.8 * strike)
			pos += Vector3(0.08 * wind - 0.16 * strike, 0.05 * wind, -0.08 * strike)
	# Pompe du fusil
	if _pump >= 0.0 and model:
		_pump += delta
		var pump := model.get_node_or_null("Pump")
		var tp := _pump / 0.5
		if pump:
			pump.position.z = -0.34 + sin(clampf(tp, 0.0, 1.0) * PI) * 0.09
		if tp >= 1.0:
			_pump = -1.0
	holder.position = pos
	holder.rotation = rot

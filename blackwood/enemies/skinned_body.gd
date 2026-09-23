class_name SkinnedBody
extends Node3D
## Corps réaliste : modèle 3D riggé (généré avec Higgsfield : Tripo + auto-rig)
## animé par un HumanoidRig procédural invisible. À chaque image, l'orientation
## de chaque articulation du rig est reportée sur l'os correspondant du
## squelette (reciblage par rotations globales, calibré une fois au repos).
## Toutes les animations existantes (marche, attaque, mort, tics) s'appliquent
## donc telles quelles au modèle.

const MODEL := "res://assets/models/zombie/zombie.glb"
const TEX := "res://assets/models/zombie/"
const SKIN_SHADER := preload("res://materials/shaders/zombie_skin.gdshader")

## Articulation du rig → os du squelette.
const MAP := {
	"hips": "Hips", "spine": "Spine02", "chest": "Spine", "neck": "neck", "head": "Head",
	"shoulder_l": "LeftArm", "elbow_l": "LeftForeArm", "wrist_l": "LeftHand",
	"shoulder_r": "RightArm", "elbow_r": "RightForeArm", "wrist_r": "RightHand",
	"hip_l": "LeftUpLeg", "knee_l": "LeftLeg", "ankle_l": "LeftFoot",
	"hip_r": "RightUpLeg", "knee_r": "RightLeg", "ankle_r": "RightFoot",
}
## Segment de référence (articulation enfant) utilisé pour calibrer chaque os.
const CHILD := {
	"hips": "spine", "spine": "chest", "chest": "neck", "neck": "head",
	"shoulder_l": "elbow_l", "elbow_l": "wrist_l", "shoulder_r": "elbow_r", "elbow_r": "wrist_r",
	"hip_l": "knee_l", "knee_l": "ankle_l", "hip_r": "knee_r", "knee_r": "ankle_r",
}
## Os sans segment propre : ils héritent de la calibration de leur parent.
const INHERIT := {"head": "neck", "wrist_l": "elbow_l", "wrist_r": "elbow_r", "ankle_l": "knee_l", "ankle_r": "knee_r"}

static var _scene: PackedScene
static var _tex := {}

var rig: HumanoidRig
var skeleton: Skeleton3D
var mesh: MeshInstance3D
var material: ShaderMaterial
## Mise à jour une image sur N quand la créature est loin (économie de CPU).
var lod_far := 26.0

var _order: Array[int] = []
var _parent: Array[int] = []
var _rest_local: Array[Quaternion] = []
var _bone_joint := {}
var _target_rest := {}
var _m := Quaternion.IDENTITY
var _m_inv := Quaternion.IDENTITY
var _hips_bone := -1
var _hips_rest_pos := Vector3.ZERO
var _rig_hips_rest := Vector3.ZERO
var _pos_scale := 1.0
var _frame := 0
var _global: Array[Quaternion] = []


static func available() -> bool:
	return ResourceLoader.exists(MODEL)


static func _texture(file: String) -> Texture2D:
	if not _tex.has(file):
		_tex[file] = load(TEX + file)
	return _tex[file]


## look : scale, cloth_tint, cloth_mix, skin_tint, pallor, blood, wet,
##        bone_scale ({os: Vector3}) pour déformer la silhouette (bras longs…).
func setup(p_rig: HumanoidRig, look: Dictionary = {}) -> void:
	rig = p_rig
	if _scene == null:
		_scene = load(MODEL)
	var inst: Node3D = _scene.instantiate()
	add_child(inst)
	# Le modèle regarde +Z, le rig -Z.
	rotation.y = PI
	scale = Vector3.ONE * float(look.get("scale", 1.0))
	skeleton = inst.find_children("*", "Skeleton3D", true, false)[0]
	mesh = inst.find_children("*", "MeshInstance3D", true, false)[0]
	material = ShaderMaterial.new()
	material.shader = SKIN_SHADER
	material.set_shader_parameter("albedo_tex", _texture("albedo.jpg"))
	material.set_shader_parameter("normal_tex", _texture("normal.jpg"))
	material.set_shader_parameter("orm_tex", _texture("orm.jpg"))
	material.set_shader_parameter("noise_tex", Mats.noise_b())
	material.set_shader_parameter("cloth_tint", look.get("cloth_tint", Color(1, 1, 1)))
	material.set_shader_parameter("cloth_mix", float(look.get("cloth_mix", 0.0)))
	material.set_shader_parameter("skin_tint", look.get("skin_tint", Color(1, 1, 1)))
	material.set_shader_parameter("pallor", float(look.get("pallor", 0.0)))
	material.set_shader_parameter("blood", float(look.get("blood", 0.3)))
	material.set_shader_parameter("wet", float(look.get("wet", 0.0)))
	mesh.material_override = material
	var bone_scale: Dictionary = look.get("bone_scale", {})
	for bone_name in bone_scale:
		var b := skeleton.find_bone(bone_name)
		if b >= 0:
			skeleton.set_bone_pose_scale(b, bone_scale[bone_name])
	_prepare()
	update_pose(true)


func _prepare() -> void:
	# Rotation et échelle du squelette dans le repère du rig
	var b := Basis()
	var n: Node = skeleton
	while n != null and n != rig:
		if n is Node3D:
			b = (n as Node3D).transform.basis * b
		n = n.get_parent()
	var sc := b.get_scale().x
	_m = b.orthonormalized().get_rotation_quaternion()
	_m_inv = _m.inverse()
	var count := skeleton.get_bone_count()
	_parent.resize(count)
	_rest_local.resize(count)
	_global.resize(count)
	var depth := {}
	for i in count:
		_parent[i] = skeleton.get_bone_parent(i)
		_rest_local[i] = skeleton.get_bone_rest(i).basis.get_rotation_quaternion()
		var d := 0
		var p := _parent[i]
		while p >= 0:
			d += 1
			p = skeleton.get_bone_parent(p)
		depth[i] = d
	_order.clear()
	for i in count:
		_order.append(i)
	_order.sort_custom(func(a: int, c: int) -> bool: return depth[a] < depth[c])
	# Calibration : aligne chaque segment du modèle (pose A) sur le segment du rig au repos
	var calib := {}
	for joint_name in MAP:
		var bone := skeleton.find_bone(MAP[joint_name])
		if bone < 0 or rig.joint(joint_name) == null:
			continue
		_bone_joint[bone] = rig.joint(joint_name)
		var rest_g := skeleton.get_bone_global_rest(bone)
		var rest_rig := _m * rest_g.basis.get_rotation_quaternion()
		var c := Quaternion.IDENTITY
		if CHILD.has(joint_name):
			var child_bone := skeleton.find_bone(MAP[CHILD[joint_name]])
			var rig_dir: Vector3 = rig.joint(CHILD[joint_name]).position.normalized()
			var model_dir := (_m * (skeleton.get_bone_global_rest(child_bone).origin - rest_g.origin)).normalized()
			c = Quaternion(model_dir, rig_dir)
		calib[joint_name] = c
		_target_rest[bone] = rest_rig
	for joint_name in MAP:
		var bone := skeleton.find_bone(MAP[joint_name])
		if bone < 0 or not _target_rest.has(bone):
			continue
		var c: Quaternion = calib.get(INHERIT.get(joint_name, joint_name), Quaternion.IDENTITY)
		_target_rest[bone] = c * _target_rest[bone]
	_hips_bone = skeleton.find_bone("Hips")
	if _hips_bone >= 0:
		_hips_rest_pos = skeleton.get_bone_rest(_hips_bone).origin
		_rig_hips_rest = Vector3(0, rig.base_hips_height, 0)
		var model_hips := skeleton.get_bone_global_rest(_hips_bone).origin.y * sc
		_pos_scale = (model_hips / maxf(rig.base_hips_height, 0.01)) / maxf(sc, 1e-6)


func _process(_delta: float) -> void:
	update_pose()


func update_pose(force: bool = false) -> void:
	if rig == null or skeleton == null or not is_visible_in_tree():
		return
	_frame += 1
	if not force:
		var cam := get_viewport().get_camera_3d() if get_viewport() else null
		if cam and cam.global_position.distance_to(global_position) > lod_far and _frame % 3 != 0:
			return
	var inv_root := rig.global_basis.orthonormalized().get_rotation_quaternion().inverse()
	for i in _order:
		var p := _parent[i]
		var parent_g: Quaternion = _global[p] if p >= 0 else Quaternion.IDENTITY
		var g: Quaternion
		if _bone_joint.has(i):
			var j: Node3D = _bone_joint[i]
			var d := inv_root * j.global_basis.orthonormalized().get_rotation_quaternion()
			g = _m_inv * (d * _target_rest[i])
		else:
			g = parent_g * _rest_local[i]
		_global[i] = g
		skeleton.set_bone_pose_rotation(i, (parent_g.inverse() * g).normalized())
	if _hips_bone >= 0:
		var hips: Node3D = rig.joint("hips")
		var delta_rig := hips.position - _rig_hips_rest
		skeleton.set_bone_pose_position(_hips_bone, _hips_rest_pos + (_m_inv * delta_rig) * _pos_scale)

class_name HumanoidRig
extends Node3D
## Corps humanoïde procédural (primitives) avec articulations animables.
## Les poses sont des angles d'Euler cibles vers lesquels chaque articulation
## converge doucement. Le même squelette sert au joueur et aux créatures ;
## seules les proportions et les matériaux changent.
##
## Articulations : hips, spine, chest, neck, head, shoulder_l/r, elbow_l/r,
## wrist_l/r, hip_l/r, knee_l/r, ankle_l/r

var joints := {}
var targets := {}
var smoothing := 14.0
var meshes: Array[MeshInstance3D] = []
var cfg := {}
var base_hips_height := 0.92


## cfg : height, bulk, shoulder_width, arm_len, arm_thick, leg_thick, head_scale,
##       hunch, mat_torso, mat_arms, mat_legs, mat_skin, mat_feet, mat_hair,
##       mat_hands, hair (bool), torso_shape ("jacket"|"gown"|"apron")
func build(p_cfg: Dictionary) -> void:
	cfg = p_cfg
	var s: float = cfg.get("height", 1.0)
	var bulk: float = cfg.get("bulk", 1.0)
	var arm_len: float = cfg.get("arm_len", 1.0)
	var sw: float = cfg.get("shoulder_width", 1.0)
	base_hips_height = 0.92 * s

	var hips := _joint("hips", self, Vector3(0, base_hips_height, 0))
	var spine := _joint("spine", hips, Vector3(0, 0.1 * s, 0))
	var chest := _joint("chest", spine, Vector3(0, 0.26 * s, 0))
	var neck := _joint("neck", chest, Vector3(0, 0.2 * s, 0.0))
	var head := _joint("head", neck, Vector3(0, 0.09 * s, 0))

	# Bassin
	_mesh(hips, _box(Vector3(0.33, 0.17, 0.2) * Vector3(bulk, s, bulk)), cfg.get("mat_legs", "cloth_jeans"), Vector3(0, 0.02, 0))
	# Torse : cylindre évasé aplati d'avant en arrière
	var torso := CylinderMesh.new()
	torso.top_radius = 0.2 * bulk * sw
	torso.bottom_radius = 0.165 * bulk
	torso.height = 0.5 * s
	torso.radial_segments = 14
	var tm := _mesh(spine, torso, cfg.get("mat_torso", "cloth_jacket"), Vector3(0, 0.2 * s, 0))
	tm.scale = Vector3(1.0, 1.0, 0.62)
	var shape: String = cfg.get("torso_shape", "jacket")
	if shape == "jacket":
		# Col et bas de veste légèrement plus larges
		var collar := _mesh(chest, _box(Vector3(0.3, 0.07, 0.2) * Vector3(bulk * sw, 1, bulk)), cfg.get("mat_torso", "cloth_jacket"), Vector3(0, 0.17 * s, -0.01))
		collar.rotation.x = -0.15
	elif shape == "gown":
		var skirt := CylinderMesh.new()
		skirt.top_radius = 0.19 * bulk
		skirt.bottom_radius = 0.25 * bulk
		skirt.height = 0.42 * s
		skirt.radial_segments = 12
		var sm := _mesh(hips, skirt, cfg.get("mat_torso", "gown"), Vector3(0, -0.14 * s, 0))
		sm.scale = Vector3(1.0, 1.0, 0.7)
	elif shape == "apron":
		_mesh(chest, _box(Vector3(0.44, 0.9, 0.05) * Vector3(bulk, s, 1)), cfg.get("mat_apron", "apron"), Vector3(0, -0.28 * s, -0.17 * bulk))
		var belly := SphereMesh.new()
		belly.radius = 0.24 * bulk
		belly.height = 0.46 * bulk
		_mesh(spine, belly, cfg.get("mat_torso", "cloth_jacket"), Vector3(0, 0.12 * s, -0.04))

	# Cou et tête
	var neck_mesh := CylinderMesh.new()
	neck_mesh.top_radius = 0.05 * bulk
	neck_mesh.bottom_radius = 0.058 * bulk
	neck_mesh.height = 0.11 * s
	_mesh(neck, neck_mesh, cfg.get("mat_skin", "skin_human"), Vector3(0, 0.04 * s, 0))
	var hs: float = cfg.get("head_scale", 1.0)
	var head_mesh := SphereMesh.new()
	head_mesh.radius = 0.105 * hs
	head_mesh.height = 0.245 * hs
	head_mesh.radial_segments = 16
	head_mesh.rings = 10
	var hm := _mesh(head, head_mesh, cfg.get("mat_skin", "skin_human"), Vector3(0, 0.1 * s, 0))
	hm.scale = Vector3(1.0, 1.0, 1.08)
	if cfg.get("hair", true):
		var hair := SphereMesh.new()
		hair.radius = 0.112 * hs
		hair.height = 0.2 * hs
		hair.radial_segments = 16
		hair.rings = 8
		var hr := _mesh(head, hair, cfg.get("mat_hair", "hair_dark"), Vector3(0, 0.14 * s, 0.018))
		hr.scale = Vector3(1.02, 0.9, 1.08)
	# Mâchoire / nez discrets pour lire l'orientation de la tête
	_mesh(head, _box(Vector3(0.05, 0.05, 0.05) * hs), cfg.get("mat_skin", "skin_human"), Vector3(0, 0.09 * s, -0.11 * hs))

	# Bras
	for side in ["l", "r"]:
		var sx := -1.0 if side == "l" else 1.0
		var sh := _joint("shoulder_" + side, chest, Vector3(sx * 0.2 * bulk * sw, 0.13 * s, 0))
		var ua_len := 0.3 * s * arm_len
		var fa_len := 0.28 * s * arm_len
		var at: float = cfg.get("arm_thick", 1.0)
		_mesh(sh, _capsule(0.058 * bulk * at, ua_len + 0.08), cfg.get("mat_arms", cfg.get("mat_torso", "cloth_jacket")), Vector3(0, -ua_len * 0.5, 0))
		var el := _joint("elbow_" + side, sh, Vector3(0, -ua_len, 0))
		_mesh(el, _capsule(0.048 * bulk * at, fa_len + 0.07), cfg.get("mat_forearms", cfg.get("mat_arms", cfg.get("mat_torso", "cloth_jacket"))), Vector3(0, -fa_len * 0.5, 0))
		var wr := _joint("wrist_" + side, el, Vector3(0, -fa_len, 0))
		_mesh(wr, _box(Vector3(0.075, 0.1, 0.035) * Vector3(bulk, 1, bulk)), cfg.get("mat_hands", cfg.get("mat_skin", "skin_human")), Vector3(0, -0.05, 0))

	# Jambes
	for side in ["l", "r"]:
		var sx2 := -1.0 if side == "l" else 1.0
		var hp := _joint("hip_" + side, hips, Vector3(sx2 * 0.1 * bulk, -0.03, 0))
		var th_len := 0.44 * s
		var sh_len := 0.43 * s
		var lt: float = cfg.get("leg_thick", 1.0)
		_mesh(hp, _capsule(0.078 * bulk * lt, th_len + 0.1), cfg.get("mat_legs", "cloth_jeans"), Vector3(0, -th_len * 0.5, 0))
		var kn := _joint("knee_" + side, hp, Vector3(0, -th_len, 0))
		_mesh(kn, _capsule(0.06 * bulk * lt, sh_len + 0.06), cfg.get("mat_shins", cfg.get("mat_legs", "cloth_jeans")), Vector3(0, -sh_len * 0.5, 0))
		var an := _joint("ankle_" + side, kn, Vector3(0, -sh_len, 0))
		_mesh(an, _box(Vector3(0.1, 0.075, 0.26) * Vector3(bulk, 1, 1)), cfg.get("mat_feet", "leather_boots"), Vector3(0, -0.02, -0.06))

	var hunch: float = cfg.get("hunch", 0.0)
	if hunch != 0.0:
		pose("spine", Vector3(-hunch * 0.5, 0, 0))
		pose("chest", Vector3(-hunch * 0.5, 0, 0))
		pose("neck", Vector3(hunch * 0.6, 0, 0))
	snap()


func _joint(joint_name: String, parent: Node3D, pos: Vector3) -> Node3D:
	var j := Node3D.new()
	j.name = joint_name
	j.position = pos
	parent.add_child(j)
	joints[joint_name] = j
	targets[joint_name] = Vector3.ZERO
	return j


func _mesh(parent: Node3D, mesh: Mesh, mat: Variant, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat if mat is Material else Mats.get_mat(String(mat))
	mi.position = pos
	parent.add_child(mi)
	meshes.append(mi)
	return mi


## Ajoute une pièce (accessoire, prothèse…) à une articulation.
func attach_mesh(joint_name: String, mesh: Mesh, mat: Variant, pos: Vector3, rot: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := _mesh(joints[joint_name], mesh, mat, pos)
	mi.rotation = rot
	return mi


func _box(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b


func _capsule(radius: float, height: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = radius
	c.height = maxf(height, radius * 2.0 + 0.01)
	c.radial_segments = 10
	c.rings = 4
	return c


## Fixe l'angle cible d'une articulation (radians, ordre d'Euler par défaut).
func pose(joint_name: String, euler: Vector3) -> void:
	targets[joint_name] = euler


## Remet toutes les cibles à zéro (hors voûte du dos).
func reset_pose() -> void:
	for j in targets:
		targets[j] = Vector3.ZERO
	var hunch: float = cfg.get("hunch", 0.0)
	if hunch != 0.0:
		targets["spine"] = Vector3(-hunch * 0.5, 0, 0)
		targets["chest"] = Vector3(-hunch * 0.5, 0, 0)
		targets["neck"] = Vector3(hunch * 0.6, 0, 0)


func apply(delta: float, speed_mult: float = 1.0) -> void:
	var k := 1.0 - exp(-smoothing * speed_mult * delta)
	for j in targets:
		var node: Node3D = joints[j]
		node.rotation = node.rotation.lerp(targets[j], k)


## Applique immédiatement les cibles (sans interpolation).
func snap() -> void:
	for j in targets:
		joints[j].rotation = targets[j]


func set_render_layers(mask: int) -> void:
	for m in meshes:
		m.layers = mask


func set_cast_shadows(on: bool) -> void:
	for m in meshes:
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if on else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


func set_material_override(mat: Material) -> void:
	for m in meshes:
		m.material_override = mat


func joint(joint_name: String) -> Node3D:
	return joints.get(joint_name)


## Cycle de marche générique : phase en radians, amplitude 0..1.
func walk_cycle(phase: float, amp: float, arm_amp: float = 1.0, knee_amp: float = 1.0) -> void:
	var s := sin(phase)
	var c := cos(phase)
	pose("hip_l", Vector3(s * 0.55 * amp, 0, 0))
	pose("hip_r", Vector3(-s * 0.55 * amp, 0, 0))
	pose("knee_l", Vector3(-maxf(0.0, -c) * 0.9 * amp * knee_amp - 0.05, 0, 0))
	pose("knee_r", Vector3(-maxf(0.0, c) * 0.9 * amp * knee_amp - 0.05, 0, 0))
	pose("ankle_l", Vector3(maxf(0.0, s) * 0.3 * amp, 0, 0))
	pose("ankle_r", Vector3(maxf(0.0, -s) * 0.3 * amp, 0, 0))
	pose("shoulder_l", Vector3(-s * 0.45 * amp * arm_amp, 0, -0.08))
	pose("shoulder_r", Vector3(s * 0.45 * amp * arm_amp, 0, 0.08))
	pose("elbow_l", Vector3(0.25 + maxf(0.0, s) * 0.4 * amp * arm_amp, 0, 0))
	pose("elbow_r", Vector3(0.25 + maxf(0.0, -s) * 0.4 * amp * arm_amp, 0, 0))

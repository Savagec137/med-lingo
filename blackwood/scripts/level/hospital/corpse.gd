class_name Corpse
extends Node3D
## Cadavre figé : le modèle réaliste (Higgsfield) posé une fois pour toutes
## (sur le dos, face contre terre, adossé à un mur, recroquevillé).

var kind := "back"
var look := {}
var body_height := 1.0
var rig: HumanoidRig


func _ready() -> void:
	rig = HumanoidRig.new()
	rig.name = "Rig"
	add_child(rig)
	var flesh := Mats.flesh(Color(0.48, 0.45, 0.41), 0.5)
	rig.build({"height": body_height, "bulk": 0.88, "hair": false, "torso_shape": "gown", "mat_torso": "gown",
		"mat_skin": flesh, "mat_hands": flesh, "mat_arms": flesh, "mat_legs": "cloth_jeans", "mat_feet": "leather_boots"})
	_pose()
	rig.snap()
	if SkinnedBody.available():
		for m in rig.meshes:
			m.visible = false
		var skin := SkinnedBody.new()
		skin.name = "Skin"
		rig.add_child(skin)
		var l := {"blood": 0.85, "pallor": 0.45, "wet": 0.2}
		l.merge(look, true)
		l["scale"] = float(l.get("scale", 1.0)) * body_height / 0.946
		skin.setup(rig, l)
		skin.update_pose(true)
		skin.set_process(false)
	rig.set_process(false)


func _pose() -> void:
	rig.reset_pose()
	match kind:
		"back":
			rig.rotation.x = PI / 2.0 - 0.06
			rig.position.y = 0.16
			rig.pose("shoulder_l", Vector3(0.3, 0, -1.2))
			rig.pose("shoulder_r", Vector3(0.1, 0, 0.9))
			rig.pose("elbow_l", Vector3(0.6, 0, 0))
			rig.pose("knee_l", Vector3(-0.5, 0, 0))
			rig.pose("hip_l", Vector3(0.3, 0, -0.1))
			rig.pose("head", Vector3(0.2, 0.9, 0))
		"face":
			rig.rotation.x = -PI / 2.0 + 0.05
			rig.position.y = 0.2
			rig.pose("shoulder_l", Vector3(2.4, 0, -0.4))
			rig.pose("shoulder_r", Vector3(0.2, 0, 0.3))
			rig.pose("elbow_l", Vector3(0.8, 0, 0))
			rig.pose("hip_r", Vector3(0.4, 0, 0.1))
			rig.pose("knee_r", Vector3(-0.8, 0, 0))
			rig.pose("head", Vector3(0, 1.1, 0))
		"sit":
			# Adossé à un mur (le mur est derrière, côté +Z local)
			rig.position.y = -rig.base_hips_height + 0.13
			rig.pose("hip_l", Vector3(1.45, 0, -0.12))
			rig.pose("hip_r", Vector3(1.3, 0, 0.15))
			rig.pose("knee_l", Vector3(-0.25, 0, 0))
			rig.pose("knee_r", Vector3(-0.7, 0, 0))
			rig.pose("spine", Vector3(0.18, 0, 0.1))
			rig.pose("chest", Vector3(0.1, 0, 0))
			rig.pose("head", Vector3(-0.7, 0.3, 0.3))
			rig.pose("shoulder_l", Vector3(0.1, 0, -0.25))
			rig.pose("shoulder_r", Vector3(0.35, 0, 0.3))
			rig.pose("elbow_r", Vector3(0.9, 0, 0))
		"curl":
			rig.rotation.z = PI / 2.0 - 0.08
			rig.position.y = 0.18
			rig.pose("hip_l", Vector3(1.2, 0, 0))
			rig.pose("hip_r", Vector3(1.0, 0, 0))
			rig.pose("knee_l", Vector3(-1.6, 0, 0))
			rig.pose("knee_r", Vector3(-1.4, 0, 0))
			rig.pose("spine", Vector3(-0.4, 0, 0))
			rig.pose("shoulder_l", Vector3(1.2, 0, 0))
			rig.pose("shoulder_r", Vector3(1.4, 0, 0))
			rig.pose("elbow_l", Vector3(1.5, 0, 0))
			rig.pose("elbow_r", Vector3(1.3, 0, 0))
			rig.pose("head", Vector3(-0.5, 0, 0))
		"float":
			# Suspendu dans une cuve
			rig.pose("shoulder_l", Vector3(0.3, 0, -0.5))
			rig.pose("shoulder_r", Vector3(0.25, 0, 0.55))
			rig.pose("elbow_l", Vector3(0.4, 0, 0))
			rig.pose("elbow_r", Vector3(0.5, 0, 0))
			rig.pose("head", Vector3(-0.35, 0, 0.1))
			rig.pose("knee_l", Vector3(-0.2, 0, 0))
			rig.pose("hip_r", Vector3(0.15, 0, 0))

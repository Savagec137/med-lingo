extends Node3D
## Test d'endurance physique : fait tomber N fois le carton des archives
## (seul RigidBody3D du jeu) sur la vraie géométrie du niveau.
## Usage : godot --headless --fixed-fps 60 --path . res://tests/box_stress.tscn

const ROUNDS := 150

var facility: Facility


func _ready() -> void:
	facility = Facility.new()
	add_child(facility)
	facility.build()
	_run()


func _run() -> void:
	var box: RigidBody3D = facility.nodes["falling_box"]
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var fell := 0
	for i in ROUNDS:
		box.freeze = true
		box.global_position = Vector3(-19.2 + rng.randf_range(-0.3, 0.3), 2.3, -9.4 + rng.randf_range(-0.1, 0.1))
		box.rotation = Vector3.ZERO
		box.linear_velocity = Vector3.ZERO
		box.angular_velocity = Vector3.ZERO
		await get_tree().physics_frame
		EventDirector.push_box(box)
		for f in 150:
			await get_tree().physics_frame
		if box.global_position.y < 0.6:
			fell += 1
		if i % 25 == 0:
			print("tour %d : carton en %s (endormi : %s)" % [i, box.global_position.snapped(Vector3.ONE * 0.01), box.sleeping])
	print("Endurance terminée : %d essais sans plantage, %d chutes jusqu'au sol." % [ROUNDS, fell])
	get_tree().quit(0)

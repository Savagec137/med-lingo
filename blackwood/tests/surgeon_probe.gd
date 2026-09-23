extends Node
## Sonde : le Chirurgien sort-il du bloc opératoire ? Reprend le point de
## passage « chirurgien », place Thomas dans le couloir, réveille le boss et
## trace sa position. Code de sortie 0 s'il atteint le couloir en 12 s.
## Usage : godot --headless --fixed-fps 60 --path . -- --test=surgeon_probe [--px=7.2]


func _ready() -> void:
	_run()


func _run() -> void:
	var px := 7.2
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--px="):
			px = float(a.substr(5))
	await get_tree().create_timer(0.5).timeout
	var f := FileAccess.open("user://bot_checkpoints/chirurgien.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(f.get_as_text())
	get_parent().call("load_data", data)
	for i in 600:
		await get_tree().process_frame
		if GameState.game and GameState.player:
			break
	var game: Game = GameState.game
	await get_tree().create_timer(1.0).timeout
	var player := GameState.player as Player
	player.place(Vector3(px, 12.05, -13.7), 0.0)
	var boss := game.enemies.get("f3_surgeon") as Surgeon
	game.events.call("_open_or_door", false)
	boss.activate()
	var t := 0.0
	var out := false
	while t < 12.0:
		var cols := []
		for i in boss.get_slide_collision_count():
			var c := boss.get_slide_collision(i)
			var n := c.get_collider() as Node
			cols.append("%s" % (n.name if n else "?"))
		print("t=%.1f %s pos=%s path=%d/%d cols=%s" % [t, boss.debug_state(), boss.global_position.snapped(Vector3.ONE * 0.01),
			boss._path_i, boss._path.size(), cols])
		if boss.global_position.z < -12.5:
			out = true
			break
		await get_tree().create_timer(0.5).timeout
		t += 0.5
	print("SORTI : %s en %.1f s" % [out, t])
	get_parent().call("quit_game", 0 if out else 1)

extends Node
## Sonde de débogage : reprend un point de passage du robot et trace une créature.
## Usage : -- --test=debug_probe --from=CHAPITRE --enemy=ID [--secs=N]

var enemy_id := "f3_surgeon"
var secs := 20.0
var chapter := "chirurgien"


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--enemy="):
			enemy_id = a.substr(8)
		elif a.begins_with("--secs="):
			secs = float(a.substr(7))
		elif a.begins_with("--from="):
			chapter = a.substr(7)
	_run()


func _run() -> void:
	await get_tree().create_timer(0.5).timeout
	var f := FileAccess.open("user://bot_checkpoints/%s.json" % chapter, FileAccess.READ)
	var data: Dictionary = JSON.parse_string(f.get_as_text())
	get_parent().call("load_data", data)
	for i in 600:
		await get_tree().process_frame
		if GameState.game and GameState.player:
			break
	var game: Game = GameState.game
	await get_tree().create_timer(1.0).timeout
	var t := 0.0
	while t < secs:
		var e: Enemy = game.enemies.get(enemy_id)
		if e:
			var cols := []
			for i in e.get_slide_collision_count():
				var c := e.get_slide_collision(i)
				cols.append("%s n=%s" % [(c.get_collider() as Node).name if c.get_collider() else "?", c.get_normal().snapped(Vector3.ONE * 0.01)])
			var nxt: Variant = e._path[e._path_i] if e._path_i < e._path.size() else null
			print("t=%.1f %s pos=%s vel=%s path=%d/%d next=%s goal=%s tgt=%s phys=%s cols=%s" % [t, e.debug_state(), e.global_position.snapped(Vector3.ONE * 0.01),
				e.velocity.snapped(Vector3.ONE * 0.01), e._path_i, e._path.size(), nxt, e._path_goal, e.target_pos.snapped(Vector3.ONE * 0.1),
				e.is_physics_processing(), cols])
		await get_tree().create_timer(0.5).timeout
		t += 0.5
	get_tree().quit()

extends Node
## Captures de contrôle visuel dans une vraie partie (pluie, reflets des objets
## à ramasser, applique de la rampe, ambulance du quai, accueil, rue) : démarre
## une partie, attend la fin de l'introduction, place Thomas à des points de vue
## et enregistre une capture par vue.
## Usage (affichage requis) :
##   xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --resolution 1280x720 \
##     -- --test=visual_check --shots=<dossier>

## [nom, position de Thomas, cap (0 : vers -Z), inclinaison caméra]
const VIEWS := [
	["rue", Vector3(-4.6, 0.15, 25.0), PI * 0.85, -0.02],
	["rue_arbres", Vector3(-28.0, 0.15, 30.0), PI * 0.5, 0.05],
	["rampe_haut", Vector3(38.0, 0.15, 23.5), 0.0, -0.18],
	["rampe_applique", Vector3(37.6, -1.6, 12.0), 0.25, -0.12],
	["quai_ambulance", Vector3(35.0, -3.9, -8.0), -PI * 0.5, -0.1],
	["accueil", Vector3(29.5, -3.9, -5.2), 0.5, -0.22],
]

var game: Game
var shots_dir := ""


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			shots_dir = a.substr(8)
	_run()


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


func _run() -> void:
	var ui := get_parent().get("ui") as UIRoot
	for i in 600:
		await _frames(1)
		if ui and ui.top_screen() is MainMenu:
			break
	var ev := InputEventKey.new()
	ev.keycode = KEY_ENTER
	ev.physical_keycode = KEY_ENTER
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(2)
	var up := ev.duplicate()
	up.pressed = false
	Input.parse_input_event(up)
	for i in 3000:
		await _frames(1)
		if GameState.player and GameState.get_flag("intro_done"):
			break
	game = GameState.game as Game
	var player := GameState.player as Player
	if game == null or player == null:
		print("ÉCHEC : la partie n'a pas démarré")
		get_tree().quit(1)
		return
	game.camera_rig.accept_uncaptured = true
	DebugTools.god_mode = true
	for v in VIEWS:
		player.place(v[1], float(v[2]))
		game.facility.set_active_floor(Facility.floor_at((v[1] as Vector3).y + 0.2))
		game.zones.force_refresh()
		game.camera_rig.yaw = float(v[2])
		game.camera_rig.pitch = float(v[3])
		await _frames(40)
		if shots_dir != "" and DisplayServer.get_name() != "headless":
			var img := get_viewport().get_texture().get_image()
			img.save_png("%s/%s.png" % [shots_dir, v[0]])
		print("vue %s (zone %s, %d ips)" % [v[0], GameState.current_zone, Engine.get_frames_per_second()])
	print("Contrôle visuel terminé.")
	get_tree().quit(0)

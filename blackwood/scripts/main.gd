extends Node
## Point d'entrée : menu principal ↔ partie, chargement, mort / RETRY, fin.
##
## Arguments utiles (après « -- ») :
##   --new-game      démarre directement une nouvelle partie
##   --load=N        charge l'emplacement N (0 = sauvegarde automatique)
##   --autoplay      lance le test automatisé de la campagne complète
##   --test=NOM      lance le robot de test res://tests/NOM.gd (ex. ui_flows)
##   --shots=DOSSIER captures d'écran des tests
##
## Coopération : l'hôte lance ou charge une partie comme en solo, avec une
## session réseau ouverte (Net) ; l'invité reçoit l'état complet de la partie
## (Net.snapshot_received) et la reconstruit ici.

var ui: UIRoot
var world: Node3D
var game: Game
var backdrop: MenuBackdrop
var _busy := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Fermeture de la fenêtre : on passe par quit_game() pour couper les sons.
	get_tree().auto_accept_quit = false
	world = Node3D.new()
	world.name = "World"
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(world)
	ui = UIRoot.new()
	ui.name = "UI"
	add_child(ui)
	ui.new_game_requested.connect(start_new_game)
	ui.load_requested.connect(load_game)
	ui.retry_requested.connect(retry)
	ui.quit_to_menu_requested.connect(quit_to_menu)
	ui.quit_requested.connect(quit_game)
	Net.snapshot_received.connect(load_coop)
	var args := OS.get_cmdline_user_args()
	var test := "autoplay" if "--autoplay" in args else ""
	for a in args:
		if a.begins_with("--load="):
			load_game(int(a.substr(7)))
			return
		if a.begins_with("--test="):
			test = a.substr(7)
	if "--new-game" in args:
		start_new_game()
		return
	show_menu()
	if test != "":
		# Les robots de test partent du menu principal, comme un joueur.
		var bot_script: GDScript = load("res://tests/%s.gd" % test)
		if bot_script == null or not bot_script.can_instantiate():
			push_error("Test « %s » : script invalide." % test)
			get_tree().quit(2)
			return
		var bot: Node = bot_script.new()
		bot.name = "TestBot"
		add_child(bot)


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		quit_game()


## Quitte proprement : les sons encore en lecture sont arrêtés d'abord, sinon
## Godot les signale comme des fuites dans la console en sortant.
func quit_game(code: int = 0) -> void:
	# Coop : on prévient l'autre machine tout de suite (sinon délai d'ENet)
	if Net.active:
		Net.leave()
	for type in ["AudioStreamPlayer", "AudioStreamPlayer3D"]:
		for n in get_tree().root.find_children("*", type, true, false):
			n.stop()
			n.stream = null
	await get_tree().process_frame
	# Laisse au fil audio le temps de libérer les lectures arrêtées (temps réel).
	OS.delay_msec(80)
	await get_tree().process_frame
	get_tree().quit(code)


func show_menu() -> void:
	_clear_world()
	backdrop = MenuBackdrop.new()
	world.add_child(backdrop)
	ui.show_main_menu()
	Audio.set_muffled(false)
	Audio.stop_all_loops(1.0)
	Audio.play_music("music_menu", 0.75, 2.5)
	Audio.set_loop("amb_rain", 0.45, 2.0)
	Audio.set_loop("amb_wind", 0.3, 2.0)
	ui.fade_from_black(1.5)


func start_new_game() -> void:
	if _busy:
		return
	_busy = true
	await _transition()
	GameState.reset()
	_start_game({})
	_busy = false


func load_game(slot: int) -> void:
	var data := SaveSystem.load_slot(slot)
	if data.is_empty():
		GameState.show_message("Sauvegarde introuvable.", 2.5)
		return
	load_data(data)


## Reprend une partie à partir de données de sauvegarde (emplacement ou test).
func load_data(data: Dictionary) -> void:
	if _busy:
		return
	_busy = true
	await _transition()
	GameState.from_dict(data.get("state", {}))
	_start_game(data)
	_busy = false


## Invité : l'hôte envoie la partie (arrivée, reconnexion, RETRY de l'hôte).
func load_coop(data: Dictionary) -> void:
	if _busy:
		await get_tree().create_timer(0.8, true).timeout
		if _busy:
			return
	_busy = true
	await _transition()
	GameState.from_dict(data.get("state", {}))
	var info: Dictionary = data.get("coop", {})
	GameState.local_slot = int(info.get("slot", 2))
	GameState.bind_local()
	Net.friendly_fire = bool(info.get("friendly_fire", false))
	_start_game(data)
	_busy = false


func retry() -> void:
	# Coop : seul l'hôte relance (l'invité recharge avec lui)
	if Net.is_client():
		return
	if SaveSystem.has_slot(0):
		load_game(0)
	else:
		start_new_game()


func quit_to_menu() -> void:
	if _busy:
		return
	_busy = true
	if Net.active:
		Net.leave()
	await _transition()
	show_menu()
	_busy = false


func _transition() -> void:
	ui.fade_to_black(0.6)
	await get_tree().create_timer(0.65, true).timeout


func _start_game(data: Dictionary) -> void:
	_clear_world()
	Audio.stop_all_loops(0.3)
	Audio.set_muffled(false)
	ui.leave_game()
	game = Game.new()
	game.name = "Game"
	world.add_child(game)
	ui.enter_game()
	game.setup(data)


func _clear_world() -> void:
	get_tree().paused = false
	for c in world.get_children():
		world.remove_child(c)
		c.queue_free()
	game = null
	backdrop = null
	GameState.player = null
	GameState.game = null

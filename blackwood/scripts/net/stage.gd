class_name Stage
extends RefCounted
## Mise en scène du scénario : sons, musique, sous-titres, secousses, caméra de
## cinématique, barre de boss, fondus, effets du monde. Chaque appel est joué
## ici et, sur l'hôte d'une partie en coopération, rejoué à l'identique chez
## l'invité. Le scénario lui-même (déclencheurs, drapeaux, créatures) ne tourne
## que sur le serveur ; l'invité ne reçoit que ce qu'il doit voir et entendre.
##
## Les signatures des fonctions audio sont celles d'Audio (même ordre, mêmes
## valeurs par défaut).

static var _cutscene_cam: Camera3D
## Compte à rebours de l'autodestruction côté invité (resynchronisé par l'hôte).
static var client_countdown := -1.0


static func _send(method: String, args: Array) -> void:
	if Net.active and Net.is_server():
		var c := Coop.instance()
		if c:
			c.broadcast_stage(method, args)


static func _game() -> Game:
	return GameState.game as Game


# --- Son ----------------------------------------------------------------------

static func play_2d(sound_name: String, volume_db: float = 0.0, pitch: float = 1.0, bus: String = "SFX") -> void:
	Audio.play_2d(sound_name, volume_db, pitch, bus)
	_send("play_2d", [sound_name, volume_db, pitch, bus])


static func play_3d(sound_name: String, pos: Vector3, volume_db: float = 0.0, pitch_var: float = 0.06,
		max_distance: float = 40.0, unit_size: float = 5.0, pitch: float = 1.0) -> void:
	Audio.play_3d(sound_name, pos, volume_db, pitch_var, max_distance, unit_size, pitch)
	_send("play_3d", [sound_name, pos, volume_db, pitch_var, max_distance, unit_size, pitch])


static func set_loop(sound_name: String, volume: float, fade: float = 2.0, bus: String = "Ambience") -> void:
	Audio.set_loop(sound_name, volume, fade, bus)
	_send("set_loop", [sound_name, volume, fade, bus])


static func stop_all_loops(fade: float = 1.0) -> void:
	Audio.stop_all_loops(fade)
	_send("stop_all_loops", [fade])


static func play_music(sound_name: String, volume: float = 1.0, fade: float = 3.0) -> void:
	Audio.play_music(sound_name, volume, fade)
	_send("play_music", [sound_name, volume, fade])


# --- Écran ----------------------------------------------------------------------

static func subtitle(text: String, duration: float = 3.5) -> void:
	apply("subtitle", [text, duration])
	_send("subtitle", [text, duration])


## Message narratif pour tous les joueurs (les retours d'une interaction
## passent par GameState.show_message, qui vise le joueur qui agit).
static func message(text: String, duration: float = 3.0) -> void:
	apply("message", [text, duration])
	_send("message", [text, duration])


static func title_card(main: String, sub: String, duration: float) -> void:
	apply("title_card", [main, sub, duration])
	_send("title_card", [main, sub, duration])


static func fade_to_black(t: float) -> void:
	apply("fade_to_black", [t])
	_send("fade_to_black", [t])


static func fade_from_black(t: float) -> void:
	apply("fade_from_black", [t])
	_send("fade_from_black", [t])


static func set_black(alpha: float) -> void:
	apply("set_black", [alpha])
	_send("set_black", [alpha])


static func boss_bar(title: String, hp: float, max_hp: float) -> void:
	apply("boss_bar", [title, hp, max_hp])
	_send("boss_bar", [title, hp, max_hp])


static func boss_hp(hp: float, max_hp: float) -> void:
	apply("boss_hp", [hp, max_hp])
	_send("boss_hp", [hp, max_hp])


static func boss_hide() -> void:
	apply("boss_hide", [])
	_send("boss_hide", [])


static func countdown(t: float) -> void:
	apply("countdown", [t])
	_send("countdown", [t])


static func show_ending() -> void:
	apply("show_ending", [])
	_send("show_ending", [])


# --- Caméra, contrôle des joueurs --------------------------------------------------

## Cinématique : les deux joueurs sont immobilisés, bandes noires.
static func lock(on: bool) -> void:
	apply("lock", [on])
	_send("lock", [on])


static func shake(amount: float) -> void:
	apply("shake", [amount])
	_send("shake", [amount])


static func focus(point: Vector3, duration: float, strength: float = 1.0) -> void:
	apply("focus", [point, duration, strength])
	_send("focus", [point, duration, strength])


static func cutscene(from: Vector3, look: Vector3) -> void:
	apply("cutscene", [from, look])
	_send("cutscene", [from, look])


static func end_cutscene() -> void:
	apply("end_cutscene", [])
	_send("end_cutscene", [])


## Place le joueur de CHAQUE machine (fin de partie).
static func place_players(pos: Vector3, yaw: float) -> void:
	apply("place_players", [pos, yaw])
	_send("place_players", [pos, yaw])


# --- Monde ---------------------------------------------------------------------

static func dust(pos: Vector3, amount: int = 16, size: float = 0.35) -> void:
	apply("dust", [pos, amount, size])
	_send("dust", [pos, amount, size])


static func sparks(pos: Vector3, amount: int = 24) -> void:
	apply("sparks", [pos, amount])
	_send("sparks", [pos, amount])


## Appelle une méthode d'un nœud nommé du bâtiment (téléphone qui sonne,
## interrupteur…) ici et chez l'invité.
static func node_call(node_id: String, method: String, args: Array = []) -> void:
	apply("node_call", [node_id, method, args])
	_send("node_call", [node_id, method, args])


## Effet visuel du scénario (méthode « visual_* » de l'EventDirector : boule de
## feu, alerte d'étage, retour du courant, écran de la vidéo, lune…) ici et
## chez l'invité.
static func scene(method: String, args: Array = []) -> void:
	apply("scene", [method, args])
	_send("scene", [method, args])


# --- Exécution locale (ici, ou chez l'invité à réception) --------------------------------

static func apply(method: String, args: Array) -> void:
	var ui: UIRoot = GameState.ui as UIRoot
	var g := _game()
	match method:
		"play_2d":
			Audio.play_2d(args[0], args[1], args[2], args[3])
		"play_3d":
			Audio.play_3d(args[0], args[1], args[2], args[3], args[4], args[5], args[6])
		"set_loop":
			Audio.set_loop(args[0], args[1], args[2], args[3])
		"stop_all_loops":
			Audio.stop_all_loops(args[0])
		"play_music":
			Audio.play_music(args[0], args[1], args[2])
		"subtitle":
			if ui:
				ui.show_subtitle(args[0], args[1])
		"message":
			if ui:
				ui.show_message(args[0], args[1])
		"title_card":
			if ui:
				ui.show_title_card(args[0], args[1], args[2])
		"fade_to_black":
			if ui:
				ui.fade_to_black(args[0])
		"fade_from_black":
			if ui:
				ui.fade_from_black(args[0])
		"set_black":
			if ui:
				ui.set_black(args[0])
		"boss_bar":
			if ui:
				ui.show_boss_bar(args[0], args[1], args[2])
		"boss_hp":
			if ui:
				ui.update_boss_bar(args[0], args[1])
		"boss_hide":
			if ui:
				ui.hide_boss_bar()
		"countdown":
			client_countdown = float(args[0])
			if ui:
				ui.set_countdown(args[0])
		"show_ending":
			if ui:
				ui.show_ending()
		"lock":
			if g and g.events:
				g.events.lock_player(args[0])
		"shake":
			if g and g.camera_rig:
				g.camera_rig.shake(args[0])
		"focus":
			if g and g.camera_rig:
				g.camera_rig.focus_on(args[0], args[1], args[2])
		"cutscene":
			if g:
				if is_instance_valid(_cutscene_cam):
					_cutscene_cam.queue_free()
				var cam := Camera3D.new()
				cam.fov = 55.0
				cam.far = 400.0
				g.add_child(cam)
				cam.global_position = args[0]
				cam.look_at(args[1], Vector3.UP)
				cam.make_current()
				_cutscene_cam = cam
		"end_cutscene":
			if g and g.camera_rig:
				g.camera_rig.cam.make_current()
			if is_instance_valid(_cutscene_cam):
				_cutscene_cam.queue_free()
			_cutscene_cam = null
		"place_players":
			if g and g.player:
				g.player.controls_enabled = false
				g.player.velocity = Vector3.ZERO
				# Deux joueurs : côte à côte
				var side := Basis(Vector3.UP, float(args[1])) * Vector3.RIGHT * 1.1 * float(GameState.local_slot - 1)
				g.player.place(args[0] + side, args[1])
		"dust":
			if g:
				FX.dust(g, args[0], args[1], args[2])
		"sparks":
			if g:
				FX.sparks(g, args[0], args[1])
		"node_call":
			if g and g.facility:
				var n: Object = g.facility.nodes.get(String(args[0]))
				if n and is_instance_valid(n) and n.has_method(String(args[1])):
					n.callv(String(args[1]), args[2])
		"scene":
			if g and g.events and g.events.has_method(String(args[0])):
				g.events.callv(String(args[0]), args[1])

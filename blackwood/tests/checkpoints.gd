extends Node
## Recharge chaque sauvegarde automatique conservée par --autoplay
## (user://test_checkpoints) et vérifie que le monde est bien restauré :
## position, inventaire, drapeaux, portes, créatures abattues, zone.
## Usage : lancer d'abord --autoplay, puis
##   godot --headless --fixed-fps 60 --path . -- --test=checkpoints

const DIR := "user://test_checkpoints"

var main: Node
var ui: UIRoot
var t0 := 0
var failures := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	t0 = Time.get_ticks_msec()
	_run()


func _log(msg: String) -> void:
	print("[%5.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, msg])


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


func _secs(s: float) -> void:
	await _frames(int(s * 60.0))


func _check(cond: bool, what: String) -> void:
	if not cond:
		failures += 1
		_log("    ÉCHEC : " + what)


func _run() -> void:
	main = get_parent()
	ui = main.get("ui") as UIRoot
	for i in 300:
		await _frames(1)
		if ui.top_screen() is MainMenu:
			break
	var files := Array(DirAccess.get_files_at(DIR))
	files.sort()
	if files.is_empty():
		_log("ÉCHEC : aucun point de passage — lancer d'abord --autoplay.")
		main.quit_game(1)
		return
	for fname in files:
		var data: Variant = JSON.parse_string(FileAccess.get_file_as_string("%s/%s" % [DIR, fname]))
		if typeof(data) != TYPE_DICTIONARY:
			_check(false, "%s illisible" % fname)
			continue
		await _verify(fname, data)
	_log("%d points de passage rechargés, %d anomalie(s)." % [files.size(), failures])
	main.quit_game(0 if failures == 0 else 1)


func _verify(fname: String, data: Dictionary) -> void:
	var st: Dictionary = data.get("state", {})
	_log("── %s : « %s » (zone %s, %d PV)" % [fname, data.get("checkpoint_step", "?"), st.get("current_zone", "?"), int(st.get("hp", 0))])
	main.load_data(data)
	var ok := false
	for i in 1800:
		await _frames(1)
		var p := GameState.player as Player
		if GameState.game != null and p != null and p.controls_enabled and not get_tree().paused and ui.top_screen() == null:
			ok = true
			break
	_check(ok, "la partie ne reprend pas (contrôles, pause ou écran ouvert)")
	if not ok:
		return
	await _secs(2.0)
	var game := GameState.game as Game
	var p := GameState.player as Player
	var saved: Array = data.get("player", {}).get("pos", [0, 0, 0])
	var spos := Vector3(float(saved[0]), float(saved[1]), float(saved[2]))
	_check(p.global_position.distance_to(spos) < 1.0, "position %s au lieu de %s" % [p.global_position, spos])
	_check(not p.is_dead, "Thomas meurt juste après le chargement")
	_check(is_equal_approx(GameState.hp, float(st.get("hp", 100.0))) or GameState.hp < float(st.get("hp", 100.0)), "PV incohérents")
	_check(GameState.current_zone == String(st.get("current_zone", "")), "zone %s au lieu de %s" % [GameState.current_zone, st.get("current_zone", "")])
	var inv: Array = st.get("inventory", [])
	for i in inv.size():
		var a: Dictionary = inv[i]
		var b: Dictionary = GameState.inventory[i]
		_check(String(a.get("id", "")) == String(b.get("id", "")) and int(a.get("count", 0)) == int(b.get("count", 0)),
			"inventaire case %d : %s au lieu de %s" % [i, b, a])
	for flag in st.get("flags", {}):
		_check(GameState.get_flag(flag) != null and GameState.flags.has(flag), "drapeau perdu : %s" % flag)
	var doors: Dictionary = st.get("door_states", {})
	for id in doors:
		var d := game.facility.doors.get(id) as Door
		if d == null:
			_check(false, "porte inconnue %s" % id)
			continue
		var want: Dictionary = doors[id]
		_check(int(want.get("lock", d.lock)) == d.lock, "porte %s : verrou %d au lieu de %d" % [id, d.lock, int(want.get("lock", -1))])
		_check(bool(want.get("open", false)) == d.is_open, "porte %s : ouverte=%s au lieu de %s" % [id, d.is_open, want.get("open", false)])
	for id in st.get("dead_enemies", {}):
		var e := game.enemies.get(id) as Enemy
		_check(e == null or e.is_dead(), "créature %s revenue à la vie" % id)
	var near := ""
	for id in game.enemies:
		var e := game.enemies[id] as Enemy
		if e and not e.is_dead() and e.global_position.distance_to(p.global_position) < 4.0:
			near += "%s (%.1f m, %s) " % [id, e.global_position.distance_to(p.global_position), Enemy.STATE_NAMES[e.state]]
	var taken: Dictionary = st.get("taken_pickups", {})
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is Pickup and taken.has((n as Pickup).pickup_id):
			_check(not (n as Pickup).can_interact(), "objet déjà ramassé présent : %s" % (n as Pickup).pickup_id)
	_log("    OK : %s · objectif : %s%s" % [p.global_position.snapped(Vector3.ONE * 0.1), GameState.objective(),
		("  · créature proche : " + near) if near != "" else ""])

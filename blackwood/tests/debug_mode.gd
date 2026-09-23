extends Node
## Test du mode DEBUG et épreuve des créatures.
## 1. La console (F1) ne s'ouvre qu'en mode DEBUG ; chaque commande est tapée
##    au clavier comme un joueur (god, ammo, weapon, tp, spawn, ai, killall,
##    light) et son effet est vérifié dans le jeu.
## 2. Chaque type de créature apparaît devant Thomas : elle doit le repérer,
##    l'attaquer (il perd des PV), puis mourir sous les balles.
## Usage : godot --headless --fixed-fps 60 --path . -- --test=debug_mode

var game: Game
var player: Player
var ui: UIRoot
var failures := 0
var t0 := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	t0 = Time.get_ticks_msec()
	_run()


func _log(msg: String) -> void:
	print("[%6.1fs] %s" % [(Time.get_ticks_msec() - t0) / 1000.0, msg])


func _check(cond: bool, what: String) -> bool:
	if cond:
		_log("OK  " + what)
	else:
		failures += 1
		_log("ÉCHEC  " + what)
	return cond


func _frames(k: int) -> void:
	for i in k:
		await get_tree().process_frame


func _secs(s: float) -> void:
	await _frames(int(s * 60.0))


func key(code: int, unicode: int = 0) -> void:
	var ev := InputEventKey.new()
	ev.physical_keycode = code
	ev.keycode = code
	ev.unicode = unicode
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(2)
	var up := ev.duplicate()
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(2)


## Tape une commande dans la console ouverte, puis Entrée.
func type_command(text: String) -> String:
	var le := ui.debug_console.input
	le.grab_focus()
	for ch in text:
		var ev := InputEventKey.new()
		ev.unicode = ch.unicode_at(0)
		ev.keycode = OS.find_keycode_from_string(ch.to_upper()) if ch != " " else KEY_SPACE
		ev.pressed = true
		Input.parse_input_event(ev)
		await _frames(1)
		var up := ev.duplicate()
		up.pressed = false
		Input.parse_input_event(up)
		await _frames(1)
	await key(KEY_ENTER)
	await _frames(4)
	var out := ui.debug_console.output.text
	out = out.substr(out.rfind("> "))
	_log("    console « %s » → %s" % [text, out.replace("\n", " | ")])
	return out


func _run() -> void:
	ui = get_parent().get("ui") as UIRoot
	for i in 300:
		await _frames(1)
		if ui.top_screen() is MainMenu:
			break
	await key(KEY_ENTER)
	for i in 900:
		await _frames(1)
		if GameState.player and GameState.get_flag("intro_done"):
			break
	await _secs(1.0)
	game = GameState.game as Game
	player = GameState.player as Player
	game.camera_rig.accept_uncaptured = true

	# --- Console : fermée hors mode DEBUG, ouverte en mode DEBUG
	Settings.debug_mode = false
	await key(KEY_F1)
	_check(ui.top_screen() == null, "F1 sans mode DEBUG : pas de console")
	Settings.debug_mode = true
	await key(KEY_F1)
	if not _check(ui.top_screen() == ui.debug_console, "F1 en mode DEBUG : la console s'ouvre"):
		_finish()
		return

	var out := await type_command("god")
	_check(DebugTools.god_mode and "activé" in out, "god : God Mode actif")
	out = await type_command("weapon all")
	_check(GameState.weapons.size() == 5, "weapon all : les cinq armes (%s)" % str(GameState.weapons.keys()))
	out = await type_command("ammo")
	_check(GameState.count_item("ammo_9mm") >= 60 and GameState.weapon_mag("magnum") == 6, "ammo : munitions et chargeurs pleins")
	out = await type_command("tp 0")
	_check(Facility.floor_at(player.global_position.y + 0.2) == 0, "tp 0 : Thomas au rez-de-chaussée (%s)" % player.global_position.snapped(Vector3.ONE * 0.1))
	out = await type_command("light")
	_check(DebugTools.work_light, "light : éclairage de travail")
	out = await type_command("light")
	await key(KEY_F1)
	_check(ui.top_screen() == null, "F1 referme la console")

	# God Mode : un coup ne fait rien
	var hp0 := GameState.hp
	player.take_damage(30.0, player.global_position + Vector3.FORWARD)
	_check(is_equal_approx(GameState.hp, hp0), "God Mode : aucun dégât subi")

	# IA figée puis relancée
	player.place(Vector3(0, 0.1, -6.0), 0.0)
	await _secs(0.5)
	await key(KEY_F1)
	out = await type_command("spawn patient")
	var e := _last_spawn()
	out = await type_command("ai")
	await key(KEY_F1)
	if _check(e != null, "spawn patient : créature apparue"):
		var p0 := e.global_position
		await _secs(2.0)
		_check(e.global_position.distance_to(p0) < 0.05, "ai : IA figée, la créature ne bouge plus")
	await key(KEY_F1)
	out = await type_command("ai")
	out = await type_command("killall")
	await key(KEY_F1)
	_check(e == null or e.is_dead(), "killall : la créature meurt")
	# Overlay F3 : infos de débogage
	await key(KEY_F3)
	await _secs(0.5)
	var overlay: Label = null
	for n in ui.root.get_children():
		if n is PerfOverlay:
			overlay = n
	_check(overlay != null and overlay.visible and "créatures vivantes" in overlay.text and "zone" in overlay.text,
		"F3 : FPS, position, zone, créatures affichés")
	await key(KEY_F3)

	# --- Lampe torche : paliers 100/75/50/25/10/0 et piles
	await _battery_checks()

	# --- Épreuve des créatures (God Mode coupé : il faut que les coups portent)
	await key(KEY_F1)
	await type_command("god")
	await key(KEY_F1)
	_check(not DebugTools.god_mode, "god : God Mode coupé pour l'épreuve")
	for kind in DebugTools.SPAWN_TYPES:
		await _trial(String(kind))
	_finish()


func _battery_checks() -> void:
	var fl := player.flashlight
	GameState.set_flag("has_flashlight", true)
	player._update_equipment_visibility()
	fl.set_on(true)
	var expected := {100.0: 100, 70.0: 75, 45.0: 50, 20.0: 25, 8.0: 10, 0.0: 0}
	var ok := true
	for b in expected:
		ok = ok and Flashlight.battery_level(float(b)) == int(expected[b])
	_check(ok, "lampe : paliers 100/75/50/25/10/0")
	var ranges: Array[float] = []
	for b in [100.0, 70.0, 45.0, 20.0, 8.0]:
		GameState.flashlight_battery = b
		await _frames(3)
		ranges.append(fl.spot.spot_range)
	var decreasing := true
	for i in range(1, ranges.size()):
		decreasing = decreasing and ranges[i] < ranges[i - 1]
	_check(decreasing, "lampe : portée qui baisse à chaque palier (%s)" % str(ranges))
	var hud := ui.hud
	GameState.flashlight_battery = 10.05
	await _secs(1.2)
	_check("10 %" in ui.message_label.text and hud.battery_pct.text == "10 %", "lampe : avertissement à 10 %% (« %s »)" % ui.message_label.text)
	GameState.flashlight_battery = 0.03
	await _secs(1.0)
	_check(not GameState.flashlight_on and not fl.spot.visible and hud.battery_pct.text == "VIDE", "lampe : s'éteint à 0 %, HUD « VIDE »")
	fl.set_on(true)
	await _frames(2)
	_check(not GameState.flashlight_on, "lampe : impossible de la rallumer sans piles")
	var pk := Pickup.new()
	pk.item_id = "battery"
	pk.pickup_id = "debug_battery"
	game.add_child(pk)
	pk.global_position = player.global_position + Vector3(0, 0.5, -0.5)
	await _frames(2)
	pk.interact(player)
	await _frames(2)
	fl.set_on(true)
	await _frames(3)
	_check(GameState.flashlight_battery > 99.0 and GameState.flashlight_on and hud.battery_pct.text == "100 %",
		"piles ramassées : batterie à 100 %%, lampe rallumée (batterie %.1f, allumée %s, HUD « %s »)" % [
			GameState.flashlight_battery, GameState.flashlight_on, hud.battery_pct.text])


func _last_spawn() -> Enemy:
	var best: Enemy = null
	var best_n := -1
	for id in game.enemies:
		if String(id).begins_with("debug_"):
			var n := int(String(id).substr(6))
			if n > best_n:
				best_n = n
				best = game.enemies[id]
	return best


## Une créature apparaît : elle doit repérer Thomas, le blesser, puis mourir.
func _trial(kind: String) -> void:
	GameState.set_hp(GameState.MAX_HP)
	player.place(Vector3(0, 0.1, -3.0), 0.0)
	await _secs(0.3)
	await key(KEY_F1)
	await type_command("spawn " + kind)
	await key(KEY_F1)
	var e := _last_spawn()
	if not _check(e != null, "%s : apparition" % kind):
		return
	var hp0 := GameState.hp
	var seen := false
	var hurt := false
	var t := 0.0
	while t < 25.0 and not hurt:
		# Veilleur et patient neurologique sont quasi aveugles : ils chassent au bruit
		if kind in ["veilleur", "neuro"]:
			GameState.emit_noise(player.global_position, 12.0, player)
		if e.state in [Enemy.State.CHASE, Enemy.State.ATTACK]:
			seen = true
		if GameState.hp < hp0:
			hurt = true
		await _secs(0.25)
		t += 0.25
	_check(seen, "%s : repère Thomas (état %s)" % [kind, e.ai_state_name()])
	_check(hurt, "%s : attaque et blesse Thomas (%d → %d PV)" % [kind, int(hp0), int(GameState.hp)])
	# Le Colossus ne meurt pas : on vérifie qu'il pose genou à terre
	if e is Colossus:
		var n := 0
		while float(e.get("_down_t")) <= 0.0 and n < 40:
			e.take_damage(60.0, e.global_position + Vector3.UP * 1.6, Vector3.FORWARD, false)
			n += 1
			await _frames(3)
		_check(float(e.get("_down_t")) > 0.0 and not e.is_dead(), "colossus : invulnérable mais à genoux après %d impacts" % n)
		await key(KEY_F1)
		await type_command("killall")
		await key(KEY_F1)
		return
	# Mort sous les balles (dégâts réels, tête et corps)
	var shots := 0
	while not e.is_dead() and shots < 400:
		if e.visible:
			e.take_damage(60.0, e.global_position + Vector3.UP * 1.4, Vector3.FORWARD, shots % 3 == 0)
		shots += 1
		await _frames(3)
	_check(e.is_dead() and GameState.dead_enemies.has(e.enemy_id), "%s : meurt après %d impacts" % [kind, shots])
	await _secs(1.0)


func _finish() -> void:
	_log("Mode DEBUG et créatures : %s (%d échec(s))." % ["tout est OK" if failures == 0 else "ÉCHECS", failures])
	var main := get_parent()
	main.call("quit_game", 0 if failures == 0 else 1)

extends Node3D
## Stand de tir : les cinq armes contre des infectés immobiles.
## Vérifie dégâts, rechargement, munitions et vue première personne ;
## en mode rendu, photographie chaque arme en main (--shots=DOSSIER).

var player: Player
var cam_rig: PlayerCamera
var shots_dir := ""
var failures := 0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shots="):
			shots_dir = a.substr(8)
	GameState.reset()
	var g := Geo.new(self)
	g.box("range", "floor_lino", Vector3(0, -0.1, -6), Vector3(10, 0.2, 20))
	g.box("range", "wall_hospital", Vector3(-5, 1.6, -6), Vector3(0.2, 3.2, 20))
	g.box("range", "wall_hospital", Vector3(5, 1.6, -6), Vector3(0.2, 3.2, 20))
	g.box("range", "wall_tile_white", Vector3(0, 1.6, -16), Vector3(10, 3.2, 0.2))
	g.box("range", "ceiling_tile", Vector3(0, 3.3, -6), Vector3(10, 0.2, 20))
	g.build()
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0, 0, 0)
	e.ambient_light_color = Color(0.3, 0.32, 0.35)
	e.ambient_light_energy = 0.4
	e.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.environment = e
	add_child(env)
	for z in [-2.0, -7.0, -12.0]:
		var l := OmniLight3D.new()
		l.position = Vector3(0, 3.0, z)
		l.omni_range = 7.0
		l.light_energy = 1.4
		l.shadow_enabled = true
		add_child(l)
	player = Player.new()
	add_child(player)
	cam_rig = PlayerCamera.new()
	cam_rig.setup(player, 0.0)
	add_child(cam_rig)
	player.attach_camera(cam_rig)
	player.place(Vector3(0, 0.05, 0), 0.0)
	cam_rig.make_current()
	cam_rig.accept_uncaptured = true
	cam_rig.set_first_person(true)
	for w in WeaponDB.ORDER:
		GameState.give_weapon(w)
	GameState.add_item("ammo_9mm", 60)
	GameState.add_item("ammo_shells", 10)
	GameState.add_item("ammo_magnum", 6)
	_run()


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _target(dist: float) -> Hollow:
	var h := Hollow.new()
	h.variant = "patient"
	add_child(h)
	h.global_position = Vector3(0, 0.0, -dist)
	h.set_physics_process(false)
	h.rig.rotation.y = 0.0
	return h


func _aim_at(p: Vector3) -> void:
	var from := cam_rig.cam.global_position
	var to := p - from
	cam_rig.yaw = atan2(-to.x, -to.z)
	cam_rig.pitch = atan2(to.y, Vector2(to.x, to.z).length())


func _fire_once() -> void:
	Input.action_press("fire")
	await _frames(2)
	Input.action_release("fire")
	await _frames(2)


func _action(name: String) -> void:
	var ev := InputEventAction.new()
	ev.action = name
	ev.pressed = true
	Input.parse_input_event(ev)
	await _frames(2)
	var up := InputEventAction.new()
	up.action = name
	up.pressed = false
	Input.parse_input_event(up)
	await _frames(2)


func _check(cond: bool, what: String) -> void:
	print(("OK   " if cond else "ÉCHEC ") + what)
	if not cond:
		failures += 1


func _run() -> void:
	await _frames(20)
	for w in WeaponDB.ORDER:
		player.weapons.equip(w)
		await _frames(30)
		var d := WeaponDB.get_weapon(w)
		var dist := 1.4 if w == "baton" else (4.0 if w == "shotgun" else 7.0)
		var t := _target(dist)
		await _frames(5)
		var hp0 := t.hp
		var shots := 0
		var mag0 := GameState.weapon_mag(w)
		while not t.is_dead() and shots < 40:
			_aim_at(t.rig.joint("chest").global_position)
			await _frames(1)
			if shots == 1 and shots_dir != "" and DisplayServer.get_name() != "headless":
				await RenderingServer.frame_post_draw
				get_viewport().get_texture().get_image().save_png("%s/fp_%s.png" % [shots_dir, w])
			if w == "smg":
				Input.action_press("fire")
				await _frames(8)
				Input.action_release("fire")
				await _frames(2)
			else:
				await _fire_once()
				await _frames(int(ceil(float(d.interval) * 60.0)) + 2)
			shots += 1
			if player.weapons.reloading:
				await _frames(int(float(d.get("reload", 1.0)) * 60.0) + 10)
		var used := mag0 - GameState.weapon_mag(w) if d.kind != "melee" else 0
		print("%-8s : cible à %.1f m, %s après %d pressions (PV %d → %d), chargeur %d → %d, dernier impact : %s" % [
			w, dist, "abattue" if t.is_dead() else "DEBOUT", shots, int(hp0), int(maxf(t.hp, 0)), mag0, GameState.weapon_mag(w), player.weapons.last_hit])
		_check(t.is_dead(), "%s abat une cible" % w)
		t.queue_free()
		await _frames(5)
	# Rechargement et munitions
	player.weapons.equip("pistol")
	await _frames(25)
	GameState.set_weapon_mag("pistol", 3)
	var reserve0 := GameState.count_item("ammo_9mm")
	await _action("reload")
	await _frames(130)
	_check(GameState.weapon_mag("pistol") == 12 and GameState.count_item("ammo_9mm") == reserve0 - 9, "rechargement du pistolet (12 balles, réserve -9)")
	player.weapons.equip("shotgun")
	await _frames(25)
	GameState.set_weapon_mag("shotgun", 2)
	await _action("reload")
	await _frames(240)
	_check(GameState.weapon_mag("shotgun") == 5, "fusil rechargé cartouche par cartouche (5)")
	# Changement d'arme au clavier et vue
	await _action("weapon_1")
	_check(GameState.equipped == "baton", "touche 1 → matraque")
	await _action("toggle_view")
	_check(not cam_rig.first_person, "V → troisième personne")
	if shots_dir != "" and DisplayServer.get_name() != "headless":
		player.weapons.equip("shotgun")
		await _frames(30)
		for i in 3:
			await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("%s/tp_shotgun.png" % shots_dir)
	Settings.set_value("camera_view", Settings.View.THIRD_PERSON)
	print("Stand de tir : %d anomalie(s)." % failures)
	get_tree().quit(0 if failures == 0 else 1)

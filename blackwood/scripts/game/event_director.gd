class_name EventDirector
extends Node
## Événements scriptés de la campagne. Chaque événement pose un drapeau pour
## ne jamais se rejouer (et reste cohérent après un chargement).
## Les jumpscares sont volontairement rares : la tension vient surtout de
## l'attente, du son et de l'obscurité.

var game: Node
var facility: Facility
var _ambient_t := 35.0
var _lightning_t := 20.0
var _alarm_on := false


func setup(p_game: Node, p_facility: Facility) -> void:
	game = p_game
	facility = p_facility
	for t in facility.triggers.values():
		(t as TriggerZone).triggered.connect(_on_trigger)
	GameState.flag_changed.connect(_on_flag)
	for b in facility.nodes.get("breakers", []):
		(b as BreakerPanel).triggered.connect(_on_breaker)


func _wait(t: float) -> void:
	await get_tree().create_timer(t, false).timeout


func _player() -> Player:
	return GameState.player as Player


func _say(text: String, duration: float = 3.5) -> void:
	if GameState.ui:
		GameState.ui.show_subtitle(text, duration)


func _lock(on: bool) -> void:
	var p := _player()
	if p:
		p.controls_enabled = not on
	if game.camera_rig:
		game.camera_rig.input_enabled = not on
	if GameState.ui:
		GameState.ui.set_letterbox(on)


func _focus(point: Vector3, duration: float, strength: float = 1.0) -> void:
	if game.camera_rig:
		game.camera_rig.focus_on(point, duration, strength)


func _shake(amount: float) -> void:
	if game.camera_rig:
		game.camera_rig.shake(amount)


# --- État du monde restauré au chargement ------------------------------------------

func apply_world_state() -> void:
	if GameState.get_flag("fuse_inserted"):
		_power_lab_wing(true)
		_lockdown_visuals()
	if GameState.get_flag("archives_event_done"):
		var box: RigidBody3D = facility.nodes.get("falling_box")
		if box:
			box.global_position = Vector3(-19.4, 0.2, -8.3)
			box.freeze = false
	if GameState.get_flag("boss_dead"):
		_set_status_lamp("tunnel_status", true)
	if GameState.get_flag("entered_building") or GameState.get_flag("phone_answered"):
		var phone: Phone = facility.nodes.get("phone")
		if phone:
			phone.answered = true
	if GameState.get_flag("office_frame_fell"):
		var frame: Node3D = facility.nodes.get("office_frame")
		if frame:
			frame.position = Vector3(-17.4, 0.05, 3.3)
			frame.rotation = Vector3(0, 0.3, PI / 2.0)


# --- Déclencheurs ----------------------------------------------------------------

func _on_trigger(trigger_name: String) -> void:
	match trigger_name:
		"hall_enter":
			_hall_enter()
		"admin_enter":
			if GameState.get_flag("admin_unlocked"):
				_silhouette()
			else:
				(facility.triggers["admin_enter"] as TriggerZone).rearm()
				GameState.set_flag("trig_admin_enter", false)
		"office_enter":
			_frame_falls()
		"archives_enter":
			if not GameState.get_flag("has_flashlight"):
				_archives_blackout()
		"archives_exit":
			if GameState.get_flag("has_flashlight") and not GameState.get_flag("security_breach"):
				_security_breach()
		"wing_mid":
			_door_opens_itself()
		"lab_enter":
			_lab_blackout()
		"basement_arrive":
			_basement_arrive()
		"generator_enter":
			if GameState.get_flag("generator_door_forced") and not GameState.get_flag("boss_started"):
				_boss_intro()
			elif not GameState.get_flag("boss_started"):
				(facility.triggers["generator_enter"] as TriggerZone).rearm()
				GameState.set_flag("trig_generator_enter", false)


func _on_flag(flag: String, value: Variant) -> void:
	if not value:
		return
	match flag:
		"has_flashlight":
			game.autosave("lampe")
		"fuse_inserted":
			_lockdown()
		"picked_lab_keycard":
			_surgeon_presence()
		"has_pistol":
			game.autosave("pistolet")
		"generator_door_forced":
			game.autosave("générateur")
		"admin_unlocked":
			game.autosave("administration")
		"basement_unlocked":
			pass


# --- 0. Introduction : l'appel ------------------------------------------------------

func play_intro() -> void:
	_lock(true)
	if GameState.ui:
		GameState.ui.set_black(1.0)
	Audio.set_loop("phone_static", 0.5, 0.5, "SFX")
	await _wait(1.0)
	var lines := [
		["02:13 — Appel entrant : LENA", 2.6],
		["« Ethan… c'est moi… »", 2.8],
		["« Je suis à Blackwood. Le centre, dans la forêt… »", 3.2],
		["« Ils n'auraient jamais dû le réveiller. Viens. S'il te pl— »", 3.6],
		["[ Signal perdu ]", 2.4],
	]
	for l in lines:
		_say(l[0], l[1])
		await _wait(l[1] + 0.3)
	Audio.set_loop("phone_static", 0.0, 0.3, "SFX")
	Audio.play_2d("phone_hangup", -4.0)
	await _wait(1.2)
	if GameState.ui:
		GameState.ui.show_title_card("BLACKWOOD", "Chapitre 1 — Le Signal", 4.0)
	await _wait(4.6)
	_say("Une heure plus tard. Blackwood Research Facility.", 3.5)
	await _wait(1.0)
	if GameState.ui:
		GameState.ui.fade_from_black(2.5)
	_focus(Vector3(0, 3.0, 12.0), 3.5, 0.8)
	await _wait(2.5)
	_lock(false)
	_say("Ethan : « Lena… Qu'est-ce que tu fais ici, en pleine nuit ? »", 3.5)
	GameState.set_flag("intro_done", true)
	game.autosave("arrivée")


# --- 1. Hall : le téléphone sonne ---------------------------------------------------

func _hall_enter() -> void:
	GameState.set_flag("entered_building", true)
	game.autosave("hall")
	await _wait(2.5)
	var phone: Phone = facility.nodes.get("phone")
	if phone and not phone.answered:
		phone.start_ringing()
		_say("Un téléphone sonne… à l'accueil.", 3.0)


func on_phone_answered() -> void:
	_lock(true)
	Audio.set_loop("phone_static", 0.35, 0.2, "SFX")
	_say("…", 1.5)
	await _wait(1.6)
	_say("(Une respiration. Lente. Humide.)", 3.0)
	Audio.play_2d("breath_phone", -4.0)
	await _wait(3.1)
	_say("« …E…than… »", 2.5)
	_shake(0.15)
	await _wait(2.6)
	Audio.set_loop("phone_static", 0.0, 0.1, "SFX")
	Audio.play_2d("phone_hangup", -2.0)
	_say("Ethan : « Lena ? LENA ! » … La ligne est morte.", 3.5)
	await _wait(1.0)
	_lock(false)


# --- 2. Couloir administratif : une silhouette traverse ---------------------------------

func _silhouette() -> void:
	await _wait(0.6)
	var from: Vector3 = facility.anchors["silhouette_from"]
	var to: Vector3 = facility.anchors["silhouette_to"]
	var fig := HumanoidRig.new()
	var shadow := Mats.get_mat("shadow_figure")
	game.add_child(fig)
	fig.build({"height": 1.05, "bulk": 0.8, "hair": false, "mat_torso": shadow, "mat_arms": shadow,
		"mat_legs": shadow, "mat_skin": shadow, "mat_feet": shadow, "mat_hands": shadow, "torso_shape": "gown"})
	fig.set_cast_shadows(false)
	fig.global_position = from
	var dir := (to - from).normalized()
	fig.rotation.y = atan2(-dir.x, -dir.z)
	Audio.play_3d("whoosh", from.lerp(to, 0.5) + Vector3.UP, 0.0, 0.05, 30.0, 5.0)
	var t := 0.0
	var dur := 0.75
	while t < dur and is_instance_valid(fig):
		var dt := get_process_delta_time()
		t += dt
		fig.global_position = from.lerp(to, t / dur)
		fig.walk_cycle(t * 16.0, 1.3, 1.2)
		fig.pose("spine", Vector3(-0.4, 0, 0))
		fig.apply(dt, 3.0)
		await get_tree().process_frame
	if is_instance_valid(fig):
		fig.queue_free()
	await _wait(0.4)
	Audio.play_3d("door_bang", to + Vector3.UP, -2.0, 0.0, 30.0, 5.0)


# --- 3. Bureau de Lena : un cadre tombe --------------------------------------------------

func _frame_falls() -> void:
	await _wait(1.8)
	var frame: Node3D = facility.nodes.get("office_frame")
	if frame == null:
		return
	GameState.set_flag("office_frame_fell", true)
	var tw := create_tween()
	tw.tween_property(frame, "position", Vector3(-17.4, 0.05, 3.3), 0.45).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.parallel().tween_property(frame, "rotation", Vector3(0, 0.3, PI / 2.0), 0.45)
	await _wait(0.45)
	Audio.play_3d("glass_crash", frame.global_position, 2.0, 0.05, 25.0, 4.0)
	_shake(0.12)


# --- 4. Archives : la porte claque, le noir, un bruit… personne -------------------------

func _archives_blackout() -> void:
	await _wait(0.5)
	var door: Door = facility.doors.get("archives_door")
	if door:
		door.slam()
	_shake(0.25)
	await _wait(0.7)
	var lamp: LightFixture = facility.nodes.get("archives_lamp")
	if lamp:
		lamp.set_power(false)
	Audio.play_2d("power_down", -4.0)
	Audio.set_loop("amb_room", 0.0, 0.3)
	await _wait(1.2)
	var box: RigidBody3D = facility.nodes.get("falling_box")
	if box:
		box.freeze = false
		box.apply_central_impulse(Vector3(0.6, 0.3, 1.8))
	await _wait(0.5)
	Audio.play_3d("object_fall", Vector3(-19.4, 0.5, -8.3), 3.0, 0.0, 20.0, 4.0)
	_shake(0.2)
	await _wait(0.9)
	var p := _player()
	if p:
		Audio.play_3d("breath_close", p.global_position + Basis(Vector3.UP, p.facing_yaw) * Vector3(0.8, 1.6, 1.2), -2.0, 0.0, 6.0, 1.5)
	await _wait(2.0)
	if lamp:
		lamp.set_power(true)
		lamp.set_mode(LightFixture.Mode.FLICKER)
	Audio.play_2d("power_up", -8.0)
	Audio.set_loop("amb_room", 0.6, 2.0)
	GameState.set_flag("archives_event_done", true)
	await _wait(1.5)
	if lamp:
		lamp.set_mode(LightFixture.Mode.STEADY)
	await _wait(0.5)
	_say("…Personne. Ce bruit… Il y a une lampe torche sur le bureau.", 3.5)


# --- 5. Le premier Hollow défonce la porte de la sécurité -------------------------------

func _security_breach() -> void:
	GameState.set_flag("security_breach", true)
	var door: Door = facility.nodes.get("security_door")
	var door_pos := door.global_position + Vector3.UP * 1.2
	Audio.play_3d("door_bang", door_pos, 4.0, 0.0, 40.0, 6.0)
	await _wait(0.9)
	Audio.play_3d("door_bang", door_pos, 6.0, 0.0, 40.0, 6.0)
	_focus(door_pos, 3.0, 0.9)
	await _wait(0.7)
	Audio.play_3d("door_burst", door_pos, 8.0, 0.0, 50.0, 8.0)
	Audio.play_2d("stinger", -2.0)
	door.unlock()
	door.open_door(door.global_position + Vector3(-2.0, 0, 0), true)
	_shake(0.55)
	FX.dust(game, door_pos, 18, 0.5)
	var e: Enemy = game.spawn_enemy("h_guard")
	if e:
		# Elle titube en sortant puis cherche l'origine du bruit : le joueur
		# peut fuir… ou éteindre sa lampe et se faire oublier.
		e.target_pos = _player().global_position if _player() else e.global_position
		e.set_state(Enemy.State.INVESTIGATE)
		e._stagger_t = 1.6
	await _wait(1.5)
	_say("Ethan (à voix basse) : « Elle cherche… Il me faut une arme. Éteindre la lampe. Ne pas courir. »", 4.5)


# --- 6. Confinement : le fusible réveille le bâtiment -----------------------------------

func _lockdown() -> void:
	game.autosave("fusible")
	_power_lab_wing(true)
	await _wait(1.5)
	_alarm(true)
	_say("HAUT-PARLEURS : « CONFINEMENT ACTIVÉ. PROTOCOLE DE QUARANTAINE. TOUTES LES ISSUES SONT VERROUILLÉES. »", 5.0)
	_lockdown_visuals(true)
	await _wait(3.0)
	var caf: Door = facility.nodes.get("cafeteria_door")
	if caf and not GameState.dead_enemies.has("h_cafeteria"):
		Audio.play_3d("door_burst", caf.global_position + Vector3.UP, 6.0, 0.0, 45.0, 7.0)
		caf.unlock()
		caf.open_door(caf.global_position + Vector3(0, 0, -2.0), true)
		FX.dust(game, caf.global_position + Vector3.UP, 16, 0.5)
		var e: Enemy = game.spawn_enemy("h_cafeteria")
		if e:
			e.target_pos = _player().global_position if _player() else e.global_position
			e.set_state(Enemy.State.INVESTIGATE)
		var p := _player()
		if p and Facility.zone_at(p.global_position) == "hall":
			_focus(caf.global_position + Vector3.UP * 1.2, 2.2, 0.8)
	await _wait(12.0)
	_alarm(false)


func _alarm(on: bool) -> void:
	_alarm_on = on
	Audio.set_loop("alarm", 0.55 if on else 0.0, 0.5, "SFX")


func _power_lab_wing(on: bool) -> void:
	for zone_name in ["lab_wing", "lab"]:
		for l in facility.zone_lights.get(zone_name, []):
			var f := l as LightFixture
			if not f.power and on:
				f.set_power(true)
	_set_status_lamp("wing_status", on)


func _set_status_lamp(lamp_name: String, ok: bool) -> void:
	var lamp: LightFixture = facility.nodes.get(lamp_name)
	if lamp and lamp.light:
		lamp.light.light_color = Color(0.15, 1.0, 0.35) if ok else Color(1.0, 0.18, 0.08)
		for m in lamp.emissive:
			var mat := m.material_override as StandardMaterial3D
			if mat:
				mat.emission = lamp.light.light_color
		lamp.set_mode(LightFixture.Mode.STEADY)


func _lockdown_visuals(animate: bool = false) -> void:
	var main: Door = facility.doors.get("main_entrance")
	if main:
		if main.is_open:
			main.close_door(true)
		main.set_lock(Door.Lock.EVENT, "Le rideau métallique de confinement bloque la sortie. Il faut trouver une autre issue.")
	var shutter: Node3D = facility.nodes.get("shutter")
	if shutter == null:
		shutter = Node3D.new()
		game.add_child(shutter)
		ItemModels._box(shutter, Vector3(3.2, 2.8, 0.08), Vector3(0, 1.4, 0), "metal_gray")
		for i in 14:
			ItemModels._box(shutter, Vector3(3.2, 0.02, 0.1), Vector3(0, 0.1 + i * 0.2, 0.01), "metal_dark")
		shutter.global_position = Vector3(0, 0, 12.3)
		facility.nodes["shutter"] = shutter
		if animate:
			shutter.position.y = 2.8
			var tw := create_tween()
			tw.tween_property(shutter, "position:y", 0.0, 3.0).set_trans(Tween.TRANS_LINEAR)
			Audio.play_3d("shutter", Vector3(0, 2.0, 12.3), 4.0, 0.0, 40.0, 6.0)
	# Veilleuses du hall en rouge pulsé
	for l in facility.zone_lights.get("hall", []):
		var f := l as LightFixture
		if f.light and f.light.light_color.r > 0.9 and f.light.light_color.g < 0.5 and f.mode == LightFixture.Mode.STEADY:
			f.set_mode(LightFixture.Mode.PULSE)
			f.base_energy = 1.4


# --- 7. Aile des laboratoires : une porte s'ouvre toute seule ----------------------------

func _door_opens_itself() -> void:
	if not GameState.get_flag("fuse_inserted"):
		return
	await _wait(0.8)
	var d: Door = facility.nodes.get("exam_door")
	if d and not d.is_open:
		d.open_angle = deg_to_rad(80.0)
		d.open_door(d.global_position + Vector3(0, 0, -2.0), true)
		Audio.play_3d("door_creak", d.global_position + Vector3.UP, 2.0, 0.0, 20.0, 4.0)


# --- 8. Laboratoire : la lampe s'éteint… et quelque chose est là ------------------------

func _lab_blackout() -> void:
	await _wait(1.2)
	var p := _player()
	if p == null:
		return
	for l in facility.zone_lights.get("lab", []):
		(l as LightFixture).set_power(false)
	p.flashlight.force_off(3.6)
	Audio.play_2d("power_down", -2.0)
	Audio.set_loop("heartbeat", 0.8, 0.3, "SFX")
	if not GameState.dead_enemies.has("h_lab"):
		var fwd := Basis(Vector3.UP, p.facing_yaw) * Vector3.FORWARD
		var spot: Vector3 = facility.anchors["lab_ambush"]
		var cand := p.global_position + fwd * 4.5
		if facility.nav_grids[0].is_walkable(cand) and Facility.zone_at(cand) == "lab":
			spot = cand
		var e: Enemy = game.spawn_enemy("h_lab", spot)
		if e:
			var to := p.global_position - e.global_position
			e.place(e.global_position, atan2(-to.x, -to.z))
	await _wait(3.6)
	for l in facility.zone_lights.get("lab", []):
		var f := l as LightFixture
		if f.base_energy > 0.0:
			f.set_power(true)
	Audio.play_2d("power_up", -6.0)
	Audio.play_2d("stinger", 0.0)
	Audio.set_loop("heartbeat", 0.0, 2.0, "SFX")
	_shake(0.4)
	var e2: Enemy = game.enemies.get("h_lab")
	if e2 and not e2.is_dead():
		e2.last_known = p.global_position
		e2.set_state(Enemy.State.CHASE)
	GameState.set_flag("lab_blackout_done", true)


# --- 9. La carte d'accès : quelque chose bouge sous le laboratoire ----------------------

func _surgeon_presence() -> void:
	await _wait(1.5)
	Audio.play_2d("surgeon_distant", 0.0)
	_shake(0.3)
	for l in facility.zone_lights.get("lab", []):
		var f := l as LightFixture
		if f.power and f.mode == LightFixture.Mode.STEADY:
			f.set_mode(LightFixture.Mode.FLICKER)
	await _wait(3.5)
	_say("Ethan : « …Ça venait d'en dessous. »", 3.0)


# --- 10. Niveau B ------------------------------------------------------------------------

func _basement_arrive() -> void:
	game.autosave("niveau B")
	await _wait(2.0)
	Audio.play_2d("surgeon_distant", -8.0)


# --- 11. Salle du générateur : le Chirurgien -------------------------------------------

func _boss_intro() -> void:
	GameState.set_flag("boss_started", true)
	var boss: Surgeon = game.enemies.get("surgeon")
	var door: Door = facility.doors.get("generator_door")
	if door:
		door.slam()
		door.set_lock(Door.Lock.EVENT, "La porte s'est refermée derrière moi. Verrouillée.")
	_lock(true)
	Audio.stop_all_loops(1.5)
	await _wait(0.8)
	if boss == null:
		_lock(false)
		return
	_focus(boss.global_position + Vector3.UP * 2.0, 5.0, 1.0)
	_say("Penché sur une table, une silhouette immense… Elle fredonne.", 3.0)
	await _wait(2.6)
	# Il se retourne lentement
	var p := _player()
	var to := p.global_position - boss.global_position
	var target_rot := atan2(-to.x, -to.z)
	var turn := func(v: float) -> void:
		boss.facing = v
		boss.rig.rotation.y = v
	var tw := create_tween()
	tw.tween_method(turn, boss.facing, boss.facing + wrapf(target_rot - boss.facing, -PI, PI), 1.8).set_trans(Tween.TRANS_SINE)
	await _wait(1.9)
	Audio.play_3d("surgeon_roar", boss.global_position + Vector3.UP * 2.2, 6.0, 0.0, 60.0, 8.0)
	_shake(0.6)
	_say("LE CHIRURGIEN", 2.0)
	Audio.play_music("music_boss", 0.9, 1.0)
	Audio.set_loop("amb_generator", 0.9, 2.0)
	if GameState.ui:
		GameState.ui.show_boss_bar("LE CHIRURGIEN — DR ALDOUS MARROW", boss.hp, boss.max_hp)
	boss.boss_hp_changed.connect(_on_boss_hp)
	boss.died.connect(_on_boss_died)
	await _wait(1.2)
	_lock(false)
	boss.activate()
	await _wait(6.0)
	if not GameState.get_flag("boss_dead"):
		_say("Ethan : « Les disjoncteurs… l'eau… Il faut qu'il soit dans l'eau. »", 4.0)


func _on_boss_hp(hp: float, mx: float) -> void:
	if GameState.ui:
		GameState.ui.update_boss_bar(hp, mx)


func _on_boss_died(_e: Enemy) -> void:
	_boss_defeated()


func _on_breaker(panel: BreakerPanel) -> void:
	var rect: Rect2 = facility.anchors["trap_rect"]
	var water: MeshInstance3D = facility.nodes.get("trap_water")
	var flash: LightFixture = facility.nodes.get("trap_flash")
	Audio.play_3d("electrocution", Vector3(-8.0, -3.6, -38.0), 6.0, 0.0, 40.0, 8.0)
	_shake(0.35)
	for i in 6:
		FX.sparks(game, Vector3(rect.position.x + randf() * rect.size.x, -4.4, rect.position.y + randf() * rect.size.y), 14)
	if water:
		var mat := water.material_override as ShaderMaterial
		var set_arc := func(v: float) -> void:
			mat.set_shader_parameter("electrified", v)
		var tw := create_tween()
		tw.tween_method(set_arc, 1.0, 0.0, 1.4)
	if flash and flash.light:
		var tw2 := create_tween()
		for i in 5:
			tw2.tween_property(flash.light, "light_energy", 6.0, 0.04)
			tw2.tween_property(flash.light, "light_energy", 0.0, 0.1)
		flash.light.visible = true
	var boss: Surgeon = game.enemies.get("surgeon")
	if boss and not boss.is_dead():
		var bp := boss.global_position
		if rect.has_point(Vector2(bp.x, bp.z)):
			boss.electrocute()
			_say("Le courant le traverse de part en part !", 2.0)
	var p := _player()
	if p and rect.has_point(Vector2(p.global_position.x, p.global_position.z)) and absf(p.global_position.y - (-4.5)) < 1.0:
		p.take_damage(35.0, p.global_position + Vector3(0, 0, 1), "shock")
	for e in get_tree().get_nodes_in_group("enemies"):
		if e is Hollow and not e.is_dead():
			var ep: Vector3 = e.global_position
			if rect.has_point(Vector2(ep.x, ep.z)):
				e.take_damage(200.0, ep, Vector3.UP, false)


func _boss_defeated() -> void:
	if GameState.get_flag("boss_dead"):
		return
	GameState.set_flag("boss_dead", true)
	Audio.play_music("music_boss", 0.0, 3.0)
	if GameState.ui:
		GameState.ui.hide_boss_bar()
	await _wait(2.5)
	Audio.play_2d("power_up", 0.0)
	_shake(0.3)
	_say("HAUT-PARLEURS : « ALIMENTATION PRINCIPALE RÉTABLIE. VERROUILLAGE D'URGENCE LEVÉ. »", 5.0)
	var tdoor: Door = facility.nodes.get("tunnel_door")
	if tdoor:
		tdoor.unlock()
		await _wait(1.0)
		tdoor.open_door(tdoor.global_position + Vector3(0, 0, 3.0))
	var gdoor: Door = facility.doors.get("generator_door")
	if gdoor:
		gdoor.set_lock(Door.Lock.NONE)
	_set_status_lamp("tunnel_status", true)
	Audio.set_loop("amb_generator", 0.5, 3.0)
	game.autosave("sortie")
	await _wait(4.0)
	_say("Ethan : « Le tunnel de service… C'est la sortie. »", 3.5)


# --- 12. Épilogue --------------------------------------------------------------------

func play_ending() -> void:
	GameState.set_flag("game_complete", true)
	_lock(true)
	Audio.stop_all_loops(2.0)
	if GameState.ui:
		GameState.ui.fade_to_black(2.0)
	await _wait(2.3)
	var p := _player()
	# Aube sur la clairière
	facility.env.volumetric_fog_density = 0.012
	facility.env.volumetric_fog_albedo = Color(0.85, 0.8, 0.78)
	facility.env.ambient_light_energy = 0.45
	facility.env.ambient_light_color = Color(0.55, 0.55, 0.62)
	facility.sky_material.set_shader_parameter("dawn", 1.0)
	facility.moon.visible = true
	facility.moon.light_color = Color(1.0, 0.72, 0.5)
	facility.moon.light_energy = 0.9
	facility.moon.rotation = Vector3(deg_to_rad(-8.0), deg_to_rad(-100.0), 0.0)
	if p:
		p.place(facility.anchors["ending_player"], PI)
		p.flashlight.set_on(false)
	var cam := Camera3D.new()
	cam.fov = 55.0
	game.add_child(cam)
	cam.global_position = facility.anchors["ending_cam"]
	cam.look_at(facility.anchors["ending_look"], Vector3.UP)
	cam.make_current()
	Audio.set_loop("amb_wind", 0.5, 3.0)
	Audio.set_loop("amb_birds", 0.35, 5.0)
	if GameState.ui:
		GameState.ui.fade_from_black(3.0)
	var tw := create_tween()
	tw.tween_property(cam, "global_position", cam.global_position + Vector3(2.5, 1.5, -3.5), 22.0).set_trans(Tween.TRANS_SINE)
	await _wait(4.0)
	_say("L'aube. De l'air froid. Des arbres. Dehors.", 3.5)
	await _wait(4.0)
	Audio.play_2d("phone_vibrate", -2.0)
	_say("Appel entrant : LENA", 2.5)
	await _wait(3.0)
	Audio.set_loop("phone_static", 0.25, 0.5, "SFX")
	var lines := [
		["« Ethan… Tu es sorti. Bien. »", 3.2],
		["« Ne rentre pas chez toi. Ils savent qui tu es. »", 3.6],
		["« Je suis au Site 2. Ils m'ont… »", 3.0],
		["« …Ils m'ont réveillée, Ethan. »", 3.6],
		["[ Signal perdu ]", 2.5],
	]
	for l in lines:
		_say(l[0], l[1])
		await _wait(l[1] + 0.35)
	Audio.set_loop("phone_static", 0.0, 0.3, "SFX")
	Audio.play_2d("phone_hangup", -2.0)
	await _wait(1.5)
	if GameState.ui:
		GameState.ui.fade_to_black(2.5)
	await _wait(2.8)
	Audio.play_music("music_end", 0.8, 2.0)
	if GameState.ui:
		GameState.ui.show_ending()


# --- Ambiance : bruits lointains, éclairs ---------------------------------------------

func _process(delta: float) -> void:
	if not GameState.get_flag("intro_done"):
		return
	var zone := GameState.current_zone
	_ambient_t -= delta
	if _ambient_t <= 0.0:
		_ambient_t = randf_range(40.0, 90.0)
		var p := _player()
		if p and zone != "parking":
			var dir := Vector3(randf_range(-1, 1), 0, randf_range(-1, 1)).normalized()
			var snd: String = ["distant_thump", "metal_creak", "distant_thump", "pipe_groan"][randi() % 4]
			Audio.play_3d(snd, p.global_position + dir * randf_range(10.0, 18.0) + Vector3.UP * 2.0, -4.0, 0.1, 40.0, 8.0)
	_lightning_t -= delta
	if _lightning_t <= 0.0:
		_lightning_t = randf_range(25.0, 60.0)
		if bool(Facility.ZONES.get(zone, {}).get("moon", false)) and not GameState.get_flag("game_complete"):
			_lightning(zone == "parking")


func _lightning(outdoor: bool) -> void:
	var moon := facility.moon
	var base := moon.light_energy
	for i in [0, 1]:
		moon.light_energy = 3.5 if outdoor else 2.5
		await _wait(0.06)
		moon.light_energy = base
		await _wait(0.12)
	await _wait(randf_range(0.8, 2.2))
	Audio.play_2d("thunder", 0.0 if outdoor else -8.0, randf_range(0.9, 1.1))

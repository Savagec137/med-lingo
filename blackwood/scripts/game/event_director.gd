class_name EventDirector
extends Node
## Scénario de Blackwood Hospital. Chaque événement pose un drapeau pour ne
## jamais se rejouer et rester cohérent après un chargement.
## Acte 1 : le message, les urgences, l'infirmière, le courant.
## Acte 2 : Sarah, le Chirurgien, le 6e (le twist), le 8e (la vidéo, le Colossus).
## Acte 3 : Sarah au centre de contrôle, le Patient Zéro, l'autodestruction, la fuite.
## Les jumpscares restent rares : la peur vient de l'attente, du son, du noir.

const SWITCH_ORDER := ["pump", "g1", "transfer"]
const COUNTDOWN := [300.0, 240.0, 200.0]

var game: Node
var facility: Facility
var countdown := -1.0
var _ambient_t := 35.0
var _lightning_t := 20.0
var _alarm_on := false
var _switch_step := 0
var _busy := false
var _surgeon_waking := false


func setup(p_game: Node, p_facility: Facility) -> void:
	game = p_game
	facility = p_facility
	for t in facility.triggers.values():
		(t as TriggerZone).triggered.connect(_on_trigger)
	GameState.flag_changed.connect(_on_flag)
	GameState.document_collected.connect(_on_document)
	for id in ["pump", "g1", "transfer"]:
		var sp: SwitchPanel = facility.nodes.get("switch_" + id)
		if sp:
			sp.switched.connect(_on_switch)


func _wait(t: float) -> void:
	await get_tree().create_timer(t, false).timeout


func _player() -> Player:
	return GameState.player as Player


func _say(text: String, duration: float = 3.5) -> void:
	if GameState.ui:
		GameState.ui.show_subtitle(text, duration)


## Dialogue : répliques successives (texte, durée).
func _lines(lines: Array) -> void:
	for l in lines:
		_say(String(l[0]), float(l[1]))
		await _wait(float(l[1]) + 0.3)


func lock_player(on: bool) -> void:
	_lock(on)


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


func _enemy(id: String) -> Enemy:
	var e: Enemy = game.enemies.get(id)
	return e if e and is_instance_valid(e) else null


# --- État du monde restauré au chargement ------------------------------------------

func apply_world_state() -> void:
	if GameState.get_flag("power_restored"):
		_power_on(false)
	else:
		for i in SWITCH_ORDER.size():
			if GameState.get_flag("switch_" + SWITCH_ORDER[i]):
				var sp: SwitchPanel = facility.nodes.get("switch_" + SWITCH_ORDER[i])
				if sp:
					sp.set_on(true, false)
				_switch_step = i + 1
	for ph in ["triage_phone", "hall_phone"]:
		var phone: Phone = facility.nodes.get(ph)
		if phone and GameState.get_flag("phone_answered"):
			phone.answered = true
	# Boss : branchements et reprise en plein combat
	var surgeon := _enemy("f3_surgeon") as Surgeon
	if surgeon:
		surgeon.boss_hp_changed.connect(_on_boss_hp)
		surgeon.died.connect(func(_e: Enemy) -> void: _surgeon_defeated())
		if GameState.get_flag("surgeon_started"):
			_open_or_door(false)
			surgeon.activate()
			_boss_bar("LE CHIRURGIEN — DR MARKUS KELLER", surgeon.hp, surgeon.max_hp)
		elif GameState.has_document("doc_sarah_note"):
			# Sauvegarde faite entre la note et la sortie du Chirurgien
			_surgeon_intro()
	var sarah := _enemy("f11_sarah") as SarahBoss
	if sarah:
		sarah.boss_hp_changed.connect(_on_boss_hp)
		sarah.hesitated.connect(_on_sarah_hesitated)
		sarah.died.connect(func(_e: Enemy) -> void: _sarah_defeated())
		if GameState.get_flag("sarah_boss_started"):
			sarah.start_fight_immediately()
			_boss_bar("SARAH", sarah.hp, sarah.max_hp)
	var zero := _enemy("f12_zero") as PatientZero
	if zero:
		zero.boss_hp_changed.connect(_on_boss_hp)
		zero.summon_mutants.connect(_summon_mutants)
		zero.died.connect(func(_e: Enemy) -> void: _zero_defeated())
		if GameState.get_flag("zero_released"):
			var glass: BreakableGlass = facility.nodes.get("glass_f12_cell")
			if glass:
				glass.shatter()
			zero.release()
			_boss_bar("PATIENT ZÉRO — ÉLIAS BRANDT", zero.hp, zero.max_hp)
	if GameState.get_flag("colossus_free"):
		var glass8: BreakableGlass = facility.nodes.get("glass_f8_c7")
		if glass8 and not glass8.broken:
			glass8.shatter()
		var cdoor: Door = facility.doors.get("f8_colossus_door")
		if cdoor and cdoor.lock != Door.Lock.NONE:
			cdoor.unlock()
			cdoor.open_door(cdoor.global_position + Vector3(0, 0, -2.0), true)
		var c := _enemy("f8_colossus")
		if c:
			c.passive = false
	if GameState.get_flag("self_destruct") and not GameState.get_flag("game_complete"):
		# Évasion en cours : le Colossus garde le couloir du 8e
		var cz := _enemy("f8_colossus")
		if cz and not cz.is_dead():
			cz.place(facility.anchors["colossus_escape"], -PI * 0.5)
			cz.passive = false
			cz.set_state(Enemy.State.IDLE)
		_start_countdown(false)


# --- Déclencheurs ----------------------------------------------------------------

func _on_trigger(trigger_name: String) -> void:
	match trigger_name:
		"ramp_top":
			if not GameState.get_flag("entered_hospital"):
				_say("Thomas : « Les urgences… Il y a encore de la lumière, en bas. »", 3.5)
		"er_bay":
			_say("Une ambulance, portes arrière grandes ouvertes. Personne.", 3.0)
		"b1_enter":
			_er_enter()
		"b1_nurse":
			_nurse_encounter()
		"b1_stair_escape":
			_nurse_escape()
		"f0_arrive":
			GameState.set_flag("reached_ground", true)
			game.autosave("rez-de-chaussée")
		"f0_hall":
			_hall_announcement()
		"f1_arrive":
			GameState.set_flag("reached_f1", true)
			game.autosave("1er étage")
		"f1_xray":
			_say("Thomas (à voix basse) : « Il y a quelqu'un… Il ne bouge pas. Doucement. »", 4.0)
		"b2_arrive":
			_b2_arrive()
		"b2_parking":
			_veilleur_glimpse()
		"f3_arrive":
			GameState.set_flag("reached_f3", true)
			game.autosave("neurologie")
			_say("Thomas : « Le service de Sarah… Sarah ? »", 3.5)
		"stairb_5":
			_neonatal_scare()
		"f6_arrive":
			GameState.set_flag("reached_floor_6", true)
			game.autosave("6e étage")
		"f6_airlock":
			_airlock()
		"f6_q604":
			_q604_breakout()
		"f8_arrive":
			if not GameState.get_flag("self_destruct"):
				GameState.set_flag("reached_f8", true)
				game.autosave("8e étage")
				_say("Thomas : « Le laboratoire expérimental… C'est ici que tout a commencé. »", 4.0)
		"f8_stairc":
			if GameState.get_flag("self_destruct"):
				GameState.set_flag("esc_8", true)
				_say("Thomas : « Le monte-charge… à l'autre bout ! »", 3.0)
		"f11_arrive":
			GameState.set_flag("reached_f11", true)
			game.autosave("11e étage")
		"f11_control":
			if not GameState.get_flag("sarah_talked"):
				_sarah_scene()
		"f12_arrive":
			GameState.set_flag("reached_f12", true)
			game.autosave("laboratoire principal")
			_say("Thomas : « La zone interdite. Le cœur du Projet ECHO. »", 3.5)
		"escape_out":
			if GameState.get_flag("self_destruct") and not GameState.get_flag("game_complete"):
				play_ending()


func _on_flag(flag: String, value: Variant) -> void:
	if not value:
		return
	match flag:
		"has_flashlight":
			_say("Thomas : « Bien. De la lumière. »", 2.5)
		"picked_f0_baton":
			_guard_wakes()
		"killed_f0_guard":
			game.autosave("sécurité")
		"has_pistol":
			game.autosave("pistolet")
		"stair_b_open":
			game.autosave("escalier B")
			_say("Thomas : « L'escalier de service. Jusqu'au 6e. »", 3.0)
		"sarah_locker_open":
			_say("Thomas : « Son casier… Sa blouse est encore là. »", 3.0)
		"has_shotgun":
			game.autosave("fusil")
		"picked_f6_research_card":
			game.autosave("carte recherche")
			_say("Thomas : « Monte-charge sécurisé, départ du sous-sol -2… Retour en bas. »", 4.0)
		"saw_sabotage_screen":
			_say("Thomas : « Sarah… C'est toi qui as ouvert les cellules ? »", 3.5)
		"vance_safe_open":
			game.autosave("coffre de Vance")
		"picked_f8_private_key":
			_colossus_breakout()


func _on_document(doc_id: String) -> void:
	match doc_id:
		"doc_sarah_note":
			GameState.set_flag("has_code_b", true)
			game.autosave("casier de Sarah")
			_surgeon_intro()
		"doc_sabotage":
			if not GameState.get_flag("saw_sabotage_screen"):
				GameState.set_flag("saw_sabotage_screen", true)


## Points scriptés (vidéo, interphone, console).
func on_event_point(event_id: String, point: EventPoint) -> void:
	match event_id:
		"sarah_video":
			_sarah_video(point)
		"sarah_talk":
			if not GameState.get_flag("sarah_talked"):
				_sarah_scene()
		"zero_talk":
			_zero_intercom(point)
		"self_destruct":
			_self_destruct_console(point)


func on_elevator_arrived(elevator_id: String, level: int) -> void:
	GameState.set_flag("visited_%d" % level, true)
	if elevator_id == "freight" and level == -1 and GameState.get_flag("self_destruct"):
		GameState.set_flag("esc_b1", true)
		_say("Thomas : « Les urgences. La sortie est juste là. »", 3.0)
	if elevator_id == "main" and level == -2 and GameState.has_item("card_research") and not GameState.get_flag("veilleur_ambush"):
		GameState.set_flag("veilleur_ambush", true)
		var v := _enemy("b2_veilleur")
		if v and not v.is_dead():
			v.place(facility.anchors["veilleur_ambush"], PI * 0.5)
			v.set_state(Enemy.State.PATROL)
		await _wait(1.5)
		Audio.play_3d("veilleur_click", facility.anchors["veilleur_ambush"] + Vector3.UP * 2.0, 2.0, 0.1, 30.0, 5.0)
		_say("Thomas (à voix basse) : « Il est entre moi et le monte-charge. Marcher. Ne pas courir. »", 4.5)
	if elevator_id == "freight" and level == 8 and not GameState.get_flag("reached_f8"):
		GameState.set_flag("reached_f8", true)
		game.autosave("8e étage")


# --- Acte 1 : le message ------------------------------------------------------------

func play_intro() -> void:
	_lock(true)
	if GameState.ui:
		GameState.ui.set_black(1.0)
	await _wait(1.0)
	Audio.play_2d("phone_vibrate", -4.0)
	_say("Messagerie — 1 nouveau message — reçu à 23 h 58", 2.8)
	await _wait(3.0)
	Audio.set_loop("phone_static", 0.45, 0.5, "SFX")
	await _lines([
		["Sarah : « Thomas… c'est moi. »", 2.4],
		["Sarah : « Si tu reçois ce message, ne viens surtout pas à l'hôpital. »", 3.4],
		["Sarah : « Tu m'entends ? Surtout pas. »", 2.4],
		["Sarah : « Ils ne sont pas morts, Thomas. Ils ne sont pas morts. »", 3.4],
		["[ fin du message ]", 2.0],
	])
	Audio.set_loop("phone_static", 0.0, 0.3, "SFX")
	Audio.play_2d("phone_hangup", -4.0)
	GameState.add_document("doc_voicemail")
	await _wait(1.0)
	if GameState.ui:
		GameState.ui.show_title_card("BLACKWOOD HOSPITAL", "Chapitre 1 — Le Message", 4.2)
	await _wait(4.8)
	_say("Trois heures de route plus tard. Centre hospitalier universitaire Blackwood.", 3.8)
	await _wait(1.2)
	if GameState.ui:
		GameState.ui.fade_from_black(2.5)
	_focus(Vector3(0, 30.0, -6.0), 4.0, 0.8)
	await _wait(3.0)
	_lock(false)
	_say("Thomas : « Pas une voiture. Pas une lumière… Sarah, qu'est-ce qui se passe ici ? »", 4.0)
	GameState.set_flag("intro_done", true)
	game.autosave("arrivée")


# --- Urgences -----------------------------------------------------------------------

func _er_enter() -> void:
	GameState.set_flag("entered_hospital", true)
	game.autosave("urgences")
	await _wait(2.5)
	var phone: Phone = facility.nodes.get("triage_phone")
	if phone and not phone.answered:
		phone.start_ringing()
		_say("Un téléphone sonne, sur le comptoir de l'accueil.", 3.0)


func on_phone_answered() -> void:
	_lock(true)
	Audio.set_loop("phone_static", 0.3, 0.2, "SFX")
	await _lines([
		["Répondeur : « Centre hospitalier Blackwood. En raison d'une mesure sanitaire exceptionnelle, les urgences sont fermées. »", 4.6],
		["Répondeur : « Restez chez vous. Ne vous présentez pas à l'hôpital. »", 3.4],
	])
	Audio.play_2d("breath_phone", -6.0)
	_say("(Un déclic. Quelqu'un d'autre est sur la ligne. Une respiration.)", 3.0)
	await _wait(3.2)
	_say("Voix de femme, très bas : « …Thomas ? … Pars. »", 3.2)
	_shake(0.15)
	await _wait(3.3)
	Audio.set_loop("phone_static", 0.0, 0.1, "SFX")
	Audio.play_2d("phone_hangup", -2.0)
	_say("Thomas : « Sarah ? SARAH ! » … Tonalité. Elle me voit. Elle est quelque part, là-haut.", 4.5)
	await _wait(1.0)
	_lock(false)


## « Madame ? Vous avez besoin d'aide ? » — elle se retourne, et charge.
func _nurse_encounter() -> void:
	var nurse := _enemy("b1_nurse")
	if nurse == null or GameState.get_flag("nurse_seen"):
		return
	GameState.set_flag("nurse_seen", true)
	_lock(true)
	_focus(facility.anchors["b1_nurse_look"], 2.6, 0.9)
	await _wait(0.5)
	_say("Thomas : « Madame ? Vous avez besoin d'aide ? »", 2.4)
	await _wait(2.0)
	Audio.play_3d("hollow_alert", nurse.global_position + Vector3.UP * 1.5, 4.0, 0.0, 40.0, 6.0, 1.2)
	Audio.play_2d("stinger", -2.0)
	_shake(0.3)
	nurse.activate_hunt()
	await _wait(0.4)
	_lock(false)
	_say("FUIS ! L'escalier A, à l'ouest du couloir !", 3.0)


func _nurse_escape() -> void:
	if GameState.get_flag("nurse_escaped") or not GameState.get_flag("nurse_seen"):
		return
	GameState.set_flag("nurse_escaped", true)
	var door: Door = facility.doors.get("stair_a_b1")
	if door:
		door.slam()
		door.set_lock(Door.Lock.EVENT, "La porte coupe-feu est bloquée. De l'autre côté, quelque chose pèse de tout son poids.")
	await _wait(0.9)
	for i in 3:
		if door:
			Audio.play_3d("door_bang", door.global_position + Vector3.UP, 4.0, 0.05, 30.0, 5.0)
		_shake(0.2)
		await _wait(0.8)
	_say("Thomas (haletant) : « …Elle me regardait comme si elle me connaissait. »", 4.0)
	game.autosave("escalier A")


# --- Rez-de-chaussée ----------------------------------------------------------------

func _hall_announcement() -> void:
	await _wait(1.5)
	Audio.play_2d("relay_click", -6.0)
	await _lines([
		["HAUT-PARLEURS : « …Confinement sanitaire en cours. Restez dans vos chambres. »", 4.0],
		["HAUT-PARLEURS : « Ne tentez pas de quitter l'établissement. Le personnel soignant va… »", 4.0],
	])
	Audio.play_2d("phone_hangup", -10.0)
	_say("(Le message se coupe au milieu du mot. Puis recommence, plus loin, dans un autre étage.)", 3.8)


## L'agent qui gisait au poste de sécurité se relève quand Thomas prend la matraque.
func _guard_wakes() -> void:
	await _wait(1.2)
	var g := _enemy("f0_guard")
	if g == null or g.is_dead():
		return
	g.deep_sleep = false
	g.wake_up()
	Audio.play_3d("hollow_wake", g.global_position + Vector3.UP, 2.0, 0.0, 20.0, 4.0)
	_say("Derrière moi… l'agent. Il se relève.", 2.5)


# --- Sous-sol -2 : le Veilleur, le courant ----------------------------------------------

func _b2_arrive() -> void:
	GameState.set_flag("b2_arrived", true)
	game.autosave("sous-sol -2")
	await _wait(2.0)
	var v := _enemy("b2_veilleur")
	var pos: Vector3 = v.global_position if v else Vector3(15, -6, 0)
	Audio.play_3d("veilleur_scream", pos + Vector3.UP * 2.0, -4.0, 0.0, 60.0, 8.0)
	await _wait(2.2)
	_say("Thomas : « …Qu'est-ce que c'était ? » Un cliquetis, loin, dans le parking.", 3.8)


func _veilleur_glimpse() -> void:
	await _wait(0.5)
	_say("Thomas (à voix basse) : « Il ne me voit pas… Il écoute. Ne pas courir. »", 4.0)


func _on_switch(panel: SwitchPanel) -> void:
	if GameState.get_flag("power_restored"):
		return
	var expected: String = SWITCH_ORDER[_switch_step] if _switch_step < SWITCH_ORDER.size() else ""
	if panel.switch_id == expected:
		panel.set_on(true)
		GameState.set_flag("switch_" + expected, true)
		_switch_step += 1
		match expected:
			"pump":
				Audio.play_3d("relay_click", panel.global_position + Vector3.UP * 1.3, 0.0, 0.0, 15.0, 3.0)
				GameState.show_message("La pompe à gasoil ronronne. Étape 1 sur 3.", 3.0)
			"g1":
				Audio.play_3d("power_up", panel.global_position + Vector3.UP, 4.0, 0.0, 40.0, 6.0)
				Audio.set_loop("amb_generator", 0.8, 3.0)
				_shake(0.25)
				GameState.show_message("Le groupe G1 démarre dans un vacarme de pistons. Étape 2 sur 3.", 3.5)
				# Le vacarme attire forcément quelque chose
				GameState.emit_noise(panel.global_position, 35.0, panel)
			"transfer":
				_power_on(true)
	else:
		# Mauvais ordre : le groupe cale, tout est à refaire — et ça fait du bruit
		_switch_step = 0
		for id in SWITCH_ORDER:
			GameState.set_flag("switch_" + id, false)
			var sp: SwitchPanel = facility.nodes.get("switch_" + id)
			if sp:
				sp.set_on(false)
		Audio.play_3d("power_down", panel.global_position + Vector3.UP, 4.0, 0.0, 40.0, 6.0)
		Audio.set_loop("amb_generator", 0.25, 1.5)
		GameState.emit_noise(panel.global_position, 30.0, panel)
		GameState.show_message("Le groupe tousse et cale. Il faut suivre la procédure du local technique, dans l'ordre.", 4.5)


func _power_on(animate: bool) -> void:
	GameState.set_flag("power_restored", true)
	for id in SWITCH_ORDER:
		var sp: SwitchPanel = facility.nodes.get("switch_" + id)
		if sp:
			sp.set_on(true, animate)
			sp.locked = true
	for l in facility.grid_lights:
		l.set_power(true)
	if not animate:
		return
	Audio.play_2d("power_up", 0.0)
	Audio.set_loop("amb_generator", 0.7, 2.0)
	_shake(0.3)
	await _wait(1.5)
	_say("HAUT-PARLEURS : « ALIMENTATION DE SECOURS ÉTABLIE. ASCENSEURS EN SERVICE. »", 4.5)
	game.autosave("courant")
	await _wait(5.0)
	_say("Thomas : « Les ascenseurs… Le 3e. Le service de Sarah. »", 3.5)


# --- 3e étage : le Chirurgien ----------------------------------------------------------

func _surgeon_intro() -> void:
	var boss := _enemy("f3_surgeon") as Surgeon
	if boss == null or boss.is_dead() or GameState.get_flag("surgeon_started") or _surgeon_waking:
		return
	_surgeon_waking = true
	await _wait(2.5)
	Audio.play_2d("surgeon_distant", 0.0)
	_shake(0.3)
	_say("Un fracas métallique, au bout du couloir. Le bloc de neurochirurgie.", 3.0)
	await _wait(2.5)
	_surgeon_waking = false
	# Porte enfoncée et combat engagé au même instant (cohérent en cas de sauvegarde)
	GameState.set_flag("surgeon_started", true)
	_open_or_door(true)
	boss.activate()
	Audio.play_3d("surgeon_roar", boss.global_position + Vector3.UP * 2.2, 6.0, 0.0, 60.0, 8.0)
	Audio.play_music("music_boss", 0.9, 1.0)
	_boss_bar("LE CHIRURGIEN — DR MARKUS KELLER", boss.hp, boss.max_hp)
	await _wait(3.0)
	_say("Thomas : « Les bouteilles d'oxygène… Si je le fais passer à côté… »", 4.0)


## Les portes du bloc cèdent (le Chirurgien sort).
func _open_or_door(loud: bool) -> void:
	var door: Door = facility.doors.get("f3_or_door")
	if door == null:
		return
	if loud:
		Audio.play_3d("door_burst", door.global_position + Vector3.UP, 8.0, 0.0, 50.0, 8.0)
		FX.dust(game, door.global_position + Vector3.UP, 18, 0.5)
	if door.lock != Door.Lock.NONE:
		door.unlock()
	if not door.is_open:
		door.open_door(door.global_position + Vector3(0, 0, 2.0), true)


func _surgeon_defeated() -> void:
	if GameState.get_flag("surgeon_dead"):
		return
	GameState.set_flag("surgeon_dead", true)
	Audio.play_music("music_boss", 0.0, 3.0)
	_hide_boss_bar()
	await _wait(2.5)
	_say("Thomas : « Une pastille métallique à la nuque… « ECHO ». Comme les autres. »", 4.0)
	game.autosave("Chirurgien")


# --- Escalier B, 6e étage ----------------------------------------------------------------

func _neonatal_scare() -> void:
	var door: Door = facility.doors.get("stair_b_5")
	var pos: Vector3 = door.global_position + Vector3.UP * 0.4 if door else Vector3(28, 20.4, -16)
	Audio.play_3d("neonatal_screech", pos, 2.0, 0.0, 25.0, 4.0)
	await _wait(0.6)
	Audio.play_3d("door_bang", pos + Vector3.UP * 0.6, 0.0, 0.05, 20.0, 4.0)
	await _wait(0.5)
	Audio.play_3d("neonatal_skitter", pos, 0.0, 0.1, 20.0, 4.0)
	_shake(0.15)
	await _wait(1.0)
	_say("Thomas : « Des petites mains… sous la porte de la pédiatrie. »", 3.5)


func _airlock() -> void:
	_lock(true)
	Audio.play_2d("relay_click", -4.0)
	_say("SAS : « DÉCONTAMINATION EN COURS. NE BOUGEZ PAS. »", 3.0)
	var p := _player()
	if p:
		FX.dust(game, p.global_position + Vector3.UP * 2.5, 40, 1.2)
	Audio.play_2d("whoosh", -2.0)
	await _wait(2.8)
	_say("SAS : « DÉCONTAMINATION TERMINÉE. »", 2.0)
	_lock(false)


func _q604_breakout() -> void:
	var e := _enemy("f6_q604")
	if e == null or e.is_dead():
		return
	await _wait(0.4)
	var glass: BreakableGlass = facility.nodes.get("glass_f6_604")
	if glass:
		glass.shatter()
	_shake(0.35)
	Audio.play_2d("stinger", -3.0)
	e.place(facility.anchors["f6_q604_glass"] + Vector3(-0.5, -1.45, -0.8), PI)
	e.activate_hunt()


# --- 8e étage : la vidéo, le Colossus -------------------------------------------------------

func _sarah_video(point: EventPoint) -> void:
	if GameState.get_flag("sarah_video_seen") or _busy:
		return
	_busy = true
	_lock(true)
	var cam := _cutscene_camera(facility.anchors["video_cam"], facility.anchors["video_look"])
	var scr: MeshInstance3D = facility.nodes.get("video_screen")
	if scr:
		scr.material_override = Mats.screen(1, Color(0.8, 0.9, 1.0))
	Audio.set_loop("phone_static", 0.15, 0.5, "SFX")
	await _lines([
		["[ Enregistrement — S. REED — 11/11 — 23 h 40 ]", 2.5],
		["Sarah : « Je m'appelle Sarah Reed. Infirmière en neurologie. »", 3.2],
		["Sarah : « Depuis juillet, le Dr Vance teste le Projet ECHO sur des patients qui n'ont jamais consenti. Des comateux. Des enfants. »", 5.0],
		["Sarah : « ECHO fait repousser les tissus. Mais la régénération ne s'arrête jamais. Et quand le corps meurt… il se relève. »", 5.0],
		["Sarah : « Ils ont vendu la molécule. Des milliers de doses partent cette nuit. »", 3.8],
		["Sarah : « Je vais couper la sécurité du 8e et ouvrir les cellules. Les enfants, au moins, ne finiront pas dans une caisse. »", 5.0],
		["Sarah : « Le coffre de Vance contient la clé de l'ascenseur de direction. Code : 0-3-0-9. Le jour où ils ont piqué Élias. »", 5.0],
		["Sarah : « Si tout tourne mal… je fermerai le bâtiment. Moi avec. »", 3.8],
		["[ Un choc hors champ. Sarah se retourne. L'image se fige. ]", 3.0],
	])
	Audio.set_loop("phone_static", 0.0, 0.3, "SFX")
	if scr:
		scr.material_override = Mats.get_mat("screen_error")
	GameState.add_document("doc_video")
	GameState.set_flag("sarah_video_seen", true)
	_end_cutscene(cam)
	_lock(false)
	_busy = false
	_say("Thomas : « Sarah… c'est toi qui as tout ouvert. Et tout fermé. »", 4.0)
	game.autosave("vidéo de Sarah")


func _colossus_breakout() -> void:
	if GameState.get_flag("colossus_free"):
		return
	GameState.set_flag("colossus_free", true)
	await _wait(1.8)
	var c := _enemy("f8_colossus")
	Audio.play_3d("colossus_roar", (c.global_position if c else Vector3(-18, 34, -21)) + Vector3.UP * 2.5, 8.0, 0.0, 90.0, 10.0)
	_shake(0.6)
	await _wait(1.2)
	var glass: BreakableGlass = facility.nodes.get("glass_f8_c7")
	if glass:
		glass.shatter()
	var door: Door = facility.doors.get("f8_colossus_door")
	if door and c:
		door.smash(c)
	if c:
		c.activate_hunt()
	Audio.play_music("music_boss", 0.7, 1.0)
	_say("COURS ! L'ascenseur de direction, à l'est du couloir !", 3.5)


# --- 11e étage : Sarah ---------------------------------------------------------------

func _sarah_scene() -> void:
	var sarah := _enemy("f11_sarah") as SarahBoss
	if sarah == null or GameState.get_flag("sarah_talked") or _busy:
		return
	_busy = true
	GameState.set_flag("sarah_talked", true)
	_lock(true)
	var cam := _cutscene_camera(facility.anchors["sarah_cam"], facility.anchors["sarah_look"])
	Audio.stop_all_loops(2.0)
	await _lines([
		["Thomas : « Sarah ! »", 1.8],
		["Sarah (dans un souffle) : « …Thomas. Tu n'aurais jamais dû venir. »", 3.6],
		["Thomas : « Je te sors d'ici. Tiens bon. »", 2.6],
		["Sarah : « Regarde mon bras. C'est trop tard. Ça pousse… à l'intérieur. »", 3.8],
		["Sarah : « Tout est au 12e. Des milliers de doses. Ils viennent les chercher cette nuit. »", 4.2],
	])
	var door: Door = facility.doors.get("stair_c_11")
	if door:
		door.set_lock(Door.Lock.NONE)
	GameState.add_item("key_main_lab", 1)
	GameState.show_message("Sarah vous donne sa carte d'accès — Niveau 5. L'escalier C est déverrouillé.", 4.0)
	Audio.play_2d("pickup_key", -4.0)
	await _lines([
		["Sarah : « Prends ma carte. L'escalier C est ouvert. Là-haut, une console : le protocole Oméga. »", 4.6],
		["Sarah : « Quand tu arriveras en haut… ne me cherche pas. »", 3.4],
		["Sarah : « Thomas… recule. RECULE ! »", 2.4],
	])
	GameState.set_flag("sarah_boss_started", true)
	game.autosave("Sarah")
	sarah.begin_mutation()
	_shake(0.5)
	Audio.play_music("music_boss", 0.9, 1.0)
	_boss_bar("SARAH", sarah.hp, sarah.max_hp)
	await _wait(1.2)
	_end_cutscene(cam)
	_lock(false)
	_busy = false


func _on_sarah_hesitated(n: int) -> void:
	if n == 1:
		_say("Sarah : « Tho…mas… Je suis là… Je suis encore là… »", 4.0)
	else:
		_say("Sarah : « Pardon… Pardon, petit frère… Fais-le. »", 4.5)


func _sarah_defeated() -> void:
	if GameState.get_flag("sarah_dead"):
		return
	GameState.set_flag("sarah_dead", true)
	Audio.play_music("music_boss", 0.0, 3.0)
	_hide_boss_bar()
	await _wait(2.5)
	await _lines([
		["Sarah (redevenue elle-même, un instant) : « …Tu es venu quand même. Têtu. »", 4.0],
		["Sarah : « Détruis tout. Promets-le-moi. »", 3.2],
		["Thomas : « …Je te le promets. »", 2.6],
	])
	game.autosave("adieux")


# --- 12e étage : le Patient Zéro, l'autodestruction -------------------------------------

func _zero_intercom(point: EventPoint) -> void:
	if GameState.get_flag("zero_talked") or _busy:
		return
	_busy = true
	GameState.set_flag("zero_talked", true)
	Audio.play_2d("relay_click", -4.0)
	await _lines([
		["Élias (interphone) : « Tu n'es pas un médecin. Tu es… le frère. Tu as ses yeux. »", 4.2],
		["Élias : « Sarah venait la nuit. Elle me lisait des histoires, pour que je n'oublie pas mon nom. »", 4.6],
		["Élias : « Toutes ces doses… Ce sont mes enfants, Thomas. Ils vont vivre pour toujours. »", 4.4],
		["Élias : « Ne touche pas à la console. »", 2.6],
	])
	_busy = false


func _self_destruct_console(point: EventPoint) -> void:
	if GameState.get_flag("self_destruct") or _busy:
		return
	if not GameState.get_flag("zero_dead"):
		if GameState.get_flag("zero_released"):
			GameState.show_message("La console refuse la commande tant que le sujet 0 est hors de sa cellule.", 3.0)
			return
		_release_zero()
		return
	_engage_self_destruct()


func _release_zero() -> void:
	var zero := _enemy("f12_zero") as PatientZero
	if zero == null:
		return
	_busy = true
	game.autosave("console Oméga")
	GameState.set_flag("zero_released", true)
	GameState.show_message("PROTOCOLE OMÉGA — Confirmation requise…", 2.5)
	_set_floor_alert(12, true)
	await _wait(1.0)
	Audio.play_3d("zero_scream", zero.global_position + Vector3.UP * 1.7, 8.0, 0.0, 70.0, 8.0)
	_say("Élias : « NON ! PAS MES ENFANTS ! »", 3.0)
	await _wait(0.8)
	var glass: BreakableGlass = facility.nodes.get("glass_f12_cell")
	if glass:
		glass.shatter()
	_shake(0.6)
	zero.release()
	Audio.play_music("music_boss", 1.0, 1.0)
	_boss_bar("PATIENT ZÉRO — ÉLIAS BRANDT", zero.hp, zero.max_hp)
	_busy = false


## À mi-vie, le cri du Patient Zéro brise deux cuves : des sujets en sortent.
func _summon_mutants() -> void:
	var spots: Array = facility.anchors.get("mutant_spawns", [])
	var i := 0
	for s in spots:
		var id := "f12_mutant_%d" % i
		i += 1
		if GameState.dead_enemies.has(id):
			continue
		facility.spawns[id] = {"type": "hollow", "variant": "experimental", "pos": s, "rot": 0.0, "patrol": [], "floor": 12, "event": true, "flag": "__never"}
		var e: Enemy = game.spawn_enemy(id)
		if e:
			# À peine sortis des cuves : encore faibles
			e.hp = e.max_hp * 0.6
			e.activate_hunt()
		Audio.play_3d("glass_crash", (s as Vector3) + Vector3.UP * 1.5, 6.0, 0.05, 40.0, 6.0)
	_say("Les cuves éclatent. Des sujets en sortent en titubant.", 3.0)


func _zero_defeated() -> void:
	if GameState.get_flag("zero_dead"):
		return
	GameState.set_flag("zero_dead", true)
	Audio.play_music("music_boss", 0.0, 3.0)
	_hide_boss_bar()
	await _wait(2.0)
	await _lines([
		["Élias : « …Léa… Elle s'appelle… Léa. »", 3.4],
		["Thomas : « Repose-toi, Élias. »", 2.6],
	])
	game.autosave("Patient Zéro")
	_say("La console du poste de commande est libre.", 3.0)


func _engage_self_destruct() -> void:
	GameState.set_flag("self_destruct", true)
	GameState.refresh_objective()
	Audio.play_2d("keypad_success", -2.0)
	_say("HAUT-PARLEURS : « PROTOCOLE OMÉGA ENGAGÉ. DESTRUCTION DE L'INSTALLATION DANS QUATRE MINUTES. »", 5.0)
	# Les monstres restants sont libérés ; le -1 est envahi
	for id in ["b1_esc1", "b1_esc2", "b1_esc3"]:
		var e: Enemy = game.spawn_enemy(id)
		if e:
			e.set_state(Enemy.State.PATROL)
	var c := _enemy("f8_colossus")
	if c and not c.is_dead():
		c.place(facility.anchors["colossus_escape"], -PI * 0.5)
		c.passive = false
		c.set_state(Enemy.State.IDLE)
	_start_countdown(true)
	game.autosave("autodestruction")


func _start_countdown(fresh: bool) -> void:
	countdown = COUNTDOWN[clampi(Settings.difficulty, 0, 2)]
	for lv in [12, 8, -1]:
		_set_floor_alert(lv, true)
	_alarm(true)
	if not fresh:
		_say("L'autodestruction est engagée. Il faut sortir. Maintenant.", 3.0)


func _set_floor_alert(level: int, on: bool) -> void:
	for zone_name in facility.zone_lights:
		var def: Dictionary = Facility.ZONES.get(zone_name, {})
		if int(def.get("floor", -99)) != level:
			continue
		for l in facility.zone_lights[zone_name]:
			var f := l as LightFixture
			if f.light and on:
				f.light.light_color = Color(1.0, 0.16, 0.1)
				if f.mode != LightFixture.Mode.OFF:
					f.set_mode(LightFixture.Mode.PULSE)


func _alarm(on: bool) -> void:
	_alarm_on = on
	Audio.set_loop("alarm", 0.45 if on else 0.0, 0.5, "SFX")


# --- Fin ------------------------------------------------------------------------------

func play_ending() -> void:
	if GameState.get_flag("game_complete"):
		return
	GameState.set_flag("game_complete", true)
	countdown = -1.0
	if GameState.ui:
		GameState.ui.set_countdown(-1.0)
	_lock(true)
	_alarm(false)
	var p := _player()
	if p:
		p.controls_enabled = false
		p.velocity = Vector3.ZERO
	await _wait(0.8)
	var cam := _cutscene_camera(facility.anchors["ending_cam"], facility.anchors["ending_look"])
	if p:
		p.place(facility.anchors["ending_player"], PI)
	facility.moon.visible = true
	await _wait(1.5)
	# L'explosion : étage par étage, du 12e aux sous-sols
	var center: Vector3 = facility.anchors["explosion_center"]
	for i in 5:
		var y := 48.0 - i * 10.0
		_fireball(Vector3(randf_range(-20, 20), y, -2.0))
		Audio.play_2d("explosion", 4.0 - i * 0.5, randf_range(0.7, 0.9))
		_shake(0.9)
		await _wait(0.45)
	Audio.play_2d("explosion", 8.0, 0.55)
	_fireball(center + Vector3(0, 0, 3.0), 3.0)
	_shake(1.2)
	await _wait(4.0)
	Audio.stop_all_loops(3.0)
	Audio.set_loop("amb_rain", 0.8, 3.0)
	await _wait(5.0)
	Audio.play_2d("phone_vibrate", -2.0)
	_say("Appel entrant : NUMÉRO INCONNU", 2.6)
	await _wait(3.0)
	Audio.set_loop("phone_static", 0.2, 0.5, "SFX")
	await _lines([
		["Thomas : « …Allô ? »", 2.0],
		["Voix : « Vous avez détruit notre laboratoire. »", 3.2],
		["Thomas : « Qui êtes-vous ? »", 2.2],
		["Voix : « Vous n'avez aucune idée de ce que vous venez d'empêcher. »", 4.0],
	])
	Audio.set_loop("phone_static", 0.0, 0.3, "SFX")
	Audio.play_2d("phone_hangup", -2.0)
	await _wait(1.5)
	if GameState.ui:
		GameState.ui.fade_to_black(2.5)
	await _wait(3.0)
	if GameState.ui:
		GameState.ui.show_title_card("BLACKWOOD HOSPITAL", "FIN DU CHAPITRE 1", 5.0)
	await _wait(5.6)
	_end_cutscene(cam)
	Audio.play_music("music_end", 0.8, 2.0)
	if GameState.ui:
		GameState.ui.show_ending()


func _fireball(pos: Vector3, scale: float = 1.0) -> void:
	var light := OmniLight3D.new()
	light.light_color = Color(1.0, 0.55, 0.2)
	light.light_energy = 12.0 * scale
	light.omni_range = 30.0 * scale
	light.shadow_enabled = false
	game.add_child(light)
	light.global_position = pos + Vector3(0, 0, 4.0)
	var ball := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 2.5 * scale
	sm.height = 5.0 * scale
	ball.mesh = sm
	ball.material_override = Mats._emissive(Color(1.0, 0.45, 0.12), 6.0)
	game.add_child(ball)
	ball.global_position = pos + Vector3(0, 0, 1.5)
	ball.scale = Vector3.ONE * 0.2
	FX.sparks(game, pos + Vector3(0, 0, 2.0), 80)
	FX.dust(game, pos + Vector3(0, 0, 2.0), 60, 3.0)
	var tw := ball.create_tween()
	tw.tween_property(ball, "scale", Vector3.ONE * 2.2, 0.9).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(light, "light_energy", 0.0, 2.5)
	tw.tween_property(ball, "scale", Vector3.ONE * 0.01, 1.6)
	tw.tween_callback(ball.queue_free)
	tw.tween_callback(light.queue_free)


# --- Caméra de cinématique --------------------------------------------------------------

func _cutscene_camera(from: Vector3, look: Vector3) -> Camera3D:
	var cam := Camera3D.new()
	cam.fov = 55.0
	cam.far = 400.0
	game.add_child(cam)
	cam.global_position = from
	cam.look_at(look, Vector3.UP)
	cam.make_current()
	return cam


func _end_cutscene(cam: Camera3D) -> void:
	if game.camera_rig:
		game.camera_rig.cam.make_current()
	if is_instance_valid(cam):
		cam.queue_free()


# --- Boss : barre de vie ---------------------------------------------------------------

func _boss_bar(title: String, hp: float, max_hp: float) -> void:
	if GameState.ui:
		GameState.ui.show_boss_bar(title, hp, max_hp)


func _hide_boss_bar() -> void:
	if GameState.ui:
		GameState.ui.hide_boss_bar()


func _on_boss_hp(hp: float, mx: float) -> void:
	if GameState.ui:
		GameState.ui.update_boss_bar(hp, mx)


# --- Compte à rebours, ambiance ------------------------------------------------------------

func _process(delta: float) -> void:
	if countdown >= 0.0 and not GameState.get_flag("game_complete"):
		var p := _player()
		if p and not p.is_dead and not game.traveling:
			countdown -= delta
		if GameState.ui:
			GameState.ui.set_countdown(countdown)
		if countdown <= 0.0:
			countdown = -1.0
			_time_up()
	if not GameState.get_flag("intro_done"):
		return
	var zone := GameState.current_zone
	_ambient_t -= delta
	if _ambient_t <= 0.0:
		_ambient_t = randf_range(40.0, 90.0)
		var p2 := _player()
		if p2 and zone != "exterior":
			var dir := Vector3(randf_range(-1, 1), 0, randf_range(-1, 1)).normalized()
			var snd: String = ["distant_thump", "metal_creak", "distant_thump", "pipe_groan"][randi() % 4]
			Audio.play_3d(snd, p2.global_position + dir * randf_range(10.0, 18.0) + Vector3.UP * 2.0, -4.0, 0.1, 40.0, 8.0)
	_lightning_t -= delta
	if _lightning_t <= 0.0:
		_lightning_t = randf_range(25.0, 60.0)
		if bool(Facility.ZONES.get(zone, {}).get("moon", false)) and not GameState.get_flag("game_complete"):
			_lightning(zone == "exterior")


func _time_up() -> void:
	if GameState.ui:
		GameState.ui.set_countdown(-1.0)
	Audio.play_2d("explosion", 8.0, 0.6)
	_shake(1.2)
	if GameState.ui:
		GameState.ui.fade_to_black(0.3)
	var p := _player()
	if p and not p.is_dead:
		p.take_damage(9999.0, p.global_position + Vector3.UP)


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

class_name DebugTools
extends RefCounted
## Mode DEBUG : commandes de test (console F1) et état partagé (God Mode, IA
## figée, éclairage de travail). Activé dans Options > Jeu > Mode DEBUG, ou
## avec l'argument de lancement « --debug ».
##
## Commandes : help, god, ammo, weapon, tp, spawn, killall, ai, light, heal,
## flag, pos.

static var god_mode := false
static var ai_enabled := true
static var work_light := false
static var _spawned := 0
static var _saved_env := {}

const SPAWN_TYPES := ["patient", "nurse", "guard", "neuro", "experimental", "veilleur", "neonatal", "surgeon", "colossus"]
## Lieux de téléportation : étage → point du couloir central (devant les ascenseurs).
const TP_POINTS := {
	-2: Vector3(0.0, -8.0, -14.0), -1: Vector3(0.0, -4.0, -14.0), 0: Vector3(0.0, 0.0, -14.0),
	1: Vector3(0.0, 4.0, -14.0), 3: Vector3(0.0, 12.0, -14.0), 6: Vector3(0.0, 24.0, -14.0),
	8: Vector3(0.0, 32.0, -14.0), 11: Vector3(0.0, 44.0, -14.0), 12: Vector3(0.0, 48.0, -14.0),
}


static func enabled() -> bool:
	return Settings.debug_mode or "--debug" in OS.get_cmdline_user_args()


static func _game() -> Game:
	return GameState.game as Game


static func _player() -> Player:
	return GameState.player as Player


## Exécute une ligne de commande ; retourne le texte à afficher.
static func run(line: String) -> String:
	var parts := line.strip_edges().split(" ", false)
	if parts.is_empty():
		return ""
	var cmd := parts[0].to_lower()
	var args: Array[String] = []
	for i in range(1, parts.size()):
		args.append(parts[i])
	if _game() == null or _player() == null:
		if cmd != "help":
			return "Aucune partie en cours."
	match cmd:
		"help", "aide", "?":
			return help()
		"god":
			return toggle_god()
		"ammo":
			return give_ammo()
		"weapon", "arme":
			return give_weapon(args[0] if args.size() > 0 else "all")
		"tp":
			return teleport(args)
		"spawn":
			return spawn_enemy(args[0] if args.size() > 0 else "patient")
		"killall":
			return kill_all(args.size() > 0 and args[0] == "tout")
		"ai", "ia":
			return toggle_ai()
		"light", "lumiere", "lumière":
			return toggle_light()
		"heal", "soin":
			GameState.set_hp(GameState.MAX_HP)
			return "PV restaurés : %d." % int(GameState.hp)
		"flag":
			if args.is_empty():
				return "Usage : flag NOM [0|1]"
			var on := args.size() < 2 or args[1] != "0"
			GameState.set_flag(args[0], on)
			return "Drapeau %s = %s." % [args[0], on]
		"pos":
			var p := _player().global_position
			return "Position %s · étage %d · zone %s" % [p.snapped(Vector3.ONE * 0.01), Facility.floor_at(p.y + 0.2), GameState.current_zone]
	return "Commande inconnue : « %s ». Tapez help." % cmd


static func help() -> String:
	return "\n".join([
		"god — God Mode (invulnérable) : %s" % ("ACTIF" if god_mode else "inactif"),
		"ammo — munitions pleines pour toutes les armes (GiveAmmo)",
		"weapon [baton|pistol|shotgun|smg|magnum|all] — donner une arme (GiveWeapon)",
		"tp ÉTAGE | tp X Y Z — téléportation (étages : -2 -1 0 1 3 6 8 11 12)",
		"spawn TYPE — faire apparaître une créature devant soi (SpawnEnemy)",
		"      types : " + ", ".join(SPAWN_TYPES),
		"killall [tout] — tuer les créatures de l'étage (ou de tout l'hôpital)",
		"ai — figer / relancer l'IA (ToggleAI) : %s" % ("active" if ai_enabled else "FIGÉE"),
		"light — éclairage de travail (ToggleLighting) : %s" % ("ACTIF" if work_light else "inactif"),
		"heal — PV au maximum · flag NOM [0|1] · pos — position actuelle",
		"F3 — infos : FPS, position, zone, états de l'IA, nombre de créatures",
	])


static func toggle_god() -> String:
	god_mode = not god_mode
	return "God Mode %s." % ("activé : Thomas ne subit plus aucun dégât" if god_mode else "désactivé")


static func give_ammo() -> String:
	for ammo in [["ammo_9mm", 60], ["ammo_shells", 20], ["ammo_magnum", 12]]:
		GameState.add_item(String(ammo[0]), int(ammo[1]))
	for w in GameState.weapons:
		GameState.set_weapon_mag(String(w), int(WeaponDB.get_weapon(String(w)).get("mag", 0)))
	return "Munitions ajoutées, chargeurs pleins."


static func give_weapon(id: String) -> String:
	var ids: Array = WeaponDB.ORDER if id == "all" or id == "tout" else [id]
	var given: Array[String] = []
	for w in ids:
		if WeaponDB.is_weapon(String(w)):
			GameState.give_weapon(String(w))
			given.append(String(w))
	if given.is_empty():
		return "Arme inconnue : %s (baton, pistol, shotgun, smg, magnum, all)." % id
	return "Arme(s) : %s." % ", ".join(given)


static func teleport(args: Array[String]) -> String:
	var target := Vector3.INF
	if args.size() >= 3:
		target = Vector3(float(args[0]), float(args[1]), float(args[2]))
	elif args.size() == 1 and args[0].is_valid_int() and TP_POINTS.has(int(args[0])):
		target = TP_POINTS[int(args[0])]
	if target == Vector3.INF:
		return "Usage : tp ÉTAGE (-2 -1 0 1 3 6 8 11 12) ou tp X Y Z"
	var game := _game()
	var p := _player()
	p.place(target + Vector3(0, 0.1, 0), p.facing_yaw)
	game.facility.set_active_floor(Facility.floor_at(target.y + 0.2))
	game.zones.force_refresh()
	return "Téléporté en %s (étage %d)." % [target, Facility.floor_at(target.y + 0.2)]


static func spawn_enemy(kind: String) -> String:
	if not kind in SPAWN_TYPES:
		return "Type inconnu : %s. Types : %s" % [kind, ", ".join(SPAWN_TYPES)]
	var game := _game()
	var p := _player()
	var fwd := Basis(Vector3.UP, p.facing_yaw) * Vector3.FORWARD
	var pos := p.global_position + fwd * 4.0
	var grid := game.facility.nav_grid_at(pos)
	if grid:
		var c := grid.nearest_free(grid.world_to_cell(pos), 12)
		if c.x >= 0:
			var w := grid.cell_to_world(c)
			pos = Vector3(w.x, p.global_position.y, w.z)
	_spawned += 1
	var id := "debug_%d" % _spawned
	var hollow := kind in ["patient", "nurse", "guard", "neuro", "experimental"]
	var def := {"type": "hollow" if hollow else kind, "pos": pos + Vector3(0, 0.05, 0), "rot": p.facing_yaw + PI,
		"patrol": [], "floor": Facility.floor_at(pos.y + 0.2), "event": true, "flag": "__debug"}
	if hollow:
		def["variant"] = kind
	game.facility.spawns[id] = def
	var e := game.spawn_enemy(id)
	if e == null:
		return "Apparition impossible."
	if e is Surgeon:
		(e as Surgeon).activate()
	elif e is BossHumanoid:
		(e as BossHumanoid).active = true
	return "%s apparu (%s) à %.1f m." % [kind, id, e.global_position.distance_to(p.global_position)]


static func kill_all(everywhere: bool) -> String:
	var game := _game()
	var pf := Facility.floor_at(_player().global_position.y + 0.2)
	var n := 0
	for id in game.enemies.keys():
		var e: Enemy = game.enemies[id]
		if e == null or not is_instance_valid(e) or e.is_dead():
			continue
		if not everywhere and Facility.floor_at(e.global_position.y + 0.2) != pf:
			continue
		e.die()
		n += 1
	return "%d créature(s) tuée(s)%s." % [n, "" if everywhere else " sur cet étage"]


static func toggle_ai() -> String:
	ai_enabled = not ai_enabled
	var game := _game()
	if game:
		game.refresh_enemy_activity()
	return "IA %s." % ("relancée" if ai_enabled else "figée (les créatures ne bougent plus)")


## Éclairage de travail : lumière ambiante forte, brouillard coupé.
static func toggle_light() -> String:
	var game := _game()
	var env: Environment = game.facility.env
	work_light = not work_light
	if work_light:
		_saved_env = {"ambient": env.ambient_light_energy, "color": env.ambient_light_color,
			"fog": env.fog_enabled, "vfog": env.volumetric_fog_enabled}
		env.ambient_light_color = Color(0.9, 0.9, 0.9)
		env.ambient_light_energy = 1.6
		env.fog_enabled = false
		env.volumetric_fog_enabled = false
	elif not _saved_env.is_empty():
		env.ambient_light_energy = float(_saved_env.ambient)
		env.ambient_light_color = _saved_env.color
		env.fog_enabled = bool(_saved_env.fog)
		env.volumetric_fog_enabled = bool(_saved_env.vfog)
	return "Éclairage de travail %s." % ("activé" if work_light else "désactivé")


## Lignes d'information (overlay F3) : position, zone, créatures et leur état.
static func info_lines() -> String:
	var game := _game()
	var p := _player()
	if game == null or p == null:
		return ""
	var pos := p.global_position
	var alive := 0
	var near: Array = []
	for id in game.enemies:
		var e: Enemy = game.enemies[id]
		if e == null or not is_instance_valid(e) or e.is_dead():
			continue
		alive += 1
		var d := e.global_position.distance_to(pos)
		if d < 30.0:
			near.append([d, "%s %s %d PV %.0f m" % [id, e.ai_state_name(), int(e.hp), d]])
	near.sort_custom(func(a: Array, b: Array) -> bool: return float(a[0]) < float(b[0]))
	var lines: Array[String] = [
		"Position %s · étage %d · zone %s" % [pos.snapped(Vector3.ONE * 0.1), Facility.floor_at(pos.y + 0.2), GameState.current_zone],
		"PV %d · créatures vivantes %d / %d%s%s%s" % [int(GameState.hp), alive, game.enemies.size(),
			" · GOD" if god_mode else "", " · IA FIGÉE" if not ai_enabled else "", " · LUMIÈRE" if work_light else ""],
	]
	for i in mini(near.size(), 6):
		lines.append(String(near[i][1]))
	return "\n".join(lines)

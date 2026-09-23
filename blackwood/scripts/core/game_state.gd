extends Node
## État de la partie en cours. Le MONDE est partagé (drapeaux de progression,
## portes, objets ramassés, créatures mortes, documents, porte-clés commun) ;
## chaque joueur a ses propres données (PlayerData : santé, inventaire de 6
## emplacements, armes, lampe). L'API historique (hp, inventory, add_item…)
## s'applique au joueur de cette machine. Tout est sérialisé par la sauvegarde.

signal inventory_changed
signal flag_changed(flag: String, value: Variant)
signal hp_changed(hp: float, max_hp: float)
signal message(text: String, duration: float)
signal document_collected(doc_id: String)
signal objective_changed(text: String)
signal noise_emitted(pos: Vector3, radius: float, source: Node)
signal weapons_changed
## Coop : les données d'un joueur ont changé (le serveur les recopie chez lui).
signal player_data_changed(slot: int, what: String)
## Le porte-clés commun a changé.
signal key_ring_changed

const MAX_HP := 100.0
const INVENTORY_SLOTS := 6
const MAG_SIZE := 12

## Données des joueurs : numéro (1 = hôte / solo, 2 = invité) → PlayerData.
var players := {}
## Joueur de cette machine (1 en solo et chez l'hôte, 2 chez l'invité).
var local_slot := 1
## Porte-clés COMMUN : les objets clés, cartes, fusibles, objets d'énigme
## (kind « key ») sont partagés entre les joueurs et n'occupent pas d'emplacement.
var key_items: Array = []
var documents: Array = []
var flags := {}
var taken_pickups := {}
var door_states := {}
var dead_enemies := {}
var playtime := 0.0
var current_zone := "exterior"

# Références d'exécution (non sauvegardées)
var game: Node = null
var player: Node = null
var ui: Node = null

var _last_objective := ""
var _bound: PlayerData = null
## Coop : joueur pour le compte duquel le serveur exécute une interaction. Ses
## messages et ses écrans (clavier, document…) s'affichent chez lui.
var actor: Node = null

# --- Données du joueur local (compatibilité : l'API historique vise le joueur
# de cette machine ; le serveur agit sur un autre joueur via les *_for) ------

var local: PlayerData:
	get:
		if not players.has(local_slot):
			players[local_slot] = PlayerData.new(local_slot)
		return players[local_slot]

var hp: float:
	get:
		return local.hp
	set(value):
		local.hp = value

var inventory: Array:
	get:
		return local.inventory
	set(value):
		local.inventory = value

var weapons: Dictionary:
	get:
		return local.weapons
	set(value):
		local.weapons = value

var equipped: String:
	get:
		return local.equipped
	set(value):
		local.equipped = value

var flashlight_battery: float:
	get:
		return local.flashlight_battery
	set(value):
		local.flashlight_battery = value

var flashlight_on: bool:
	get:
		return local.flashlight_on
	set(value):
		local.flashlight_on = value


func _ready() -> void:
	reset()


func reset() -> void:
	players.clear()
	players[1] = PlayerData.new(1)
	local_slot = 1
	documents.clear()
	key_items.clear()
	flags.clear()
	taken_pickups.clear()
	door_states.clear()
	dead_enemies.clear()
	playtime = 0.0
	current_zone = "exterior"
	_last_objective = ""
	bind_local()


## Relie les signaux historiques (HUD, inventaire…) aux données du joueur local.
func bind_local() -> void:
	if _bound and _bound.changed.is_connected(_on_local_changed):
		_bound.changed.disconnect(_on_local_changed)
	_bound = local
	_bound.changed.connect(_on_local_changed)
	for pd in players.values():
		var d := pd as PlayerData
		if not d.changed.is_connected(_on_any_changed):
			d.changed.connect(_on_any_changed.bind(d))
	inventory_changed.emit()
	weapons_changed.emit()
	hp_changed.emit(hp, MAX_HP)


func _on_local_changed(what: String) -> void:
	match what:
		"hp":
			hp_changed.emit(hp, MAX_HP)
		"inventory":
			inventory_changed.emit()
			refresh_objective()
		"weapons":
			weapons_changed.emit()


func _on_any_changed(what: String, pd: PlayerData) -> void:
	player_data_changed.emit(pd.slot, what)


## Données d'un joueur (numéro), créées au besoin.
func data(slot: int) -> PlayerData:
	if not players.has(slot):
		players[slot] = PlayerData.new(slot)
		(players[slot] as PlayerData).changed.connect(_on_any_changed.bind(players[slot]))
	return players[slot]


## Données du joueur représenté par ce nœud (Player), ou du joueur local.
func data_for(node: Node) -> PlayerData:
	if node and node.get("slot") != null:
		return data(int(node.get("slot")))
	return local


# --- Armes -----------------------------------------------------------------

func has_weapon(id: String) -> bool:
	return local.has_weapon(id)


func give_weapon(id: String, loaded: bool = true) -> void:
	give_weapon_for(local, id, loaded)


func give_weapon_for(pd: PlayerData, id: String, loaded: bool = true) -> void:
	if not WeaponDB.is_weapon(id):
		return
	pd.give_weapon(id, loaded)
	set_flag("has_" + id, true)


func weapon_mag(id: String = "") -> int:
	return local.weapon_mag(id)


func set_weapon_mag(id: String, n: int) -> void:
	local.set_weapon_mag(id, n)


## Munitions en réserve pour l'arme (0 pour la matraque).
func weapon_reserve(id: String = "") -> int:
	return local.weapon_reserve(id)


# --- Drapeaux -----------------------------------------------------------

func set_flag(flag: String, value: Variant = true) -> void:
	if flags.get(flag) == value:
		return
	flags[flag] = value
	flag_changed.emit(flag, value)
	refresh_objective()


func get_flag(flag: String, default: Variant = false) -> Variant:
	return flags.get(flag, default)


# --- Santé ---------------------------------------------------------------

func set_hp(value: float) -> void:
	local.set_hp(value)


func health_status() -> String:
	if hp > 66.0:
		return "fine"
	if hp > 30.0:
		return "caution"
	return "danger"


# --- Inventaire ----------------------------------------------------------

## Ajoute un objet au joueur local. Retourne la quantité non rangée (0 = tout rangé).
func add_item(id: String, count: int = 1) -> int:
	return add_item_for(local, id, count)


## Ajoute un objet à un joueur : les objets clés vont au porte-clés commun.
func add_item_for(pd: PlayerData, id: String, count: int = 1) -> int:
	if ItemDB.kind(id) == "key":
		add_key(id)
		return 0
	return pd.add_item(id, count)


func add_key(id: String) -> void:
	if not id in key_items:
		key_items.append(id)
		key_ring_changed.emit()
	inventory_changed.emit()
	refresh_objective()


## Vérifie qu'un objet peut entrer entièrement dans l'inventaire.
func can_add(id: String, count: int = 1) -> bool:
	return can_add_for(local, id, count)


func can_add_for(pd: PlayerData, id: String, count: int = 1) -> bool:
	if ItemDB.kind(id) == "key":
		return true
	return pd.can_add(id, count)


func remove_item(id: String, count: int = 1) -> bool:
	return remove_item_for(local, id, count)


func remove_item_for(pd: PlayerData, id: String, count: int = 1) -> bool:
	if ItemDB.kind(id) == "key":
		if not id in key_items:
			return false
		key_items.erase(id)
		key_ring_changed.emit()
		inventory_changed.emit()
		refresh_objective()
		return true
	return pd.remove_item(id, count)


func count_item(id: String) -> int:
	if id in key_items:
		return 1
	return local.count_item(id)


func has_item(id: String) -> bool:
	return count_item(id) > 0


## Objet possédé par ce joueur (ou présent sur le porte-clés commun).
func has_item_for(pd: PlayerData, id: String) -> bool:
	return id in key_items or pd.has_item(id)


func free_slots() -> int:
	return local.free_slots()


# --- Documents -----------------------------------------------------------

func add_document(doc_id: String) -> bool:
	if doc_id in documents:
		return false
	documents.append(doc_id)
	document_collected.emit(doc_id)
	refresh_objective()
	return true


func has_document(doc_id: String) -> bool:
	return doc_id in documents


# --- Divers ----------------------------------------------------------------

## Message à l'écran du joueur qui agit (ou du joueur local).
func show_message(text: String, duration: float = 3.0) -> void:
	if actor and actor.get("is_local") == false and actor.has_method("notify"):
		actor.notify(text, duration)
		return
	message.emit(text, duration)


## Message sur l'écran de cette machine, quel que soit le joueur qui agit.
func show_local_message(text: String, duration: float = 3.0) -> void:
	message.emit(text, duration)


## Coop : si « player » est la réplique d'un joueur distant, l'écran demandé
## (clavier, document, ascenseur…) s'ouvre chez lui. Retourne true dans ce cas.
func open_remote_ui(player: Node, kind: String, args: Array) -> bool:
	if player == null or player.get("is_local") != false:
		return false
	var c := Coop.instance()
	if c:
		c.open_ui_for(int(player.get("slot")), kind, args)
	return true


## Un bruit se propage : les ennemis à portée l'entendent.
func emit_noise(pos: Vector3, radius: float, source: Node = null) -> void:
	noise_emitted.emit(pos, radius, source)


func refresh_objective() -> void:
	var text := Objectives.current(self)
	if text != _last_objective:
		_last_objective = text
		objective_changed.emit(text)


func objective() -> String:
	return Objectives.current(self)


# --- Sérialisation ---------------------------------------------------------

## État complet : le monde, le joueur 1 à plat (format historique) et les
## autres joueurs dans « players ».
func to_dict() -> Dictionary:
	var d := data(1).to_dict()
	d.merge({
		"keys": key_items.duplicate(),
		"documents": documents.duplicate(),
		"flags": flags.duplicate(true),
		"taken_pickups": taken_pickups.duplicate(),
		"door_states": door_states.duplicate(true),
		"dead_enemies": dead_enemies.duplicate(),
		"playtime": playtime,
		"current_zone": current_zone,
	}, true)
	var others := {}
	for slot in players:
		if int(slot) != 1:
			others[str(slot)] = (players[slot] as PlayerData).to_dict()
	if not others.is_empty():
		d["players"] = others
	return d


func from_dict(d: Dictionary) -> void:
	reset()
	for kid in d.get("keys", []):
		key_items.append(String(kid))
	# Clés rangées dans les emplacements (anciennes sauvegardes) → porte-clés
	var to_ring := func(id: String) -> void:
		if not id in key_items:
			key_items.append(id)
	data(1).from_dict(d, to_ring)
	var others: Dictionary = d.get("players", {})
	for slot in others:
		data(int(slot)).from_dict(others[slot], to_ring)
	for doc in d.get("documents", []):
		documents.append(String(doc))
	flags = (d.get("flags", {}) as Dictionary).duplicate(true)
	taken_pickups = (d.get("taken_pickups", {}) as Dictionary).duplicate()
	door_states = (d.get("door_states", {}) as Dictionary).duplicate(true)
	dead_enemies = (d.get("dead_enemies", {}) as Dictionary).duplicate()
	playtime = float(d.get("playtime", 0.0))
	current_zone = String(d.get("current_zone", "exterior"))
	bind_local()
	refresh_objective()

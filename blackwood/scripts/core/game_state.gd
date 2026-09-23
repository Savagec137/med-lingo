extends Node
## État de la partie en cours : santé, inventaire (6 emplacements), documents,
## drapeaux de progression, portes, objets ramassés, ennemis morts.
## Tout ce qui est ici est sérialisé par la sauvegarde.

signal inventory_changed
signal flag_changed(flag: String, value: Variant)
signal hp_changed(hp: float, max_hp: float)
signal message(text: String, duration: float)
signal document_collected(doc_id: String)
signal objective_changed(text: String)
signal noise_emitted(pos: Vector3, radius: float, source: Node)

const MAX_HP := 100.0
const INVENTORY_SLOTS := 6
const MAG_SIZE := 12

var hp := MAX_HP
var inventory: Array = []
var documents: Array = []
var flags := {}
var taken_pickups := {}
var door_states := {}
var dead_enemies := {}
var flashlight_battery := 100.0
var flashlight_on := false
var pistol_mag := 0
var playtime := 0.0
var current_zone := "parking"

# Références d'exécution (non sauvegardées)
var game: Node = null
var player: Node = null
var ui: Node = null

var _last_objective := ""


func _ready() -> void:
	reset()


func reset() -> void:
	hp = MAX_HP
	inventory.clear()
	for i in INVENTORY_SLOTS:
		inventory.append({"id": "", "count": 0})
	documents.clear()
	flags.clear()
	taken_pickups.clear()
	door_states.clear()
	dead_enemies.clear()
	flashlight_battery = 100.0
	flashlight_on = false
	pistol_mag = 0
	playtime = 0.0
	current_zone = "parking"
	_last_objective = ""
	inventory_changed.emit()
	hp_changed.emit(hp, MAX_HP)


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
	hp = clampf(value, 0.0, MAX_HP)
	hp_changed.emit(hp, MAX_HP)


func health_status() -> String:
	if hp > 66.0:
		return "fine"
	if hp > 30.0:
		return "caution"
	return "danger"


# --- Inventaire ----------------------------------------------------------

## Ajoute un objet. Retourne la quantité qui n'a pas pu être rangée (0 = tout rangé).
func add_item(id: String, count: int = 1) -> int:
	var remaining := count
	var stack := ItemDB.max_stack(id)
	for slot in inventory:
		if remaining <= 0:
			break
		if slot.id == id and slot.count < stack:
			var add := mini(stack - slot.count, remaining)
			slot.count += add
			remaining -= add
	for slot in inventory:
		if remaining <= 0:
			break
		if slot.id == "":
			var add := mini(stack, remaining)
			slot.id = id
			slot.count = add
			remaining -= add
	inventory_changed.emit()
	refresh_objective()
	return remaining


## Vérifie qu'un objet peut entrer entièrement dans l'inventaire.
func can_add(id: String, count: int = 1) -> bool:
	var space := 0
	var stack := ItemDB.max_stack(id)
	for slot in inventory:
		if slot.id == id:
			space += stack - slot.count
		elif slot.id == "":
			space += stack
	return space >= count


func remove_item(id: String, count: int = 1) -> bool:
	if count_item(id) < count:
		return false
	var remaining := count
	for i in range(inventory.size() - 1, -1, -1):
		var slot: Dictionary = inventory[i]
		if slot.id != id or remaining <= 0:
			continue
		var take := mini(slot.count, remaining)
		slot.count -= take
		remaining -= take
		if slot.count <= 0:
			slot.id = ""
			slot.count = 0
	inventory_changed.emit()
	refresh_objective()
	return true


func count_item(id: String) -> int:
	var total := 0
	for slot in inventory:
		if slot.id == id:
			total += slot.count
	return total


func has_item(id: String) -> bool:
	return count_item(id) > 0


func free_slots() -> int:
	var n := 0
	for slot in inventory:
		if slot.id == "":
			n += 1
	return n


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

func show_message(text: String, duration: float = 3.0) -> void:
	message.emit(text, duration)


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

func to_dict() -> Dictionary:
	return {
		"hp": hp,
		"inventory": inventory.duplicate(true),
		"documents": documents.duplicate(),
		"flags": flags.duplicate(true),
		"taken_pickups": taken_pickups.duplicate(),
		"door_states": door_states.duplicate(true),
		"dead_enemies": dead_enemies.duplicate(),
		"flashlight_battery": flashlight_battery,
		"flashlight_on": flashlight_on,
		"pistol_mag": pistol_mag,
		"playtime": playtime,
		"current_zone": current_zone,
	}


func from_dict(d: Dictionary) -> void:
	reset()
	hp = float(d.get("hp", MAX_HP))
	var inv: Array = d.get("inventory", [])
	for i in mini(inv.size(), INVENTORY_SLOTS):
		inventory[i] = {"id": String(inv[i].get("id", "")), "count": int(inv[i].get("count", 0))}
	for doc in d.get("documents", []):
		documents.append(String(doc))
	flags = d.get("flags", {}).duplicate(true)
	taken_pickups = d.get("taken_pickups", {}).duplicate()
	door_states = d.get("door_states", {}).duplicate(true)
	dead_enemies = d.get("dead_enemies", {}).duplicate()
	flashlight_battery = float(d.get("flashlight_battery", 100.0))
	flashlight_on = bool(d.get("flashlight_on", false))
	pistol_mag = int(d.get("pistol_mag", 0))
	playtime = float(d.get("playtime", 0.0))
	current_zone = String(d.get("current_zone", "parking"))
	inventory_changed.emit()
	hp_changed.emit(hp, MAX_HP)
	refresh_objective()

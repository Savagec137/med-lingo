class_name PlayerData
extends RefCounted
## Données d'UN joueur : santé, inventaire (6 emplacements), armes et chargeurs,
## lampe torche, état « à terre » de la coopération.
##
## Objets PERSONNELS (ici) : munitions, soins, piles, armes. Objets PARTAGÉS
## (porte-clés commun de GameState) : clés, cartes, fusibles, objets d'énigme.
## En solo il n'existe qu'une PlayerData ; en coop, une par joueur, tenue par le
## serveur (qui fait autorité) et recopiée chez son propriétaire.

signal changed(what: String)   # « hp », « inventory », « weapons », « flashlight », « state »

const MAX_HP := 100.0
const INVENTORY_SLOTS := 6
## Coop : temps passé à terre avant la mort (s) et santé après réanimation.
const BLEED_TIME := 30.0
const REVIVE_HP := 25.0

var slot := 1
var hp := MAX_HP
var inventory: Array = []
## Armes possédées : id → {"mag": balles dans le chargeur}.
var weapons := {}
var equipped := ""
var flashlight_on := false
var flashlight_battery := 100.0
## Coop : à terre (réanimable pendant BLEED_TIME), puis mort.
var downed := false
var bleed_t := 0.0
var dead := false


func _init(p_slot: int = 1) -> void:
	slot = p_slot
	reset()


func reset() -> void:
	hp = MAX_HP
	inventory.clear()
	for i in INVENTORY_SLOTS:
		inventory.append({"id": "", "count": 0})
	weapons.clear()
	equipped = ""
	flashlight_on = false
	flashlight_battery = 100.0
	downed = false
	bleed_t = 0.0
	dead = false


# --- Santé ---------------------------------------------------------------

func set_hp(value: float) -> void:
	hp = clampf(value, 0.0, MAX_HP)
	changed.emit("hp")


func is_active() -> bool:
	return not downed and not dead


# --- Inventaire (objets personnels) ---------------------------------------

## Ajoute un objet personnel. Retourne la quantité qui n'a pas pu être rangée.
func add_item(id: String, count: int = 1) -> int:
	var remaining := count
	var stack := ItemDB.max_stack(id)
	for s in inventory:
		if remaining <= 0:
			break
		if s.id == id and s.count < stack:
			var add := mini(stack - s.count, remaining)
			s.count += add
			remaining -= add
	for s in inventory:
		if remaining <= 0:
			break
		if s.id == "":
			var add := mini(stack, remaining)
			s.id = id
			s.count = add
			remaining -= add
	changed.emit("inventory")
	return remaining


func can_add(id: String, count: int = 1) -> bool:
	var space := 0
	var stack := ItemDB.max_stack(id)
	for s in inventory:
		if s.id == id:
			space += stack - s.count
		elif s.id == "":
			space += stack
	return space >= count


func remove_item(id: String, count: int = 1) -> bool:
	if count_item(id) < count:
		return false
	var remaining := count
	for i in range(inventory.size() - 1, -1, -1):
		var s: Dictionary = inventory[i]
		if s.id != id or remaining <= 0:
			continue
		var take := mini(s.count, remaining)
		s.count -= take
		remaining -= take
		if s.count <= 0:
			s.id = ""
			s.count = 0
	changed.emit("inventory")
	return true


func count_item(id: String) -> int:
	var total := 0
	for s in inventory:
		if s.id == id:
			total += s.count
	return total


func has_item(id: String) -> bool:
	return count_item(id) > 0


func free_slots() -> int:
	var n := 0
	for s in inventory:
		if s.id == "":
			n += 1
	return n


# --- Armes ---------------------------------------------------------------

func has_weapon(id: String) -> bool:
	return weapons.has(id)


func give_weapon(id: String, loaded: bool = true) -> void:
	if not WeaponDB.is_weapon(id):
		return
	if not weapons.has(id):
		weapons[id] = {"mag": int(WeaponDB.get_weapon(id).get("mag", 0)) if loaded else 0}
	if equipped == "" or equipped == "baton":
		equipped = id
	changed.emit("weapons")


func weapon_mag(id: String = "") -> int:
	var w := id if id != "" else equipped
	return int(weapons.get(w, {}).get("mag", 0))


func set_weapon_mag(id: String, n: int) -> void:
	if weapons.has(id):
		weapons[id]["mag"] = n
		changed.emit("weapons")


## Munitions en réserve pour l'arme (0 pour la matraque).
func weapon_reserve(id: String = "") -> int:
	var w := id if id != "" else equipped
	var ammo := String(WeaponDB.get_weapon(w).get("ammo", ""))
	return count_item(ammo) if ammo != "" else 0


# --- Sérialisation ---------------------------------------------------------

func to_dict() -> Dictionary:
	return {
		"hp": hp,
		"inventory": inventory.duplicate(true),
		"weapons": weapons.duplicate(true),
		"equipped": equipped,
		"flashlight_on": flashlight_on,
		"flashlight_battery": flashlight_battery,
		"downed": downed,
		"bleed_t": bleed_t,
		"dead": dead,
	}


## Relit les données (sauvegarde ou copie reçue du serveur). Les clés rangées
## par erreur dans les emplacements (anciennes sauvegardes) sont rendues via
## « on_key » au porte-clés commun.
func from_dict(d: Dictionary, on_key: Callable = Callable()) -> void:
	reset()
	hp = float(d.get("hp", MAX_HP))
	var inv: Array = d.get("inventory", [])
	for i in mini(inv.size(), INVENTORY_SLOTS):
		var id := String(inv[i].get("id", ""))
		var n := int(inv[i].get("count", 0))
		if id != "" and ItemDB.kind(id) == "key":
			if on_key.is_valid():
				on_key.call(id)
			continue
		inventory[i] = {"id": id, "count": n}
	weapons = (d.get("weapons", {}) as Dictionary).duplicate(true)
	for w in weapons:
		weapons[w]["mag"] = int(weapons[w].get("mag", 0))
	equipped = String(d.get("equipped", ""))
	flashlight_on = bool(d.get("flashlight_on", false))
	flashlight_battery = float(d.get("flashlight_battery", 100.0))
	downed = bool(d.get("downed", false))
	bleed_t = float(d.get("bleed_t", 0.0))
	dead = bool(d.get("dead", false))
	changed.emit("inventory")
	changed.emit("weapons")
	changed.emit("hp")
	changed.emit("state")

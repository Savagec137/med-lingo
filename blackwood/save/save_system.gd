extends Node
## Sauvegardes JSON dans user://saves.
## Emplacement 0 = sauvegarde automatique (points de passage), 1 à 3 = manuelles.

const DIR := "user://saves"
const SLOT_COUNT := 3
const VERSION := 1

const ZONE_NAMES := {
	"parking": "Parking",
	"entrance": "Entrée principale",
	"hall": "Hall d'accueil",
	"admin": "Couloir administratif",
	"archives": "Salle d'archives",
	"security": "Salle de sécurité",
	"lab_wing": "Aile des laboratoires",
	"lab": "Laboratoire",
	"basement": "Sous-sol — Niveau B",
	"generator": "Salle du générateur",
	"exit": "Tunnel de service",
}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	DirAccess.make_dir_recursive_absolute(DIR)


func slot_path(slot: int) -> String:
	if slot == 0:
		return DIR + "/autosave.json"
	return DIR + "/slot_%d.json" % slot


func save_to_slot(slot: int, data: Dictionary) -> bool:
	DirAccess.make_dir_recursive_absolute(DIR)
	data["version"] = VERSION
	data["saved_at"] = Time.get_unix_time_from_system()
	data["saved_at_text"] = Time.get_datetime_string_from_system(false, true)
	var f := FileAccess.open(slot_path(slot), FileAccess.WRITE)
	if f == null:
		push_error("Sauvegarde impossible : %s" % slot_path(slot))
		return false
	f.store_string(JSON.stringify(data, "  "))
	f.close()
	return true


func load_slot(slot: int) -> Dictionary:
	if not FileAccess.file_exists(slot_path(slot)):
		return {}
	var text := FileAccess.get_file_as_string(slot_path(slot))
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Sauvegarde corrompue : %s" % slot_path(slot))
		return {}
	return parsed


func has_slot(slot: int) -> bool:
	return FileAccess.file_exists(slot_path(slot))


func has_any() -> bool:
	for slot in range(0, SLOT_COUNT + 1):
		if has_slot(slot):
			return true
	return false


## Résumé affiché dans les menus : zone, date, temps de jeu.
func slot_info(slot: int) -> Dictionary:
	var d := load_slot(slot)
	if d.is_empty():
		return {"exists": false}
	var state: Dictionary = d.get("state", {})
	var zone := String(state.get("current_zone", "parking"))
	return {
		"exists": true,
		"zone": ZONE_NAMES.get(zone, zone),
		"date": String(d.get("saved_at_text", "")),
		"time": float(d.get("saved_at", 0.0)),
		"playtime": format_time(float(state.get("playtime", 0.0))),
		"hp": float(state.get("hp", 100.0)),
	}


## Emplacement le plus récent (-1 si aucune sauvegarde).
func latest_slot() -> int:
	var best := -1
	var best_time := -1.0
	for slot in range(0, SLOT_COUNT + 1):
		var info := slot_info(slot)
		if info.exists and info.time > best_time:
			best_time = info.time
			best = slot
	return best


func delete_all() -> void:
	for slot in range(0, SLOT_COUNT + 1):
		if has_slot(slot):
			DirAccess.remove_absolute(slot_path(slot))


static func format_time(seconds: float) -> String:
	var s := int(seconds)
	return "%02d:%02d:%02d" % [s / 3600, (s / 60) % 60, s % 60]

class_name InputSetup
extends RefCounted
## Déclare les actions du jeu dans l'InputMap au démarrage.
##
## Les touches sont déclarées par position physique : sur un clavier AZERTY,
## la « rangée WASD » correspond donc automatiquement à ZQSD.

const BINDINGS := {
	"move_forward": [KEY_W, KEY_UP],
	"move_back": [KEY_S, KEY_DOWN],
	"move_left": [KEY_A, KEY_LEFT],
	"move_right": [KEY_D, KEY_RIGHT],
	"run": [KEY_SHIFT],
	"interact": [KEY_E],
	"inventory": [KEY_TAB, KEY_I],
	"reload": [KEY_R],
	"flashlight": [KEY_F],
	"pause": [KEY_ESCAPE],
	"dodge": [KEY_SPACE],
	"quick_heal": [KEY_H],
	"debug_perf": [KEY_F3],
	"debug_console": [KEY_F1],
	"toggle_view": [KEY_V],
	"weapon_1": [KEY_1],
	"weapon_2": [KEY_2],
	"weapon_3": [KEY_3],
	"weapon_4": [KEY_4],
	"weapon_5": [KEY_5],
}

const MOUSE_BINDINGS := {
	"fire": [MOUSE_BUTTON_LEFT],
	"aim": [MOUSE_BUTTON_RIGHT],
	"weapon_next": [MOUSE_BUTTON_WHEEL_DOWN],
	"weapon_prev": [MOUSE_BUTTON_WHEEL_UP],
}


static func setup() -> void:
	for action in BINDINGS:
		_reset(action)
		for key in BINDINGS[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)
	for action in MOUSE_BINDINGS:
		_reset(action)
		for button in MOUSE_BINDINGS[action]:
			var mb := InputEventMouseButton.new()
			mb.button_index = button
			InputMap.action_add_event(action, mb)


static func _reset(action: String) -> void:
	if InputMap.has_action(action):
		InputMap.action_erase_events(action)
	else:
		InputMap.add_action(action, 0.2)


## Libellé de la touche telle qu'imprimée sur le clavier du joueur (ex. « Z » en AZERTY).
static func key_label(action: String) -> String:
	if action in MOUSE_BINDINGS:
		return "Clic gauche" if action == "fire" else "Clic droit"
	if not action in BINDINGS:
		return action
	var physical: int = BINDINGS[action][0]
	var label := physical
	if DisplayServer.get_name() != "headless":
		label = DisplayServer.keyboard_get_label_from_physical(physical)
	if label == KEY_NONE:
		label = physical
	return OS.get_keycode_string(label)

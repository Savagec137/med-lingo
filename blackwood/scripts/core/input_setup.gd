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

## Manette (disposition Xbox ; mêmes positions sur les autres manettes).
const JOY_BUTTONS := {
	"interact": [JOY_BUTTON_A],
	"dodge": [JOY_BUTTON_B],
	"reload": [JOY_BUTTON_X],
	"quick_heal": [JOY_BUTTON_Y],
	"weapon_prev": [JOY_BUTTON_LEFT_SHOULDER, JOY_BUTTON_DPAD_LEFT],
	"weapon_next": [JOY_BUTTON_RIGHT_SHOULDER, JOY_BUTTON_DPAD_RIGHT],
	"flashlight": [JOY_BUTTON_DPAD_UP],
	"inventory": [JOY_BUTTON_BACK, JOY_BUTTON_DPAD_DOWN],
	"run": [JOY_BUTTON_LEFT_STICK],
	"toggle_view": [JOY_BUTTON_RIGHT_STICK],
	"pause": [JOY_BUTTON_START],
}

## [axe, sens, zone morte]
const JOY_AXES := {
	"move_left": [JOY_AXIS_LEFT_X, -1.0, 0.2],
	"move_right": [JOY_AXIS_LEFT_X, 1.0, 0.2],
	"move_forward": [JOY_AXIS_LEFT_Y, -1.0, 0.2],
	"move_back": [JOY_AXIS_LEFT_Y, 1.0, 0.2],
	"look_left": [JOY_AXIS_RIGHT_X, -1.0, 0.12],
	"look_right": [JOY_AXIS_RIGHT_X, 1.0, 0.12],
	"look_up": [JOY_AXIS_RIGHT_Y, -1.0, 0.12],
	"look_down": [JOY_AXIS_RIGHT_Y, 1.0, 0.12],
	"aim": [JOY_AXIS_TRIGGER_LEFT, 1.0, 0.3],
	"fire": [JOY_AXIS_TRIGGER_RIGHT, 1.0, 0.3],
}

## Déplacements dans les menus (stick gauche et croix), traduits par Pad en
## ui_left / ui_right / ui_up / ui_down avec répétition.
const NAV_BINDINGS := {
	"nav_left": [JOY_AXIS_LEFT_X, -1.0, JOY_BUTTON_DPAD_LEFT],
	"nav_right": [JOY_AXIS_LEFT_X, 1.0, JOY_BUTTON_DPAD_RIGHT],
	"nav_up": [JOY_AXIS_LEFT_Y, -1.0, JOY_BUTTON_DPAD_UP],
	"nav_down": [JOY_AXIS_LEFT_Y, 1.0, JOY_BUTTON_DPAD_DOWN],
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
	for action in JOY_BUTTONS:
		if not InputMap.has_action(action):
			_reset(action)
		for button in JOY_BUTTONS[action]:
			var jb := InputEventJoypadButton.new()
			jb.device = -1
			jb.button_index = button
			InputMap.action_add_event(action, jb)
	for action in JOY_AXES:
		if not InputMap.has_action(action):
			_reset(action)
		var d: Array = JOY_AXES[action]
		InputMap.action_add_event(action, _axis(d[0], d[1]))
		InputMap.action_set_deadzone(action, d[2])
	for action in NAV_BINDINGS:
		_reset(action)
		InputMap.action_set_deadzone(action, 0.5)
		var n: Array = NAV_BINDINGS[action]
		InputMap.action_add_event(action, _axis(n[0], n[1]))
		var db := InputEventJoypadButton.new()
		db.device = -1
		db.button_index = n[2]
		InputMap.action_add_event(action, db)
	# Menus : les déplacements à la manette passent par Pad (répétition, pas de
	# double déplacement) ; A valide, B revient en arrière.
	for ui in ["ui_left", "ui_right", "ui_up", "ui_down"]:
		for ev in InputMap.action_get_events(ui):
			if ev is InputEventJoypadButton or ev is InputEventJoypadMotion:
				InputMap.action_erase_event(ui, ev)
	for pair in [["ui_accept", JOY_BUTTON_A], ["ui_cancel", JOY_BUTTON_B]]:
		var has := false
		for ev in InputMap.action_get_events(pair[0]):
			if ev is InputEventJoypadButton and (ev as InputEventJoypadButton).button_index == pair[1]:
				has = true
		if not has:
			var jb2 := InputEventJoypadButton.new()
			jb2.device = -1
			jb2.button_index = pair[1]
			InputMap.action_add_event(pair[0], jb2)


static func _axis(axis: int, dir: float) -> InputEventJoypadMotion:
	var jm := InputEventJoypadMotion.new()
	jm.device = -1
	jm.axis = axis
	jm.axis_value = dir
	return jm


static func _reset(action: String) -> void:
	if InputMap.has_action(action):
		InputMap.action_erase_events(action)
	else:
		InputMap.add_action(action, 0.2)


## Libellé de la commande : bouton de manette si le joueur joue à la manette,
## sinon touche telle qu'imprimée sur son clavier (ex. « Z » en AZERTY).
static func key_label(action: String) -> String:
	var tree := Engine.get_main_loop() as SceneTree
	var pad: Node = tree.root.get_node_or_null("Pad") if tree else null
	if pad and pad.using_pad:
		var l: String = pad.action_label(action)
		if l != "":
			return l
	return keyboard_label(action)


## Remplace les jetons « {key:action} » d'un texte par la commande actuelle.
static func fill_keys(text: String) -> String:
	var re := RegEx.create_from_string("\\{key:(\\w+)\\}")
	var out := text
	for m in re.search_all(text):
		out = out.replace(m.get_string(0), key_label(m.get_string(1)))
	return out


static func keyboard_label(action: String) -> String:
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

extends Node
## Manette (autoload « Pad ») :
##   · retient si le joueur utilise la manette ou le clavier / la souris, pour
##     afficher les bons boutons dans les messages et les menus ;
##   · traduit le stick gauche et la croix directionnelle en déplacements dans
##     les menus (ui_left / ui_right / ui_up / ui_down), avec répétition quand
##     on maintient la direction ;
##   · libellés des boutons selon la famille de manette (Xbox, PlayStation,
##     Nintendo) ;
##   · vibrations ;
##   · met la partie en pause si la manette se déconnecte.

signal device_changed(using_pad: bool)

enum Family { XBOX, PLAYSTATION, NINTENDO }

const REPEAT_DELAY := 0.38
const REPEAT_RATE := 0.11
const NAV := {"ui_left": "nav_left", "ui_right": "nav_right", "ui_up": "nav_up", "ui_down": "nav_down"}

## Libellés par famille : boutons (JOY_BUTTON_*) puis axes (« LT », « RT »…).
const BUTTON_NAMES := {
	Family.XBOX: {JOY_BUTTON_A: "A", JOY_BUTTON_B: "B", JOY_BUTTON_X: "X", JOY_BUTTON_Y: "Y",
		JOY_BUTTON_LEFT_SHOULDER: "LB", JOY_BUTTON_RIGHT_SHOULDER: "RB", JOY_BUTTON_LEFT_STICK: "L3",
		JOY_BUTTON_RIGHT_STICK: "R3", JOY_BUTTON_START: "MENU", JOY_BUTTON_BACK: "VUE"},
	Family.PLAYSTATION: {JOY_BUTTON_A: "CROIX", JOY_BUTTON_B: "ROND", JOY_BUTTON_X: "CARRÉ", JOY_BUTTON_Y: "TRIANGLE",
		JOY_BUTTON_LEFT_SHOULDER: "L1", JOY_BUTTON_RIGHT_SHOULDER: "R1", JOY_BUTTON_LEFT_STICK: "L3",
		JOY_BUTTON_RIGHT_STICK: "R3", JOY_BUTTON_START: "OPTIONS", JOY_BUTTON_BACK: "SHARE"},
	Family.NINTENDO: {JOY_BUTTON_A: "B", JOY_BUTTON_B: "A", JOY_BUTTON_X: "Y", JOY_BUTTON_Y: "X",
		JOY_BUTTON_LEFT_SHOULDER: "L", JOY_BUTTON_RIGHT_SHOULDER: "R", JOY_BUTTON_LEFT_STICK: "L3",
		JOY_BUTTON_RIGHT_STICK: "R3", JOY_BUTTON_START: "+", JOY_BUTTON_BACK: "−"},
}
const TRIGGER_NAMES := {
	Family.XBOX: ["LT", "RT"], Family.PLAYSTATION: ["L2", "R2"], Family.NINTENDO: ["ZL", "ZR"],
}
const DPAD_NAMES := {JOY_BUTTON_DPAD_UP: "CROIX HAUT", JOY_BUTTON_DPAD_DOWN: "CROIX BAS",
	JOY_BUTTON_DPAD_LEFT: "CROIX GAUCHE", JOY_BUTTON_DPAD_RIGHT: "CROIX DROITE"}

var using_pad := false
var family: int = Family.XBOX

var _held := ""
var _repeat_t := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Input.joy_connection_changed.connect(_on_joy_connection)
	_detect_family()


func _input(event: InputEvent) -> void:
	var pad := false
	if event is InputEventJoypadButton:
		pad = true
	elif event is InputEventJoypadMotion:
		if absf((event as InputEventJoypadMotion).axis_value) < 0.4:
			return
		pad = true
	elif event is InputEventKey or event is InputEventMouseButton:
		pad = false
	elif event is InputEventMouseMotion:
		if (event as InputEventMouseMotion).relative.length() < 4.0:
			return
		pad = false
	else:
		return
	if pad:
		var dev := event.device
		if dev >= 0 and not Input.get_joy_name(dev).is_empty():
			family = _family_of(Input.get_joy_name(dev))
	if pad != using_pad:
		using_pad = pad
		device_changed.emit(using_pad)


## Stick gauche et croix → déplacements dans les menus, avec répétition.
func _process(delta: float) -> void:
	if not _menu_open():
		_held = ""
		return
	var dir := ""
	var best := 0.5
	for ui_action in NAV:
		var s := Input.get_action_strength(NAV[ui_action])
		if s > best:
			best = s
			dir = ui_action
	if dir == "":
		_held = ""
		return
	if dir != _held:
		_held = dir
		_repeat_t = REPEAT_DELAY
		_send(dir)
		return
	_repeat_t -= delta
	if _repeat_t <= 0.0:
		_repeat_t = REPEAT_RATE
		_send(dir)


func _send(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = true
	Input.parse_input_event(ev)
	var up := InputEventAction.new()
	up.action = action
	up.pressed = false
	Input.parse_input_event(up)


## Un menu ou un écran modal attend des déplacements (pas le jeu).
func _menu_open() -> bool:
	var ui := GameState.ui as UIRoot
	if ui == null:
		return false
	return ui.top_screen() != null or not ui.in_game


# --- Libellés -----------------------------------------------------------------

func _detect_family() -> void:
	for dev in Input.get_connected_joypads():
		family = _family_of(Input.get_joy_name(dev))
		return


static func _family_of(joy_name: String) -> int:
	var n := joy_name.to_lower()
	for k in ["playstation", "ps3", "ps4", "ps5", "dualshock", "dualsense", "sony"]:
		if k in n:
			return Family.PLAYSTATION
	for k in ["nintendo", "switch", "pro controller", "joy-con", "joycon"]:
		if k in n:
			return Family.NINTENDO
	return Family.XBOX


## Nom du bouton de manette lié à une action (ex. « A », « RT », « L1 »).
func action_label(action: String) -> String:
	if not InputMap.has_action(action):
		return action
	for ev in InputMap.action_get_events(action):
		if ev is InputEventJoypadButton:
			return button_name((ev as InputEventJoypadButton).button_index)
		if ev is InputEventJoypadMotion:
			return axis_name((ev as InputEventJoypadMotion).axis)
	return ""


func button_name(button: int) -> String:
	if DPAD_NAMES.has(button):
		return DPAD_NAMES[button]
	return String(BUTTON_NAMES[family].get(button, "BOUTON %d" % button))


func axis_name(axis: int) -> String:
	match axis:
		JOY_AXIS_TRIGGER_LEFT:
			return TRIGGER_NAMES[family][0]
		JOY_AXIS_TRIGGER_RIGHT:
			return TRIGGER_NAMES[family][1]
		JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y:
			return "STICK GAUCHE"
		_:
			return "STICK DROIT"


# --- Vibrations et connexion ------------------------------------------------------

## Vibration proportionnelle à « amount » (0..1), si l'option est activée.
func rumble(amount: float, duration: float = -1.0) -> void:
	if not Settings.vibration or amount <= 0.0:
		return
	var t := duration if duration > 0.0 else 0.1 + amount * 0.35
	for dev in Input.get_connected_joypads():
		Input.start_joy_vibration(dev, clampf(amount * 1.2, 0.0, 1.0), clampf(amount * 0.9, 0.0, 1.0), t)


func _on_joy_connection(device: int, connected: bool) -> void:
	if connected:
		family = _family_of(Input.get_joy_name(device))
		return
	# Manette débranchée en pleine partie : pause
	var ui := GameState.ui as UIRoot
	if ui and ui.in_game and ui.top_screen() == null and GameState.player:
		ui.open_screen(ui.pause_menu)
		ui.show_message("Manette déconnectée.", 3.0)

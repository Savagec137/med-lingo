class_name TriggerZone
extends Area3D
## Volume invisible déclenchant un événement quand le joueur y entre.

signal triggered(trigger_name: String)

var trigger_name := ""
var once := true
var required_flag := ""
var _fired := false


static func make(p_name: String, center: Vector3, size: Vector3, p_once: bool = true) -> TriggerZone:
	var t := TriggerZone.new()
	t.trigger_name = p_name
	t.once = p_once
	t.position = center
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	cs.shape = shape
	t.add_child(cs)
	return t


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitoring = true
	monitorable = false
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node3D) -> void:
	if body != GameState.player:
		return
	if once and (_fired or GameState.get_flag("trig_" + trigger_name)):
		return
	if required_flag != "" and not GameState.get_flag(required_flag):
		return
	_fired = true
	if once:
		GameState.set_flag("trig_" + trigger_name, true)
	triggered.emit(trigger_name)


## Réarme un déclencheur (quand sa condition n'était pas encore remplie).
func rearm() -> void:
	_fired = false

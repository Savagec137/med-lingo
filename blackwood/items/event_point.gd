class_name EventPoint
extends Interactable
## Point d'interaction scripté (vidéo à regarder, console, interphone…) :
## transmet l'action au directeur d'événements.

signal activated(point: EventPoint)

var event_id := ""
var once := true
var done_flag := ""


func _ready() -> void:
	if interact_radius == 1.7:
		interact_radius = 1.8


func can_interact() -> bool:
	if once and done_flag != "" and GameState.get_flag(done_flag):
		return false
	return enabled and is_visible_in_tree()


func interact(_player: Node) -> void:
	activated.emit(self)
	var g := GameState.game as Game
	if g and g.events:
		g.events.on_event_point(event_id, self)

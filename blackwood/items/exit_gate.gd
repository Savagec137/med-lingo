class_name ExitGate
extends Interactable
## Portail au bout du tunnel de service : la sortie. L'aube filtre par les jointures.


func _ready() -> void:
	prompt_text = "SORTIR"
	interact_radius = 2.0
	focus_offset = Vector3(0, 1.2, 0.1)


func interact(_player: Node) -> void:
	enabled = false
	Audio.play_3d("door_open_metal", global_position + Vector3.UP, 2.0, 0.0, 20.0, 4.0)
	if GameState.game and GameState.game.has_method("start_ending"):
		GameState.game.start_ending()

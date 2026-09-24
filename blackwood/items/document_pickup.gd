class_name DocumentPickup
extends Interactable
## Document à lire. Il rejoint l'onglet DOCUMENTS de l'inventaire.

var doc_id := ""
var model_kind := "document"
var _glint: MeshInstance3D


func _ready() -> void:
	if GameState.has_document(doc_id):
		queue_free()
		return
	add_to_group("net_refresh")
	prompt_text = "LIRE"
	interact_radius = 1.6
	focus_offset = Vector3(0, 0.1, 0)
	add_child(ItemModels.build(model_kind))
	# Même scintillement que les objets
	_glint = Pickup.make_glint(Vector3(0, 0.05, 0), Color(0.9, 0.95, 1.0))
	add_child(_glint)


func _process(_delta: float) -> void:
	if _glint:
		Pickup.animate_glint(_glint, Time.get_ticks_msec() * 0.001, float(hash(doc_id) % 50))


func interact(player: Node) -> void:
	GameState.add_document(doc_id)
	# Le document s'ouvre chez le joueur qui le ramasse ; il rejoint les
	# archives communes (lisibles par les deux joueurs via l'inventaire).
	if not GameState.open_remote_ui(player, "document", [doc_id]):
		Audio.play_2d("paper", -2.0)
		if GameState.ui:
			GameState.ui.show_document(doc_id)
	queue_free()


func net_refresh() -> void:
	if GameState.has_document(doc_id) and not is_queued_for_deletion():
		queue_free()

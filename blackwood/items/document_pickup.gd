class_name DocumentPickup
extends Interactable
## Document à lire. Il rejoint l'onglet DOCUMENTS de l'inventaire.

var doc_id := ""
var model_kind := "document"
var _glint: Node3D


func _ready() -> void:
	if GameState.has_document(doc_id):
		queue_free()
		return
	add_to_group("net_refresh")
	prompt_text = "LIRE"
	interact_radius = 1.6
	focus_offset = Vector3(0, 0.1, 0)
	add_child(ItemModels.build(model_kind))
	# Réutilise le scintillement des objets
	var tex := Pickup._glint_texture()
	var g := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.07, 0.07)
	g.mesh = q
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_texture = tex
	m.albedo_color = Color(0.9, 0.95, 1.0, 0.6)
	g.material_override = m
	g.position = Vector3(0, 0.08, 0)
	add_child(g)
	_glint = g


func _process(_delta: float) -> void:
	if _glint:
		var pulse := pow(maxf(sin(Time.get_ticks_msec() * 0.0021 + float(hash(doc_id) % 50)), 0.0), 8.0)
		_glint.scale = Vector3.ONE * (0.4 + pulse * 1.2)


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

class_name Phone
extends Interactable
## Téléphone fixe de l'accueil. Il sonne quand le joueur entre dans le hall.

var ringing := false
var answered := false
var _ring_player: AudioStreamPlayer3D
var _handset: Node3D
var _ring_tween: Tween


func _ready() -> void:
	interact_radius = 1.6
	focus_offset = Vector3(0, 0.1, 0)
	ItemModels._box(self, Vector3(0.22, 0.07, 0.18), Vector3(0, 0.035, 0), "plastic_beige")
	_handset = Node3D.new()
	add_child(_handset)
	ItemModels._box(_handset, Vector3(0.22, 0.04, 0.05), Vector3(0, 0.09, -0.04), "plastic_beige")
	ItemModels._box(self, Vector3(0.1, 0.005, 0.08), Vector3(0, 0.072, 0.04), "plastic_dark")
	add_to_group("net_refresh")


func can_interact() -> bool:
	return enabled and ringing and not answered


## Invité : décroché chez l'hôte.
func net_refresh() -> void:
	if not answered and GameState.get_flag("phone_answered") and ringing:
		answered = true
		stop_ringing()


func get_prompt() -> String:
	return "DÉCROCHER"


func start_ringing() -> void:
	if answered or ringing:
		return
	ringing = true
	_ring_player = AudioStreamPlayer3D.new()
	_ring_player.stream = Audio.get_stream("phone_ring")
	_ring_player.bus = "SFX"
	_ring_player.unit_size = 6.0
	_ring_player.max_distance = 40.0
	add_child(_ring_player)
	_ring_player.position = Vector3(0, 0.1, 0)
	_ring_player.play()
	_ring_tween = create_tween().set_loops(0)
	_ring_tween.tween_property(_handset, "position:y", 0.006, 0.05)
	_ring_tween.tween_property(_handset, "position:y", 0.0, 0.05)


func stop_ringing() -> void:
	ringing = false
	if _ring_tween:
		_ring_tween.kill()
		_ring_tween = null
		_handset.position.y = 0.0
	if _ring_player:
		_ring_player.queue_free()
		_ring_player = null


func interact(_player: Node) -> void:
	answered = true
	stop_ringing()
	GameState.set_flag("phone_answered", true)
	Audio.play_3d("phone_pickup", global_position, -2.0, 0.0, 8.0, 2.0)
	if GameState.game and GameState.game.has_method("on_phone_answered"):
		GameState.game.on_phone_answered()

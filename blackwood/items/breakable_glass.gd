class_name BreakableGlass
extends StaticBody3D
## Vitre qui peut voler en éclats (événement scripté, balle) : panneau de
## verre avec sa propre collision, remplacé par des débris au sol.

var glass_id := ""
var size := Vector3(3.0, 1.4, 0.03)
var broken := false
var _mesh: MeshInstance3D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	cs.shape = shape
	add_child(cs)
	_mesh = MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	_mesh.mesh = b
	_mesh.material_override = Mats.get_mat("glass")
	add_child(_mesh)
	if glass_id != "" and GameState.get_flag("glass_" + glass_id):
		_set_broken()
	add_to_group("net_refresh")


## Invité : brisée chez l'hôte.
func net_refresh() -> void:
	if not broken and glass_id != "" and GameState.get_flag("glass_" + glass_id):
		shatter()


## Une vitre qui descend jusqu'au sol barre le passage aux créatures.
func blocks_nav() -> bool:
	return position.y - size.y * 0.5 < Facility.FLOOR_Y.get(Facility.floor_at(position.y), 0.0) + 0.3


func nav_id() -> String:
	return "glass:" + glass_id


## Emprise au sol (XZ), un peu épaissie pour couvrir les cases de la grille et
## raccourcie aux extrémités pour ne pas libérer les murs voisins une fois brisée.
func footprint() -> Rect2:
	var along := basis.x.normalized() * maxf(size.x * 0.5 - 0.3, 0.1)
	var across := basis.z.normalized() * 0.3
	var r := Rect2(Vector2(position.x, position.z), Vector2.ZERO)
	for c in [along + across, along - across, -along + across, -along - across]:
		r = r.expand(Vector2(position.x + c.x, position.z + c.z))
	return r


func on_shot(_pos: Vector3) -> void:
	# Coop : l'hôte décide (le tir de l'invité y est rejoué)
	if Net.is_client():
		return
	shatter()


func shatter() -> void:
	if broken:
		return
	if glass_id != "":
		GameState.set_flag("glass_" + glass_id, true)
	Audio.play_3d("glass_crash", global_position, 4.0, 0.05, 30.0, 5.0)
	var world: Node = GameState.game if GameState.game else get_tree().current_scene
	FX.dust(world, global_position, 20, 0.3)
	_set_broken()


func _set_broken() -> void:
	broken = true
	var game: Node = GameState.game
	if game and game.get("facility"):
		(game.get("facility") as Facility).set_nav_blocked(Facility.floor_at(position.y), nav_id(), false)
	_mesh.visible = false
	collision_layer = 0
	for i in 8:
		var shard := MeshInstance3D.new()
		var sb := BoxMesh.new()
		sb.size = Vector3(randf_range(0.1, 0.35), 0.01, randf_range(0.08, 0.3))
		shard.mesh = sb
		shard.material_override = Mats.get_mat("glass_dirty")
		add_child(shard)
		shard.position = Vector3(randf_range(-size.x * 0.5, size.x * 0.5), -size.y * 0.5 - 0.88, randf_range(0.2, 1.2))
		shard.rotation.y = randf() * TAU

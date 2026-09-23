class_name ExplosiveTank
extends StaticBody3D
## Bouteille d'oxygène médical : une balle suffit à la faire exploser.
## Dégâts de zone (créatures comme joueur), souffle, étincelles, flash.

const RADIUS := 4.2
const DAMAGE := 260.0

var exploded := false
var tank_id := ""


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	add_to_group("metal")
	add_to_group("explosive_tanks")
	var cs := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.16
	shape.height = 1.4
	cs.shape = shape
	cs.position = Vector3(0, 0.7, 0)
	add_child(cs)
	ItemModels._cyl(self, 0.15, 1.2, Vector3(0, 0.6, 0), "plastic_white")
	ItemModels._cyl(self, 0.152, 0.25, Vector3(0, 1.05, 0), "metal_green")
	ItemModels._cyl(self, 0.05, 0.14, Vector3(0, 1.27, 0), "metal_steel")
	ItemModels._box(self, Vector3(0.14, 0.04, 0.04), Vector3(0.06, 1.33, 0), "metal_steel")
	var lbl := Label3D.new()
	lbl.text = "O₂"
	lbl.font = UITheme.font_ui_bold()
	lbl.font_size = 64
	lbl.pixel_size = 0.003
	lbl.modulate = Color(0.05, 0.3, 0.1)
	lbl.shaded = true
	lbl.position = Vector3(0, 0.75, 0.153)
	add_child(lbl)
	if tank_id != "" and GameState.get_flag("tank_" + tank_id):
		exploded = true
		visible = false
		collision_layer = 0


## Appelé par les armes quand une balle touche la bouteille.
func on_shot(_pos: Vector3) -> void:
	explode()


func explode() -> void:
	if exploded:
		return
	exploded = true
	if tank_id != "":
		GameState.set_flag("tank_" + tank_id, true)
	var center := global_position + Vector3.UP * 0.8
	visible = false
	collision_layer = 0
	var world: Node = GameState.game if GameState.game else get_tree().current_scene
	Audio.play_3d("explosion", center, 8.0, 0.05, 80.0, 10.0)
	FX.sparks(world, center, 60)
	FX.dust(world, center, 30, 0.9)
	FX.blood_decal(world, global_position + Vector3.UP * 0.01, 2.2, "blood_dry")
	var flash := OmniLight3D.new()
	flash.light_color = Color(1.0, 0.6, 0.25)
	flash.light_energy = 16.0
	flash.omni_range = 12.0
	world.add_child(flash)
	flash.global_position = center
	var tw := flash.create_tween()
	tw.tween_property(flash, "light_energy", 0.0, 0.6)
	tw.tween_callback(flash.queue_free)
	GameState.emit_noise(center, 40.0, self)
	for e in get_tree().get_nodes_in_group("enemies"):
		var en := e as Enemy
		if en == null or en.is_dead():
			continue
		var d := en.global_position.distance_to(global_position)
		if d < RADIUS:
			var k := 1.0 - d / RADIUS
			var dir := (en.global_position - global_position).normalized()
			en.take_damage(DAMAGE * (0.35 + 0.65 * k), en.global_position + Vector3.UP, dir, false)
			en.stagger(1.0, dir, 6.0 * k)
			if en.has_method("on_explosion"):
				en.on_explosion(k)
	var p := GameState.player as Player
	if p and not p.is_dead:
		var dp := p.global_position.distance_to(global_position)
		if dp < RADIUS:
			p.take_damage(55.0 * (1.0 - dp / RADIUS), global_position)
		if p.camera_rig:
			p.camera_rig.shake(clampf(1.2 - dp / 12.0, 0.2, 1.0))

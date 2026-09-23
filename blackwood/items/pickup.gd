class_name Pickup
extends Interactable
## Objet ramassable posé dans le monde, avec un léger scintillement pour
## qu'on le repère dans la pénombre.

var item_id := ""
var count := 1
var pickup_id := ""
## Message personnalisé (ex. « Dans le tiroir, une clé. »). Vide = message standard.
var pickup_msg := ""
var show_glint := true
var model: Node3D
var _glint: MeshInstance3D
var _t := 0.0


func _ready() -> void:
	if pickup_id != "" and GameState.taken_pickups.has(pickup_id):
		queue_free()
		return
	if prompt_text == "EXAMINER":
		prompt_text = "RAMASSER"
	interact_radius = 1.6
	focus_offset = Vector3(0, 0.1, 0)
	model = ItemModels.build(item_id)
	add_child(model)
	if show_glint:
		_glint = MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(0.09, 0.09)
		_glint.mesh = q
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		m.albedo_texture = _glint_texture()
		m.albedo_color = Color(1.0, 0.95, 0.8, 0.9)
		m.no_depth_test = false
		_glint.material_override = m
		_glint.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_glint.position = Vector3(0, 0.12, 0)
		add_child(_glint)


static var _glint_tex: GradientTexture2D


static func _glint_texture() -> GradientTexture2D:
	if _glint_tex == null:
		var g := Gradient.new()
		g.offsets = PackedFloat32Array([0.0, 0.15, 1.0])
		g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.5), Color(1, 1, 1, 0)])
		_glint_tex = GradientTexture2D.new()
		_glint_tex.gradient = g
		_glint_tex.fill = GradientTexture2D.FILL_RADIAL
		_glint_tex.fill_from = Vector2(0.5, 0.5)
		_glint_tex.fill_to = Vector2(0.5, 0.0)
		_glint_tex.width = 32
		_glint_tex.height = 32
	return _glint_tex


func _process(delta: float) -> void:
	if _glint == null:
		return
	_t += delta
	var pulse := pow(maxf(sin(_t * 2.2 + float(hash(pickup_id) % 100)), 0.0), 8.0)
	_glint.scale = Vector3.ONE * (0.4 + pulse * 1.3)
	(_glint.material_override as StandardMaterial3D).albedo_color.a = 0.25 + pulse * 0.75


func get_prompt() -> String:
	return prompt_text


func interact(player: Node) -> void:
	var item_name := ItemDB.item_name(item_id)
	match ItemDB.kind(item_id):
		"tool":
			GameState.set_flag("has_" + item_id, true)
			if item_id == "flashlight" and player.flashlight:
				player._update_equipment_visibility()
				player.flashlight.set_on(true)
			_announce(pickup_msg if pickup_msg != "" else "Vous obtenez : %s. [%s] pour l'allumer ou l'éteindre." % [item_name, InputSetup.key_label("flashlight")])
		"instant":
			if item_id == "battery":
				GameState.flashlight_battery = 100.0
				_announce(pickup_msg if pickup_msg != "" else "Piles neuves. La lampe torche retrouve toute sa puissance.")
		"weapon":
			var first := not GameState.has_weapon(item_id)
			GameState.give_weapon(item_id)
			if player.has_method("_update_equipment_visibility"):
				player._update_equipment_visibility()
			var slot := WeaponDB.ORDER.find(item_id) + 1
			_announce(pickup_msg if pickup_msg != "" else ("Vous obtenez : %s. [%d] pour l'équiper." % [item_name, slot] if first else "%s : déjà en votre possession." % item_name))
		_:
			if ItemDB.kind(item_id) == "ammo":
				count = maxi(1, roundi(count * Settings.ammo_mult()))
			if not GameState.can_add(item_id, count):
				GameState.show_message("Inventaire plein. Impossible de prendre : %s." % item_name, 3.0)
				Audio.ui("ui_error", -6.0)
				return
			GameState.add_item(item_id, count)
			var label := item_name if count <= 1 else "%s (x%d)" % [item_name, count]
			_announce(pickup_msg if pickup_msg != "" else "Vous obtenez : %s." % label)
	if pickup_id != "":
		GameState.taken_pickups[pickup_id] = true
	GameState.set_flag("picked_" + pickup_id, true)
	queue_free()


func _announce(text: String) -> void:
	Audio.play_2d("pickup_key" if ItemDB.kind(item_id) == "key" else "pickup", -4.0)
	GameState.show_message(text, 3.5)

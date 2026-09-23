class_name SavePoint
extends Interactable
## Magnétophone : Thomas enregistre une note vocale (sauvegarde sur 3 emplacements).

var _led: StandardMaterial3D
var _t := 0.0


func _ready() -> void:
	prompt_text = "ENREGISTRER (SAUVEGARDER)"
	interact_radius = 1.7
	focus_offset = Vector3(0, 0.15, 0)
	# Magnétophone à bandes posé sur son support
	var body := ItemModels._box(self, Vector3(0.42, 0.12, 0.3), Vector3(0, 0.06, 0), "plastic_beige")
	body.name = "Body"
	ItemModels._box(self, Vector3(0.4, 0.01, 0.12), Vector3(0, 0.125, 0.07), "metal_dark")
	for x in [-0.1, 0.1]:
		var reel := ItemModels._cyl(self, 0.07, 0.015, Vector3(x, 0.13, -0.05), "metal_steel")
		reel.name = "Reel"
		ItemModels._cyl(self, 0.02, 0.02, Vector3(x, 0.14, -0.05), "plastic_dark")
	var led := ItemModels._box(self, Vector3(0.015, 0.015, 0.01), Vector3(0.17, 0.09, 0.151), "plastic_dark")
	_led = StandardMaterial3D.new()
	_led.albedo_color = Color(0.4, 0.02, 0.02)
	_led.emission_enabled = true
	_led.emission = Color(1.0, 0.1, 0.05)
	_led.emission_energy_multiplier = 4.0
	led.material_override = _led
	# Halo chaud et rassurant des pièces de sauvegarde
	var glow := OmniLight3D.new()
	glow.light_color = Color(1.0, 0.72, 0.4)
	glow.light_energy = 0.5
	glow.omni_range = 2.6
	glow.shadow_enabled = false
	glow.light_volumetric_fog_energy = 0.3
	glow.position = Vector3(0, 0.5, 0.2)
	add_child(glow)
	add_to_group("save_points")


func _process(delta: float) -> void:
	_t += delta
	_led.emission_energy_multiplier = 4.0 if fmod(_t, 1.6) < 0.8 else 0.3


func interact(player: Node) -> void:
	Audio.play_3d("tape_click", global_position, -2.0, 0.02, 8.0, 2.0)
	# Coop : c'est l'hôte qui tient la sauvegarde (les deux joueurs y figurent)
	if player and player.get("is_local") == false:
		GameState.show_message("Seul l'hôte (joueur 1) peut enregistrer la partie. Les sauvegardes automatiques vous incluent.", 3.5)
		return
	if GameState.ui:
		GameState.ui.open_save_menu()

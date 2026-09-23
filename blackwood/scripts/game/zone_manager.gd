class_name ZoneManager
extends Node
## Suit la zone du joueur : ambiance sonore, réverbération, surface des pas,
## titre de zone à la première visite, lune/pluie, et n'allume que les lumières
## proches de l'étage du joueur (performances, pas de fuite de lumière d'un
## étage à l'autre).

signal zone_changed(zone: String)

var facility: Facility
var current := ""
var _timer := 0.0
var _light_t := 0.0
var _visited := {}


func _process(delta: float) -> void:
	var p := GameState.player as Player
	if p == null or facility == null:
		return
	_light_t -= delta
	if _light_t <= 0.0:
		_light_t = 0.3
		_update_lights(p.global_position)
	_timer -= delta
	if _timer > 0.0:
		return
	_timer = 0.2
	var z := Facility.zone_at(p.global_position)
	if z != current:
		_enter(z)


func force_refresh() -> void:
	current = ""
	_timer = 0.0
	_light_t = 0.0


func _enter(z: String) -> void:
	current = z
	GameState.current_zone = z
	var def: Dictionary = Facility.ZONES.get(z, {})
	var p := GameState.player as Player
	if p:
		p.surface = String(def.get("surface", "concrete"))
		if p.flashlight:
			p.flashlight.interference = 0.12 if z == "b2_generator" else (0.05 if z.begins_with("f12") or z == "f8_lab" else 0.0)
	Audio.set_reverb(String(def.get("reverb", "room")))
	# Ambiances : fondu croisé vers les boucles de la nouvelle zone
	var amb: Dictionary = def.get("ambience", {})
	for name in ["amb_rain", "amb_wind", "amb_rain_inside", "amb_room", "amb_hum", "amb_vent", "amb_lab", "amb_basement", "amb_generator", "amb_tunnel"]:
		Audio.set_loop(name, float(amb.get(name, 0.0)), 2.5)
	facility.moon.visible = bool(def.get("moon", false))
	if not _visited.has(z) and GameState.ui:
		_visited[z] = true
		GameState.ui.show_zone_title(String(def.get("name", z)))
	_update_lights(p.global_position if p else Vector3.ZERO)
	zone_changed.emit(z)


## Lumières actives : celles de l'étage du joueur à moins de 34 m ; les zones
## « toujours visibles » (cages d'escalier) dans un rayon court ; l'extérieur et
## l'enveloppe de la tour de loin.
func _update_lights(pos: Vector3) -> void:
	var pf := Facility.floor_at(pos.y + 0.2)
	for l in facility.lights:
		var lf := l as LightFixture
		var def: Dictionary = Facility.ZONES.get(lf.zone, {})
		var d := lf.global_position.distance_to(pos)
		var on := false
		if def.is_empty() or lf.zone == "exterior":
			on = d < 90.0
		elif bool(def.get("outdoor_lights", false)):
			on = d < 45.0
		elif bool(def.get("always", false)):
			on = d < 14.0
		else:
			on = int(def.get("floor", -99)) == pf and d < 34.0
		if on != lf.zone_active:
			lf.set_zone_active(on)

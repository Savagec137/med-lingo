class_name ZoneManager
extends Node
## Suit la zone du joueur : ambiance sonore, réverbération, surface des pas,
## titre de zone à la première visite, et activation des lumières proches
## seulement (performances).

signal zone_changed(zone: String)

var facility: Facility
var current := ""
var _timer := 0.0
var _visited := {}


func _process(delta: float) -> void:
	var p := GameState.player as Player
	if p == null or facility == null:
		return
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


func _enter(z: String) -> void:
	current = z
	GameState.current_zone = z
	var def: Dictionary = Facility.ZONES.get(z, {})
	var p := GameState.player as Player
	if p:
		p.surface = String(def.get("surface", "concrete"))
		if p.flashlight:
			p.flashlight.interference = 0.12 if z == "generator" else (0.04 if z == "lab" else 0.0)
	Audio.set_reverb(String(def.get("reverb", "room")))
	# Ambiances : fondu croisé vers les boucles de la nouvelle zone
	var amb: Dictionary = def.get("ambience", {})
	for name in ["amb_rain", "amb_wind", "amb_rain_inside", "amb_room", "amb_hum", "amb_vent", "amb_lab", "amb_basement", "amb_generator", "amb_tunnel"]:
		Audio.set_loop(name, float(amb.get(name, 0.0)), 2.5)
	# Lumières : zone courante + voisines
	var active := {z: true}
	for n in def.get("neighbors", []):
		active[n] = true
	for zone_name in facility.zone_lights:
		var on: bool = active.has(zone_name)
		for l in facility.zone_lights[zone_name]:
			(l as LightFixture).set_zone_active(on)
	facility.moon.visible = bool(def.get("moon", false)) or z == "parking"
	if not _visited.has(z) and GameState.ui:
		_visited[z] = true
		GameState.ui.show_zone_title(String(def.get("name", z)))
	zone_changed.emit(z)

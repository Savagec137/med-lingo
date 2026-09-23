class_name ECGDisplay
extends Control
## Moniteur cardiaque stylisé : le tracé, sa couleur et son rythme reflètent
## l'état de santé (BON / ATTENTION / DANGER).

var _t := 0.0
var _points := PackedFloat32Array()
const SAMPLES := 90


func _init() -> void:
	custom_minimum_size = Vector2(200, 54)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_points.resize(SAMPLES)


func _process(delta: float) -> void:
	var status := GameState.health_status()
	var bpm := 70.0 if status == "fine" else (100.0 if status == "caution" else 135.0)
	_t += delta
	# Nouvel échantillon du tracé
	var steps := int(ceil(delta * 60.0))
	for i in steps:
		var phase := fmod(_t * bpm / 60.0, 1.0)
		var v := 0.0
		if phase < 0.04:
			v = sin(phase / 0.04 * PI) * 0.15
		elif phase < 0.1:
			v = 0.0
		elif phase < 0.13:
			v = -0.25
		elif phase < 0.16:
			v = 1.0
		elif phase < 0.19:
			v = -0.4
		elif phase < 0.3:
			v = 0.0
		elif phase < 0.4:
			v = sin((phase - 0.3) / 0.1 * PI) * 0.25
		if status == "danger":
			v *= 0.8 + randf() * 0.4
		for k in range(SAMPLES - 1):
			_points[k] = _points[k + 1]
		_points[SAMPLES - 1] = v
	queue_redraw()


func _draw() -> void:
	var status := GameState.health_status()
	var col := UITheme.COL_FINE if status == "fine" else (UITheme.COL_CAUTION if status == "caution" else UITheme.COL_DANGER)
	var h := size.y
	var w := size.x
	var line := PackedVector2Array()
	for i in SAMPLES:
		line.append(Vector2(w * float(i) / (SAMPLES - 1), h * 0.62 - _points[i] * h * 0.5))
	# Traînée : plus lumineuse vers la droite
	for i in range(1, SAMPLES):
		var a := float(i) / SAMPLES
		draw_line(line[i - 1], line[i], Color(col.r, col.g, col.b, a * 0.95), 2.0, true)
	draw_circle(line[SAMPLES - 1], 2.5, col)

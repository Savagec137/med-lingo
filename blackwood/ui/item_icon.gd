class_name ItemIcon
extends Control
## Icône d'objet dessinée en vectoriel (aucune image requise).

var icon := ""
var tint := Color(0.85, 0.83, 0.78)


func _init(p_icon: String = "") -> void:
	icon = p_icon
	custom_minimum_size = Vector2(64, 64)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func set_icon(p_icon: String) -> void:
	icon = p_icon
	queue_redraw()


func _draw() -> void:
	var s := minf(size.x, size.y)
	var o := (size - Vector2(s, s)) * 0.5
	var c := tint
	var dark := Color(0.08, 0.08, 0.09)
	var metal := Color(0.45, 0.47, 0.5)
	match icon:
		"pistol":
			_poly([Vector2(0.14, 0.34), Vector2(0.86, 0.34), Vector2(0.86, 0.48), Vector2(0.5, 0.48),
				Vector2(0.46, 0.56), Vector2(0.4, 0.8), Vector2(0.24, 0.8), Vector2(0.3, 0.48), Vector2(0.14, 0.48)], s, o, metal)
			draw_rect(Rect2(o + Vector2(0.16, 0.36) * s, Vector2(0.68, 0.04) * s), dark)
			draw_arc(o + Vector2(0.42, 0.52) * s, 0.06 * s, 0.0, PI, 8, dark, 2.0)
		"baton":
			draw_line(o + Vector2(0.18, 0.78) * s, o + Vector2(0.46, 0.5) * s, dark, 0.09 * s)
			draw_line(o + Vector2(0.46, 0.5) * s, o + Vector2(0.84, 0.16) * s, metal, 0.05 * s)
			draw_circle(o + Vector2(0.84, 0.16) * s, 0.04 * s, metal)
		"shotgun":
			draw_rect(Rect2(o + Vector2(0.08, 0.4) * s, Vector2(0.62, 0.05) * s), dark)
			draw_rect(Rect2(o + Vector2(0.22, 0.46) * s, Vector2(0.2, 0.07) * s), Color(0.45, 0.28, 0.15))
			_poly([Vector2(0.6, 0.38), Vector2(0.94, 0.44), Vector2(0.94, 0.62), Vector2(0.62, 0.52)], s, o, Color(0.45, 0.28, 0.15))
		"smg":
			draw_rect(Rect2(o + Vector2(0.18, 0.34) * s, Vector2(0.56, 0.14) * s), dark)
			draw_rect(Rect2(o + Vector2(0.08, 0.38) * s, Vector2(0.12, 0.05) * s), dark)
			draw_rect(Rect2(o + Vector2(0.38, 0.48) * s, Vector2(0.08, 0.3) * s), metal)
			draw_rect(Rect2(o + Vector2(0.6, 0.48) * s, Vector2(0.08, 0.2) * s), dark)
		"magnum":
			draw_rect(Rect2(o + Vector2(0.12, 0.34) * s, Vector2(0.42, 0.07) * s), metal)
			draw_circle(o + Vector2(0.58, 0.42) * s, 0.09 * s, metal)
			_poly([Vector2(0.62, 0.4), Vector2(0.78, 0.44), Vector2(0.86, 0.8), Vector2(0.7, 0.8)], s, o, Color(0.45, 0.28, 0.15))
		"shells":
			for i in 4:
				var xs := 0.22 + i * 0.15
				draw_rect(Rect2(o + Vector2(xs, 0.3) * s, Vector2(0.11, 0.36) * s), Color(0.7, 0.12, 0.08))
				draw_rect(Rect2(o + Vector2(xs, 0.58) * s, Vector2(0.11, 0.1) * s), Color(0.8, 0.65, 0.3))
		"magnum_ammo":
			for i in 3:
				var xm := 0.28 + i * 0.16
				draw_rect(Rect2(o + Vector2(xm, 0.34) * s, Vector2(0.1, 0.36) * s), Color(0.8, 0.65, 0.3))
				draw_circle(o + Vector2(xm + 0.05, 0.34) * s, 0.05 * s, Color(0.6, 0.45, 0.3))
		"ammo":
			draw_rect(Rect2(o + Vector2(0.2, 0.38) * s, Vector2(0.6, 0.38) * s), Color(0.55, 0.42, 0.22))
			draw_rect(Rect2(o + Vector2(0.2, 0.38) * s, Vector2(0.6, 0.1) * s), Color(0.75, 0.6, 0.15))
			for i in 4:
				var x := 0.28 + i * 0.13
				draw_rect(Rect2(o + Vector2(x, 0.2) * s, Vector2(0.07, 0.18) * s), Color(0.8, 0.65, 0.3))
				draw_circle(o + Vector2(x + 0.035, 0.2) * s, 0.035 * s, Color(0.7, 0.55, 0.25))
		"spray":
			draw_rect(Rect2(o + Vector2(0.36, 0.3) * s, Vector2(0.28, 0.55) * s), Color(0.85, 0.85, 0.82))
			draw_rect(Rect2(o + Vector2(0.42, 0.18) * s, Vector2(0.16, 0.12) * s), dark)
			draw_rect(Rect2(o + Vector2(0.36, 0.48) * s, Vector2(0.28, 0.14) * s), Color(0.75, 0.1, 0.08))
			draw_rect(Rect2(o + Vector2(0.47, 0.5) * s, Vector2(0.06, 0.1) * s), Color(1, 1, 1))
			draw_rect(Rect2(o + Vector2(0.44, 0.52) * s, Vector2(0.12, 0.06) * s), Color(1, 1, 1))
		"key":
			draw_circle(o + Vector2(0.3, 0.5) * s, 0.14 * s, Color(0.8, 0.65, 0.25))
			draw_circle(o + Vector2(0.3, 0.5) * s, 0.06 * s, Color(0.05, 0.05, 0.05))
			draw_rect(Rect2(o + Vector2(0.42, 0.47) * s, Vector2(0.4, 0.07) * s), Color(0.8, 0.65, 0.25))
			draw_rect(Rect2(o + Vector2(0.7, 0.54) * s, Vector2(0.05, 0.1) * s), Color(0.8, 0.65, 0.25))
			draw_rect(Rect2(o + Vector2(0.78, 0.54) * s, Vector2(0.04, 0.07) * s), Color(0.8, 0.65, 0.25))
		"fuse":
			draw_rect(Rect2(o + Vector2(0.28, 0.4) * s, Vector2(0.44, 0.2) * s), Color(0.88, 0.86, 0.8))
			draw_rect(Rect2(o + Vector2(0.18, 0.37) * s, Vector2(0.1, 0.26) * s), metal)
			draw_rect(Rect2(o + Vector2(0.72, 0.37) * s, Vector2(0.1, 0.26) * s), metal)
			draw_line(o + Vector2(0.3, 0.5) * s, o + Vector2(0.7, 0.5) * s, Color(0.6, 0.2, 0.1), 2.0)
		"keycard":
			draw_rect(Rect2(o + Vector2(0.18, 0.3) * s, Vector2(0.64, 0.42) * s), Color(0.88, 0.88, 0.86))
			draw_rect(Rect2(o + Vector2(0.18, 0.36) * s, Vector2(0.64, 0.08) * s), Color(0.15, 0.25, 0.45))
			draw_rect(Rect2(o + Vector2(0.24, 0.5) * s, Vector2(0.14, 0.16) * s), Color(0.5, 0.5, 0.5))
			for i in 3:
				draw_line(o + Vector2(0.44, 0.52 + i * 0.05) * s, o + Vector2(0.74, 0.52 + i * 0.05) * s, dark, 1.5)
		"crowbar":
			draw_line(o + Vector2(0.2, 0.8) * s, o + Vector2(0.72, 0.22) * s, Color(0.55, 0.25, 0.12), 0.07 * s)
			draw_line(o + Vector2(0.72, 0.22) * s, o + Vector2(0.84, 0.3) * s, Color(0.55, 0.25, 0.12), 0.07 * s)
			draw_line(o + Vector2(0.2, 0.8) * s, o + Vector2(0.14, 0.74) * s, Color(0.55, 0.25, 0.12), 0.07 * s)
		"battery":
			draw_rect(Rect2(o + Vector2(0.3, 0.28) * s, Vector2(0.4, 0.5) * s), dark)
			draw_rect(Rect2(o + Vector2(0.42, 0.22) * s, Vector2(0.16, 0.06) * s), metal)
			draw_rect(Rect2(o + Vector2(0.3, 0.28) * s, Vector2(0.4, 0.12) * s), Color(0.8, 0.65, 0.15))
		"flashlight":
			draw_rect(Rect2(o + Vector2(0.18, 0.44) * s, Vector2(0.46, 0.14) * s), dark)
			_poly([Vector2(0.64, 0.4), Vector2(0.82, 0.34), Vector2(0.82, 0.68), Vector2(0.64, 0.62)], s, o, Color(0.2, 0.2, 0.22))
			draw_rect(Rect2(o + Vector2(0.81, 0.36) * s, Vector2(0.03, 0.3) * s), Color(1, 0.95, 0.8))
		"document":
			draw_rect(Rect2(o + Vector2(0.26, 0.16) * s, Vector2(0.48, 0.66) * s), Color(0.85, 0.82, 0.72))
			for i in 6:
				draw_line(o + Vector2(0.32, 0.28 + i * 0.08) * s, o + Vector2(0.68 - (i % 2) * 0.1, 0.28 + i * 0.08) * s, Color(0.3, 0.28, 0.25), 1.5)
		_:
			draw_rect(Rect2(o + Vector2(0.3, 0.3) * s, Vector2(0.4, 0.4) * s), c, false, 2.0)


func _poly(pts: Array, s: float, o: Vector2, col: Color) -> void:
	var packed := PackedVector2Array()
	for p in pts:
		packed.append(o + (p as Vector2) * s)
	draw_colored_polygon(packed, col)

class_name PerfOverlay
extends Label
## Compteur de performances (F3) : images par seconde, temps d'image,
## appels de dessin et objets affichés ; en mode DEBUG, aussi la position, la
## zone, les créatures proches et leur état. Masqué par défaut.

var _t := 0.0


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_font_size_override("font_size", 14)
	add_theme_color_override("font_color", Color(0.75, 0.95, 0.75))
	add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	add_theme_constant_override("outline_size", 4)
	horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UITheme.anchor(self, 1.0, 0.0, -16, 12, -1, 1)


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("debug_perf"):
		visible = not visible
		_t = 0.0


func _process(delta: float) -> void:
	if not visible:
		return
	_t -= delta
	if _t > 0.0:
		return
	_t = 0.25
	text = PerfOverlay.summary()
	if DebugTools.enabled() and GameState.game:
		text += "\n" + DebugTools.info_lines()


## Résumé lisible (aussi utilisé par les tests en mode rendu).
static func summary() -> String:
	var fps := Performance.get_monitor(Performance.TIME_FPS)
	var cpu := Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
	var phys := Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
	var draws := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
	var objs := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME)
	var prims := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)
	var vram := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED) / 1048576.0
	return "%d FPS  ·  process %.1f ms  ·  physique %.1f ms\n%d appels de dessin  ·  %d objets  ·  %.0fk triangles  ·  VRAM %.0f Mo" % [
		fps, cpu, phys, draws, objs, prims / 1000.0, vram]

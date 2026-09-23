class_name EndingScreen
extends UIScreen
## Fin du chapitre 1 : titre, bilan, promesse du chapitre 2.

var box: VBoxContainer
var stats: Label


func _init() -> void:
	super._init()
	closable = false


func _ready() -> void:
	super._ready()
	add_dim(1.0)
	box = centered_vbox(720)
	var t := UITheme.label("BLACKWOOD", 92, Color(0.86, 0.84, 0.8), UITheme.font_title())
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(t)
	var s := UITheme.label("FIN DU CHAPITRE 1 — LE SIGNAL", 24, UITheme.COL_ACCENT_HI)
	s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(s)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 26)
	box.add_child(sp)
	var n := UITheme.label("Lena est vivante. Ou quelque chose qui porte sa voix.\nHalvorsen Biomedical sait qui est Ethan Cole.\nEt quelque part dans la vallée, le Site 2 attend.", 20, UITheme.COL_TEXT, UITheme.font_title_light())
	n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	n.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(n)
	var sp2 := Control.new()
	sp2.custom_minimum_size = Vector2(0, 22)
	box.add_child(sp2)
	stats = UITheme.label("", 17, UITheme.COL_DIM)
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(stats)
	var sp3 := Control.new()
	sp3.custom_minimum_size = Vector2(0, 22)
	box.add_child(sp3)
	var next := UITheme.label("À SUIVRE — CHAPITRE 2 : SITE 2", 22, UITheme.COL_TEXT, UITheme.font_ui_bold())
	next.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(next)
	var sp4 := Control.new()
	sp4.custom_minimum_size = Vector2(0, 30)
	box.add_child(sp4)
	var menu := UITheme.button("RETOUR AU MENU", 26)
	menu.alignment = HORIZONTAL_ALIGNMENT_CENTER
	menu.pressed.connect(func(): ui.request_quit_to_menu())
	box.add_child(menu)


func on_open() -> void:
	var kills := 0
	for k in GameState.dead_enemies:
		kills += 1
	stats.text = "Temps : %s   ·   Documents : %d / %d   ·   Créatures abattues : %d" % [
		SaveSystem.format_time(GameState.playtime), GameState.documents.size(), DocumentDB.DOCS.size(), kills]
	modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 1.0, 2.5)
	focus_first(box)

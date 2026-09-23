class_name HUD
extends Control
## Interface en jeu minimaliste : santé (ECG + PV), arme et munitions,
## batterie de la lampe, réticule en visée, invite d'interaction.

var ecg: ECGDisplay
var status_label: Label
var hp_label: Label
var weapon_box: Control
var weapon_label: Label
var ammo_label: Label
var belt_label: Label
var battery_box: Control
var battery_segments: Array[ColorRect] = []
var battery_pct: Label
var crosshair: Control
var prompt_label: Label
var prompt_key: Label
var prompt_box: Control
var countdown_label: Label
## Coop : état du partenaire (haut gauche) et bandeau « À TERRE ».
var partner_label: Label
var downed_label: Label
var _countdown := -1.0
var _fade := 1.0


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _ready() -> void:
	UITheme.fill(self)
	# Santé (bas gauche)
	var health := VBoxContainer.new()
	UITheme.anchor(health, 0.0, 1.0, 34, -30, 1, -1)
	health.add_theme_constant_override("separation", 0)
	add_child(health)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	health.add_child(row)
	status_label = UITheme.label("BON", 20, UITheme.COL_FINE, UITheme.font_ui_bold())
	row.add_child(status_label)
	hp_label = UITheme.label("PV 100", 18, UITheme.COL_DIM)
	row.add_child(hp_label)
	ecg = ECGDisplay.new()
	health.add_child(ecg)

	# Arme (bas droite)
	weapon_box = VBoxContainer.new()
	UITheme.anchor(weapon_box, 1.0, 1.0, -34, -52, -1, -1)
	weapon_box.custom_minimum_size = Vector2(216, 0)
	add_child(weapon_box)
	weapon_label = UITheme.label("PISTOLET 9MM", 17, UITheme.COL_DIM)
	weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	weapon_box.add_child(weapon_label)
	ammo_label = UITheme.label("12 | 24", 34, UITheme.COL_TEXT, UITheme.font_ui_bold())
	ammo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	weapon_box.add_child(ammo_label)
	# Ceinture d'armes : 1 à 5, arme en main en surbrillance
	belt_label = UITheme.label("", 14, UITheme.COL_FAINT, UITheme.font_ui_bold())
	belt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	weapon_box.add_child(belt_label)

	# Batterie de la lampe (bas droite, sous l'arme)
	battery_box = HBoxContainer.new()
	UITheme.anchor(battery_box, 1.0, 1.0, -34, -26, -1, -1)
	battery_box.custom_minimum_size = Vector2(216, 0)
	battery_box.alignment = BoxContainer.ALIGNMENT_END
	add_child(battery_box)
	var bl := UITheme.label("LAMPE", 14, UITheme.COL_DIM)
	battery_box.add_child(bl)
	# Indicateur à paliers (100/75/50/25/10/0) : quatre segments + pourcentage
	var segs := HBoxContainer.new()
	segs.add_theme_constant_override("separation", 3)
	segs.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	battery_box.add_child(segs)
	for i in 4:
		var r := ColorRect.new()
		r.custom_minimum_size = Vector2(18, 9)
		segs.add_child(r)
		battery_segments.append(r)
	battery_pct = UITheme.label("100 %", 14, UITheme.COL_DIM, UITheme.font_ui_bold())
	battery_pct.custom_minimum_size = Vector2(46, 0)
	battery_pct.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	battery_box.add_child(battery_pct)

	# Compte à rebours (autodestruction), haut centre
	countdown_label = UITheme.label("", 30, UITheme.COL_DANGER, UITheme.font_ui_bold())
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	countdown_label.add_theme_constant_override("shadow_offset_x", 2)
	countdown_label.add_theme_constant_override("shadow_offset_y", 2)
	UITheme.anchor(countdown_label, 0.5, 0.0, 0, 26, 0, 1)
	countdown_label.custom_minimum_size = Vector2(520, 0)
	countdown_label.visible = false
	add_child(countdown_label)

	# Coop : partenaire (haut gauche) et joueur à terre (centre)
	partner_label = UITheme.label("", 17, UITheme.COL_DIM, UITheme.font_ui_bold())
	partner_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	partner_label.add_theme_constant_override("shadow_offset_x", 2)
	partner_label.add_theme_constant_override("shadow_offset_y", 2)
	UITheme.anchor(partner_label, 0.0, 0.0, 34, 26, 1, 1)
	partner_label.visible = false
	add_child(partner_label)
	downed_label = UITheme.label("", 30, UITheme.COL_DANGER, UITheme.font_ui_bold())
	downed_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	downed_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	downed_label.add_theme_constant_override("shadow_offset_x", 2)
	downed_label.add_theme_constant_override("shadow_offset_y", 2)
	UITheme.anchor(downed_label, 0.5, 0.5, 0, 90, 0, 0)
	downed_label.custom_minimum_size = Vector2(900, 0)
	downed_label.visible = false
	add_child(downed_label)

	# Réticule
	crosshair = Crosshair.new()
	add_child(crosshair)
	UITheme.anchor(crosshair, 0.5, 0.5, -20, -20)

	# Invite d'interaction
	prompt_box = HBoxContainer.new()
	UITheme.anchor(prompt_box, 0.5, 1.0, 0, -170, 0, -1)
	prompt_box.custom_minimum_size = Vector2(320, 0)
	prompt_box.alignment = BoxContainer.ALIGNMENT_CENTER
	prompt_box.add_theme_constant_override("separation", 10)
	add_child(prompt_box)
	var key_panel := PanelContainer.new()
	var ks := StyleBoxFlat.new()
	ks.bg_color = Color(0.85, 0.83, 0.78, 0.92)
	ks.content_margin_left = 9
	ks.content_margin_right = 9
	ks.content_margin_top = 1
	ks.content_margin_bottom = 1
	ks.corner_radius_top_left = 3
	ks.corner_radius_top_right = 3
	ks.corner_radius_bottom_left = 3
	ks.corner_radius_bottom_right = 3
	key_panel.add_theme_stylebox_override("panel", ks)
	prompt_key = UITheme.label("E", 18, Color(0.05, 0.05, 0.05), UITheme.font_ui_bold())
	key_panel.add_child(prompt_key)
	prompt_box.add_child(key_panel)
	prompt_label = UITheme.label("OUVRIR", 20, UITheme.COL_TEXT, UITheme.font_ui_bold())
	prompt_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	prompt_label.add_theme_constant_override("shadow_offset_x", 2)
	prompt_label.add_theme_constant_override("shadow_offset_y", 2)
	prompt_box.add_child(prompt_label)


## Affiche le compte à rebours (secondes restantes ; < 0 pour le masquer).
func set_countdown(t: float) -> void:
	_countdown = t
	countdown_label.visible = t >= 0.0
	if t >= 0.0:
		var s := int(ceil(t))
		countdown_label.text = "AUTODESTRUCTION — %02d:%02d" % [s / 60, s % 60]
		countdown_label.modulate.a = 1.0 if t > 30.0 or fmod(t, 0.6) < 0.4 else 0.35


func _process(delta: float) -> void:
	var p := GameState.player as Player
	if p == null:
		visible = false
		return
	visible = true
	var status := GameState.health_status()
	status_label.text = {"fine": "BON", "caution": "ATTENTION", "danger": "DANGER"}[status]
	status_label.add_theme_color_override("font_color", UITheme.COL_FINE if status == "fine" else (UITheme.COL_CAUTION if status == "caution" else UITheme.COL_DANGER))
	hp_label.text = "PV %d" % int(ceil(GameState.hp))
	var armed := p.is_armed()
	weapon_box.visible = armed
	if armed:
		var d := p.weapons.def()
		var melee := String(d.get("kind", "")) == "melee"
		var mag := p.weapons.mag_now()
		ammo_label.text = "—" if melee else "%d | %d" % [mag, GameState.weapon_reserve()]
		ammo_label.add_theme_color_override("font_color", UITheme.COL_DANGER if (mag == 0 and not melee) else UITheme.COL_TEXT)
		weapon_label.text = String(d.get("short", "")) + ("  —  RECHARGEMENT" if p.weapons.reloading else "")
		var belt := ""
		for i in WeaponDB.ORDER.size():
			var w: String = WeaponDB.ORDER[i]
			if GameState.has_weapon(w):
				belt += ("[%d]" if w == GameState.equipped else " %d ") % (i + 1)
			else:
				belt += " · "
		belt_label.text = belt
	battery_box.visible = GameState.get_flag("has_flashlight")
	_update_battery()
	crosshair.visible = Settings.crosshair and armed and (p.aiming or p.is_first_person())
	(crosshair as Crosshair).spread = 1.0 if Input.is_action_pressed("aim") else 2.6
	_update_coop(p)
	var f := p.focused
	var show_prompt := f != null and p.controls_enabled and not p.is_dead and not p.data.downed
	prompt_box.visible = show_prompt
	if show_prompt:
		prompt_label.text = f.get_prompt()
		prompt_key.text = InputSetup.key_label("interact")


class Crosshair extends Control:
	var spread := 1.0

	func _init() -> void:
		custom_minimum_size = Vector2(40, 40)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(_d: float) -> void:
		queue_redraw()

	func _draw() -> void:
		var c := Vector2(20, 20)
		var col := Color(0.9, 0.88, 0.82, 0.85)
		var g := 4.0 * spread
		draw_circle(c, 1.6, col)
		draw_line(c + Vector2(g, 0), c + Vector2(g + 6, 0), col, 1.5)
		draw_line(c - Vector2(g, 0), c - Vector2(g + 6, 0), col, 1.5)
		draw_line(c + Vector2(0, g), c + Vector2(0, g + 6), col, 1.5)
		draw_line(c - Vector2(0, g), c - Vector2(0, g + 6), col, 1.5)


## Coop : santé et état du partenaire ; bandeau quand on est soi-même à terre.
func _update_coop(p: Player) -> void:
	var g := GameState.game as Game
	var coop := g != null and g.coop != null and g.players.size() >= 2
	partner_label.visible = coop
	if coop:
		var lines: Array = []
		for slot in g.players:
			if int(slot) == p.slot:
				continue
			var pd := GameState.data(int(slot))
			var state := "PV %d" % int(ceil(pd.hp))
			if pd.dead:
				state = "MORT"
			elif pd.downed:
				state = "À TERRE — %d s" % int(ceil(maxf(pd.bleed_t, 0.0)))
			lines.append("JOUEUR %d  ·  %s" % [int(slot), state])
		partner_label.text = "\n".join(lines)
		var any_down := false
		for slot in g.players:
			if int(slot) != p.slot and GameState.data(int(slot)).downed:
				any_down = true
		partner_label.add_theme_color_override("font_color", UITheme.COL_DANGER if any_down else UITheme.COL_DIM)
	downed_label.visible = p.data.downed and not p.data.dead
	if downed_label.visible:
		downed_label.text = "À TERRE — %d s\nVotre partenaire peut vous relever ([%s] près de vous)." % [
			int(ceil(maxf(p.data.bleed_t, 0.0))), InputSetup.key_label("interact")]


## Segments allumés selon le palier ; clignote en rouge à 10 %, grisé à 0 %.
func _update_battery() -> void:
	var level := Flashlight.battery_level(GameState.flashlight_battery)
	var lit := {100: 4, 75: 3, 50: 2, 25: 1, 10: 1, 0: 0}[level] as int
	var warn := level <= 10
	var blink := warn and level > 0 and int(Time.get_ticks_msec() / 400) % 2 == 0
	for i in battery_segments.size():
		var on := i < lit and not blink
		battery_segments[i].color = (Color(0.95, 0.25, 0.2, 0.9) if warn else Color(0.9, 0.85, 0.6, 0.85)) if on else Color(0.25, 0.25, 0.25, 0.55)
	battery_pct.text = ("%d %%" % level) if level > 0 else "VIDE"
	battery_pct.add_theme_color_override("font_color", UITheme.COL_DANGER if warn else UITheme.COL_DIM)

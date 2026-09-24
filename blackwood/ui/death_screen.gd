class_name DeathScreen
extends UIScreen
## Écran de mort : YOU DIED — RETRY / QUIT TO MENU

const TIPS := [
	"Les créatures entendent vos pas. Marchez plutôt que courir près d'elles.",
	"Une balle dans la tête vaut trois balles dans le torse.",
	"Éteindre la lampe (F) rend plus difficile à repérer.",
	"L'esquive ({key:dodge}) rend brièvement insaisissable.",
	"Rien ne vous oblige à tuer chaque créature. Les munitions sont rares.",
	"Le magnétophone enregistre votre progression. Pensez-y avant l'inconnu.",
]

var box: VBoxContainer
var title: Label
var tip: Label
var retry_btn: Button
var waiting: Label
var _t := 0.0


func _init() -> void:
	super._init()
	closable = false


func _ready() -> void:
	super._ready()
	add_dim(0.0)
	var bg := get_child(0) as ColorRect
	bg.color = Color(0.05, 0.0, 0.0, 0.88)
	box = centered_vbox(640)
	title = UITheme.label("YOU DIED", 110, Color(0.62, 0.05, 0.04), UITheme.font_title())
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	tip = UITheme.label("", 18, UITheme.COL_DIM)
	tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tip.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(tip)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 30)
	box.add_child(sp)
	var retry := UITheme.button("RETRY", 32)
	retry.alignment = HORIZONTAL_ALIGNMENT_CENTER
	retry.pressed.connect(func(): ui.request_retry())
	box.add_child(retry)
	retry_btn = retry
	waiting = UITheme.label("En attente de l'hôte : il relance la partie pour vous deux.", 18, UITheme.COL_DIM)
	waiting.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	waiting.visible = false
	box.add_child(waiting)
	var quit := UITheme.button("QUIT TO MENU", 26)
	quit.alignment = HORIZONTAL_ALIGNMENT_CENTER
	quit.pressed.connect(func(): ui.request_quit_to_menu())
	box.add_child(quit)


func on_open() -> void:
	# Coop : GAME OVER quand plus personne n'est debout ; seul l'hôte relance
	var coop := Net.active and GameState.game != null and (GameState.game as Game).players.size() >= 2
	title.text = "GAME OVER" if coop else "YOU DIED"
	retry_btn.visible = not Net.is_client()
	waiting.visible = Net.is_client()
	tip.text = InputSetup.fill_keys(TIPS[randi() % TIPS.size()])
	_t = 0.0
	modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 1.0, 1.5)
	focus_first(box)
	Audio.play_2d("death_sting", -2.0)


func _process(delta: float) -> void:
	_t += delta
	title.scale = Vector2.ONE * (1.0 + _t * 0.01)
	title.pivot_offset = title.size * 0.5

class_name PatientZero
extends BossHumanoid
## LE PATIENT ZÉRO — Élias Brandt, le premier humain traité par ECHO.
## Il parle, il se souvient ; il reconnaît Thomas (« tu as ses yeux ») et
## Sarah, qui lui lisait des histoires pour qu'il n'oublie pas son nom.
## Chaque blessure se referme si on le laisse souffler ; son cri réveille les
## sujets des cuves (mutations) et interrompt Thomas.

signal summon_mutants

const LINES := [
	"Élias : « Encore… Ils recommencent toujours. Encore. »",
	"Élias : « Tu as ses yeux. Les yeux de Sarah. »",
	"Élias : « Ne me fais pas mal… Je guéris. Je guéris TOUJOURS. »",
	"Élias : « Léa… ma fille s'appelle Léa. Je le dis pour ne pas l'oublier. »",
	"Élias : « Ils m'ont promis que je rentrerais chez moi. »",
]
const LUCID := [
	"Élias : « Thomas… Sarah parlait de toi. Le petit frère qui répare tout. »",
	"Élias : « Elle me lisait des histoires, la nuit… pour que je garde mon nom. Tue-moi avant que je l'oublie. »",
]

## Régénération (part des PV max par seconde) quand on le laisse souffler.
const REGEN_RATE := 0.012

var in_cell := true
var _regen_delay := 0.0
var _talk_t := 6.0
var _line_i := 0
var _summoned := false
var _hp_emit_t := 0.0


func _init() -> void:
	super._init()
	variant = "zero"
	max_hp = 2200.0
	walk_speed = 1.2
	chase_speed = 3.3
	turn_speed = 7.0
	attack_range = 1.9
	attack_damage = 24.0
	attack_windup = 0.5
	attack_recovery = 0.7
	vision_range = 18.0
	vision_range_lit = 22.0
	vision_fov = deg_to_rad(220.0)
	proximity = 5.0
	hearing_scale = 1.5
	lose_time = 40.0
	search_time = 25.0
	give_up_distance = 90.0
	stagger_chance = 0.2
	body_radius = 0.38
	body_height = 1.95
	lunge_speed = 9.0
	lunge_time = 0.55
	lunge_damage = 28.0
	lunge_max = 11.0
	scream_sound = "zero_scream"
	scream_damage = 8.0
	lucid_thresholds = [0.7, 0.35]
	lucid_time = 4.5
	lucid_damage_mult = 1.5


func _apply_variant() -> void:
	hp = max_hp


func _rig_cfg() -> Dictionary:
	return {"height": 1.1, "bulk": 0.9, "shoulder_width": 0.95, "arm_len": 1.22, "arm_thick": 0.9,
		"leg_thick": 0.9, "hunch": 0.25, "hair": false}


func skin_look() -> Dictionary:
	return {"pallor": 0.75, "blood": 0.95, "wet": 0.7, "skin_tint": Color(1.0, 0.86, 0.82),
		"cloth_tint": Color(0.82, 0.82, 0.78), "cloth_mix": 0.75,
		"bone_scale": {"Spine": Vector3(1.1, 1.0, 1.05), "LeftArm": Vector3(1.1, 1.12, 1.1), "RightArm": Vector3(1.15, 1.15, 1.15)}}


## Excroissances osseuses : ECHO ne s'arrête jamais de reconstruire.
func _extra_body() -> void:
	var bone := Mats.get_mat("plastic_beige")
	for g in [["spine", Vector3(0.0, 0.2, 0.14), Vector3(0.06, 0.26, 0.06), Vector3(-0.6, 0, 0)],
			["spine", Vector3(0.08, 0.1, 0.15), Vector3(0.05, 0.2, 0.05), Vector3(-0.8, 0, 0.3)],
			["shoulder_r", Vector3(0.05, 0.05, 0.02), Vector3(0.05, 0.22, 0.05), Vector3(0, 0, -0.9)],
			["elbow_l", Vector3(0.0, -0.1, 0.05), Vector3(0.04, 0.16, 0.04), Vector3(0.8, 0, 0)]]:
		rig.attach_mesh(String(g[0]), rig._box(g[2]), bone, g[1], g[3])


func _hitbox_scale() -> float:
	return 1.1


## Brise la vitre de sa cellule : le combat commence.
func release() -> void:
	in_cell = false
	active = true
	passive = false
	var p := player()
	if p:
		last_known = p.global_position
	set_state(State.CHASE)
	boss_hp_changed.emit(hp, max_hp)


func take_damage(amount: float, hit_pos: Vector3, dir: Vector3, is_head: bool) -> void:
	_regen_delay = 4.0
	super.take_damage(amount, hit_pos, dir, is_head)
	# À mi-vie, son cri réveille les sujets des cuves
	if not _summoned and active and state != State.DEAD and hp < max_hp * 0.5:
		_summoned = true
		_scream_cd = 0.0
		summon_mutants.emit()


func _on_lucid(n: int) -> void:
	if GameState.ui:
		GameState.ui.show_subtitle(LUCID[mini(n - 1, LUCID.size() - 1)], lucid_time)
	Audio.play_3d("zero_whisper", global_position + Vector3.UP * 1.7, 4.0, 0.0, 30.0, 5.0)


func _pre_physics(delta: float) -> bool:
	if in_cell:
		_hold_still(delta)
		_animate(delta)
		return true
	# Régénération dès qu'on le laisse souffler
	_regen_delay = maxf(_regen_delay - delta, 0.0)
	if active and _regen_delay <= 0.0 and hp < max_hp:
		hp = minf(max_hp, hp + max_hp * REGEN_RATE * delta)
		_hp_emit_t -= delta
		if _hp_emit_t <= 0.0:
			_hp_emit_t = 0.5
			boss_hp_changed.emit(hp, max_hp)
	# Il parle pendant le combat
	_talk_t -= delta
	if _talk_t <= 0.0 and active and _hesitate_t <= 0.0:
		_talk_t = randf_range(8.0, 12.0)
		var p := player()
		if p and global_position.distance_to(p.global_position) < 16.0 and GameState.ui:
			GameState.ui.show_subtitle(LINES[_line_i % LINES.size()], 3.5)
			_line_i += 1
			Audio.play_3d("zero_whisper", global_position + Vector3.UP * 1.7, 0.0, 0.1, 25.0, 4.0)
	return false


func _voice(kind: String) -> void:
	var pos := global_position + Vector3.UP * 1.7
	match kind:
		"alert":
			Audio.play_3d("zero_scream", pos, 2.0, 0.05, 50.0, 6.0)
		"hurt":
			Audio.play_3d("hollow_hurt", pos, 0.0, 0.1, 25.0, 3.0, 0.85)
		"attack":
			Audio.play_3d("swing_heavy", pos, -2.0, 0.08, 22.0, 3.0)
		"death":
			Audio.play_3d("zero_scream", pos, 4.0, 0.0, 60.0, 8.0, 0.7)
		"idle", "chase":
			Audio.play_3d("zero_whisper", pos, -6.0, 0.15, 20.0, 3.0)


func _animate(delta: float) -> void:
	if in_cell:
		# Debout contre la vitre, le front presque collé, immobile
		var t := Time.get_ticks_msec() * 0.001
		rig.reset_pose()
		rig.pose("head", Vector3(0.2, sin(t * 0.3) * 0.15, 0.25))
		rig.pose("shoulder_l", Vector3(0.1, 0, -0.1))
		rig.pose("shoulder_r", Vector3(1.1, 0, 0.1))
		rig.pose("elbow_r", Vector3(0.6, 0, 0))
		rig.pose("spine", Vector3(-0.2, 0, 0))
		rig.apply(delta, 0.6)
		return
	super._animate(delta)

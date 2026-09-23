class_name ExaminePoint
extends Interactable
## Élément du décor qu'on peut examiner (symboles, photos, portes bloquées…).

var text := ""
## Texte alternatif affiché une fois un drapeau posé (ex. après un événement).
var alt_text := ""
var alt_flag := ""
var set_flag_on_examine := ""
var sound := ""


func _ready() -> void:
	if prompt_text == "":
		prompt_text = "EXAMINER"


func interact(_player: Node) -> void:
	var t := text
	if alt_flag != "" and GameState.get_flag(alt_flag):
		t = alt_text
	var duration := clampf(2.0 + t.length() * 0.045, 3.0, 9.0)
	GameState.show_message(t, duration)
	if sound != "":
		Audio.play_3d(sound, global_position + focus_offset, -2.0, 0.05, 12.0, 3.0)
	if set_flag_on_examine != "":
		GameState.set_flag(set_flag_on_examine, true)

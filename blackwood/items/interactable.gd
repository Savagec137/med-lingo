class_name Interactable
extends Node3D
## Base de tout ce qui réagit à la touche E : portes, objets, documents,
## mécanismes. Le joueur choisit l'interactable le plus proche dans son champ.

## Texte de l'invite (« [E] OUVRIR »). Peut être surchargé par get_prompt().
@export var prompt_text := "EXAMINER"
## Distance d'interaction (mètres, mesurée à plat depuis le joueur).
var interact_radius := 1.7
## Hauteur du point d'intérêt par rapport à l'origine du nœud.
var focus_offset := Vector3(0, 1.0, 0)
var enabled := true
## Identifiant stable pour la sauvegarde.
var uid := ""
## Coop : clé identique sur les deux machines (demandes du client au serveur).
var net_key := ""


func _enter_tree() -> void:
	add_to_group("interactable")


func get_prompt() -> String:
	return prompt_text


func can_interact() -> bool:
	return enabled and is_visible_in_tree()


func interact(_player: Node) -> void:
	pass


func focus_position() -> Vector3:
	return global_transform * focus_offset

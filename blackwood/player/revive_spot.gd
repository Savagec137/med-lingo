class_name ReviveSpot
extends Interactable
## Coop : point d'interaction porté par chaque joueur. Quand il est à terre,
## son partenaire voit « [E] RÉANIMER » et le relève (voir Coop.start_revive).

var owner_player: Node = null


func _ready() -> void:
	prompt_text = "RÉANIMER"
	interact_radius = 1.9
	focus_offset = Vector3(0, 0.35, 0)


func get_prompt() -> String:
	return "RÉANIMER LE JOUEUR %d" % int(owner_player.get("slot")) if owner_player else prompt_text


func can_interact() -> bool:
	if not enabled or owner_player == null or not is_instance_valid(owner_player):
		return false
	var pd: PlayerData = owner_player.get("data")
	return pd != null and pd.downed and not pd.dead


func interact(player: Node) -> void:
	if player == owner_player or not can_interact():
		return
	var c := Coop.instance()
	if c and Net.is_server():
		c.start_revive(int(player.get("slot")), int(owner_player.get("slot")))

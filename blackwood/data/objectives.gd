class_name Objectives
extends RefCounted
## Objectif courant déduit de la progression (drapeaux + inventaire).


static func current(gs: Node) -> String:
	if gs.get_flag("game_complete"):
		return "Fin du chapitre 1."
	if gs.get_flag("self_destruct"):
		if gs.get_flag("esc_b1"):
			return "SORTIR ! Box de soins, accueil des urgences, quai des ambulances… et la rampe."
		if gs.get_flag("esc_8"):
			return "Le monte-charge, à l'est du couloir du 8e : descendre au -1 !"
		return "AUTODESTRUCTION ! Descendre par l'escalier C (ouest) jusqu'au 8e étage."
	if gs.get_flag("reached_f12"):
		return "Détruire le laboratoire : console d'autodestruction, poste de commande au nord."
	if gs.get_flag("sarah_dead"):
		return "Monter au 12e par l'escalier de secours C, au bout ouest du couloir."
	if gs.get_flag("sarah_boss_started"):
		return "Sarah…"
	if gs.get_flag("reached_f11"):
		return "Trouver Sarah : le centre de contrôle, au sud du couloir."
	if gs.has_item("key_private"):
		return "L'ascenseur de direction (8e, à côté du monte-charge) : monter au 11e."
	if gs.get_flag("sarah_video_seen"):
		return "Ouvrir le coffre du Dr Vance (bureau au nord du couloir). Code : 0309."
	if gs.get_flag("reached_f8"):
		return "Fouiller le laboratoire expérimental. Le bureau de recherche est au sud du couloir."
	if gs.has_item("card_research"):
		return "Descendre au -2 par les ascenseurs, puis prendre le monte-charge de recherche jusqu'au 8e."
	if gs.get_flag("reached_floor_6"):
		return "Fouiller le 6e étage. La cellule de crise est au nord du couloir."
	if gs.get_flag("stair_b_open"):
		return "Monter au 6e par l'escalier de service B."
	if gs.get_flag("surgeon_started") and not gs.get_flag("surgeon_dead"):
		return "Survivre au Chirurgien. Les bouteilles d'oxygène du couloir…"
	if gs.has_document("doc_sarah_note"):
		return "Retourner au 1er étage (ascenseurs) : escalier de service B, code 0612."
	if gs.has_item("key_locker"):
		return "Ouvrir le casier de Sarah : salle de repos des infirmières, au nord-ouest du couloir."
	if gs.get_flag("reached_f3"):
		return "Chercher des traces de Sarah dans son service. Le poste de soins est au nord du couloir."
	if gs.get_flag("power_restored"):
		return "Le courant est revenu : prendre les ascenseurs jusqu'au 3e, le service de Sarah."
	if gs.get_flag("b2_arrived"):
		return "Rétablir le courant : salle des groupes électrogènes (procédure dans le local technique)."
	if gs.has_item("key_technical"):
		return "Descendre au sous-sol -2 par l'escalier A : la clé du local technique ouvre la porte."
	if gs.get_flag("reached_ground"):
		return "Explorer l'hôpital et trouver un chemin vers le 3e, le service de Sarah."
	if gs.get_flag("nurse_seen"):
		return "FUIR ! L'escalier A, à l'ouest du couloir."
	if gs.get_flag("entered_hospital"):
		return "Traverser les urgences."
	if gs.get_flag("main_door_seen"):
		return "Entrer par les urgences : la rampe des ambulances, côté est du parking."
	return "Entrer dans l'hôpital Blackwood."

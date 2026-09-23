class_name Objectives
extends RefCounted
## Objectif courant déduit de la progression (drapeaux + inventaire).


static func current(gs: Node) -> String:
	if gs.get_flag("game_complete"):
		return "Fin du chapitre 1."
	if gs.get_flag("boss_dead"):
		return "Quitter le bâtiment par le tunnel de service, au nord de la salle du générateur."
	if gs.get_flag("boss_started"):
		return "Survivre. Ce qu'est devenu le Dr. Marrow garde la sortie."
	if gs.get_flag("generator_door_forced"):
		return "Entrer dans la salle du générateur."
	if gs.has_item("crowbar"):
		return "Forcer la porte de la salle du générateur (ouest du niveau B)."
	if gs.get_flag("basement_unlocked"):
		return "Explorer le niveau B. La porte de la salle du générateur est coincée."
	if gs.has_item("keycard_b"):
		return "Descendre au niveau B : porte nord du laboratoire, lecteur de carte."
	if gs.get_flag("fuse_inserted"):
		return "Le bâtiment est verrouillé. Explorer les laboratoires (aile est)."
	if gs.has_item("fuse"):
		return "Rétablir le courant : boîtier électrique du hall, à côté de la porte des laboratoires."
	if gs.get_flag("has_pistol"):
		if gs.has_document("doc_archivist"):
			return "Ouvrir le coffre des archives. Le code suit « l'ordre du protocole »."
		return "Fouiller la salle de sécurité."
	if gs.get_flag("security_breach"):
		return "Atteindre la salle de sécurité, au bout du couloir ouest."
	if gs.get_flag("has_flashlight"):
		return "Quitter les archives."
	if gs.get_flag("admin_unlocked"):
		return "Explorer l'aile administrative."
	if gs.has_item("admin_key"):
		return "Ouvrir la porte de l'administration (côté ouest du hall)."
	if gs.get_flag("entered_building"):
		return "Explorer le hall d'accueil."
	return "Entrer dans le centre de recherche Blackwood."

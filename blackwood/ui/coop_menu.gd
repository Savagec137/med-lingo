class_name CoopMenu
extends UIScreen
## CO-OP : HOST GAME / JOIN GAME / BACK.
##   HOST GAME  ouvre une partie (serveur d'écoute, port 24890) : salon avec les
##              adresses à donner au partenaire, puis NOUVELLE PARTIE ou
##              CONTINUER (la sauvegarde la plus récente). Le partenaire peut
##              aussi rejoindre une partie déjà commencée.
##   JOIN GAME  adresse IP de l'hôte, ou SEARCH SESSION (réseau local) ;
##              écrans CONNECTING… et CONNECTION FAILED.

var box: VBoxContainer
var title: Label
var info: Label
var body: VBoxContainer
var ip_edit: LineEdit
var sessions: VBoxContainer
var page := "root"
var _status := ""
## Dernière adresse saisie (le temps de la session).
static var last_ip := "127.0.0.1"


func _init() -> void:
	super._init()
	pauses_game = false
	closable = false


func _ready() -> void:
	super._ready()
	add_dim(0.78)
	box = centered_vbox(640)
	title = UITheme.label("CO-OP", 64, UITheme.COL_TEXT, UITheme.font_title())
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	info = UITheme.label("", 18, UITheme.COL_DIM)
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(info)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 14)
	box.add_child(sp)
	body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 6)
	box.add_child(body)
	Net.hosting_started.connect(func() -> void:
		if visible:
			show_page("host"))
	Net.joined.connect(func() -> void:
		if visible:
			show_page("waiting"))
	Net.connection_failed.connect(func(reason: String) -> void:
		_status = reason
		if visible:
			show_page("failed"))
	Net.server_lost.connect(func() -> void:
		_status = "L'hôte a fermé la partie."
		if visible:
			show_page("failed"))
	Net.peer_joined.connect(func(_id: int) -> void:
		if visible and page == "host":
			show_page("host"))
	Net.peer_left.connect(func(_id: int, _slot: int) -> void:
		if visible and page == "host":
			show_page("host"))
	Net.sessions_found.connect(_on_sessions)


func on_open() -> void:
	show_page("root")


func _clear() -> void:
	for c in body.get_children():
		body.remove_child(c)
		c.queue_free()
	ip_edit = null
	sessions = null


func _button(text: String, cb: Callable, size: int = 28) -> Button:
	var b := UITheme.button(text, size)
	b.alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.pressed.connect(cb)
	body.add_child(b)
	return b


func show_page(p: String) -> void:
	page = p
	_clear()
	match p:
		"root":
			title.text = "CO-OP"
			info.text = "Deux joueurs, en ligne. L'hôte (joueur 1) fait tourner la partie ; son partenaire (joueur 2) le rejoint par son adresse IP ou sur le réseau local."
			_button("HOST GAME", _host)
			_button("JOIN GAME", func() -> void: show_page("join"))
			_button("BACK", _back)
		"host":
			title.text = "HOST GAME"
			var addrs := Net.local_addresses()
			var peer_line := "Joueur 2 : connecté." if Net.player_count() >= 2 else "Joueur 2 : en attente…"
			info.text = "Partie ouverte sur le port %d.\nAdresse à donner à votre partenaire : %s\n%s\n(Il peut aussi vous rejoindre en cours de partie.)" % [
				Net.PORT, ", ".join(addrs) if not addrs.is_empty() else "127.0.0.1 (cette machine)", peer_line]
			var ff := _button("TIR AMI : %s" % ("OUI" if Net.friendly_fire else "NON"), func() -> void: pass, 22)
			ff.pressed.connect(func() -> void:
				Net.friendly_fire = not Net.friendly_fire
				ff.text = "TIR AMI : %s" % ("OUI" if Net.friendly_fire else "NON"))
			_button("NOUVELLE PARTIE", func() -> void: ui.request_new_game())
			var latest := SaveSystem.latest_slot()
			var cont := _button("CONTINUER (dernière sauvegarde)", func() -> void:
				var slot := SaveSystem.latest_slot()
				if slot >= 0:
					ui.request_load(slot))
			cont.disabled = latest < 0
			_button("LEAVE", func() -> void:
				Net.leave()
				show_page("root"))
		"join":
			title.text = "JOIN GAME"
			info.text = "Adresse IP de l'hôte (port %d), ou recherche sur le réseau local." % Net.PORT
			ip_edit = LineEdit.new()
			ip_edit.text = last_ip
			ip_edit.placeholder_text = "192.168.1.20"
			ip_edit.custom_minimum_size = Vector2(640, 40)
			ip_edit.alignment = HORIZONTAL_ALIGNMENT_CENTER
			ip_edit.text_submitted.connect(func(_t: String) -> void: _join())
			body.add_child(ip_edit)
			_button("REJOINDRE", _join)
			_button("SEARCH SESSION", func() -> void:
				info.text = "Recherche des parties sur le réseau local…"
				Net.search_sessions(1.5))
			sessions = VBoxContainer.new()
			body.add_child(sessions)
			_button("BACK", func() -> void: show_page("root"))
		"connecting":
			title.text = "CONNECTING..."
			info.text = "Connexion à l'hôte…"
			_button("ANNULER", func() -> void:
				Net.leave()
				show_page("join"))
		"waiting":
			title.text = "CONNECTÉ"
			info.text = "Vous êtes le joueur 2. En attente de l'hôte : la partie commence dès qu'il la lance."
			_button("LEAVE", func() -> void:
				Net.leave()
				show_page("root"))
		"failed":
			title.text = "CONNECTION FAILED"
			info.text = _status if _status != "" else "La connexion a échoué."
			_button("BACK", func() -> void: show_page("join" if not Net.active else "root"))
	focus_first(body)


func _host() -> void:
	if Net.host() == OK:
		show_page("host")
	else:
		show_page("failed")


func _join() -> void:
	var addr := ip_edit.text.strip_edges() if ip_edit else "127.0.0.1"
	if addr == "":
		addr = "127.0.0.1"
	last_ip = addr
	# « adresse:port » accepté (port par défaut : 24890)
	var port := Net.PORT
	if addr.count(":") == 1:
		port = int(addr.get_slice(":", 1))
		addr = addr.get_slice(":", 0)
	_join_address(addr, port)


func _join_address(addr: String, port: int) -> void:
	_status = ""
	if Net.join(addr, port) == OK:
		show_page("connecting")
	else:
		show_page("failed")


func _on_sessions(list: Array) -> void:
	if not visible or page != "join" or sessions == null:
		return
	for c in sessions.get_children():
		c.queue_free()
	if list.is_empty():
		info.text = "Aucune partie trouvée sur le réseau local. Saisissez l'adresse de l'hôte."
		return
	info.text = "%d partie(s) trouvée(s) :" % list.size()
	for d in list:
		var s: Dictionary = d
		var b := UITheme.button("%s — %s (%d/%d)" % [String(s.get("name", "Blackwood")), String(s.get("ip", "?")),
			int(s.get("players", 1)), int(s.get("max", 2))], 22)
		b.alignment = HORIZONTAL_ALIGNMENT_CENTER
		var ip := String(s.get("ip", "127.0.0.1"))
		var port := int(s.get("port", Net.PORT))
		b.pressed.connect(func() -> void: _join_address(ip, port))
		sessions.add_child(b)
	focus_first(sessions)


func _back() -> void:
	Net.leave()
	ui.close_screen(self)


func handle_input(event: InputEvent) -> bool:
	if event.is_action_pressed("pause") or (event is InputEventJoypadButton and event.is_action_pressed("ui_cancel")):
		match page:
			"root":
				_back()
			"join", "failed":
				show_page("root")
			"connecting", "waiting", "host":
				Net.leave()
				show_page("root")
		return true
	return false

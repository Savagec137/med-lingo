extends Node
## Réseau de la coopération (autoload « Net ») : serveur d'écoute ENet
## (l'hôte est le joueur 1, le client le joueur 2), deux joueurs au maximum,
## recherche des parties sur le réseau local, départ et reconnexion.
##
## Le serveur fait autorité sur tout ce qui compte (dégâts, santé, munitions,
## objets, portes, progression, créatures, mort, sauvegarde) ; le client envoie
## des demandes et reçoit l'état. En solo, aucun pair n'est créé : le moteur
## réseau hors ligne de Godot considère la machine comme serveur, et le même
## code sert pour un ou deux joueurs.
##
## L'architecture accepte aussi un serveur dédié (serveur sans joueur local).

signal hosting_started
signal joined                      # connexion établie (côté client)
signal connection_failed(reason: String)
signal peer_joined(peer_id: int)   # un joueur rejoint la partie (côté serveur)
signal peer_left(peer_id: int, slot: int)
signal server_lost                 # l'hôte a quitté (côté client)
signal sessions_found(list: Array)
## Client : état complet de la partie envoyé par l'hôte (arrivée, RETRY).
signal snapshot_received(data: Dictionary)

const PORT := 24890
const DISCOVERY_PORT := 24891
const MAX_PLAYERS := 2
const PROTOCOL := "BLACKWOOD-COOP-1"
const CONNECT_TIMEOUT := 8.0

## Tir ami (désactivé par défaut) : les balles d'un joueur ne blessent pas l'autre.
var friendly_fire := false
## Session réseau en cours (hôte ou client).
var active := false
var dedicated := false
## peer_id → numéro de joueur (1 = hôte, 2 = invité).
var slots := {}
var host_name := "Blackwood"

var _peer: ENetMultiplayerPeer
var _connecting := false
var _connect_t := 0.0
var _discovery_listener: PacketPeerUDP
var _search_socket: PacketPeerUDP
var _search_t := -1.0
var _found := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected)
	multiplayer.connection_failed.connect(_on_connect_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)


# --- État -----------------------------------------------------------------

## Vrai sur l'hôte (et en solo) : c'est ici que tout se décide.
func is_server() -> bool:
	return not active or multiplayer.is_server()


func is_client() -> bool:
	return active and not multiplayer.is_server()


func my_id() -> int:
	return multiplayer.get_unique_id() if active else 1


## Numéro de joueur local : 1 (hôte ou solo) ou 2 (invité).
func local_slot() -> int:
	return int(slots.get(my_id(), 1))


func slot_of(peer_id: int) -> int:
	return int(slots.get(peer_id, 1))


func peer_of_slot(slot: int) -> int:
	for p in slots:
		if int(slots[p]) == slot:
			return int(p)
	return -1


func player_count() -> int:
	return maxi(slots.size(), 1)


# --- Hôte -----------------------------------------------------------------

func host(port: int = PORT, with_local_player: bool = true) -> Error:
	leave()
	_peer = ENetMultiplayerPeer.new()
	# Une place de plus que nécessaire : un troisième joueur est accepté le
	# temps de lui dire que la partie est complète, puis déconnecté.
	var err := _peer.create_server(port, MAX_PLAYERS)
	if err != OK:
		_peer = null
		connection_failed.emit("Impossible d'ouvrir le port %d (%s)." % [port, error_string(err)])
		return err
	multiplayer.multiplayer_peer = _peer
	active = true
	dedicated = not with_local_player
	slots.clear()
	if with_local_player:
		slots[1] = 1
	_start_discovery_listener(port)
	hosting_started.emit()
	return OK


# --- Client ---------------------------------------------------------------

func join(address: String, port: int = PORT) -> Error:
	leave()
	_peer = ENetMultiplayerPeer.new()
	var err := _peer.create_client(address, port)
	if err != OK:
		_peer = null
		connection_failed.emit("Adresse invalide ou réseau indisponible (%s)." % error_string(err))
		return err
	multiplayer.multiplayer_peer = _peer
	active = true
	_connecting = true
	_connect_t = 0.0
	return OK


## Quitte la session (hôte ou client) et revient au mode hors ligne.
func leave() -> void:
	_stop_discovery_listener()
	_connecting = false
	if _peer:
		_peer.close()
	_peer = null
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	active = false
	dedicated = false
	slots.clear()


func _on_connected() -> void:
	_connecting = false
	joined.emit()


func _on_connect_failed() -> void:
	_connecting = false
	leave()
	connection_failed.emit("Aucune réponse de l'hôte.")


func _on_server_disconnected() -> void:
	leave()
	server_lost.emit()


# --- Pairs (côté serveur) -------------------------------------------------------

func _on_peer_connected(id: int) -> void:
	if not multiplayer.is_server():
		return
	if slots.size() >= MAX_PLAYERS:
		_reject.rpc_id(id, "La partie est complète (%d joueurs maximum)." % MAX_PLAYERS)
		# Laisse partir le message avant de couper
		get_tree().create_timer(0.6, true).timeout.connect(func() -> void:
			if _peer and id in multiplayer.get_peers():
				_peer.disconnect_peer(id))
		return
	var slot := 2 if not 2 in slots.values() else 1
	slots[id] = slot
	_set_slots.rpc(slots)
	peer_joined.emit(id)


func _on_peer_disconnected(id: int) -> void:
	if not slots.has(id):
		return
	var slot := int(slots[id])
	slots.erase(id)
	if multiplayer.is_server():
		_set_slots.rpc(slots)
	peer_left.emit(id, slot)


@rpc("authority", "call_remote", "reliable")
func _set_slots(s: Dictionary) -> void:
	slots = s


## Envoie au client l'état complet de la partie (il reconstruit le monde).
func send_snapshot(peer: int, data: Dictionary) -> void:
	_snapshot.rpc_id(peer, data)


@rpc("authority", "call_remote", "reliable")
func _snapshot(data: Dictionary) -> void:
	snapshot_received.emit(data)


## Adresses IPv4 de cette machine (affichées dans le salon de l'hôte).
func local_addresses() -> Array:
	var out: Array = []
	for a in IP.get_local_addresses():
		var s := String(a)
		if s.count(".") == 3 and not s.begins_with("127.") and not s.begins_with("169.254."):
			out.append(s)
	return out


@rpc("authority", "call_remote", "reliable")
func _reject(reason: String) -> void:
	leave()
	connection_failed.emit(reason)


func _process(delta: float) -> void:
	if _connecting:
		_connect_t += delta
		if _connect_t > CONNECT_TIMEOUT:
			_connecting = false
			leave()
			connection_failed.emit("Délai de connexion dépassé : l'hôte ne répond pas.")
	_poll_discovery()
	_poll_search(delta)


# --- Recherche de parties sur le réseau local ------------------------------------

func _start_discovery_listener(port: int) -> void:
	_stop_discovery_listener()
	_discovery_listener = PacketPeerUDP.new()
	if _discovery_listener.bind(DISCOVERY_PORT) != OK:
		_discovery_listener = null
		return
	set_meta("game_port", port)


func _stop_discovery_listener() -> void:
	if _discovery_listener:
		_discovery_listener.close()
	_discovery_listener = null


## L'hôte répond aux clients qui cherchent une partie.
func _poll_discovery() -> void:
	if _discovery_listener == null:
		return
	while _discovery_listener.get_available_packet_count() > 0:
		var pkt := _discovery_listener.get_packet().get_string_from_utf8()
		var ip := _discovery_listener.get_packet_ip()
		var port := _discovery_listener.get_packet_port()
		if pkt != PROTOCOL + "?":
			continue
		var info := {"protocol": PROTOCOL, "name": host_name, "players": player_count(), "max": MAX_PLAYERS,
			"port": int(get_meta("game_port", PORT))}
		_discovery_listener.set_dest_address(ip, port)
		_discovery_listener.put_packet(JSON.stringify(info).to_utf8_buffer())


## Cherche les parties ouvertes (diffusion sur le réseau local + machine locale).
func search_sessions(duration: float = 1.5) -> void:
	_found.clear()
	if _search_socket:
		_search_socket.close()
	_search_socket = PacketPeerUDP.new()
	_search_socket.set_broadcast_enabled(true)
	if _search_socket.bind(0) != OK:
		sessions_found.emit([])
		return
	var msg := (PROTOCOL + "?").to_utf8_buffer()
	for addr in ["255.255.255.255", "127.0.0.1"]:
		_search_socket.set_dest_address(addr, DISCOVERY_PORT)
		_search_socket.put_packet(msg)
	_search_t = duration


func _poll_search(delta: float) -> void:
	if _search_socket == null or _search_t < 0.0:
		return
	while _search_socket.get_available_packet_count() > 0:
		var txt := _search_socket.get_packet().get_string_from_utf8()
		var ip := _search_socket.get_packet_ip()
		var data: Variant = JSON.parse_string(txt)
		if data is Dictionary and String(data.get("protocol", "")) == PROTOCOL:
			var d: Dictionary = data
			d["ip"] = ip
			_found["%s:%d" % [ip, int(d.get("port", PORT))]] = d
	_search_t -= delta
	if _search_t < 0.0:
		_search_socket.close()
		_search_socket = null
		sessions_found.emit(_found.values())

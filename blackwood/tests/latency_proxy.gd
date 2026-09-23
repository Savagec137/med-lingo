class_name LatencyProxy
extends Node
## Relais UDP qui simule un réseau lent entre l'invité et l'hôte (tests) :
## chaque paquet est retardé de « delay_ms » ± « jitter_ms », et une part
## « loss » peut être perdue. L'invité se connecte au port du relais, qui
## transmet au port de l'hôte.

var listen_port := 24900
var server_port := 24890
var delay_ms := 80.0
var jitter_ms := 20.0
var loss := 0.0
var forwarded := 0
var dropped := 0

var _client_side := PacketPeerUDP.new()
var _server_side := PacketPeerUDP.new()
var _client_addr := ""
var _client_port := 0
var _queue: Array = []   # [instant d'envoi (ms), vers le serveur ?, paquet]
var _rng := RandomNumberGenerator.new()


func start() -> Error:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.seed = 42
	var err := _client_side.bind(listen_port, "127.0.0.1")
	if err != OK:
		return err
	_server_side.set_dest_address("127.0.0.1", server_port)
	return _server_side.bind(0, "127.0.0.1")


func _delay() -> float:
	return delay_ms + _rng.randf_range(-jitter_ms, jitter_ms)


func _physics_process(_delta: float) -> void:
	_pump()


func _process(_delta: float) -> void:
	_pump()


func _pump() -> void:
	var now := Time.get_ticks_msec()
	while _client_side.get_available_packet_count() > 0:
		var pkt := _client_side.get_packet()
		_client_addr = _client_side.get_packet_ip()
		_client_port = _client_side.get_packet_port()
		if _rng.randf() < loss:
			dropped += 1
			continue
		_queue.append([now + _delay(), true, pkt])
	while _server_side.get_available_packet_count() > 0:
		var pkt2 := _server_side.get_packet()
		if _rng.randf() < loss:
			dropped += 1
			continue
		_queue.append([now + _delay(), false, pkt2])
	var keep: Array = []
	for q in _queue:
		if float(q[0]) <= now:
			if bool(q[1]):
				_server_side.put_packet(q[2])
			elif _client_addr != "":
				_client_side.set_dest_address(_client_addr, _client_port)
				_client_side.put_packet(q[2])
			forwarded += 1
		else:
			keep.append(q)
	_queue = keep


func _exit_tree() -> void:
	_client_side.close()
	_server_side.close()

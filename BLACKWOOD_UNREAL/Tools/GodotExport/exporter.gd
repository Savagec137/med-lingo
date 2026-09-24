extends Node3D
## Extraction du projet Godot Blackwood vers Unreal Engine (outil de migration).
##
## À lancer UNIQUEMENT sur une copie du projet (export_godot.py s'en charge) :
##   godot --headless --path <copie> res://_ue_export/exporter.tscn -- --out=<dossier>
##
## Construit l'hôpital exactement comme le jeu (Facility), puis écrit :
##   data.json       objets, armes, documents, objectifs, ennemis, réglages, contrôles, audio
##   level.json      étages, zones, déclencheurs, apparitions, repères, ascenseurs, objets
##                   placés (portes, objets à ramasser, luminaires…), accessoires, panneaux, cadavres
##   materials.json  matériaux nommés (paramètres) et matériaux particuliers
##   manifest.json   version, compteurs, liste des maillages
##   meshes/*.glb    géométrie : décor par partie (étage, extérieur, escaliers), collisions,
##                   modèles d'accessoires, objets, cadavres, repères de calibration des axes
##
## Coordonnées : celles de Godot (mètres, Y vers le haut). La conversion vers Unreal
## (centimètres, Z vers le haut) est faite à l'import, calibrée par les repères SM_Calib_*.

const FORMAT_VERSION := 1

## Objets placés dont le comportement sera reconstruit par des acteurs Unreal.
const OBJECT_CLASSES := ["Door", "AutoDoor", "LightFixture", "Pickup", "DocumentPickup", "SavePoint",
	"ElevatorPanel", "SwitchPanel", "Phone", "CodePanel", "LockerBox", "Mechanism", "KeypadSafe",
	"ExplosiveTank", "BreakableGlass", "ExaminePoint", "EventPoint"]

## Identifiant stable de chaque objet (propriété de script).
const ID_PROPS := ["door_id", "pickup_id", "doc_id", "panel_id", "safe_id", "switch_id", "glass_id",
	"tank_id", "event_id", "net_key"]

var out_dir := ""
var facility: Facility
var mat_names := {}          # Material -> nom
var materials := {}          # nom -> définition
var gltf_mats := {}          # nom -> StandardMaterial3D (matériau de substitution dans les .glb)
var mesh_by_sig := {}        # signature -> nom de fichier
var mesh_list := {}          # nom -> {verts, tris, materials}
var warnings: Array[String] = []
var excluded := {}           # raison -> nombre


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_dir = a.substr(6)
	if out_dir == "":
		push_error("Argument --out=<dossier> manquant")
		get_tree().quit(2)
		return
	DirAccess.make_dir_recursive_absolute(out_dir.path_join("meshes"))
	var t0 := Time.get_ticks_msec()
	facility = Facility.new()
	add_child(facility)
	facility.build()
	for k in Mats._cache:
		mat_names[Mats._cache[k]] = String(k)
	print("Niveau construit en %d ms" % (Time.get_ticks_msec() - t0))

	var level := {}
	level["format"] = FORMAT_VERSION
	_export_structure(level)
	level["static_geometry"] = _export_static_geometry()
	level["environment"] = _export_environment()
	level["props"] = _export_props()
	level["objects"] = _export_objects()
	level["corpses"] = _export_corpses()
	level["labels"] = _export_labels()
	_export_calibration()
	_write_json("level.json", level)
	_write_json("data.json", _export_data())
	_write_json("materials.json", _export_materials())
	var manifest := {
		"format": FORMAT_VERSION,
		"godot": Engine.get_version_info().get("string", ""),
		"exported_at": Time.get_datetime_string_from_system(true, true) + " UTC",
		"units": "Godot : mètres, Y vers le haut, repère direct",
		"meshes": mesh_list,
		"counts": {
			"meshes": mesh_list.size(), "materials": materials.size(),
			"objects": (level["objects"] as Array).size(), "props": (level["props"] as Array).size(),
			"corpses": (level["corpses"] as Array).size(), "labels": (level["labels"] as Array).size(),
			"static_parts": (level["static_geometry"] as Array).size(),
		},
		"excluded": excluded,
		"warnings": warnings,
	}
	_write_json("manifest.json", manifest)
	print("Export terminé en %d ms : %d maillages, %d matériaux, %d objets, %d avertissements" % [
		Time.get_ticks_msec() - t0, mesh_list.size(), materials.size(), (level["objects"] as Array).size(), warnings.size()])
	for w in warnings.slice(0, 20):
		print("  avertissement : ", w)
	get_tree().quit(0)


# --- Structure du niveau -------------------------------------------------------------

func _export_structure(level: Dictionary) -> void:
	level["floor_y"] = _v(Facility.FLOOR_Y)
	level["built_floors"] = _v(HospitalLevel.BUILT)
	var zones := {}
	for z in Facility.ZONES:
		zones[String(z)] = _v(Facility.ZONES[z])
	level["zones"] = zones
	var triggers := {}
	for tname in facility.triggers:
		var t: Node3D = facility.triggers[tname]
		var e := _node_info(t)
		e["shapes"] = _shapes_of(t, t.global_transform)
		triggers[String(tname)] = e
	level["triggers"] = triggers
	level["spawns"] = _v(facility.spawns)
	level["anchors"] = _v(facility.anchors)
	level["elevators"] = _v(facility.elevators)
	var named := {}
	for n in facility.nodes:
		var node: Variant = facility.nodes[n]
		if node is Node3D and is_instance_valid(node):
			var nd := node as Node3D
			named[String(n)] = {"class": _class_of(nd), "id": _object_id(nd), "pos": _v(nd.global_position)}
	level["named_nodes"] = named
	var grids := {}
	for fl in facility.nav_rects:
		grids[str(fl)] = _v(facility.nav_rects[fl])
	level["nav_rects"] = grids


# --- Géométrie statique : une pièce par partie × ombre, une section par matériau ------------

func _part_of_zone(zone: String) -> String:
	var def: Dictionary = Facility.ZONES.get(zone, {})
	if def.has("floor"):
		var fl := int(def["floor"])
		return ("B%d" % -fl) if fl < 0 else ("F%d" % fl)
	match zone:
		"stair_a", "stair_b", "stair_c":
			return zone.to_upper()
		"exterior":
			return "EXT"
	return zone.to_upper()


func _zone_roots() -> Array[Node3D]:
	var out: Array[Node3D] = []
	for n in facility.find_children("Zone_*", "Node3D", true, false):
		out.append(n as Node3D)
	return out


func _export_static_geometry() -> Array:
	var groups := {}      # "PART|shadow" -> Array[MeshInstance3D]
	var colliders := {}   # PART -> Array[{xf, shape}]
	for zr in _zone_roots():
		var zone := String(zr.name).substr(5)
		var part := _part_of_zone(zone)
		for c in zr.get_children():
			# Décor statique : lots fusionnés « Mesh_<matériau> » et éléments posés à part
			# (affiches, taches, écrans, flaques…) ; les objets scriptés sont exportés ailleurs.
			if c is MeshInstance3D and (c as MeshInstance3D).visible:
				var mi := c as MeshInstance3D
				var shadow := mi.cast_shadow != GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				var key := "%s|%s" % [part, "shadow" if shadow else "noshadow"]
				if not groups.has(key):
					groups[key] = []
				(groups[key] as Array).append(mi)
			elif c is StaticBody3D and String(c.name).begins_with("Collision_"):
				if not colliders.has(part):
					colliders[part] = []
				(colliders[part] as Array).append_array(_shapes_global(c as StaticBody3D))
	var out := []
	var keys := groups.keys()
	keys.sort()
	for key in keys:
		var bits := String(key).split("|")
		var fname := _write_merged("SM_Level_%s_%s" % [bits[0], "Shadow" if bits[1] == "shadow" else "NoShadow"],
			groups[key], Transform3D.IDENTITY, false)
		if fname != "":
			out.append({"part": bits[0], "kind": "visual", "cast_shadow": bits[1] == "shadow", "mesh": fname})
	var pkeys := colliders.keys()
	pkeys.sort()
	for part in pkeys:
		var fname := _write_collision("SM_Collision_%s" % part, colliders[part], Transform3D.IDENTITY)
		if fname != "":
			out.append({"part": part, "kind": "collision", "cast_shadow": false, "mesh": fname,
				"boxes": (colliders[part] as Array).size()})
	return out


# --- Ambiance : environnement, brouillard, lune ------------------------------------------

func _export_environment() -> Dictionary:
	var out := {}
	for c in facility.get_children():
		if c is WorldEnvironment and (c as WorldEnvironment).environment:
			out["environment"] = _resource_props((c as WorldEnvironment).environment)
			var env := (c as WorldEnvironment).environment
			if env.sky and env.sky.sky_material:
				out["sky_material"] = _material_def(env.sky.sky_material)
		elif c is DirectionalLight3D:
			var dl := c as DirectionalLight3D
			out["moon"] = {"color": _v(dl.light_color), "energy": dl.light_energy, "indirect_energy": dl.light_indirect_energy,
				"fog_energy": dl.light_volumetric_fog_energy, "shadow": dl.shadow_enabled,
				"direction": _v(-dl.global_transform.basis.z.normalized()), "xf": _xf(dl.global_transform)}
	return out


## Propriétés simples d'une ressource (ex. Environment) : couleurs, nombres, booléens, énumérations.
func _resource_props(res: Resource) -> Dictionary:
	var out := {}
	for p in res.get_property_list():
		if not (int(p.usage) & PROPERTY_USAGE_STORAGE):
			continue
		var t := int(p.type)
		if t in [TYPE_BOOL, TYPE_INT, TYPE_FLOAT, TYPE_COLOR, TYPE_VECTOR3, TYPE_STRING]:
			out[String(p.name)] = _v(res.get(p.name))
	return out


# --- Accessoires instanciés (MultiMesh) ------------------------------------------------

func _export_props() -> Array:
	var template_of := {}
	for key in Geo.templates:
		var pair: Array = Geo.templates[key]
		for slot in pair.size():
			if pair[slot] != null:
				template_of[pair[slot]] = [String(key), slot]
	var out := []
	var written := {}
	for zr in _zone_roots():
		var zone := String(zr.name).substr(5)
		for c in zr.get_children():
			if not (c is MultiMeshInstance3D):
				continue
			var mmi := c as MultiMeshInstance3D
			var mm := mmi.multimesh
			if mm == null or mm.mesh == null or mm.instance_count == 0:
				continue
			var tkey := "unknown"
			var slot := 0
			if template_of.has(mm.mesh):
				var info: Array = template_of[mm.mesh]
				tkey = info[0]
				slot = info[1]
			var fname: String
			if written.has(mm.mesh):
				fname = written[mm.mesh]
			else:
				fname = _write_mesh_resource("SM_Prop_%s_%s" % [_safe(tkey), "Shadow" if slot == 0 else "NoShadow"], mm.mesh)
				written[mm.mesh] = fname
			var xfs := []
			var identity := 0
			for i in mm.instance_count:
				var ixf := mm.get_instance_transform(i)
				if ixf == Transform3D.IDENTITY:
					identity += 1
				xfs.append(_xf(mmi.global_transform * ixf))
			# Garde-fou : un rendu « headless » renvoie des transformations nulles
			if identity == mm.instance_count and mm.instance_count > 0 and mmi.global_transform == Transform3D.IDENTITY:
				warnings.append("Accessoires %s : transformations d'instances nulles (extraction lancée en --headless ?)" % tkey)
			out.append({"template": tkey, "zone": zone, "part": _part_of_zone(zone), "mesh": fname,
				"cast_shadow": mmi.cast_shadow != GeometryInstance3D.SHADOW_CASTING_SETTING_OFF, "instances": xfs})
	return out


# --- Objets placés (portes, objets à ramasser, luminaires…) -------------------------------

func _export_objects() -> Array:
	var out := []
	var seen := {}
	for n in facility.find_children("*", "Node3D", true, false):
		var cls := _class_of(n)
		if not (cls in OBJECT_CLASSES):
			continue
		var obj := n as Node3D
		seen[cls] = int(seen.get(cls, 0)) + 1
		var e := _node_info(obj)
		e["id"] = _object_id(obj)
		# Parties mobiles : vantaux des portes (pivots) et des portes coulissantes
		var movers: Array[Node3D] = []
		if cls == "Door":
			for p in obj.get("_pivots"):
				movers.append(p as Node3D)
		elif cls == "AutoDoor":
			for p in obj.get("_leaves"):
				movers.append(p as Node3D)
		var skip: Array[Node] = []
		for key in ["_glint"]:
			if key in obj and obj.get(key) is Node:
				skip.append(obj.get(key))
		var parts := []
		var base_meshes := _meshes_under(obj, movers, skip)
		var base := {"name": "base", "local": _xf(Transform3D.IDENTITY)}
		base["mesh"] = _write_merged("SM_%s" % cls, base_meshes, obj.global_transform, true)
		base["shapes"] = _shapes_of(obj, obj.global_transform, movers)
		parts.append(base)
		for i in movers.size():
			var mv := movers[i]
			var mp := {"name": "mover_%d" % i, "local": _xf(obj.global_transform.affine_inverse() * mv.global_transform)}
			mp["mesh"] = _write_merged("SM_%s_Mover" % cls, _meshes_under(mv, [], skip), mv.global_transform, true)
			mp["shapes"] = _shapes_of(mv, mv.global_transform)
			parts.append(mp)
		e["parts"] = parts
		if cls == "LightFixture":
			e["light"] = _light_info(obj)
		out.append(e)
	print("Objets exportés : ", seen)
	return out


func _meshes_under(root: Node, exclude_roots: Array, skip: Array) -> Array:
	var out := []
	for n in root.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi in skip or not mi.visible:
			_count_excluded("maillage masqué ou reflet")
			continue
		var under_excluded := false
		var p: Node = mi.get_parent()
		while p and p != root:
			if p in exclude_roots or p in skip:
				under_excluded = true
				break
			# Objet imbriqué exporté séparément (ex. luminaire dans une pièce d'un objet)
			if p != root and _class_of(p) in OBJECT_CLASSES:
				under_excluded = true
				break
			p = p.get_parent()
		if under_excluded:
			continue
		if _is_billboard(mi):
			_count_excluded("reflet (billboard)")
			continue
		out.append(mi)
	return out


func _is_billboard(mi: MeshInstance3D) -> bool:
	var m: Material = mi.material_override
	if m == null and mi.mesh and mi.mesh.get_surface_count() > 0:
		m = mi.mesh.surface_get_material(0)
	if m is BaseMaterial3D:
		return (m as BaseMaterial3D).billboard_mode != BaseMaterial3D.BILLBOARD_DISABLED
	return false


func _light_info(obj: Node3D) -> Dictionary:
	var li: Light3D = obj.get("light")
	var d := {"mode": int(obj.get("mode")), "base_energy": float(obj.get("base_energy")),
		"emissive_energy": float(obj.get("emissive_energy")), "buzz": bool(obj.get("buzz")),
		"power": bool(obj.get("power")), "rotate_speed": float(obj.get("rotate_speed")),
		"grid_power": obj in facility.grid_lights}
	if li:
		d["type"] = "spot" if li is SpotLight3D else "omni"
		d["color"] = _v(li.light_color)
		d["energy"] = li.light_energy
		d["indirect_energy"] = li.light_indirect_energy
		d["fog_energy"] = li.light_volumetric_fog_energy
		d["shadow"] = li.shadow_enabled
		d["local"] = _xf(obj.global_transform.affine_inverse() * li.global_transform)
		if li is OmniLight3D:
			d["range"] = (li as OmniLight3D).omni_range
			d["attenuation"] = (li as OmniLight3D).omni_attenuation
		elif li is SpotLight3D:
			var s := li as SpotLight3D
			d["range"] = s.spot_range
			d["attenuation"] = s.spot_attenuation
			d["spot_angle"] = s.spot_angle
			d["spot_angle_attenuation"] = s.spot_angle_attenuation
			d["direction"] = _v(-li.global_transform.basis.z.normalized())
	return d


# --- Cadavres : maillage riggé figé dans sa pose (skinning calculé ici) -----------------

func _export_corpses() -> Array:
	var out := []
	var i := 0
	for n in facility.find_children("*", "Node3D", true, false):
		if _class_of(n) != "Corpse":
			continue
		var corpse := n as Node3D
		var e := _node_info(corpse)
		var skin: Node = corpse.find_child("Skin", true, false)
		if skin and skin.get("skeleton") and skin.get("mesh"):
			var sk: Skeleton3D = skin.get("skeleton")
			var mi: MeshInstance3D = skin.get("mesh")
			var baked := _bake_skinned(mi, sk, corpse.global_transform)
			if baked:
				var key := "zombie_skin_corpse_%02d" % i
				var smat: Material = skin.get("material")
				materials[key] = {"type": "zombie_skin", "source": "corpse", "def": _material_def(smat)}
				baked.surface_set_material(0, _gltf_material(key))
				var fname := "SM_Corpse_%02d" % i
				_save_glb(baked, fname)
				e["mesh"] = fname
				e["material"] = key
		else:
			warnings.append("Cadavre sans modèle riggé : %s" % corpse.name)
		out.append(e)
		i += 1
	return out


## Applique le skinning (pose courante du squelette) et renvoie un maillage statique
## exprimé dans le repère « ref ».
func _bake_skinned(mi: MeshInstance3D, sk: Skeleton3D, ref: Transform3D) -> ArrayMesh:
	var mesh := mi.mesh
	var skin_res: Skin = mi.skin
	if mesh == null or skin_res == null:
		return null
	var arrays := mesh.surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var bones: PackedInt32Array = arrays[Mesh.ARRAY_BONES]
	var weights: PackedFloat32Array = arrays[Mesh.ARRAY_WEIGHTS]
	if verts.is_empty() or bones.is_empty():
		return null
	var per := bones.size() / verts.size()
	# Matrice par liaison : pose globale de l'os × pose de liaison, puis vers « ref »
	var to_ref := ref.affine_inverse() * sk.global_transform
	var mats: Array[Transform3D] = []
	for b in skin_res.get_bind_count():
		var bone := skin_res.get_bind_bone(b)
		var bname := skin_res.get_bind_name(b)
		if bname != &"":
			bone = sk.find_bone(bname)
		var gp := sk.get_bone_global_pose(bone) if bone >= 0 else Transform3D.IDENTITY
		mats.append(to_ref * gp * skin_res.get_bind_pose(b))
	var out_v := PackedVector3Array()
	var out_n := PackedVector3Array()
	out_v.resize(verts.size())
	out_n.resize(verts.size())
	for vi in verts.size():
		var pv := Vector3.ZERO
		var pn := Vector3.ZERO
		for k in per:
			var w := weights[vi * per + k]
			if w <= 0.0:
				continue
			var m := mats[bones[vi * per + k]]
			pv += (m * verts[vi]) * w
			pn += (m.basis * norms[vi]) * w
		out_v[vi] = pv
		out_n[vi] = pn.normalized()
	var new_arrays := []
	new_arrays.resize(Mesh.ARRAY_MAX)
	new_arrays[Mesh.ARRAY_VERTEX] = out_v
	new_arrays[Mesh.ARRAY_NORMAL] = out_n
	new_arrays[Mesh.ARRAY_TEX_UV] = arrays[Mesh.ARRAY_TEX_UV]
	new_arrays[Mesh.ARRAY_INDEX] = arrays[Mesh.ARRAY_INDEX]
	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, new_arrays)
	return am


# --- Panneaux (Label3D) ---------------------------------------------------------------

func _export_labels() -> Array:
	var out := []
	for n in facility.find_children("*", "Label3D", true, false):
		var l := n as Label3D
		if not l.visible:
			continue
		out.append({
			"text": l.text, "xf": _xf(l.global_transform), "font_size": l.font_size, "pixel_size": l.pixel_size,
			"height_m": l.font_size * l.pixel_size, "color": _v(l.modulate), "outline_size": l.outline_size,
			"outline_color": _v(l.outline_modulate), "h_align": int(l.horizontal_alignment),
			"v_align": int(l.vertical_alignment), "billboard": int(l.billboard), "double_sided": l.double_sided,
			"font": l.font.resource_path if l.font else "", "zone": _zone_of(l),
		})
	return out


# --- Repères de calibration des axes -----------------------------------------------------

## Trois cubes décalés de 2 m sur +X, +Y et +Z : après import, leur position dans Unreal
## donne la conversion exacte des axes (et de l'échelle) appliquée par l'importeur glTF.
func _export_calibration() -> void:
	for axis in ["X", "Y", "Z"]:
		var bm := BoxMesh.new()
		bm.size = Vector3(0.5, 0.5, 0.5)
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var off := {"X": Vector3(2, 0, 0), "Y": Vector3(0, 2, 0), "Z": Vector3(0, 0, 2)}[axis] as Vector3
		st.append_from(bm, 0, Transform3D(Basis.IDENTITY, off))
		var am := st.commit()
		am.surface_set_material(0, _gltf_material("calibration"))
		_save_glb(am, "SM_Calib_" + axis)
	materials["calibration"] = {"type": "special", "def": {"albedo": [1, 0, 1, 1]}}


# --- Données de jeu ------------------------------------------------------------------------

func _export_data() -> Dictionary:
	var d := {}
	d["items"] = _v(ItemDB.ITEMS)
	d["weapons"] = _v(WeaponDB.WEAPONS)
	d["weapon_order"] = _v(WeaponDB.ORDER)
	d["documents"] = _v(DocumentDB.DOCS)
	d["objectives"] = _objective_texts()
	d["enemies"] = _enemy_profiles()
	var settings_script: GDScript = load("res://scripts/core/settings.gd")
	var s: Node = settings_script.new()
	var defaults := {}
	for p in s.get_property_list():
		if int(p.usage) & PROPERTY_USAGE_SCRIPT_VARIABLE and not String(p.name).begins_with("_"):
			var val: Variant = _v(s.get(p.name))
			if val != null:
				defaults[String(p.name)] = val
	d["settings_defaults"] = defaults
	var diff := []
	for level in 3:
		s.set("difficulty", level)
		diff.append({"damage_taken": s.call("damage_taken_mult"), "ammo": s.call("ammo_mult"),
			"enemy_hp": s.call("enemy_hp_mult")})
	d["difficulty"] = diff
	s.free()
	d["countdown"] = _v(EventDirector.COUNTDOWN)
	d["generator_switch_order"] = _v(EventDirector.SWITCH_ORDER)
	d["input"] = _input_bindings()
	var audio_consts := (load("res://scripts/core/audio_manager.gd") as GDScript).get_script_constant_map()
	d["audio"] = {"buses": _v(audio_consts.get("BUSES")), "max_3d": _v(audio_consts.get("MAX_3D")),
		"reverb_presets": _v(audio_consts.get("REVERB")), "loops": _v(audio_consts.get("LOOPS")),
		"loop_rule": "nom commençant par amb_ ou music_, ou présent dans loops"}
	var player_consts := (load("res://player/player.gd") as GDScript).get_script_constant_map()
	var pc := {}
	for k in ["WALK_SPEED", "RUN_SPEED", "AIM_SPEED", "ACCEL", "DECEL", "GRAVITY", "TURN_SPEED", "DODGE_SPEED",
			"DODGE_TIME", "DODGE_COOLDOWN", "STRIDE_WALK", "STRIDE_RUN"]:
		pc[k] = _v(player_consts.get(k))
	d["player"] = pc
	var cam_consts := (load("res://player/player_camera.gd") as GDScript).get_script_constant_map()
	var cc := {}
	for k in cam_consts:
		var cv: Variant = _v(cam_consts[k])
		if cv != null:
			cc[String(k)] = cv
	d["camera"] = cc
	var fl_consts := (load("res://player/flashlight.gd") as GDScript).get_script_constant_map()
	var fc := {}
	for k in fl_consts:
		var fv: Variant = _v(fl_consts[k])
		if fv != null:
			fc[String(k)] = fv
	d["flashlight"] = fc
	d["game_state"] = {"max_hp": _v(GameState.MAX_HP), "inventory_slots": _v(GameState.INVENTORY_SLOTS)}
	return d


func _objective_texts() -> Array:
	var src := FileAccess.get_file_as_string("res://data/objectives.gd")
	var re := RegEx.new()
	re.compile("return \"([^\"]*)\"")
	var out := []
	for m in re.search_all(src):
		out.append(m.get_string(1))
	return out


func _enemy_profiles() -> Dictionary:
	var stats := ["max_hp", "walk_speed", "chase_speed", "turn_speed", "attack_range", "attack_damage",
		"attack_windup", "attack_recovery", "hearing_scale", "vision_range", "vision_range_lit", "proximity",
		"lose_time", "search_time", "give_up_distance", "patrol_wait", "stagger_chance", "body_radius",
		"body_height", "wake_radius"]
	var out := {}
	var classes := {"hollow": "res://enemies/hollow.gd", "veilleur": "res://enemies/veilleur.gd",
		"neonatal": "res://enemies/neonatal.gd", "colossus": "res://enemies/colossus.gd",
		"surgeon": "res://enemies/surgeon.gd", "sarah": "res://enemies/sarah_boss.gd", "zero": "res://enemies/patient_zero.gd"}
	for type in classes:
		var variants: Array = ["patient", "nurse", "guard", "neuro", "experimental"] if type == "hollow" else [""]
		for variant in variants:
			var script: GDScript = load(classes[type])
			var e: Node = script.new()
			if variant != "":
				e.set("variant", variant)
				e.call("_apply_variant")
			var st := {}
			for k in stats:
				if k in e:
					st[k] = _v(e.get(k))
			st["class"] = String(script.get_global_name())
			out[type if variant == "" else "%s_%s" % [type, variant]] = st
			e.free()
	return out


func _input_bindings() -> Dictionary:
	var c := (load("res://scripts/core/input_setup.gd") as GDScript).get_script_constant_map()
	var keys := {}
	var kb: Dictionary = c.get("BINDINGS", {})
	for action in kb:
		var names := []
		for k in kb[action]:
			names.append(OS.get_keycode_string(int(k)))
		keys[String(action)] = names
	var mouse := {}
	var mb: Dictionary = c.get("MOUSE_BINDINGS", {})
	for action in mb:
		mouse[String(action)] = _v(mb[action])
	return {"keys_physical": keys, "mouse_buttons": mouse, "joy_buttons": _v(c.get("JOY_BUTTONS", {})),
		"joy_axes": _v(c.get("JOY_AXES", {})), "menu_navigation": _v(c.get("NAV_BINDINGS", {})),
		"note": "Codes Godot : MOUSE_BUTTON_* (1 gauche, 2 droit, 4/5 molette), JOY_BUTTON_* (0 A, 1 B, 2 X, 3 Y, 4 Vue, 6 Menu, 7 L3, 8 R3, 9 LB, 10 RB, 11-14 croix haut/bas/gauche/droite), JOY_AXIS_* (0/1 stick gauche, 2/3 stick droit, 4 LT, 5 RT)"}


# --- Matériaux ----------------------------------------------------------------------------

func _export_materials() -> Dictionary:
	var out := {"textured": _v(Mats.TEXTURED), "surfaces": _v(Mats.SURFACES), "texture_size_m": _v(Mats.TEX_SIZE),
		"used": {}}
	var keys := materials.keys()
	keys.sort()
	for k in keys:
		out["used"][k] = materials[k]
	return out


func _mat_key(mat: Material) -> String:
	if mat == null:
		return "default"
	if mat_names.has(mat):
		var name: String = mat_names[mat]
		if not materials.has(name):
			var src := "textured" if Mats.TEXTURED.has(name) and mat is ShaderMaterial and (mat as ShaderMaterial).shader == Mats.PBR_SHADER \
				else ("surface" if Mats.SURFACES.has(name) else "special")
			materials[name] = {"type": "mats", "source": src, "def": _material_def(mat)}
		return name
	var def := _material_def(mat)
	var key := "adhoc_" + JSON.stringify(def).md5_text().substr(0, 10)
	mat_names[mat] = key
	if not materials.has(key):
		materials[key] = {"type": "adhoc", "def": def}
	return key


func _material_def(mat: Material) -> Dictionary:
	if mat is BaseMaterial3D:
		var m := mat as BaseMaterial3D
		return {"kind": "standard", "albedo": _v(m.albedo_color), "metallic": m.metallic, "roughness": m.roughness,
			"emission_enabled": m.emission_enabled, "emission": _v(m.emission), "emission_energy": m.emission_energy_multiplier,
			"transparency": int(m.transparency), "unshaded": m.shading_mode == BaseMaterial3D.SHADING_MODE_UNSHADED,
			"cull": int(m.cull_mode), "albedo_texture": m.albedo_texture.resource_path if m.albedo_texture else ""}
	if mat is ShaderMaterial:
		var sm := mat as ShaderMaterial
		var params := {}
		if sm.shader:
			for u in sm.shader.get_shader_uniform_list():
				var uname := String(u.name)
				var val: Variant = sm.get_shader_parameter(uname)
				if val is Texture2D:
					params[uname] = "texture:" + (val as Texture2D).resource_path
				else:
					var vv: Variant = _v(val)
					if vv != null:
						params[uname] = vv
		return {"kind": "shader", "shader": sm.shader.resource_path.get_file() if sm.shader else "", "params": params}
	return {"kind": mat.get_class()}


## Matériau de substitution écrit dans les .glb : il porte le NOM du matériau (l'import
## Unreal le remplace par l'instance MI_<nom>) et une couleur approchée.
func _gltf_material(key: String) -> StandardMaterial3D:
	if gltf_mats.has(key):
		return gltf_mats[key]
	var m := StandardMaterial3D.new()
	m.resource_name = key
	var def: Dictionary = (materials.get(key, {}) as Dictionary).get("def", {})
	var col := Color(0.6, 0.6, 0.6)
	if Mats.SURFACES.has(key):
		col = Mats.SURFACES[key].get("base", col)
	elif Mats.TEXTURED.has(key):
		col = Mats.TEXTURED[key].get("tint", Color(0.75, 0.75, 0.75))
	elif def.get("kind", "") == "standard":
		var a: Array = def.get("albedo", [0.6, 0.6, 0.6, 1.0])
		col = Color(a[0], a[1], a[2], a[3])
		m.metallic = float(def.get("metallic", 0.0))
		m.roughness = float(def.get("roughness", 1.0))
		if def.get("emission_enabled", false):
			var em: Array = def.get("emission", [0, 0, 0, 1])
			m.emission_enabled = true
			m.emission = Color(em[0], em[1], em[2])
			m.emission_energy_multiplier = float(def.get("emission_energy", 1.0))
		if int(def.get("transparency", 0)) != 0:
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = col
	gltf_mats[key] = m
	return m


func _surface_mat(mi: MeshInstance3D, mesh: Mesh, s: int) -> Material:
	if mi.material_override:
		return mi.material_override
	var o := mi.get_surface_override_material(s)
	if o:
		return o
	return mesh.surface_get_material(s)


# --- Écriture des maillages ------------------------------------------------------------------

## Fusionne des maillages (exprimés dans le repère « ref ») en un seul, une section par
## matériau, et l'écrit en .glb. Avec « dedupe », un maillage identique n'est écrit qu'une fois.
func _write_merged(base_name: String, items: Array, ref: Transform3D, dedupe: bool) -> String:
	var acc := {}
	var inv := ref.affine_inverse()
	for it in items:
		var mi := it as MeshInstance3D
		var mesh := mi.mesh
		if mesh == null:
			continue
		var xf := inv * mi.global_transform
		for s in mesh.get_surface_count():
			if mesh is ArrayMesh and (mesh as ArrayMesh).surface_get_primitive_type(s) != Mesh.PRIMITIVE_TRIANGLES:
				_count_excluded("surface non triangulaire")
				continue
			var key := _mat_key(_surface_mat(mi, mesh, s))
			if not acc.has(key):
				var st := SurfaceTool.new()
				st.begin(Mesh.PRIMITIVE_TRIANGLES)
				acc[key] = st
			(acc[key] as SurfaceTool).append_from(mesh, s, xf)
	if acc.is_empty():
		return ""
	var am := ArrayMesh.new()
	var keys := acc.keys()
	keys.sort()
	var hc := HashingContext.new()
	hc.start(HashingContext.HASH_MD5)
	for key in keys:
		var st := acc[key] as SurfaceTool
		am = st.commit(am)
		var si := am.get_surface_count() - 1
		am.surface_set_material(si, _gltf_material(String(key)))
		hc.update(String(key).to_utf8_buffer())
		var arr := am.surface_get_arrays(si)
		var pv: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		hc.update(_rounded_bytes(pv))
	var sig := hc.finish().hex_encode()
	if dedupe and mesh_by_sig.has(sig):
		return mesh_by_sig[sig]
	var fname := ("%s_%s" % [base_name, sig.substr(0, 8)]) if dedupe else base_name
	_save_glb(am, fname)
	mesh_by_sig[sig] = fname
	return fname


func _write_mesh_resource(base_name: String, mesh: Mesh) -> String:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	add_child(mi)
	var fname := _write_merged(base_name, [mi], Transform3D.IDENTITY, true)
	remove_child(mi)
	mi.free()
	return fname


## Positions arrondies au millimètre : deux maillages identiques à l'arrondi près
## donnent la même signature.
func _rounded_bytes(pv: PackedVector3Array) -> PackedByteArray:
	var ints := PackedInt32Array()
	ints.resize(pv.size() * 3)
	for i in pv.size():
		var p := pv[i]
		ints[i * 3] = roundi(p.x * 1000.0)
		ints[i * 3 + 1] = roundi(p.y * 1000.0)
		ints[i * 3 + 2] = roundi(p.z * 1000.0)
	return ints.to_byte_array()


func _save_glb(am: ArrayMesh, fname: String) -> void:
	am.resource_name = fname
	var root := Node3D.new()
	root.name = "Root"
	var mi := MeshInstance3D.new()
	mi.name = fname
	mi.mesh = am
	root.add_child(mi)
	add_child(root)
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_scene(root, state)
	if err == OK:
		err = doc.write_to_filesystem(state, out_dir.path_join("meshes").path_join(fname + ".glb"))
	if err != OK:
		warnings.append("Écriture glTF impossible (%s) : %s" % [error_string(err), fname])
	var verts := 0
	var tris := 0
	var mats := []
	for s in am.get_surface_count():
		var n := am.surface_get_array_len(s)
		var ni := am.surface_get_array_index_len(s)
		verts += n
		tris += (ni if ni > 0 else n) / 3
		var m := am.surface_get_material(s)
		mats.append(m.resource_name if m else "")
	mesh_list[fname] = {"verts": verts, "tris": tris, "materials": mats}
	remove_child(root)
	root.free()


## Maillage de collision (boîtes, cylindres, formes concaves) dans le repère « ref ».
func _write_collision(fname: String, shapes: Array, ref: Transform3D) -> String:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var inv := ref.affine_inverse()
	var n := 0
	for sd in shapes:
		var shape: Shape3D = sd["shape"]
		var xf: Transform3D = inv * (sd["xf"] as Transform3D)
		var prim: PrimitiveMesh = null
		if shape is BoxShape3D:
			var bm := BoxMesh.new()
			bm.size = (shape as BoxShape3D).size
			prim = bm
		elif shape is CylinderShape3D:
			var cm := CylinderMesh.new()
			cm.top_radius = (shape as CylinderShape3D).radius
			cm.bottom_radius = cm.top_radius
			cm.height = (shape as CylinderShape3D).height
			cm.radial_segments = 12
			cm.rings = 0
			prim = cm
		elif shape is SphereShape3D:
			var sm := SphereMesh.new()
			sm.radius = (shape as SphereShape3D).radius
			sm.height = sm.radius * 2.0
			sm.radial_segments = 12
			sm.rings = 6
			prim = sm
		elif shape is CapsuleShape3D:
			var cp := CapsuleMesh.new()
			cp.radius = (shape as CapsuleShape3D).radius
			cp.height = (shape as CapsuleShape3D).height
			cp.radial_segments = 12
			cp.rings = 2
			prim = cp
		elif shape is ConcavePolygonShape3D:
			var faces := (shape as ConcavePolygonShape3D).get_faces()
			for fv in faces:
				st.add_vertex(xf * fv)
			n += 1
			continue
		else:
			warnings.append("Forme de collision non convertie : %s" % shape.get_class())
			continue
		st.append_from(prim, 0, xf)
		n += 1
	if n == 0:
		return ""
	st.generate_normals()
	var am := st.commit()
	am.surface_set_material(0, _gltf_material("collision"))
	materials["collision"] = {"type": "special", "def": {"albedo": [0, 1, 0, 1]}}
	_save_glb(am, fname)
	return fname


# --- Collisions ---------------------------------------------------------------------------

func _shapes_global(body: CollisionObject3D) -> Array:
	var out := []
	for owner_id in body.get_shape_owners():
		if body.is_shape_owner_disabled(owner_id):
			continue
		var oxf := body.global_transform * body.shape_owner_get_transform(owner_id)
		for i in body.shape_owner_get_shape_count(owner_id):
			out.append({"xf": oxf, "shape": body.shape_owner_get_shape(owner_id, i)})
	return out


## Formes de collision (et volumes Area3D) sous « root », exprimées dans le repère « ref ».
func _shapes_of(root: Node, ref: Transform3D, exclude_roots: Array = []) -> Array:
	var out := []
	var bodies: Array = [root] if root is CollisionObject3D else []
	for n in root.find_children("*", "CollisionObject3D", true, false):
		var p: Node = n
		var skip := false
		while p and p != root:
			if p in exclude_roots:
				skip = true
				break
			p = p.get_parent()
		if not skip:
			bodies.append(n)
	var inv := ref.affine_inverse()
	for b in bodies:
		var body := b as CollisionObject3D
		for sd in _shapes_global(body):
			var shape: Shape3D = sd["shape"]
			var e := {"body": body.get_class(), "layer": body.collision_layer, "mask": body.collision_mask,
				"xf": _xf(inv * (sd["xf"] as Transform3D)), "type": shape.get_class()}
			if shape is BoxShape3D:
				e["size"] = _v((shape as BoxShape3D).size)
			elif shape is CylinderShape3D:
				e["radius"] = (shape as CylinderShape3D).radius
				e["height"] = (shape as CylinderShape3D).height
			elif shape is SphereShape3D:
				e["radius"] = (shape as SphereShape3D).radius
			elif shape is CapsuleShape3D:
				e["radius"] = (shape as CapsuleShape3D).radius
				e["height"] = (shape as CapsuleShape3D).height
			out.append(e)
	return out


# --- Outils ------------------------------------------------------------------------------

func _class_of(n: Node) -> String:
	var s: Script = n.get_script()
	if s and s.get_global_name() != "":
		return String(s.get_global_name())
	return n.get_class()


func _object_id(n: Node) -> String:
	for p in ID_PROPS:
		if p in n:
			var v: Variant = n.get(p)
			if v is String and v != "":
				return v
	if "item_id" in n and "pickup_id" in n:
		return String(n.get("pickup_id"))
	return String(n.name)


func _zone_of(n: Node) -> String:
	var p: Node = n.get_parent()
	while p:
		if String(p.name).begins_with("Zone_"):
			return String(p.name).substr(5)
		p = p.get_parent()
	return ""


func _node_info(n: Node3D) -> Dictionary:
	var e := {"class": _class_of(n), "name": String(n.name), "xf": _xf(n.global_transform), "zone": _zone_of(n)}
	var props := {}
	for p in n.get_property_list():
		if not (int(p.usage) & PROPERTY_USAGE_SCRIPT_VARIABLE):
			continue
		var pn: String = p.name
		if pn.begins_with("_"):
			continue
		var vv: Variant = _v(n.get(pn))
		if vv != null:
			props[pn] = vv
	e["props"] = props
	return e


func _xf(t: Transform3D) -> Dictionary:
	return {"origin": _v(t.origin), "basis": [_v(t.basis.x), _v(t.basis.y), _v(t.basis.z)]}


func _safe(s: String) -> String:
	var out := ""
	for ch in s:
		out += ch if (ch.is_valid_identifier() or ch.is_valid_int()) else "_"
	return out


func _count_excluded(reason: String) -> void:
	excluded[reason] = int(excluded.get(reason, 0)) + 1


func _write_json(fname: String, data: Variant) -> void:
	var f := FileAccess.open(out_dir.path_join(fname), FileAccess.WRITE)
	f.store_string(JSON.stringify(data, "\t", true))
	f.close()


## Valeur sérialisable en JSON (types simples, vecteurs, couleurs, tableaux, dictionnaires).
func _v(val: Variant) -> Variant:
	match typeof(val):
		TYPE_NIL, TYPE_BOOL, TYPE_INT, TYPE_STRING:
			return val
		TYPE_FLOAT:
			return snappedf(val, 0.00001)
		TYPE_STRING_NAME:
			return String(val)
		TYPE_VECTOR2, TYPE_VECTOR2I:
			return [val.x, val.y]
		TYPE_VECTOR3, TYPE_VECTOR3I:
			return [snappedf(val.x, 0.00001), snappedf(val.y, 0.00001), snappedf(val.z, 0.00001)]
		TYPE_RECT2:
			return {"x": val.position.x, "y": val.position.y, "w": val.size.x, "h": val.size.y}
		TYPE_COLOR:
			return [snappedf(val.r, 0.0001), snappedf(val.g, 0.0001), snappedf(val.b, 0.0001), snappedf(val.a, 0.0001)]
		TYPE_BASIS:
			return [_v(val.x), _v(val.y), _v(val.z)]
		TYPE_TRANSFORM3D:
			return _xf(val)
		TYPE_ARRAY, TYPE_PACKED_STRING_ARRAY, TYPE_PACKED_VECTOR3_ARRAY, TYPE_PACKED_FLOAT32_ARRAY, \
				TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_VECTOR2_ARRAY, TYPE_PACKED_COLOR_ARRAY:
			var a := []
			for x in val:
				a.append(_v(x))
			return a
		TYPE_DICTIONARY:
			var o := {}
			for k in val:
				o[str(k)] = _v(val[k])
			return o
		TYPE_OBJECT:
			if val is Node:
				return "<node:%s>" % String((val as Node).name)
			if val is Resource and (val as Resource).resource_path != "":
				return "<res:%s>" % (val as Resource).resource_path
			return null
	return null

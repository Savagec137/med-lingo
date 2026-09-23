class_name Symbols
extends RefCounted
## Symboles peints des armoires d'archives (énigme du coffre) :
##   « moon »  : croissant de lune — le patient s'endort
##   « heart » : cœur barré d'un tracé plat — son cœur se tait
##   « eye »   : œil ouvert — il se réveille
## Textures générées à la volée (peinture blanche aux bords irréguliers).

const SIZE := 128

static var _cache := {}


static func texture(kind: String) -> ImageTexture:
	if _cache.has(kind):
		return _cache[kind]
	var img := Image.create(SIZE, SIZE, false, Image.FORMAT_RGBA8)
	var noise := FastNoiseLite.new()
	noise.frequency = 0.08
	noise.seed = hash(kind)
	for y in SIZE:
		for x in SIZE:
			var p := Vector2((x + 0.5) / SIZE * 2.0 - 1.0, 1.0 - (y + 0.5) / SIZE * 2.0)
			var d := _sdf(kind, p)
			# Bords de peinture irréguliers
			d += noise.get_noise_2d(x, y) * 0.035
			var a := clampf(0.5 - d * 40.0, 0.0, 1.0)
			if a > 0.0:
				var wear := 0.75 + 0.25 * noise.get_noise_2d(x * 3.1, y * 2.7)
				img.set_pixel(x, y, Color(0.9, 0.88, 0.82, a * wear))
			else:
				img.set_pixel(x, y, Color(0.9, 0.88, 0.82, 0.0))
	img.generate_mipmaps()
	var tex := ImageTexture.create_from_image(img)
	_cache[kind] = tex
	return tex


## Distance signée approximative (négative à l'intérieur de la peinture).
static func _sdf(kind: String, p: Vector2) -> float:
	match kind:
		"moon":
			var outer := p.length() - 0.72
			var inner := (p - Vector2(0.32, 0.18)).length() - 0.6
			return maxf(outer, -inner)
		"heart":
			# Contour de cœur (trait épais) traversé d'un tracé plat
			var q := Vector2(p.x, p.y + 0.15) * 1.35
			var h := pow(q.x * q.x + q.y * q.y - 1.0, 3.0) - q.x * q.x * q.y * q.y * q.y
			var outline := absf(h) - 0.12
			var line := maxf(absf(p.y + 0.05) - 0.05, absf(p.x) - 0.95)
			return minf(outline * 0.35, line)
		"eye":
			# Amande (intersection de deux disques), iris en anneau, pupille
			var up := (p - Vector2(0, -0.62)).length() - 0.95
			var down := (p - Vector2(0, 0.62)).length() - 0.95
			var almond := maxf(up, down)
			var almond_ring := absf(almond) - 0.06
			var iris := absf(p.length() - 0.25) - 0.05
			var pupil := p.length() - 0.1
			return minf(minf(almond_ring, iris), pupil)
	return 1.0


## Crée un quad peint (face vers +Z local) prêt à poser sur une surface.
static func decal_quad(kind: String, size: float = 0.34) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	mi.mesh = q
	var m := StandardMaterial3D.new()
	m.albedo_texture = texture(kind)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.roughness = 0.7
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

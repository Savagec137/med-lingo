shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Surface photoréaliste : textures PBR (albédo, normale OpenGL, ORM) projetées en
// coordonnées monde sur les trois axes. Aucun UV requis : les carreaux et les
// joints restent alignés d'un bloc à l'autre, à l'échelle réelle de la texture.
// Par-dessus : teinte, soubassement bicolore, salissures au pied des murs,
// taches à grande échelle et sol humide.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D noise_a : hint_default_white, filter_linear_mipmap, repeat_enable;

// Taille réelle d'une répétition de la texture (mètres).
uniform vec2 tex_size = vec2(2.0, 2.0);
uniform vec3 tint : source_color = vec3(1.0);
uniform float saturation = 1.0;
uniform float brightness = 1.0;
// Soubassement : sous band_height (m au-dessus du sol de l'étage), teinte band_tint.
uniform float band_height = 0.0;
uniform vec3 band_tint : source_color = vec3(1.0);
uniform vec3 rail_color : source_color = vec3(0.2, 0.2, 0.2);
uniform float normal_strength = 1.0;
uniform float roughness_mul = 1.0;
uniform float roughness_add = 0.0;
uniform float metallic_mul = 1.0;
uniform float ao_strength = 1.0;
uniform float grime = 0.35;
uniform vec3 grime_color : source_color = vec3(0.10, 0.085, 0.07);
uniform float wetness = 0.0;
uniform float variation = 0.12;
// Hauteur d'un étage : les salissures « pied de mur » se répètent à chaque niveau.
uniform float storey_height = 4.0;
uniform float floor_offset = 0.0;
uniform float blend_sharpness = 10.0;

varying vec3 w_pos;
varying vec3 w_nrm;

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

vec3 unpack_normal(vec4 t) {
	vec3 n = t.xyz * 2.0 - 1.0;
	n.xy *= normal_strength;
	n.z = sqrt(max(1.0 - dot(n.xy, n.xy), 0.0));
	return n;
}

void fragment() {
	vec3 an = abs(w_nrm);
	vec3 w = pow(an, vec3(blend_sharpness));
	w /= (w.x + w.y + w.z + 1e-5);
	vec3 s = sign(w_nrm + vec3(1e-4));
	vec2 inv = 1.0 / tex_size;

	vec3 alb = vec3(0.0);
	vec3 orm = vec3(0.0);
	vec3 pert = vec3(0.0);
	// Chaque projection a sa base tangente (tangente = droite de l'image, bitangente = haut).
	if (w.x > 0.01) {
		vec2 uv = vec2(-s.x * w_pos.z, -w_pos.y) * inv;
		alb += texture(albedo_tex, uv).rgb * w.x;
		orm += texture(orm_tex, uv).rgb * w.x;
		vec3 n = unpack_normal(texture(normal_tex, uv));
		pert += (vec3(0.0, 0.0, -s.x) * n.x + vec3(0.0, 1.0, 0.0) * n.y) * w.x;
	}
	if (w.y > 0.01) {
		vec2 uv = vec2(w_pos.x, s.y * w_pos.z) * inv;
		alb += texture(albedo_tex, uv).rgb * w.y;
		orm += texture(orm_tex, uv).rgb * w.y;
		vec3 n = unpack_normal(texture(normal_tex, uv));
		pert += (vec3(1.0, 0.0, 0.0) * n.x + vec3(0.0, 0.0, -s.y) * n.y) * w.y;
	}
	if (w.z > 0.01) {
		vec2 uv = vec2(s.z * w_pos.x, -w_pos.y) * inv;
		alb += texture(albedo_tex, uv).rgb * w.z;
		orm += texture(orm_tex, uv).rgb * w.z;
		vec3 n = unpack_normal(texture(normal_tex, uv));
		pert += (vec3(s.z, 0.0, 0.0) * n.x + vec3(0.0, 1.0, 0.0) * n.y) * w.z;
	}

	// Taches et variations à grande échelle (bruit projeté sur l'axe dominant) :
	// nl ~ 2 m (nappes douces), na ~ 0.7 m, nb ~ 10 cm (irrégularité des bords)
	vec2 nuv = an.y > max(an.x, an.z) ? w_pos.xz : (an.x > an.z ? w_pos.zy : w_pos.xy);
	float nl = texture(noise_a, nuv * 0.085 + vec2(0.21, 0.47)).r;
	float na = texture(noise_a, nuv * 0.23).r;
	float nb = texture(noise_a, nuv * 1.7 + vec2(0.37, 0.61)).r;

	float lum = dot(alb, vec3(0.299, 0.587, 0.114));
	alb = mix(vec3(lum), alb, saturation) * tint * brightness;
	alb *= 1.0 + (nl * 0.65 + na * 0.35 - 0.5) * variation * 2.0;

	float h = mod(w_pos.y - floor_offset, storey_height);
	bool is_wall = an.y < 0.5;
	if (band_height > 0.0 && is_wall) {
		float below = 1.0 - smoothstep(band_height - 0.004, band_height + 0.004, h);
		alb = mix(alb, alb * band_tint / max(tint, vec3(0.05)), below);
		float rail = 1.0 - smoothstep(0.0, 0.018, abs(h - band_height));
		alb = mix(alb, rail_color, rail * 0.85);
	}

	// Salissures : nappes larges et diffuses (pas de taches franches) +
	// accumulation au pied des murs + coulures
	float g = smoothstep(0.45, 0.85, nl * 0.8 + na * 0.2) * grime * 0.5;
	if (is_wall) {
		float foot = 1.0 - smoothstep(0.0, 0.3 + nb * 0.25, h);
		float drip = smoothstep(0.62, 0.9, texture(noise_a, vec2(nuv.x * 3.1, w_pos.y * 0.35)).r) * (1.0 - smoothstep(0.4, 2.6, h));
		g += (foot * 0.9 + drip * 0.5) * grime;
	}
	g = clamp(g, 0.0, 0.92);
	alb = mix(alb, alb * grime_color * 3.2, g * 0.65);

	float ao = mix(1.0, orm.r, ao_strength);
	float rough = clamp(orm.g * roughness_mul + roughness_add + g * 0.15, 0.03, 1.0);
	float metal = clamp(orm.b * metallic_mul, 0.0, 1.0);

	// Sol mouillé : toute la surface est humide (un peu plus sombre et
	// brillante) ; quelques flaques larges aux bords doux, lisses comme un miroir.
	if (wetness > 0.0 && w_nrm.y > 0.7) {
		float pn = texture(noise_a, w_pos.xz * 0.045 + vec2(0.61, 0.13)).r;
		float puddle = smoothstep(0.6, 0.655, pn + (nb - 0.5) * 0.06) * wetness;
		float damp = wetness * 0.6;
		alb *= (1.0 - damp * 0.2) * (1.0 - puddle * 0.22);
		rough = mix(rough, rough * 0.55, damp);
		rough = mix(rough, 0.04, puddle);
		pert *= 1.0 - puddle * 0.9;
	}

	vec3 nw = normalize(w_nrm + pert);
	NORMAL = normalize((VIEW_MATRIX * vec4(nw, 0.0)).xyz);
	ALBEDO = clamp(alb, 0.0, 1.0);
	ROUGHNESS = rough;
	METALLIC = metal;
	AO = ao;
	AO_LIGHT_AFFECT = 0.3;
	SPECULAR = 0.5;
}

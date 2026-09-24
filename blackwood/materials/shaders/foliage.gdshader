shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_lambert_wrap, specular_schlick_ggx;

// Feuillage : volumes (ellipsoïdes, cônes) découpés par un bruit projeté en
// coordonnées monde. Les trous et les bords déchiquetés donnent des masses de
// feuilles au lieu de formes géométriques lisses ; les faces arrière restent
// visibles à travers les trous. Léger balancement au vent.

uniform vec3 color_dark : source_color = vec3(0.025, 0.045, 0.022);
uniform vec3 color_light : source_color = vec3(0.075, 0.105, 0.04);
uniform sampler2D noise_b : filter_linear_mipmap, repeat_enable;
// Répétitions du motif de feuilles par mètre
uniform float leaf_scale = 0.9;
// Part découpée (0 : volume plein, 1 : presque tout transparent)
uniform float cutout = 0.42;
uniform float sway = 0.05;

varying vec3 w_pos;
varying vec3 w_nrm;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	// Balancement : plus ample en hauteur, déphasé selon la position
	float s = sin(TIME * 1.1 + wp.x * 0.35 + wp.z * 0.21) + 0.4 * sin(TIME * 2.3 + wp.z * 0.8);
	VERTEX.x += s * sway * clamp(wp.y * 0.08, 0.0, 1.0);
	VERTEX.z += s * sway * 0.6 * clamp(wp.y * 0.08, 0.0, 1.0);
	w_pos = wp;
	w_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

float tri(vec3 p, vec3 w, float s) {
	return texture(noise_b, p.zy * s).r * w.x + texture(noise_b, p.xz * s).r * w.y + texture(noise_b, p.xy * s).r * w.z;
}

void fragment() {
	vec3 w = pow(abs(w_nrm), vec3(3.0));
	w /= (w.x + w.y + w.z + 1e-4);
	float n1 = tri(w_pos, w, leaf_scale);
	float n2 = tri(w_pos + vec3(3.1, 7.7, 1.3), w, leaf_scale * 3.3);
	float leaf = n1 * 0.55 + n2 * 0.45;
	// Vu de biais (contour), le feuillage est plus ajouré : silhouettes irrégulières
	float facing = abs(dot(normalize(NORMAL), normalize(VIEW)));
	float cut = cutout + (1.0 - facing) * 0.18;
	ALPHA = smoothstep(cut - 0.03, cut + 0.03, leaf);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	float shade = smoothstep(0.3, 0.75, n2);
	vec3 col = mix(color_dark, color_light, shade);
	// Intérieur de la masse (faces arrière) plus sombre
	col *= FRONT_FACING ? 1.0 : 0.55;
	ALBEDO = col;
	ROUGHNESS = 0.85;
	SPECULAR = 0.25;
	BACKLIGHT = col * 0.6;
	if (!FRONT_FACING) {
		NORMAL = -NORMAL;
	}
}

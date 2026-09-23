shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Surface procédurale en coordonnées monde : aucun UV requis, la densité de
// texture reste constante quelle que soit la taille des blocs fusionnés.
// pattern : 0 uni · 1 carrelage · 2 mur bicolore · 3 faux plafond · 4 béton banché
//           5 asphalte · 6 linoléum · 7 métal · 8 bois · 9 plâtre sale

uniform int pattern = 0;
uniform vec3 base_color : source_color = vec3(0.55, 0.55, 0.52);
uniform vec3 alt_color : source_color = vec3(0.35, 0.40, 0.38);
uniform vec3 line_color : source_color = vec3(0.18, 0.18, 0.17);
uniform vec3 grime_color : source_color = vec3(0.10, 0.085, 0.07);
uniform float tile_size = 0.5;
uniform float line_width = 0.012;
uniform float band_height = 1.1;
uniform float floor_level = 0.0;
uniform float grime = 0.5;
uniform float grime_scale = 0.35;
uniform float roughness = 0.85;
uniform float metallic = 0.0;
uniform float wetness = 0.0;
uniform float bump = 1.0;
uniform float variation = 0.08;
uniform float emission_boost = 0.0;
uniform sampler2D noise_a : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

varying vec3 w_pos;
varying vec3 w_nrm;

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

vec3 tri_weights(vec3 n) {
	vec3 w = pow(abs(n), vec3(4.0));
	return w / (w.x + w.y + w.z + 0.0001);
}

float tri(sampler2D t, vec3 p, vec3 w, float s) {
	return texture(t, p.zy * s).r * w.x + texture(t, p.xz * s).r * w.y + texture(t, p.xy * s).r * w.z;
}

float hash2(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 plane_uv(vec3 p, vec3 n) {
	vec3 a = abs(n);
	if (a.y > a.x && a.y > a.z) {
		return p.xz;
	}
	if (a.x > a.z) {
		return p.zy;
	}
	return p.xy;
}

float grid_lines(vec2 uv, vec2 size, float width) {
	vec2 f = fract(uv / size);
	vec2 dist = min(f, 1.0 - f) * size;
	float d = min(dist.x, dist.y);
	float aa = max(fwidth(d), 0.0006);
	return 1.0 - smoothstep(width * 0.5 - aa, width * 0.5 + aa, d);
}

void fragment() {
	vec3 w = tri_weights(w_nrm);
	float na = tri(noise_a, w_pos, w, grime_scale);
	float nb = tri(noise_b, w_pos, w, 1.6);
	vec2 uv = plane_uv(w_pos, w_nrm);
	vec3 col = base_color;
	float rough = roughness;
	float metal = metallic;
	float height = nb * 0.25;
	// Salissures douces : larges nappes peu contrastées + accumulation près du sol
	float grime_mask = smoothstep(0.55, 1.0, na) * grime * 0.55;
	float wet_mask = 0.0;
	float is_floor = step(0.7, w_nrm.y);

	if (pattern == 1) {
		// Carrelage en damier, joints, carreaux abîmés
		vec2 cell = floor(uv / tile_size);
		float h = hash2(cell);
		col = mix(base_color, alt_color, step(0.5, mod(cell.x + cell.y, 2.0)));
		col *= 1.0 + (h - 0.5) * variation * 2.0;
		float lines = grid_lines(uv, vec2(tile_size), line_width);
		float cracked = step(0.965, h);
		col = mix(col, col * 0.55, cracked * smoothstep(0.4, 0.6, nb));
		col = mix(col, line_color, lines);
		height = (1.0 - lines) * 0.6 + nb * 0.08;
		rough = mix(roughness, 0.95, lines);
		wet_mask = smoothstep(0.62, 0.72, na) * wetness;
	} else if (pattern == 2) {
		// Mur d'hôpital : soubassement lessivable, liseré, traînées verticales
		float y = w_pos.y - floor_level;
		col = y < band_height ? alt_color : base_color;
		float stripe = 1.0 - smoothstep(0.018, 0.022 + fwidth(y), abs(y - band_height));
		col = mix(col, line_color, stripe);
		vec3 sp = vec3(w_pos.x, w_pos.y * 0.07, w_pos.z);
		float streak = tri(noise_b, sp, w, 0.8);
		grime_mask = max(grime_mask, smoothstep(0.62, 0.95, streak) * grime * 0.55);
		grime_mask = max(grime_mask, (1.0 - smoothstep(0.0, 0.35, y)) * grime * 0.7);
		float stain = smoothstep(0.68, 0.8, tri(noise_a, w_pos + vec3(13.0), w, 0.18));
		col = mix(col, vec3(0.42, 0.33, 0.2) * col * 1.5, stain * 0.35 * grime);
		height = nb * 0.12 + stripe * 0.3;
	} else if (pattern == 3) {
		// Faux plafond : dalles 60 cm, ossature, taches d'humidité, dalles manquantes
		vec2 cell = floor(uv / 0.6);
		float h = hash2(cell + 7.0);
		float lines = grid_lines(uv, vec2(0.6), 0.025);
		float missing = step(0.955, h);
		col = base_color * (1.0 + (h - 0.5) * 0.1);
		float stain = smoothstep(0.62, 0.78, na);
		col = mix(col, vec3(0.45, 0.36, 0.2), stain * 0.6 * grime);
		col = mix(col, vec3(0.02), missing);
		col = mix(col, line_color, lines);
		metal = lines * 0.4;
		height = (1.0 - lines) * 0.5 - missing * 0.8 + nb * 0.2;
	} else if (pattern == 4) {
		// Béton banché : panneaux, trous d'écarteurs, coulures
		vec2 panel = vec2(2.4, 1.2);
		float lines = grid_lines(uv, panel, 0.01);
		vec2 local = fract(uv / panel) * panel;
		vec2 hole_grid = fract(local / vec2(0.6, 0.6)) - 0.5;
		float holes = 1.0 - smoothstep(0.018, 0.028, length(hole_grid * 0.6));
		col = base_color * (0.85 + nb * 0.3);
		col = mix(col, alt_color, smoothstep(0.3, 0.8, na) * 0.3);
		col = mix(col, line_color, max(lines * 0.6, holes * (1.0 - is_floor)));
		vec3 sp = vec3(w_pos.x, w_pos.y * 0.1, w_pos.z);
		float streak = tri(noise_b, sp, w, 0.7);
		grime_mask = max(grime_mask, smoothstep(0.64, 0.97, streak) * grime * 0.6 * (1.0 - is_floor));
		height = nb * 0.5 - lines * 0.5 - holes * 0.8;
		wet_mask = smoothstep(0.62, 0.72, na) * wetness * is_floor;
	} else if (pattern == 5) {
		// Asphalte mouillé : grain, fissures, flaques
		col = base_color * (0.75 + nb * 0.5);
		float crack = 1.0 - smoothstep(0.0, 0.012, abs(na - 0.5));
		col = mix(col, line_color, crack * 0.8);
		height = nb * 0.6 - crack;
		wet_mask = max(smoothstep(0.6, 0.66, na) * wetness, wetness * 0.35);
	} else if (pattern == 6) {
		// Linoléum : grandes dalles, moucheture, rayures
		vec2 cell = floor(uv / tile_size);
		float h = hash2(cell + 3.0);
		float lines = grid_lines(uv, vec2(tile_size), 0.004);
		float speck = step(0.8, texture(noise_b, uv * 6.0).r);
		col = base_color * (1.0 + (h - 0.5) * variation) * (1.0 - speck * 0.15);
		col = mix(col, line_color, lines * 0.7);
		height = nb * 0.05 - lines * 0.3;
		rough = roughness - smoothstep(0.3, 0.7, na) * 0.25;
	} else if (pattern == 7) {
		// Métal peint : rouille, rayures
		float rust = smoothstep(0.66, 0.84, na) * smoothstep(0.4, 0.75, nb) * clamp(grime * 1.6, 0.0, 1.0);
		col = mix(base_color * (0.9 + nb * 0.2), alt_color, rust);
		rough = mix(roughness, 0.95, rust);
		metal = mix(metallic, 0.1, rust);
		height = nb * 0.4 + rust * 0.4;
	} else if (pattern == 8) {
		// Bois : veinage étiré selon l'axe principal
		vec3 a = abs(w_nrm);
		vec2 grain_uv = a.y > 0.5 ? w_pos.xz : (a.x > a.z ? w_pos.zy : w_pos.xy);
		float grain = texture(noise_b, vec2(grain_uv.x * 0.25, grain_uv.y * 4.0)).r;
		col = mix(base_color, alt_color, smoothstep(0.3, 0.8, grain));
		height = grain * 0.3;
	} else if (pattern == 9) {
		// Plâtre sale et écaillé
		float flake = smoothstep(0.71, 0.75, na) * 0.8;
		col = mix(base_color * (0.9 + nb * 0.2), alt_color, flake);
		height = nb * 0.3 - flake * 0.5;
		vec3 sp = vec3(w_pos.x, w_pos.y * 0.07, w_pos.z);
		grime_mask = max(grime_mask, smoothstep(0.64, 0.97, tri(noise_b, sp, w, 0.8)) * grime * 0.6);
	} else {
		col = base_color * (1.0 + (nb - 0.5) * variation * 2.0);
	}

	col = mix(col, grime_color, clamp(grime_mask, 0.0, 1.0) * 0.8);
	rough = mix(rough, 0.95, grime_mask * 0.5);
	col *= mix(1.0, 0.72, wet_mask);
	rough = mix(rough, 0.12, wet_mask);

	// Relief par dérivées écran (bump mapping sans tangentes)
	float hmeters = height * bump * 0.003;
	vec3 dpdx = dFdx(VERTEX);
	vec3 dpdy = dFdy(VERTEX);
	float dhdx = dFdx(hmeters);
	float dhdy = dFdy(hmeters);
	vec3 r1 = cross(dpdy, NORMAL);
	vec3 r2 = cross(NORMAL, dpdx);
	float det = dot(dpdx, r1);
	vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
	NORMAL = normalize(abs(det) * NORMAL - grad);

	ALBEDO = col;
	ROUGHNESS = clamp(rough, 0.04, 1.0);
	METALLIC = metal;
	SPECULAR = 0.5;
	EMISSION = col * emission_boost;
}

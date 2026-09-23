shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, diffuse_burley, specular_schlick_ggx;

// Tache de sang procédurale sur un quad : forme irrégulière, bords foncés,
// aspect humide. Chaque tache varie selon sa position dans le monde.

uniform vec3 color_fresh : source_color = vec3(0.26, 0.015, 0.012);
uniform vec3 color_dry : source_color = vec3(0.12, 0.03, 0.02);
uniform float dryness = 0.5;
uniform float smear = 0.0;
uniform sampler2D noise_a : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

varying vec3 origin;

void vertex() {
	origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
}

void fragment() {
	vec2 seed = origin.xz * 0.37 + origin.y * 0.11;
	vec2 p = UV - 0.5;
	p.x *= 1.0 - smear * 0.7;
	float n1 = texture(noise_a, UV * 0.8 + seed).r;
	float n2 = texture(noise_b, UV * 2.5 + seed * 1.7).r;
	float r = length(p) * 2.0;
	float shape = 1.0 - r + (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.35;
	// Gouttelettes satellites
	float drops = step(0.83, texture(noise_b, UV * 9.0 + seed * 3.1).r) * step(r, 0.95);
	float a = max(smoothstep(0.02, 0.1, shape), drops);
	if (a < 0.02) {
		discard;
	}
	float edge = 1.0 - smoothstep(0.05, 0.35, shape);
	vec3 col = mix(color_fresh, color_dry, clamp(dryness + n2 * 0.3, 0.0, 1.0));
	col *= mix(1.0, 0.45, edge);
	ALBEDO = col;
	ALPHA = a * 0.95;
	ROUGHNESS = mix(0.12, 0.6, dryness + edge * 0.3);
	SPECULAR = 0.6;
}

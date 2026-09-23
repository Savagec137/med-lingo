shader_type sky;

// Ciel nocturne : dégradé bleu nuit, nuages lents éclairés par la lune,
// disque lunaire voilé. La lune suit la lumière directionnelle principale.

uniform vec3 top_color : source_color = vec3(0.004, 0.006, 0.014);
uniform vec3 horizon_color : source_color = vec3(0.025, 0.03, 0.045);
uniform vec3 cloud_color : source_color = vec3(0.06, 0.07, 0.09);
uniform vec3 moon_color : source_color = vec3(0.75, 0.8, 0.95);
uniform float dawn = 0.0;
uniform sampler2D noise_a : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

void sky() {
	vec3 d = normalize(EYEDIR);
	float h = clamp(d.y, 0.0, 1.0);
	vec3 top = mix(top_color, vec3(0.1, 0.13, 0.2), dawn);
	vec3 hor = mix(horizon_color, vec3(0.45, 0.35, 0.3), dawn);
	vec3 col = mix(hor, top, pow(h, 0.45));
	vec3 moon_dir = normalize(LIGHT0_DIRECTION);
	float m = dot(d, moon_dir);
	// Nuages projetés sur un plan haut
	vec2 uv = d.xz / max(d.y, 0.04) * 0.08 + vec2(TIME * 0.0015, TIME * 0.0006);
	float c = texture(noise_a, uv).r * 0.7 + texture(noise_b, uv * 2.3).r * 0.3;
	float cloud = smoothstep(0.42, 0.78, c) * smoothstep(0.0, 0.25, d.y);
	float lit = pow(max(m, 0.0), 12.0);
	vec3 cc = mix(cloud_color, moon_color * 0.35, lit * 0.8);
	cc = mix(cc, vec3(0.55, 0.45, 0.42), dawn * 0.6);
	col = mix(col, cc, cloud * 0.85);
	// Disque lunaire et halo, voilés par les nuages
	float disc = smoothstep(0.99955, 0.9997, m);
	float halo = pow(max(m, 0.0), 180.0) * 0.35 + pow(max(m, 0.0), 24.0) * 0.06;
	col += moon_color * (disc * 1.6 + halo) * (1.0 - cloud * 0.75) * (1.0 - dawn);
	COLOR = col;
}

shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;

// Flaque / sol inondé : très sombre, lisse, ondulations animées.
// « electrified » fait courir des arcs bleutés (piège du générateur).

uniform vec3 color : source_color = vec3(0.02, 0.025, 0.03);
uniform float electrified = 0.0;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

varying vec3 w_pos;

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME;
	vec2 p = w_pos.xz;
	float h1 = texture(noise_b, p * 0.5 + vec2(t * 0.02, t * 0.013)).r;
	float h2 = texture(noise_b, p * 0.9 - vec2(t * 0.017, -t * 0.021)).r;
	float h = (h1 + h2) * 0.5;
	vec3 dpdx = dFdx(VERTEX);
	vec3 dpdy = dFdy(VERTEX);
	float dhdx = dFdx(h * 0.004);
	float dhdy = dFdy(h * 0.004);
	vec3 r1 = cross(dpdy, NORMAL);
	vec3 r2 = cross(NORMAL, dpdx);
	float det = dot(dpdx, r1);
	NORMAL = normalize(abs(det) * NORMAL - sign(det) * (dhdx * r1 + dhdy * r2));
	vec3 col = color;
	float arcs = 0.0;
	if (electrified > 0.0) {
		float n = texture(noise_b, p * 1.3 + vec2(floor(t * 20.0) * 0.37)).r;
		arcs = (1.0 - smoothstep(0.0, 0.025, abs(n - 0.5))) * electrified;
	}
	ALBEDO = col;
	ROUGHNESS = 0.03;
	METALLIC = 0.0;
	SPECULAR = 0.9;
	EMISSION = vec3(0.35, 0.6, 1.0) * arcs * 6.0;
}

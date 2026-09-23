shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back;

// Liquide de cuve à spécimen : lueur, bulles montantes, trouble.

uniform vec3 color : source_color = vec3(0.1, 0.7, 0.45);
uniform float glow = 1.4;
uniform float murk = 0.5;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

varying vec3 w_pos;

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME;
	float n = texture(noise_b, vec2(w_pos.x + w_pos.z, w_pos.y * 0.5 - t * 0.05)).r;
	vec2 bub_uv = vec2(atan(w_pos.z, w_pos.x) * 3.0, w_pos.y * 4.0 - t * 0.9);
	float bubbles = step(0.86, texture(noise_b, bub_uv * 0.5).r);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.0);
	vec3 col = color * (0.4 + n * murk + bubbles * 0.8);
	ALBEDO = col * 0.3;
	EMISSION = col * glow * (0.6 + fres * 0.8);
	ROUGHNESS = 0.05;
	SPECULAR = 0.8;
	ALPHA = 0.82;
}

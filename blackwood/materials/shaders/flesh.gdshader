shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Chair des créatures : peau cireuse, veines sombres, plaies humides.

uniform vec3 skin : source_color = vec3(0.52, 0.5, 0.46);
uniform vec3 vein : source_color = vec3(0.16, 0.1, 0.14);
uniform vec3 wound : source_color = vec3(0.25, 0.02, 0.02);
uniform float wound_amount = 0.3;
uniform float vein_amount = 0.6;
uniform float hit_flash = 0.0;
uniform sampler2D noise_a : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

varying vec3 l_pos;

void vertex() {
	l_pos = VERTEX;
}

void fragment() {
	vec2 uv = l_pos.xy * 2.0 + l_pos.zz * 1.3;
	float n = texture(noise_a, uv * 0.7).r;
	float fine = texture(noise_b, uv * 2.0).r;
	float veins = 1.0 - smoothstep(0.0, 0.03, abs(texture(noise_b, uv * 0.9 + 3.1).r - 0.5));
	float wounds = smoothstep(0.72, 0.8, n) * wound_amount;
	vec3 col = skin * (0.8 + fine * 0.35);
	col = mix(col, vein, veins * vein_amount);
	col = mix(col, wound, wounds);
	ALBEDO = col + vec3(0.6, 0.05, 0.03) * hit_flash;
	ROUGHNESS = mix(0.55, 0.15, wounds);
	SPECULAR = 0.45;
}

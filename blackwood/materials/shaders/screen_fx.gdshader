shader_type canvas_item;

// Post-traitement plein écran : grain, vignette, aberration chromatique,
// désaturation à faible santé, voile rouge des dégâts, luminosité.

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float grain = 0.06;
uniform float vignette = 0.45;
uniform float aberration = 0.0015;
uniform float damage = 0.0;
uniform float low_health = 0.0;
uniform float brightness = 1.0;
uniform float blackout = 0.0;
uniform float distortion = 0.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 c = uv - 0.5;
	float d = length(c);
	uv += c * distortion * sin(TIME * 3.0 + d * 10.0) * 0.02;
	float ab = aberration * (1.0 + damage * 4.0 + low_health * 2.0) * d * 2.0;
	vec3 col;
	col.r = texture(screen_tex, uv + c * ab).r;
	col.g = texture(screen_tex, uv).g;
	col.b = texture(screen_tex, uv - c * ab).b;
	col *= brightness;
	float lum = dot(col, vec3(0.299, 0.587, 0.114));
	col = mix(col, vec3(lum), low_health * 0.6);
	float v = smoothstep(0.85, 0.2, d * (1.0 + vignette));
	col *= mix(1.0, v, vignette + low_health * 0.3);
	float pulse = 0.5 + 0.5 * sin(TIME * 5.5);
	vec3 red = vec3(0.45, 0.0, 0.0);
	col = mix(col, red, clamp(damage * smoothstep(0.1, 0.7, d) + low_health * 0.35 * pulse * smoothstep(0.3, 0.8, d), 0.0, 1.0));
	float g = hash(uv * vec2(1280.0, 720.0) + fract(TIME * 7.3) * 100.0) - 0.5;
	col += g * grain;
	col *= 1.0 - blackout;
	COLOR = vec4(col, 1.0);
}

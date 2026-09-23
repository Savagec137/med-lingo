shader_type spatial;
render_mode unshaded, cull_back;

// Écran cathodique : lignes de balayage, bruit, scintillement.
// mode 0 : texte vert / terminal · 1 : neige (téléviseur) · 2 : flux vidéo (CCTV)
// 3 : écran d'erreur rouge · 4 : moniteur médical (tracé ECG)

uniform int mode = 0;
uniform vec3 tint : source_color = vec3(0.25, 1.0, 0.45);
uniform float brightness = 1.2;
uniform float flicker = 0.08;
uniform sampler2D feed : hint_default_black, filter_linear;
uniform sampler2D noise_b : hint_default_white, filter_linear_mipmap, repeat_enable;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec2 uv = UV;
	float t = TIME;
	float scan = 0.75 + 0.25 * sin(uv.y * 360.0 + t * 8.0);
	float fl = 1.0 - flicker * step(0.93, hash(vec2(floor(t * 14.0), 1.0)));
	vec3 col = vec3(0.0);
	if (mode == 0) {
		// Lignes de « texte » pseudo-aléatoires
		vec2 grid = vec2(40.0, 18.0);
		vec2 cell = floor(uv * grid);
		float line_len = hash(vec2(cell.y, 3.0)) * grid.x;
		float glyph = step(0.35, hash(cell + floor(t * 0.5) * step(cell.y, 2.0)));
		float on = step(cell.x, line_len) * glyph;
		vec2 f = fract(uv * grid);
		on *= step(0.15, f.x) * step(f.x, 0.85) * step(0.25, f.y) * step(f.y, 0.8);
		float cursor = step(0.5, fract(t * 1.5)) * step(abs(cell.y - 16.0), 0.5) * step(abs(cell.x - 2.0), 0.5);
		col = tint * (on * 0.9 + cursor + 0.05);
	} else if (mode == 1) {
		float n = hash(floor(uv * vec2(160.0, 120.0)) + floor(t * 30.0));
		col = vec3(n) * 0.8;
	} else if (mode == 2) {
		vec2 juv = uv + vec2(0.004 * sin(t * 40.0 + uv.y * 10.0) * step(0.97, hash(vec2(floor(t * 6.0)))), 0.0);
		vec3 f = texture(feed, juv).rgb;
		float g = dot(f, vec3(0.3, 0.59, 0.11));
		float n = hash(floor(uv * vec2(200.0, 150.0)) + floor(t * 24.0));
		col = vec3(g * 1.6 + n * 0.12) * vec3(0.8, 1.0, 0.85);
		float vig = smoothstep(0.85, 0.3, length(uv - 0.5));
		col *= vig;
	} else if (mode == 3) {
		float blink = step(0.5, fract(t * 0.8));
		col = tint * (0.15 + blink * 0.6 * step(abs(uv.y - 0.5), 0.08) * step(abs(uv.x - 0.5), 0.35));
	} else {
		// Tracé ECG plat avec rares sursauts
		float x = fract(uv.x - t * 0.25);
		float beat = exp(-pow((x - 0.5) * 60.0, 2.0)) * 0.3 * step(0.8, hash(vec2(floor(t * 0.25 - uv.x), 5.0)));
		float y = 0.5 + beat;
		float line = 1.0 - smoothstep(0.004, 0.012, abs(uv.y - y));
		col = tint * (line + 0.03);
	}
	col *= scan * fl * brightness;
	ALBEDO = col;
	EMISSION = col;
}

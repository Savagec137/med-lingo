shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

// Peau et vêtements des infectés (modèle riggé Higgsfield + textures PBR d'origine).
// Les variantes recolorent la blouse (pixels à dominante bleue) et la peau :
// infirmier (tenue verte), patient neurologique (blouse blanchâtre), sujet
// expérimental (chair rougie), etc.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap;
uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec3 cloth_tint : source_color = vec3(1.0);
uniform float cloth_mix = 0.0;
uniform vec3 skin_tint : source_color = vec3(1.0);
uniform float pallor = 0.0;
uniform float blood = 0.0;
uniform float wet = 0.0;
uniform float hit_flash = 0.0;

void fragment() {
	vec3 c = texture(albedo_tex, UV).rgb;
	vec3 orm = texture(orm_tex, UV).rgb;
	float lum = dot(c, vec3(0.3, 0.59, 0.11));
	// Masque « tissu » : la blouse d'origine est bleu clair
	// (valeurs linéaires : blouse ≈ b - r 0,17 et luminance 0,2 ; peau b - r < 0)
	float cloth = smoothstep(0.02, 0.08, c.b - c.r) * smoothstep(0.03, 0.09, lum);
	vec3 cloth_col = mix(c, cloth_tint * (lum * 4.0), cloth_mix);
	vec3 skin_col = mix(c * skin_tint, vec3(lum) * skin_tint, pallor);
	c = mix(skin_col, cloth_col, cloth);
	// Sang séché : taches sombres pilotées par la couleur d'origine (bruit bon marché)
	// Sang : nappes irrégulières (bruit) plus sombres au centre
	float n = texture(noise_tex, UV * 3.0).r * 0.7 + texture(noise_tex, UV * 11.0 + 0.3).r * 0.3;
	float thr = 1.0 - blood * 0.42;
	float stain = smoothstep(thr, thr + 0.05, n);
	float core = smoothstep(thr + 0.06, thr + 0.16, n);
	c = mix(c, mix(vec3(0.22, 0.03, 0.02), vec3(0.08, 0.01, 0.008), core), stain * 0.85);
	ALBEDO = c;
	ROUGHNESS = clamp(mix(orm.g, 0.25, wet * (1.0 - cloth)), 0.05, 1.0);
	METALLIC = 0.0;
	NORMAL_MAP = texture(normal_tex, UV).rgb;
	NORMAL_MAP_DEPTH = 1.0;
	EMISSION = vec3(0.55, 0.04, 0.02) * hit_flash;
	SSS_STRENGTH = 0.15 * (1.0 - cloth);
}

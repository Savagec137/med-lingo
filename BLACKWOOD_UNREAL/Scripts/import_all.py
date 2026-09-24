# -*- coding: utf-8 -*-
"""Blackwood Hospital : import complet Godot -> Unreal, à lancer DANS l'éditeur Unreal.

Éditeur Unreal > menu Outils (Tools) > « Exécuter un script Python… » (Execute Python Script)
> choisir ce fichier. Ou, dans la console Python de l'Output Log :
    py "C:/chemin/vers/BLACKWOOD_UNREAL/Scripts/import_all.py"

Pré-requis (voir README.md) :
  * le projet compilé (module C++ Blackwood) ;
  * SourceData/*.json (versionnés) et SourceAssets/Meshes/*.glb (paquet fourni ou
    Tools/GodotExport/export_godot.py) ;
  * le projet Godot à côté (../blackwood) pour les textures, sons, polices et le zombie.

Le script est ré-exécutable : les assets existants sont mis à jour, la carte est reconstruite.
Chaque étape écrit un résumé dans l'Output Log (préfixe [Blackwood]) et dans
Saved/Blackwood/import_report.txt.
"""
import json
import math
import os
import time

import unreal

# --------------------------------------------------------------------------------------
# Réglages
# --------------------------------------------------------------------------------------

ROOT = "/Game/Blackwood"
# Étapes à exécuter (toutes par défaut). Exemple : STEPS = ["materials", "level"]
STEPS = ["calibration", "textures", "materials", "meshes", "audio", "fonts", "zombie", "data", "level", "player"]
# Matériaux de secours sans projection monde (si les fonctions WorldAligned* posent problème)
SIMPLE_MATERIALS = False
# Nanite sur le décor opaque
USE_NANITE = True

PROJECT_DIR = os.path.normpath(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()))
REPO_DIR = os.path.normpath(os.path.join(PROJECT_DIR, ".."))
GODOT_DIR = os.path.join(REPO_DIR, "blackwood")
DATA_DIR = os.path.join(PROJECT_DIR, "SourceData")
MESH_DIR = os.path.join(PROJECT_DIR, "SourceAssets", "Meshes")
REPORT = []

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
eal = unreal.EditorAssetLibrary
mel = unreal.MaterialEditingLibrary

# Conversion d'axes Godot -> Unreal (vecteur Unreal pour 1 m sur X, Y, Z Godot). Valeur par
# défaut remplacée par la calibration (étape « calibration »).
AXES = [(0.0, 100.0, 0.0), (0.0, 0.0, 100.0), (-100.0, 0.0, 0.0)]


def log(msg):
    unreal.log("[Blackwood] " + msg)
    REPORT.append(msg)


def warn(msg):
    unreal.log_warning("[Blackwood] " + msg)
    REPORT.append("ATTENTION : " + msg)


def load_json(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def ensure_dir(path):
    if not eal.does_directory_exist(path):
        eal.make_directory(path)


def asset_path(folder, name):
    return "%s/%s" % (folder, name)


def load(path):
    return eal.load_asset(path) if eal.does_asset_exist(path) else None


def import_file(filename, dest_folder, dest_name=None, options=None, want=None):
    """Import d'un fichier ; renvoie l'asset importé de la classe « want » (sinon le premier)."""
    ensure_dir(dest_folder)
    task = unreal.AssetImportTask()
    task.set_editor_property("filename", filename)
    task.set_editor_property("destination_path", dest_folder)
    if dest_name:
        task.set_editor_property("destination_name", dest_name)
    task.set_editor_property("automated", True)
    task.set_editor_property("replace_existing", True)
    task.set_editor_property("save", False)
    if options is not None:
        task.set_editor_property("options", options)
    asset_tools.import_asset_tasks([task])
    paths = list(task.get_editor_property("imported_object_paths") or [])
    first = None
    for p in paths:
        obj = eal.load_asset(p.split(".")[0]) if "." in p else eal.load_asset(p)
        if obj is None:
            continue
        if want is None or isinstance(obj, want):
            return obj
        first = first or obj
    return first


def save_folder(folder):
    eal.save_directory(folder, only_if_is_dirty=True, recursive=True)


# --------------------------------------------------------------------------------------
# Conversion des transformations Godot -> Unreal
# --------------------------------------------------------------------------------------

def g2u(v):
    """Point ou vecteur Godot (m) -> Unreal (cm), selon la calibration."""
    x, y, z = v[0], v[1], v[2]
    return [AXES[0][i] * x + AXES[1][i] * y + AXES[2][i] * z for i in range(3)]


def g2u_dir(v):
    """Direction Godot -> direction Unreal (sans l'échelle 100)."""
    u = g2u(v)
    n = math.sqrt(sum(c * c for c in u)) or 1.0
    return [c / n for c in u]


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def axes_matrix():
    """Matrice orthonormée M (colonnes = axes Godot exprimés dans Unreal, sans échelle)."""
    cols = [g2u_dir(e) for e in ([1, 0, 0], [0, 1, 0], [0, 0, 1])]
    return [[cols[j][i] for j in range(3)] for i in range(3)]


def basis_matrix(basis):
    """Base Godot (JSON : 3 vecteurs colonnes x, y, z) -> matrice 3×3 (lignes)."""
    x, y, z = basis
    return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]


def quat_from_matrix(m):
    """Quaternion (x, y, z, w) d'une rotation (convention colonnes v' = M v)."""
    tr = m[0][0] + m[1][1] + m[2][2]
    if tr > 0:
        s = math.sqrt(tr + 1.0) * 2
        w, x, y, z = 0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s
    elif m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        w, x, y, z = (m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s
    elif m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        w, x, y, z = (m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s
    else:
        s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
        w, x, y, z = (m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s
    n = math.sqrt(x * x + y * y + z * z + w * w) or 1.0
    return x / n, y / n, z / n, w / n


def rotation_scale_of(m):
    """Sépare une matrice 3×3 en rotation (colonnes normées) et échelle par axe."""
    scale = []
    rot = [[0.0] * 3 for _ in range(3)]
    for j in range(3):
        col = [m[i][j] for i in range(3)]
        s = math.sqrt(sum(c * c for c in col)) or 1.0
        scale.append(s)
        for i in range(3):
            rot[i][j] = col[i] / s
    det = (rot[0][0] * (rot[1][1] * rot[2][2] - rot[1][2] * rot[2][1])
           - rot[0][1] * (rot[1][0] * rot[2][2] - rot[1][2] * rot[2][0])
           + rot[0][2] * (rot[1][0] * rot[2][1] - rot[1][1] * rot[2][0]))
    if det < 0:  # miroir : on le reporte sur l'échelle X
        scale[0] = -scale[0]
        for i in range(3):
            rot[i][0] = -rot[i][0]
    return rot, scale


def ue_transform(xf, extra_offset=None):
    """Transformation Godot (JSON {origin, basis}) -> unreal.Transform."""
    M = axes_matrix()
    Mt = [[M[j][i] for j in range(3)] for i in range(3)]
    B = basis_matrix(xf["basis"])
    R = mat_mul(mat_mul(M, B), Mt)
    rot, scale = rotation_scale_of(R)
    # L'échelle se lit sur les axes locaux Unreal, qui correspondent aux axes Godot permutés
    q = quat_from_matrix(rot)
    loc = g2u(xf["origin"])
    if extra_offset:
        loc = [loc[i] + extra_offset[i] for i in range(3)]
    t = unreal.Transform()
    t.translation = unreal.Vector(loc[0], loc[1], loc[2])
    t.rotation = unreal.Quat(q[0], q[1], q[2], q[3])
    t.scale3d = unreal.Vector(scale[0], scale[1], scale[2])
    return t


def ue_rotation_matrix(xf):
    """Rotation Unreal (matrice 3×3, colonnes = axes locaux) d'une transformation Godot."""
    M = axes_matrix()
    Mt = [[M[j][i] for j in range(3)] for i in range(3)]
    rot, _ = rotation_scale_of(mat_mul(mat_mul(M, basis_matrix(xf["basis"])), Mt))
    return rot


def look_matrix(d):
    """Rotation dont l'axe +X (avant d'une lumière Unreal) pointe vers d."""
    up = [0.0, 0.0, 1.0] if abs(d[2]) < 0.98 else [1.0, 0.0, 0.0]
    y = [up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]]
    n = math.sqrt(sum(c * c for c in y)) or 1.0
    y = [c / n for c in y]
    z = [d[1] * y[2] - d[2] * y[1], d[2] * y[0] - d[0] * y[2], d[0] * y[1] - d[1] * y[0]]
    return [[d[i], y[i], z[i]] for i in range(3)]


def ue_extent(size):
    """Dimensions Godot (m) d'une boîte -> demi-extensions Unreal (cm) dans le repère local converti."""
    M = axes_matrix()
    s = [abs(M[i][0]) * size[0] + abs(M[i][1]) * size[1] + abs(M[i][2]) * size[2] for i in range(3)]
    return unreal.Vector(s[0] * 50.0, s[1] * 50.0, s[2] * 50.0)


def spawn(cls, transform=None, label=None, folder=None):
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = eas.spawn_actor_from_class(cls, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0))
    if actor is None:
        warn("Impossible de créer un acteur %s" % cls)
        return None
    if transform is not None:
        actor.set_actor_transform(transform, False, True)
    if label:
        actor.set_actor_label(label)
    if folder:
        actor.set_folder_path(folder)
    return actor


# --------------------------------------------------------------------------------------
# 1. Calibration des axes (même conversion que l'import glTF d'Unreal)
# --------------------------------------------------------------------------------------

def step_calibration():
    global AXES
    folder = ROOT + "/Hospital/_Calibration"
    centers = []
    for axis in ("X", "Y", "Z"):
        mesh = import_file(os.path.join(MESH_DIR, "SM_Calib_%s.glb" % axis), folder, "SM_Calib_%s" % axis, want=unreal.StaticMesh)
        if not isinstance(mesh, unreal.StaticMesh):
            warn("Calibration impossible (SM_Calib_%s) : axes par défaut conservés." % axis)
            return
        bounds = mesh.get_bounds()
        o = bounds.origin
        centers.append((o.x / 2.0, o.y / 2.0, o.z / 2.0))  # cube placé à 2 m sur l'axe
    for c in centers:
        if sum(abs(v) for v in c) < 1.0:
            warn("Calibration : l'import a recentré les maillages (pivot) ; axes par défaut conservés.")
            return
    AXES = [tuple(round(v, 3) for v in c) for c in centers]
    M = axes_matrix()
    det = (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
           + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
    log("Calibration des axes Godot -> Unreal : X=%s Y=%s Z=%s (déterminant %.0f)" % (AXES[0], AXES[1], AXES[2], det))
    if det > 0:
        warn("La conversion glTF ne change pas l'orientation du repère : le niveau serait en miroir. "
             "Vérifier la version d'Unreal ; le script continue.")
    write_project_settings({
        "GodotAxisX": "(X=%.6f,Y=%.6f,Z=%.6f)" % AXES[0],
        "GodotAxisY": "(X=%.6f,Y=%.6f,Z=%.6f)" % AXES[1],
        "GodotAxisZ": "(X=%.6f,Y=%.6f,Z=%.6f)" % AXES[2],
    })
    try:
        cdo = unreal.get_default_object(unreal.BWProjectSettings)
        cdo.set_editor_property("godot_axis_x", unreal.Vector(*AXES[0]))
        cdo.set_editor_property("godot_axis_y", unreal.Vector(*AXES[1]))
        cdo.set_editor_property("godot_axis_z", unreal.Vector(*AXES[2]))
    except Exception as e:  # le module C++ doit être compilé
        warn("Réglages du projet non mis à jour en mémoire (%s) ; Config/DefaultGame.ini l'est." % e)


def write_project_settings(values):
    """Écrit des clés dans [/Script/Blackwood.BWProjectSettings] de Config/DefaultGame.ini."""
    path = os.path.join(PROJECT_DIR, "Config", "DefaultGame.ini")
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    section = "[/Script/Blackwood.BWProjectSettings]"
    if section not in lines:
        lines += ["", section]
    start = lines.index(section) + 1
    end = start
    while end < len(lines) and not lines[end].startswith("["):
        end += 1
    body = [l for l in lines[start:end] if l.split("=")[0].strip() not in values]
    while body and body[-1].strip() == "":
        body.pop()
    body += ["%s=%s" % (k, v) for k, v in values.items()] + [""]
    lines = lines[:start] + body + lines[end:]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


# --------------------------------------------------------------------------------------
# 2. Textures (Poly Haven CC0 + faux plafond + zombie)
# --------------------------------------------------------------------------------------

TEX_ROLES = {"albedo": "BaseColor", "normal": "Normal", "orm": "ORM"}


def configure_texture(tex, role):
    if role == "Normal":
        tex.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_NORMALMAP)
        tex.set_editor_property("srgb", False)
        tex.set_editor_property("flip_green_channel", True)  # normales OpenGL (Godot) -> DirectX
    elif role == "ORM":
        tex.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_MASKS)
        tex.set_editor_property("srgb", False)


def step_textures():
    src = os.path.join(GODOT_DIR, "assets", "textures")
    n = 0
    for folder in sorted(os.listdir(src)):
        fdir = os.path.join(src, folder)
        if not os.path.isdir(fdir):
            continue
        dest = "%s/Textures/Surfaces/%s" % (ROOT, folder)
        for base, role in TEX_ROLES.items():
            f = os.path.join(fdir, base + ".jpg")
            if not os.path.isfile(f):
                continue
            tex = import_file(f, dest, "T_%s_%s" % (folder, role), want=unreal.Texture2D)
            if tex:
                configure_texture(tex, role)
                n += 1
        save_folder(dest)
    zdir = os.path.join(GODOT_DIR, "assets", "models", "zombie")
    dest = ROOT + "/Enemies/Hollow/Textures"
    for base, role in TEX_ROLES.items():
        f = os.path.join(zdir, base + ".jpg")
        if os.path.isfile(f):
            tex = import_file(f, dest, "T_Hollow_%s" % role, want=unreal.Texture2D)
            if tex:
                configure_texture(tex, role)
                n += 1
    save_folder(dest)
    log("Textures importées : %d" % n)


# --------------------------------------------------------------------------------------
# 3. Matériaux : maîtres + une instance par matériau nommé de Godot
# --------------------------------------------------------------------------------------

MASTER = ROOT + "/Materials/Master"
FN_WORLD_TEX = "/Engine/Functions/Engine_MaterialFunctions01/Texturing/WorldAlignedTexture"
FN_WORLD_NRM = "/Engine/Functions/Engine_MaterialFunctions01/Texturing/WorldAlignedNormal"
_failed_links = []


def new_material(name):
    ensure_dir(MASTER)
    path = asset_path(MASTER, name)
    mat = load(path)
    if mat is None:
        mat = asset_tools.create_asset(name, MASTER, unreal.Material, unreal.MaterialFactoryNew())
    mel.delete_all_material_expressions(mat)
    return mat


def node(mat, cls, x, y, **props):
    e = mel.create_material_expression(mat, cls, x, y)
    for k, v in props.items():
        e.set_editor_property(k, v)
    return e


def link(a, out, b, inp):
    if not mel.connect_material_expressions(a, out, b, inp):
        _failed_links.append("%s.%s -> %s.%s" % (a.get_class().get_name(), out, b.get_class().get_name(), inp))


def to_prop(a, out, prop):
    if not mel.connect_material_property(a, out, prop):
        _failed_links.append("%s.%s -> %s" % (a.get_class().get_name(), out, prop))


def scalar(mat, name, default, x, y):
    return node(mat, unreal.MaterialExpressionScalarParameter, x, y, parameter_name=name, default_value=default)


def vector(mat, name, rgba, x, y):
    return node(mat, unreal.MaterialExpressionVectorParameter, x, y, parameter_name=name,
                default_value=unreal.LinearColor(*rgba))


def texparam(mat, name, sampler, default_path, x, y):
    e = node(mat, unreal.MaterialExpressionTextureObjectParameter, x, y, parameter_name=name)
    tex = eal.load_asset(default_path)
    if tex:
        e.set_editor_property("texture", tex)
    e.set_editor_property("sampler_type", sampler)
    return e


def mask(mat, x, y, r=True, g=True, b=True, a=False):
    return node(mat, unreal.MaterialExpressionComponentMask, x, y, r=r, g=g, b=b, a=a)


def fn_call(mat, path, x, y):
    e = node(mat, unreal.MaterialExpressionMaterialFunctionCall, x, y)
    fn = eal.load_asset(path)
    if fn is None:
        warn("Fonction de matériau introuvable : %s" % path)
    else:
        e.set_editor_property("material_function", fn)
    return e


def finish(mat):
    mel.layout_material_expressions(mat)
    mel.recompile_material(mat)
    eal.save_loaded_asset(mat)


def make_simple(name, translucent=False):
    """Couleur, rugosité, métal, émission (+ opacité si translucide)."""
    mat = new_material(name)
    if translucent:
        mat.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
        mat.set_editor_property("two_sided", True)
    base = vector(mat, "BaseColor", (0.6, 0.6, 0.6, 1), -600, -300)
    rough = scalar(mat, "Roughness", 0.6, -600, -150)
    metal = scalar(mat, "Metallic", 0.0, -600, -50)
    ecol = vector(mat, "EmissiveColor", (0, 0, 0, 1), -600, 50)
    estr = scalar(mat, "EmissiveStrength", 0.0, -600, 200)
    mul = node(mat, unreal.MaterialExpressionMultiply, -300, 100)
    link(ecol, "", mul, "A")
    link(estr, "", mul, "B")
    to_prop(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
    to_prop(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
    to_prop(metal, "", unreal.MaterialProperty.MP_METALLIC)
    to_prop(mul, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if translucent:
        op = scalar(mat, "Opacity", 0.3, -600, 300)
        to_prop(op, "", unreal.MaterialProperty.MP_OPACITY)
    finish(mat)
    return mat


def make_world_aligned():
    """Reprise de pbr_surface.gdshader : projection monde des textures PBR, teinte, saturation,
    luminosité, soubassement bicolore avec liseré, rugosité / métal / occlusion réglables."""
    mat = new_material("M_BW_WorldAligned")
    mat.set_editor_property("tangent_space_normal", False)
    X = -1800
    t_base = texparam(mat, "BaseColorTex", unreal.MaterialSamplerType.SAMPLERTYPE_COLOR,
                      "/Engine/EngineResources/DefaultTexture", X, -600)
    t_nrm = texparam(mat, "NormalTex", unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL,
                     "/Engine/EngineMaterials/DefaultNormal", X, 300)
    t_orm = texparam(mat, "ORMTex", unreal.MaterialSamplerType.SAMPLERTYPE_MASKS,
                     "/Engine/EngineResources/WhiteSquareTexture", X, 0)
    size = vector(mat, "TextureSize", (200, 200, 200, 1), X, 600)
    wat_b = fn_call(mat, FN_WORLD_TEX, X + 350, -600)
    wat_o = fn_call(mat, FN_WORLD_TEX, X + 350, 0)
    wan = fn_call(mat, FN_WORLD_NRM, X + 350, 300)
    for f, t in ((wat_b, t_base), (wat_o, t_orm), (wan, t_nrm)):
        link(t, "", f, "TextureObject")
        link(size, "", f, "TextureSize")
    # Couleur : désaturation, teinte, luminosité
    rgb = mask(mat, X + 700, -600)
    link(wat_b, "XYZ Texture", rgb, "")
    sat = scalar(mat, "Saturation", 1.0, X + 700, -450)
    one_minus = node(mat, unreal.MaterialExpressionOneMinus, X + 900, -450)
    link(sat, "", one_minus, "")
    desat = node(mat, unreal.MaterialExpressionDesaturation, X + 1050, -600)
    link(rgb, "", desat, "")
    link(one_minus, "", desat, "Fraction")
    tint = vector(mat, "Tint", (1, 1, 1, 1), X + 1050, -450)
    m1 = node(mat, unreal.MaterialExpressionMultiply, X + 1250, -600)
    link(desat, "", m1, "A")
    link(tint, "", m1, "B")
    bright = scalar(mat, "Brightness", 1.0, X + 1250, -450)
    m2 = node(mat, unreal.MaterialExpressionMultiply, X + 1450, -600)
    link(m1, "", m2, "A")
    link(bright, "", m2, "B")
    # Soubassement : h = hauteur au-dessus du sol de l'étage (fract((z - offset) / étage) × étage)
    wpos = node(mat, unreal.MaterialExpressionWorldPosition, X + 700, -1000)
    wz = mask(mat, X + 900, -1000, r=False, g=False, b=True)
    link(wpos, "", wz, "")
    offset = scalar(mat, "FloorOffset", 0.0, X + 900, -900)
    storey = scalar(mat, "StoreyHeight", 400.0, X + 900, -820)
    sub = node(mat, unreal.MaterialExpressionSubtract, X + 1050, -1000)
    link(wz, "", sub, "A")
    link(offset, "", sub, "B")
    div = node(mat, unreal.MaterialExpressionDivide, X + 1200, -1000)
    link(sub, "", div, "A")
    link(storey, "", div, "B")
    frac = node(mat, unreal.MaterialExpressionFrac, X + 1350, -1000)
    link(div, "", frac, "")
    h = node(mat, unreal.MaterialExpressionMultiply, X + 1500, -1000)
    link(frac, "", h, "A")
    link(storey, "", h, "B")
    # Mur : normale presque horizontale
    vn = node(mat, unreal.MaterialExpressionVertexNormalWS, X + 700, -1250)
    nz = mask(mat, X + 900, -1250, r=False, g=False, b=True)
    link(vn, "", nz, "")
    anz = node(mat, unreal.MaterialExpressionAbs, X + 1050, -1250)
    link(nz, "", anz, "")
    wall_sub = node(mat, unreal.MaterialExpressionSubtract, X + 1200, -1250, const_a=0.5)
    link(anz, "", wall_sub, "B")
    wall_mul = node(mat, unreal.MaterialExpressionMultiply, X + 1350, -1250, const_b=1000.0)
    link(wall_sub, "", wall_mul, "A")
    is_wall = node(mat, unreal.MaterialExpressionSaturate, X + 1500, -1250)
    link(wall_mul, "", is_wall, "")
    band_h = scalar(mat, "BandHeight", 0.0, X + 1500, -1100)
    below_sub = node(mat, unreal.MaterialExpressionSubtract, X + 1650, -1000)
    link(band_h, "", below_sub, "A")
    link(h, "", below_sub, "B")
    below_mul = node(mat, unreal.MaterialExpressionMultiply, X + 1800, -1000, const_b=1000.0)
    link(below_sub, "", below_mul, "A")
    below = node(mat, unreal.MaterialExpressionSaturate, X + 1950, -1000)
    link(below_mul, "", below, "")
    below_wall = node(mat, unreal.MaterialExpressionMultiply, X + 2100, -1000)
    link(below, "", below_wall, "A")
    link(is_wall, "", below_wall, "B")
    band_mul = vector(mat, "BandMultiplier", (1, 1, 1, 1), X + 1650, -700)
    band_col = node(mat, unreal.MaterialExpressionMultiply, X + 1850, -650)
    link(m2, "", band_col, "A")
    link(band_mul, "", band_col, "B")
    c1 = node(mat, unreal.MaterialExpressionLinearInterpolate, X + 2250, -700)
    link(m2, "", c1, "A")
    link(band_col, "", c1, "B")
    link(below_wall, "", c1, "Alpha")
    # Liseré (rail) : 1 - |h - bande| / 1,8 cm
    rail_d = node(mat, unreal.MaterialExpressionSubtract, X + 1650, -1400)
    link(h, "", rail_d, "A")
    link(band_h, "", rail_d, "B")
    rail_abs = node(mat, unreal.MaterialExpressionAbs, X + 1800, -1400)
    link(rail_d, "", rail_abs, "")
    rail_div = node(mat, unreal.MaterialExpressionDivide, X + 1950, -1400, const_b=1.8)
    link(rail_abs, "", rail_div, "A")
    rail_om = node(mat, unreal.MaterialExpressionOneMinus, X + 2100, -1400)
    link(rail_div, "", rail_om, "")
    rail_sat = node(mat, unreal.MaterialExpressionSaturate, X + 2250, -1400)
    link(rail_om, "", rail_sat, "")
    has_band = node(mat, unreal.MaterialExpressionMultiply, X + 1800, -1550, const_b=1000.0)
    link(band_h, "", has_band, "A")
    has_band_s = node(mat, unreal.MaterialExpressionSaturate, X + 1950, -1550)
    link(has_band, "", has_band_s, "")
    rail_k = node(mat, unreal.MaterialExpressionMultiply, X + 2400, -1400)
    link(rail_sat, "", rail_k, "A")
    link(has_band_s, "", rail_k, "B")
    rail_k2 = node(mat, unreal.MaterialExpressionMultiply, X + 2550, -1400)
    link(rail_k, "", rail_k2, "A")
    link(is_wall, "", rail_k2, "B")
    rail_k3 = node(mat, unreal.MaterialExpressionMultiply, X + 2700, -1400, const_b=0.85)
    link(rail_k2, "", rail_k3, "A")
    rail_col = vector(mat, "RailColor", (0.2, 0.2, 0.2, 1), X + 2400, -1200)
    c2 = node(mat, unreal.MaterialExpressionLinearInterpolate, X + 2850, -700)
    link(c1, "", c2, "A")
    link(rail_col, "", c2, "B")
    link(rail_k3, "", c2, "Alpha")
    to_prop(c2, "", unreal.MaterialProperty.MP_BASE_COLOR)
    # ORM : occlusion (R), rugosité (G), métal (B)
    orm_r = mask(mat, X + 700, -100, r=True, g=False, b=False)
    orm_g = mask(mat, X + 700, 0, r=False, g=True, b=False)
    orm_b = mask(mat, X + 700, 100, r=False, g=False, b=True)
    for m_ in (orm_r, orm_g, orm_b):
        link(wat_o, "XYZ Texture", m_, "")
    ao_k = scalar(mat, "AOStrength", 1.0, X + 900, -150)
    ao = node(mat, unreal.MaterialExpressionLinearInterpolate, X + 1100, -100, const_a=1.0)
    link(orm_r, "", ao, "B")
    link(ao_k, "", ao, "Alpha")
    to_prop(ao, "", unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
    r_mul = scalar(mat, "RoughnessMul", 1.0, X + 900, 0)
    r_add = scalar(mat, "RoughnessAdd", 0.0, X + 900, 60)
    rm = node(mat, unreal.MaterialExpressionMultiply, X + 1100, 0)
    link(orm_g, "", rm, "A")
    link(r_mul, "", rm, "B")
    ra = node(mat, unreal.MaterialExpressionAdd, X + 1250, 0)
    link(rm, "", ra, "A")
    link(r_add, "", ra, "B")
    rs = node(mat, unreal.MaterialExpressionSaturate, X + 1400, 0)
    link(ra, "", rs, "")
    to_prop(rs, "", unreal.MaterialProperty.MP_ROUGHNESS)
    m_mul = scalar(mat, "MetallicMul", 1.0, X + 900, 150)
    mm = node(mat, unreal.MaterialExpressionMultiply, X + 1100, 120)
    link(orm_b, "", mm, "A")
    link(m_mul, "", mm, "B")
    ms = node(mat, unreal.MaterialExpressionSaturate, X + 1250, 120)
    link(mm, "", ms, "")
    to_prop(ms, "", unreal.MaterialProperty.MP_METALLIC)
    # Normale (espace monde) dosée par NormalStrength
    nrm_rgb = mask(mat, X + 700, 300)
    link(wan, "XYZ Texture", nrm_rgb, "")
    vn2 = node(mat, unreal.MaterialExpressionVertexNormalWS, X + 700, 450)
    n_k = scalar(mat, "NormalStrength", 1.0, X + 900, 450)
    nl = node(mat, unreal.MaterialExpressionLinearInterpolate, X + 1100, 350)
    link(vn2, "", nl, "A")
    link(nrm_rgb, "", nl, "B")
    link(n_k, "", nl, "Alpha")
    nn = node(mat, unreal.MaterialExpressionNormalize, X + 1300, 350)
    link(nl, "", nn, "")
    to_prop(nn, "", unreal.MaterialProperty.MP_NORMAL)
    finish(mat)
    return mat


def make_uv_textured():
    """Matériau texturé de secours (coordonnées de texture des maillages Godot, en mètres)."""
    mat = new_material("M_BW_UVTextured")
    t_base = texparam(mat, "BaseColorTex", unreal.MaterialSamplerType.SAMPLERTYPE_COLOR,
                      "/Engine/EngineResources/DefaultTexture", -1200, -300)
    t_orm = texparam(mat, "ORMTex", unreal.MaterialSamplerType.SAMPLERTYPE_MASKS,
                     "/Engine/EngineResources/WhiteSquareTexture", -1200, 100)
    uv = node(mat, unreal.MaterialExpressionTextureCoordinate, -1200, -500)
    inv = scalar(mat, "UVScale", 0.5, -1200, -600)
    uvs = node(mat, unreal.MaterialExpressionMultiply, -1000, -500)
    link(uv, "", uvs, "A")
    link(inv, "", uvs, "B")
    s_base = node(mat, unreal.MaterialExpressionTextureSample, -800, -300)
    link(t_base, "", s_base, "Tex")
    link(uvs, "", s_base, "UVs")
    s_orm = node(mat, unreal.MaterialExpressionTextureSample, -800, 100)
    link(t_orm, "", s_orm, "Tex")
    link(uvs, "", s_orm, "UVs")
    tint = vector(mat, "Tint", (1, 1, 1, 1), -800, -500)
    bright = scalar(mat, "Brightness", 1.0, -800, -600)
    m1 = node(mat, unreal.MaterialExpressionMultiply, -500, -300)
    link(s_base, "RGB", m1, "A")
    link(tint, "", m1, "B")
    m2 = node(mat, unreal.MaterialExpressionMultiply, -300, -300)
    link(m1, "", m2, "A")
    link(bright, "", m2, "B")
    to_prop(m2, "", unreal.MaterialProperty.MP_BASE_COLOR)
    to_prop(s_orm, "R", unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
    to_prop(s_orm, "G", unreal.MaterialProperty.MP_ROUGHNESS)
    to_prop(s_orm, "B", unreal.MaterialProperty.MP_METALLIC)
    finish(mat)
    return mat


def make_zombie_skin():
    """Peau des infectés (texture du modèle Higgsfield) avec une teinte par variante."""
    mat = new_material("M_BW_ZombieSkin")
    t_base = texparam(mat, "BaseColorTex", unreal.MaterialSamplerType.SAMPLERTYPE_COLOR,
                      ROOT + "/Enemies/Hollow/Textures/T_Hollow_BaseColor", -1000, -300)
    t_nrm = texparam(mat, "NormalTex", unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL,
                     ROOT + "/Enemies/Hollow/Textures/T_Hollow_Normal", -1000, 100)
    t_orm = texparam(mat, "ORMTex", unreal.MaterialSamplerType.SAMPLERTYPE_MASKS,
                     ROOT + "/Enemies/Hollow/Textures/T_Hollow_ORM", -1000, 350)
    s_base = node(mat, unreal.MaterialExpressionTextureSample, -700, -300)
    link(t_base, "", s_base, "Tex")
    s_nrm = node(mat, unreal.MaterialExpressionTextureSample, -700, 100)
    s_nrm.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL)
    link(t_nrm, "", s_nrm, "Tex")
    s_orm = node(mat, unreal.MaterialExpressionTextureSample, -700, 350)
    s_orm.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_MASKS)
    link(t_orm, "", s_orm, "Tex")
    tint = vector(mat, "Tint", (1, 1, 1, 1), -700, -500)
    m1 = node(mat, unreal.MaterialExpressionMultiply, -400, -300)
    link(s_base, "RGB", m1, "A")
    link(tint, "", m1, "B")
    to_prop(m1, "", unreal.MaterialProperty.MP_BASE_COLOR)
    to_prop(s_nrm, "RGB", unreal.MaterialProperty.MP_NORMAL)
    wet = scalar(mat, "Wetness", 0.2, -700, 600)
    rough = node(mat, unreal.MaterialExpressionLinearInterpolate, -400, 400, const_b=0.15)
    link(s_orm, "G", rough, "A")
    link(wet, "", rough, "Alpha")
    to_prop(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
    to_prop(s_orm, "R", unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
    finish(mat)
    return mat


def new_mi(name, parent, folder):
    ensure_dir(folder)
    path = asset_path(folder, name)
    mi = load(path)
    if mi is None:
        mi = asset_tools.create_asset(name, folder, unreal.MaterialInstanceConstant,
                                      unreal.MaterialInstanceConstantFactoryNew())
    mel.set_material_instance_parent(mi, parent)
    return mi


def set_s(mi, name, v):
    mel.set_material_instance_scalar_parameter_value(mi, name, float(v))


def set_v(mi, name, rgba):
    c = list(rgba) + [1.0] * (4 - len(rgba))
    mel.set_material_instance_vector_parameter_value(mi, name, unreal.LinearColor(c[0], c[1], c[2], c[3]))


def set_t(mi, name, path):
    tex = load(path)
    if tex:
        mel.set_material_instance_texture_parameter_value(mi, name, tex)
    else:
        warn("Texture absente : %s" % path)


TRANSLUCENT_MATERIALS = set()


def step_materials():
    global _failed_links
    _failed_links = []
    m_simple = make_simple("M_BW_Simple")
    m_trans = make_simple("M_BW_Translucent", translucent=True)
    m_world = make_uv_textured() if SIMPLE_MATERIALS else make_world_aligned()
    m_zombie = make_zombie_skin()
    mats = load_json("materials.json")
    textured = mats["textured"]
    surfaces = mats["surfaces"]
    tex_size = mats["texture_size_m"]
    folder = ROOT + "/Materials/Surfaces"
    n = 0
    for name, entry in sorted(mats["used"].items()):
        d = entry.get("def", {})
        kind = entry.get("type")
        params = d.get("params", {}) if d.get("kind") == "shader" else {}
        shader = d.get("shader", "")
        if kind == "mats" and entry.get("source") == "textured" and name in textured:
            mi = new_mi("MI_" + name, m_world, folder)
            tdef = textured[name]
            tset = tdef.get("tex", "wall_plaster")
            for role in ("BaseColor", "Normal", "ORM"):
                set_t(mi, role + "Tex", "%s/Textures/Surfaces/%s/T_%s_%s" % (ROOT, tset, tset, role))
            size_cm = float(tex_size.get(tset, 2.0)) * float(tdef.get("scale", 1.0)) * 100.0
            if SIMPLE_MATERIALS:
                set_s(mi, "UVScale", 100.0 / size_cm)
            else:
                set_v(mi, "TextureSize", (size_cm, size_cm, size_cm, 1))
            tint = params.get("tint", tdef.get("tint", [1, 1, 1]))
            set_v(mi, "Tint", tint[:3])
            set_s(mi, "Brightness", params.get("brightness", tdef.get("brightness", 1.0)))
            set_s(mi, "Saturation", params.get("saturation", tdef.get("saturation", 1.0)))
            band = float(params.get("band_height", tdef.get("band", 0.0)))
            set_s(mi, "BandHeight", band * 100.0)
            if band > 0:
                bt = params.get("band_tint", tdef.get("band_tint", [1, 1, 1]))
                set_v(mi, "BandMultiplier", [bt[i] / max(float(tint[i]), 0.05) for i in range(3)])
                set_v(mi, "RailColor", params.get("rail_color", tdef.get("rail", [0.2, 0.2, 0.2]))[:3])
            wet = float(params.get("wetness", tdef.get("wet", 0.0)))
            grime = float(params.get("grime", tdef.get("grime", 0.35)))
            # Approximations : sol humide plus lisse, salissure moyenne plus sombre (pas de bruit)
            set_s(mi, "RoughnessMul", float(params.get("roughness_mul", tdef.get("rough_mul", 1.0))) * (1.0 - 0.27 * wet))
            set_s(mi, "RoughnessAdd", float(params.get("roughness_add", 0.0)))
            set_s(mi, "MetallicMul", float(params.get("metallic_mul", 1.0)))
            set_s(mi, "AOStrength", float(params.get("ao_strength", 1.0)))
            set_s(mi, "Brightness", float(params.get("brightness", tdef.get("brightness", 1.0))) * (1.0 - 0.08 * grime))
        elif kind == "zombie_skin":
            mi = new_mi("MI_" + name, m_zombie, ROOT + "/Enemies/Hollow/Materials")
            cloth = params.get("cloth_tint", [1, 1, 1, 1])
            mix = float(params.get("cloth_mix", 0.0)) * 0.5
            pallor = float(params.get("pallor", 0.45))
            set_v(mi, "Tint", [(1 - mix) + mix * cloth[i] + pallor * 0.1 for i in range(3)])
            set_s(mi, "Wetness", float(params.get("wet", 0.2)))
        else:
            translucent = False
            base, rough, metal, ecol, estr, opacity = [0.6, 0.6, 0.6], 0.6, 0.0, [0, 0, 0], 0.0, 1.0
            if kind == "mats" and entry.get("source") == "surface" and name in surfaces:
                sdef = surfaces[name]
                base = sdef.get("base", base)[:3]
                rough = sdef.get("rough", rough)
                metal = sdef.get("metallic", metal)
            elif d.get("kind") == "standard":
                a = d.get("albedo", [0.6, 0.6, 0.6, 1.0])
                base, rough, metal = a[:3], d.get("roughness", 0.6), d.get("metallic", 0.0)
                if d.get("emission_enabled"):
                    ecol, estr = d.get("emission", [0, 0, 0])[:3], float(d.get("emission_energy", 1.0))
                if int(d.get("transparency", 0)) != 0 or (len(a) > 3 and a[3] < 0.99 and not d.get("emission_enabled")):
                    translucent, opacity = True, max(float(a[3]) if len(a) > 3 else 0.3, 0.08)
            elif shader == "screen.gdshader":
                t = params.get("tint", [0.3, 1.0, 0.5, 1.0])
                base, ecol, estr, rough = [0.02, 0.02, 0.02], t[:3], 1.6, 0.25
            elif shader == "blood.gdshader":
                dry = float(params.get("dryness", 0.35))
                base, rough, translucent, opacity = [0.18 - 0.1 * dry, 0.01, 0.01], 0.15 + 0.6 * dry, True, 0.9
            elif shader == "liquid.gdshader":
                c = params.get("color", [0.2, 0.9, 0.5, 1.0])
                base, ecol, estr, translucent, opacity = c[:3], c[:3], float(params.get("glow", 1.0)) * 0.8, True, 0.55
            elif shader == "foliage.gdshader":
                base, rough = params.get("color_light", [0.05, 0.09, 0.04])[:3], 0.9
            elif shader == "water.gdshader":
                base, rough = [0.02, 0.02, 0.02], 0.05
            elif name == "collision":
                base = [0, 1, 0]
            mi = new_mi("MI_" + name, m_trans if translucent else m_simple, folder)
            set_v(mi, "BaseColor", base)
            set_s(mi, "Roughness", rough)
            set_s(mi, "Metallic", metal)
            set_v(mi, "EmissiveColor", ecol)
            set_s(mi, "EmissiveStrength", estr)
            if translucent:
                set_s(mi, "Opacity", opacity)
                TRANSLUCENT_MATERIALS.add(name)
        mel.update_material_instance(mi)
        n += 1
    save_folder(ROOT + "/Materials")
    save_folder(ROOT + "/Enemies/Hollow/Materials")
    log("Matériaux : 4 maîtres, %d instances" % n)
    if _failed_links:
        warn("Liaisons de matériau refusées (%d) : %s" % (len(_failed_links), "; ".join(sorted(set(_failed_links))[:12])))
        warn("Si les murs paraissent unis, relancer avec SIMPLE_MATERIALS = True.")


def material_for_slot(slot_name):
    name = str(slot_name)
    for candidate in (name, name.split(".")[0], name.rsplit("_", 1)[0] if name[-3:].isdigit() else name):
        for folder in (ROOT + "/Materials/Surfaces", ROOT + "/Enemies/Hollow/Materials"):
            mi = load(asset_path(folder, "MI_" + candidate))
            if mi:
                return mi, candidate
    return None, name


# --------------------------------------------------------------------------------------
# 4. Maillages (décor, collisions, accessoires, objets, cadavres)
# --------------------------------------------------------------------------------------

def mesh_folder(fname):
    if fname.startswith("SM_Level_"):
        return ROOT + "/Hospital/Geometry"
    if fname.startswith("SM_Collision_"):
        return ROOT + "/Hospital/Collision"
    if fname.startswith("SM_Prop_"):
        return ROOT + "/Hospital/Props"
    if fname.startswith("SM_Corpse_"):
        return ROOT + "/Characters/Corpses"
    if fname.startswith("SM_Calib_"):
        return ROOT + "/Hospital/_Calibration"
    return ROOT + "/Hospital/Objects"


def cleanup_generated(folder, keep):
    """Supprime les matériaux et textures créés automatiquement par l'import glTF."""
    for path in eal.list_assets(folder, recursive=True, include_folder=False):
        obj_path = path.split(".")[0]
        if obj_path in keep:
            continue
        data = eal.find_asset_data(obj_path)
        cls = str(data.asset_class_path.asset_name) if hasattr(data, "asset_class_path") else str(data.asset_class)
        if cls in ("Material", "MaterialInstanceConstant", "Texture2D"):
            eal.delete_asset(obj_path)


def step_meshes():
    manifest = load_json("manifest.json")
    translucent = set(TRANSLUCENT_MATERIALS)
    if not translucent:
        mats = load_json("materials.json")["used"]
        for name, e in mats.items():
            d = e.get("def", {})
            if int(d.get("transparency", 0)) != 0 or d.get("shader") in ("blood.gdshader", "liquid.gdshader"):
                translucent.add(name)
    names = sorted(n for n in manifest["meshes"] if not n.startswith("SM_Calib_"))
    missing_slots = set()
    imported = 0
    start = time.time()
    with unreal.ScopedSlowTask(len(names), "Blackwood : import des maillages") as task:
        task.make_dialog(True)
        for fname in names:
            if task.should_cancel():
                break
            task.enter_progress_frame(1, fname)
            f = os.path.join(MESH_DIR, fname + ".glb")
            if not os.path.isfile(f):
                warn("Maillage absent : %s" % f)
                continue
            folder = mesh_folder(fname)
            mesh = import_file(f, folder, fname, want=unreal.StaticMesh)
            if not isinstance(mesh, unreal.StaticMesh):
                warn("Import refusé : %s" % fname)
                continue
            imported += 1
            has_translucent = False
            for i, sm in enumerate(mesh.get_editor_property("static_materials")):
                mi, key = material_for_slot(sm.get_editor_property("material_slot_name"))
                if mi is None:
                    missing_slots.add(key)
                    continue
                mesh.set_material(i, mi)
                has_translucent |= key in translucent
            if fname.startswith("SM_Collision_"):
                body = mesh.get_editor_property("body_setup")
                if body:
                    body.set_editor_property("collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
            elif USE_NANITE and not has_translucent and (fname.startswith("SM_Level_") or fname.startswith("SM_Prop_")
                                                          or fname.startswith("SM_Corpse_")):
                ns = mesh.get_editor_property("nanite_settings")
                ns.set_editor_property("enabled", True)
                mesh.set_editor_property("nanite_settings", ns)
            eal.save_loaded_asset(mesh)
    keep = set()
    for folder in (ROOT + "/Hospital", ROOT + "/Characters/Corpses"):
        cleanup_generated(folder, keep)
    save_folder(ROOT + "/Hospital")
    save_folder(ROOT + "/Characters")
    log("Maillages importés : %d / %d en %.0f s" % (imported, len(names), time.time() - start))
    if missing_slots:
        warn("Emplacements de matériau sans instance : %s" % ", ".join(sorted(missing_slots)[:20]))


# --------------------------------------------------------------------------------------
# 5. Audio, polices, zombie
# --------------------------------------------------------------------------------------

LOOPS = {"light_buzz", "heartbeat", "alarm", "phone_static", "phone_ring", "surgeon_breath", "metal_scrape"}


def sound_folder(name):
    first = name.split("_")[0]
    if name.startswith("music_"):
        return "Music"
    if name.startswith("amb_"):
        return "Ambience"
    if name.startswith("step_"):
        return "Footsteps"
    if first in ("baton", "gunshot", "magnum", "smg", "shotgun", "reload", "gun", "shell", "weapon", "swing", "whoosh"):
        return "Weapons"
    if first in ("hollow", "surgeon", "veilleur", "neonatal", "colossus", "zero", "sarah"):
        return "Creatures"
    if first in ("player", "breath", "heartbeat", "dodge", "spray", "death"):
        return "Player"
    if first in ("impact", "hit", "body", "object", "glass", "explosion", "electrocution"):
        return "Impacts"
    if first in ("door", "shutter"):
        return "Doors"
    if first in ("ui", "inventory", "pickup", "paper", "keypad", "tape"):
        return "UI"
    return "World"


def step_audio():
    src = os.path.join(GODOT_DIR, "audio")
    wav_dir = os.path.join(PROJECT_DIR, "SourceAssets", "Audio")
    n, failed = 0, []
    names = sorted(f[:-4] for f in os.listdir(src) if f.endswith(".ogg"))
    for name in names:
        dest = "%s/Audio/%s" % (ROOT, sound_folder(name))
        wav = os.path.join(wav_dir, name + ".wav")
        f = wav if os.path.isfile(wav) else os.path.join(src, name + ".ogg")
        snd = import_file(f, dest, name, want=unreal.SoundWave)
        if not isinstance(snd, unreal.SoundWave):
            failed.append(name)
            continue
        if name.startswith(("amb_", "music_")) or name in LOOPS:
            snd.set_editor_property("looping", True)
        eal.save_loaded_asset(snd)
        n += 1
    log("Sons importés : %d / %d" % (n, len(names)))
    if failed:
        warn("Sons non importés (%d) : si cette version d'Unreal refuse le .ogg, lancer "
             "Tools/GodotExport/convert_audio.py puis relancer l'étape audio." % len(failed))


def step_fonts():
    src = os.path.join(GODOT_DIR, "assets", "fonts")
    dest = ROOT + "/UI/Fonts"
    n = 0
    for f in sorted(os.listdir(src)):
        if f.endswith(".ttf"):
            if import_file(os.path.join(src, f), dest, "FF_" + f[:-4].split("-")[0]):
                n += 1
    save_folder(dest)
    log("Polices importées : %d (licences : blackwood/assets/fonts/LICENSE-*)" % n)


def step_zombie():
    f = os.path.join(GODOT_DIR, "assets", "models", "zombie", "zombie.glb")
    dest = ROOT + "/Enemies/Hollow"
    mesh = import_file(f, dest, "SK_Hollow", want=unreal.SkeletalMesh)
    if isinstance(mesh, unreal.SkeletalMesh):
        log("Modèle zombie importé : %s" % mesh.get_path_name())
    else:
        warn("Le zombie n'a pas été importé comme maillage squelettique (vérifier l'import glTF).")
    save_folder(dest)


# --------------------------------------------------------------------------------------
# 6. Données (Data Assets)
# --------------------------------------------------------------------------------------

KIND = {"weapon": "WEAPON", "ammo": "AMMO", "heal": "HEAL", "key": "KEY", "instant": "INSTANT", "tool": "TOOL"}
WEAPON_KIND = {"melee": "MELEE", "hitscan": "HITSCAN", "pellets": "PELLETS"}
# Changement de conception (MIGRATION_MATRIX.md §20) : la matraque est retirée
REMOVED = {"baton"}


def data_asset(cls, name, folder):
    ensure_dir(folder)
    path = asset_path(folder, name)
    obj = load(path)
    if obj is None:
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", cls)
        obj = asset_tools.create_asset(name, folder, cls, factory)
    return obj


def step_data():
    data = load_json("data.json")
    folder = ROOT + "/Data"
    items = []
    for iid, it in sorted(data["items"].items()):
        if iid in REMOVED:
            continue
        a = data_asset(unreal.BWItemDefinition, "DA_Item_" + iid, folder + "/Items")
        a.set_editor_property("item_id", iid)
        a.set_editor_property("display_name", unreal.Text(it.get("name", iid)))
        a.set_editor_property("kind", getattr(unreal.BWItemKind, KIND.get(it.get("kind", "key"), "KEY")))
        a.set_editor_property("max_stack", int(it.get("max_stack", 1)))
        a.set_editor_property("icon", it.get("icon", ""))
        a.set_editor_property("description", unreal.Text(it.get("desc", "")))
        a.set_editor_property("heal_amount", float(it.get("heal", 0.0)))
        items.append(a)
    weapons = []
    for wid in data["weapon_order"]:
        if wid in REMOVED:
            continue
        w = data["weapons"][wid]
        a = data_asset(unreal.BWWeaponDefinition, "DA_Weapon_" + wid, folder + "/Weapons")
        a.set_editor_property("weapon_id", wid)
        a.set_editor_property("display_name", unreal.Text(w.get("name", wid)))
        a.set_editor_property("short_name", unreal.Text(w.get("short", wid)))
        a.set_editor_property("kind", getattr(unreal.BWWeaponKind, WEAPON_KIND.get(w.get("kind", "hitscan"), "HITSCAN")))
        a.set_editor_property("ammo_item", w.get("ammo", ""))
        for prop, key, default in (("mag_size", "mag", 0), ("pellets", "pellets", 1)):
            a.set_editor_property(prop, int(w.get(key, default)))
        for prop, key, default in (("damage", "damage", 0.0), ("head_multiplier", "head_mult", 1.0), ("interval", "interval", 0.3),
                                   ("reload_time", "reload", 0.0), ("spread_aim", "spread_aim", 0.0), ("spread_hip", "spread_hip", 0.0),
                                   ("spread_growth", "spread_growth", 0.0), ("range", "range", 0.0), ("noise", "noise", 0.0),
                                   ("recoil", "recoil", 0.0), ("shake", "shake", 0.0), ("stagger", "stagger", 0.0),
                                   ("knockback", "knockback", 0.0), ("reach", "reach", 0.0), ("arc", "arc", 0.0)):
            a.set_editor_property(prop, float(w.get(key, default)))
        a.set_editor_property("reload_one_by_one", bool(w.get("reload_one", False)))
        a.set_editor_property("automatic", bool(w.get("auto", False)))
        a.set_editor_property("pierce", bool(w.get("pierce", False)))
        a.set_editor_property("description", unreal.Text(w.get("desc", "")))
        weapons.append(a)
    enemies = []
    stat_map = (("max_health", "max_hp"), ("walk_speed", "walk_speed"), ("chase_speed", "chase_speed"),
                ("turn_speed", "turn_speed"), ("attack_range", "attack_range"), ("attack_damage", "attack_damage"),
                ("attack_windup", "attack_windup"), ("attack_recovery", "attack_recovery"),
                ("hearing_scale", "hearing_scale"), ("vision_range", "vision_range"),
                ("vision_range_lit", "vision_range_lit"), ("proximity", "proximity"), ("lose_time", "lose_time"),
                ("search_time", "search_time"), ("give_up_distance", "give_up_distance"),
                ("patrol_wait", "patrol_wait"), ("stagger_chance", "stagger_chance"), ("body_radius", "body_radius"),
                ("body_height", "body_height"), ("wake_radius", "wake_radius"))
    for pid, st in sorted(data["enemies"].items()):
        a = data_asset(unreal.BWEnemyDefinition, "DA_Enemy_" + pid, folder + "/Enemies")
        a.set_editor_property("profile_id", pid)
        a.set_editor_property("godot_class", st.get("class", ""))
        for prop, key in stat_map:
            if key in st and st[key] is not None:
                a.set_editor_property(prop, float(st[key]))
        enemies.append(a)
    docs = []
    for did, dd in sorted(data["documents"].items()):
        a = data_asset(unreal.BWDocumentDefinition, "DA_Doc_" + did, folder + "/Documents")
        a.set_editor_property("doc_id", did)
        a.set_editor_property("title", unreal.Text(dd.get("title", did)))
        a.set_editor_property("style", dd.get("style", "typed"))
        a.set_editor_property("body", unreal.Text(dd.get("body", "")))
        docs.append(a)
    reg = data_asset(unreal.BWGameData, "DA_GameData", folder)
    reg.set_editor_property("items", items)
    reg.set_editor_property("weapons", weapons)
    reg.set_editor_property("enemies", enemies)
    reg.set_editor_property("documents", docs)
    reg.set_editor_property("objectives", [unreal.Text(t) for t in data["objectives"]])
    diffs = []
    countdowns = data.get("countdown", [300, 240, 200])
    for i, dd in enumerate(data["difficulty"]):
        s = unreal.BWDifficulty()
        s.set_editor_property("damage_taken", float(dd["damage_taken"]))
        s.set_editor_property("ammo", float(dd["ammo"]))
        s.set_editor_property("enemy_health", float(dd["enemy_hp"]))
        s.set_editor_property("countdown", float(countdowns[min(i, len(countdowns) - 1)]))
        diffs.append(s)
    reg.set_editor_property("difficulty", diffs)
    sounds = []
    for path in eal.list_assets(ROOT + "/Audio", recursive=True, include_folder=False):
        snd = eal.load_asset(path.split(".")[0])
        if isinstance(snd, unreal.SoundBase):
            sounds.append(snd)
    reg.set_editor_property("sounds", sounds)
    save_folder(folder)
    log("Données : %d objets, %d armes, %d profils d'ennemis, %d documents, %d objectifs, %d sons"
        % (len(items), len(weapons), len(enemies), len(docs), len(data["objectives"]), len(sounds)))


# --------------------------------------------------------------------------------------
# 7. Carte : décor, collisions, accessoires, objets, lumières, zones, déclencheurs, créatures
# --------------------------------------------------------------------------------------

MAP_PATH = ROOT + "/Maps/L_BlackwoodHospital"


def mesh_asset(fname):
    return load(asset_path(mesh_folder(fname), fname)) if fname else None


def open_clean_map():
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    ensure_dir(ROOT + "/Maps")
    if eal.does_asset_exist(MAP_PATH):
        les.load_level(MAP_PATH)
        for actor in eas.get_all_level_actors():
            if isinstance(actor, (unreal.WorldSettings, unreal.Brush)) and not isinstance(actor, unreal.Volume):
                continue
            eas.destroy_actor(actor)
    else:
        les.new_level(MAP_PATH)


def static_actor(mesh, label, folder, transform=None, collision=False, visible=True, cast_shadow=True):
    actor = spawn(unreal.StaticMeshActor, transform, label, folder)
    if actor is None:
        return None
    comp = actor.get_editor_property("static_mesh_component")
    comp.set_static_mesh(mesh)
    comp.set_mobility(unreal.ComponentMobility.STATIC)
    comp.set_collision_profile_name("BlockAll" if collision else "NoCollision")
    comp.set_can_ever_affect_navigation(collision)
    comp.set_cast_shadow(cast_shadow)
    if not visible:
        comp.set_visibility(False)
    return actor


def make_boxes(shapes):
    boxes = []
    for sh in shapes:
        if sh.get("type") != "BoxShape3D" or "size" not in sh:
            continue
        b = unreal.BWCollisionBox()
        b.set_editor_property("local", ue_transform(sh["xf"]))
        b.set_editor_property("extent", ue_extent(sh["size"]))
        boxes.append(b)
    return boxes


def build_objects(level):
    counts = {}
    for ob in level["objects"]:
        cls = ob["class"]
        counts[cls] = counts.get(cls, 0) + 1
        is_light = cls == "LightFixture"
        actor = spawn(unreal.BWLightFixture if is_light else unreal.BWPlacedObject, ue_transform(ob["xf"]),
                      "%s_%s" % (cls, ob.get("id", "")), "Objets/%s" % cls)
        if actor is None:
            continue
        parts = []
        for p in ob["parts"]:
            part = unreal.BWPlacedPart()
            part.set_editor_property("name", p["name"])
            mesh = mesh_asset(p.get("mesh", ""))
            if mesh:
                part.set_editor_property("mesh", mesh)
            part.set_editor_property("local", ue_transform(p["local"]))
            part.set_editor_property("mover", p["name"].startswith("mover"))
            part.set_editor_property("boxes", make_boxes(p.get("shapes", [])))
            parts.append(part)
        actor.set_editor_property("godot_class", cls)
        actor.set_editor_property("object_id", ob.get("id", ""))
        actor.set_editor_property("zone", ob.get("zone", ""))
        actor.set_editor_property("properties_json", json.dumps(ob.get("props", {}), ensure_ascii=False, sort_keys=True))
        if is_light:
            li = ob.get("light", {})
            c = li.get("color", [1, 1, 1, 1])
            actor.set_editor_property("spot", li.get("type") == "spot")
            actor.set_editor_property("color", unreal.LinearColor(c[0], c[1], c[2], 1.0))
            actor.set_editor_property("energy", float(li.get("base_energy", li.get("energy", 1.0))))
            actor.set_editor_property("range", float(li.get("range", 7.0)) * 100.0)
            actor.set_editor_property("attenuation", float(li.get("attenuation", 1.0)))
            actor.set_editor_property("spot_angle", float(li.get("spot_angle", 45.0)))
            local = ue_transform(li["local"]) if "local" in li else unreal.Transform()
            if li.get("type") == "spot" and "direction" in li:
                # Le projecteur Unreal éclaire vers son axe +X : rotation relative = A^T × W
                A = ue_rotation_matrix(ob["xf"])
                W = look_matrix(g2u_dir(li["direction"]))
                At = [[A[j][i] for j in range(3)] for i in range(3)]
                q = quat_from_matrix(mat_mul(At, W))
                local.rotation = unreal.Quat(q[0], q[1], q[2], q[3])
            actor.set_editor_property("light_local", local)
            actor.set_editor_property("cast_shadows", bool(li.get("shadow", False)))
            actor.set_editor_property("fog_scattering", float(li.get("fog_energy", 0.0)))
            mode = ["STEADY", "FLICKER", "BROKEN", "PULSE", "OFF"][max(0, min(4, int(li.get("mode", 0))))]
            actor.set_editor_property("mode", getattr(unreal.BWLightMode, mode))
            actor.set_editor_property("grid_powered", bool(li.get("grid_power", False)))
            actor.set_editor_property("powered", bool(li.get("power", True)))
            actor.set_editor_property("emissive_energy", float(li.get("emissive_energy", 4.0)))
            actor.set_editor_property("buzz", bool(li.get("buzz", False)))
            actor.set_editor_property("rotate_speed", float(li.get("rotate_speed", 0.0)))
        actor.set_editor_property("parts", parts)
        rerun(actor)
    return counts


def rerun(actor):
    try:
        actor.rerun_construction_scripts()
    except Exception:
        pass  # set_editor_property relance déjà la construction dans l'éditeur


def build_zones(level):
    n = 0
    for zid, z in level["zones"].items():
        ymin, ymax = float(z.get("ymin", -1.0)), float(z.get("ymax", 4.0))
        for i, r in enumerate(z.get("rects", [])):
            cx, cz = r["x"] + r["w"] / 2.0, r["y"] + r["h"] / 2.0
            t = unreal.Transform()
            c = g2u([cx, (ymin + ymax) / 2.0, cz])
            t.translation = unreal.Vector(c[0], c[1], c[2])
            actor = spawn(unreal.BWZoneVolume, t, "Zone_%s_%d" % (zid, i), "Zones")
            if actor is None:
                continue
            actor.get_editor_property("box").set_box_extent(ue_extent([r["w"], ymax - ymin, r["h"]]))
            actor.set_editor_property("zone_id", zid)
            actor.set_editor_property("display_name", unreal.Text(z.get("name", zid)))
            actor.set_editor_property("floor", int(z.get("floor", 0)))
            actor.set_editor_property("surface", z.get("surface", "concrete"))
            actor.set_editor_property("reverb", z.get("reverb", "room"))
            actor.set_editor_property("ambience", {k: float(v) for k, v in z.get("ambience", {}).items()})
            actor.set_editor_property("moon", bool(z.get("moon", False)))
            actor.set_editor_property("outdoor_lights", bool(z.get("outdoor_lights", False)))
            n += 1
    return n


def build_triggers(level):
    n = 0
    for name, tr in level["triggers"].items():
        for sh in tr.get("shapes", []):
            if "size" not in sh:
                continue
            o = tr["xf"]["origin"]
            so = sh["xf"]["origin"]
            t = unreal.Transform()
            c = g2u([o[0] + so[0], o[1] + so[1], o[2] + so[2]])
            t.translation = unreal.Vector(c[0], c[1], c[2])
            actor = spawn(unreal.BWTriggerVolume, t, "Trigger_" + name, "Declencheurs")
            if actor is None:
                continue
            actor.get_editor_property("box").set_box_extent(ue_extent(sh["size"]))
            props = tr.get("props", {})
            actor.set_editor_property("trigger_name", name)
            actor.set_editor_property("once", bool(props.get("once", True)))
            actor.set_editor_property("required_flag", props.get("required_flag", ""))
            n += 1
    return n


def yaw_rotator(godot_rot_y):
    """Orientation Godot (rotation Y, regard -Z) -> Rotator Unreal."""
    fwd = [-math.sin(godot_rot_y), 0.0, -math.cos(godot_rot_y)]
    d = g2u_dir(fwd)
    return unreal.Vector(d[0], d[1], d[2]).rotation()


def build_spawns(level):
    n = 0
    for sid, sp in level["spawns"].items():
        c = g2u(sp["pos"])
        t = unreal.Transform()
        t.translation = unreal.Vector(c[0], c[1], c[2] + 90.0)
        t.rotation = yaw_rotator(float(sp.get("rot", 0.0))).quaternion()
        actor = spawn(unreal.BWEnemySpawnPoint, t, "Spawn_" + sid, "Creatures")
        if actor is None:
            continue
        actor.set_editor_property("spawn_id", sid)
        actor.set_editor_property("enemy_type", sp.get("type", "hollow"))
        actor.set_editor_property("variant", sp.get("variant", ""))
        actor.set_editor_property("floor", int(sp.get("floor", 0)))
        actor.set_editor_property("dormant", bool(sp.get("dormant", False)))
        actor.set_editor_property("deep_sleep", bool(sp.get("deep_sleep", False)))
        actor.set_editor_property("passive", bool(sp.get("passive", False)))
        actor.set_editor_property("event_spawn", bool(sp.get("event", False)))
        actor.set_editor_property("spawn_flag", sp.get("flag", ""))
        actor.set_editor_property("patrol_points", [unreal.Vector(*g2u(p)) for p in sp.get("patrol", [])])
        extra = sp.get("vents", []) + ([sp["home"]] if "home" in sp else [])
        actor.set_editor_property("extra_points", [unreal.Vector(*g2u(p)) for p in extra])
        actor.set_editor_property("patrol_anchor", sp.get("patrol_anchor", ""))
        n += 1
    return n


def build_anchors(level):
    for name, pos in level["anchors"].items():
        positions = pos if (pos and isinstance(pos[0], list)) else [pos]
        for i, p in enumerate(positions):
            c = g2u(p)
            t = unreal.Transform()
            t.translation = unreal.Vector(c[0], c[1], c[2])
            actor = spawn(unreal.TargetPoint, t, "Anchor_%s%s" % (name, "_%d" % i if len(positions) > 1 else ""), "Reperes")
            if actor:
                actor.set_editor_property("tags", [name])
    # Départ des joueurs : repère Godot « player_start », regard vers l'hôpital
    start = level["anchors"].get("player_start", [0, 0, 0])
    face = [0.0 - start[0], 0.0, -6.0 - start[2]]
    for i, side in enumerate((0.0, 1.2)):
        d = g2u_dir([1, 0, 0])
        c = g2u([start[0], start[1], start[2]])
        t = unreal.Transform()
        t.translation = unreal.Vector(c[0] + d[0] * side * 100.0, c[1] + d[1] * side * 100.0, c[2] + d[2] * side * 100.0 + 95.0)
        dd = g2u_dir(face)
        t.rotation = unreal.Vector(dd[0], dd[1], dd[2]).rotation().quaternion()
        ps = spawn(unreal.PlayerStart, t, "PlayerStart_P%d" % (i + 1), "Reperes")
        if ps:
            ps.set_editor_property("player_start_tag", "P%d" % (i + 1))


def build_labels(level):
    n = 0
    M = axes_matrix()
    for lb in level["labels"]:
        B = basis_matrix(lb["xf"]["basis"])
        cols = [[B[i][j] for i in range(3)] for j in range(3)]  # axes locaux Godot (x, y, z) dans le monde
        def ue_axis(v):
            u = [sum(M[i][k] * v[k] for k in range(3)) for i in range(3)]
            nrm = math.sqrt(sum(c * c for c in u)) or 1.0
            return [c / nrm for c in u]
        right, up, front = ue_axis(cols[0]), ue_axis(cols[1]), ue_axis(cols[2])
        # TextRender : +X vers le lecteur, texte vers -Y, +Z en haut
        rot = [[front[i], -right[i], up[i]] for i in range(3)]
        q = quat_from_matrix(rot)
        c = g2u(lb["xf"]["origin"])
        t = unreal.Transform()
        t.translation = unreal.Vector(c[0], c[1], c[2])
        t.rotation = unreal.Quat(*q)
        actor = spawn(unreal.TextRenderActor, t, "Label", "Panneaux")
        if actor is None:
            continue
        comp = actor.get_editor_property("text_render")
        comp.set_text(unreal.Text(lb["text"]))
        comp.set_world_size(float(lb.get("height_m", 0.2)) * 100.0 * 0.8)
        col = lb.get("color", [1, 1, 1, 1])
        comp.set_text_render_color(unreal.Color(r=int(min(col[0], 1) * 255), g=int(min(col[1], 1) * 255),
                                                b=int(min(col[2], 1) * 255), a=255))
        comp.set_horizontal_alignment(unreal.HorizTextAligment.EHTA_CENTER)
        comp.set_vertical_alignment(unreal.VerticalTextAligment.EVRTA_TEXT_CENTER)
        n += 1
    return n


def build_environment(level):
    env = level.get("environment", {})
    moon = env.get("moon")
    if moon:
        d = g2u_dir(moon["direction"])
        t = unreal.Transform()
        t.rotation = unreal.Vector(d[0], d[1], d[2]).rotation().quaternion()
        light = spawn(unreal.DirectionalLight, t, "Lune", "Ambiance")
        comp = light.get_editor_property("light_component")
        c = moon["color"]
        comp.set_intensity(float(moon.get("energy", 0.32)) * 2.0)
        comp.set_light_color(unreal.LinearColor(c[0], c[1], c[2], 1.0))
        comp.set_cast_shadows(bool(moon.get("shadow", True)))
        comp.set_volumetric_scattering_intensity(float(moon.get("fog_energy", 1.0)))
        comp.set_mobility(unreal.ComponentMobility.MOVABLE)
    e = env.get("environment", {})
    sky = spawn(unreal.SkyLight, unreal.Transform(), "Ciel", "Ambiance")
    if sky:
        sc = sky.get_editor_property("light_component")
        sc.set_editor_property("real_time_capture", True)
        sc.set_mobility(unreal.ComponentMobility.MOVABLE)
        a = e.get("ambient_light_color", [0.32, 0.36, 0.48, 1])
        sc.set_light_color(unreal.LinearColor(a[0], a[1], a[2], 1.0))
        sc.set_intensity(max(float(e.get("ambient_light_energy", 0.1)) * 2.0, 0.05))
    fog = spawn(unreal.ExponentialHeightFog, unreal.Transform(), "Brouillard", "Ambiance")
    if fog:
        fc = fog.get_editor_property("component")
        fc.set_editor_property("fog_density", 0.02)
        fc.set_editor_property("enable_volumetric_fog", bool(e.get("volumetric_fog_enabled", True)))
        fc.set_editor_property("volumetric_fog_extinction_scale", 1.0 + float(e.get("volumetric_fog_density", 0.018)) * 20.0)
        alb = e.get("volumetric_fog_albedo", [0.75, 0.78, 0.85, 1])
        fc.set_editor_property("volumetric_fog_albedo", unreal.Color(r=int(alb[0] * 255), g=int(alb[1] * 255), b=int(alb[2] * 255), a=255))
    ppv = spawn(unreal.PostProcessVolume, unreal.Transform(), "PostProcess", "Ambiance")
    if ppv:
        ppv.set_editor_property("unbound", True)
        s = ppv.get_editor_property("settings")
        for key, value in (("auto_exposure_method", unreal.AutoExposureMethod.AEM_HISTOGRAM),
                           ("auto_exposure_min_brightness", -2.0), ("auto_exposure_max_brightness", 3.0),
                           ("auto_exposure_bias", -0.5), ("vignette_intensity", 0.55),
                           ("bloom_intensity", 0.6 if e.get("glow_enabled", True) else 0.0),
                           ("film_grain_intensity", 0.25), ("scene_fringe_intensity", 0.8)):
            try:
                s.set_editor_property("override_" + key, True)
                s.set_editor_property(key, value)
            except Exception as ex:
                warn("Post-traitement : %s non réglé (%s)" % (key, ex))
        ppv.set_editor_property("settings", s)


def build_nav_bounds(level):
    xs, ys, zs = [], [], []
    for z in level["zones"].values():
        for r in z.get("rects", []):
            for gx in (r["x"], r["x"] + r["w"]):
                for gz in (r["y"], r["y"] + r["h"]):
                    for gy in (float(z.get("ymin", -1)), float(z.get("ymax", 4))):
                        c = g2u([gx, gy, gz])
                        xs.append(c[0]); ys.append(c[1]); zs.append(c[2])
    if not xs:
        return
    t = unreal.Transform()
    t.translation = unreal.Vector((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2)
    t.scale3d = unreal.Vector((max(xs) - min(xs)) / 200.0 + 1, (max(ys) - min(ys)) / 200.0 + 1, (max(zs) - min(zs)) / 200.0 + 1)
    spawn(unreal.NavMeshBoundsVolume, t, "NavMeshBounds", "Navigation")


def step_level():
    level = load_json("level.json")
    open_clean_map()
    n_geo = 0
    for sg in level["static_geometry"]:
        mesh = mesh_asset(sg["mesh"])
        if mesh is None:
            warn("Maillage de décor absent : %s (étape « meshes » ?)" % sg["mesh"])
            continue
        if sg["kind"] == "collision":
            static_actor(mesh, sg["mesh"], "Decor/Collisions", collision=True, visible=False, cast_shadow=False)
        else:
            static_actor(mesh, sg["mesh"], "Decor/" + sg["part"], cast_shadow=bool(sg.get("cast_shadow", True)))
        n_geo += 1
    n_props = 0
    for pr in level["props"]:
        mesh = mesh_asset(pr["mesh"])
        if mesh is None:
            continue
        actor = spawn(unreal.BWPropInstances, unreal.Transform(), "Props_%s_%s" % (pr["template"], pr["zone"]),
                      "Accessoires/" + pr["part"])
        if actor is None:
            continue
        actor.set_editor_property("mesh", mesh)
        actor.set_editor_property("instance_transforms", [ue_transform(x) for x in pr["instances"]])
        actor.set_editor_property("cast_shadow", bool(pr.get("cast_shadow", True)))
        actor.set_editor_property("template", pr["template"])
        actor.set_editor_property("zone", pr["zone"])
        rerun(actor)
        n_props += len(pr["instances"])
    counts = build_objects(level)
    n_corpses = 0
    for c in level["corpses"]:
        mesh = mesh_asset(c.get("mesh", ""))
        if mesh:
            static_actor(mesh, "Corpse_%02d" % n_corpses, "Cadavres", ue_transform(c["xf"]))
            n_corpses += 1
    n_zones = build_zones(level)
    n_trig = build_triggers(level)
    n_spawn = build_spawns(level)
    build_anchors(level)
    n_labels = build_labels(level)
    build_environment(level)
    build_nav_bounds(level)
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    les.save_current_level()
    log("Carte %s : %d pièces de décor, %d accessoires, objets %s, %d cadavres, %d zones, %d déclencheurs, "
        "%d créatures (points), %d panneaux" % (MAP_PATH, n_geo, n_props, counts, n_corpses, n_zones, n_trig, n_spawn, n_labels))


# --------------------------------------------------------------------------------------
# 8. Personnage provisoire (mannequin du contenu « Third Person » s'il est présent)
# --------------------------------------------------------------------------------------

MANNEQUIN_MESHES = ["/Game/Characters/Mannequins/Meshes/SKM_Manny_Simple", "/Game/Characters/Mannequins/Meshes/SKM_Manny",
                    "/Game/Characters/Mannequins/Meshes/SKM_Quinn_Simple", "/Game/Characters/Mannequins/Meshes/SKM_Quinn"]
MANNEQUIN_ANIMS = ["/Game/Characters/Mannequins/Anims/Unarmed/ABP_Unarmed", "/Game/Characters/Mannequins/Animations/ABP_Manny",
                   "/Game/Characters/Mannequins/Animations/ABP_Quinn"]


def step_player():
    mesh = next((p for p in MANNEQUIN_MESHES if eal.does_asset_exist(p)), None)
    anim = next((p for p in MANNEQUIN_ANIMS if eal.does_asset_exist(p)), None)
    if not mesh:
        warn("Mannequin absent : Content Drawer > Ajouter > « Add Feature or Content Pack » > Third Person, "
             "puis relancer l'étape « player » (sinon Thomas est invisible en 3e personne).")
        return
    name = mesh.rsplit("/", 1)[1]
    values = {"PlayerMesh": "%s.%s" % (mesh, name)}
    if anim:
        aname = anim.rsplit("/", 1)[1]
        values["PlayerAnimClass"] = "%s.%s_C" % (anim, aname)
    write_project_settings(values)
    log("Modèle provisoire du joueur : %s (%s) — Thomas définitif : MetaHuman ou modèle Fab (étape 19)"
        % (mesh, anim or "sans animation"))


# --------------------------------------------------------------------------------------

def main():
    t0 = time.time()
    log("Import Blackwood : projet %s ; Godot %s" % (PROJECT_DIR, GODOT_DIR))
    # Lancé au démarrage de l'éditeur (SetupAll.bat) : attendre la fin de l'inventaire des assets
    try:
        unreal.AssetRegistryHelpers.get_asset_registry().wait_for_completion()
    except Exception as e:
        warn("Inventaire des assets non attendu : %s" % e)
    for needed in (DATA_DIR, MESH_DIR, GODOT_DIR):
        if not os.path.isdir(needed):
            warn("Dossier introuvable : %s (voir README.md)" % needed)
    steps = {
        "calibration": step_calibration, "textures": step_textures, "materials": step_materials,
        "meshes": step_meshes, "audio": step_audio, "fonts": step_fonts, "zombie": step_zombie,
        "data": step_data, "level": step_level, "player": step_player,
    }
    for name in STEPS:
        log("--- Étape : %s" % name)
        try:
            steps[name]()
        except Exception as e:
            warn("Étape %s interrompue : %s" % (name, e))
            import traceback
            unreal.log_error(traceback.format_exc())
    try:
        unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    except Exception as e:
        warn("Enregistrement final incomplet : %s" % e)
    log("Terminé en %.0f s. Ensuite : Fichier > Tout enregistrer, puis Jouer (Alt+P)." % (time.time() - t0))
    out = os.path.join(PROJECT_DIR, "Saved", "Blackwood")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "import_report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(REPORT) + "\n")
    # Lancé par Scripts/SetupAll.bat : l'éditeur se ferme de lui-même à la fin
    if "-BWQuitAfterImport" in unreal.SystemLibrary.get_command_line():
        unreal.SystemLibrary.quit_editor()


main()

#!/usr/bin/env python3
"""Inventaire exhaustif des assets du projet Godot (lecture seule) -> ASSET_INVENTORY.md.

Usage : python3 BLACKWOOD_UNREAL/Tools/make_inventory.py
        (options : --godot <dossier du projet Godot>  --out <fichier .md>)

Le projet Godot n'est jamais modifié : le script ne fait que lire les fichiers.
Pour chaque asset : Nom, Type, Format, Licence/source, Destination Unreal, Statut.
Les références de licence viennent de blackwood/Documentation/ASSET_LICENSES.md et
blackwood/assets/textures/SOURCES.md (recopiées, jamais perdues).

Dépendance optionnelle : soundfile (durée des sons). Sans elle, la durée est omise.
"""
import argparse
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))

# Statuts possibles (colonne « Statut »)
ST_AUTO = "Non migré — import automatique prévu"
ST_CONVERT = "Non migré — conversion prévue"
ST_REBUILD = "Non migré — à reconstruire"
ST_REPLACE = "Non migré — remplacement recommandé"
ST_DROP = "Retiré de la conception (demande du 24/09)"

# --- Sons --------------------------------------------------------------------------

LOOPS = {"light_buzz", "heartbeat", "alarm", "phone_static", "phone_ring", "surgeon_breath", "metal_scrape"}

SOUND_GROUPS = [
    ("Musique", "Music", lambda n: n.startswith("music_")),
    ("Ambiance", "Ambience", lambda n: n.startswith("amb_")),
    ("Pas", "Footsteps", lambda n: n.startswith("step_")),
    ("Armes", "Weapons", lambda n: n.split("_")[0] in ("baton", "gunshot", "magnum", "smg", "shotgun", "reload", "gun", "shell", "weapon", "swing", "whoosh")),
    ("Créatures", "Creatures", lambda n: n.split("_")[0] in ("hollow", "surgeon", "veilleur", "neonatal", "colossus", "zero", "sarah")),
    ("Joueur", "Player", lambda n: n.split("_")[0] in ("player", "breath", "heartbeat", "dodge", "spray", "death")),
    ("Impacts / destructions", "Impacts", lambda n: n.split("_")[0] in ("impact", "hit", "body", "object", "glass", "explosion", "electrocution")),
    ("Portes", "Doors", lambda n: n.split("_")[0] in ("door", "shutter")),
    ("Interface", "UI", lambda n: n.split("_")[0] in ("ui", "inventory", "pickup", "paper", "keypad", "tape")),
    ("Environnement / mécanismes", "World", lambda n: True),
]


def sound_group(name):
    for label, folder, test in SOUND_GROUPS:
        if test(name):
            return label, folder
    return "Divers", "Misc"


# --- Lecture des registres de licences -------------------------------------------------

def read_poly_haven_sources(godot):
    """Dossier -> (nom Poly Haven, URL, auteurs) depuis assets/textures/SOURCES.md."""
    out = {}
    path = os.path.join(godot, "assets", "textures", "SOURCES.md")
    if not os.path.exists(path):
        return out
    row = re.compile(r"^\|\s*`([a-z_0-9]+)`\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|[^|]*\|\s*([^|]+)\|")
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = row.match(line)
            if m:
                out[m.group(1)] = (m.group(2).strip(), m.group(3).strip(), m.group(4).strip())
    return out


def read_font_licenses(godot):
    lic = {}
    path = os.path.join(godot, "Documentation", "ASSET_LICENSES.md")
    if not os.path.exists(path):
        return lic
    row = re.compile(r"^\|\s*([^|]+)\|\s*`assets/fonts/([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|")
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = row.match(line)
            if m:
                lic[m.group(2).strip()] = (m.group(3).strip(), m.group(4).strip(), m.group(5).strip())
    return lic


# --- Matériaux nommés (materials/materials.gd) ----------------------------------------

def read_named_materials(godot):
    path = os.path.join(godot, "materials", "materials.gd")
    textured, surfaces = {}, {}
    if not os.path.exists(path):
        return textured, surfaces
    section = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("const TEXTURED"):
                section = textured
                continue
            if line.startswith("const SURFACES"):
                section = surfaces
                continue
            if line.startswith("}"):
                section = None
                continue
            if section is None:
                continue
            m = re.match(r'^\t"([a-z_0-9]+)": \{(.*)\},?\s*$', line)
            if m:
                tex = re.search(r'"tex": "([a-z_0-9]+)"', m.group(2))
                section[m.group(1)] = tex.group(1) if tex else ""
    return textured, surfaces


def functions_of(path, prefix_skip="_"):
    out = []
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^(?:static )?func ([a-z_0-9]+)\(", line)
            if m and not m.group(1).startswith(prefix_skip):
                out.append(m.group(1))
    return out


# --- Tableau ---------------------------------------------------------------------

class Table:
    def __init__(self, title, intro=""):
        self.title = title
        self.intro = intro
        self.rows = []

    def add(self, name, kind, fmt, lic, dest, status):
        self.rows.append((name, kind, fmt, lic, dest, status))

    def render(self):
        lines = ["## %s (%d)" % (self.title, len(self.rows)), ""]
        if self.intro:
            lines += [self.intro, ""]
        lines.append("| Nom | Type | Format | Licence / source | Destination Unreal | Statut |")
        lines.append("| --- | --- | --- | --- | --- | --- |")
        for r in self.rows:
            lines.append("| " + " | ".join(str(c).replace("|", "\\|") for c in r) + " |")
        lines.append("")
        return "\n".join(lines)


def build(godot):
    tables = []
    ph = read_poly_haven_sources(godot)
    fonts_lic = read_font_licenses(godot)

    # 1. Modèles
    t = Table("Modèles 3D",
              "Un seul modèle est un fichier. Tout le reste (bâtiment, mobilier, véhicules, armes, objets, "
              "Thomas, Sarah) est **construit par le code** Godot : il n'existe pas de fichier à importer ; "
              "l'outil `Tools/GodotExport` peut en extraire une copie glTF (conversion), mais le rendu réaliste "
              "demandé passe par un remplacement (Fab / Quixel Megascans / Poly Haven / MetaHuman, licence vérifiée).")
    zdir = os.path.join(godot, "assets", "models", "zombie")
    if os.path.exists(os.path.join(zdir, "zombie.glb")):
        t.add("zombie.glb (infecté riggé, 16 941 sommets, 28 222 triangles, squelette 24 os)", "Skeletal Mesh", "glTF binaire (.glb)",
              "Généré avec Higgsfield (Tripo 3D + auto-rig), compte de l'utilisateur — CGU Higgsfield (usage personnel ; à revérifier avant diffusion commerciale)",
              "/Game/Blackwood/Enemies/Hollow/SK_Hollow (+ Skeleton, PhysicsAsset)", ST_AUTO)
    props = functions_of(os.path.join(godot, "scripts", "level", "props.gd"))
    hprops = functions_of(os.path.join(godot, "scripts", "level", "hospital", "hprops.gd"))
    for name in sorted(set(props + hprops) - {"wheel", "caster", "wall_lamp"}):
        t.add("Accessoire procédural « %s »" % name, "Static Mesh (procédural)", "code GDScript (props.gd / hprops.gd)",
              "Original (code du projet)", "/Game/Blackwood/Hospital/Props/SM_%s" % "".join(p.capitalize() for p in name.split("_")),
              ST_REPLACE if name in ("wheelchair", "ambulance", "car", "office_chair", "hospital_bed", "gurney", "iv_stand", "tree", "vending_machine", "sofa", "computer") else ST_CONVERT)
    for name in ("wheel", "caster", "wall_lamp"):
        t.add("Élément procédural « %s »" % name, "Static Mesh (procédural)", "code GDScript", "Original (code du projet)",
              "/Game/Blackwood/Hospital/Props/SM_%s" % "".join(p.capitalize() for p in name.split("_")), ST_CONVERT)
    for name, dest in (("Bâtiment : murs, sols, plafonds, escaliers, façades (818 707 sommets fusionnés)", "/Game/Blackwood/Hospital/Geometry/ (maillages par étage × zone × matériau)"),
                       ("Portes (72 : simples, doubles, vitrées, coupe-feu, blindées) + 3 portes automatiques", "/Game/Blackwood/Hospital/Doors/"),
                       ("Luminaires (néons, appliques, lampadaires)", "/Game/Blackwood/Hospital/Lighting/")):
        t.add(name, "Static Mesh (procédural)", "code GDScript (geo.gd, kit.gd, floor_*.gd)", "Original (code du projet)", dest, ST_CONVERT)
    for wid in ("baton", "pistol", "shotgun", "smg", "magnum"):
        t.add("Arme « %s » (modèle en main + vue 1re personne)" % wid, "Static/Skeletal Mesh (procédural)", "code GDScript (weapon_models.gd)",
              "Original (code du projet)", "/Game/Blackwood/Weapons/%s/" % wid.capitalize(),
              ST_DROP if wid == "baton" else ST_REPLACE)
    for iid in ("ammo_9mm", "ammo_shells", "ammo_magnum", "spray", "key (6 clés)", "fuse", "keycard (2 cartes)", "battery", "flashlight", "document", "folder"):
        t.add("Objet « %s »" % iid, "Static Mesh (procédural)", "code GDScript (item_models.gd)", "Original (code du projet)",
              "/Game/Blackwood/Items/Meshes/", ST_REPLACE)
    for who in ("Thomas Reed (joueur)", "Sarah Reed (boss)", "Patient Zéro, Chirurgien, Colossus, Veilleur, Néonatal (proportions et excroissances sur le modèle zombie)"):
        t.add(who, "Personnage (rig procédural HumanoidRig + SkinnedBody)", "code GDScript", "Original (code) + modèle Higgsfield",
              "/Game/Blackwood/Characters/ ou /Game/Blackwood/Enemies/", ST_REBUILD)
    tables.append(t)

    # 2. Textures
    t = Table("Textures",
              "Cartes 1K au format JPEG : albédo (sRGB), normale **OpenGL** (dans Unreal : *Flip Green Channel* obligatoire), "
              "ORM = occlusion (R) / rugosité (G) / métal (B), directement compatible avec les masques Unreal (sRGB désactivé).")
    tdir = os.path.join(godot, "assets", "textures")
    for folder in sorted(os.listdir(tdir)) if os.path.isdir(tdir) else []:
        fpath = os.path.join(tdir, folder)
        if not os.path.isdir(fpath):
            continue
        if folder in ph:
            asset, url, authors = ph[folder]
            lic = "Poly Haven « %s » (%s) — %s — CC0 1.0" % (asset, url, authors)
        elif folder == "ceiling_tile":
            lic = "Générée par blackwood/tools/gen_textures.py — originale (projet)"
        else:
            lic = "INCONNUE — à vérifier avant import"
        for fname in sorted(os.listdir(fpath)):
            if not fname.endswith(".jpg"):
                continue
            role = fname[:-4]
            suffix = {"albedo": "BaseColor", "normal": "Normal", "orm": "ORM"}.get(role, role)
            fmt = "JPEG 1024×1024" + (" (normale OpenGL)" if role == "normal" else "")
            t.add("%s/%s" % (folder, fname), "Texture %s" % suffix, fmt, lic,
                  "/Game/Blackwood/Textures/Surfaces/%s/T_%s_%s" % (folder, folder, suffix), ST_AUTO)
    for fname in ("albedo.jpg", "normal.jpg", "orm.jpg"):
        if os.path.exists(os.path.join(zdir, fname)):
            role = fname[:-4]
            suffix = {"albedo": "BaseColor", "normal": "Normal", "orm": "ORM"}[role]
            t.add("models/zombie/%s" % fname, "Texture %s (personnage)" % suffix, "JPEG 2048×2048" + (" (normale OpenGL)" if role == "normal" else ""),
                  "Higgsfield (voir modèle zombie.glb)", "/Game/Blackwood/Enemies/Hollow/Textures/T_Hollow_%s" % suffix, ST_AUTO)
    t.add("Reflet des objets à ramasser, gouttes de pluie", "Texture générée à l'exécution", "code GDScript", "Original (code du projet)",
          "/Game/Blackwood/VFX/Textures/", ST_REBUILD)
    t.add("icon.svg (icône du jeu)", "Image", "SVG", "Original (projet)", "Icône Windows du projet (Build/Windows/Application.ico)", ST_CONVERT)
    tables.append(t)

    # 3. Matériaux
    textured, surfaces = read_named_materials(godot)
    t = Table("Matériaux",
              "Aucun fichier de matériau (.tres) : les matériaux sont créés par le code (`materials/materials.gd`) "
              "à partir de 11 shaders. Dans Unreal : un Material maître par famille + une Material Instance par matériau nommé "
              "(paramètres recopiés automatiquement depuis l'export JSON).")
    shaders = {
        "pbr_surface": ("Surface PBR triplanaire en coordonnées monde (albédo/normale/ORM, teinte, saleté, bandeau mural, humidité)", "M_BW_WorldAligned (fonction WorldAlignedTexture)"),
        "surface": ("Surface procédurale sans texture (carrelage, bicolore, faux plafond, béton, métal, bois…)", "M_BW_Procedural"),
        "foliage": ("Feuillage découpé par bruit (alpha scissor)", "M_BW_Foliage (Masked, Two Sided Foliage)"),
        "blood": ("Taches de sang procédurales (décal quad)", "M_BW_BloodDecal (Deferred Decal)"),
        "flesh": ("Chair des créatures (veines, plaies humides)", "M_BW_Flesh (Subsurface)"),
        "liquid": ("Liquide de cuve (lueur, bulles)", "M_BW_TankLiquid (Translucent)"),
        "night_sky": ("Ciel nocturne, nuages, lune", "Sky Atmosphere + Volumetric Clouds (ou M_BW_NightSky)"),
        "screen": ("Écrans CRT : terminal, neige, CCTV, erreur, ECG", "M_BW_Screen (Emissive, 5 modes)"),
        "screen_fx": ("Post-traitement : grain, vignette, aberration, désaturation, voile rouge", "Post Process Volume + M_BW_PostFX (Post Process Material)"),
        "water": ("Flaques / sol inondé, arcs électriques", "M_BW_Water (ou Single Layer Water)"),
        "zombie_skin": ("Peau et vêtements des infectés, recoloration par variante", "M_BW_ZombieSkin + MI par variante"),
    }
    for name, (role, dest) in shaders.items():
        t.add("%s.gdshader — %s" % (name, role), "Shader Godot", "GLSL Godot (.gdshader)", "Original (projet)",
              "/Game/Blackwood/Materials/Master/%s" % dest, ST_REBUILD)
    for name, tex in sorted(textured.items()):
        t.add("Matériau « %s » (texture %s)" % (name, tex or "—"), "Matériau nommé (texturé)", "Dictionnaire GDScript",
              "Original (projet) sur textures Poly Haven CC0", "/Game/Blackwood/Materials/Surfaces/MI_%s" % name, ST_CONVERT)
    for name in sorted(set(surfaces) - set(textured)):
        t.add("Matériau « %s » (procédural)" % name, "Matériau nommé (procédural)", "Dictionnaire GDScript", "Original (projet)",
              "/Game/Blackwood/Materials/Surfaces/MI_%s" % name, ST_CONVERT)
    tables.append(t)

    # 4. Animations
    t = Table("Animations",
              "Le projet Godot ne contient **aucun clip d'animation** : marche, course, attaques, poses et morts sont calculées "
              "chaque image par `player/humanoid_rig.gd` (squelette procédural) puis recopiées sur le squelette du modèle zombie "
              "(`enemies/skinned_body.gd`). Rien n'est transférable tel quel : il faut des animations Unreal (Animation Blueprint).")
    for name, dest in (("Locomotion joueur (marche, course, visée, esquive, recul d'arme, rechargement)", "/Game/Blackwood/Animations/Player/ (ABP_Thomas)"),
                       ("Locomotion infectés (traîne-pieds, charge, attaque, trébuchement, mort, réveil)", "/Game/Blackwood/Animations/Hollow/ (ABP_Hollow)"),
                       ("Boss et monstres (lame/charge du Chirurgien, bond, cri, rampement du Néonatal, coups du Colossus)", "/Game/Blackwood/Animations/Bosses/"),
                       ("Poses de cadavres (dos, face, assis, recroquevillé, flottant)", "/Game/Blackwood/Animations/Poses/"),
                       ("Animations d'objets (portes, ascenseurs, coffres, casiers, rideaux) — interpolations Tween", "Timelines / composants C++ des acteurs")):
        t.add(name, "Animation procédurale", "code GDScript", "Original (projet)", dest, ST_REBUILD)
    tables.append(t)

    # 5. Sons et musiques
    t = Table("Sons, ambiances et musiques",
              "153 fichiers Ogg Vorbis mono 44,1 kHz, tous **synthétisés** par `blackwood/tools/gen_audio.py` (aucun échantillon externe). "
              "Unreal 5.8 importe directement le .ogg (sinon : conversion WAV 16 bits par `Tools/GodotExport/convert_audio.py`). "
              "Les variantes `nom_1…nom_4` deviennent un Sound Cue aléatoire (ou MetaSound).")
    adir = os.path.join(godot, "audio")
    try:
        import soundfile  # noqa: F401
        have_sf = True
    except Exception:
        have_sf = False
    for fname in sorted(os.listdir(adir)) if os.path.isdir(adir) else []:
        if not fname.endswith(".ogg"):
            continue
        name = fname[:-4]
        label, folder = sound_group(name)
        dur = ""
        if have_sf:
            import soundfile
            try:
                dur = " — %.2f s" % soundfile.info(os.path.join(adir, fname)).duration
            except Exception:
                dur = ""
        loop = name.startswith(("amb_", "music_")) or name in LOOPS
        kind = ("Musique" if name.startswith("music_") else "Son") + (" en boucle" if loop else "")
        t.add(fname, "%s (%s)" % (kind, label), "Ogg Vorbis mono 44,1 kHz" + dur,
              "Synthèse originale (blackwood/tools/gen_audio.py)", "/Game/Blackwood/Audio/%s/%s" % (folder, name), ST_AUTO)
    tables.append(t)

    # 6. Effets visuels
    t = Table("Effets visuels (VFX)",
              "Effets construits par le code (`scripts/game/fx.gd`, `scripts/game/game.gd`, `event_director.gd`) : à recréer en Niagara.")
    for name in ("impact (étincelles + poussière)", "blood (gerbe de sang)", "sparks", "dust", "bullet_hole (décal)", "blood_decal (décal au sol)",
                 "flash de bouche (armes)", "pluie extérieure (particules)", "éclairs d'orage", "boule de feu / explosion (bouteilles d'O2, fin)",
                 "éclats de verre (vitres brisées)", "brouillard volumétrique par zone"):
        t.add(name, "VFX", "code GDScript (GPUParticles3D / Decal / FogVolume)", "Original (projet)", "/Game/Blackwood/VFX/NS_… (Niagara) ou Decal", ST_REBUILD)
    tables.append(t)

    # 7. Interface et images
    t = Table("Interface (UI), polices et images",
              "Toute l'interface est construite par le code (`ui/*.gd`, thème `ui/ui_theme.gd`) : aucune image d'interface. "
              "Les icônes d'objets sont dessinées en vectoriel (`ui/item_icon.gd`).")
    fdir = os.path.join(godot, "assets", "fonts")
    for fname in sorted(os.listdir(fdir)) if os.path.isdir(fdir) else []:
        if fname.endswith(".ttf"):
            author, src, lic = fonts_lic.get(fname, ("?", "?", "INCONNUE"))
            t.add(fname, "Police", "TrueType (.ttf)", "%s — %s — %s (fichier de licence joint)" % (author, src, lic),
                  "/Game/Blackwood/UI/Fonts/F_%s (Font Face + Font)" % fname[:-4].split("-")[0], ST_AUTO)
        elif fname.startswith("LICENSE"):
            t.add(fname, "Licence de police", "Texte", "Licence à distribuer avec le jeu", "BLACKWOOD_UNREAL/Licenses/ (livré avec le jeu)", ST_AUTO)
    for name in ("HUD (ECG de santé, munitions, arme, batterie, réticule, objectif, partenaire coop)", "Menu principal", "Menu pause", "Options (graphismes, audio, contrôles, manette, jeu)",
                 "Inventaire (6 emplacements, porte-clés, documents, armes)", "Lecteur de documents", "Clavier à code", "Écran d'ascenseur", "Écran de sauvegarde",
                 "Écran de mort", "Écran de fin", "Menu coop (héberger, rejoindre, recherche LAN)", "Console de débogage", "Surimpression des performances",
                 "Icônes d'objets (20, vectorielles)", "Sous-titres, messages, invites d'interaction, cartes de titre, barre de boss, fondus"):
        t.add(name, "Écran / widget", "code GDScript (Control)", "Original (projet)", "/Game/Blackwood/UI/WBP_… (UMG)", ST_REBUILD)
    tables.append(t)

    # 8. Données
    t = Table("Données de jeu", "Tables GDScript exportées en JSON par `Tools/GodotExport` puis converties en Data Assets.")
    for name, dest in (("data/items.gd — 19 objets", "/Game/Blackwood/Data/Items/DA_Item_*"),
                       ("data/weapons.gd — 5 armes", "/Game/Blackwood/Data/Weapons/DA_Weapon_*"),
                       ("data/documents.gd — 22 documents", "/Game/Blackwood/Data/Documents/DA_Doc_*"),
                       ("data/objectives.gd — 26 objectifs (conditions)", "UBWObjectives (C++) + DT_Objectives"),
                       ("Ennemis (statistiques des 9 types / 5 variantes)", "/Game/Blackwood/Data/Enemies/DA_Enemy_*"),
                       ("Ascenseurs (3 : arrêts, règles d'accès)", "/Game/Blackwood/Data/Level/DA_Elevator_*"),
                       ("Zones (77 : ambiance, réverbération, surface, nom)", "/Game/Blackwood/Data/Level/DT_Zones"),
                       ("Niveau : portes, objets, déclencheurs, ennemis, lumières, repères", "/Game/Blackwood/Maps/L_BlackwoodHospital (acteurs placés)")):
        t.add(name, "Données", "GDScript (constantes)", "Original (projet)", dest, ST_CONVERT)
    tables.append(t)
    return tables


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--godot", default=os.path.join(ROOT, "blackwood"))
    ap.add_argument("--out", default=os.path.join(ROOT, "BLACKWOOD_UNREAL", "ASSET_INVENTORY.md"))
    args = ap.parse_args()
    if not os.path.exists(os.path.join(args.godot, "project.godot")):
        sys.exit("Projet Godot introuvable : %s" % args.godot)
    tables = build(args.godot)
    total = sum(len(t.rows) for t in tables)
    head = [
        "# ASSET_INVENTORY — Blackwood Hospital (Godot → Unreal Engine 5)",
        "",
        "Inventaire exhaustif généré par `BLACKWOOD_UNREAL/Tools/make_inventory.py` à partir du projet Godot "
        "(`blackwood/`, lecture seule). **%d entrées.** Les références de licence sont recopiées depuis "
        "`blackwood/Documentation/ASSET_LICENSES.md` et `blackwood/assets/textures/SOURCES.md`." % total,
        "",
        "Règle maintenue pour Unreal : aucun asset de licence inconnue, extrait d'un jeu, piraté ou issu d'une franchise. "
        "Tout nouvel asset (Fab, Quixel Megascans, Poly Haven, MetaHuman…) est ajouté ici **avant** son import, avec sa licence.",
        "",
        "Statuts : « import automatique » = fichier importable tel quel ; « conversion » = extraction ou transformation par script ; "
        "« à reconstruire » = recréé avec les outils Unreal ; « remplacement recommandé » = la version Godot est un modèle procédural "
        "trop simple, à remplacer par un modèle réaliste sous licence vérifiée.",
        "",
        "Sommaire : " + " · ".join("%s (%d)" % (t.title, len(t.rows)) for t in tables),
        "",
    ]
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(head) + "\n" + "\n".join(t.render() for t in tables))
    print("%s : %d entrées" % (args.out, total))


if __name__ == "__main__":
    main()

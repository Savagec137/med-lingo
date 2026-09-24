#!/usr/bin/env python3
"""Extraction Godot -> Unreal, sans jamais modifier le projet Godot.

1. copie le projet Godot (blackwood/) dans un dossier temporaire ;
2. y ajoute l'extracteur (exporter.gd / exporter.tscn) ;
3. importe les ressources puis lance l'extracteur avec Godot en mode headless ;
4. range le résultat :
     BLACKWOOD_UNREAL/SourceData/        JSON (données, niveau, matériaux, manifeste) — versionnés
     BLACKWOOD_UNREAL/SourceAssets/Meshes/  géométrie .glb — non versionnée (volumineuse)

Usage :
    python3 BLACKWOOD_UNREAL/Tools/GodotExport/export_godot.py [--godot CHEMIN] [--project DOSSIER] [--keep]

Godot 4.7 est cherché dans --godot, puis la variable GODOT, puis le PATH (godot, godot4),
puis /home/user/tools/godot.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
UE_ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
REPO = os.path.normpath(os.path.join(UE_ROOT, ".."))


def find_godot(explicit):
    cands = [explicit, os.environ.get("GODOT"), shutil.which("godot"), shutil.which("godot4"),
             "/home/user/tools/godot"]
    for c in cands:
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    sys.exit("Godot introuvable : passer --godot <chemin vers l'exécutable Godot 4.7>")


def copy_project(src, dst):
    def ignore(path, names):
        rel = os.path.relpath(path, src)
        skip = set()
        if rel == ".":
            skip |= {".godot", "build", "export", "android"}
        return [n for n in names if n in skip]
    shutil.copytree(src, dst, ignore=ignore)
    # Nom de projet distinct : dossier user:// séparé de celui du vrai jeu
    pg = os.path.join(dst, "project.godot")
    with open(pg, encoding="utf-8") as f:
        text = f.read()
    text = text.replace('config/name="Blackwood"', 'config/name="BlackwoodUnrealExport"')
    with open(pg, "w", encoding="utf-8") as f:
        f.write(text)
    tool_dir = os.path.join(dst, "_ue_export")
    os.makedirs(tool_dir)
    shutil.copy(os.path.join(HERE, "exporter.gd"), tool_dir)
    shutil.copy(os.path.join(HERE, "exporter.tscn"), tool_dir)


def run(cmd, timeout, log):
    print("  $", " ".join(cmd))
    with open(log, "a", encoding="utf-8") as lf:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout, text=True)
        lf.write(p.stdout)
    return p.returncode, p.stdout


def git_commit(path):
    try:
        return subprocess.run(["git", "-C", path, "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                              timeout=20).stdout.strip()
    except Exception:
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--godot")
    ap.add_argument("--project", default=os.path.join(REPO, "blackwood"))
    ap.add_argument("--keep", action="store_true", help="garder la copie temporaire du projet")
    args = ap.parse_args()
    project = os.path.abspath(args.project)
    if not os.path.isfile(os.path.join(project, "project.godot")):
        sys.exit("Projet Godot introuvable : %s" % project)
    godot = find_godot(args.godot)
    data_dir = os.path.join(UE_ROOT, "SourceData")
    mesh_dir = os.path.join(UE_ROOT, "SourceAssets", "Meshes")
    work = tempfile.mkdtemp(prefix="bw_export_")
    copy = os.path.join(work, "project")
    out = os.path.join(work, "out")
    log = os.path.join(work, "export.log")
    print("Copie du projet Godot vers", copy)
    copy_project(project, copy)
    print("Import des ressources (première ouverture de la copie)…")
    run([godot, "--headless", "--path", copy, "--import"], 1800, log)
    print("Extraction…")
    # Pas de mode --headless ici : le serveur de rendu factice de ce mode ne conserve pas les
    # transformations des MultiMesh (accessoires instanciés), qui sortiraient toutes à l'origine.
    cmd = [godot, "--path", copy, "--resolution", "320x180", "res://_ue_export/exporter.tscn", "--", "--out=" + out]
    if sys.platform.startswith("linux") and not os.environ.get("DISPLAY") and shutil.which("xvfb-run"):
        cmd = ["xvfb-run", "-a", "-s", "-screen 0 1280x720x24"] + cmd
    code, output = run(cmd, 1800, log)
    for line in output.splitlines():
        if line.startswith(("Niveau construit", "Objets exportés", "Export terminé", "  avertissement")) or "ERROR" in line:
            print("   ", line)
    if code != 0 or not os.path.isfile(os.path.join(out, "manifest.json")):
        sys.exit("Échec de l'extraction (code %s). Journal : %s" % (code, log))
    # Rangement
    os.makedirs(data_dir, exist_ok=True)
    for name in ("data.json", "level.json", "materials.json", "manifest.json"):
        shutil.copy(os.path.join(out, name), os.path.join(data_dir, name))
    manifest_path = os.path.join(data_dir, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest["source_project"] = os.path.relpath(project, REPO)
    manifest["source_commit"] = git_commit(project)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent="\t", sort_keys=True)
    if os.path.isdir(mesh_dir):
        shutil.rmtree(mesh_dir)
    shutil.copytree(os.path.join(out, "meshes"), mesh_dir)
    size = sum(os.path.getsize(os.path.join(mesh_dir, f)) for f in os.listdir(mesh_dir))
    print("Terminé : %d maillages (%.1f Mo) dans %s ; données dans %s" % (
        len(os.listdir(mesh_dir)), size / 1e6, mesh_dir, data_dir))
    if manifest.get("warnings"):
        print("%d avertissement(s) : voir SourceData/manifest.json" % len(manifest["warnings"]))
    if args.keep:
        print("Copie conservée :", work)
    else:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()

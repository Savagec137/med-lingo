#!/usr/bin/env python3
"""Textures PBR générées par programme (celles qu'on ne trouve pas en CC0).

Usage : python3 tools/gen_textures.py
Dépendances : numpy, scipy, pillow

  ceiling_tile : faux plafond acoustique (dalles 60 × 60 cm, ossature en T),
                 1024 px pour 1,2 m × 1,2 m. Cartes albédo, normale (OpenGL), ORM.
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")
rng = np.random.default_rng(2026)


def fbm(shape, scales=(64, 16, 4), amps=(1.0, 0.5, 0.25)):
    """Bruit fractal périodique (répétable sans couture)."""
    h, w = shape
    total = np.zeros(shape)
    for s, a in zip(scales, amps):
        small = rng.random((max(h // s, 2), max(w // s, 2)))
        # Répétition périodique : on ajoute la première ligne/colonne à la fin
        small = np.pad(small, ((0, 1), (0, 1)), mode="wrap")
        zoom = ndimage.zoom(small, (h / (small.shape[0] - 1), w / (small.shape[1] - 1)), order=3, mode="grid-wrap")
        total += zoom[:h, :w] * a
    total -= total.min()
    return total / max(total.max(), 1e-6)


def normal_from_height(hmap, strength):
    gy = ndimage.sobel(hmap, axis=0, mode="wrap")
    gx = ndimage.sobel(hmap, axis=1, mode="wrap")
    n = np.stack([-gx * strength, gy * strength, np.ones_like(hmap)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def save(name, albedo, normal, orm):
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    Image.fromarray((np.clip(albedo, 0, 1) * 255).astype(np.uint8)).save(os.path.join(d, "albedo.jpg"), quality=88)
    Image.fromarray(normal).save(os.path.join(d, "normal.jpg"), quality=92)
    Image.fromarray((np.clip(orm, 0, 1) * 255).astype(np.uint8)).save(os.path.join(d, "orm.jpg"), quality=88)
    print("écrit", d)


def ceiling_tile(res=1024, meters=1.2):
    ppm = res / meters
    tile = int(round(0.6 * ppm))
    bar = int(round(0.024 * ppm))
    yy, xx = np.mgrid[0:res, 0:res]
    # Distance au milieu de la barre la plus proche (grille périodique)
    dx = np.abs(((xx + bar / 2) % tile) - bar / 2)
    dy = np.abs(((yy + bar / 2) % tile) - bar / 2)
    d = np.minimum(dx, dy)
    on_bar = d < bar / 2
    # Hauteur : dalle en retrait avec chanfrein au contact de l'ossature
    edge = np.clip((d - bar / 2) / (0.012 * ppm), 0, 1)
    height = np.where(on_bar, 1.0, 0.6 - 0.25 * (1 - edge))
    # Microperforations et fissures de la dalle minérale
    holes = np.zeros((res, res))
    n_holes = int(res * res / 55)
    ys = rng.integers(0, res, n_holes)
    xs = rng.integers(0, res, n_holes)
    holes[ys, xs] = rng.uniform(0.4, 1.0, n_holes)
    holes = ndimage.grey_dilation(holes, size=(2, 2), mode="wrap")
    fiss = fbm((res, res), scales=(8, 3), amps=(1.0, 0.6))
    fiss = np.clip((fiss - 0.72) * 6, 0, 1)
    surface = fbm((res, res), scales=(128, 32, 8), amps=(1.0, 0.4, 0.3))
    height = height - np.where(on_bar, 0, holes * 0.18 + fiss * 0.08) + np.where(on_bar, 0, surface * 0.03)
    height = ndimage.gaussian_filter(height, 0.6, mode="wrap")

    base = np.where(on_bar, 0.74, 0.80) + (surface - 0.5) * 0.04
    base = base - np.where(on_bar, 0, holes * 0.28 + fiss * 0.12)
    albedo = np.stack([base * 1.0, base * 0.985, base * 0.95], -1)
    ao = np.clip(1.0 - np.where(on_bar, 0, (1 - edge) * 0.35 + holes * 0.5 + fiss * 0.25), 0, 1)
    rough = np.where(on_bar, 0.42, 0.92)
    metal = np.where(on_bar, 0.35, 0.0)
    orm = np.stack([ao, rough, metal], -1)
    save("ceiling_tile", albedo, normal_from_height(height, 6.0), orm)


if __name__ == "__main__":
    ceiling_tile()

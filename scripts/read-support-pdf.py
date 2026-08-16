"""Extraction de texte PDF en pur Python : zlib + opérateurs Tj/TJ.

Suffisant pour localiser une section et en lire le contenu. Aucune dépendance,
les bindings cryptography de l'environnement étant cassés.
"""
import re, sys, zlib

data = open(sys.argv[1], "rb").read()

# Table des objets : numéro -> contenu brut
objects = {}
for m in re.finditer(rb"(\d+)\s+0\s+obj(.*?)endobj", data, re.S):
    objects[int(m.group(1))] = m.group(2)

def inflate(raw):
    m = re.search(rb"stream\r?\n(.*?)\r?\nendstream", raw, re.S)
    if not m:
        return b""
    try:
        return zlib.decompress(m.group(1))
    except Exception:
        return b""

def text_of(stream):
    out = []
    # ( ... ) Tj   et   [ (..) -3 (..) ] TJ
    for m in re.finditer(rb"\((?:\\.|[^\\()])*\)", stream):
        s = m.group(0)[1:-1]
        s = re.sub(rb"\\([()\\])", rb"\1", s)
        s = re.sub(rb"\\(\d{1,3})", lambda g: bytes([int(g.group(1), 8) & 0xFF]), s)
        out.append(s)
    return b" ".join(out).decode("latin-1", "replace")

pages = []
for num, raw in sorted(objects.items()):
    if b"/Type" in raw and b"/Page" in raw and b"/Contents" in raw:
        refs = re.findall(rb"/Contents\s+(?:(\d+)\s+0\s+R|\[(.*?)\])", raw, re.S)
        ids = []
        for single, arr in refs:
            if single:
                ids.append(int(single))
            if arr:
                ids += [int(x) for x in re.findall(rb"(\d+)\s+0\s+R", arr)]
        body = "".join(text_of(inflate(objects.get(i, b""))) for i in ids)
        pages.append((num, body))

if len(sys.argv) > 2 and sys.argv[2] == "--grep":
    needle = sys.argv[3].lower()
    for i, (num, body) in enumerate(pages, start=1):
        if needle in body.lower():
            print(f"--- page ordre {i} (objet {num}) ---")
            print(body[:300].replace("\n", " "))
else:
    print(f"{len(pages)} pages extraites")
    for i, (num, body) in enumerate(pages[:3], start=1):
        print(f"--- {i} ---", body[:200])

#!/usr/bin/env python3
"""Secours pour les versions d'Unreal qui n'importent pas le .ogg : convertit les 153 sons
de blackwood/audio/*.ogg en WAV 16 bits dans BLACKWOOD_UNREAL/SourceAssets/Audio/.
Scripts/import_all.py utilise ces WAV en priorité s'ils existent.

Usage : python BLACKWOOD_UNREAL/Tools/GodotExport/convert_audio.py
Dépendance : pip install soundfile numpy
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
UE_ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
SRC = os.path.normpath(os.path.join(UE_ROOT, "..", "blackwood", "audio"))
DST = os.path.join(UE_ROOT, "SourceAssets", "Audio")


def main():
    try:
        import soundfile as sf
    except ImportError:
        sys.exit("Module manquant : pip install soundfile numpy")
    os.makedirs(DST, exist_ok=True)
    names = sorted(f for f in os.listdir(SRC) if f.endswith(".ogg"))
    for f in names:
        data, rate = sf.read(os.path.join(SRC, f), dtype="int16")
        sf.write(os.path.join(DST, f[:-4] + ".wav"), data, rate, subtype="PCM_16")
    print("%d sons convertis dans %s" % (len(names), DST))


if __name__ == "__main__":
    main()

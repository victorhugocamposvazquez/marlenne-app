#!/usr/bin/env python3
"""MP3 de Marlenne con Elvira (Edge, español de España). Sin clave."""
import asyncio
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CLIPS = json.loads((ROOT / "lib/voice-clips.json").read_text())
OUT = ROOT / "public/voice"
VOICE = "es-ES-ElviraNeural"
RATE = "+6%"
PITCH = "+8Hz"


def safari_mp3(path: Path) -> None:
    """Edge entrega 24 kHz MPEG-2; Safari no lo decodifica. 44.1 kHz sí."""
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return
    tmp = Path(tempfile.mkstemp(suffix='.mp3')[1])
    try:
        r = subprocess.run(
            [ffmpeg, '-y', '-i', str(path), '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', str(tmp)],
            check=False, capture_output=True,
        )
        if r.returncode == 0 and tmp.stat().st_size > 0:
            tmp.replace(path)
    finally:
        if tmp.exists() and tmp != path:
            tmp.unlink(missing_ok=True)


async def one(clip: dict) -> None:
    dest = OUT / f"{clip['id']}.mp3"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"{clip['id']}  (ya estaba)")
        return
    comm = edge_tts.Communicate(clip["text"], VOICE, rate=RATE, pitch=PITCH)
    await comm.save(str(dest))
    safari_mp3(dest)
    print(f"{clip['id']}  {dest.stat().st_size} bytes")


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        await one(clip)
    print(f"{len(CLIPS)} clips Elvira en public/voice")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""MP3 de Marlenne con Elvira (Edge, español de España). Sin clave."""
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CLIPS = json.loads((ROOT / "lib/voice-clips.json").read_text())
OUT = ROOT / "public/voice"
VOICE = "es-ES-ElviraNeural"
RATE = "+6%"
PITCH = "+8Hz"


async def one(clip: dict) -> None:
    dest = OUT / f"{clip['id']}.mp3"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"{clip['id']}  (ya estaba)")
        return
    comm = edge_tts.Communicate(clip["text"], VOICE, rate=RATE, pitch=PITCH)
    await comm.save(str(dest))
    print(f"{clip['id']}  {dest.stat().st_size} bytes")


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for clip in CLIPS:
        await one(clip)
    print(f"{len(CLIPS)} clips Elvira en public/voice")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""MP3 de Marlenne con Elvira (Edge, español de España). Sin clave."""
import asyncio
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CLIPS = json.loads((ROOT / "lib/voice-clips.json").read_text())
OUT = ROOT / "public/voice"
VOICE = "es-ES-ElviraNeural"
RATE = "+6%"
PITCH = "+8Hz"


def audio_sec(path: Path, ffmpeg: str) -> float:
    r = subprocess.run([ffmpeg, '-i', str(path), '-f', 'null', '-'], check=False, capture_output=True, text=True)
    for part in reversed((r.stderr or '').split()):
        if part.startswith('time='):
            h, m, s = part.split('=', 1)[1].split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


def encode_mp3(ffmpeg: str, src: Path, dest: Path, af: Optional[str] = None) -> bool:
    cmd = [ffmpeg, '-y', '-i', str(src)]
    if af:
        cmd += ['-af', af]
    cmd += ['-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', str(dest)]
    r = subprocess.run(cmd, check=False, capture_output=True)
    return r.returncode == 0 and dest.exists() and dest.stat().st_size > 0


def safari_mp3(path: Path, trim: bool = False) -> None:
    """Edge entrega 24 kHz MPEG-2; Safari no lo decodifica. 44.1 kHz sí."""
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return
    raw = Path(tempfile.mkstemp(suffix='.mp3')[1])
    cut = Path(tempfile.mkstemp(suffix='.mp3')[1])
    try:
        if not encode_mp3(ffmpeg, path, raw):
            return
        src = raw
        if trim and encode_mp3(
            ffmpeg, raw, cut,
            'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.02'
            ':stop_periods=1:stop_threshold=-58dB:stop_silence=0.1',
        ):
            full = audio_sec(raw, ffmpeg)
            short = audio_sec(cut, ffmpeg)
            if short >= 0.4 and (full <= 0 or short >= full * 0.35):
                src = cut
        dur = audio_sec(src, ffmpeg)
        if trim and dur > 1.3:
            end = dur - 0.72
            tail = Path(tempfile.mkstemp(suffix='.mp3')[1])
            if encode_mp3(
                ffmpeg, src, tail,
                f'atrim=0:{end:.3f},afade=t=out:st={max(0, end - 0.05):.3f}:d=0.05',
            ) and audio_sec(tail, ffmpeg) >= 0.4:
                tail.replace(path)
                return
            tail.unlink(missing_ok=True)
        src.replace(path)
    finally:
        raw.unlink(missing_ok=True)
        cut.unlink(missing_ok=True)


TRIM_IDS = {
    'la-guardo-para', 'guardo-cita-para', 'la-paso-a', 'nadie-libre-cuando',
    'hay-hueco', 'a-las', 'a-la', 'a-que-hora-para', 'tengo', 'huecos',
}


async def one(clip: dict) -> None:
    dest = OUT / f"{clip['id']}.mp3"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"{clip['id']}  (ya estaba)")
        return
    comm = edge_tts.Communicate(clip["text"], VOICE, rate=RATE, pitch=PITCH)
    await comm.save(str(dest))
    safari_mp3(dest, trim=bool(clip.get('trim')) or clip['id'] in TRIM_IDS)
    print(f"{clip['id']}  {dest.stat().st_size} bytes")


CLOCK_SPOKE = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once']
DAY_START = 9 * 60
DAY_END = 20 * 60

DAYS = [
    ('dia-hoy', 'hoy'),
    ('dia-manana', 'mañana'),
    ('dia-pasado-manana', 'pasado mañana'),
    ('dia-lunes', 'lunes'),
    ('dia-martes', 'martes'),
    ('dia-miercoles', 'miércoles'),
    ('dia-jueves', 'jueves'),
    ('dia-viernes', 'viernes'),
    ('dia-sabado', 'sábado'),
    ('dia-domingo', 'domingo'),
]


def spoken_clock(mins: int) -> str:
    h12 = (mins // 60) % 12 or 12
    m = mins % 60
    hour = CLOCK_SPOKE[h12 % 12]
    if m == 0:
        return hour
    if m == 15:
        return f'{hour} y cuarto'
    if m == 30:
        return f'{hour} y media'
    if m == 45:
        return f'{CLOCK_SPOKE[(h12 % 12 + 1) % 12]} menos cuarto'
    return f'{hour} {m}'


def extra_clips() -> list:
    hours = [
        {'id': f'hora-{m}', 'kind': 'say', 'text': spoken_clock(m), 'trim': True}
        for m in range(DAY_START, DAY_END + 1, 15)
    ]
    days = [{'id': i, 'kind': 'say', 'text': t, 'trim': True} for i, t in DAYS]
    return hours + days


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    clips = CLIPS + extra_clips()
    for clip in clips:
        await one(clip)
    print(f'{len(clips)} clips Elvira en public/voice')


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""MP3 de Marlenne con Elvira (Edge, español de España). Sin clave."""
import asyncio
import json
import re
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


def speech_bounds(path: Path, ffmpeg: str) -> Optional[tuple]:
    """Dónde empieza y acaba la voz de verdad (silencedetect). None si no se sabe."""
    dur = audio_sec(path, ffmpeg)
    if dur <= 0:
        return None
    r = subprocess.run(
        [ffmpeg, '-i', str(path), '-af', 'silencedetect=n=-45dB:d=0.12', '-f', 'null', '-'],
        check=False, capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    begin = 0.0
    if starts and starts[0] <= 0.05 and ends:
        begin = max(0.0, ends[0] - 0.04)
    end = dur
    if starts:
        last = starts[-1]
        # Silencio final: llega hasta el fin del fichero (ffmpeg cierra el silence_end en EOF, o no lo imprime).
        last_end = ends[-1] if len(ends) >= len(starts) else None
        if last > begin + 0.2 and (last_end is None or last_end >= dur - 0.08):
            end = min(dur, last + 0.06)
    if end - begin < 0.25:
        return None
    return begin, end


def safari_mp3(path: Path, trim: bool = False) -> None:
    """Edge entrega 24 kHz MPEG-2; Safari no lo decodifica. 44.1 kHz sí.
    Con trim, se corta justo donde acaba la voz para que los clips se puedan coser."""
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return
    raw = Path(tempfile.mkstemp(suffix='.mp3')[1])
    cut = Path(tempfile.mkstemp(suffix='.mp3')[1])
    try:
        if not encode_mp3(ffmpeg, path, raw):
            return
        if trim:
            bounds = speech_bounds(raw, ffmpeg)
            if bounds:
                begin, end = bounds
                fade = max(begin, end - 0.04)
                if encode_mp3(
                    ffmpeg, raw, cut,
                    f'atrim={begin:.3f}:{end:.3f},asetpts=PTS-STARTPTS,afade=t=out:st={fade:.3f}:d=0.04',
                ) and audio_sec(cut, ffmpeg) >= 0.25:
                    cut.replace(path)
                    return
        raw.replace(path)
    finally:
        raw.unlink(missing_ok=True)
        cut.unlink(missing_ok=True)


TRIM_IDS = {
    'la-guardo-para', 'guardo-cita-para', 'la-paso-a', 'nadie-libre-cuando',
    'hay-hueco', 'a-las', 'a-la', 'a-que-hora-para', 'tengo', 'huecos', 'o',
    'de-quince-minutos', 'de-media-hora', 'de-tres-cuartos', 'de-una-hora', 'de-hora-y-media',
    'de-dos-horas', 'de-tres-horas', 'con-cavitacion', 'gratuita',
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

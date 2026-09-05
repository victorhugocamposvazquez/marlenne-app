#!/usr/bin/env python3
"""Iconos PWA y pantallas de arranque a partir de brand/logo-source.jpg."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'brand' / 'logo-source.jpg'
PUBLIC = ROOT / 'public'

PINK = (255, 31, 91)
MAGENTA = (182, 33, 200)
BLUE = (45, 101, 255)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = min(1.0, max(0.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient_color(x: int, y: int, w: int, h: int) -> tuple[int, int, int]:
    t = (x / max(w - 1, 1) + y / max(h - 1, 1)) / 2
    if t < 0.48:
        return lerp(PINK, MAGENTA, t / 0.48)
    return lerp(MAGENTA, BLUE, (t - 0.48) / 0.52)


def make_gradient(w: int, h: int) -> Image.Image:
    s = 256
    im = Image.new('RGB', (s, s))
    px = im.load()
    for y in range(s):
        for x in range(s):
            px[x, y] = gradient_color(x, y, s, s)
    return im.resize((w, h), Image.Resampling.BICUBIC)


def flood_white_to_transparent(im: Image.Image, threshold: int = 248) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r >= threshold and g >= threshold and b >= threshold

    q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    seen: set[tuple[int, int]] = set()
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        if not is_bg(x, y):
            continue
        px[x, y] = (255, 255, 255, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format='PNG', optimize=True)


def fit_square(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def full_bleed_icon(mark: Image.Image, size: int) -> Image.Image:
    bg = make_gradient(size, size).convert('RGBA')
    layer = fit_square(mark, size)
    bg.alpha_composite(layer)
    return bg.convert('RGB')


def make_splash(w: int, h: int, mark: Image.Image, font: ImageFont.FreeTypeFont | ImageFont.ImageFont) -> Image.Image:
    canvas = make_gradient(w, h).convert('RGBA')
    side = int(min(w, h) * 0.26)
    badge = fit_square(mark, side)
    # Sombra suave bajo el badge
    shadow = Image.new('RGBA', (side + 48, side + 48), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((16, 20, side + 32, side + 36), radius=int(side * 0.22), fill=(20, 8, 40, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    sx = (w - shadow.width) // 2
    sy = int(h * 0.38) - shadow.height // 2
    canvas.alpha_composite(shadow, (sx, sy))
    bx = (w - side) // 2
    by = int(h * 0.38) - side // 2
    canvas.alpha_composite(badge, (bx, by))

    draw = ImageDraw.Draw(canvas)
    label = 'Marlenne'
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) / 2, by + side + int(h * 0.028)), label, font=font, fill=(255, 255, 255, 235))
    return canvas.convert('RGB')


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f'Falta {SRC}')

    raw = Image.open(SRC)
    mark = flood_white_to_transparent(raw)
    PUBLIC.mkdir(exist_ok=True)

    save_png(mark, PUBLIC / 'logo.png')
    save_png(full_bleed_icon(mark, 512), PUBLIC / 'icon-512.png')
    save_png(full_bleed_icon(mark, 192), PUBLIC / 'icon-192.png')
    save_png(full_bleed_icon(mark, 512), PUBLIC / 'icon-maskable-512.png')
    save_png(full_bleed_icon(mark, 180), PUBLIC / 'apple-touch-icon.png')

    ico = full_bleed_icon(mark, 32)
    ico.save(PUBLIC / 'favicon.ico', format='ICO', sizes=[(32, 32)])

    font_path = Path('/usr/share/fonts/truetype/macos/Inter-Bold.ttf')
    splashes = (
        ('splash-1290x2796.png', 1290, 2796, 92),
        ('splash-1179x2556.png', 1179, 2556, 84),
        ('splash-1170x2532.png', 1170, 2532, 82),
        ('splash-2048x2732.png', 2048, 2732, 110),
    )
    for name, w, h, pt in splashes:
        font = ImageFont.truetype(str(font_path), pt) if font_path.exists() else ImageFont.load_default()
        save_png(make_splash(w, h, mark, font), PUBLIC / name)
        print('wrote', name)

    print('ok', PUBLIC / 'logo.png')


if __name__ == '__main__':
    main()

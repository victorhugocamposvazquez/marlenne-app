#!/usr/bin/env python3
"""Iconos PWA y pantallas de arranque a partir de brand/logo-source.jpg."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

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


def _is_paper(r: int, g: int, b: int) -> bool:
    """Blanco del JPG y el halo sucio de la compresión, no el degradado."""
    y = 0.299 * r + 0.587 * g + 0.114 * b
    sat = max(r, g, b) - min(r, g, b)
    return y >= 228 and sat <= 40


def flood_paper(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    seen: set[tuple[int, int]] = set()
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if a == 0 or not _is_paper(r, g, b):
            continue
        px[x, y] = (255, 255, 255, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def _opaque_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    a = im.split()[-1]
    box = a.getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    return box


def _rounded_mask(size: tuple[int, int], box: tuple[int, int, int, int], radius: float, inset: int) -> Image.Image:
    """Máscara con borde suave: se dibuja a 4× y se baja, para no dejar dientes."""
    w, h = size
    scale = 4
    mask = Image.new('L', (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)
    x0, y0, x1, y1 = box
    x0 = (x0 + inset) * scale
    y0 = (y0 + inset) * scale
    x1 = (x1 - inset) * scale - 1
    y1 = (y1 - inset) * scale - 1
    draw.rounded_rectangle((x0, y0, x1, y1), radius=int(radius * scale), fill=255)
    return mask.resize((w, h), Image.Resampling.LANCZOS)


def isolate_mark(im: Image.Image) -> Image.Image:
    """Recorta el icono del JPG: quita el papel y aplica un squircle limpio."""
    mark = flood_paper(im)
    box = _opaque_bbox(mark)
    side = min(box[2] - box[0], box[3] - box[1])
    radius = side * 0.223
    mask = _rounded_mask(mark.size, box, radius, inset=6)
    out = mark.convert('RGBA')
    out.putalpha(ImageChops.multiply(out.split()[-1], mask))
    return _defringe(out)


def _defringe(im: Image.Image) -> Image.Image:
    """El borde AA hereda RGB sucio del JPG; se pinta con el color opaco vecino."""
    src = im.load()
    out = im.copy()
    dst = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a in (0, 255):
                continue
            found = None
            for rad in range(1, 6):
                for dy in range(-rad, rad + 1):
                    for dx in range(-rad, rad + 1):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h:
                            rr, gg, bb, aa = src[xx, yy]
                            if aa == 255:
                                found = (rr, gg, bb)
                                break
                    if found:
                        break
                if found:
                    break
            if found:
                dst[x, y] = (*found, a)
    return out


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
    canvas = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    side = int(min(w, h) * 0.26)
    badge = fit_square(mark, side)
    bx = (w - side) // 2
    by = int(h * 0.38) - side // 2
    canvas.alpha_composite(badge, (bx, by))

    draw = ImageDraw.Draw(canvas)
    label = 'Marlén'
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) / 2, by + side + int(h * 0.028)), label, font=font, fill=(30, 22, 48, 235))
    return canvas.convert('RGB')


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f'Falta {SRC}')

    raw = Image.open(SRC)
    mark = isolate_mark(raw)
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
        ('splash-w-1290x2796.png', 1290, 2796, 92),
        ('splash-w-1284x2778.png', 1284, 2778, 90),
        ('splash-w-1320x2868.png', 1320, 2868, 94),
        ('splash-w-1206x2622.png', 1206, 2622, 86),
        ('splash-w-1179x2556.png', 1179, 2556, 84),
        ('splash-w-1170x2532.png', 1170, 2532, 82),
        ('splash-w-1125x2436.png', 1125, 2436, 80),
        ('splash-w-1242x2688.png', 1242, 2688, 88),
        ('splash-w-828x1792.png', 828, 1792, 64),
        ('splash-w-750x1334.png', 750, 1334, 56),
        ('splash-w-2048x2732.png', 2048, 2732, 110),
    )
    for name, w, h, pt in splashes:
        font = ImageFont.truetype(str(font_path), pt) if font_path.exists() else ImageFont.load_default()
        save_png(make_splash(w, h, mark, font), PUBLIC / name)
        print('wrote', name)

    print('ok', PUBLIC / 'logo.png')


if __name__ == '__main__':
    main()

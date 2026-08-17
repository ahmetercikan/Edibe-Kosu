"""İkon üretim betiği — repo'yu ikili varlık olmadan self-contained tutmak için
PWA ikonlarını Pillow ile prosedürel olarak çizer. Tek seferlik bir araçtır;
tekrar üretmek isterseniz: `python tools/make_icons.py`
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "icons")
os.makedirs(OUT_DIR, exist_ok=True)

TOP = (42, 28, 92)      # #2a1c5c
BOTTOM = (255, 154, 108)  # #ff9a6c
GOLD = (255, 209, 102)   # #ffd166
GOLD_DARK = (201, 154, 59)
GLASS = (255, 236, 214, 235)


def gradient_bg(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(TOP[0] + (BOTTOM[0] - TOP[0]) * t)
        g = int(TOP[1] + (BOTTOM[1] - TOP[1]) * t)
        b = int(TOP[2] + (BOTTOM[2] - TOP[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def draw_bottle(base, scale=1.0):
    """Ortada duran, ışıldayan bir 'Sarıkız' şişesi silueti çizer."""
    size = base.size[0]
    cx, cy = size / 2, size / 2 + size * 0.03
    s = size * 0.34 * scale

    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([cx - s * 1.6, cy - s * 1.6, cx + s * 1.6, cy + s * 1.6],
                  fill=(255, 224, 138, 140))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.05))
    base.alpha_composite(glow)

    draw = ImageDraw.Draw(base)

    body_w = s * 0.78
    body_h = s * 1.55
    body_top = cy - body_h / 2
    body_bottom = cy + body_h / 2
    radius = body_w * 0.28
    draw.rounded_rectangle(
        [cx - body_w / 2, body_top, cx + body_w / 2, body_bottom],
        radius=radius, fill=GLASS, outline=(255, 255, 255, 255), width=max(2, int(size * 0.004))
    )

    neck_w = body_w * 0.36
    neck_h = s * 0.28
    draw.rectangle(
        [cx - neck_w / 2, body_top - neck_h, cx + neck_w / 2, body_top + 2],
        fill=GLASS
    )

    cap_w = neck_w * 1.35
    cap_h = s * 0.22
    cap_top = body_top - neck_h - cap_h + 4
    draw.rounded_rectangle(
        [cx - cap_w / 2, cap_top, cx + cap_w / 2, body_top - neck_h + 6],
        radius=cap_w * 0.25, fill=GOLD_DARK
    )

    label_h = body_h * 0.42
    label_top = cy - label_h / 2
    draw.rectangle(
        [cx - body_w / 2 + 2, label_top, cx + body_w / 2 - 2, label_top + label_h],
        fill=GOLD
    )

    hw = body_w * 0.16
    for i in range(3):
        yy = label_top + label_h * (0.22 + i * 0.28)
        draw.polygon([
            (cx, yy - hw), (cx + hw * 0.6, yy - hw * 0.2), (cx + hw, yy + hw * 0.1),
            (cx + hw * 0.35, yy + hw * 0.15), (cx, yy + hw), (cx - hw * 0.35, yy + hw * 0.15),
            (cx - hw, yy + hw * 0.1), (cx - hw * 0.6, yy - hw * 0.2),
        ], fill=GOLD_DARK)

    hi_w = body_w * 0.14
    draw.rounded_rectangle(
        [cx - body_w / 2 + body_w * 0.12, body_top + body_h * 0.08,
         cx - body_w / 2 + body_w * 0.12 + hi_w, body_bottom - body_h * 0.12],
        radius=hi_w / 2, fill=(255, 255, 255, 110)
    )

    return base


def make_icon(size, maskable=False, filename=None):
    bg = gradient_bg(size).convert("RGBA")
    scale = 0.72 if maskable else 1.0
    img = draw_bottle(bg, scale=scale)
    path = os.path.join(OUT_DIR, filename)
    img.convert("RGB").save(path, "PNG")
    print("written:", path)


make_icon(192, filename="icon-192.png")
make_icon(512, filename="icon-512.png")
make_icon(512, maskable=True, filename="maskable-512.png")
make_icon(180, filename="apple-touch-icon.png")
make_icon(32, filename="favicon-32.png")

#!/usr/bin/env python3
"""Draws the site's 32x32 icons as pixel art (PNG files in src/assets/img/icons/).

Run from the repository root:  python3 -I tools/make-icons.py
Each icon is composed from shapes with grey-scale gradients (light from the top left),
then given a black outline and a soft drop shadow, in the manner of Mac OS 9 icons.
They are drawn for this site as generic computer shapes and are not copies of any Apple icon.
"""
import sys

N = 32


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def lerp(c0, c1, t):
    a, b = hx(c0), hx(c1)
    t = max(0.0, min(1.0, t))
    return "#%02x%02x%02x" % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def hgrad(x0, x1, c0, c1):
    return lambda x, y: lerp(c0, c1, (x - x0) / max(1, x1 - x0))


def vgrad(y0, y1, c0, c1):
    return lambda x, y: lerp(c0, c1, (y - y0) / max(1, y1 - y0))


def dgrad(x0, y0, x1, y1, c0, c1):
    return lambda x, y: lerp(c0, c1, ((x - x0) + (y - y0)) / max(1, (x1 - x0) + (y1 - y0)))


class Icon:
    def __init__(self, n=N):
        self.n = n
        self.px = {}

    def put(self, x, y, fill):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.px[(x, y)] = fill(x, y) if callable(fill) else fill

    def rect(self, x, y, w, h, fill):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.put(i, j, fill)

    def poly(self, pts, fill):
        for j in range(self.n):
            for i in range(self.n):
                cx, cy, inside = i + 0.5, j + 0.5, False
                for k in range(len(pts)):
                    (x1, y1), (x2, y2) = pts[k], pts[(k + 1) % len(pts)]
                    if (y1 > cy) != (y2 > cy) and cx < (x2 - x1) * (cy - y1) / (y2 - y1) + x1:
                        inside = not inside
                if inside:
                    self.put(i, j, fill)

    def rrect(self, x, y, w, h, r, fill):
        for j in range(y, y + h):
            for i in range(x, x + w):
                dx = max(x + r - 0.5 - i, i - (x + w - 1 - r) - 0.5, 0)
                dy = max(y + r - 0.5 - j, j - (y + h - 1 - r) - 0.5, 0)
                if dx * dx + dy * dy <= r * r:
                    self.put(i, j, fill)

    def line(self, x0, y0, x1, y1, color):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.put(x0, y0, color)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def outline(self, color="#000000"):
        body = set(self.px)
        for (x, y) in body:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if (nx, ny) not in body:
                    self.put(nx, ny, color)

    def shadow(self, dx=2, dy=2):
        body = set(self.px)
        self.sh = {(x + dx, y + dy) for (x, y) in body if (x + dx, y + dy) not in body and 0 <= x + dx < self.n and 0 <= y + dy < self.n}


GLASS_LIGHT, GLASS_DARK = "#dcecff", "#4d73b0"


def glass(ic, x, y, w, h):
    """A blue screen with a dark rim and a soft glow in the top left corner."""
    ic.rect(x, y, w, h, "#1d2a3d")
    ic.rect(x + 1, y + 1, w - 2, h - 2, dgrad(x, y, x + w, y + h, GLASS_LIGHT, GLASS_DARK))
    ic.put(x + 1, y + 1, "#ffffff")
    ic.put(x + 2, y + 1, "#f2f8ff")
    ic.put(x + 1, y + 2, "#f2f8ff")


def build(kind):
    ic = Icon()
    if kind == "disk":
        ic.poly([(8, 8), (24, 8), (30, 14), (2, 14)], hgrad(2, 30, "#f0f0f0", "#8d8d8d"))
        ic.rect(2, 14, 28, 11, hgrad(2, 30, "#d6d6d6", "#5f5f5f"))
        ic.rect(2, 14, 28, 2, hgrad(2, 30, "#ffffff", "#b4b4b4"))
        ic.rect(2, 16, 28, 1, hgrad(2, 30, "#777777", "#3c3c3c"))
        ic.outline()
        ic.rect(5, 19, 2, 1, "#10b010")
        ic.rect(5, 20, 2, 1, "#d01010")
        ic.shadow()
    elif kind == "doc":
        ic.poly([(7, 2), (20, 2), (26, 8), (26, 29), (7, 29)], hgrad(7, 26, "#ffffff", "#c9c9c9"))
        ic.poly([(20, 2), (20, 8), (26, 8)], hgrad(20, 26, "#e4e4e4", "#9c9c9c"))
        ic.outline()
        ic.line(20, 3, 20, 8, "#000000")
        ic.line(21, 8, 26, 8, "#000000")
        for y, w in ((12, 12), (15, 12), (18, 12), (21, 12), (24, 7)):
            ic.rect(10, y, w, 1, "#2a2a2a")
        ic.shadow()
    elif kind == "laptop":
        ic.rect(6, 3, 20, 15, hgrad(6, 26, "#e2e2e2", "#8a8a8a"))
        ic.rect(6, 16, 20, 2, hgrad(6, 26, "#bcbcbc", "#5e5e5e"))
        glass(ic, 8, 5, 16, 10)
        ic.poly([(5, 18), (27, 18), (31, 26), (1, 26)], hgrad(1, 31, "#e8e8e8", "#8e8e8e"))
        ic.poly([(8, 19), (24, 19), (27, 23), (5, 23)], hgrad(5, 27, "#707070", "#3e3e3e"))
        for y in (20, 22):
            ic.line(8 if y == 20 else 6, y, 24 if y == 20 else 26, y, "#9a9a9a")
        ic.rect(1, 26, 30, 2, hgrad(1, 31, "#b0b0b0", "#585858"))
        ic.outline()
        ic.line(6, 18, 25, 18, "#2a2a2a")
        ic.rect(13, 24, 6, 1, "#6a6a6a")
        ic.shadow()
    elif kind == "imac":
        ic.rrect(4, 2, 24, 23, 7, dgrad(4, 2, 28, 25, "#c8f2f2", "#3f9aa4"))
        glass(ic, 8, 5, 16, 13)
        ic.rect(13, 21, 6, 1, "#2f6f78")
        ic.rect(12, 22, 8, 1, "#d8f8f8")
        ic.poly([(10, 25), (22, 25), (24, 29), (8, 29)], hgrad(8, 24, "#7fc4cc", "#2f7f88"))
        ic.outline()
        ic.line(8, 3, 14, 3, "#ffffff")
        ic.line(5, 8, 5, 13, "#ffffff")
        ic.shadow()
    elif kind == "compact":
        ic.rect(5, 3, 18, 23, hgrad(5, 23, "#e6e6e6", "#a2a2a2"))
        ic.poly([(23, 3), (27, 6), (27, 28), (23, 26)], hgrad(23, 27, "#7a7a7a", "#4a4a4a"))
        glass(ic, 8, 6, 12, 11)
        ic.rect(8, 21, 8, 1, "#262626")
        ic.rect(8, 22, 8, 1, "#ffffff")
        ic.rect(19, 21, 2, 2, "#8a8a8a")
        ic.poly([(3, 26), (23, 26), (27, 29), (7, 29)], hgrad(3, 27, "#b8b8b8", "#5a5a5a"))
        ic.outline()
        ic.line(23, 4, 23, 25, "#2a2a2a")
        ic.shadow()
    elif kind == "desktop":
        ic.rect(5, 2, 17, 14, hgrad(5, 22, "#e6e6e6", "#a0a0a0"))
        ic.poly([(22, 2), (26, 4), (26, 17), (22, 16)], hgrad(22, 26, "#7a7a7a", "#4c4c4c"))
        glass(ic, 7, 4, 13, 10)
        ic.rect(11, 16, 7, 2, hgrad(11, 18, "#b0b0b0", "#707070"))
        ic.rect(3, 18, 22, 9, hgrad(3, 25, "#e0e0e0", "#989898"))
        ic.poly([(25, 18), (29, 16), (29, 25), (25, 27)], hgrad(25, 29, "#7a7a7a", "#4c4c4c"))
        ic.rect(3, 18, 22, 1, "#ffffff")
        ic.rect(6, 22, 9, 1, "#262626")
        ic.rect(6, 23, 9, 1, "#ffffff")
        ic.outline()
        ic.line(22, 3, 22, 15, "#2a2a2a")
        ic.rect(20, 22, 2, 1, "#10b010")
        ic.shadow()
    elif kind == "cube":
        ic.poly([(5, 6), (10, 2), (27, 2), (22, 6)], hgrad(5, 27, "#ffffff", "#cdd8e4"))
        ic.rect(5, 6, 17, 20, dgrad(5, 6, 22, 26, "#f2f7fc", "#a3b6ca"))
        ic.poly([(22, 6), (27, 2), (27, 22), (22, 26)], hgrad(22, 27, "#8ea3b8", "#5d7088"))
        ic.rect(8, 9, 11, 13, dgrad(8, 9, 19, 22, "#6c7e98", "#262e3b"))
        ic.rect(8, 9, 11, 1, "#8fa2bd")
        ic.rect(8, 9, 1, 13, "#8fa2bd")
        ic.rect(7, 26, 14, 2, hgrad(7, 21, "#b8b8b8", "#6a6a6a"))
        ic.outline()
        ic.line(5, 6, 22, 6, "#2a2a2a")
        ic.line(22, 7, 22, 25, "#2a2a2a")
        ic.shadow()
    elif kind == "flatpanel":
        ic.rect(3, 4, 22, 17, hgrad(3, 25, "#ececec", "#a8a8a8"))
        ic.poly([(25, 4), (28, 6), (28, 21), (25, 21)], hgrad(25, 28, "#8a8a8a", "#555555"))
        glass(ic, 5, 6, 18, 13)
        ic.rect(12, 21, 5, 4, hgrad(12, 17, "#c0c0c0", "#707070"))
        ic.poly([(7, 25), (22, 25), (25, 28), (4, 28)], hgrad(4, 25, "#d0d0d0", "#707070"))
        ic.outline()
        ic.shadow()
    elif kind == "tower":
        ic.poly([(8, 6), (12, 3), (25, 3), (20, 6)], hgrad(8, 25, "#f4f4f4", "#bdbdbd"))
        ic.rect(8, 6, 12, 22, hgrad(8, 20, "#e4e4e4", "#a4a4a4"))
        ic.poly([(20, 6), (25, 3), (25, 25), (20, 28)], hgrad(20, 25, "#7c7c7c", "#4a4a4a"))
        ic.rect(10, 9, 8, 3, hgrad(10, 18, "#c4c4c4", "#8a8a8a"))
        ic.rect(11, 11, 6, 1, "#262626")
        ic.rect(10, 14, 8, 2, hgrad(10, 18, "#c4c4c4", "#8a8a8a"))
        ic.rect(11, 15, 6, 1, "#262626")
        for y in (18, 20, 22):
            ic.rect(10, y, 8, 1, "#8c8c8c")
        ic.rect(10, 24, 3, 3, hgrad(10, 13, "#bcc6da", "#7482a0"))
        ic.outline()
        ic.line(20, 7, 20, 27, "#2a2a2a")
        ic.rect(16, 25, 2, 1, "#10b010")
        ic.shadow()
    elif kind == "caution":
        ic.poly([(16, 2), (30, 28), (2, 28)], dgrad(2, 2, 30, 28, "#fff58a", "#d49e00"))
        ic.outline()
        ic.rect(15, 11, 2, 9, "#101010")
        ic.rect(15, 22, 2, 2, "#101010")
        ic.shadow()
    else:
        return build("compact")
    return ic


def menu_mac():
    """A tiny Macintosh with a rainbow-striped screen, 16 x 16, for the menu bar."""
    ic = Icon(16)
    ic.rect(3, 1, 10, 12, hgrad(3, 13, "#f0f0f0", "#a4a4a4"))
    ic.rect(2, 13, 12, 1, hgrad(2, 14, "#c8c8c8", "#6a6a6a"))
    ic.outline()
    for i, c in enumerate(("#61bb46", "#fdb827", "#f5821f", "#e03a3e", "#963d97", "#009ddc")):
        ic.rect(5, 3 + i, 6, 1, c)
    ic.rect(5, 11, 4, 1, "#262626")
    return ic


KINDS = ["compact", "desktop", "imac", "laptop", "cube", "flatpanel", "tower", "disk", "doc", "caution"]


def save_png(ic, path):
    from PIL import Image
    im = Image.new("RGBA", (ic.n, ic.n), (0, 0, 0, 0))
    for (x, y) in getattr(ic, "sh", set()):
        im.putpixel((x, y), (0, 0, 0, 82))
    for (x, y), c in ic.px.items():
        im.putpixel((x, y), hx(c) + (255,))
    im.save(path, optimize=True)


MACRO = """{#
  Pixel-art icons in the style of the Mac OS 9 desktop: a black outline, grey shading that
  is lit from the top left, and a soft drop shadow, drawn at 32 x 32 pixels.
  They are drawn for this site as generic computer shapes and are not copies of any Apple icon.
  The pictures are generated: edit tools/make-icons.py and run  python3 -I tools/make-icons.py
  Use: {% from "icons.njk" import icon %}{{ icon("compact", 64) }}
  Kinds: KINDS.
  Draw them at 32 or 64 pixels so every drawn pixel lands on a whole screen pixel.
#}
{% macro icon(kind, size) %}<img class="icon icon-{{ kind }}" src="{{ ('/assets/img/icons/' ~ kind ~ '.png') | url }}" width="{{ size or 32 }}" height="{{ size or 32 }}" alt="" decoding="async">{% endmacro %}
"""


def main():
    import os
    os.makedirs("src/assets/img/icons", exist_ok=True)
    for k in KINDS:
        save_png(build(k), "src/assets/img/icons/%s.png" % k)
    save_png(menu_mac(), "src/assets/img/icons/menu-mac.png")
    open("src/_includes/icons.njk", "w").write(MACRO.replace("KINDS", ", ".join(KINDS)))
    print("wrote", len(KINDS), "icons")


if __name__ == "__main__":
    main()

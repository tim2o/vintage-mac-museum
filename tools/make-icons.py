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


def lcd(ic, x, y, w, h):
    """A pale grey-green backlit LCD, as on the early portables."""
    ic.rect(x, y, w, h, "#2a2f26")
    ic.rect(x + 1, y + 1, w - 2, h - 2, dgrad(x, y, x + w, y + h, "#e2e8d6", "#98a48c"))
    ic.put(x + 1, y + 1, "#ffffff")


def keys(ic, pts_rows, color="#9a9a9a"):
    for (x0, x1, y) in pts_rows:
        ic.line(x0, y, x1, y, color)


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
    elif kind == "checklist":
        # A sheet of paper with three ticked boxes, for the Checklist window
        ic.poly([(6, 2), (26, 2), (26, 29), (6, 29)], hgrad(6, 26, "#ffffff", "#c9c9c9"))
        ic.outline()
        for y in (6, 14, 22):
            ic.rect(9, y, 6, 6, "#ffffff")
            ic.line(9, y, 14, y, "#000000")
            ic.line(9, y + 5, 14, y + 5, "#000000")
            ic.line(9, y, 9, y + 5, "#000000")
            ic.line(14, y, 14, y + 5, "#000000")
            ic.line(10, y + 2, 11, y + 4, "#118811")
            ic.line(11, y + 4, 14, y + 1, "#118811")
            ic.rect(17, y + 2, 6, 1, "#2a2a2a")
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
    elif kind == "laptop-small":
        ic.rect(7, 4, 18, 14, hgrad(7, 25, "#a4a4a4", "#4c4c4c"))
        ic.rect(7, 16, 18, 2, hgrad(7, 25, "#7a7a7a", "#363636"))
        lcd(ic, 10, 6, 12, 9)
        ic.poly([(5, 18), (26, 18), (29, 26), (2, 26)], hgrad(2, 29, "#8e8e8e", "#3c3c3c"))
        ic.poly([(8, 19), (23, 19), (25, 22), (6, 22)], hgrad(6, 25, "#5c5c5c", "#2a2a2a"))
        keys(ic, [(8, 23, 20), (7, 24, 21)], "#8a8a8a")
        ic.rect(2, 26, 28, 1, hgrad(2, 30, "#6a6a6a", "#2c2c2c"))
        ic.outline()
        ic.line(6, 18, 25, 18, "#1a1a1a")
        ic.rect(14, 24, 3, 2, hgrad(14, 17, "#d0d0d0", "#7a7a7a"))
        ic.shadow()
    elif kind == "laptop-dark":
        ic.rect(5, 3, 22, 16, hgrad(5, 27, "#b0b0b0", "#4e4e4e"))
        ic.rect(5, 17, 22, 2, hgrad(5, 27, "#808080", "#383838"))
        glass(ic, 8, 5, 16, 11)
        ic.poly([(3, 19), (28, 19), (31, 27), (0, 27)], hgrad(0, 31, "#929292", "#3a3a3a"))
        ic.poly([(7, 20), (24, 20), (27, 24), (4, 24)], hgrad(4, 27, "#5e5e5e", "#262626"))
        keys(ic, [(8, 23, 21), (6, 25, 23)], "#8c8c8c")
        ic.rect(0, 27, 31, 2, hgrad(0, 31, "#707070", "#2a2a2a"))
        ic.outline()
        ic.line(4, 19, 27, 19, "#1a1a1a")
        ic.rect(13, 25, 6, 1, "#6e6e6e")
        ic.shadow()
    elif kind == "laptop-round":
        ic.rrect(5, 3, 22, 16, 3, hgrad(5, 27, "#7c7c7c", "#2e2e2e"))
        glass(ic, 8, 6, 16, 10)
        ic.rrect(2, 19, 28, 9, 3, hgrad(2, 30, "#6a6a6a", "#242424"))
        ic.rect(6, 21, 20, 4, hgrad(6, 26, "#3a3a3a", "#161616"))
        keys(ic, [(7, 25, 22), (7, 25, 24)], "#7e7e7e")
        ic.outline()
        ic.line(6, 4, 24, 4, "#a8a8a8")
        ic.line(3, 20, 28, 20, "#9a9a9a")
        ic.rect(13, 26, 6, 1, "#8a8a8a")
        ic.shadow()
    elif kind == "laptop-silver":
        ic.rect(3, 5, 26, 13, hgrad(3, 29, "#f8f8f8", "#a4a4a4"))
        glass(ic, 5, 7, 22, 9)
        ic.poly([(2, 18), (30, 18), (31, 24), (1, 24)], hgrad(1, 31, "#f0f0f0", "#9a9a9a"))
        ic.rect(6, 19, 20, 3, hgrad(6, 26, "#d4d4d4", "#848484"))
        keys(ic, [(7, 25, 20), (7, 25, 21)], "#5e5e5e")
        ic.rect(1, 24, 30, 1, hgrad(1, 31, "#c0c0c0", "#6a6a6a"))
        ic.outline()
        ic.line(3, 18, 28, 18, "#3a3a3a")
        ic.shadow()
    elif kind == "ibook":
        ic.rrect(6, 3, 20, 14, 3, dgrad(6, 3, 26, 17, "#bfe6fa", "#3d86c4"))
        glass(ic, 9, 5, 14, 10)
        ic.rrect(3, 17, 26, 10, 4, dgrad(3, 17, 29, 27, "#f4f9fd", "#6ea6d4"))
        ic.rect(7, 19, 18, 4, hgrad(7, 25, "#dfe9f2", "#9ab4cc"))
        keys(ic, [(8, 24, 20), (8, 24, 22)], "#6a7e92")
        ic.outline()
        ic.line(7, 4, 22, 4, "#ffffff")
        ic.rect(13, 25, 6, 1, "#4f84b0")
        ic.shadow()
    elif kind == "emate":
        ic.rrect(7, 5, 18, 12, 2, dgrad(7, 5, 25, 17, "#9fe0cf", "#2b8a78"))
        lcd(ic, 10, 7, 12, 8)
        ic.rrect(11, 1, 10, 4, 1, hgrad(11, 21, "#8cd6c4", "#2b8a78"))
        ic.rrect(3, 17, 26, 9, 3, dgrad(3, 17, 29, 26, "#a8e4d4", "#2b8a78"))
        ic.rect(7, 19, 18, 4, hgrad(7, 25, "#7cc4b2", "#2f6f62"))
        keys(ic, [(8, 24, 20), (8, 24, 22)], "#d2f2ea")
        ic.outline()
        ic.shadow()
    elif kind == "crt":
        ic.rrect(4, 2, 22, 24, 3, hgrad(4, 26, "#e6e6e6", "#a0a0a0"))
        ic.poly([(26, 4), (29, 6), (29, 28), (26, 26)], hgrad(26, 29, "#7a7a7a", "#4a4a4a"))
        glass(ic, 7, 5, 16, 13)
        ic.rect(8, 21, 10, 1, "#262626")
        ic.rect(8, 22, 10, 1, "#ffffff")
        ic.rect(21, 21, 2, 2, "#8a8a8a")
        ic.poly([(3, 26), (26, 26), (29, 29), (6, 29)], hgrad(3, 29, "#b8b8b8", "#5a5a5a"))
        ic.outline()
        ic.line(26, 5, 26, 25, "#2a2a2a")
        ic.shadow()
    elif kind == "emac":
        ic.rrect(3, 2, 26, 21, 7, dgrad(3, 2, 29, 23, "#ffffff", "#bdbdbd"))
        glass(ic, 7, 5, 18, 14)
        for x in (9, 12, 15, 18, 21):
            ic.rect(x, 21, 2, 1, "#6a6a6a")
        ic.poly([(11, 23), (21, 23), (23, 27), (9, 27)], hgrad(9, 23, "#d0d0d0", "#7e7e7e"))
        ic.rrect(7, 27, 18, 3, 1, hgrad(7, 25, "#e0e0e0", "#808080"))
        ic.outline()
        ic.line(8, 3, 22, 3, "#ffffff")
        ic.shadow()
    elif kind == "imac-g4":
        ic.rrect(6, 22, 20, 8, 4, dgrad(6, 22, 26, 30, "#ffffff", "#9c9c9c"))
        ic.rect(14, 17, 4, 6, hgrad(14, 18, "#d8d8d8", "#7a7a7a"))
        ic.rrect(2, 2, 28, 17, 3, dgrad(2, 2, 30, 19, "#ffffff", "#bcbcbc"))
        glass(ic, 5, 5, 22, 12)
        ic.outline()
        ic.line(4, 3, 26, 3, "#ffffff")
        ic.shadow()
    elif kind == "mini":
        ic.rrect(3, 14, 26, 12, 4, hgrad(3, 29, "#dedede", "#8a8a8a"))
        ic.rrect(3, 8, 26, 13, 5, dgrad(3, 8, 29, 21, "#ffffff", "#c2c2c2"))
        ic.rect(8, 27, 16, 1, hgrad(8, 24, "#6a6a6a", "#2a2a2a"))
        ic.outline()
        ic.line(8, 10, 21, 10, "#ffffff")
        ic.line(5, 13, 5, 16, "#ffffff")
        ic.line(5, 21, 27, 21, "#7a7a7a")
        ic.rect(8, 23, 2, 1, "#2a2a2a")
        ic.rect(21, 23, 2, 1, "#4a4a4a")
        ic.rect(24, 23, 2, 1, "#4a4a4a")
        ic.rect(15, 24, 3, 1, "#7ac2ff")
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


def menu_mac(blue=False):
    """A tiny Macintosh with a rainbow-striped screen, 16 x 16, for the menu bar."""
    ic = Icon(16)
    ic.rect(3, 1, 10, 12, hgrad(3, 13, "#f0f0f0", "#a4a4a4"))
    ic.rect(2, 13, 12, 1, hgrad(2, 14, "#c8c8c8", "#6a6a6a"))
    ic.outline()
    if blue:
        ic.rect(5, 3, 6, 6, dgrad(5, 3, 11, 9, "#dcecff", "#4d73b0"))
    else:
        for i, c in enumerate(("#61bb46", "#fdb827", "#f5821f", "#e03a3e", "#963d97", "#009ddc")):
            ic.rect(5, 3 + i, 6, 1, c)
    ic.rect(5, 11, 4, 1, "#262626")
    return ic


def apple():
    """A plain fruit apple, 16 x 16, for the menu bar: black outline and flat colours."""
    ic = Icon(16)
    ic.rrect(1, 6, 14, 9, 4, "#e8372c")
    ic.rrect(1, 5, 7, 7, 3, "#e8372c")
    ic.rrect(8, 5, 7, 7, 3, "#e8372c")
    ic.rect(8, 2, 1, 3, "#7a4a22")
    ic.poly([(9, 2), (12, 1), (14, 2), (13, 3), (10, 3)], "#3fae3f")
    ic.outline()
    ic.rect(7, 4, 2, 1, "#000000")
    ic.rect(3, 7, 2, 1, "#ffffff")
    ic.rect(3, 8, 1, 2, "#ffffff")
    return ic


def trash_hd(path):
    """The Trash: a silver wire-mesh can with a lid, drawn smoothly (not as 32 x 32 pixel art) at 128 x 128, shown at 64.

    The can is nearly square, a little narrower at the bottom, with a domed lid and a knob. Drawn at four times the
    size and shrunk with a good filter so the edges are clean. Light comes from the top left: a bright band down the
    can, dark at the right edge, wires with a light edge beside each dark one, rings that curve round the can.
    """
    import numpy as np
    from PIL import Image, ImageFilter
    S, W = 4, 128
    n = W * S
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64) / S      # coordinates in 128-unit space
    cx = 64.0

    # The can
    B_TOP, B_BOT = 38.0, 108.0
    RX_T, RX_B = 40.0, 35.0
    RY_T, RY_B = 10.0, 8.5
    def rx(y): return RX_T + (RX_B - RX_T) * (y - B_TOP) / (B_BOT - B_TOP)
    def ry(y): return RY_T + (RY_B - RY_T) * (y - B_TOP) / (B_BOT - B_TOP)
    yc = np.clip(yy, B_TOP, B_BOT)
    half = rx(yc)
    u = (xx - (cx - half)) / (2 * half)                       # 0 at the left edge of the can, 1 at the right
    inside_x = (u >= 0) & (u <= 1)
    uu = np.clip(2 * u - 1, -1, 1)
    bottom_arc = B_BOT + RY_B * np.sqrt(1 - uu ** 2)
    body = inside_x & (yy >= B_TOP) & (yy <= bottom_arc)

    # The lid: a flat disc a little wider than the can, with a thick edge, and a knob on top
    L_Y, L_RX, L_RY, L_T = 31.0, 45.0, 10.0, 6.0
    lu = (xx - cx) / L_RX
    lroot = np.sqrt(np.clip(1 - lu ** 2, 0, 1))
    lid_top = lu ** 2 + ((yy - L_Y) / L_RY) ** 2 <= 1
    arc_top = L_Y + L_RY * lroot                              # the front edge of the lid's top face
    arc_low = arc_top + L_T                                   # the bottom of the lid's edge
    lid_band = (np.abs(lu) <= 1) & (yy >= L_Y) & (yy <= arc_low)
    lid = lid_top | lid_band
    K_Y, K_RX, K_RY, K_H = 17.0, 10.0, 3.2, 9.0
    ku = (xx - cx) / K_RX
    kroot = np.sqrt(np.clip(1 - ku ** 2, 0, 1))
    knob_top = ku ** 2 + ((yy - K_Y) / K_RY) ** 2 <= 1
    knob_base = K_Y + K_H + K_RY * kroot
    knob_body = (np.abs(ku) <= 1) & (yy >= K_Y) & (yy <= knob_base)
    knob = knob_top | knob_body
    sil = body | lid | knob

    def cyl(t, peak=0.27, width=0.30):
        """Light across a cylinder: t runs 0 (left edge) to 1 (right edge)."""
        v = 0.30 + 0.62 * np.exp(-((t - peak) / width) ** 2) + 0.10 * np.exp(-((t - 0.92) / 0.06) ** 2)
        return np.clip(v, 0, 1)

    # The can's metal
    g = 70 + 185 * cyl(u)
    rgb = np.stack([g, g, g + 7], axis=-1)
    for i in range(1, 9):  # vertical wires: a dark line with a light line just right of it
        xw = (cx - half) + 2 * half * (i / 9.0)
        d = xx - xw
        dark = np.clip(1 - np.abs(d) / 1.1, 0, 1)
        light = np.clip(1 - np.abs(d - 1.5) / 0.9, 0, 1)
        rgb = rgb * (1 - 0.55 * dark * body)[..., None]
        rgb = rgb + (255 - rgb) * (0.55 * light * body * (cyl(u) > 0.2))[..., None]
    for y0 in (56.0, 72.0, 88.0, 101.0):  # rings round the can, curving down at the front
        arc = y0 + ry(y0) * np.sqrt(1 - uu ** 2)
        dark = np.clip(1 - np.abs(yy - arc) / 1.2, 0, 1)
        light = np.clip(1 - np.abs(yy - arc - 1.7) / 0.9, 0, 1)
        rgb = rgb * (1 - 0.5 * dark * body)[..., None]
        rgb = rgb + (255 - rgb) * (0.45 * light * body)[..., None]
    base = body & (yy > bottom_arc - 7)                       # the darker ring at the bottom, with a light line above
    rgb = np.where(base[..., None], rgb * 0.72, rgb)
    edge = body & (np.abs(yy - (bottom_arc - 7)) < 0.8)
    rgb = np.where(edge[..., None], 255 - (255 - rgb) * 0.45, rgb)
    shade = np.clip((yy - arc_low) / 9.0, 0, 1)               # the shadow of the lid on the can just below it
    rgb = rgb * (0.5 + 0.5 * shade)[..., None] * body[..., None] + rgb * (~body)[..., None]

    # The lid's edge: silver with the same light across it
    ul = (xx - (cx - L_RX)) / (2 * L_RX)
    lg = 95 + 165 * cyl(ul, 0.30, 0.34)
    band_rgb = np.stack([lg, lg, lg + 6], axis=-1)
    rgb = np.where(lid_band[..., None], band_rgb, rgb)
    # Its top face: brighter, lightest at the back left, with a fine ring a little in from the edge
    tv = 0.72 + 0.28 * np.exp(-((xx - 48.0) / 24.0) ** 2) - 0.22 * np.clip((yy - (L_Y - L_RY)) / (2 * L_RY), 0, 1)
    tg = np.clip(125 + 135 * tv, 0, 255)
    top_rgb = np.stack([tg, tg, tg + 6], axis=-1)
    e2 = ((xx - cx) / 38.0) ** 2 + ((yy - L_Y) / 7.6) ** 2
    ring = np.clip(1 - np.abs(e2 - 1) / 0.07, 0, 1)
    top_rgb = top_rgb * (1 - 0.35 * ring)[..., None]
    ring_hi = np.clip(1 - np.abs(e2 - 0.86) / 0.06, 0, 1)
    top_rgb = top_rgb + (255 - top_rgb) * (0.5 * ring_hi)[..., None]
    rgb = np.where(lid_top[..., None], top_rgb, rgb)
    # The line where the top face meets the edge, and the bottom edge of the lid
    seam = lid_band & (np.abs(yy - arc_top) < 0.9)
    rgb = rgb * (1 - 0.45 * seam)[..., None]
    under = lid_band & (np.abs(yy - arc_low) < 1.1)
    rgb = rgb * (1 - 0.65 * under)[..., None]

    # The knob: a short cylinder with a bright top
    kg = 70 + 185 * cyl((ku + 1) / 2)
    knob_rgb = np.stack([kg, kg, kg + 7], axis=-1)
    rgb = np.where(knob_body[..., None], knob_rgb, rgb)
    ktv = 0.8 + 0.2 * np.exp(-((xx - 60.0) / 6.0) ** 2)
    kt = np.clip(150 + 105 * ktv, 0, 255)
    rgb = np.where(knob_top[..., None], np.stack([kt, kt, kt + 5], axis=-1), rgb)
    kbase = knob_body & (np.abs(yy - knob_base) < 0.9)
    rgb = rgb * (1 - 0.55 * kbase)[..., None]
    kring = knob & (np.abs(((xx - cx) / K_RX) ** 2 + ((yy - K_Y) / K_RY) ** 2 - 1) < 0.16) & (yy < K_Y + 1.5)
    rgb = rgb * (1 - 0.5 * kring)[..., None]

    # Black outline round everything
    mask_img = Image.fromarray((sil * 255).astype(np.uint8))
    grown = mask_img.filter(ImageFilter.MaxFilter(2 * int(1.7 * S) + 1))
    outline = np.array(grown) > 127

    out = np.zeros((n, n, 4), dtype=np.float64)
    sh = Image.fromarray(np.array(grown).astype(np.uint8)).transform((n, n), Image.AFFINE, (1, 0, -5 * S, 0, 1, -5 * S))
    sh = np.array(sh.filter(ImageFilter.GaussianBlur(2.6 * S))) / 255.0
    out[..., 3] = 0.34 * sh                                   # a soft drop shadow, to the lower right
    out[..., :3] = np.where(outline[..., None], 0, out[..., :3])
    out[..., 3] = np.where(outline, 1.0, out[..., 3])
    out[..., :3] = np.where(sil[..., None], np.clip(rgb, 0, 255), out[..., :3])
    out[..., 3] = np.where(sil, 1.0, out[..., 3])
    # Shrink with premultiplied colour, so the soft shadow stays clean at the edges
    pre = out.copy()
    pre[..., :3] *= pre[..., 3:4]
    chans = [Image.fromarray(np.clip(pre[..., i], 0, 255).astype(np.uint8)).resize((W, W), Image.LANCZOS) for i in range(3)]
    alpha = Image.fromarray(np.clip(out[..., 3] * 255, 0, 255).astype(np.uint8)).resize((W, W), Image.LANCZOS)
    a = np.array(alpha).astype(np.float64) / 255.0
    final = np.zeros((W, W, 4), dtype=np.uint8)
    for i, c in enumerate(chans):
        ci = np.array(c).astype(np.float64)
        final[..., i] = np.clip(np.where(a > 0, ci / np.maximum(a, 1e-6), 0), 0, 255).astype(np.uint8)
    final[..., 3] = np.array(alpha)
    Image.fromarray(final, "RGBA").save(path, optimize=True)


KINDS = ["laptop-small", "laptop-dark", "laptop-round", "laptop-silver", "ibook", "emate", "crt", "emac", "imac-g4", "mini", "compact", "desktop", "imac", "laptop", "cube", "flatpanel", "tower", "disk", "doc", "checklist", "caution"]


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
  Kinds: KINDS, and trash (a smoother 128 x 128 drawing, shown at 64).
  Draw them at 32 or 64 pixels so every drawn pixel lands on a whole screen pixel.
#}
{% macro icon(kind, size) %}<img class="icon icon-{{ kind }}" src="{{ ('/assets/img/icons/' ~ kind ~ '.png') | url }}" width="{{ size or 32 }}" height="{{ size or 32 }}" alt="" decoding="async">{% endmacro %}
"""


def main():
    import os
    os.makedirs("src/assets/img/icons", exist_ok=True)
    for k in KINDS:
        save_png(build(k), "src/assets/img/icons/%s.png" % k)
    trash_hd("src/assets/img/icons/trash.png")  # smooth, 128 x 128, shown at 64
    save_png(menu_mac(), "src/assets/img/icons/menu-mac.png")
    save_png(menu_mac(blue=True), "src/assets/img/icons/menu-finder.png")
    save_png(apple(), "src/assets/img/icons/menu-apple-flat.png")
    # Small 16 x 16 copies for the Application menu
    from PIL import Image
    for k in ("disk", "doc", "checklist", "laptop", "mini"):
        im = Image.open("src/assets/img/icons/%s.png" % k).convert("RGBA")
        im.resize((16, 16), Image.BOX).save("src/assets/img/icons/%s-16.png" % k, optimize=True)
    open("src/_includes/icons.njk", "w").write(MACRO.replace("KINDS", ", ".join(KINDS)))
    print("wrote", len(KINDS), "icons")


if __name__ == "__main__":
    main()

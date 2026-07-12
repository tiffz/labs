#!/usr/bin/env python3
"""Lyrefly feather logo recolor presets — generates gallery variant PNGs.

Source: public/icons/lyrefly-feather-source.png (stock Android emoji brown).
Output: public/icons/lyrefly-feather-variants/{preset-id}.png

Usage:
  python3 tools/lyrefly/feather_logo_presets.py
  python3 tools/lyrefly/feather_logo_presets.py --preset riso-flush
  python3 tools/lyrefly/recolor-feather-icon.py riso-flush   # apply one preset to main icon
"""

from __future__ import annotations

import argparse
import colorsys
import sys
from pathlib import Path
from typing import Callable

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE = REPO_ROOT / "public/icons/lyrefly-feather-source.png"
VARIANTS_DIR = REPO_ROOT / "public/icons/lyrefly-feather-variants"
MAIN_ICON = REPO_ROOT / "public/icons/lyrefly-feather.png"

# Riso Cube palette (DESIGN.md)
PINK = (255 / 255, 45 / 255, 149 / 255)
TEAL = (0 / 255, 212 / 255, 170 / 255)
SCARLET = (220 / 255, 38 / 255, 38 / 255)
YELLOW = (255 / 255, 212 / 255, 0 / 255)
CREAM = (255 / 255, 248 / 255, 252 / 255)
INK = (23 / 255, 23 / 255, 23 / 255)


def lerp3(a: tuple[float, float, float], b: tuple[float, float, float], t: float) -> tuple[float, float, float]:
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def luminance(r: int, g: int, b: int) -> float:
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0


def saturation(r: int, g: int, b: int) -> float:
    mx = max(r, g, b) / 255.0
    mn = min(r, g, b) / 255.0
    return (mx - mn) / mx if mx > 0 else 0.0


def rgb_to_hsv(r: int, g: int, b: int) -> tuple[float, float, float]:
    return colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)


def hsv_to_rgb(h: float, s: float, v: float) -> tuple[int, int, int]:
    r, g, b = colorsys.hsv_to_rgb(h % 1.0, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return int(r * 255), int(g * 255), int(b * 255)


def apply_preset(
    img: Image.Image,
    pixel_fn: Callable[[int, int, int, int], tuple[int, int, int, int]],
) -> Image.Image:
    out = img.copy()
    pixels = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            pixels[x, y] = pixel_fn(*pixels[x, y])
    return out


def preset_riso_flush(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    rgb = (r / 255.0, g / 255.0, b / 255.0)
    if sat < 0.12 and 0.35 < L < 0.85:
        nr, ng, nb = lerp3(rgb, PINK, 0.35)
    elif L > 0.78:
        nr, ng, nb = lerp3(CREAM, TEAL, 0.22 + sat * 0.2)
        nr, ng, nb = lerp3((nr, ng, nb), PINK, 0.15)
    elif sat > 0.28 and L < 0.55:
        t = min(1.0, (0.55 - L) / 0.35)
        nr, ng, nb = lerp3(PINK, SCARLET, 0.45 + t * 0.45)
    else:
        nr, ng, nb = lerp3(TEAL, PINK, min(1.0, L * 1.05 + sat * 0.25))
    shade = 0.55 + L * 0.55
    return int(nr * shade * 255), int(ng * shade * 255), int(nb * shade * 255), a


def preset_subtle_blush(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.08:
        return r, g, b, a
    h = (h + 0.04) % 1.0
    s = min(1.0, s * 1.08)
    nr, ng, nb = hsv_to_rgb(h, s, v)
    blend = 0.55
    return (
        int(r * (1 - blend) + nr * blend),
        int(g * (1 - blend) + ng * blend),
        int(b * (1 - blend) + nb * blend),
        a,
    )


def preset_hue_magenta(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), PINK, 0.12)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.78) % 1.0
    s = min(1.0, s * 1.35)
    return *hsv_to_rgb(h, s, v), a


def preset_riso_accent(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Lyrefly --lyrefly-accent (#ff2d95) — fluoro pink matched to UI accents."""
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    pink_h, _, _ = rgb_to_hsv(int(PINK[0] * 255), int(PINK[1] * 255), int(PINK[2] * 255))
    # Dark magenta for quill / barb detail — pushed darker for contrast on light UI chrome.
    deep_pink = lerp3(PINK, (0.2, 0.01, 0.1), 0.82)
    highlight_cream = (1.0, 0.99, 1.0)

    if sat < 0.08:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), PINK, 0.4 + L * 0.22)
        shade = max(0.38, 0.46 + L * 0.54)
        nr, ng, nb = nr * shade, ng * shade, nb * shade
    else:
        h, s, v = rgb_to_hsv(r, g, b)
        h = (pink_h + (h - 0.08) * 0.05) % 1.0
        s = min(1.0, max(s * 1.4, 0.84))
        v = min(1.0, v * 1.06)
        hr, hg, hb = hsv_to_rgb(h, s, v)
        accent_mix = min(0.82, 0.45 + sat * 0.58)
        nr, ng, nb = lerp3((hr / 255, hg / 255, hb / 255), PINK, accent_mix)
        if L > 0.66:
            cream_t = min(1.0, (L - 0.66) / 0.34) * 0.3
            nr, ng, nb = lerp3((nr, ng, nb), highlight_cream, cream_t)

    out_l = 0.299 * nr + 0.587 * ng + 0.114 * nb
    if out_l < 0.3:
        darken = min(1.0, (0.3 - out_l) / 0.3)
        nr, ng, nb = lerp3((nr, ng, nb), deep_pink, darken * 0.96)
    elif out_l > 0.8:
        lighten = min(1.0, (out_l - 0.8) / 0.2)
        nr, ng, nb = lerp3((nr, ng, nb), highlight_cream, lighten * 0.45)

    return int(nr * 255), int(ng * 255), int(nb * 255), a


def _blend_pixels(
    a: tuple[int, int, int, int],
    b: tuple[int, int, int, int],
    t: float,
) -> tuple[int, int, int, int]:
    ar, ag, ab, aa = a
    br, bg, bb, ba = b
    u = max(0.0, min(1.0, t))
    return (
        int(ar * (1 - u) + br * u),
        int(ag * (1 - u) + bg * u),
        int(ab * (1 - u) + bb * u),
        aa if aa > 0 else ba,
    )


def make_blend_preset(
    fn_a: Callable[..., tuple[int, int, int, int]],
    fn_b: Callable[..., tuple[int, int, int, int]],
    t: float,
) -> Callable[..., tuple[int, int, int, int]]:
    def blended(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
        return _blend_pixels(fn_a(r, g, b, a), fn_b(r, g, b, a), t)

    return blended


def preset_dusty_rose(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Between stock and magenta — muted rose, ~55% of hue-magenta punch."""
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), PINK, 0.08)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.78) % 1.0
    s = min(1.0, s * 0.95)
    v = min(1.0, v * 1.02)
    shifted = hsv_to_rgb(h, s, v)
    blend = 0.42
    return (
        int(r * (1 - blend) + shifted[0] * blend),
        int(g * (1 - blend) + shifted[1] * blend),
        int(b * (1 - blend) + shifted[2] * blend),
        a,
    )


def preset_rose_punch(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Dusty rose with more saturation — your favorite, turned up."""
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), PINK, 0.14)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.81) % 1.0
    s = min(1.0, s * 1.2)
    v = min(1.0, v * 1.05)
    shifted = hsv_to_rgb(h, s, v)
    blend = 0.54
    return (
        int(r * (1 - blend) + shifted[0] * blend),
        int(g * (1 - blend) + shifted[1] * blend),
        int(b * (1 - blend) + shifted[2] * blend),
        a,
    )


def preset_plum_rose(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Purple-leaning dusty rose — pink with a plum undertone."""
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), (0.82, 0.22, 0.62), 0.12)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.86) % 1.0
    s = min(1.0, s * 1.12)
    v = min(1.0, v * 1.03)
    shifted = hsv_to_rgb(h, s, v)
    blend = 0.5
    return (
        int(r * (1 - blend) + shifted[0] * blend),
        int(g * (1 - blend) + shifted[1] * blend),
        int(b * (1 - blend) + shifted[2] * blend),
        a,
    )


def preset_fuchsia_glow(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Saturated pink — dusty rose meets fluoro magenta."""
    return _blend_pixels(preset_dusty_rose(r, g, b, a), preset_hue_magenta(r, g, b, a), 0.58)


def preset_berry_bloom(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Berry pink-purple — vivid but still on-brand."""
    return _blend_pixels(preset_rose_punch(r, g, b, a), preset_plum_rose(r, g, b, a), 0.5)


def preset_violet_veil(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Plum hue path with cream highlights — expensive gallery wash."""
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), (0.78, 0.28, 0.68), 0.12)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.86) % 1.0
    s = min(1.0, s * 1.15)
    nr, ng, nb = hsv_to_rgb(h, s, v)
    cream_mix = max(0.0, (luminance(r, g, b) - 0.52) / 0.48) * 0.32
    nr, ng, nb = (
        int(nr * (1 - cream_mix) + 255 * cream_mix),
        int(ng * (1 - cream_mix) + 246 * cream_mix),
        int(nb * (1 - cream_mix) + 252 * cream_mix),
    )
    return nr, ng, nb, a


def preset_neon_blush(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """High-energy fluoro blush — maximum pop while keeping feather readable."""
    return _blend_pixels(preset_dusty_rose(r, g, b, a), preset_hue_magenta(r, g, b, a), 0.72)


def preset_candy_plum(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Candy plum — saturated purple-pink for shelf presence."""
    return _blend_pixels(preset_plum_rose(r, g, b, a), preset_hue_magenta(r, g, b, a), 0.42)


def preset_blush_mid(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """50/50 pastel-riso and hue-magenta — the sweet spot."""
    return _blend_pixels(preset_pastel_riso(r, g, b, a), preset_hue_magenta(r, g, b, a), 0.5)


def preset_magenta_veil(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Magenta hue path, gentler saturation — closer to pastel."""
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        nr, ng, nb = lerp3((r / 255, g / 255, b / 255), PINK, 0.1)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    h = (h + 0.78) % 1.0
    s = min(1.0, s * 1.08)
    nr, ng, nb = hsv_to_rgb(h, s, v)
    cream_mix = max(0.0, (luminance(r, g, b) - 0.55) / 0.45) * 0.35
    nr, ng, nb = (
        int(nr * (1 - cream_mix) + 255 * cream_mix),
        int(ng * (1 - cream_mix) + 248 * cream_mix),
        int(nb * (1 - cream_mix) + 252 * cream_mix),
    )
    return nr, ng, nb, a


def preset_cotton_magenta(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Pastel body with magenta leaning — 65% pastel, 35% magenta."""
    return _blend_pixels(preset_pastel_riso(r, g, b, a), preset_hue_magenta(r, g, b, a), 0.35)


def preset_rose_teal_soft(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Softer duotone — less ink in shadows, more cream in highlights."""
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    if L < 0.42:
        nr, ng, nb = lerp3(TEAL, PINK, L / 0.42 * 0.35)
    else:
        nr, ng, nb = lerp3(PINK, CREAM, ((L - 0.42) / 0.58) ** 0.85)
    mix = 0.55
    nr, ng, nb = lerp3((r / 255, g / 255, b / 255), (nr, ng, nb), mix)
    return int(nr * 255), int(ng * 255), int(nb * 255), a


def preset_sugar_riso(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    """Pastel riso with a magenta kiss on saturated regions only."""
    if a < 8:
        return r, g, b, a
    base = preset_pastel_riso(r, g, b, a)
    sat = saturation(r, g, b)
    if sat < 0.18:
        return base
    accent = preset_hue_magenta(r, g, b, a)
    t = min(0.55, (sat - 0.18) * 1.4)
    return _blend_pixels(base, accent, t)


def preset_teal_breeze(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    h, s, v = rgb_to_hsv(r, g, b)
    if s < 0.06:
        return r, g, b, a
    target_h = 0.48
    h = h * 0.28 + target_h * 0.72
    s = min(1.0, s * 1.2)
    return *hsv_to_rgb(h, s, v), a


def preset_duotone(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    if L < 0.42:
        nr, ng, nb = lerp3(TEAL, INK, L * 0.5)
    else:
        nr, ng, nb = lerp3(PINK, CREAM, (L - 0.42) / 0.58)
    shade = 0.5 + L * 0.5
    return int(nr * shade * 255), int(ng * shade * 255), int(nb * shade * 255), a


def preset_scarlet_print(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    if sat < 0.1 and L > 0.7:
        nr, ng, nb = lerp3(CREAM, (1, 0.92, 0.9), 0.3)
    elif L < 0.45:
        nr, ng, nb = lerp3(SCARLET, (0.45, 0.05, 0.08), L / 0.45)
    else:
        nr, ng, nb = lerp3(SCARLET, PINK, (L - 0.45) / 0.55)
    return int(nr * 255), int(ng * 255), int(nb * 255), a


def preset_pastel_riso(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    base = lerp3(TEAL, PINK, L)
    nr, ng, nb = lerp3(base, CREAM, 0.45)
    mix = 0.35 + sat * 0.25
    nr, ng, nb = lerp3((r / 255, g / 255, b / 255), (nr, ng, nb), mix)
    return int(nr * 255), int(ng * 255), int(nb * 255), a


def preset_fluoro_pop(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    if sat > 0.25 and L < 0.5:
        nr, ng, nb = SCARLET
    elif L > 0.65:
        nr, ng, nb = lerp3(PINK, (1, 1, 1), 0.25)
    else:
        nr, ng, nb = lerp3(TEAL, PINK, L)
    return int(nr * 255), int(ng * 255), int(nb * 255), a


def preset_golden_zine(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    if L > 0.75:
        nr, ng, nb = lerp3(YELLOW, CREAM, 0.35)
    elif sat > 0.22 and L < 0.5:
        nr, ng, nb = lerp3(SCARLET, PINK, 0.4)
    else:
        nr, ng, nb = lerp3(YELLOW, PINK, min(1.0, L * 1.1))
    shade = 0.6 + L * 0.4
    return int(nr * shade * 255), int(ng * shade * 255), int(nb * shade * 255), a


def preset_markings_accent(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    if sat > 0.28 and L < 0.58:
        t = min(1.0, (0.58 - L) / 0.35)
        nr, ng, nb = lerp3(PINK, SCARLET, t)
        return int(nr * 255), int(ng * 255), int(nb * 255), a
    grey = 0.25 + L * 0.55
    if sat < 0.12:
        grey *= 0.92
    return int(grey * 255), int(grey * 255), int(grey * 255 * 1.02), a


def preset_ink_wash(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    L = luminance(r, g, b)
    sat = saturation(r, g, b)
    ink = lerp3(INK, (0.45, 0.45, 0.48), L)
    if sat > 0.2:
        accent = lerp3(PINK, TEAL, L)
        ink = lerp3(ink, accent, min(0.65, sat * 0.9))
    return int(ink[0] * 255), int(ink[1] * 255), int(ink[2] * 255), a


def _gradient_rgb_at(x: int, y: int, w: int, h: int, mode: str) -> tuple[float, float, float]:
    """Position-based gradient color (normalized 0–1 RGB)."""
    nx = x / max(w - 1, 1)
    ny = y / max(h - 1, 1)
    # Feather runs bottom-left → top-right; use diagonal for vane flow
    t = max(0.0, min(1.0, nx * 0.55 + ny * 0.45))

    if mode == "rainbow":
        hue = (t * 0.92 + nx * 0.08) % 1.0
        return colorsys.hsv_to_rgb(hue, 0.82, 0.95)

    if mode == "riso-rainbow":
        # Pink → teal → yellow → scarlet (on-brand spectrum)
        if t < 0.33:
            u = t / 0.33
            return lerp3(PINK, TEAL, u)
        if t < 0.66:
            u = (t - 0.33) / 0.33
            return lerp3(TEAL, YELLOW, u)
        u = (t - 0.66) / 0.34
        return lerp3(YELLOW, SCARLET, u)

    if mode == "holo":
        hue = (nx * 0.35 + ny * 0.45 + (nx * ny) * 0.2) % 1.0
        return colorsys.hsv_to_rgb(hue, 0.55, 0.92)

    if mode == "holo-bold":
        hue = (nx * 0.5 + ny * 0.5) % 1.0
        return colorsys.hsv_to_rgb(hue, 0.78, 0.98)

    if mode == "pink-plum":
        plum = (0.62, 0.12, 0.58)
        if t < 0.5:
            return lerp3(PINK, plum, t / 0.5)
        return lerp3(plum, (0.48, 0.08, 0.72), (t - 0.5) / 0.5)

    if mode == "magenta-shift":
        hue = (0.9 - t * 0.14 + nx * 0.04) % 1.0
        return colorsys.hsv_to_rgb(hue, 0.88, 0.97)

    return PINK


def apply_gradient_overlay(
    img: Image.Image,
    mode: str,
    *,
    base_preset: Callable[..., tuple[int, int, int, int]] | None = None,
    strength: float = 0.38,
    markings_only: bool = False,
) -> Image.Image:
    """Blend a spatial gradient over the feather (or over a recolored base)."""
    w, h = img.size
    src = Image.open(SOURCE).convert("RGBA") if base_preset is None else apply_preset(Image.open(SOURCE).convert("RGBA"), base_preset)
    src_px = src.load()
    orig = img.convert("RGBA")
    orig_px = orig.load()
    out = Image.new("RGBA", (w, h))
    out_px = out.load()
    strength = max(0.0, min(1.0, strength))

    for y in range(h):
        for x in range(w):
            r, g, b, a = orig_px[x, y] if base_preset is None else src_px[x, y]
            if a < 8:
                out_px[x, y] = (r, g, b, a)
                continue
            gr, gg, gb = _gradient_rgb_at(x, y, w, h, mode)
            if markings_only:
                sat = saturation(r, g, b)
                L = luminance(r, g, b)
                if not (sat > 0.22 and L < 0.62):
                    out_px[x, y] = (r, g, b, a)
                    continue
                local_strength = strength * 1.15
            else:
                local_strength = strength * (0.55 + luminance(r, g, b) * 0.55)

            # Screen-like blend for luminous overlays
            nr = 1.0 - (1.0 - r / 255.0) * (1.0 - gr * local_strength)
            ng = 1.0 - (1.0 - g / 255.0) * (1.0 - gg * local_strength)
            nb = 1.0 - (1.0 - b / 255.0) * (1.0 - gb * local_strength)
            out_px[x, y] = (
                int(min(255, nr * 255)),
                int(min(255, ng * 255)),
                int(min(255, nb * 255)),
                a,
            )
    return out


def render_gradient_preset(
    preset_id: str,
    source: Path = SOURCE,
) -> Image.Image:
    specs: dict[str, tuple[str, str, dict]] = {
        "rainbow-vane": ("Rainbow vane", "Full spectrum along the feather.", {"mode": "rainbow", "strength": 0.42}),
        "rainbow-soft": ("Rainbow veil", "Light rainbow screen over dusty rose.", {"mode": "rainbow", "base_preset": preset_dusty_rose, "strength": 0.28}),
        "riso-spectrum": ("Riso spectrum", "Pink → teal → yellow → scarlet overlay.", {"mode": "riso-rainbow", "strength": 0.4}),
        "riso-spectrum-soft": ("Riso spectrum soft", "On-brand spectrum at 25% over blush mid.", {"mode": "riso-rainbow", "base_preset": preset_blush_mid, "strength": 0.25}),
        "holo-shift": ("Holo shift", "Iridescent position-based hue drift.", {"mode": "holo", "base_preset": preset_dusty_rose, "strength": 0.34}),
        "holo-bold": ("Holo bold", "Stronger prismatic shift on cotton magenta.", {"mode": "holo-bold", "base_preset": preset_cotton_magenta, "strength": 0.38}),
        "prism-markings": ("Prism markings", "Rainbow only on chevron markings.", {"mode": "rainbow", "base_preset": preset_dusty_rose, "strength": 0.5, "markings_only": True}),
        "gradient-veil": ("Gradient veil", "Diagonal rainbow at low opacity over stock.", {"mode": "rainbow", "strength": 0.22}),
        "holo-rose": ("Holo rose", "Iridescent veil over rose punch.", {"mode": "holo", "base_preset": preset_rose_punch, "strength": 0.38}),
        "prism-rose": ("Prism rose", "Light rainbow over rose punch.", {"mode": "rainbow", "base_preset": preset_rose_punch, "strength": 0.34}),
        "magenta-gradient": ("Magenta gradient", "Pink → plum shift along the vane.", {"mode": "magenta-shift", "base_preset": preset_dusty_rose, "strength": 0.42}),
        "purple-pink-shift": ("Purple pink shift", "Prismatic plum drift on berry bloom.", {"mode": "holo-bold", "base_preset": preset_berry_bloom, "strength": 0.4}),
        "fluoro-veil": ("Fluoro veil", "Riso spectrum over fuchsia glow.", {"mode": "riso-rainbow", "base_preset": preset_fuchsia_glow, "strength": 0.36}),
        "holo-plum": ("Holo plum", "Bold holo on candy plum.", {"mode": "holo-bold", "base_preset": preset_candy_plum, "strength": 0.42}),
        "spectrum-rose": ("Spectrum rose", "On-brand spectrum over dusty rose.", {"mode": "riso-rainbow", "base_preset": preset_dusty_rose, "strength": 0.48}),
        "pink-plum-veil": ("Pink plum veil", "Pink-to-plum gradient on berry bloom.", {"mode": "pink-plum", "base_preset": preset_berry_bloom, "strength": 0.4}),
    }
    if preset_id not in specs:
        raise KeyError(preset_id)
    _, _, kwargs = specs[preset_id]
    base = Image.open(source).convert("RGBA")
    return apply_gradient_overlay(base, **kwargs)


PRESETS: dict[str, tuple[str, str, Callable[..., tuple[int, int, int, int]]]] = {
    "subtle-blush": ("Subtle blush", "Keep the natural feather — warm browns with a pink lift.", preset_subtle_blush),
    "hue-magenta": ("Hue → magenta", "Global hue rotation into fluoro pink territory.", preset_hue_magenta),
    "riso-accent": ("Riso accent", "Lyrefly hot pink — matches --lyrefly-accent (#ff2d95).", preset_riso_accent),
    "teal-breeze": ("Teal breeze", "Cool riso teal wash — gallery calm, not carnival.", preset_teal_breeze),
    "duotone": ("Pink / teal duotone", "Shadows teal, highlights pink — classic print-shop split.", preset_duotone),
    "scarlet-print": ("Scarlet ink", "Deep riso red run — warm paper, scarlet body.", preset_scarlet_print),
    "pastel-riso": ("Pastel riso", "Soft fluoro pastels on white-cube paper.", preset_pastel_riso),
    "fluoro-pop": ("Fluoro pop", "Max saturation pink + teal — back-room riso energy.", preset_fluoro_pop),
    "golden-zine": ("Golden zine", "Riso yellow + pink — newsprint warmth.", preset_golden_zine),
    "markings-accent": ("Markings only", "Neutral grey feather; chevrons pick up pink/scarlet.", preset_markings_accent),
    "riso-flush": ("Riso flush (full remap)", "Full palette remap — teal base, pink body, scarlet marks.", preset_riso_flush),
}

PRESETS_ROUND2: dict[str, tuple[str, str, Callable[..., tuple[int, int, int, int]] | str]] = {
    "dusty-rose": ("Dusty rose", "Muted magenta — ~half the punch of hue → magenta.", preset_dusty_rose),
    "blush-mid": ("Blush mid", "50/50 pastel riso + hue magenta — between your two favorites.", preset_blush_mid),
    "magenta-veil": ("Magenta veil", "Magenta hue with cream highlights — softer fluoro.", preset_magenta_veil),
    "cotton-magenta": ("Cotton magenta", "Pastel body, magenta leaning — 65/35 blend.", preset_cotton_magenta),
    "rose-teal-soft": ("Rose teal soft", "Gentler pink/teal duotone with stock mixed in.", preset_rose_teal_soft),
    "sugar-riso": ("Sugar riso", "Pastel base; magenta kisses the markings only.", preset_sugar_riso),
    # Gradient overlays (value is gradient preset id string)
    "rainbow-vane": ("Rainbow vane", "Full rainbow screen along the feather.", "gradient:rainbow-vane"),
    "rainbow-soft": ("Rainbow soft", "Light rainbow over dusty rose.", "gradient:rainbow-soft"),
    "riso-spectrum": ("Riso spectrum", "Pink → teal → yellow → scarlet gradient overlay.", "gradient:riso-spectrum"),
    "riso-spectrum-soft": ("Riso spectrum soft", "On-brand spectrum veil over blush mid.", "gradient:riso-spectrum-soft"),
    "holo-shift": ("Holo shift", "Iridescent hue drift over dusty rose.", "gradient:holo-shift"),
    "holo-bold": ("Holo bold", "Strong prismatic shift on cotton magenta.", "gradient:holo-bold"),
    "prism-markings": ("Prism markings", "Rainbow confined to chevron markings.", "gradient:prism-markings"),
    "gradient-veil": ("Gradient veil", "Whisper rainbow diagonal over stock emoji.", "gradient:gradient-veil"),
}

PRESETS_ROUND3: dict[str, tuple[str, str, Callable[..., tuple[int, int, int, int]] | str]] = {
    "rose-punch": ("Rose punch", "Dusty rose turned up — more saturation and fluoro pink.", preset_rose_punch),
    "plum-rose": ("Plum rose", "Purple-leaning dusty rose — pink with plum undertone.", preset_plum_rose),
    "fuchsia-glow": ("Fuchsia glow", "Saturated pink — dusty rose meets hue magenta.", preset_fuchsia_glow),
    "berry-bloom": ("Berry bloom", "Berry pink-purple — vivid shelf presence.", preset_berry_bloom),
    "violet-veil": ("Violet veil", "Plum wash with cream highlights.", preset_violet_veil),
    "neon-blush": ("Neon blush", "High-energy fluoro blush — maximum pop.", preset_neon_blush),
    "candy-plum": ("Candy plum", "Saturated candy purple-pink.", preset_candy_plum),
    "holo-rose": ("Holo rose", "Iridescent veil over rose punch.", "gradient:holo-rose"),
    "prism-rose": ("Prism rose", "Light rainbow over rose punch.", "gradient:prism-rose"),
    "magenta-gradient": ("Magenta gradient", "Pink → plum shift along the vane.", "gradient:magenta-gradient"),
    "purple-pink-shift": ("Purple pink shift", "Prismatic plum on berry bloom.", "gradient:purple-pink-shift"),
    "fluoro-veil": ("Fluoro veil", "Riso spectrum over fuchsia glow.", "gradient:fluoro-veil"),
    "holo-plum": ("Holo plum", "Bold holo on candy plum.", "gradient:holo-plum"),
    "spectrum-rose": ("Spectrum rose", "Strong riso spectrum on dusty rose.", "gradient:spectrum-rose"),
    "pink-plum-veil": ("Pink plum veil", "Pink-to-plum gradient on berry bloom.", "gradient:pink-plum-veil"),
}

ALL_PRESET_IDS = list(PRESETS.keys()) + list(PRESETS_ROUND2.keys()) + list(PRESETS_ROUND3.keys())


def render_preset(preset_id: str, source: Path = SOURCE) -> Image.Image:
    if preset_id in PRESETS:
        _, _, fn = PRESETS[preset_id]
        img = Image.open(source).convert("RGBA")
        return apply_preset(img, fn)
    for bucket in (PRESETS_ROUND2, PRESETS_ROUND3):
        if preset_id in bucket:
            _, _, fn = bucket[preset_id]
            if isinstance(fn, str) and fn.startswith("gradient:"):
                return render_gradient_preset(fn.removeprefix("gradient:"), source)
            if callable(fn):
                img = Image.open(source).convert("RGBA")
                return apply_preset(img, fn)
    raise KeyError(preset_id)


def generate_all(
    selected: list[str] | None = None,
    *,
    round2: bool = False,
    round3: bool = False,
) -> list[Path]:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    VARIANTS_DIR.mkdir(parents=True, exist_ok=True)
    if selected:
        ids = selected
    elif round3:
        ids = list(PRESETS_ROUND3.keys())
    elif round2:
        ids = list(PRESETS_ROUND2.keys())
    else:
        ids = ALL_PRESET_IDS
    written: list[Path] = []
    for preset_id in ids:
        out = VARIANTS_DIR / f"{preset_id}.png"
        render_preset(preset_id).save(out, optimize=True)
        written.append(out)
    return written


def apply_to_main(preset_id: str) -> Path:
    if preset_id not in ALL_PRESET_IDS:
        raise KeyError(preset_id)
    render_preset(preset_id).save(MAIN_ICON, optimize=True)
    return MAIN_ICON


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Lyrefly feather logo color-shift variants.")
    parser.add_argument("--preset", help="Generate only this preset id")
    parser.add_argument("--apply", help="Apply preset to public/icons/lyrefly-feather.png")
    parser.add_argument("--round2", action="store_true", help="Generate round-2 presets only")
    parser.add_argument("--round3", action="store_true", help="Generate round-3 presets only")
    args = parser.parse_args()

    if args.apply:
        if args.apply not in ALL_PRESET_IDS:
            print(f"Unknown preset: {args.apply}", file=sys.stderr)
            print("Available:", ", ".join(ALL_PRESET_IDS), file=sys.stderr)
            return 1
        apply_to_main(args.apply)
        print(f"Applied {args.apply} → {MAIN_ICON.relative_to(REPO_ROOT)}")
        return 0

    selected = [args.preset] if args.preset else None
    if args.preset and args.preset not in ALL_PRESET_IDS:
        print(f"Unknown preset: {args.preset}", file=sys.stderr)
        return 1

    paths = generate_all(
        selected,
        round2=args.round2 and not args.preset,
        round3=args.round3 and not args.preset,
    )
    for p in paths:
        print(f"Wrote {p.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

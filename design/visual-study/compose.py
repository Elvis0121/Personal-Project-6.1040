#!/usr/bin/env python3
"""Compose the two 16:9 visual-study slides from found photographs."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "source"
W, H = 1920, 1080
WHITE = (255, 255, 255)
INK = (34, 34, 34)
MUTED = (90, 90, 90)
CREAM = (244, 238, 228)

TITLE_FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 28)
NOTE_FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
SMALL_FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
SERIF_FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 16)
GOTHIC = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Black.ttf", 15)
SCRIPT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Italic.ttf", 18)


def load(name: str) -> Image.Image:
    return Image.open(SRC / name).convert("RGB")


def cover(
    im: Image.Image,
    w: int,
    h: int,
    focus: tuple[float, float] = (0.5, 0.5),
) -> Image.Image:
    scale = max(w / im.width, h / im.height)
    nw = max(w, int(im.width * scale + 0.5))
    nh = max(h, int(im.height * scale + 0.5))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = int((nw - w) * focus[0])
    top = int((nh - h) * focus[1])
    left = max(0, min(left, nw - w))
    top = max(0, min(top, nh - h))
    return im.crop((left, top, left + w, top + h))


def paste(
    canvas: Image.Image,
    name: str,
    box: tuple[int, int, int, int],
    focus: tuple[float, float] = (0.5, 0.5),
) -> None:
    x, y, w, h = box
    canvas.paste(cover(load(name), w, h, focus), (x, y))


def chips(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    colors: list[tuple[int, int, int]],
    size: int = 48,
    gap: int = 7,
    vertical: bool = False,
) -> None:
    x, y = origin
    for color in colors:
        draw.rectangle([x, y, x + size, y + size], fill=color)
        if vertical:
            y += size + gap
        else:
            x += size + gap


def write_lines(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    lines: list[str],
    font=SMALL_FONT,
    fill=MUTED,
    leading: int = 18,
) -> None:
    x, y = xy
    for i, line in enumerate(lines):
        draw.text((x, y + i * leading), line, font=font, fill=fill)


def footer(draw: ImageDraw.ImageDraw, lines: list[str]) -> None:
    draw.rectangle([0, 968, W, H], fill=CREAM)
    write_lines(draw, (56, 986), lines, font=NOTE_FONT, fill=INK, leading=26)


def colour_slide() -> Image.Image:
    canvas = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(canvas)

    draw.text((56, 32), "Colors derived from spice markets", font=TITLE_FONT, fill=INK)

    from_tea = [
        (122, 30, 43),
        (194, 48, 24),
        (224, 122, 24),
        (230, 180, 34),
        (240, 212, 90),
        (106, 123, 50),
        (61, 74, 40),
        (42, 34, 28),
    ]
    from_barrels = [
        (31, 107, 98),
        (196, 52, 48),
        (232, 176, 58),
        (198, 86, 110),
        (30, 74, 140),
        (236, 228, 214),
    ]
    chips(draw, (56, 78), from_tea, size=42, gap=6)
    chips(draw, (1288, 78), from_barrels, size=42, gap=6)

    paste(canvas, "spices-tea.jpg", (56, 140, 1088, 330))
    paste(canvas, "spices-kandy.jpg", (1160, 140, 364, 158), focus=(0.5, 0.35))
    paste(canvas, "spices-fethiye.jpg", (1160, 314, 364, 590), focus=(0.48, 0.55))

    mid_y = 486
    paste(canvas, "citrus.jpg", (128, mid_y, 500, 176))
    paste(canvas, "spices-marrakech.jpg", (644, mid_y, 500, 176), focus=(0.62, 0.42))
    chips(
        draw,
        (56, mid_y + 6),
        [(194, 48, 24), (31, 107, 98), (61, 74, 40), (230, 180, 34), (30, 74, 140)],
        size=28,
        gap=6,
        vertical=True,
    )
    chips(
        draw,
        (1540, 314),
        [(31, 107, 98), (194, 48, 24), (61, 74, 40), (230, 180, 34), (196, 60, 68), (236, 228, 214)],
        size=42,
        gap=8,
        vertical=True,
    )
    write_lines(
        draw,
        (1540, 640),
        [
            "In the interface",
            "teal → buttons, links",
            "paprika → errors only",
            "oregano → VERIFIED",
            "turmeric → pending",
            "pomegranate → likes",
            "pepper on cream → type",
            "",
            "Left in the photos",
            "hot pinks, loud yellows",
            "too noisy for forms",
        ],
        font=SMALL_FONT,
        fill=INK,
        leading=18,
    )

    bot_y = 678
    paste(canvas, "chilies.jpg", (56, bot_y, 352, 210), focus=(0.5, 0.4))
    paste(canvas, "pomegranates.jpg", (424, bot_y, 352, 210), focus=(0.5, 0.55))
    paste(canvas, "spices-morocco.jpg", (792, bot_y, 352, 210), focus=(0.45, 0.55))

    chips(
        draw,
        (56, 904),
        [
            (196, 60, 68),
            (232, 120, 112),
            (240, 200, 180),
            (194, 48, 24),
            (42, 34, 28),
            (196, 74, 42),
            (232, 192, 58),
            (31, 107, 98),
            (61, 74, 40),
            (236, 228, 214),
        ],
        size=36,
        gap=6,
    )

    footer(
        draw,
        [
            "Why these, not the whole stall. Barrel teal is the quietest strong colour in the barrels, so it can sit on every button. Paprika is reserved for errors, chili, not decoration.",
            "VERIFIED uses darkened oregano. Pending uses turmeric, darkened for contrast. Body type is pepper on salt-pile cream. The rest of the powders stay in the collage.",
        ],
    )
    return canvas


def note_block(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    lines: list[str],
    sample: str | None = None,
    sample_font=SERIF_FONT,
    used: bool | None = None,
) -> None:
    x, y = xy
    if used is True:
        draw.text((x, y), "used", font=SMALL_FONT, fill=(27, 95, 88))
        y += 16
    elif used is False:
        draw.text((x, y), "left", font=SMALL_FONT, fill=(194, 48, 24))
        y += 16
    if sample:
        draw.text((x, y), sample, font=sample_font, fill=INK)
        y += 26
    for i, line in enumerate(lines):
        draw.text((x, y + i * 18), line, font=SMALL_FONT, fill=MUTED)


def type_slide() -> Image.Image:
    canvas = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(canvas)

    draw.text((56, 32), "Type found in print, signs, and metal", font=TITLE_FONT, fill=INK)

    note_block(
        draw,
        (56, 72),
        ["oldstyle serif  ·  newsprint", "high x-height headlines", "→ Newsreader headings"],
        sample="Hamburgefonstiv",
        sample_font=SERIF_FONT,
        used=True,
    )
    note_block(
        draw,
        (1288, 72),
        ["script neon  ·  casual italic", "pretty, unreadable at 16px"],
        sample="Orpheum",
        sample_font=SCRIPT,
        used=False,
    )

    paste(canvas, "type-headlines.jpg", (56, 168, 1088, 320), focus=(0.62, 0.22))
    paste(canvas, "type-marquee.jpg", (1160, 168, 364, 152), focus=(0.55, 0.42))
    paste(canvas, "type-plantin.jpg", (1160, 336, 364, 568), focus=(0.5, 0.45))

    mid_y = 504
    paste(canvas, "type-magazine.jpg", (128, mid_y, 500, 172), focus=(0.5, 0.35))
    paste(canvas, "type-fox.jpg", (644, mid_y, 500, 172), focus=(0.52, 0.55))
    note_block(
        draw,
        (56, mid_y + 8),
        ["copperplate", "too ornamental"],
        sample="ABC",
        sample_font=SCRIPT,
        used=False,
    )
    note_block(
        draw,
        (1548, 348),
        ["metal type", "even colour", "→ heading weight"],
        sample="RRgg",
        sample_font=SERIF_FONT,
        used=True,
    )
    note_block(
        draw,
        (1548, 470),
        ["condensed gothic", "labels only", "VERIFIED, Rent, kickers"],
        sample="FOX",
        sample_font=GOTHIC,
        used=True,
    )
    write_lines(
        draw,
        (1548, 620),
        [
            "Body is a humanist sans",
            "(Source Sans 3), not",
            "marquee condensed.",
            "Paragraphs have to be",
            "read, not announced.",
        ],
        font=SMALL_FONT,
        fill=INK,
        leading=18,
    )

    bot_y = 692
    paste(canvas, "type-case.jpg", (56, bot_y, 352, 200))
    paste(canvas, "type-newsletter.jpg", (424, bot_y, 352, 200))
    paste(canvas, "type-letterpress.jpg", (792, bot_y, 352, 200))

    draw.text((56, 900), "left  ·  wood type", font=SMALL_FONT, fill=(194, 48, 24))
    draw.text((424, 900), "left  ·  stencil / ditto", font=SMALL_FONT, fill=(194, 48, 24))
    draw.text((792, 900), "left  ·  sorts as decoration", font=SMALL_FONT, fill=(194, 48, 24))

    footer(
        draw,
        [
            "In the interface. Headings, the brand word, and the hero type bar use Newsreader: oldstyle serif, high x-height, from the newsprint. Body and forms stay Source Sans 3.",
            "Gothic tracking is only for small labels (VERIFIED, kickers, Rent / Deposit), so the outline of a page is obvious. Neon script and copperplate stayed on the board.",
        ],
    )
    return canvas


def main() -> None:
    colour = colour_slide()
    colour.save(ROOT / "01-colour.png", "PNG", optimize=True)
    type_ = type_slide()
    type_.save(ROOT / "02-type.png", "PNG", optimize=True)
    print("wrote", ROOT / "01-colour.png", colour.size)
    print("wrote", ROOT / "02-type.png", type_.size)


if __name__ == "__main__":
    main()

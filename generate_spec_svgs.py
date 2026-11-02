#!/usr/bin/env python3
"""
Generate "Regarding Cocktails" (On Cocktails) style minimalist architectural SVG
illustrations for all 51 cocktail recipes in index.html.

Usage:
    python3 generate_spec_svgs.py
"""

from __future__ import annotations

import html as html_lib
import math
import os
import re
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class SpecItem:
    measure_text: str
    name: str
    oz: float = 0.0
    count: float = 0.0
    unit: str = ""
    is_barspoon: bool = False
    is_garnish: bool = False


@dataclass
class CocktailRecipe:
    card_id: str
    title: str
    glass_desc: str
    technique: str
    specs: List[SpecItem] = field(default_factory=list)


def classify_glass(glass_desc: str, card_id: str) -> Tuple[str, str]:
    """
    Returns (glass_type, ice_type)
    glass_type: 'rocks', 'coupe', 'nick_nora', 'martini', 'highball', 'pint', 'mug', 'irish_coffee', 'julep', 'bottle'
    ice_type: 'king_cube', 'chili_cube', 'cubes', 'crushed', 'neat'
    """
    g = glass_desc.lower()

    # Ice classification
    if "chili-embedded" in g or card_id in ("archive-hot-and-unbothered", "archive-heaven-or-hell-margarita"):
        ice = "chili_cube"
    elif any(k in g for k in ("large ice", "large cube", "large clear", "1 large", "clear ice block", "crystal clear", "one large cube")):
        ice = "king_cube"
    elif "crushed ice" in g:
        ice = "crushed"
    elif any(k in g for k in ("over ice", "fresh ice", "with ice", "halfway with ice")):
        ice = "cubes"
    else:
        ice = "neat"

    # Glass shape classification
    if "bottle" in g:
        return "bottle", "neat"
    if "irish coffee" in g or "footed mug" in g:
        return "irish_coffee", "neat"
    if "mug" in g or "teacup" in g:
        return "mug", ice
    if "julep" in g:
        return "julep", "crushed"
    if "mason jar" in g:
        return "rocks", ice
    if "martini" in g:
        return "martini", "neat"
    if "nick" in g and "coupe" not in g:
        return "nick_nora", "neat"
    if "coupe" in g or "sour glass" in g or "nick" in g:
        return "coupe", "neat"
    if "pint" in g:
        return "pint", ice
    if "highball" in g or "collins" in g:
        return "highball", ice
    return "rocks", ice


def classify_ingredient_style(name: str, idx: int) -> Tuple[str, str]:
    """
    Returns (hex_color, pattern_type) tuned to the Midnight Bourbon Cellar palette
    and "Regarding Cocktails" textural language.
    """
    n = name.lower()

    # Hibiscus-infused tequila
    if "hibiscus" in n:
        return "#cc5c58", "cross"

    # Cream / Egg white / Foam / Baileys
    if any(k in n for k in ("egg white", "whipped cream", "heavy cream", "half-and-half", "creamer", "baileys", "bourbon cream", "white chocolate", "crème de cacao")):
        return "#f2e6d8", "foam"

    # Effervescent toppers (Club soda, Ginger beer, Ginger ale, Lager, Monster)
    if any(k in n for k in ("club soda", "ginger beer", "ginger ale", "lager", "pilsner", "miller high life")):
        return "#dfd2c0", "bubbles"
    if "monster energy" in n:
        return "#8ab868", "bubbles"
    if "guinness" in n or "stout" in n:
        return "#8c6246", "woven"

    # Coffee / Espresso
    if any(k in n for k in ("coffee", "espresso", "kahlúa")):
        return "#9e6b47", "woven"

    # Green / Herbal (Midori, Chartreuse, Ancho Verde, Mint, Absinthe)
    if any(k in n for k in ("midori", "ancho reyes verde", "mint", "absinthe", "herbsaint", "chili vodka", "lime cordial")):
        return "#82b078", "dots"

    # Violet / Berry / Cranberry / Red-pink modifiers
    if any(k in n for k in ("violette", "chambord", "grenadine", "strawberry", "cranberry", "heering", "blackberry")):
        return "#cc6668", "cross"

    # Golden Amaro (Nonino)
    if "nonino" in n:
        return "#d89440", "dots"

    # Bitter Red / Amaro / Sweet Vermouth (Campari, Aperol, Cynar, Averna, Sweet Vermouth, Pimm's)
    if any(k in n for k in ("campari", "aperol", "cynar", "amaro", "sweet vermouth", "carpano antica", "pimm")):
        return "#d16647", "cross"

    # Dry / Blanc Vermouth, Maraschino, Elderflower, Liqueurs
    if any(k in n for k in ("dry vermouth", "blanc vermouth", "maraschino", "st-germain", "elderflower", "bénédictine", "strega", "cointreau", "triple sec", "grand marnier", "orange liqueur", "amaretto", "peppermint", "allspice", "ginger liqueur")):
        return "#e5b968", "dots"

    # Citrus & Fruit Juices (Lemon, Lime, Orange, Pineapple, Apple Cider)
    if any(k in n for k in ("lemon", "lime", "orange juice", "pineapple", "apple cider", "grapefruit")):
        return "#e8c86b", "diagonal"

    # Syrups, Honey, Maple, Agave, Sugar, Pumpkin
    if any(k in n for k in ("syrup", "honey", "maple", "agave", "sugar", "pumpkin")):
        return "#d68a3e", "dashes"

    # Clear Spirits (Gin, Vodka, Water)
    if any(k in n for k in ("gin", "vodka", "water")):
        return "#d4ccc2", "dots"

    # Agave Spirits (Tequila, Mezcal)
    if any(k in n for k in ("tequila", "mezcal")):
        return "#e2a44c", "diagonal_weave"

    # Cognac / Brandy / Applejack (distinct copper-amber weave from whiskey)
    if any(k in n for k in ("cognac", "brandy", "applejack")):
        return "#c96d38", "diagonal_weave"

    # Whiskey / Bourbon / Rye / Scotch / Rum (Base brown spirits)
    if any(k in n for k in ("bourbon", "rye", "whiskey", "whisky", "scotch", "rum", "tullamore", "bushmills", "jameson", "redbreast")):
        return "#e08c38", "woven"

    palette = [
        ("#e08c38", "woven"),
        ("#e5b968", "dots"),
        ("#d16647", "cross"),
        ("#e8c86b", "diagonal"),
        ("#d68a3e", "dashes"),
    ]
    return palette[idx % len(palette)]


def shorten_ingredient_name(name: str) -> str:
    n = re.sub(r"\s*\([^)]*\)", "", name).strip()
    n = n.split(",")[0].strip()
    replacements = [
        ("Tullamore D.E.W. Irish Whiskey", "Tullamore D.E.W."),
        ("High-Proof Bourbon or Rye Whiskey", "Bourbon / Rye"),
        ("Laird’s Straight Apple Brandy", "Apple Brandy"),
        ("Laird's Straight Apple Brandy", "Apple Brandy"),
        ("Conniption Navy Strength Gin", "Navy Strength Gin"),
        ("Woodford Reserve Bourbon Whiskey", "Woodford Bourbon"),
        ("Single pot still Irish whiskey", "Pot Still Irish"),
        ("Baileys Original Irish Cream", "Baileys Irish Cream"),
        ("Thawed orange juice concentrate", "OJ Concentrate"),
        ("Hardwood charcoal smoked honey", "Smoked Honey"),
        ("Amaro Nonino Quintessentia", "Amaro Nonino"),
        ("Carpano Antica sweet vermouth", "Sweet Vermouth"),
        ("St-Germain Elderflower Liqueur", "St-Germain"),
        ("Luxardo Maraschino Liqueur", "Maraschino"),
        ("Chambord raspberry liqueur", "Chambord"),
        ("Jalapeño-Hibiscus Reposado", "Jalapeño-Hibiscus"),
        ("House pineapple chili syrup", "Pineapple Chili Syr."),
        ("Rosemary-infused simple syrup", "Rosemary Syrup"),
        ("Thyme-infused simple syrup", "Thyme Syrup"),
        ("Frozen limeade concentrate", "Limeade Conc."),
        ("Crisp lager or pilsner", "Crisp Lager"),
        ("Hot French Press Coffee", "Hot Coffee"),
        ("Fresh whipped cream", "Whipped Cream"),
        ("Fat-free half-and-half", "Half & Half"),
        ("Peaty Islay Scotch", "Islay Scotch Float"),
        ("Blended Scotch whisky", "Blended Scotch"),
        ("Smoky blended Scotch", "Smoky Scotch"),
        ("Peated Scotch whisky", "Peated Scotch"),
        ("Gracias a Dios Oaxaca Gin", "Oaxaca Gin"),
        ("Wild Turkey 101 Bourbon", "Wild Turkey 101"),
        ("Vanilla-Demerara Syrup", "Vanilla-Demerara"),
        ("Pumpkin spice creamer", "Pumpkin Creamer"),
        ("White chocolate syrup", "White Choc. Syrup"),
        ("Reposado golden tequila", "Reposado Tequila"),
        ("Grand Marnier liqueur", "Grand Marnier"),
        ("Pure dark maple syrup", "Dark Maple Syrup"),
        ("Guinness Draught stout", "Guinness Draught"),
        ("Heering Cherry Liqueur", "Cherry Heering"),
        ("Fresh pineapple juice", "Pineapple Juice"),
        ("London Dry or Plymouth Gin", "London Dry Gin"),
        ("Lime sparkling club soda", "Lime Club Soda"),
        ("Pure cane simple syrup", "Cane Simple Syrup"),
        ("Old Forester straight bourbon", "Old Forester Bourbon"),
        ("House strawberry simple syrup", "Strawberry Syrup"),
        ("House fresh ginger syrup", "Fresh Ginger Syrup"),
        ("Bushmills Irish Whiskey", "Bushmills Irish"),
        ("Cointreau Orange Liqueur", "Cointreau"),
    ]
    for old, new in replacements:
        if old.lower() in n.lower():
            n = new
            break
    if len(n) > 20:
        n = n[:19].rstrip() + "…"
    return n


def parse_recipes_from_html(html_content: str) -> List[CocktailRecipe]:
    articles = re.findall(
        r'<article class="cocktail-card vault-card"[^>]*id="([^"]+)"[^>]*>(.*?)</article>',
        html_content,
        re.S,
    )
    recipes: List[CocktailRecipe] = []
    for cid, body in articles:
        title_m = re.search(r'<h4 class="card-title">(.*?)</h4>', body, re.S)
        glass_m = re.search(r'<div class="glassware-badge">.*?<span>(.*?)</span>', body, re.S)
        eyebrow_m = re.findall(
            r'<div class="course-eyebrow">.*?<span>.*?</span>\s*<span>(.*?)</span>', body, re.S
        )

        title = html_lib.unescape(title_m.group(1).strip()) if title_m else cid
        glass_desc = html_lib.unescape(glass_m.group(1).strip()) if glass_m else "Cocktail glass"
        technique = html_lib.unescape(eyebrow_m[0].strip()) if eyebrow_m else "CRAFT BUILD"

        spec_matches = re.findall(r'<li class="spec-item([^"]*)">(.*?)</li>', body, re.S)
        specs: List[SpecItem] = []
        for s_cls, s_body in spec_matches:
            is_garnish = "spec-garnish" in s_cls
            m_tag = re.search(r'<span class="spec-measure"([^>]*)>(.*?)</span>', s_body, re.S)
            n_tag = re.search(r'<span class="spec-name">(.*?)</span>', s_body, re.S)

            m_attrs = m_tag.group(1) if m_tag else ""
            m_text = html_lib.unescape(m_tag.group(2).strip()) if m_tag else ""

            n_raw = n_tag.group(1) if n_tag else ""
            n_clean = re.sub(r'<span class="spec-note">.*?</span>', "", n_raw, flags=re.S)
            n_clean = html_lib.unescape(re.sub(r"<[^>]+>", "", n_clean).strip())

            oz_m = re.search(r'data-oz="([^"]+)"', m_attrs)
            cnt_m = re.search(r'data-count="([^"]+)"', m_attrs)
            unit_m = re.search(r'data-unit="([^"]+)"', m_attrs)
            barspoon = 'data-barspoon="true"' in m_attrs

            oz_val = float(oz_m.group(1)) if oz_m else 0.0
            cnt_val = float(cnt_m.group(1)) if cnt_m else 0.0
            unit_val = unit_m.group(1) if unit_m else ""

            specs.append(
                SpecItem(
                    measure_text=m_text,
                    name=n_clean,
                    oz=oz_val,
                    count=cnt_val,
                    unit=unit_val,
                    is_barspoon=barspoon,
                    is_garnish=is_garnish,
                )
            )

        recipes.append(
            CocktailRecipe(
                card_id=cid,
                title=title,
                glass_desc=glass_desc,
                technique=technique,
                specs=specs,
            )
        )
    return recipes


def extract_layers_and_accents(recipe: CocktailRecipe):
    layers = []
    drops = []
    has_absinthe_rinse = False
    sugar_cubes = 0
    garnish_parts = []
    rim_text = ""
    has_smoke = "SMOKED" in recipe.technique.upper() or "smoked" in recipe.glass_desc.lower()

    alt_patterns = ["woven", "dots", "cross", "diagonal", "dashes", "diagonal_weave"]

    for sp in recipe.specs:
        low_name = sp.name.lower()
        low_meas = sp.measure_text.lower()

        if sp.is_garnish:
            if low_meas == "rim" or "rim" in low_name:
                rim_text = sp.name
            garnish_parts.append(sp.name)
            continue

        if low_meas in ("smoke", "prep") or "smoke" in low_name:
            has_smoke = True
            continue

        if low_meas == "ampule" and "0.5 oz" not in low_name:
            garnish_parts.append(sp.name)
            continue

        if sp.is_barspoon and ("rinse" in low_name or "absinthe" in low_name):
            has_absinthe_rinse = True
            continue

        if sp.unit in ("dash", "drop", "spray"):
            c = max(1, int(round(sp.count)))
            b_color = "#d9783a"
            if "peychaud" in low_name or "fire" in low_name:
                b_color = "#d65a4a"
            elif "celery" in low_name or "absinthe" in low_name:
                b_color = "#86b478"
            elif "orange" in low_name:
                b_color = "#eba844"
            drops.append({"count": c, "color": b_color, "name": sp.name})
            continue

        if sp.unit == "cube":
            sugar_cubes += max(1, int(round(sp.count)))
            continue

        if sp.unit in ("leaf", "slice", "bean", "sprig"):
            garnish_parts.append(sp.name)
            continue
        if sp.unit == "piece":
            if "egg white" in low_name:
                oz = 0.75
            else:
                garnish_parts.append(sp.name)
                continue
        elif sp.oz > 0:
            oz = sp.oz
        elif sp.unit == "tsp":
            if "cinnamon" in low_name or "nutmeg" in low_name:
                garnish_parts.append(sp.name)
                continue
            oz = sp.count * 0.167
        elif sp.unit == "tbsp":
            oz = sp.count * 0.5
        elif sp.unit == "cup":
            oz = sp.count * 8.0
        elif sp.unit == "splash":
            oz = sp.count * 0.2
        elif low_meas == "to top":
            oz = 1.0 if "cream" in low_name else 2.0
        elif low_meas.startswith("ampule"):
            oz = 0.5
        else:
            continue

        color, pattern = classify_ingredient_style(sp.name, len(layers))
        # Ensure adjacent layers never share identical pattern
        if layers and layers[-1]["pattern"] == pattern and pattern not in ("bubbles", "foam"):
            for cand in alt_patterns:
                if cand != pattern:
                    pattern = cand
                    break

        meas_lbl = sp.measure_text
        if low_meas.startswith("ampule"):
            meas_lbl = "0.5 oz"
        elif "barspoon" in low_meas:
            meas_lbl = "1 bsp"
        elif low_meas == "1" and "egg white" in low_name:
            meas_lbl = "1 egg"
        layers.append(
            {
                "name": sp.name,
                "short_label": shorten_ingredient_name(sp.name),
                "measure_label": meas_lbl,
                "oz": oz,
                "raw_oz_attr": sp.oz,
                "raw_count_attr": sp.count,
                "raw_unit_attr": sp.unit,
                "is_barspoon": sp.is_barspoon,
                "color": color,
                "pattern": pattern,
            }
        )

    garnish_str = " · ".join(garnish_parts)
    if "rim" in recipe.glass_desc.lower() and not rim_text:
        rim_text = recipe.glass_desc

    return {
        "layers": layers,
        "drops": drops,
        "has_absinthe_rinse": has_absinthe_rinse,
        "sugar_cubes": sugar_cubes,
        "garnish_text": garnish_str,
        "rim_text": rim_text,
        "has_smoke": has_smoke,
    }


def make_pattern_defs(uid: str, layers: list) -> str:
    defs = []
    for i, lyr in enumerate(layers):
        pid = f"pat-{uid}-{i}"
        col = lyr["color"]
        ptype = lyr["pattern"]

        if ptype == "woven":
            defs.append(
                f'<pattern id="{pid}" width="8" height="8" patternUnits="userSpaceOnUse">'
                f'<rect width="8" height="8" fill="{col}" fill-opacity="0.11"/>'
                f'<line x1="2" y1="1.5" x2="2" y2="6.5" stroke="{col}" stroke-width="1.15" stroke-opacity="0.82" stroke-linecap="round"/>'
                f'<line x1="5.5" y1="1.5" x2="5.5" y2="6.5" stroke="{col}" stroke-width="1.15" stroke-opacity="0.82" stroke-linecap="round"/>'
                f'<line x1="2" y1="4" x2="5.5" y2="4" stroke="{col}" stroke-width="0.9" stroke-opacity="0.55"/>'
                f"</pattern>"
            )
        elif ptype == "dots":
            defs.append(
                f'<pattern id="{pid}" width="7" height="7" patternUnits="userSpaceOnUse">'
                f'<rect width="7" height="7" fill="{col}" fill-opacity="0.09"/>'
                f'<circle cx="2" cy="2" r="1.15" fill="{col}" fill-opacity="0.85"/>'
                f'<circle cx="5.5" cy="5.5" r="1.15" fill="{col}" fill-opacity="0.85"/>'
                f"</pattern>"
            )
        elif ptype == "cross":
            defs.append(
                f'<pattern id="{pid}" width="8" height="8" patternUnits="userSpaceOnUse">'
                f'<rect width="8" height="8" fill="{col}" fill-opacity="0.12"/>'
                f'<path d="M4 1.8V6.2M1.8 4H6.2" stroke="{col}" stroke-width="1.05" stroke-opacity="0.82" stroke-linecap="round"/>'
                f"</pattern>"
            )
        elif ptype == "diagonal_weave":
            defs.append(
                f'<pattern id="{pid}" width="8" height="8" patternUnits="userSpaceOnUse">'
                f'<rect width="8" height="8" fill="{col}" fill-opacity="0.11"/>'
                f'<path d="M1.5 6L4 2L6.5 6" fill="none" stroke="{col}" stroke-width="1.05" stroke-opacity="0.8" stroke-linecap="round" stroke-linejoin="round"/>'
                f"</pattern>"
            )
        elif ptype == "diagonal":
            defs.append(
                f'<pattern id="{pid}" width="7" height="7" patternUnits="userSpaceOnUse">'
                f'<rect width="7" height="7" fill="{col}" fill-opacity="0.10"/>'
                f'<line x1="1.5" y1="5.5" x2="5.5" y2="1.5" stroke="{col}" stroke-width="1.1" stroke-opacity="0.82" stroke-linecap="round"/>'
                f"</pattern>"
            )
        elif ptype == "dashes":
            defs.append(
                f'<pattern id="{pid}" width="10" height="6" patternUnits="userSpaceOnUse">'
                f'<rect width="10" height="6" fill="{col}" fill-opacity="0.12"/>'
                f'<line x1="1.5" y1="2" x2="5.5" y2="2" stroke="{col}" stroke-width="1.15" stroke-opacity="0.85" stroke-linecap="round"/>'
                f'<line x1="5.5" y1="5" x2="9" y2="5" stroke="{col}" stroke-width="1.15" stroke-opacity="0.85" stroke-linecap="round"/>'
                f"</pattern>"
            )
        elif ptype == "bubbles":
            defs.append(
                f'<pattern id="{pid}" width="12" height="12" patternUnits="userSpaceOnUse">'
                f'<rect width="12" height="12" fill="{col}" fill-opacity="0.07"/>'
                f'<circle cx="3.5" cy="8.5" r="1.7" fill="none" stroke="{col}" stroke-width="0.95" stroke-opacity="0.78"/>'
                f'<circle cx="9" cy="4" r="1.2" fill="none" stroke="{col}" stroke-width="0.9" stroke-opacity="0.7"/>'
                f'<circle cx="6.5" cy="10.5" r="0.7" fill="{col}" fill-opacity="0.65"/>'
                f"</pattern>"
            )
        else:  # 'foam'
            defs.append(
                f'<pattern id="{pid}" width="5" height="5" patternUnits="userSpaceOnUse">'
                f'<rect width="5" height="5" fill="{col}" fill-opacity="0.18"/>'
                f'<circle cx="1.5" cy="1.5" r="0.9" fill="{col}" fill-opacity="0.9"/>'
                f'<circle cx="4" cy="3.8" r="0.75" fill="{col}" fill-opacity="0.75"/>'
                f"</pattern>"
            )

    return "\n".join(defs)


def get_glass_geometry(glass_type: str) -> dict:
    cx = 152.0

    if glass_type == "coupe":
        y_top, y_bot = 176.0, 266.0
        clip = (
            f"M {cx-74} {y_top} "
            f"C {cx-74} {y_top+52}, {cx-42} {y_bot}, {cx} {y_bot} "
            f"C {cx+42} {y_bot}, {cx+74} {y_top+52}, {cx+74} {y_top} Z"
        )
        outline = (
            f'<path d="M {cx-75} {y_top} C {cx-75} {y_top+53}, {cx-43} {y_bot+1}, {cx} {y_bot+1} '
            f'C {cx+43} {y_bot+1}, {cx+75} {y_top+53}, {cx+75} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
            f'<line x1="{cx}" y1="{y_bot+1}" x2="{cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/>'
            f'<path d="M {cx-44} 350 L {cx+44} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>'
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
            half_w = 74.0 * math.sqrt(t)
            return cx - half_w, cx + half_w

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    if glass_type == "nick_nora":
        y_top, y_bot = 172.0, 270.0
        clip = (
            f"M {cx-58} {y_top} "
            f"C {cx-58} {y_top+62}, {cx-32} {y_bot}, {cx} {y_bot} "
            f"C {cx+32} {y_bot}, {cx+58} {y_top+62}, {cx+58} {y_top} Z"
        )
        outline = (
            f'<path d="M {cx-59} {y_top} C {cx-59} {y_top+63}, {cx-33} {y_bot+1}, {cx} {y_bot+1} '
            f'C {cx+33} {y_bot+1}, {cx+59} {y_top+63}, {cx+59} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
            f'<line x1="{cx}" y1="{y_bot+1}" x2="{cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/>'
            f'<path d="M {cx-40} 350 L {cx+40} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>'
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
            half_w = 58.0 * (t ** 0.45)
            return cx - half_w, cx + half_w

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    if glass_type == "martini":
        y_top, y_bot = 174.0, 272.0
        clip = f"M {cx-78} {y_top} L {cx} {y_bot} L {cx+78} {y_top} Z"
        outline = (
            f'<path d="M {cx-79} {y_top} L {cx} {y_bot+1} L {cx+79} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<line x1="{cx}" y1="{y_bot+1}" x2="{cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/>'
            f'<path d="M {cx-44} 350 L {cx+44} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>'
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
            half_w = 78.0 * t
            return cx - half_w, cx + half_w

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    if glass_type in ("highball", "pint"):
        y_top, y_bot = 146.0, 346.0
        top_hw = 54.0 if glass_type == "highball" else 62.0
        bot_hw = 44.0 if glass_type == "highball" else 46.0
        clip = f"M {cx-top_hw} {y_top} L {cx-bot_hw} {y_bot} L {cx+bot_hw} {y_bot} L {cx+top_hw} {y_top} Z"
        outline = (
            f'<path d="M {cx-top_hw-1} {y_top} L {cx-bot_hw-1} {y_bot+2} Q {cx-bot_hw-1} {y_bot+6} {cx-bot_hw+4} {y_bot+6} '
            f'L {cx+bot_hw-4} {y_bot+6} Q {cx+bot_hw+1} {y_bot+6} {cx+bot_hw+1} {y_bot+2} L {cx+top_hw+1} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
            hw = bot_hw + (top_hw - bot_hw) * t
            return cx - hw, cx + hw

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    if glass_type in ("mug", "irish_coffee"):
        y_top = 165.0 if glass_type == "irish_coffee" else 185.0
        y_bot = 312.0 if glass_type == "irish_coffee" else 344.0
        top_hw, bot_hw = 56.0, 48.0
        clip = f"M {cx-top_hw} {y_top} L {cx-bot_hw} {y_bot} L {cx+bot_hw} {y_bot} L {cx+top_hw} {y_top} Z"
        handle = (
            f'<path d="M {cx-top_hw+2} {y_top+24} C {cx-top_hw-30} {y_top+24}, {cx-bot_hw-30} {y_bot-24}, {cx-bot_hw+2} {y_bot-24}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
        )
        foot = ""
        if glass_type == "irish_coffee":
            foot = (
                f'<line x1="{cx}" y1="{y_bot+5}" x2="{cx}" y2="350" stroke="#d8c7b4" stroke-width="2.2"/>'
                f'<path d="M {cx-38} 350 L {cx+38} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>'
            )
        outline = (
            f'<path d="M {cx-top_hw-1} {y_top} L {cx-bot_hw-1} {y_bot+1} Q {cx-bot_hw-1} {y_bot+5} {cx-bot_hw+4} {y_bot+5} '
            f'L {cx+bot_hw-4} {y_bot+5} Q {cx+bot_hw+1} {y_bot+5} {cx+bot_hw+1} {y_bot+1} L {cx+top_hw+1} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
            + handle
            + foot
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
            hw = bot_hw + (top_hw - bot_hw) * t
            return cx - hw, cx + hw

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    if glass_type == "bottle":
        y_top, y_bot = 132.0, 350.0
        clip = (
            f"M {cx-16} {y_top} L {cx-18} 190 C {cx-18} 218, {cx-44} 230, {cx-44} 256 "
            f"L {cx-44} {y_bot} L {cx+44} {y_bot} L {cx+44} 256 C {cx+44} 230, {cx+18} 218, {cx+18} 190 L {cx+16} {y_top} Z"
        )
        outline = (
            f'<path d="M {cx-17} {y_top} L {cx-19} 190 C {cx-19} 218, {cx-45} 230, {cx-45} 256 '
            f'L {cx-45} {y_bot} Q {cx-45} {y_bot+4} {cx-40} {y_bot+4} L {cx+40} {y_bot+4} Q {cx+45} {y_bot+4} {cx+45} {y_bot} '
            f'L {cx+45} 256 C {cx+45} 230, {cx+19} 218, {cx+19} 190 L {cx+17} {y_top}" '
            f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
        )

        def width_at_y(y: float) -> Tuple[float, float]:
            if y < 195:
                return cx - 17, cx + 17
            if y < 250:
                t = (y - 195) / 55.0
                hw = 17 + 27 * t
                return cx - hw, cx + hw
            return cx - 44, cx + 44

        return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}

    y_top, y_bot = 184.0, 346.0
    top_hw, bot_hw = 74.0, 53.0
    clip = f"M {cx-top_hw} {y_top} L {cx-bot_hw} {y_bot} L {cx+bot_hw} {y_bot} L {cx+top_hw} {y_top} Z"
    beads = ""
    if glass_type == "julep":
        beads = (
            f'<line x1="{cx-top_hw-2}" y1="{y_top+3}" x2="{cx+top_hw+2}" y2="{y_top+3}" stroke="#d8c7b4" stroke-width="1.2" stroke-dasharray="2 2"/>'
        )
    outline = (
        f'<path d="M {cx-top_hw-1} {y_top} L {cx-bot_hw-1} {y_bot+1} Q {cx-bot_hw-1} {y_bot+5} {cx-bot_hw+4} {y_bot+5} '
        f'L {cx+bot_hw-4} {y_bot+5} Q {cx+bot_hw+1} {y_bot+5} {cx+bot_hw+1} {y_bot+1} L {cx+top_hw+1} {y_top}" '
        f'fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>'
        + beads
    )

    def width_at_y(y: float) -> Tuple[float, float]:
        t = max(0.0, min(1.0, (y_bot - y) / (y_bot - y_top)))
        hw = bot_hw + (top_hw - bot_hw) * t
        return cx - hw, cx + hw

    return {"clip": clip, "outline": outline, "y_top": y_top, "y_bot": y_bot, "cx": cx, "width_at_y": width_at_y}


def build_garnish_svg(
    garnish_text: str,
    rim_text: str,
    has_smoke: bool,
    drops: list,
    sugar_cubes: int,
    has_absinthe_rinse: bool,
    geom: dict,
    liquid_top_y: float,
) -> str:
    elements = []
    cx = geom["cx"]
    y_top = geom["y_top"]
    y_bot = geom["y_bot"]
    xl_top, xr_top = geom["width_at_y"](y_top)
    xl_bot, xr_bot = geom["width_at_y"](y_bot)
    xl_liq, xr_liq = geom["width_at_y"](liquid_top_y)

    g_low = garnish_text.lower()

    # 1. Absinthe Rinse open-top inner U-glow (Sazerac)
    if has_absinthe_rinse:
        elements.append(
            f'<path d="M {xl_top+4:.1f} {y_top+6:.1f} L {xl_bot+3:.1f} {y_bot-3:.1f} '
            f'L {xr_bot-3:.1f} {y_bot-3:.1f} L {xr_top-4:.1f} {y_top+6:.1f}" '
            f'fill="none" stroke="#86b478" stroke-width="3" stroke-opacity="0.55" stroke-dasharray="4 3" stroke-linecap="round"/>'
        )

    # 2. Sugar Cubes at bottom of glass
    if sugar_cubes > 0:
        for c_idx in range(min(sugar_cubes, 3)):
            sx = cx - 14 + c_idx * 16
            sy = y_bot - 14
            elements.append(
                f'<rect x="{sx}" y="{sy}" width="11" height="11" rx="1.5" fill="#14100e" stroke="#e8c86b" stroke-width="1.2" stroke-dasharray="2 1.5"/>'
            )

    # 3. Rim treatment (Salt / Sugar / Tajín / Chocolate)
    if rim_text:
        r_col = "#f2e6d8"
        if "tajín" in rim_text.lower() or "chili" in rim_text.lower():
            r_col = "#d65a4a"
        elif "cinnamon" in rim_text.lower():
            r_col = "#d9822b"
        elif "chocolate" in rim_text.lower():
            r_col = "#c96567"
        num_dots = 26
        for d in range(num_dots + 1):
            rx = xl_top + (xr_top - xl_top) * (d / num_dots)
            ry = y_top + (2.5 if d % 2 == 0 else -1.5)
            elements.append(f'<circle cx="{rx:.1f}" cy="{ry:.1f}" r="1.3" fill="{r_col}" fill-opacity="0.88"/>')

    # 4. Bitters Dashes / Drops on the upper right (Just like Regarding Cocktails reference!)
    total_drops = sum(d["count"] for d in drops)
    if total_drops > 0:
        flat_drops = []
        for d in drops:
            for _ in range(d["count"]):
                flat_drops.append(d["color"])
        flat_drops = flat_drops[:6]
        drop_x = xr_liq - 16.0
        base_drop_y = min(liquid_top_y - 9.0, y_top + 26.0)
        for idx, d_col in enumerate(flat_drops):
            dy = base_drop_y - idx * 12.5
            elements.append(
                f'<path d="M {drop_x:.1f} {dy-5:.1f} '
                f'C {drop_x+3.5:.1f} {dy-0.5:.1f}, {drop_x+3.5:.1f} {dy+3.5:.1f}, {drop_x:.1f} {dy+3.5:.1f} '
                f'C {drop_x-3.5:.1f} {dy+3.5:.1f}, {drop_x-3.5:.1f} {dy-0.5:.1f}, {drop_x:.1f} {dy-5:.1f} Z" '
                f'fill="none" stroke="{d_col}" stroke-width="1.35"/>'
            )

    # 5. Primary Garnish Illustrations
    gy = min(liquid_top_y - 8.0, y_top + 6.0)

    # 5a. Signature Regarding Cocktails Looping Citrus Twist / Peel / Swath
    if any(k in g_low for k in ("twist", "peel", "swath")):
        p_col = "#e8c86b"
        if "orange" in g_low:
            p_col = "#e8993a"
        elif "grapefruit" in g_low:
            p_col = "#df7362"
        elif "lime" in g_low:
            p_col = "#a8c66c"

        sx = cx - 42.0
        sy = gy - 4.0
        elements.append(
            f'<g fill="none" stroke="{p_col}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M {sx:.1f} {sy-12:.1f} '
            f'C {sx:.1f} {sy+10:.1f}, {sx+34:.1f} {sy+12:.1f}, {sx+36:.1f} {sy-12:.1f} '
            f'C {sx+38:.1f} {sy-30:.1f}, {sx+16:.1f} {sy-30:.1f}, {sx+18:.1f} {sy-10:.1f} '
            f'C {sx+20:.1f} {sy+12:.1f}, {sx+64:.1f} {sy+12:.1f}, {sx+66:.1f} {sy-10:.1f} '
            f'C {sx+68:.1f} {sy-28:.1f}, {sx+48:.1f} {sy-28:.1f}, {sx+50:.1f} {sy-8:.1f} '
            f'C {sx+52:.1f} {sy+10:.1f}, {sx+82:.1f} {sy+8:.1f}, {sx+88:.1f} {sy-10:.1f}"/>'
            f'<path d="M {sx+4:.1f} {sy-12:.1f} '
            f'C {sx+4:.1f} {sy+6:.1f}, {sx+30:.1f} {sy+8:.1f}, {sx+32:.1f} {sy-12:.1f}" stroke-opacity="0.55" stroke-width="1.0"/>'
            f"</g>"
        )

    # 5b. Citrus / Apple / Cucumber / Jalapeño Wheel or Slice
    elif any(k in g_low for k in ("wheel", "slice", "wedge", "dehydrated")):
        w_col = "#e8c86b"
        if "jalapeño" in g_low:
            w_col = "#82b078"
        elif "lime" in g_low or "cucumber" in g_low:
            w_col = "#a8c66c"
        elif "orange" in g_low:
            w_col = "#e8993a"
        elif "apple" in g_low:
            w_col = "#df7362"

        wx = cx + 8.0
        wy = liquid_top_y - 2.0
        if "jalapeño" in g_low:
            elements.append(
                f'<g fill="#120d0b" stroke="{w_col}" stroke-width="1.4">'
                f'<circle cx="{wx:.1f}" cy="{wy:.1f}" r="14"/>'
                f'<circle cx="{wx:.1f}" cy="{wy:.1f}" r="9" fill="none" stroke-dasharray="3 2"/>'
                f'<circle cx="{wx-3:.1f}" cy="{wy-2:.1f}" r="1" fill="{w_col}"/>'
                f'<circle cx="{wx+3:.1f}" cy="{wy+2:.1f}" r="1" fill="{w_col}"/>'
                f'<circle cx="{wx+2:.1f}" cy="{wy-3:.1f}" r="1" fill="{w_col}"/>'
                f"</g>"
            )
        else:
            spokes = "".join(
                f'<line x1="{wx:.1f}" y1="{wy:.1f}" x2="{wx + 15*math.cos(a):.1f}" y2="{wy + 15*math.sin(a):.1f}" stroke="{w_col}" stroke-width="0.9" stroke-opacity="0.7"/>'
                for a in [i * math.pi / 4 for i in range(8)]
            )
            elements.append(
                f'<g>'
                f'<circle cx="{wx:.1f}" cy="{wy:.1f}" r="16" fill="#120d0b" stroke="{w_col}" stroke-width="1.5"/>'
                f'<circle cx="{wx:.1f}" cy="{wy:.1f}" r="13" fill="none" stroke="{w_col}" stroke-width="0.8" stroke-opacity="0.6"/>'
                f"{spokes}"
                f"</g>"
            )

    # 5c. Cocktail Cherry on Pick (or in base)
    if "cherry" in g_low or "raspberr" in g_low or "blackberr" in g_low or "cranberr" in g_low:
        c_col = "#c95959"
        if "base of glass" in g_low:
            elements.append(
                f'<circle cx="{cx:.1f}" cy="{y_bot-10:.1f}" r="6.5" fill="#180d0d" stroke="{c_col}" stroke-width="1.5"/>'
            )
        else:
            px = cx + 16.0
            py = liquid_top_y - 4.0
            elements.append(
                f'<g stroke="{c_col}" stroke-width="1.4" fill="none">'
                f'<line x1="{px-14:.1f}" y1="{py+16:.1f}" x2="{px+18:.1f}" y2="{py-22:.1f}" stroke="#d8c7b4" stroke-width="1.2"/>'
                f'<circle cx="{px+18:.1f}" cy="{py-22:.1f}" r="2" fill="#d8c7b4" stroke="none"/>'
                f'<circle cx="{px:.1f}" cy="{py:.1f}" r="6.5" fill="#180d0d" stroke="{c_col}" stroke-width="1.5"/>'
                f"</g>"
            )

    # 5d. Botanical Sprig (Rosemary / Mint / Thyme)
    if any(k in g_low for k in ("rosemary", "mint", "thyme", "sprig", "leaf")):
        b_col = "#86b478"
        bx = cx - 20.0
        by = liquid_top_y + 6.0
        elements.append(
            f'<g fill="none" stroke="{b_col}" stroke-width="1.35" stroke-linecap="round">'
            f'<path d="M {bx:.1f} {by+10:.1f} Q {bx-8:.1f} {by-15:.1f} {bx-16:.1f} {by-38:.1f}"/>'
            f'<path d="M {bx-4:.1f} {by-4:.1f} C {bx-14:.1f} {by-8:.1f}, {bx-14:.1f} {by-14:.1f}, {bx-5:.1f} {by-12:.1f}"/>'
            f'<path d="M {bx-4:.1f} {by-4:.1f} C {bx+4:.1f} {by-10:.1f}, {bx+4:.1f} {by-16:.1f}, {bx-5:.1f} {by-12:.1f}"/>'
            f'<path d="M {bx-9:.1f} {by-18:.1f} C {bx-19:.1f} {by-22:.1f}, {bx-19:.1f} {by-28:.1f}, {bx-10:.1f} {by-25:.1f}"/>'
            f'<path d="M {bx-9:.1f} {by-18:.1f} C {bx-1:.1f} {by-24:.1f}, {bx-1:.1f} {by-30:.1f}, {bx-10:.1f} {by-25:.1f}"/>'
            f'<path d="M {bx-13:.1f} {by-30:.1f} C {bx-22:.1f} {by-34:.1f}, {bx-20:.1f} {by-40:.1f}, {bx-14:.1f} {by-36:.1f}"/>'
            f"</g>"
        )

    # 5e. Cinnamon Stick
    if "cinnamon stick" in g_low:
        elements.append(
            f'<g transform="translate({cx+20:.1f}, {liquid_top_y-14:.1f}) rotate(18)">'
            f'<rect x="-3.5" y="-22" width="7" height="48" rx="2" fill="#14100e" stroke="#c87638" stroke-width="1.4"/>'
            f'<line x1="-1" y1="-18" x2="-1" y2="20" stroke="#c87638" stroke-width="0.8" stroke-opacity="0.6"/>'
            f"</g>"
        )

    # 5f. Coffee Beans (Espresso Martini / Snowed In)
    if "coffee bean" in g_low:
        for dx, dy, rot in [(-12, -2, -15), (0, -4, 10), (12, -2, -25)]:
            elements.append(
                f'<g transform="translate({cx+dx:.1f}, {liquid_top_y+dy:.1f}) rotate({rot})">'
                f'<ellipse cx="0" cy="0" rx="5" ry="3.2" fill="#14100e" stroke="#c88d55" stroke-width="1.2"/>'
                f'<path d="M -3.5 0 Q 0 1.2 3.5 0" fill="none" stroke="#c88d55" stroke-width="0.9"/>'
                f"</g>"
            )

    # 5g. Aromatic Smoke Wisps
    if has_smoke:
        elements.append(
            f'<g fill="none" stroke="#c7b9ab" stroke-width="1.1" stroke-opacity="0.45" stroke-linecap="round" stroke-dasharray="3 3">'
            f'<path d="M {cx-26:.1f} {y_top-6:.1f} C {cx-36:.1f} {y_top-22:.1f}, {cx-12:.1f} {y_top-30:.1f}, {cx-22:.1f} {y_top-46:.1f}"/>'
            f'<path d="M {cx+8:.1f} {y_top-10:.1f} C {cx-2:.1f} {y_top-26:.1f}, {cx+22:.1f} {y_top-34:.1f}, {cx+12:.1f} {y_top-50:.1f}"/>'
            f"</g>"
        )

    return "\n".join(elements)


def generate_cocktail_svg(recipe: CocktailRecipe) -> str:
    uid = re.sub(r"[^a-z0-9]+", "-", recipe.card_id.lower()).strip("-")
    glass_type, ice_type = classify_glass(recipe.glass_desc, recipe.card_id)
    parsed = extract_layers_and_accents(recipe)
    layers = parsed["layers"]

    geom = get_glass_geometry(glass_type)
    cx = geom["cx"]
    y_top = geom["y_top"]
    y_bot = geom["y_bot"]
    glass_h = y_bot - y_top

    total_oz = sum(l["oz"] for l in layers) or 3.0

    if ice_type in ("king_cube", "chili_cube"):
        fill_ratio = 0.76
    elif ice_type in ("cubes", "crushed"):
        fill_ratio = 0.80
    elif glass_type in ("coupe", "nick_nora", "martini"):
        fill_ratio = 0.78
    elif glass_type == "bottle":
        fill_ratio = 0.84
    else:
        fill_ratio = min(0.75, max(0.50, total_oz / 4.8))

    total_liq_h = glass_h * fill_ratio
    liquid_top_y = y_bot - total_liq_h

    raw_heights = [max(7.0, (l["oz"] / total_oz) * total_liq_h) for l in layers]
    scale_factor = total_liq_h / (sum(raw_heights) or 1.0)
    layer_heights = [h * scale_factor for h in raw_heights]

    pattern_defs = make_pattern_defs(uid, layers)

    ice_mask_cutouts = []
    ice_outlines = []

    if ice_type in ("king_cube", "chili_cube"):
        cube_w = 66.0
        cube_h = 68.0
        xl_at_liq, _ = geom["width_at_y"](liquid_top_y + 25.0)
        cube_x = xl_at_liq + 10.0
        cube_y = liquid_top_y + 1.0
        ice_mask_cutouts.append(
            f'<rect x="{cube_x:.1f}" y="{cube_y:.1f}" width="{cube_w:.1f}" height="{cube_h:.1f}" rx="1.5" fill="black"/>'
        )
        ice_outlines.append(
            f'<rect x="{cube_x:.1f}" y="{cube_y:.1f}" width="{cube_w:.1f}" height="{cube_h:.1f}" rx="1.5" '
            f'fill="#110c0a" fill-opacity="0.25" stroke="#dfd2c0" stroke-width="0.9" stroke-opacity="0.22"/>'
        )
        if ice_type == "chili_cube":
            ch_x = cube_x + cube_w * 0.5
            ch_y = cube_y + cube_h * 0.52
            ice_outlines.append(
                f'<path d="M {ch_x-12:.1f} {ch_y+6:.1f} Q {ch_x:.1f} {ch_y-8:.1f} {ch_x+14:.1f} {ch_y-4:.1f} '
                f'Q {ch_x+2:.1f} {ch_y+4:.1f} {ch_x-12:.1f} {ch_y+6:.1f} Z" fill="#d65a4a" fill-opacity="0.88"/>'
                f'<path d="M {ch_x+14:.1f} {ch_y-4:.1f} Q {ch_x+19:.1f} {ch_y-7:.1f} {ch_x+20:.1f} {ch_y-10:.1f}" '
                f'fill="none" stroke="#82b078" stroke-width="1.2" stroke-linecap="round"/>'
            )

    elif ice_type == "cubes":
        xl_at_liq, _ = geom["width_at_y"](liquid_top_y + 20.0)
        c1_x, c1_y, c1_s = xl_at_liq + 11.0, liquid_top_y + 3.0, 42.0
        c2_x, c2_y, c2_s = xl_at_liq + 21.0, liquid_top_y + 49.0, 38.0
        for cx_i, cy_i, cs_i, rot in [(c1_x, c1_y, c1_s, -5), (c2_x, c2_y, c2_s, 7)]:
            ice_mask_cutouts.append(
                f'<rect x="{cx_i:.1f}" y="{cy_i:.1f}" width="{cs_i:.1f}" height="{cs_i:.1f}" rx="1.5" '
                f'transform="rotate({rot} {cx_i+cs_i/2:.1f} {cy_i+cs_i/2:.1f})" fill="black"/>'
            )
            ice_outlines.append(
                f'<rect x="{cx_i:.1f}" y="{cy_i:.1f}" width="{cs_i:.1f}" height="{cs_i:.1f}" rx="1.5" '
                f'transform="rotate({rot} {cx_i+cs_i/2:.1f} {cy_i+cs_i/2:.1f})" '
                f'fill="#110c0a" fill-opacity="0.25" stroke="#dfd2c0" stroke-width="0.85" stroke-opacity="0.22"/>'
            )

    elif ice_type == "crushed":
        pebbles = [(-34, 4, 15), (-15, 9, 14), (5, 4, 15), (-25, 22, 13), (-5, 24, 14)]
        for dx, dy, sz in pebbles:
            px, py = cx + dx, liquid_top_y + dy
            ice_mask_cutouts.append(
                f'<rect x="{px:.1f}" y="{py:.1f}" width="{sz}" height="{sz}" rx="2" transform="rotate(18 {px+sz/2:.1f} {py+sz/2:.1f})" fill="black"/>'
            )
            ice_outlines.append(
                f'<rect x="{px:.1f}" y="{py:.1f}" width="{sz}" height="{sz}" rx="2" transform="rotate(18 {px+sz/2:.1f} {py+sz/2:.1f})" '
                f'fill="none" stroke="#dfd2c0" stroke-width="0.85" stroke-opacity="0.26"/>'
            )

    layer_rects = []
    callout_items = []
    curr_bottom = y_bot

    for i, lyr in enumerate(layers):
        lh = layer_heights[i]
        ly = curr_bottom - lh
        pid = f"pat-{uid}-{i}"
        col = lyr["color"]

        layer_rects.append(
            f'<rect x="40" y="{ly:.2f}" width="240" height="{lh:.2f}" fill="url(#{pid})"/>'
        )
        if i < len(layers) - 1:
            layer_rects.append(
                f'<line x1="40" y1="{ly:.2f}" x2="280" y2="{ly:.2f}" stroke="{col}" stroke-width="0.7" stroke-opacity="0.45" stroke-dasharray="2 2"/>'
            )
        else:
            layer_rects.append(
                f'<line x1="40" y1="{ly:.2f}" x2="280" y2="{ly:.2f}" stroke="{col}" stroke-width="1.1" stroke-opacity="0.7"/>'
            )

        mid_y = ly + lh * 0.5
        _, xr_mid = geom["width_at_y"](mid_y)
        callout_items.append(
            {
                "mid_y": mid_y,
                "xr": xr_mid,
                "color": col,
                "measure": lyr["measure_label"],
                "label": lyr["short_label"],
                "raw_oz": lyr["raw_oz_attr"],
                "raw_count": lyr["raw_count_attr"],
                "raw_unit": lyr["raw_unit_attr"],
                "is_barspoon": lyr["is_barspoon"],
            }
        )
        curr_bottom = ly

    callout_items.sort(key=lambda c: c["mid_y"])
    min_gap = 15.5
    label_ys = [c["mid_y"] for c in callout_items]
    for idx in range(1, len(label_ys)):
        if label_ys[idx] - label_ys[idx - 1] < min_gap:
            label_ys[idx] = label_ys[idx - 1] + min_gap

    callout_svg_parts = []
    for idx, c in enumerate(callout_items):
        ly_lbl = label_ys[idx]
        x_start = c["xr"] + 4.0
        x_elbow = 240.0
        x_text = 245.0
        col = c["color"]

        data_attrs = ""
        if c["raw_oz"] > 0:
            data_attrs += f' data-oz="{c["raw_oz"]:g}"'
            if c["is_barspoon"]:
                data_attrs += ' data-barspoon="true" data-short="true"'
        elif c["raw_count"] > 0 and c["raw_unit"]:
            data_attrs += f' data-count="{c["raw_count"]:g}" data-unit="{c["raw_unit"]}"'

        callout_svg_parts.append(
            f'<g class="spec-svg-callout">'
            f'<polyline points="{x_start:.1f},{c["mid_y"]:.1f} {x_elbow-6:.1f},{ly_lbl:.1f} {x_elbow:.1f},{ly_lbl:.1f}" '
            f'fill="none" stroke="{col}" stroke-width="0.85" stroke-opacity="0.65"/>'
            f'<circle cx="{x_start:.1f}" cy="{c["mid_y"]:.1f}" r="1.5" fill="{col}"/>'
            f'<text x="{x_text:.1f}" y="{ly_lbl+3:.1f}" fill="#f5efe8" font-family="\'JetBrains Mono\', monospace" font-size="8.2" letter-spacing="0.01em">'
            f'<tspan class="spec-measure"{data_attrs} fill="{col}" font-weight="600">{html_lib.escape(c["measure"])}</tspan> '
            f'<tspan fill="#c7b9ab">{html_lib.escape(c["label"])}</tspan>'
            f"</text>"
            f"</g>"
        )

    garnish_svg = build_garnish_svg(
        garnish_text=parsed["garnish_text"],
        rim_text=parsed["rim_text"],
        has_smoke=parsed["has_smoke"],
        drops=parsed["drops"],
        sugar_cubes=parsed["sugar_cubes"],
        has_absinthe_rinse=parsed["has_absinthe_rinse"],
        geom=geom,
        liquid_top_y=liquid_top_y,
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 460" width="100%" height="100%" class="cocktail-spec-svg" role="img" aria-label="{html_lib.escape(recipe.title)} proportional build diagram">
  <defs>
    <radialGradient id="bg-glow-{uid}" cx="38%" cy="52%" r="60%">
      <stop offset="0%" stop-color="#1d1511"/>
      <stop offset="65%" stop-color="#110c0a"/>
      <stop offset="100%" stop-color="#090605"/>
    </radialGradient>
    <clipPath id="glass-clip-{uid}">
      <path d="{geom['clip']}"/>
    </clipPath>
    <mask id="ice-mask-{uid}">
      <rect x="0" y="0" width="420" height="460" fill="white"/>
      {''.join(ice_mask_cutouts)}
    </mask>
    {pattern_defs}
  </defs>

  <!-- Subterranean Speakeasy Blueprint Canvas -->
  <rect width="420" height="460" fill="url(#bg-glow-{uid})"/>
  <rect x="14" y="14" width="392" height="432" rx="8" fill="none" stroke="#e8c59e" stroke-opacity="0.1" stroke-width="1"/>

  <!-- Proportional Patterned Liquid Layers (Clipped to Glass & Masked Around Ice) -->
  <g clip-path="url(#glass-clip-{uid})">
    <g mask="url(#ice-mask-{uid})">
      {''.join(layer_rects)}
    </g>
    {''.join(ice_outlines)}
  </g>

  <!-- Minimalist Open-Top Glass Silhouette -->
  {geom['outline']}

  <!-- Garnish, Bitters Droplets & Botanical Accents -->
  {garnish_svg}

  <!-- Proportional Layer Callouts -->
  {''.join(callout_svg_parts)}
</svg>"""
    return svg


def main():
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    recipes = parse_recipes_from_html(html_content)
    out_dir = os.path.join("assets", "specs")
    os.makedirs(out_dir, exist_ok=True)

    for r in recipes:
        svg_str = generate_cocktail_svg(r)
        slug = r.card_id.replace("archive-", "")
        out_path = os.path.join(out_dir, f"{slug}.svg")
        with open(out_path, "w", encoding="utf-8") as out_f:
            out_f.write(svg_str)

    print(f"Generated {len(recipes)} SVG cocktail diagrams in {out_dir}/")


if __name__ == "__main__":
    main()

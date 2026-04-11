"""Algorithmic color season derivation (no model needed).

Uses skin undertone + hair lightness + eye lightness to classify
into one of 12 color seasons (4 main + 8 sub-seasons).
"""


# Main seasons mapped to sub-seasons
_SEASONS = {
    "spring": ["light_spring", "warm_spring", "clear_spring"],
    "summer": ["light_summer", "cool_summer", "soft_summer"],
    "autumn": ["soft_autumn", "warm_autumn", "deep_autumn"],
    "winter": ["deep_winter", "cool_winter", "clear_winter"],
}

# Hair colors ordered roughly light → dark
_HAIR_LIGHTNESS = {
    "platinum_blonde": 9,
    "white": 9,
    "blonde": 8,
    "strawberry_blonde": 7,
    "light_brown": 6,
    "gray": 6,
    "auburn": 5,
    "red": 5,
    "brown": 4,
    "dark_brown": 3,
    "black": 1,
    "unknown": 5,
    "n/a": 5,
}

# Eye colors ordered roughly light → dark
_EYE_LIGHTNESS = {
    "blue": 8,
    "gray": 7,
    "green": 6,
    "hazel": 5,
    "amber": 4,
    "light_brown": 4,
    "brown": 3,
    "dark_brown": 2,
    "black": 1,
    "unknown": 4,
}


def derive_color_season(
    undertone: str,
    hair_color_name: str,
    eye_color_name: str,
    monk_tone: int,
) -> dict:
    """Derive color season from physical attributes.

    Args:
        undertone: "warm", "cool", or "neutral"
        hair_color_name: key from _HAIR_LIGHTNESS
        eye_color_name: key from _EYE_LIGHTNESS
        monk_tone: 1-10 (1=lightest, 10=darkest)

    Returns:
        {"season": "autumn", "subSeason": "warm_autumn", "palette": [...]}
    """
    hair_light = _HAIR_LIGHTNESS.get(hair_color_name, 5)
    eye_light = _EYE_LIGHTNESS.get(eye_color_name, 4)

    # Overall lightness score (0-10)
    # Weight: skin 40%, hair 35%, eyes 25%
    skin_lightness = 10 - monk_tone  # Invert: monk 1 = lightest = 9
    overall_lightness = (
        skin_lightness * 0.4 + hair_light * 0.35 + eye_light * 0.25
    )

    is_warm = undertone in ("warm", "neutral")  # Neutral leans warm
    is_light = overall_lightness >= 5.5

    # Contrast: difference between skin and hair/eye lightness
    contrast = abs(skin_lightness - hair_light) + abs(skin_lightness - eye_light)
    is_high_contrast = contrast > 6

    # Main season
    if is_warm and is_light:
        season = "spring"
    elif not is_warm and is_light:
        season = "summer"
    elif is_warm and not is_light:
        season = "autumn"
    else:
        season = "winter"

    # Sub-season refinement
    if season == "spring":
        if overall_lightness >= 7:
            sub = "light_spring"
        elif is_high_contrast:
            sub = "clear_spring"
        else:
            sub = "warm_spring"
    elif season == "summer":
        if overall_lightness >= 7:
            sub = "light_summer"
        elif not is_high_contrast:
            sub = "soft_summer"
        else:
            sub = "cool_summer"
    elif season == "autumn":
        if not is_high_contrast:
            sub = "soft_autumn"
        elif overall_lightness <= 3:
            sub = "deep_autumn"
        else:
            sub = "warm_autumn"
    else:  # winter
        if overall_lightness <= 3:
            sub = "deep_winter"
        elif is_high_contrast:
            sub = "clear_winter"
        else:
            sub = "cool_winter"

    return {
        "season": season,
        "subSeason": sub,
        "palette": _get_palette(sub),
    }


def _get_palette(sub_season: str) -> list[str]:
    """Return recommended hex colors for the sub-season."""
    palettes = {
        "light_spring": [
            "#FAEBD7", "#FFD700", "#FF6347", "#98FB98",
            "#FFC0CB", "#87CEEB", "#F0E68C", "#DDA0DD",
        ],
        "warm_spring": [
            "#FF8C00", "#FFD700", "#FF6347", "#228B22",
            "#DAA520", "#FF4500", "#FFDAB9", "#CD853F",
        ],
        "clear_spring": [
            "#FF0000", "#0000FF", "#FFD700", "#00FF00",
            "#FF1493", "#00CED1", "#FF4500", "#7B68EE",
        ],
        "light_summer": [
            "#E6E6FA", "#B0C4DE", "#DDA0DD", "#98FB98",
            "#FFC0CB", "#ADD8E6", "#F5DEB3", "#D8BFD8",
        ],
        "cool_summer": [
            "#4682B4", "#6A5ACD", "#BC8F8F", "#708090",
            "#9370DB", "#5F9EA0", "#C71585", "#2F4F4F",
        ],
        "soft_summer": [
            "#B0C4DE", "#D8BFD8", "#A9A9A9", "#BDB76B",
            "#8FBC8F", "#BC8F8F", "#C0C0C0", "#DEB887",
        ],
        "soft_autumn": [
            "#DEB887", "#BDB76B", "#BC8F8F", "#8FBC8F",
            "#D2B48C", "#CD853F", "#A0522D", "#808000",
        ],
        "warm_autumn": [
            "#FF8C00", "#B8860B", "#8B4513", "#228B22",
            "#CD853F", "#DAA520", "#A0522D", "#556B2F",
        ],
        "deep_autumn": [
            "#8B0000", "#800000", "#556B2F", "#2F4F4F",
            "#8B4513", "#4B0082", "#006400", "#800020",
        ],
        "deep_winter": [
            "#000080", "#8B0000", "#006400", "#4B0082",
            "#2F4F4F", "#800020", "#191970", "#800000",
        ],
        "cool_winter": [
            "#4169E1", "#C71585", "#2E8B57", "#708090",
            "#483D8B", "#B22222", "#20B2AA", "#696969",
        ],
        "clear_winter": [
            "#FF0000", "#0000FF", "#FFFFFF", "#000000",
            "#FF1493", "#00BFFF", "#FFD700", "#8A2BE2",
        ],
    }
    return palettes.get(sub_season, palettes["warm_autumn"])

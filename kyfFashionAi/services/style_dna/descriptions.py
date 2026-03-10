"""Human-readable description generator for Style DNA analysis results.

Maps raw pipeline output (body shape enums, Monk tones, hair types, etc.)
to natural language descriptions the user can understand.
"""


# ── Body Shape Descriptions ──────────────────────────────────────────────────

_BODY_SHAPE_DESC = {
    "inverted_triangle": (
        "an inverted triangle body shape - broader shoulders tapering to narrower hips. "
        "Structured tops and V-necks complement your frame well."
    ),
    "triangle": (
        "a triangle body shape - hips wider than shoulders. "
        "A-line and empire waist styles balance your proportions beautifully."
    ),
    "pear": (
        "a pear body shape - your hips are noticeably wider than your shoulders. "
        "Boat necks and structured shoulders help create visual balance."
    ),
    "rectangle": (
        "a rectangle body shape - your shoulders, waist, and hips are roughly the same width. "
        "Belted styles and peplum tops add definition at the waist."
    ),
    "hourglass": (
        "an hourglass body shape - balanced shoulders and hips with a defined waist. "
        "Wrap dresses and fitted styles highlight your natural proportions."
    ),
    "apple": (
        "an apple body shape - wider through the torso with slimmer legs. "
        "Empire waists and flowing fabrics create a flattering silhouette."
    ),
    "oval": (
        "an oval body shape - fuller midsection with narrower shoulders and hips. "
        "Vertical lines and monochromatic outfits create a streamlined look."
    ),
}

_HEIGHT_DESC = {
    "short": "on the shorter side",
    "medium": "of average height",
    "tall": "on the taller side",
}


def _describe_body(body: dict) -> str:
    shape = body.get("shape", "").lower()
    height = body.get("heightCategory", "").lower()

    desc = _BODY_SHAPE_DESC.get(shape, f"a {shape} body shape.")
    parts = [f"You have {desc}"]

    if height and height in _HEIGHT_DESC:
        parts.append(f"You appear to be {_HEIGHT_DESC[height]}.")

    return " ".join(parts)


# ── Face Descriptions ────────────────────────────────────────────────────────

_FACE_SHAPE_DESC = {
    "oval": "Your oval face shape is versatile - most hairstyles and accessories work well with it.",
    "round": "Your round face shape has soft, full features. Angular frames and longer hairstyles add definition.",
    "square": "Your square face shape has a strong jawline. Round frames and layered styles soften the angles.",
    "heart": "Your heart-shaped face has a wider forehead and pointed chin. Side-swept bangs balance beautifully.",
    "oblong": "Your oblong face shape is longer than wide. Width-adding styles and horizontal details complement it.",
    "diamond": "Your diamond face shape has wide cheekbones with a narrow forehead and chin. Oval frames suit you well.",
    "triangle": "Your triangle face shape has a wider jawline. Styles that add width at the forehead create balance.",
}


def _describe_face(face: dict) -> str:
    parts = []

    face_shape = face.get("faceShape", "").lower()
    if face_shape and face_shape in _FACE_SHAPE_DESC:
        parts.append(_FACE_SHAPE_DESC[face_shape])

    age_range = face.get("ageRange")
    if age_range and len(age_range) == 2:
        parts.append(f"Estimated age range: {age_range[0]}-{age_range[1]}.")

    gender = face.get("gender")
    if gender:
        parts.append(f"Detected as {gender}.")

    return " ".join(parts) if parts else "Face analysis completed."


# ── Skin Descriptions ────────────────────────────────────────────────────────

_MONK_TONE_DESC = {
    1: "Very light skin",
    2: "Light skin",
    3: "Light-medium skin",
    4: "Medium-light skin",
    5: "Medium skin",
    6: "Medium-tan skin",
    7: "Tan skin",
    8: "Medium-dark skin",
    9: "Dark skin",
    10: "Very dark skin",
}

_UNDERTONE_TIPS = {
    "warm": "Earth tones, warm metallics (gold, copper), and rich colors like olive, burgundy, and mustard complement your complexion.",
    "cool": "Jewel tones, silver metallics, and colors like navy, emerald, lavender, and berry suit you well.",
    "neutral": "You have the flexibility to wear both warm and cool tones. Most colors work with your balanced undertone.",
}


def _describe_skin(skin: dict) -> str:
    monk = skin.get("monkTone")
    undertone = skin.get("undertone", "").lower()

    parts = []
    if monk and monk in _MONK_TONE_DESC:
        parts.append(f"{_MONK_TONE_DESC[monk]} (Monk tone {monk})")
    if undertone:
        parts.append(f"with {undertone} undertones.")
    else:
        parts[-1] = parts[-1] + "." if parts else ""

    if undertone in _UNDERTONE_TIPS:
        parts.append(_UNDERTONE_TIPS[undertone])

    return " ".join(parts) if parts else "Skin analysis completed."


# ── Hair Descriptions ────────────────────────────────────────────────────────

def _describe_hair(hair: dict) -> str:
    hair_type = hair.get("type", "").lower()
    color_info = hair.get("color", {})
    color_name = color_info.get("name", "").replace("_", " ") if color_info else ""
    baldness = hair.get("baldnessLevel", 0)

    if hair_type == "bald" or (isinstance(baldness, int) and baldness >= 4):
        return "You appear to have a bald or closely-shaved head. Clean, confident, and low-maintenance."

    parts = []
    if color_name and color_name not in ("unknown", "n/a"):
        parts.append(f"{color_name.title()}")
    if hair_type and hair_type not in ("unknown",):
        parts.append(f"{hair_type} hair.")
    else:
        if parts:
            parts[-1] = parts[-1] + " hair."

    return " ".join(parts) if parts else "Hair analysis completed."


# ── Eye Descriptions ─────────────────────────────────────────────────────────

def _describe_eyes(eyes: dict) -> str:
    shape = eyes.get("shape", "").lower()
    color_info = eyes.get("color", {})
    color_name = color_info.get("name", "").replace("_", " ") if color_info else ""

    parts = []
    if shape and shape != "unknown":
        parts.append(f"{shape.title()}-shaped")
    if color_name and color_name != "unknown":
        parts.append(f"{color_name}")

    if parts:
        return " ".join(parts) + " eyes."
    return "Eye analysis completed."


# ── Color Season Descriptions ────────────────────────────────────────────────

_SEASON_DESC = {
    "light_spring": "Light Spring - soft, warm, and light colors like peach, coral, and warm pastels bring out your natural glow.",
    "warm_spring": "Warm Spring - golden, warm hues like amber, tangerine, and warm green complement your coloring.",
    "clear_spring": "Clear Spring - bright, vivid warm colors like true red, cobalt blue, and sunshine yellow make you shine.",
    "light_summer": "Light Summer - delicate, cool pastels like lavender, powder blue, and soft pink harmonize with your features.",
    "cool_summer": "Cool Summer - muted, cool tones like slate blue, mauve, and sage green enhance your natural coloring.",
    "soft_summer": "Soft Summer - gentle, dusty tones like muted rose, soft teal, and dove gray suit you beautifully.",
    "soft_autumn": "Soft Autumn - muted, warm earth tones like camel, sage, and dusty rose complement your complexion.",
    "warm_autumn": "Warm Autumn - rich earth tones like burnt orange, olive, chocolate brown, and deep gold suit you perfectly.",
    "deep_autumn": "Deep Autumn - dark, warm, and intense colors like burgundy, forest green, and espresso bring out your depth.",
    "deep_winter": "Deep Winter - bold, dark colors like black, navy, deep emerald, and rich burgundy create striking contrast.",
    "cool_winter": "Cool Winter - icy, cool tones like royal blue, magenta, and pine green complement your high contrast features.",
    "clear_winter": "Clear Winter - vivid, high-contrast colors like true red, bright white, and electric blue make a statement.",
}


def _describe_color_season(cs: dict) -> str:
    sub = cs.get("subSeason", "").lower()
    season = cs.get("season", "").capitalize()

    if sub in _SEASON_DESC:
        return f"Your color season is {_SEASON_DESC[sub]}"

    if season:
        return f"Your color season is {season}. Choose colors that align with your season's palette for the most flattering looks."

    return "Color season analysis completed."


# ── Summary Builder ──────────────────────────────────────────────────────────

def _build_summary(desc: dict) -> str:
    """Build a one-paragraph summary from individual descriptions."""
    parts = []

    if "body" in desc:
        # Extract just the first sentence
        first = desc["body"].split(".")[0] + "."
        parts.append(first)

    if "face" in desc:
        first = desc["face"].split(".")[0] + "."
        parts.append(first)

    if "skin" in desc:
        # Take the tone + undertone part (first sentence-ish)
        first = desc["skin"].split(".")[0] + "."
        parts.append(first)

    if "hair" in desc:
        first = desc["hair"].split(".")[0] + "."
        parts.append(first)

    if "eyes" in desc:
        parts.append(desc["eyes"])

    if "colorSeason" in desc:
        first = desc["colorSeason"].split(".")[0] + "."
        parts.append(first)

    return " ".join(parts) if parts else "Style DNA analysis completed."


# ── Public API ───────────────────────────────────────────────────────────────

def generate_descriptions(result: dict) -> dict:
    """Generate human-readable descriptions from Style DNA pipeline output.

    Args:
        result: Raw pipeline output dict with keys: body, face, eyes, skin, hair, colorSeason

    Returns:
        Dict mapping category names to description strings, plus a 'summary' key.
    """
    desc = {}

    if result.get("body"):
        desc["body"] = _describe_body(result["body"])

    if result.get("face"):
        desc["face"] = _describe_face(result["face"])

    if result.get("skin"):
        desc["skin"] = _describe_skin(result["skin"])

    if result.get("hair"):
        desc["hair"] = _describe_hair(result["hair"])

    if result.get("eyes"):
        desc["eyes"] = _describe_eyes(result["eyes"])

    if result.get("colorSeason"):
        desc["colorSeason"] = _describe_color_season(result["colorSeason"])

    desc["summary"] = _build_summary(desc)

    return desc

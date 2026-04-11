/**
 * ===================================================================
 *  SHARED UTILITIES — Single source of truth for all AI engines
 * ===================================================================
 *
 *  Every category mapper, color vocabulary, and bridge logic lives here.
 *  All 4 engines import from this file. No duplication.
 * ===================================================================
 */

// ─────────────────────────────────────────────
// 1. INPUT FACTORS (canonical values for all builders & engines)
// ─────────────────────────────────────────────

export const GENDERS = ["Male", "Female"] as const;

export const OCCASIONS = [
  "Wedding: Haldi (Day)", "Wedding: Mehendi (Afternoon)", "Wedding: Sangeet (Night)",
  "Wedding: Main Pheras (Guest)", "Wedding: Reception (Night)",
  "Office: Daily Wear", "Office: Board Meeting", "Office: Friday Casuals",
  "Social: Clubbing", "Social: Dinner Date", "Social: Brunch",
  "Travel: Airport Look", "Travel: Beach Vacation",
] as const;

export const STYLE_VIBES = ["Classic", "Trendy", "Desi", "Fusion", "Old Money"] as const;
export const AGE_GROUPS = ["GenZ (16-25)", "Young Adult (26-35)", "Mid-Aged (36-50)", "Senior (50+)"] as const;
export const FIT_PREFS = ["Slim Fit", "Regular Fit", "Oversized"] as const;
export const SEASONS = ["Summer", "Winter", "Monsoon"] as const;
export const HEIGHTS = ["Short", "Medium", "Tall"] as const;
export const UNDERTONES = ["Warm", "Cool", "Olive", "Neutral"] as const;
export const SKIN_TONES = ["Fair", "Wheatish", "Dusky", "Dark Brown"] as const;

// CANONICAL BODY_SHAPES — ALL 8 values, used by EVERY builder
export const BODY_SHAPES = [
  "Trapezoid", "Rectangle", "Triangle", "Inverted_Triangle",
  "Oval", "Hourglass", "Pear", "Apple",
] as const;

// ─────────────────────────────────────────────
// 2. BRIDGE FACTORS (output of one engine → input of next)
// ─────────────────────────────────────────────

export const TOP_CATEGORIES = ["Ethnic Top", "Western Shirt", "T-Shirt/Top", "Dress/Saree"] as const;
export const BOTTOM_CATEGORIES = ["Formal Trousers", "Jeans/Chinos", "Ethnic Bottom", "Shorts/Skirts", "Open Bottom (Lehenga)"] as const;

export type TopCategory = typeof TOP_CATEGORIES[number];
export type BottomCategory = typeof BOTTOM_CATEGORIES[number];

// ─────────────────────────────────────────────
// 3. CATEGORY MAPPERS — one place, used by both engine_layer & engine_footwear
// ─────────────────────────────────────────────

/**
 * Maps a specific top item name → one of the 4 TOP_CATEGORIES.
 * Used by engine_layer and engine_footwear to bridge from engine_top output.
 */
export function getTopCategory(topName: string, gender: string): TopCategory {
  const lower = topName.toLowerCase();

  if (gender === "Male") {
    // Ethnic
    if (
      lower.includes("kurta") ||
      lower.includes("sherwani") ||
      lower.includes("pathani") ||
      lower.includes("bandhgala") ||
      lower.includes("nehru jacket")
    ) return "Ethnic Top";
    // Formal / Western
    if (lower.includes("shirt") && !lower.includes("t-shirt")) return "Western Shirt";
    // Casual fallback
    return "T-Shirt/Top";
  } else {
    // Ethnic
    if (
      lower.includes("kurti") ||
      lower.includes("suit") ||
      lower.includes("anarkali") ||
      lower.includes("sharara") ||
      lower.includes("kaftan") ||
      lower.includes("ethnic jacket")
    ) return "Ethnic Top";
    // Saree / Lehenga / Gown
    if (
      lower.includes("saree") ||
      lower.includes("lehenga") ||
      lower.includes("gown") ||
      lower.includes("drape")
    ) return "Dress/Saree";
    // Western fallback
    return "Western Shirt";
  }
}

/**
 * Maps a specific bottom item name → one of the 5 BOTTOM_CATEGORIES.
 * Used by engine_footwear to bridge from engine_pair output.
 */
export function getBottomCategory(bottomName: string, _gender: string): BottomCategory {
  const lower = bottomName.toLowerCase();

  // Ethnic bottoms
  if (
    lower.includes("dhoti") ||
    lower.includes("pajama") ||
    lower.includes("salwar") ||
    lower.includes("churidar") ||
    lower.includes("patiala")
  ) return "Ethnic Bottom";

  // Open / flared bottoms
  if (
    lower.includes("lehenga") ||
    lower.includes("gharara") ||
    lower.includes("saree")
  ) return "Open Bottom (Lehenga)";

  // Shorts / skirts
  if (lower.includes("shorts") || lower.includes("skirt")) return "Shorts/Skirts";

  // Formal
  if (
    lower.includes("trouser") ||
    lower.includes("formal") ||
    lower.includes("cigarette")
  ) return "Formal Trousers";

  // Default: jeans/chinos
  return "Jeans/Chinos";
}

// ─────────────────────────────────────────────
// 4. OCCASION CONTEXT MAPPER — used by builder_top, builder_layer, builder_footwear
// ─────────────────────────────────────────────

export type OccasionContext = "Wedding" | "Office" | "Social" | "Travel";

/**
 * Maps a detailed occasion string → a broad context group.
 * Consistent across all builders/engines.
 */
export function getOccasionContext(occasion: string): OccasionContext {
  if (occasion.includes("Wedding") || occasion.includes("Festival")) return "Wedding";
  if (occasion.includes("Office") || occasion.includes("Board")) return "Office";
  if (occasion.includes("Travel") || occasion.includes("Beach")) return "Travel";
  return "Social";
}

// ─────────────────────────────────────────────
// 5. CANONICAL COLOR VOCABULARY
// ─────────────────────────────────────────────
//
// All engines must output colors from this list.
// Each color is a single, specific, actionable color name.
// No slashes, no "matching tone", no fabric names.

export const OUTPUT_COLORS = [
  // Neutrals
  "Black",
  "Charcoal Grey",
  "Grey",
  "White",
  "Off-White",
  "Cream",
  "Ivory",
  "Beige",
  "Khaki",
  "Nude",

  // Browns
  "Tan",
  "Camel",
  "Coffee Brown",
  "Dark Brown",
  "Chocolate",

  // Blues
  "Navy",
  "Royal Blue",
  "Midnight Blue",
  "Baby Blue",
  "Teal",

  // Reds / Pinks
  "Maroon",
  "Deep Wine",
  "Red",
  "Dusty Rose",
  "Baby Pink",
  "Coral",
  "Peach",

  // Greens
  "Olive",
  "Emerald",
  "Sage Green",

  // Yellows / Oranges
  "Mustard",
  "Marigold",
  "Rust",
  "Gold",

  // Purples
  "Lavender",
  "Plum",

  // Metallics
  "Silver",
  "Rose Gold",
] as const;

export type OutputColor = typeof OUTPUT_COLORS[number];

// ─────────────────────────────────────────────
// 6. COLOR MATCHING HELPERS
// ─────────────────────────────────────────────

/**
 * Given a top color, returns coordinating colors for the bottom/pair.
 * Used by engine_pair. Returns canonical OUTPUT_COLORS values only.
 */
export function getPairColor(
  baseColor: string,
  skinTone: string
): { classic: OutputColor; trendy: OutputColor } {
  const isDark = skinTone === "Dusky" || skinTone === "Dark Brown";

  const map: Record<string, { classic: OutputColor; trendy: OutputColor; trendyDark?: OutputColor; classicDark?: OutputColor }> = {
    "Mustard":     { classic: "Navy",        trendy: "Charcoal Grey" },
    "Navy":        { classic: "Beige",       trendy: "Grey",          trendyDark: "Rust" },
    "White":       { classic: "Navy",        trendy: "Olive" },
    "Black":       { classic: "Khaki",       trendy: "Black",         classicDark: "Cream", trendyDark: "Rust" },
    "Jet Black":   { classic: "Khaki",       trendy: "Black",         classicDark: "Cream", trendyDark: "Rust" },
    "Charcoal":    { classic: "Black",       trendy: "Navy" },
    "Maroon":      { classic: "Beige",       trendy: "Black" },
    "Olive":       { classic: "Navy",        trendy: "Cream" },
    "Beige":       { classic: "Maroon",      trendy: "Coffee Brown" },
    "Ivory":       { classic: "Maroon",      trendy: "Coffee Brown" },
    "Rust":        { classic: "Navy",        trendy: "Off-White" },
    "Emerald":     { classic: "Black",       trendy: "Beige" },
    "Pink":        { classic: "White",       trendy: "Grey" },
    "Peach":       { classic: "White",       trendy: "Grey" },
    "Teal":        { classic: "Beige",       trendy: "Mustard" },
    "Royal Blue":  { classic: "White",       trendy: "Black" },
    "Gold":        { classic: "Maroon",      trendy: "Black" },
    "Silver":      { classic: "Black",       trendy: "Navy" },
    "Grey":        { classic: "Black",       trendy: "Navy" },
    "Coral":       { classic: "White",       trendy: "Navy" },
    "Lavender":    { classic: "Grey",        trendy: "Navy" },
    "Brown":       { classic: "Beige",       trendy: "Navy" },
  };

  const entry = map[baseColor] || { classic: "Navy" as OutputColor, trendy: "Grey" as OutputColor };
  return {
    classic: (isDark && entry.classicDark) ? entry.classicDark : entry.classic,
    trendy:  (isDark && entry.trendyDark)  ? entry.trendyDark  : entry.trendy,
  };
}

/**
 * Returns a suggested color for the layer piece based on the top's color and context.
 * Used by engine_layer. Returns canonical OUTPUT_COLORS values only.
 */
export function getLayerColorSuggestion(
  type: "Classic" | "Contrast" | "Statement",
  topColor: string,
  occasion: string,
  styleVibe: string,
  season: string
): OutputColor {
  const isWedding = occasion.includes("Wedding");
  const isOffice = occasion.includes("Office");

  if (type === "Classic") {
    if (isOffice) return "Navy";
    if (topColor.includes("White") || topColor.includes("Cream") || topColor.includes("Ivory")) return "Beige";
    if (topColor.includes("Black")) return "Charcoal Grey";
    if (topColor.includes("Navy")) return "Grey";
    return "Beige";
  }

  if (type === "Contrast") {
    if (topColor.includes("Yellow") || topColor.includes("Mustard") || topColor.includes("Marigold")) return "Emerald";
    if (topColor.includes("Green") || topColor.includes("Olive") || topColor.includes("Emerald")) return isWedding ? "Peach" : "Beige";
    if (topColor.includes("Blue") || topColor.includes("Navy") || topColor.includes("Royal")) return "White";
    if (topColor.includes("Red") || topColor.includes("Maroon") || topColor.includes("Wine")) return "Gold";
    if (topColor.includes("Black")) return isWedding ? "Gold" : "Tan";
    if (topColor.includes("White")) return "Maroon";
    return "Navy";
  }

  // Statement
  if (styleVibe === "Fusion") return "Mustard";
  if (isWedding) return "Gold";
  if (season === "Winter") return "Deep Wine";
  return "Emerald";
}

/**
 * Returns a suggested shoe color based on top color + optional layer color.
 * Used by engine_footwear. Returns canonical OUTPUT_COLORS values only.
 */
export function getShoeColorSuggestion(
  type: "Classic" | "Trendy" | "Comfort",
  topColor: string,
  layerColor?: string
): OutputColor {
  // SANDWICH METHOD: Classic shoes match the layer to frame the outfit
  if (layerColor && type === "Classic") {
    if (layerColor.includes("Gold") || layerColor.includes("Beige")) return "Tan";
    if (layerColor.includes("Silver") || layerColor.includes("Grey")) return "Black";
    if (layerColor.includes("Black")) return "Black";
    if (layerColor.includes("Brown") || layerColor.includes("Coffee") || layerColor.includes("Tan")) return "Dark Brown";
    return "Nude";
  }

  const isWarm = topColor.includes("Red") || topColor.includes("Yellow") || topColor.includes("Orange") ||
                 topColor.includes("Cream") || topColor.includes("Mustard") || topColor.includes("Rust") ||
                 topColor.includes("Gold") || topColor.includes("Peach") || topColor.includes("Coral");

  if (type === "Classic") {
    if (topColor.includes("Black")) return "Black";
    if (isWarm) return "Tan";
    return "Black";
  }

  if (type === "Trendy") {
    if (topColor.includes("White")) return "White";
    if (isWarm) return "White";
    return "Maroon";
  }

  // Comfort
  if (isWarm) return "Camel";
  return "Grey";
}

/**
 * Returns a suggested color for the top based on undertone, occasion, and skin tone.
 * Used by engine_top / builder_top. Returns canonical OUTPUT_COLORS values only.
 */
export function getTopColorSuggestion(
  undertone: string,
  occasion: string,
  skinTone: string,
  season: string,
  _age: string
): OutputColor {
  const isDark = skinTone === "Dusky" || skinTone === "Dark Brown";
  const isHaldi = occasion.includes("Haldi");
  const isWedding = occasion.includes("Wedding");

  if (undertone === "Olive") {
    if (isHaldi) return "Mustard";
    if (isWedding) return "Deep Wine";
    return "Olive";
  }

  if (undertone === "Warm") {
    if (isHaldi) return "Marigold";
    if (isDark) return "Maroon";
    return "Peach";
  }

  if (undertone === "Cool") {
    if (isHaldi) return "Mustard";
    if (isWedding) return "Royal Blue";
    return "Royal Blue";
  }

  // Neutral
  if (isWedding) return "Maroon";
  if (season === "Winter") return "Navy";
  return "Navy";
}

// ─────────────────────────────────────────────
// 7. PIPELINE TRANSLATION HELPERS
// ─────────────────────────────────────────────
// Used by the orchestrator when chaining engine_top → engine_pair.
// engine_top outputs decorated item names and 40 OUTPUT_COLORS,
// but engine_pair keys use raw item names and 21 PAIR_INPUT_COLORS.

/**
 * Strips fit suffix from engine_top output.
 * "Short Kurta (Slim Fit)" → "Short Kurta"
 * "Bandhgala Jacket (Oversized)" → "Bandhgala Jacket"
 * "Pathani Kurta (Relaxed/Straight Fit)" → "Pathani Kurta"
 */
export function stripFitSuffix(item: string): string {
  return item.replace(/\s*\(.*?\)\s*$/, "").trim();
}

/**
 * Maps OUTPUT_COLORS (40 values) → builder_pair's COLORS (21 values).
 * Only the 19 values that DON'T exist in COLORS need mapping.
 * Values already in COLORS pass through unchanged.
 */
export function normalizeColorForPair(color: string): string {
  const map: Record<string, string> = {
    "Charcoal Grey": "Charcoal",
    "Off-White":     "Ivory",
    "Cream":         "Ivory",
    "Khaki":         "Beige",
    "Nude":          "Beige",
    "Tan":           "Brown",
    "Camel":         "Brown",
    "Coffee Brown":  "Brown",
    "Dark Brown":    "Brown",
    "Chocolate":     "Brown",
    "Midnight Blue": "Navy",
    "Baby Blue":     "Royal Blue",
    "Deep Wine":     "Maroon",
    "Red":           "Maroon",
    "Dusty Rose":    "Pink",
    "Baby Pink":     "Pink",
    "Sage Green":    "Emerald",
    "Marigold":      "Mustard",
    "Plum":          "Lavender",
    "Rose Gold":     "Gold",
  };
  return map[color] || color;
}

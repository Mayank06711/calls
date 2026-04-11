/**
 * ===================================================================
 *  ALL FACTORS & VALUES — Extracted from the 4 AI Suggestion Builders
 * ===================================================================
 *
 *  Sources:
 *    1. builder_top.ts      → Selects top/outfit item + color
 *    2. builder_pair.ts     → Pairs a given clothing item with its complement (top↔bottom) + color + pattern
 *    3. builder_layer.ts    → Selects layering piece (jacket/shawl/blazer etc.)
 *    4. builder_footwear.ts → Selects footwear based on outfit context
 *
 *  CANONICAL INPUT FACTORS are defined in shared.ts — import from there.
 *  This file re-exports them for convenience AND contains the wardrobe
 *  databases, pairing rules, and other reference data.
 * ===================================================================
 */

// Import canonical factors from shared.ts for local use in ALL_FACTORS_SUMMARY
import {
  GENDERS, OCCASIONS, STYLE_VIBES, AGE_GROUPS, FIT_PREFS, SEASONS,
  BODY_SHAPES, HEIGHTS, UNDERTONES, SKIN_TONES,
  TOP_CATEGORIES, BOTTOM_CATEGORIES,
  OUTPUT_COLORS,
  getTopCategory, getBottomCategory, getOccasionContext,
  getPairColor, getLayerColorSuggestion, getShoeColorSuggestion, getTopColorSuggestion,
} from "./shared";

// Re-export all canonical factors from shared.ts (single source of truth)
export {
  GENDERS, OCCASIONS, STYLE_VIBES, AGE_GROUPS, FIT_PREFS, SEASONS,
  BODY_SHAPES, HEIGHTS, UNDERTONES, SKIN_TONES,
  TOP_CATEGORIES, BOTTOM_CATEGORIES,
  OUTPUT_COLORS,
  getTopCategory, getBottomCategory, getOccasionContext,
  getPairColor, getLayerColorSuggestion, getShoeColorSuggestion, getTopColorSuggestion,
};

// ─────────────────────────────────────────────
// FACTORS 1–12 are defined in shared.ts and re-exported above.
//   1. GENDERS          — ["Male", "Female"]
//   2. OCCASIONS         — 13 values (Wedding×5, Office×3, Social×3, Travel×2)
//   3. STYLE_VIBES       — ["Classic", "Trendy", "Desi", "Fusion", "Old Money"]
//   4. AGE_GROUPS        — ["GenZ (16-25)", "Young Adult (26-35)", "Mid-Aged (36-50)", "Senior (50+)"]
//   5. FIT_PREFS         — ["Slim Fit", "Regular Fit", "Oversized"]
//   6. SEASONS           — ["Summer", "Winter", "Monsoon"]
//   7. BODY_SHAPES       — 8 canonical values (all builders must use all 8)
//   8. HEIGHTS           — ["Short", "Medium", "Tall"]
//   9. UNDERTONES        — ["Warm", "Cool", "Olive", "Neutral"]
//  10. SKIN_TONES        — ["Fair", "Wheatish", "Dusky", "Dark Brown"]
//  11. TOP_CATEGORIES    — bridge factor (4 values)
//  12. BOTTOM_CATEGORIES — bridge factor (5 values)
//  Also: OUTPUT_COLORS (40 canonical color values for all engine outputs)
//  Also: getTopCategory, getBottomCategory, getOccasionContext (mappers)
//  Also: getPairColor, getLayerColorSuggestion, getShoeColorSuggestion, getTopColorSuggestion (color helpers)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 13. CATEGORY (Top vs Bottom — used in pair builder)
// ─────────────────────────────────────────────
export const CATEGORIES = [
  "Top",
  "Bottom",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 14. CLOTHING TYPE — MEN TOPS
// ─────────────────────────────────────────────
export const MEN_TOPS = [
  "Short Kurta",
  "Long Kurta",
  "Pathani Kurta",
  "Nehru Jacket",
  "Formal Shirt",
  "Casual Shirt",
  "Polo T-Shirt",
  "Round Neck T-Shirt",
  "Hoodie",
  "Sherwani",
  "Bandhgala Jacket",
  "Sweatshirt",
  "Winter Coat",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 15. CLOTHING TYPE — MEN BOTTOMS
// ─────────────────────────────────────────────
export const MEN_BOTTOMS = [
  "Jeans",
  "Chinos",
  "Formal Trousers",
  "Joggers",
  "Cargo Pants",
  "Pajama",
  "Churidar",
  "Dhoti Pants",
  "Salwar",
  "Shorts",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 16. CLOTHING TYPE — WOMEN TOPS
// ─────────────────────────────────────────────
export const WOMEN_TOPS = [
  // Ethnic
  "Kurti (Short)",
  "Kurti (Long/Straight)",
  "Kurti (Frock Style)",
  "Anarkali",
  "Saree Blouse",
  "Sharara Top (Short)",
  "Kaftan",
  "Ethnic Jacket",
  // Western
  "Formal Shirt",
  "Casual Top/T-Shirt",
  "Crop Top",
  "Peplum Top",
  "Tube/Off-Shoulder Top",
  "Blazer",
  "Winter Long Coat",
  "Sweater",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 17. CLOTHING TYPE — WOMEN BOTTOMS
// ─────────────────────────────────────────────
export const WOMEN_BOTTOMS = [
  // Ethnic
  "Leggings",
  "Churidar",
  "Palazzo",
  "Sharara Pants",
  "Gharara Pants",
  "Patiala Salwar",
  "Dhoti Pants",
  "Lehenga Skirt",
  "Saree (Drape)",
  // Western
  "Jeans",
  "Jeans (High-Waist)",
  "Cigarette Pants",
  "Formal Trousers",
  "Long Skirt",
  "Short Skirt/Shorts",
  "Joggers",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 18. COLOR (input color of the given garment)
// ─────────────────────────────────────────────
export const COLORS = [
  "Jet Black",
  "Charcoal",
  "White",
  "Ivory",
  "Navy",
  "Royal Blue",
  "Mustard",
  "Rust",
  "Olive",
  "Maroon",
  "Beige",
  "Grey",
  "Pink",
  "Brown",
  "Emerald",
  "Teal",
  "Coral",
  "Peach",
  "Lavender",
  "Gold",
  "Silver",
] as const;
// usedIn: [builder_pair]

// ─────────────────────────────────────────────
// 19. PATTERN
// ─────────────────────────────────────────────
export const PATTERNS = [
  "Solid",
  "Striped",
  "Checked",
  "Floral",
  "Embroidered",
  "Polka Dot",
  "Abstract",
] as const;
// usedIn: [builder_pair]


// ═══════════════════════════════════════════════
// WARDROBE DATABASES (Outfit item pools per occasion)
// ═══════════════════════════════════════════════

// builder_top.ts — Items per Occasion × Gender (only 4 occasions populated in code)
export const TOP_WARDROBE_DB = {
  "Wedding: Haldi (Day)": {
    Male:   ["Short Kurta", "Pathani Kurta", "Printed Kurta Shirt", "Classic Long Kurta"],
    Female: ["Yellow Anarkali", "Crop Top + Skirt", "Sharara Set", "Straight Kurti"],
  },
  "Wedding: Sangeet (Night)": {
    Male:   ["Bandhgala Jacket", "Indo-Western Sherwani", "Nehru Jacket Set", "Asymmetric Kurta"],
    Female: ["Lehenga", "Sequin Saree", "Gown", "Sharara Suit"],
  },
  "Office: Daily Wear": {
    Male:   ["Formal Shirt", "Checkered Shirt", "Polo T-Shirt", "Linen Shirt"],
    Female: ["Cotton Kurti", "Formal Shirt", "Tunic Top", "Peplum Top"],
  },
  "Social: Clubbing": {
    Male:   ["Solid Black Shirt", "Graphic T-Shirt", "Denim Shirt", "Layered Jacket"],
    Female: ["Bodycon Dress", "Sequined Top", "Corset Top", "Mini Dress"],
  },
};

// builder_footwear.ts — Shoe pools per Gender × TopCategory × BottomCategory × Context
export const FOOTWEAR_DB = {
  Male: {
    "Ethnic Top": {
      "Ethnic Bottom": {
        Wedding: ["Embroidered Mojaris", "Velvet Juttis", "Gold Kolhapuris", "Leather Sandals"],
        Social:  ["Tan Kolhapuris", "Leather Sandals", "Brown Mojaris", "Simple Juttis"],
      },
      "Jeans/Chinos": {
        Social:  ["Leather Loafers", "Suede Mules", "Kolhapuri Chappals", "Chelsea Boots"],
        Wedding: ["Velvet Loafers", "Embroidered Mules", "Juttis", "Monk Straps"],
      },
    },
    "Western Shirt": {
      "Formal Trousers": {
        Office:  ["Oxford Shoes", "Derby Shoes", "Penny Loafers", "Wholecut Oxfords"],
        Wedding: ["Patent Leather Oxfords", "Velvet Loafers", "Double Monk Straps", "Dress Boots"],
      },
      "Jeans/Chinos": {
        Social: ["Minimalist White Sneakers", "Chelsea Boots", "Suede Loafers", "Desert Boots"],
        Office: ["Leather Boots", "Brogues", "Derby Shoes", "Penny Loafers"],
      },
      "Shorts/Skirts": {
        Travel: ["Espadrilles", "Boat Shoes", "Leather Slides", "Canvas Sneakers"],
      },
    },
    "T-Shirt/Top": {
      "Jeans/Chinos": {
        Social: ["High-Top Sneakers", "Chunky Dad Shoes", "Canvas Vans", "Retro Runners"],
        Travel: ["Running Shoes", "Slip-On Sneakers", "Crocs (Comfort)", "Slides"],
      },
    },
  },
  Female: {
    "Ethnic Top": {
      "Ethnic Bottom": {
        Wedding: ["Embroidered Juttis", "Gold Block Heels", "Kolhapuri Wedges", "Mojaris"],
        Social:  ["Flat Kolhapuris", "Leather Juttis", "Mules", "Comfort Sandals"],
      },
      "Jeans/Chinos": {
        Social: ["Kolhapuri Flats", "Tan Loafers", "Block Heels", "Ballet Flats"],
      },
    },
    "Dress/Saree": {
      "Open Bottom (Lehenga)": {
        Wedding: ["Embroidered Pencil Heels", "Comfort Wedges", "Gold Stilettos", "Crystal Sandals"],
        Social:  ["Kitten Heels", "Block Heels", "Metallic Flats", "Strappy Sandals"],
      },
    },
    "Western Shirt": {
      "Formal Trousers": {
        Office: ["Pointed Toe Pumps", "Leather Loafers", "Kitten Heels", "Block Heel Pumps"],
        Social: ["Stilettos", "Strappy Heels", "Ankle Boots", "Mules"],
      },
      "Jeans/Chinos": {
        Social: ["White Sneakers", "Ankle Boots", "Mules", "Loafers"],
        Winter: ["Knee-High Boots", "Combat Boots", "Chelsea Boots", "Uggs"],
      },
      "Shorts/Skirts": {
        Social: ["Gladiator Sandals", "Strappy Heels", "Sneakers", "Thigh-High Boots"],
      },
    },
  },
};

// builder_layer.ts — Layering pieces per Gender × TopCategory × Context × Season
export const LAYER_DB = {
  Male: {
    "Ethnic Top": {
      Wedding: {
        Summer: ["Floral Sadri", "Silk Waistcoat", "Cotton Silk Stole", "Linen Nehru Jacket"],
        Winter: ["Velvet Bandhgala", "Embroidered Pashmina Shawl", "Brocade Nehru Jacket", "Tweed Jacket"],
      },
      Social: {
        Summer: ["Linen Vest", "Printed Cotton Sadri", "Open Shirt Layer"],
        Winter: ["Corduroy Jacket", "Knitted Shawl", "Denim Jacket"],
      },
    },
    "Western Shirt": {
      Office: {
        Summer: ["Unlined Grey Blazer", "Sleeveless Sweater Vest", "Formal Gilet"],
        Winter: ["Charcoal Wool Blazer", "Merino V-Neck Sweater", "Trench Coat"],
      },
      Social: {
        Summer: ["Linen Blazer", "Denim Jacket", "Cotton Bomber", "Varsity Jacket"],
        Winter: ["Leather Biker Jacket", "Suede Bomber", "Peacoat", "Puffer Vest"],
      },
    },
    "T-Shirt/Top": {
      Social: {
        Summer: ["Open Checkered Shirt", "Denim Vest", "Lightweight Bomber"],
        Winter: ["Puffer Jacket", "Hoodie (Zip-up)", "Flannel Overshirt", "Utility Vest"],
      },
    },
  },
  Female: {
    "Ethnic Top": {
      Wedding: {
        Summer: ["Phulkari Dupatta", "Sheer Organza Jacket", "Embroidered Potli & Stole", "Cape Shrug"],
        Winter: ["Velvet Shawl", "Brocade Ethnic Jacket", "Heavy Pashmina Stole", "Silk Trench"],
      },
      Social: {
        Summer: ["Cotton Block-Print Scarf", "Denim Vest", "Crochet Shrug", "Longline Vest"],
        Winter: ["Long Woolen Cardigan", "Denim Jacket", "Knitted Poncho", "Faux Leather Jacket"],
      },
    },
    "Dress/Saree": {
      Wedding: {
        Summer: ["Belted Cape", "Sheer Shrug", "Contrast Net Veil", "Embellished Belt"],
        Winter: ["Velvet Cape Shawl", "Full-Sleeve Brocade Jacket", "Fur Stole", "High-Neck Coat"],
      },
      Social: {
        Summer: ["Denim Jacket", "Light Kimono", "Belted Scarf"],
        Winter: ["Leather Jacket", "Trench Coat", "Faux Fur Bolero"],
      },
    },
    "Western Shirt": {
      Office: {
        Summer: ["Linen Blazer", "Long Sleeveless Vest", "Silk Scarf"],
        Winter: ["Tailored Wool Blazer", "Trench Coat", "Houndstooth Cardigan"],
      },
      Social: {
        Summer: ["Kimono", "Oversized Boyfriend Shirt", "Cropped Denim Jacket"],
        Winter: ["Teddy Coat", "Leather Biker Jacket", "Puffer Jacket"],
      },
    },
  },
};

// builder_pair.ts — Pairing rules (given item → suggested complement)
export const PAIRING_RULES = {
  Male: {
    Top: {
      "Short Kurta":        { classic: "Pajama (Straight)",    trendy: "Jeans (Tapered)" },
      "Long Kurta":         { classic: "Pajama (Straight)",    trendy: "Jeans (Tapered)" },
      "Pathani Kurta":      { classic: "Salwar",               trendy: "Cuffed Joggers" },
      "Sherwani":           { classic: "Churidar",             trendy: "Dhoti Pants" },
      "Bandhgala Jacket":   { classic: "Formal Trousers",      trendy: "Jodhpuri Breeches" },
      "Formal Shirt":       { classic: "Formal Trousers",      trendy: "Chinos (No Pleats)" },
      "Casual Shirt":       { classic: "Jeans",                trendy: "Chinos" },
      "Polo T-Shirt":       { classic: "Chinos",               trendy: "Jeans" },
      "Round Neck T-Shirt": { classic: "Jeans",                trendy: "Cargo Pants" },
      "Hoodie":             { classic: "Jeans",                trendy: "Joggers" },
      "Sweatshirt":         { classic: "Jeans",                trendy: "Joggers" },
      "Nehru Jacket":       { classic: "Kurta Pajama Set",     trendy: "Shirt + Trousers" },
      "Winter Coat":        { classic: "Formal Trousers",      trendy: "Jeans" },
    },
    Bottom: {
      "Jeans":              { classic: "Casual Shirt",         trendy: "Short Kurta" },
      "Chinos":             { classic: "Polo T-Shirt",         trendy: "Denim Shirt" },
      "Formal Trousers":    { classic: "Formal Shirt",         trendy: "Turtleneck/Polo" },
      "Joggers":            { classic: "Hoodie",               trendy: "Oversized T-Shirt" },
      "Cargo Pants":        { classic: "Round Neck T-Shirt",   trendy: "Checkered Overshirt" },
      "Pajama":             { classic: "Long Kurta",           trendy: "Short Kurta" },
      "Dhoti Pants":        { classic: "Short Kurta",          trendy: "Bandhgala Jacket" },
      "Shorts":             { classic: "T-Shirt",              trendy: "Casual Shirt (Open)" },
    },
  },
  Female: {
    Top: {
      "Kurti (Short)":            { classic: "Patiala Salwar",         trendy: "Dhoti Pants/Jeans" },
      "Kurti (Long/Straight)":    { classic: "Leggings/Churidar",      trendy: "Palazzo" },
      "Kurti (Frock Style)":      { classic: "Leggings",               trendy: "Jeans" },
      "Sharara Top (Short)":      { classic: "Sharara Pants",          trendy: "Gharara Pants" },
      "Anarkali":                 { classic: "Churidar",               trendy: "No Visible Bottom (Gown Look)" },
      "Saree Blouse":             { classic: "Saree",                  trendy: "Lehenga Skirt" },
      "Kaftan":                   { classic: "Cigarette Pants",        trendy: "No Bottom (Resort Wear)" },
      "Ethnic Jacket":            { classic: "Long Kurti",             trendy: "Crop Top + Palazzo" },
      "Formal Shirt":             { classic: "Formal Trousers",        trendy: "Pencil Skirt/Cigarette Pants" },
      "Casual Top/T-Shirt":       { classic: "Jeans",                  trendy: "Long Skirt" },
      "Crop Top":                 { classic: "High-Waist Jeans",       trendy: "Lehenga Skirt/Palazzo" },
      "Peplum Top":               { classic: "Pencil Skirt",           trendy: "Slim Fit Trousers" },
      "Tube/Off-Shoulder Top":    { classic: "High-Waist Jeans",       trendy: "Long Skirt" },
      "Blazer":                   { classic: "Formal Trousers",        trendy: "Jeans" },
      "Sweater":                  { classic: "Jeans",                  trendy: "Woolen Skirt/Leggings" },
    },
    Bottom: {
      "Patiala Salwar":   { classic: "Kurti (Short)",          trendy: "T-Shirt (Fusion)" },
      "Sharara Pants":    { classic: "Sharara Top (Short)",    trendy: "Crop Top" },
      "Dhoti Pants":      { classic: "Kurti (Short)",          trendy: "Peplum Top" },
      "Palazzo":          { classic: "Kurti (Long)",           trendy: "Crop Top/Shirt" },
      "Lehenga Skirt":    { classic: "Matching Blouse",        trendy: "White Shirt (Indo-Western)" },
      "Saree (Drape)":    { classic: "Matching Blouse",        trendy: "Crop Top/Corset" },
      "Jeans":            { classic: "Casual Top/T-Shirt",     trendy: "Kurti (Short)" },
      "Jeans (High-Waist)": { classic: "Casual Top/T-Shirt",  trendy: "Kurti (Short)" },
      "Long Skirt":       { classic: "Tucked-in Top",          trendy: "Crop Top" },
      "Cigarette Pants":  { classic: "Long Tunic",             trendy: "Kaftan Top" },
      "Leggings":         { classic: "Kurti (Long)",           trendy: "Long Shirt" },
      "Short Skirt/Shorts": { classic: "T-Shirt",             trendy: "Oversized Hoodie" },
    },
  },
};

// builder_pair.ts — Color matching rules (base color × skin tone → suggested pair color)
export const COLOR_MATCHING_RULES = {
  "Mustard":      { classic: "Navy",               trendy: "Charcoal",              trendyDarkSkin: "Charcoal" },
  "Navy":         { classic: "Beige",              trendy: "Grey",                  trendyDarkSkin: "Rust" },
  "White":        { classic: "Blue/Black",          trendy: "Olive" },
  "Black":        { classic: "Khaki",              classicDarkSkin: "Cream",         trendy: "Monotone Black",  trendyDarkSkin: "Rust" },
  "Maroon":       { classic: "Beige",              trendy: "Black" },
  "Olive":        { classic: "Navy",               trendy: "Cream/White" },
  "Beige":        { classic: "Maroon",             trendy: "Coffee Brown" },
  "Ivory":        { classic: "Maroon",             trendy: "Coffee Brown" },
  "Rust":         { classic: "Navy",               trendy: "Off-White" },
  "Emerald":      { classic: "Black",              trendy: "Beige" },
  "Pink":         { classic: "White",              trendy: "Grey" },
  "Peach":        { classic: "White",              trendy: "Grey" },
  "Teal":         { classic: "Beige",              trendy: "Mustard" },
  "Royal Blue":   { classic: "White",              trendy: "Black" },
  "Gold":         { classic: "Red/Maroon",          trendy: "Black" },
  "Silver":       { classic: "Black",              trendy: "Navy" },
  "Grey":         { classic: "Black",              trendy: "Navy" },
};

// builder_top.ts — Color selection by undertone × occasion × skin
export const UNDERTONE_COLOR_RULES = {
  Olive: {
    Haldi:   "Mustard",
    Wedding: "Deep Wine / Teal",
    Default: "Olive Green / Rust",
  },
  Warm: {
    Haldi:       "Marigold Orange",
    DarkSkin:    "Rich Maroon",
    Default:     "Peach / Cream",
  },
  Cool: {
    Haldi:   "Lemon Yellow",
    Default: "Royal Blue / Baby Pink",
  },
};


// ═══════════════════════════════════════════════
// KEY FORMATS (how factors combine into lookup keys)
// ═══════════════════════════════════════════════

export const KEY_FORMATS = {
  builder_top:
    "Gender|Occasion|Vibe|Age|Fit|Undertone|Skin|Season|Body|Height",
    // 10 factors → produces: item + color

  builder_pair:
    "Gender|Category|Type|Color|Pattern|Season|Body|Skin|Height",
    // 9 factors → produces: complementary item + color + pattern

  builder_layer:
    "Gender|Occasion|Season|Vibe|TopCategory|Age|Body|Height|Undertone|Skin|Fit",
    // 11 factors → produces: 3 layering options (classic, contrast, statement)

  builder_footwear:
    "Gender|Occasion|Season|Vibe|TopCategory|BottomCategory|Height|Age|Fit|Body|Undertone|Skin",
    // 12 factors → produces: 3 shoe options (classic, trendy, comfort)
};


// ═══════════════════════════════════════════════
// TOTAL COMBINATION COUNTS
// ═══════════════════════════════════════════════

export const COMBINATION_COUNTS = {
  builder_top:      "2 × 13 × 5 × 4 × 3 × 4 × 4 × 3 × 8 × 3 = 2,247,680 rules",
  builder_pair:     "2 genders × (13+10+16+16 types) × 21 colors × 7 patterns × 3 seasons × 6 bodies × 4 skins × 3 heights",
  builder_layer:    "2 × 13 × 3 × 5 × 4 × 4 × 8 × 3 × 4 × 4 × 3 = 8,847,360 rules",
  builder_footwear: "2 × 13 × 3 × 5 × 4 × 5 × 3 × 4 × 3 × 6 × 4 × 4 = 22,118,400 rules",
};


// ═══════════════════════════════════════════════
// SUMMARY — ALL UNIQUE FACTORS (19 total)
// ═══════════════════════════════════════════════

export const ALL_FACTORS_SUMMARY = {
  // User profile factors
  gender:          { values: 2,  list: GENDERS },
  age_group:       { values: 4,  list: AGE_GROUPS },
  body_shape:      { values: 8,  list: BODY_SHAPES },
  height:          { values: 3,  list: HEIGHTS },
  skin_tone:       { values: 4,  list: SKIN_TONES },
  undertone:       { values: 4,  list: UNDERTONES },

  // Preference factors
  style_vibe:      { values: 5,  list: STYLE_VIBES },
  fit_preference:  { values: 3,  list: FIT_PREFS },

  // Context factors
  occasion:        { values: 13, list: OCCASIONS },
  season:          { values: 3,  list: SEASONS },

  // Clothing input factors (builder_pair)
  category:        { values: 2,  list: CATEGORIES },
  clothing_type_men_tops:     { values: 13, list: MEN_TOPS },
  clothing_type_men_bottoms:  { values: 10, list: MEN_BOTTOMS },
  clothing_type_women_tops:   { values: 16, list: WOMEN_TOPS },
  clothing_type_women_bottoms:{ values: 16, list: WOMEN_BOTTOMS },
  color:           { values: 21, list: COLORS },
  pattern:         { values: 7,  list: PATTERNS },

  // Bridge factors (output of one engine → input of next)
  top_category:    { values: 4,  list: TOP_CATEGORIES },
  bottom_category: { values: 5,  list: BOTTOM_CATEGORIES },
};

// All constants are exported individually above via `export const`.

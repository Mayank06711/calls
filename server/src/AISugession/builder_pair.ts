import * as fs from 'fs';
import {
    SEASONS, BODY_SHAPES, SKIN_TONES, HEIGHTS, getPairColor,
} from "./shared";

// --- 1. THE UNIVERSE OF PARAMETERS ---

// 1.1 CLOTHING LISTS (Comprehensive North Indian Wardrobe — specific to pair builder)
const MEN_TOPS = [
    "Short Kurta", "Long Kurta", "Pathani Kurta", "Nehru Jacket",
    "Formal Shirt", "Casual Shirt", "Polo T-Shirt", "Round Neck T-Shirt",
    "Hoodie", "Sherwani", "Bandhgala Jacket", "Sweatshirt", "Winter Coat"
] as const;

const MEN_BOTTOMS = [
    "Jeans", "Chinos", "Formal Trousers", "Joggers", "Cargo Pants",
    "Pajama", "Churidar", "Dhoti Pants", "Salwar", "Shorts"
] as const;

const WOMEN_TOPS = [
    // Ethnic
    "Kurti (Short)", "Kurti (Long/Straight)", "Kurti (Frock Style)",
    "Anarkali", "Saree Blouse", "Sharara Top (Short)", "Kaftan", "Ethnic Jacket",
    // Western
    "Formal Shirt", "Casual Top/T-Shirt", "Crop Top", "Peplum Top",
    "Tube/Off-Shoulder Top", "Blazer", "Winter Long Coat", "Sweater"
] as const;

const WOMEN_BOTTOMS = [
    // Ethnic
    "Leggings", "Churidar", "Palazzo", "Sharara Pants", "Gharara Pants",
    "Patiala Salwar", "Dhoti Pants", "Lehenga Skirt", "Saree (Drape)",
    // Western
    "Jeans", "Jeans (High-Waist)", "Cigarette Pants", "Formal Trousers",
    "Long Skirt", "Short Skirt/Shorts", "Joggers"
] as const;

// 1.2 ATTRIBUTES (INPUT colors for the garment the user already has — distinct from OUTPUT_COLORS)
const COLORS = [
    "Jet Black", "Charcoal", "White", "Ivory", "Navy", "Royal Blue",
    "Mustard", "Rust", "Olive", "Maroon", "Beige", "Grey",
    "Pink", "Brown", "Emerald", "Teal", "Coral", "Peach", "Lavender", "Gold", "Silver"
] as const;

const PATTERNS = ["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract"] as const;

// --- 2. LOGIC FUNCTIONS (The "Expert" Rules) ---

// A. COLOR LOGIC — uses shared canonical color helper (returns OUTPUT_COLORS values only)
function getMatchingColors(baseColor: string, skin: string): { classic: string, trendy: string } {
    return getPairColor(baseColor, skin);
}

// B. ITEM PAIRING LOGIC (Gender Aware & Bi-Directional)
function getPairing(gender: "Male" | "Female", category: "Top" | "Bottom", type: string, season: string): { classic: string, trendy: string } {
    
    // ---------------- MALE LOGIC ----------------
    if (gender === "Male") {
        if (category === "Top") {
            if (type.includes("Kurta")) return { classic: "Pajama (Straight)", trendy: "Jeans (Tapered)" };
            if (type === "Pathani Kurta") return { classic: "Salwar", trendy: "Cuffed Joggers" };
            if (type === "Sherwani") return { classic: "Churidar", trendy: "Dhoti Pants" };
            if (type === "Bandhgala Jacket") return { classic: "Formal Trousers", trendy: "Jodhpuri Breeches" };
            if (type === "Formal Shirt") return { classic: "Formal Trousers", trendy: "Chinos (No Pleats)" };
            if (type === "Casual Shirt") return { classic: "Jeans", trendy: "Chinos" };
            if (type === "Polo T-Shirt") return { classic: "Chinos", trendy: "Jeans" };
            if (type === "Round Neck T-Shirt") return { classic: "Jeans", trendy: "Cargo Pants" };
            if (type === "Hoodie" || type === "Sweatshirt") return { classic: "Jeans", trendy: "Joggers" };
            if (type === "Nehru Jacket") return { classic: "Kurta Pajama Set", trendy: "Shirt + Trousers" };
            if (type === "Winter Coat") return { classic: "Formal Trousers", trendy: "Jeans" };
        } else { // Male Bottom -> Needs Top
            if (type === "Jeans") return { classic: "Casual Shirt", trendy: "Short Kurta" };
            if (type === "Chinos") return { classic: "Polo T-Shirt", trendy: "Denim Shirt" };
            if (type === "Formal Trousers") return { classic: "Formal Shirt", trendy: "Turtleneck/Polo" };
            if (type === "Joggers") return { classic: "Hoodie", trendy: "Oversized T-Shirt" };
            if (type === "Cargo Pants") return { classic: "Round Neck T-Shirt", trendy: "Checkered Overshirt" };
            if (type === "Pajama") return { classic: "Long Kurta", trendy: "Short Kurta" };
            if (type === "Dhoti Pants") return { classic: "Short Kurta", trendy: "Bandhgala Jacket" };
            if (type === "Shorts") return { classic: "T-Shirt", trendy: "Casual Shirt (Open)" };
        }
    }

    // ---------------- FEMALE LOGIC ----------------
    if (gender === "Female") {
        if (category === "Top") {
            // Ethnic
            if (type === "Kurti (Short)") return { classic: "Patiala Salwar", trendy: "Dhoti Pants/Jeans" };
            if (type === "Kurti (Long/Straight)") return { classic: "Leggings/Churidar", trendy: "Palazzo" };
            if (type === "Kurti (Frock Style)") return { classic: "Leggings", trendy: "Jeans" };
            if (type === "Sharara Top (Short)") return { classic: "Sharara Pants", trendy: "Gharara Pants" };
            if (type === "Anarkali") return { classic: "Churidar", trendy: "No Visible Bottom (Gown Look)" };
            if (type === "Saree Blouse") return { classic: "Saree", trendy: "Lehenga Skirt" };
            if (type === "Kaftan") return { classic: "Cigarette Pants", trendy: "No Bottom (Resort Wear)" };
            if (type === "Ethnic Jacket") return { classic: "Long Kurti", trendy: "Crop Top + Palazzo" };
            
            // Western
            if (type === "Formal Shirt") return { classic: "Formal Trousers", trendy: "Pencil Skirt/Cigarette Pants" };
            if (type === "Casual Top/T-Shirt") return { classic: "Jeans", trendy: "Long Skirt" };
            if (type === "Crop Top") return { classic: "High-Waist Jeans", trendy: "Lehenga Skirt/Palazzo" };
            if (type === "Peplum Top") return { classic: "Pencil Skirt", trendy: "Slim Fit Trousers" };
            if (type === "Tube/Off-Shoulder Top") return { classic: "High-Waist Jeans", trendy: "Long Skirt" };
            if (type === "Blazer") return { classic: "Formal Trousers", trendy: "Jeans" };
            if (type === "Sweater") return { classic: "Jeans", trendy: "Woolen Skirt/Leggings" };
        } 
        else { // Female Bottom -> Needs Top
            // Ethnic
            if (type === "Patiala Salwar") return { classic: "Kurti (Short)", trendy: "T-Shirt (Fusion)" };
            if (type === "Sharara Pants") return { classic: "Sharara Top (Short)", trendy: "Crop Top" };
            if (type === "Dhoti Pants") return { classic: "Kurti (Short)", trendy: "Peplum Top" };
            if (type === "Palazzo") return { classic: "Kurti (Long)", trendy: "Crop Top/Shirt" };
            if (type === "Lehenga Skirt") return { classic: "Matching Blouse", trendy: "White Shirt (Indo-Western)" };
            if (type === "Saree (Drape)") return { classic: "Matching Blouse", trendy: "Crop Top/Corset" };
            
            // Western
            if (type.includes("Jeans")) return { classic: "Casual Top/T-Shirt", trendy: "Kurti (Short)" };
            if (type === "Long Skirt") return { classic: "Tucked-in Top", trendy: "Crop Top" };
            if (type === "Cigarette Pants") return { classic: "Long Tunic", trendy: "Kaftan Top" };
            if (type === "Leggings") return { classic: "Kurti (Long)", trendy: "Long Shirt" };
            if (type === "Short Skirt/Shorts") return { classic: "T-Shirt", trendy: "Oversized Hoodie" };
        }
    }

    return { classic: "Jeans", trendy: "Chinos" }; // Fallback
}

// C. BODY & HEIGHT MODIFIERS (Correction Logic)
function applyModifiers(gender: "Male" | "Female", item: string, body: string, height: string): string {
    let modified = item;
    
    // --- HEIGHT RULES ---
    if (height === "Short" && !item.includes("Top")) {
        if (gender === "Female") modified += " [High-Waist]";
        else modified += " [High-Rise]";
    }
    
    // --- BODY RULES ---
    if (body === "Oval") {
        if (item.includes("Tucked")) modified = item.replace("Tucked-in", "Untucked"); // Comfort
        else modified += " [Comfort Fit]";
    }
    
    // MALE Specifics
    if (gender === "Male") {
        if (body === "Inverted_Triangle" && item.includes("Jeans")) modified = "Jeans [Relaxed Fit]"; 
        if (body === "Trapezoid") modified += " [Slim/Regular Fit]";
    }

    // FEMALE Specifics
    if (gender === "Female") {
        if (body === "Triangle") { // Pear Shape
            if (item.includes("Palazzo")) modified = "Straight Cut Palazzo";
            else modified += " [A-Line/Straight Cut]";
        }
        if (body === "Inverted_Triangle") {
            if (item.includes("Skirt")) modified = "Flared Skirt";
            else modified += " [Wide Leg/Flared]";
        }
        if (body === "Hourglass") {
            if (item.includes("Dress") || item.includes("Top")) modified += " [Cinched Waist]";
        }
    }

    return modified;
}

// --- 3. THE BUILDER ENGINE (Indexed — same {dicts, data} format as other builders) ---

const ITEM_DICT: string[] = [];
const COLOR_DICT: string[] = [];
const PATTERN_DICT: string[] = [];
const itemToId = new Map<string, number>();
const colorToId = new Map<string, number>();
const patternToId = new Map<string, number>();

function getOrAddId(val: string, dict: string[], map: Map<string, number>): number {
    if (!map.has(val)) {
        map.set(val, dict.length);
        dict.push(val);
    }
    return map.get(val)!;
}

function generateMasterFile() {
    console.log("🚀 Initializing North India Fashion Generator (Indexed)...");
    const tempFd = fs.openSync("fashion_temp.txt", "w");
    let count = 0;
    let isFirst = true;

    const runGenerationLoop = (gender: "Male" | "Female", category: "Top" | "Bottom", typeList: readonly string[]) => {
        typeList.forEach(type => {
            COLORS.forEach(color => {
                PATTERNS.forEach(pattern => {
                    SEASONS.forEach(season => {
                        BODY_SHAPES.forEach(body => {
                            SKIN_TONES.forEach(skin => {
                                HEIGHTS.forEach(height => {

                                    // 1. UNIQUE KEY
                                    // Format: Gender|Category|Type|Color|Pattern|Season|Body|Skin|Height
                                    const key = `${gender}|${category}|${type}|${color}|${pattern}|${season}|${body}|${skin}|${height}`;

                                    // 2. GET PAIRING ITEM
                                    const items = getPairing(gender, category, type, season);

                                    // 3. GET COLOR MATCH
                                    const colors = getMatchingColors(color, skin);

                                    // 4. GET PATTERN RULE
                                    const outPattern = (pattern !== "Solid") ? "Solid" : "Solid or Subtle Texture";

                                    // 5. APPLY MODIFIERS
                                    const classicItem = applyModifiers(gender, items.classic, body, height);
                                    const trendyItem = applyModifiers(gender, items.trendy, body, height);

                                    // 6. COMPRESS — store 6 numeric IDs per key
                                    // [classicItemId, trendyItemId, classicColorId, trendyColorId, classicPatternId, trendyPatternId]
                                    const classicItemId = getOrAddId(classicItem, ITEM_DICT, itemToId);
                                    const trendyItemId = getOrAddId(trendyItem, ITEM_DICT, itemToId);
                                    const classicColorId = getOrAddId(colors.classic, COLOR_DICT, colorToId);
                                    const trendyColorId = getOrAddId(colors.trendy, COLOR_DICT, colorToId);
                                    const classicPatternId = getOrAddId("Solid", PATTERN_DICT, patternToId);
                                    const trendyPatternId = getOrAddId(outPattern, PATTERN_DICT, patternToId);

                                    // 7. STREAM WRITE
                                    const sep = isFirst ? "" : ",";
                                    fs.writeSync(tempFd, `${sep}"${key}":[${classicItemId},${trendyItemId},${classicColorId},${trendyColorId},${classicPatternId},${trendyPatternId}]`);
                                    isFirst = false;
                                    count++;

                                    if (count % 500000 === 0) {
                                        console.log(`  ...Generated ${count} Fashion Rules`);
                                        if (global.gc) global.gc();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    };

    console.log("...Generating Male Rules");
    runGenerationLoop("Male", "Top", MEN_TOPS);
    runGenerationLoop("Male", "Bottom", MEN_BOTTOMS);

    console.log("...Generating Female Rules");
    runGenerationLoop("Female", "Top", WOMEN_TOPS);
    runGenerationLoop("Female", "Bottom", WOMEN_BOTTOMS);

    fs.closeSync(tempFd);

    // Save Final DB — same {dicts, data} format as other builders
    console.log("💾 Saving Fashion Master JSON...");
    const finalFd = fs.openSync("fashion_master_db.json", "w");

    const dictsObj = { items: ITEM_DICT, colors: COLOR_DICT, patterns: PATTERN_DICT };
    fs.writeSync(finalFd, `{"dicts":${JSON.stringify(dictsObj)},"data":{`);
    fs.writeSync(finalFd, fs.readFileSync("fashion_temp.txt").toString());
    fs.writeSync(finalFd, "}}");

    fs.closeSync(finalFd);
    fs.unlinkSync("fashion_temp.txt");

    console.log(`✅ Success! Generated ${count} unique fashion rules (indexed).`);
    console.log(`📂 Saved to 'fashion_master_db.json'`);
}

generateMasterFile();
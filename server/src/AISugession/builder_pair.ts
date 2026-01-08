import * as fs from 'fs';
import * as path from 'path';

// --- 1. THE UNIVERSE OF PARAMETERS ---

// 1.1 CLOTHING LISTS (Comprehensive North Indian Wardrobe)
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

// 1.2 ATTRIBUTES
const COLORS = [
    "Jet Black", "Charcoal", "White", "Ivory", "Navy", "Royal Blue", 
    "Mustard", "Rust", "Olive", "Maroon", "Beige", "Grey", 
    "Pink", "Brown", "Emerald", "Teal", "Coral", "Peach", "Lavender", "Gold", "Silver"
] as const;

const PATTERNS = ["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract"] as const;
const SEASONS = ["Summer", "Winter", "Monsoon"] as const;

// 1.3 USER PROFILE
const BODY_SHAPES = ["Trapezoid", "Rectangle", "Triangle", "Inverted_Triangle", "Oval", "Hourglass"] as const; // Added Hourglass for women
const SKIN_TONES = ["Fair", "Wheatish", "Dusky", "Dark Brown"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;

// --- 2. LOGIC FUNCTIONS (The "Expert" Rules) ---

// A. COLOR LOGIC (North Indian Aesthetics)
function getMatchingColors(baseColor: string, skin: string): { classic: string, trendy: string } {
    let classic = "Navy";
    let trendy = "Grey";

    const isDarkSkin = (skin === "Dark Brown" || skin === "Dusky");

    // Specific Pairings
    if (baseColor === "Mustard") { classic = "Navy"; trendy = "Charcoal"; }
    else if (baseColor === "Navy") { classic = "Beige"; trendy = isDarkSkin ? "Rust" : "Grey"; }
    else if (baseColor === "White") { classic = "Blue/Black"; trendy = "Olive"; }
    else if (baseColor === "Black") { classic = isDarkSkin ? "Cream" : "Khaki"; trendy = isDarkSkin ? "Rust" : "Monotone Black"; }
    else if (baseColor === "Maroon") { classic = "Beige"; trendy = "Black"; }
    else if (baseColor === "Olive") { classic = "Navy"; trendy = "Cream/White"; }
    else if (baseColor === "Beige" || baseColor === "Ivory") { classic = "Maroon"; trendy = "Coffee Brown"; }
    else if (baseColor === "Rust") { classic = "Navy"; trendy = "Off-White"; }
    else if (baseColor === "Emerald") { classic = "Black"; trendy = "Beige"; }
    else if (baseColor === "Pink" || baseColor === "Peach") { classic = "White"; trendy = "Grey"; }
    else if (baseColor === "Teal") { classic = "Beige"; trendy = "Mustard"; }
    else if (baseColor === "Royal Blue") { classic = "White"; trendy = "Black"; }
    else if (baseColor === "Gold") { classic = "Red/Maroon"; trendy = "Black"; }
    else if (baseColor === "Silver") { classic = "Black"; trendy = "Navy"; }
    else if (baseColor === "Grey") { classic = "Black"; trendy = "Navy"; }
    
    return { classic, trendy };
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

// --- 3. THE BUILDER ENGINE ---

function generateMasterFile() {
    console.log("🚀 Initializing North India Fashion Generator...");
    const database: Record<string, any> = {};
    let count = 0;

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

                                    // 6. SAVE TO DB
                                    database[key] = {
                                        input: { gender, category, type, color, season },
                                        suggestions: [
                                            {
                                                vibe: "Classic / Safe",
                                                item: classicItem,
                                                color: colors.classic,
                                                pattern: "Solid",
                                                note: `Timeless ${gender === 'Female' ? 'chic' : 'classic'}. Safe bet.`
                                            },
                                            {
                                                vibe: "Trendy / Modern",
                                                item: trendyItem,
                                                color: colors.trendy,
                                                pattern: outPattern,
                                                note: "Modern pairing. Popular in current fashion trends."
                                            }
                                        ]
                                    };
                                    count++;
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

    // Save
    fs.writeFileSync('fashion_master_db.json', JSON.stringify(database));
    console.log(`✅ Success! Generated ${count} unique fashion rules.`);
    console.log(`📂 Saved to 'fashion_master_db.json'`);
}

generateMasterFile();
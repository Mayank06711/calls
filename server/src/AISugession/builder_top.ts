import * as fs from "fs";
import {
    GENDERS, OCCASIONS, STYLE_VIBES, AGE_GROUPS, FIT_PREFS,
    UNDERTONES, SKIN_TONES, SEASONS, BODY_SHAPES, HEIGHTS,
    getTopColorSuggestion,
} from "./shared";

// --- 2. THE MASTER WARDROBE (Base Options) ---
const WARDROBE_DB: any = {
    "Wedding: Haldi (Day)": {
        Male: ["Short Kurta", "Pathani Kurta", "Printed Kurta Shirt", "Classic Long Kurta"],
        Female: ["Yellow Anarkali", "Crop Top + Skirt", "Sharara Set", "Straight Kurti"]
    },
    "Wedding: Sangeet (Night)": {
        Male: ["Bandhgala Jacket", "Indo-Western Sherwani", "Nehru Jacket Set", "Asymmetric Kurta"],
        Female: ["Lehenga", "Sequin Saree", "Gown", "Sharara Suit"]
    },
    "Office: Daily Wear": {
        Male: ["Formal Shirt", "Checkered Shirt", "Polo T-Shirt", "Linen Shirt"],
        Female: ["Cotton Kurti", "Formal Shirt", "Tunic Top", "Peplum Top"]
    },
    "Social: Clubbing": {
        Male: ["Solid Black Shirt", "Graphic T-Shirt", "Denim Shirt", "Layered Jacket"],
        Female: ["Bodycon Dress", "Sequined Top", "Corset Top", "Mini Dress"]
    }
};

// --- 3. THE AI LOGIC CORE ---

function selectItem(params: any): string {
    // 1. GENDER + OCCASION -> Load List
    let options = WARDROBE_DB[params.occasion]?.[params.gender] || ["Top"];
    
    // We filter this list step-by-step based on parameters.
    let bestMatch = options[0]; 

    // 2. SEASON FILTER
    // Summer: Prefer Short / Open / Linen. Winter: Prefer Jackets / Layers.
    if (params.season === "Summer") {
        const summerOption = options.find((i: string) => i.includes("Short") || i.includes("Linen") || i.includes("Cotton") || i.includes("Polo"));
        if (summerOption) bestMatch = summerOption;
    } else if (params.season === "Winter") {
        const winterOption = options.find((i: string) => i.includes("Jacket") || i.includes("Bandhgala") || i.includes("Layered"));
        if (winterOption) bestMatch = winterOption;
    }

    // 3. HEIGHT LOGIC
    // Short: Avoid long items that swallow the body.
    if (params.height === "Short") {
        if (bestMatch.includes("Long Kurta") || bestMatch.includes("Sherwani")) {
            // Switch to shorter alternative if available
            const shortAlt = options.find((i: string) => i.includes("Short") || i.includes("Nehru") || i.includes("Waistcoat"));
            if (shortAlt) bestMatch = shortAlt;
        }
    }

    // 4. BODY SHAPE LOGIC
    if (params.body === "Oval" || params.body === "Apple") {
        // Needs structure to hide midsection.
        const structure = options.find((i: string) => i.includes("Jacket") || i.includes("Structure") || i.includes("Straight"));
        if (structure) bestMatch = structure;
    } else if (params.body === "Triangle" || params.body === "Pear") {
        // Needs volume on top to balance hips.
        const volume = options.find((i: string) => i.includes("Layered") || i.includes("Anarkali") || i.includes("Printed"));
        if (volume) bestMatch = volume;
    }

    // 5. AGE LOGIC
    if (params.age.includes("GenZ")) {
        const trendy = options.find((i: string) => i.includes("Crop") || i.includes("Graphic") || i.includes("Asymmetric"));
        if (trendy) bestMatch = trendy;
    } else if (params.age.includes("Senior")) {
        const classic = options.find((i: string) => i.includes("Silk") || i.includes("Pathani") || i.includes("Formal"));
        if (classic) bestMatch = classic;
    }

    // 6. STYLE VIBE LOGIC (Override)
    if (params.vibe === "Trendy") {
        // Trendy usually implies the most modern cut in the list
        bestMatch = options[options.length - 1]; 
    } else if (params.vibe === "Old Money") {
        const luxe = options.find((i: string) => i.includes("Linen") || i.includes("Polo") || i.includes("Silk"));
        if (luxe) bestMatch = luxe;
    }

    // 7. FIT PREFERENCE (Final Tagging)
    // IMPORTANT: If Body is Oval, we ignore "Slim Fit" request because it looks bad.
    if (params.body === "Oval" || params.body === "Apple") {
        bestMatch += " (Relaxed/Straight Fit)";
    } else {
        if (params.fit === "Oversized") bestMatch += " (Oversized)";
        else if (params.fit === "Slim") bestMatch += " (Slim Fit)";
    }

    return bestMatch;
}

function selectColor(params: any): string {
    const { occasion, undertone, skin, season, age } = params;
    // Uses shared canonical color helper — returns OUTPUT_COLORS values only
    return getTopColorSuggestion(undertone, occasion, skin, season, age);
}

// --- 4. THE BUILDER ENGINE ---

const ITEM_DICT: string[] = [];
const COLOR_DICT: string[] = [];
const itemToId = new Map<string, number>();
const colorToId = new Map<string, number>();

function getOrAddId(val: string, dict: string[], map: Map<string, number>): number {
    if (!map.has(val)) { map.set(val, dict.length); dict.push(val); }
    return map.get(val)!;
}

function buildConsultantDB() {
    console.log("🧠 Building the 10-Factor Fashion Brain...");
    const tempFd = fs.openSync("consultant_temp.txt", "w");
    let count = 0;
    let isFirst = true;

    // THE 10-DIMENSIONAL LOOP
    GENDERS.forEach(gender => {
    OCCASIONS.forEach(occasion => {
    STYLE_VIBES.forEach(vibe => {
    AGE_GROUPS.forEach(age => {
    FIT_PREFS.forEach(fit => {
    UNDERTONES.forEach(undertone => {
    SKIN_TONES.forEach(skin => {
    SEASONS.forEach(season => {
    BODY_SHAPES.forEach(body => {
    HEIGHTS.forEach(height => { // <--- All 10 loops present
        
        // Construct the unique key
        const key = `${gender}|${occasion}|${vibe}|${age}|${fit}|${undertone}|${skin}|${season}|${body}|${height}`;
        const params = { gender, occasion, vibe, age, fit, undertone, skin, season, body, height };
        
        // Calculate
        const bestItem = selectItem(params);
        const bestColor = selectColor(params);

        // Store
        const itemId = getOrAddId(bestItem, ITEM_DICT, itemToId);
        const colorId = getOrAddId(bestColor, COLOR_DICT, colorToId);

        // Write
        const sep = isFirst ? "" : ",";
        fs.writeSync(tempFd, `${sep}"${key}":[${itemId},${colorId}]`);
        isFirst = false;
        count++;

    }); }); }); }); }); }); }); }); }); });

    fs.closeSync(tempFd);

    // Save Final DB
    console.log("💾 Saving Master DB...");
    const finalFd = fs.openSync("consultant_master_db.json", "w");
    const dictObj = { items: ITEM_DICT, colors: COLOR_DICT };
    fs.writeSync(finalFd, `{"dicts":${JSON.stringify(dictObj)},"data":{`);
    fs.writeSync(finalFd, fs.readFileSync("consultant_temp.txt").toString());
    fs.writeSync(finalFd, "}}");
    fs.closeSync(finalFd);
    fs.unlinkSync("consultant_temp.txt");

    console.log(`✅ Success! Generated ${count} Unique Style Rules.`);
}

buildConsultantDB();
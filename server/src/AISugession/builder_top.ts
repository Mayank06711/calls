import * as fs from "fs";

// --- 1. THE PARAMETER UNIVERSE ---

const GENDERS = ["Male", "Female"] as const;

const OCCASIONS = [
    "Wedding: Haldi (Day)", "Wedding: Mehendi (Afternoon)", "Wedding: Sangeet (Night)", 
    "Wedding: Main Pheras (Guest)", "Wedding: Reception (Night)",
    "Office: Daily Wear", "Office: Board Meeting", "Office: Friday Casuals",
    "Social: Clubbing", "Social: Dinner Date", "Social: Brunch", 
    "Travel: Airport Look", "Travel: Beach Vacation"
] as const;

const STYLE_VIBES = ["Classic", "Trendy", "Desi", "Fusion", "Old Money"] as const;
const AGE_GROUPS = ["GenZ (16-25)", "Young Adult (26-35)", "Mid-Aged (36-50)", "Senior (50+)"] as const;
const FIT_PREFS = ["Slim Fit", "Regular Fit", "Oversized"] as const;
const UNDERTONES = ["Warm", "Cool", "Olive", "Neutral"] as const;
const SKIN_TONES = ["Fair", "Wheatish", "Dusky", "Dark Brown"] as const;
const SEASONS = ["Summer", "Winter", "Monsoon"] as const;
const BODY_SHAPES = ["Trapezoid", "Rectangle", "Triangle", "Inverted_Triangle", "Oval", "Hourglass", "Pear", "Apple"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;

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
    const isDark = (skin.includes("Dusky") || skin.includes("Dark"));
    
    // 8. UNDERTONE LOGIC (Hue)
    let color = "Navy";
    
    if (undertone === "Olive") {
        if (occasion.includes("Haldi")) color = "Mustard"; // Olive skins look green in Lemon yellow
        else if (occasion.includes("Wedding")) color = "Deep Wine / Teal";
        else color = "Olive Green / Rust";
    } 
    else if (undertone === "Warm") {
        if (occasion.includes("Haldi")) color = "Marigold Orange";
        else color = isDark ? "Rich Maroon" : "Peach / Cream";
    } 
    else if (undertone === "Cool") {
        if (occasion.includes("Haldi")) color = "Lemon Yellow";
        else color = "Royal Blue / Baby Pink";
    }

    // 9. SKIN TONE & SEASON LOGIC (Brightness)
    if (season === "Winter") {
        // Darker shades for winter
        if (color.includes("Pink")) color = "Dusty Rose";
        if (color.includes("Blue")) color = "Midnight Blue";
    }
    
    // 10. AGE LOGIC (Safety Check)
    if (age.includes("Senior") && occasion.includes("Wedding")) {
        // Seniors usually prefer dignified colors over loud ones
        if (color.includes("Neon")) color = "Beige / Gold";
    }

    return color;
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
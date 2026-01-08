import * as fs from "fs";

// --- 1. THE 11 USER FACTORS ---
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
const SEASONS = ["Summer", "Winter", "Monsoon"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;

// Included for Key Consistency with other engines:
const FIT_PREFS = ["Slim Fit", "Regular Fit", "Oversized"] as const;
const BODY_SHAPES = ["Trapezoid", "Rectangle", "Oval", "Hourglass", "Pear", "Apple"] as const;
const UNDERTONES = ["Warm", "Cool", "Olive", "Neutral"] as const;
const SKIN_TONES = ["Fair", "Wheatish", "Dusky", "Dark Brown"] as const;

// --- 2. OUTFIT CONTEXT (Top + Bottom) ---
const TOP_CATEGORIES = ["Ethnic Top", "Western Shirt", "T-Shirt/Top", "Dress/Saree"] as const;
const BOTTOM_CATEGORIES = ["Formal Trousers", "Jeans/Chinos", "Ethnic Bottom", "Shorts/Skirts", "Open Bottom (Lehenga)"] as const;

// --- 3. THE MASTER SHOE WARDROBE (Expanded for Realism) ---

const FOOTWEAR_DB: any = {
    Male: {
        "Ethnic Top": { 
            "Ethnic Bottom": { // Kurta + Pyjama/Dhoti
                "Wedding": ["Embroidered Mojaris", "Velvet Juttis", "Gold Kolhapuris", "Leather Sandals"],
                "Social": ["Tan Kolhapuris", "Leather Sandals", "Brown Mojaris", "Simple Juttis"]
            },
            "Jeans/Chinos": { // Kurta + Jeans (Fusion)
                "Social": ["Leather Loafers", "Suede Mules", "Kolhapuri Chappals", "Chelsea Boots"],
                "Wedding": ["Velvet Loafers", "Embroidered Mules", "Juttis", "Monk Straps"]
            }
        },
        "Western Shirt": { 
            "Formal Trousers": { // Suit/Formal
                "Office": ["Oxford Shoes", "Derby Shoes", "Penny Loafers", "Wholecut Oxfords"],
                "Wedding": ["Patent Leather Oxfords", "Velvet Loafers", "Double Monk Straps", "Dress Boots"]
            },
            "Jeans/Chinos": { // Smart Casual
                "Social": ["Minimalist White Sneakers", "Chelsea Boots", "Suede Loafers", "Desert Boots"],
                "Office": ["Leather Boots", "Brogues", "Derby Shoes", "Penny Loafers"]
            },
            "Shorts/Skirts": { // Vacation
                "Travel": ["Espadrilles", "Boat Shoes", "Leather Slides", "Canvas Sneakers"]
            }
        },
        "T-Shirt/Top": {
            "Jeans/Chinos": { // Casual
                "Social": ["High-Top Sneakers", "Chunky Dad Shoes", "Canvas Vans", "Retro Runners"],
                "Travel": ["Running Shoes", "Slip-On Sneakers", "Crocs (Comfort)", "Slides"]
            }
        }
    },
    Female: {
        "Ethnic Top": { 
            "Ethnic Bottom": { // Kurti + Salwar
                "Wedding": ["Embroidered Juttis", "Gold Block Heels", "Kolhapuri Wedges", "Mojaris"],
                "Social": ["Flat Kolhapuris", "Leather Juttis", "Mules", "Comfort Sandals"]
            },
            "Jeans/Chinos": { // Kurti + Jeans
                "Social": ["Kolhapuri Flats", "Tan Loafers", "Block Heels", "Ballet Flats"]
            }
        },
        "Dress/Saree": {
            "Open Bottom (Lehenga)": { // Saree/Lehenga
                "Wedding": ["Embroidered Pencil Heels", "Comfort Wedges", "Gold Stilettos", "Crystal Sandals"],
                "Social": ["Kitten Heels", "Block Heels", "Metallic Flats", "Strappy Sandals"]
            }
        },
        "Western Shirt": {
            "Formal Trousers": { // Office
                "Office": ["Pointed Toe Pumps", "Leather Loafers", "Kitten Heels", "Block Heel Pumps"],
                "Social": ["Stilettos", "Strappy Heels", "Ankle Boots", "Mules"]
            },
            "Jeans/Chinos": { // Casual Chic
                "Social": ["White Sneakers", "Ankle Boots", "Mules", "Loafers"],
                "Winter": ["Knee-High Boots", "Combat Boots", "Chelsea Boots", "Uggs"]
            },
            "Shorts/Skirts": {
                "Social": ["Gladiator Sandals", "Strappy Heels", "Sneakers", "Thigh-High Boots"]
            }
        }
    }
};

// --- 4. THE 13-FACTOR LOGIC ---

function getContext(occasion: string): string {
    if (occasion.includes("Wedding") || occasion.includes("Festival")) return "Wedding";
    if (occasion.includes("Office") || occasion.includes("Board")) return "Office";
    if (occasion.includes("Travel") || occasion.includes("Beach")) return "Travel";
    return "Social";
}

function selectThreeShoes(params: any): string[] {
    const { gender, topCat, bottomCat, occasion, season, vibe, height, age } = params;
    const context = getContext(occasion);

    // 1. Traverse Matrix
    // Safe navigation with Fallbacks
    const genderDb = FOOTWEAR_DB[gender];
    const topDb = genderDb[topCat] || genderDb["Western Shirt"];
    const bottomDb = topDb[bottomCat] || topDb["Jeans/Chinos"] || genderDb["Western Shirt"]["Jeans/Chinos"]; // Deep fallback
    
    // Check if context exists in DB, otherwise define a default list
    let rawList = Array.isArray(bottomDb) ? bottomDb : (bottomDb[context] || bottomDb["Social"]);
    
    // Absolute Safety Net
    if (!rawList) rawList = ["Classic Shoes", "Trendy Shoes", "Comfort Shoes"];

    // 2. FILTER: SEASON
    if (season === "Monsoon") {
        // Ban Suede, Velvet, Canvas
        rawList = rawList.filter((i: string) => !i.includes("Suede") && !i.includes("Velvet") && !i.includes("Canvas") && !i.includes("Espadrilles"));
        if (rawList.length === 0) rawList = ["Leather Loafers", "Rubber Sole Sandals", "Croc-style Shoes"];
    } else if (season === "Winter") {
        // Boost Boots
        const boots = rawList.filter((i: string) => i.includes("Boots") || i.includes("Closed"));
        if (boots.length > 0) rawList = [...boots, ...rawList];
    }

    // 3. FILTER: HEIGHT (Critical for Women)
    if (gender === "Female") {
        if (height === "Short") {
            // Short people often want height
            const heels = rawList.filter((i: string) => i.includes("Heels") || i.includes("Wedges") || i.includes("Stilettos"));
            if (heels.length > 0) rawList = heels;
        } else if (height === "Tall" && !occasion.includes("Wedding")) {
            // Tall people often prefer flats for comfort
            const flats = rawList.filter((i: string) => !i.includes("Stilettos") && !i.includes("High"));
            if (flats.length > 0) rawList = flats;
        }
    }

    // 4. FILTER: AGE
    if (age.includes("GenZ")) {
        // Replace boring sneakers with cool ones
        rawList = rawList.map((i: string) => i === "Sneakers" ? "Chunky Sneakers" : i);
        rawList = rawList.map((i: string) => i.includes("Oxford") ? "Chunky Loafers" : i);
    } else if (age.includes("Senior")) {
        // Comfort Priority
        rawList = rawList.filter((i: string) => !i.includes("Stilettos") && !i.includes("High-Tops"));
    }

    // 5. SELECTION (Classic, Trendy, Comfort)
    // Ensure we have enough items
    if (rawList.length < 3) rawList = [...rawList, "Standard Footwear", "Comfort Option"];

    let classic = rawList[0];
    let trendy = rawList.length > 1 ? rawList[1] : rawList[0];
    let comfort = rawList.length > 2 ? rawList[2] : rawList[0];

    // VIBE OVERRIDES
    if (vibe === "Trendy") trendy += " (Statement)";
    if (vibe === "Old Money") classic = "Classic Leather " + classic;
    if (vibe === "Fusion" && topCat === "Ethnic Top") trendy = "Sneakers (Fusion Style)";

    return [classic, trendy, comfort];
}

// --- 5. THE BUILDER ---

const SHOE_DICT: string[] = [];
const shoeToId = new Map<string, number>();

function getOrAddId(val: string): number {
    if (!shoeToId.has(val)) {
        shoeToId.set(val, SHOE_DICT.length);
        SHOE_DICT.push(val);
    }
    return shoeToId.get(val)!;
}

function buildFootwearDB() {
    console.log("👞 Building 13-Factor Footwear Brain...");
    const tempFd = fs.openSync("footwear_temp.txt", "w");
    let count = 0;
    let isFirst = true;

    // THE 13-FACTOR LOOP
    GENDERS.forEach(gender => {
    OCCASIONS.forEach(occasion => {
    SEASONS.forEach(season => {
    STYLE_VIBES.forEach(vibe => {
    TOP_CATEGORIES.forEach(topCat => {
    BOTTOM_CATEGORIES.forEach(bottomCat => {
    HEIGHTS.forEach(height => {
    AGE_GROUPS.forEach(age => {
        // Dummy loops for Key Consistency
        FIT_PREFS.forEach(fit => {
        BODY_SHAPES.forEach(body => {
        UNDERTONES.forEach(undertone => {
        SKIN_TONES.forEach(skin => {

            const key = `${gender}|${occasion}|${season}|${vibe}|${topCat}|${bottomCat}|${height}|${age}|${fit}|${body}|${undertone}|${skin}`;
            
            const [opt1, opt2, opt3] = selectThreeShoes({ gender, topCat, bottomCat, occasion, season, vibe, height, age });
            
            const id1 = getOrAddId(opt1);
            const id2 = getOrAddId(opt2);
            const id3 = getOrAddId(opt3);

            const sep = isFirst ? "" : ",";
            fs.writeSync(tempFd, `${sep}"${key}":[${id1},${id2},${id3}]`);
            isFirst = false;
            count++;

            if (count % 500000 === 0) {
                console.log(`  ...Generated ${count} Footwear Rules`);
                if (global.gc) global.gc();
            }

        }); }); }); });
    }); }); }); }); }); }); }); });

    fs.closeSync(tempFd);

    console.log("💾 Saving Footwear Master JSON...");
    const finalFd = fs.openSync("footwear_master_db.json", "w");
    
    fs.writeSync(finalFd, `{"dicts":{"items":${JSON.stringify(SHOE_DICT)}}, "data":{`);
    fs.writeSync(finalFd, fs.readFileSync("footwear_temp.txt").toString());
    fs.writeSync(finalFd, "}}");
    
    fs.closeSync(finalFd);
    fs.unlinkSync("footwear_temp.txt");

    console.log(`✅ Done. Generated ${count} Footwear Sets.`);
}

buildFootwearDB();
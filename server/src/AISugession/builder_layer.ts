import * as fs from "fs";

// --- 1. THE 11 INPUT FACTORS ---

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
const SEASONS = ["Summer", "Winter", "Monsoon"] as const;
const BODY_SHAPES = ["Trapezoid", "Rectangle", "Triangle", "Inverted_Triangle", "Oval", "Hourglass", "Pear", "Apple"] as const;
const HEIGHTS = ["Short", "Medium", "Tall"] as const;
const UNDERTONES = ["Warm", "Cool", "Olive", "Neutral"] as const;
const SKIN_TONES = ["Fair", "Wheatish", "Dusky", "Dark Brown"] as const;

// THE BRIDGE FACTOR: Categories the previous engine's output falls into
const TOP_CATEGORIES = ["Ethnic Top", "Western Shirt", "T-Shirt/Top", "Dress/Saree"] as const;

// --- 2. THE MASTER LAYERING WARDROBE ---

const LAYER_DB: any = {
    Male: {
        "Ethnic Top": { // Context: Kurta, Sherwani
            "Wedding": {
                "Summer": ["Floral Sadri", "Silk Waistcoat", "Cotton Silk Stole", "Linen Nehru Jacket"],
                "Winter": ["Velvet Bandhgala", "Embroidered Pashmina Shawl", "Brocade Nehru Jacket", "Tweed Jacket"]
            },
            "Social": { 
                "Summer": ["Linen Vest", "Printed Cotton Sadri", "Open Shirt Layer"],
                "Winter": ["Corduroy Jacket", "Knitted Shawl", "Denim Jacket"]
            }
        },
        "Western Shirt": { // Context: Formal Shirt
            "Office": {
                "Summer": ["Unlined Grey Blazer", "Sleeveless Sweater Vest", "Formal Gilet"],
                "Winter": ["Charcoal Wool Blazer", "Merino V-Neck Sweater", "Trench Coat"]
            },
            "Social": {
                "Summer": ["Linen Blazer", "Denim Jacket", "Cotton Bomber", "Varsity Jacket"],
                "Winter": ["Leather Biker Jacket", "Suede Bomber", "Peacoat", "Puffer Vest"]
            }
        },
        "T-Shirt/Top": { // Context: Polo, Tee
            "Social": {
                "Summer": ["Open Checkered Shirt", "Denim Vest", "Lightweight Bomber"],
                "Winter": ["Puffer Jacket", "Hoodie (Zip-up)", "Flannel Overshirt", "Utility Vest"]
            }
        }
    },
    Female: {
        "Ethnic Top": { // Context: Kurti, Suit
            "Wedding": {
                "Summer": ["Phulkari Dupatta", "Sheer Organza Jacket", "Embroidered Potli & Stole", "Cape Shrug"],
                "Winter": ["Velvet Shawl", "Brocade Ethnic Jacket", "Heavy Pashmina Stole", "Silk Trench"]
            },
            "Social": {
                "Summer": ["Cotton Block-Print Scarf", "Denim Vest", "Crochet Shrug", "Longline Vest"],
                "Winter": ["Long Woolen Cardigan", "Denim Jacket", "Knitted Poncho", "Faux Leather Jacket"]
            }
        },
        "Dress/Saree": { // Context: Saree, Lehenga
            "Wedding": {
                "Summer": ["Belted Cape", "Sheer Shrug", "Contrast Net Veil", "Embellished Belt"],
                "Winter": ["Velvet Cape Shawl", "Full-Sleeve Brocade Jacket", "Fur Stole", "High-Neck Coat"]
            },
            "Social": {
                "Summer": ["Denim Jacket", "Light Kimono", "Belted Scarf"],
                "Winter": ["Leather Jacket", "Trench Coat", "Faux Fur Bolero"]
            }
        },
        "Western Shirt": { // Context: Tops
            "Office": {
                "Summer": ["Linen Blazer", "Long Sleeveless Vest", "Silk Scarf"],
                "Winter": ["Tailored Wool Blazer", "Trench Coat", "Houndstooth Cardigan"]
            },
            "Social": {
                "Summer": ["Kimono", "Oversized Boyfriend Shirt", "Cropped Denim Jacket"],
                "Winter": ["Teddy Coat", "Leather Biker Jacket", "Puffer Jacket"]
            }
        }
    }
};

// --- 3. THE 11-FACTOR LOGIC ---

function getContext(occasion: string): string {
    if (occasion.includes("Wedding") || occasion.includes("Festival")) return "Wedding";
    if (occasion.includes("Office") || occasion.includes("Board")) return "Office";
    return "Social";
}

function selectThreeLayers(params: any): string[] {
    const { gender, topCat, occasion, season, vibe, height, body, age } = params;
    const context = getContext(occasion);
    
    // 1. Get Base List safely
    const genderDb = LAYER_DB[gender];
    const catDb = genderDb[topCat] || genderDb["Ethnic Top"];
    const contextDb = catDb[context] || catDb["Social"];
    let rawList = contextDb[season] || contextDb["Winter"];

    // 2. FILTER: HEIGHT LOGIC
    if (height === "Short") {
        // Remove items that overwhelm small frames
        rawList = rawList.filter((i: string) => !i.includes("Longline") && !i.includes("Trench") && !i.includes("Oversized"));
        if (rawList.length === 0) rawList = ["Cropped Jacket", "Fitted Vest", "Stole"];
    }

    // 3. FILTER: BODY SHAPE LOGIC
    if (body === "Oval" || body === "Apple") {
        // Remove high necks or bulky puffs
        rawList = rawList.map((i: string) => i.replace("Bandhgala", "Open Jacket"));
        rawList = rawList.filter((i: string) => !i.includes("Puffer") && !i.includes("Belted"));
    }
    if (body === "Pear" || body === "Triangle") {
        // Need structure
        const structured = rawList.filter((i: string) => i.includes("Blazer") || i.includes("Jacket") || i.includes("Structure"));
        if (structured.length > 0) rawList = structured;
    }

    // 4. FILTER: AGE LOGIC
    if (age.includes("GenZ")) {
        rawList = rawList.map((i: string) => i === "Cardigan" ? "Oversized Cardigan" : i);
        rawList = rawList.map((i: string) => i === "Blazer" ? "Oversized Blazer" : i);
    } else if (age.includes("Senior")) {
        rawList = rawList.filter((i: string) => !i.includes("Crop") && !i.includes("Biker"));
    }

    // 5. SELECTION (Classic, Contrast, Statement)
    if (rawList.length < 3) rawList = [...rawList, "Standard Layer", "Designer Layer"];
    
    let classic = rawList[0];
    let contrast = rawList.length > 1 ? rawList[1] : rawList[0];
    let statement = rawList.length > 2 ? rawList[rawList.length - 1] : rawList[0];

    // Vibe Overrides
    if (vibe === "Trendy") statement += " (Trendy Cut)";
    if (vibe === "Fusion") {
        if (gender === "Female") statement = "Belted Cape / Jacket";
        else statement = "Asymmetric Layer";
    }

    return [classic, contrast, statement];
}

// --- 4. THE BUILDER ---

const LAYER_DICT: string[] = [];
const layerToId = new Map<string, number>();

function getOrAddId(val: string): number {
    if (!layerToId.has(val)) {
        layerToId.set(val, LAYER_DICT.length);
        LAYER_DICT.push(val);
    }
    return layerToId.get(val)!;
}

function buildLayeringDB() {
    console.log("🧥 Building 11-Factor Layering Brain...");
    const tempFd = fs.openSync("layering_temp.txt", "w");
    let count = 0;
    let isFirst = true;

    // THE 11-DIMENSIONAL LOOP
    GENDERS.forEach(gender => {
    OCCASIONS.forEach(occasion => {
    SEASONS.forEach(season => {
    STYLE_VIBES.forEach(vibe => {
    TOP_CATEGORIES.forEach(topCat => {
    AGE_GROUPS.forEach(age => {
    BODY_SHAPES.forEach(body => {
    HEIGHTS.forEach(height => {
        // Undertone, Skin, Fit are part of key but used for consistency (logic handled in runtime color calc)
        UNDERTONES.forEach(undertone => {
        SKIN_TONES.forEach(skin => {
        FIT_PREFS.forEach(fit => {

            // 1. Generate Key
            // Order: Gender|Occasion|Season|Vibe|TopCategory|Age|Body|Height|Undertone|Skin|Fit
            const key = `${gender}|${occasion}|${season}|${vibe}|${topCat}|${age}|${body}|${height}|${undertone}|${skin}|${fit}`;
            
            // 2. Get 3 Options
            const [opt1, opt2, opt3] = selectThreeLayers({ gender, occasion, season, vibe, topCat, age, body, height });
            
            // 3. Compress
            const id1 = getOrAddId(opt1);
            const id2 = getOrAddId(opt2);
            const id3 = getOrAddId(opt3);

            // 4. Write
            const sep = isFirst ? "" : ",";
            fs.writeSync(tempFd, `${sep}"${key}":[${id1},${id2},${id3}]`);
            isFirst = false;
            count++;

            // GC
            if (count % 500000 === 0) {
                console.log(`  ...Generated ${count} Layering Rules`);
                if (global.gc) global.gc();
            }

        }); }); }); 
    }); }); }); }); }); }); }); });

    fs.closeSync(tempFd);

    console.log("💾 Saving Layering Master JSON...");
    const finalFd = fs.openSync("layering_master_db.json", "w");
    
    fs.writeSync(finalFd, `{"dicts":{"items":${JSON.stringify(LAYER_DICT)}}, "data":{`);
    fs.writeSync(finalFd, fs.readFileSync("layering_temp.txt").toString());
    fs.writeSync(finalFd, "}}");
    
    fs.closeSync(finalFd);
    fs.unlinkSync("layering_temp.txt");

    console.log(`✅ Done. Generated ${count} Layering Sets.`);
}

buildLayeringDB();
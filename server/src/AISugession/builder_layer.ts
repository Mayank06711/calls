import * as fs from "fs";
import {
    GENDERS, OCCASIONS, STYLE_VIBES, AGE_GROUPS,
    SEASONS, BODY_SHAPES, HEIGHTS,
    TOP_CATEGORIES, getOccasionContext,
} from "./shared";

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

function selectThreeLayers(params: any): string[] {
    const { gender, topCat, occasion, season, vibe, height, body, age } = params;
    const context = getOccasionContext(occasion);
    
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

    // THE 8-DIMENSIONAL LOOP (removed undertone, skin, fit - they don't affect layer selection)
    GENDERS.forEach(gender => {
    OCCASIONS.forEach(occasion => {
    SEASONS.forEach(season => {
    STYLE_VIBES.forEach(vibe => {
    TOP_CATEGORIES.forEach(topCat => {
    AGE_GROUPS.forEach(age => {
    BODY_SHAPES.forEach(body => {
    HEIGHTS.forEach(height => {

            // 1. Generate Key
            // Order: Gender|Occasion|Season|Vibe|TopCategory|Age|Body|Height
            const key = `${gender}|${occasion}|${season}|${vibe}|${topCat}|${age}|${body}|${height}`;

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

            if (count % 50000 === 0) {
                console.log(`  ...Generated ${count} Layering Rules`);
            }

    }); }); }); }); }); }); }); });

    fs.closeSync(tempFd);

    console.log("💾 Saving Layering Master JSON...");
    const finalFd = fs.openSync("layering_master_db.json", "w");

    fs.writeSync(finalFd, `{"dicts":{"items":${JSON.stringify(LAYER_DICT)}}, "data":{`);

    // Stream temp file in chunks to avoid ERR_STRING_TOO_LONG
    const CHUNK = 64 * 1024 * 1024; // 64MB chunks
    const tempSize = fs.statSync("layering_temp.txt").size;
    const buf = new Uint8Array(Math.min(CHUNK, tempSize));
    const readFd = fs.openSync("layering_temp.txt", "r");
    let pos = 0;
    while (pos < tempSize) {
        const bytesRead = fs.readSync(readFd, buf, 0, Math.min(CHUNK, tempSize - pos), pos);
        fs.writeSync(finalFd, buf, 0, bytesRead);
        pos += bytesRead;
    }
    fs.closeSync(readFd);

    fs.writeSync(finalFd, "}}");

    fs.closeSync(finalFd);
    fs.unlinkSync("layering_temp.txt");

    console.log(`✅ Done. Generated ${count} Layering Sets.`);
}

buildLayeringDB();
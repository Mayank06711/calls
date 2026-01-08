import * as fs from "fs";

// --- 1. INTERFACES ---

interface FootwearDB {
    dicts: { items: string[] };
    data: { [key: string]: [number, number, number] }; // [Classic, Trendy, Comfort]
}

export interface FootwearInput {
    // 10 USER FACTORS
    gender: "Male" | "Female";
    occasion: string;
    season: "Summer" | "Winter" | "Monsoon";
    styleVibe: string;
    ageGroup: string;
    bodyShape: string;
    height: "Short" | "Medium" | "Tall";
    undertone: string;
    skinTone: string;
    fitPreference: string;

    // OUTFIT INPUTS (From Previous Engines)
    topItemName: string; 
    topItemColor: string; 
    bottomItemName: string;
    
    // NEW: LAYER INPUT (For Smart Color Matching)
    layerColor?: string; // Optional
}

export interface ShoeOption {
    type: "Classic" | "Trendy" | "Comfort";
    item: string;
    color: string;
    note: string;
}

export interface FootwearResult {
    options: [ShoeOption, ShoeOption, ShoeOption];
}

// --- 2. THE ENGINE CLASS ---

export class FootwearEngine {
    private db: FootwearDB;

    constructor() {
        console.log("👞 Loading 13-Factor Footwear Brain...");
        try {
            const raw = fs.readFileSync("footwear_master_db.json", "utf-8");
            this.db = JSON.parse(raw);
        } catch (e) {
            console.error("❌ Error: DB not found. Run footwear_builder.ts first!");
            throw e;
        }
    }

    // --- A. CATEGORY MAPPERS (Translates specific items to logic groups) ---
    private getTopCategory(topName: string, gender: string): string {
        const lower = topName.toLowerCase();
        if (gender === "Male") {
            if (lower.includes("kurta") || lower.includes("sherwani") || lower.includes("pathani")) return "Ethnic Top";
            if (lower.includes("shirt") && !lower.includes("t-shirt")) return "Western Shirt";
            return "T-Shirt/Top"; 
        } else {
            if (lower.includes("kurti") || lower.includes("suit") || lower.includes("anarkali")) return "Ethnic Top";
            if (lower.includes("saree") || lower.includes("lehenga") || lower.includes("gown")) return "Dress/Saree";
            return "Western Shirt"; 
        }
    }

    private getBottomCategory(bottomName: string, gender: string): string {
        const lower = bottomName.toLowerCase();
        if (lower.includes("dhoti") || lower.includes("pajama") || lower.includes("salwar") || lower.includes("churidar")) return "Ethnic Bottom";
        if (lower.includes("lehenga") || lower.includes("skirt")) return "Open Bottom (Lehenga)";
        if (lower.includes("shorts")) return "Shorts/Skirts";
        if (lower.includes("trouser") || lower.includes("formal") || lower.includes("suit")) return "Formal Trousers";
        return "Jeans/Chinos";
    }

    // --- B. THE COLOR BRAIN (Smart Matching) ---
    private getShoeColor(type: string, topColor: string, layerColor?: string): string {
        
        // RULE 1: SANDWICH METHOD (Match Shoes to Layer)
        // If there is a layer (Jacket/Stole), shoes usually match it to frame the outfit.
        if (layerColor && type === "Classic") {
            if (layerColor.includes("Gold") || layerColor.includes("Beige")) return "Tan / Gold";
            if (layerColor.includes("Silver") || layerColor.includes("Grey")) return "Black / Grey";
            if (layerColor.includes("Black")) return "Black";
            if (layerColor.includes("Brown")) return "Dark Brown";
            // If layer is colorful (e.g. Red), go neutral
            return "Nude / Beige";
        }

        // RULE 2: FALLBACK TO TOP
        const isWarm = topColor.includes("Red") || topColor.includes("Yellow") || topColor.includes("Orange") || topColor.includes("Cream");
        
        if (type === "Classic") {
            if (topColor.includes("Black")) return "Black";
            if (isWarm) return "Tan / Brown";
            return "Black / Navy";
        }

        if (type === "Trendy") {
            if (topColor.includes("White")) return "White (Crisp)";
            return "Contrast Pop Color";
        }

        return "Neutral / Earthy"; 
    }

    // --- C. KEY GENERATOR ---
    private generateKey(input: FootwearInput, topCat: string, bottomCat: string): string {
        // Order MUST match Builder
        return `${input.gender}|${input.occasion}|${input.season}|${input.styleVibe}|${topCat}|${bottomCat}|${input.height}|${input.ageGroup}|${input.fitPreference}|${input.bodyShape}|${input.undertone}|${input.skinTone}`;
    }

    // --- MAIN FUNCTION ---
    public getFootwearOptions(input: FootwearInput): FootwearResult {
        const topCat = this.getTopCategory(input.topItemName, input.gender);
        const bottomCat = this.getBottomCategory(input.bottomItemName, input.gender);
        
        const key = this.generateKey(input, topCat, bottomCat);
        const ids = this.db.data[key];

        // 1. Fallback if logic gap
        if (!ids) {
            return {
                options: [
                    { type: "Classic", item: "Classic Shoes", color: "Black", note: "Safe choice" },
                    { type: "Trendy", item: "Statement Shoes", color: "White", note: "Bold choice" },
                    { type: "Comfort", item: "Comfort Shoes", color: "Brown", note: "Relaxed choice" }
                ]
            };
        }

        // 2. Decode Items
        const itemClassic = this.db.dicts.items[ids[0]];
        const itemTrendy = this.db.dicts.items[ids[1]];
        const itemComfort = this.db.dicts.items[ids[2]];

        // 3. Construct Result
        return {
            options: [
                {
                    type: "Classic",
                    item: itemClassic,
                    color: this.getShoeColor("Classic", input.topItemColor, input.layerColor),
                    note: "Timeless choice matching the occasion."
                },
                {
                    type: "Trendy",
                    item: itemTrendy,
                    color: this.getShoeColor("Trendy", input.topItemColor, input.layerColor),
                    note: "Modern choice to elevate the look."
                },
                {
                    type: "Comfort",
                    item: itemComfort,
                    color: this.getShoeColor("Comfort", input.topItemColor, input.layerColor),
                    note: "Focuses on ease of movement."
                }
            ]
        };
    }
}
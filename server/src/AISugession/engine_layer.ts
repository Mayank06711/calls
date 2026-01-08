import * as fs from "fs";

// --- 1. INTERFACES ---

interface LayeringDB {
    dicts: { items: string[] };
    data: { [key: string]: [number, number, number] }; // Stores IDs for [Classic, Contrast, Statement]
}

export interface LayeringInput {
    // USER PROFILE INPUTS (10 Factors)
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

    // INPUTS FROM ENGINE A (The Top)
    topItemName: string; 
    topItemColor: string; 
}

export interface LayerOption {
    type: "Classic" | "Contrast" | "Statement";
    item: string;
    color: string;
    reason: string;
}

export interface LayeringResult {
    options: [LayerOption, LayerOption, LayerOption];
}

// --- 2. THE ENGINE CLASS ---

export class LayeringEngine {
    private db: LayeringDB;

    constructor() {
        console.log("🧥 Loading 11-Factor Layering Brain...");
        try {
            const raw = fs.readFileSync("layering_master_db.json", "utf-8");
            this.db = JSON.parse(raw);
        } catch (e) {
            console.error("❌ Error: DB not found. Run layering_builder.ts first!");
            throw e;
        }
    }

    // --- A. THE BRIDGE: Maps Specific Top -> General Category ---
    private getTopCategory(topName: string, gender: string): string {
        const lower = topName.toLowerCase();

        if (gender === "Male") {
            // Ethnic
            if (lower.includes("kurta") || lower.includes("sherwani") || lower.includes("pathani") || lower.includes("bandhgala")) return "Ethnic Top";
            // Formal/Western
            if (lower.includes("shirt") && !lower.includes("t-shirt")) return "Western Shirt";
            // Casual
            return "T-Shirt/Top"; 
        } else {
            // Ethnic
            if (lower.includes("kurti") || lower.includes("suit") || lower.includes("anarkali") || lower.includes("sharara")) return "Ethnic Top";
            // Saree/Lehenga
            if (lower.includes("saree") || lower.includes("lehenga") || lower.includes("gown") || lower.includes("drape")) return "Dress/Saree";
            // Western
            return "Western Shirt"; 
        }
    }

    // --- B. THE COLOR BRAIN: Calculates Layer Colors based on Top Color ---
    private getLayerColor(type: "Classic" | "Contrast" | "Statement", topColor: string, input: LayeringInput): string {
        const isWedding = input.occasion.includes("Wedding");
        
        // 1. CLASSIC (Harmonious / Matching / Neutral)
        if (type === "Classic") {
            if (input.occasion.includes("Office")) return "Grey / Navy / Black"; // Professional
            if (topColor.includes("White") || topColor.includes("Cream")) return "Beige / Gold";
            if (topColor.includes("Black")) return "Charcoal Grey";
            return "Matching Tone (Monochrome)";
        }

        // 2. CONTRAST (Complementary)
        if (type === "Contrast") {
            if (topColor.includes("Yellow") || topColor.includes("Mustard")) return "Floral Pink / Green";
            if (topColor.includes("Green")) return isWedding ? "Peach / Red" : "Beige";
            if (topColor.includes("Blue")) return "White / Silver";
            if (topColor.includes("Red") || topColor.includes("Maroon")) return "Beige / Gold";
            if (topColor.includes("Black")) return isWedding ? "Brocade / Silver" : "Tan / Camel";
            if (topColor.includes("White")) return "Deep Maroon / Navy";
            return "Contrast Color";
        }

        // 3. STATEMENT (Bold / Texture / Pattern)
        if (type === "Statement") {
            if (input.styleVibe === "Fusion") return "Geometric Print / Abstract";
            if (isWedding) return "Heavy Gold Zari / Velvet";
            if (input.season === "Winter") return "Rich Burgundy / Emerald";
            return "Bold Pattern / Neon Accent";
        }

        return "Neutral";
    }

    // --- C. THE KEY GENERATOR ---
    private generateKey(input: LayeringInput, topCategory: string): string {
        // Order MUST match Builder:
        // Gender|Occasion|Season|Vibe|TopCategory|Age|Body|Height|Undertone|Skin|Fit
        return `${input.gender}|${input.occasion}|${input.season}|${input.styleVibe}|${topCategory}|${input.ageGroup}|${input.bodyShape}|${input.height}|${input.undertone}|${input.skinTone}|${input.fitPreference}`;
    }

    // --- MAIN FUNCTION ---
    public getLayeringOptions(input: LayeringInput): LayeringResult {
        // 1. Translate Top Item -> Category
        const topCategory = this.getTopCategory(input.topItemName, input.gender);

        // 2. Build Key & Lookup
        const key = this.generateKey(input, topCategory);
        const ids = this.db.data[key];

        if (!ids) {
            console.warn(`⚠️ No exact layering rule for ${key}. Using fallback.`);
            // Basic fallback if key missing (rare if builder ran correctly)
            return {
                options: [
                    { type: "Classic", item: "Standard Layer", color: "Neutral", reason: "Fallback" },
                    { type: "Contrast", item: "Contrast Layer", color: "Contrast", reason: "Fallback" },
                    { type: "Statement", item: "Statement Layer", color: "Bold", reason: "Fallback" }
                ]
            };
        }

        // 3. Decode Items
        const itemClassic = this.db.dicts.items[ids[0]];
        const itemContrast = this.db.dicts.items[ids[1]];
        const itemStatement = this.db.dicts.items[ids[2]];

        // 4. Construct Result with Calculated Colors
        return {
            options: [
                {
                    type: "Classic",
                    item: itemClassic,
                    color: this.getLayerColor("Classic", input.topItemColor, input),
                    reason: "Safe, harmonious choice."
                },
                {
                    type: "Contrast",
                    item: itemContrast,
                    color: this.getLayerColor("Contrast", input.topItemColor, input),
                    reason: "Adds visual pop and breaks the monochrome."
                },
                {
                    type: "Statement",
                    item: itemStatement,
                    color: this.getLayerColor("Statement", input.topItemColor, input),
                    reason: "Bold choice for a unique look."
                }
            ]
        };
    }
}
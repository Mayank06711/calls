import * as fs from "fs";
import * as path from "path";
import { getTopCategory, getLayerColorSuggestion } from "./shared";

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'layering_master_db.json');

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
            const raw = fs.readFileSync(DB_FILE, "utf-8");
            this.db = JSON.parse(raw);
            console.log("✅ Layering Engine Online.");
        } catch (e) {
            console.error("❌ Error: DB not found at", DB_FILE, "Run layering_builder.ts first!");
            throw e;
        }
    }

    // --- A & B: Bridge mapper + color logic now use shared.ts ---
    // getTopCategory() and getLayerColorSuggestion() imported from "./shared"

    // --- C. THE KEY GENERATOR ---
    private generateKey(input: LayeringInput, topCategory: string): string {
        // Order MUST match Builder:
        // Gender|Occasion|Season|Vibe|TopCategory|Age|Body|Height
        return `${input.gender}|${input.occasion}|${input.season}|${input.styleVibe}|${topCategory}|${input.ageGroup}|${input.bodyShape}|${input.height}`;
    }

    // --- MAIN FUNCTION ---
    public getLayeringOptions(input: LayeringInput): LayeringResult {
        // 1. Translate Top Item -> Category
        const topCategory = getTopCategory(input.topItemName, input.gender);

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
                    color: getLayerColorSuggestion("Classic", input.topItemColor, input.occasion, input.styleVibe, input.season),
                    reason: "Safe, harmonious choice."
                },
                {
                    type: "Contrast",
                    item: itemContrast,
                    color: getLayerColorSuggestion("Contrast", input.topItemColor, input.occasion, input.styleVibe, input.season),
                    reason: "Adds visual pop and breaks the monochrome."
                },
                {
                    type: "Statement",
                    item: itemStatement,
                    color: getLayerColorSuggestion("Statement", input.topItemColor, input.occasion, input.styleVibe, input.season),
                    reason: "Bold choice for a unique look."
                }
            ]
        };
    }
}
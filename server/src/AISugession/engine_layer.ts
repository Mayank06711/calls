import * as path from "path";
import Database, { Database as DatabaseType } from "better-sqlite3";
import { getTopCategory, getLayerColorSuggestion } from "./shared";
import { hashKey } from "./db_utils";

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'layering_master.db');

// --- 1. INTERFACES ---

interface LayeringDicts {
    items: string[];
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
    private db: DatabaseType;
    private dicts: LayeringDicts;
    private stmt: any;

    constructor() {
        console.log("🧥 Loading 11-Factor Layering Brain (SQLite)...");
        try {
            this.db = new Database(DB_FILE, { readonly: true });
            this.db.pragma("cache_size = -4000"); // 4MB cache

            // Load dicts into memory (tiny)
            this.dicts = { items: [] };
            const rows = this.db.prepare("SELECT type, idx, value FROM dicts ORDER BY type, idx").all() as any[];
            for (const row of rows) {
                if (row.type === "items") this.dicts.items[row.idx] = row.value;
            }

            // Prepare lookup statement
            this.stmt = this.db.prepare("SELECT v0, v1, v2 FROM data WHERE h = ?");

            console.log("✅ Layering Engine Online.");
        } catch (e) {
            console.error("❌ Error: DB not found at", DB_FILE, "Run 'npm run convert:db' first!");
            throw e;
        }
    }

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
        const row = this.stmt.get(hashKey(key)) as { v0: number; v1: number; v2: number } | undefined;

        if (!row) {
            console.warn(`⚠️ No exact layering rule for ${key}. Using fallback.`);
            return {
                options: [
                    { type: "Classic", item: "Standard Layer", color: "Neutral", reason: "Fallback" },
                    { type: "Contrast", item: "Contrast Layer", color: "Contrast", reason: "Fallback" },
                    { type: "Statement", item: "Statement Layer", color: "Bold", reason: "Fallback" }
                ]
            };
        }

        // 3. Decode Items
        const itemClassic = this.dicts.items[row.v0];
        const itemContrast = this.dicts.items[row.v1];
        const itemStatement = this.dicts.items[row.v2];

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

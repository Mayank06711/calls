import * as path from "path";
import Database, { Database as DatabaseType } from "better-sqlite3";
import { getTopCategory, getBottomCategory, getShoeColorSuggestion } from "./shared";
import { hashKey } from "./db_utils";

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'footwear_master.db');

// --- 1. INTERFACES ---

interface FootwearDicts {
    items: string[];
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
    private db: DatabaseType;
    private dicts: FootwearDicts;
    private stmt: any;

    constructor() {
        console.log("👞 Loading 13-Factor Footwear Brain (SQLite)...");
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

            console.log("✅ Footwear Engine Online.");
        } catch (e) {
            console.error("❌ Error: DB not found at", DB_FILE, "Run 'npm run convert:db' first!");
            throw e;
        }
    }

    // --- C. KEY GENERATOR ---
    private generateKey(input: FootwearInput, topCat: string, bottomCat: string): string {
        // Order MUST match Builder:
        // Gender|Occasion|Season|Vibe|TopCat|BottomCat|Height|Age
        return `${input.gender}|${input.occasion}|${input.season}|${input.styleVibe}|${topCat}|${bottomCat}|${input.height}|${input.ageGroup}`;
    }

    // --- MAIN FUNCTION ---
    public getFootwearOptions(input: FootwearInput): FootwearResult {
        const topCat = getTopCategory(input.topItemName, input.gender);
        const bottomCat = getBottomCategory(input.bottomItemName, input.gender);

        const key = this.generateKey(input, topCat, bottomCat);
        const row = this.stmt.get(hashKey(key)) as { v0: number; v1: number; v2: number } | undefined;

        // 1. Fallback if logic gap
        if (!row) {
            return {
                options: [
                    { type: "Classic", item: "Classic Shoes", color: "Black", note: "Safe choice" },
                    { type: "Trendy", item: "Statement Shoes", color: "White", note: "Bold choice" },
                    { type: "Comfort", item: "Comfort Shoes", color: "Brown", note: "Relaxed choice" }
                ]
            };
        }

        // 2. Decode Items
        const itemClassic = this.dicts.items[row.v0];
        const itemTrendy = this.dicts.items[row.v1];
        const itemComfort = this.dicts.items[row.v2];

        // 3. Construct Result
        return {
            options: [
                {
                    type: "Classic",
                    item: itemClassic,
                    color: getShoeColorSuggestion("Classic", input.topItemColor, input.layerColor),
                    note: "Timeless choice matching the occasion."
                },
                {
                    type: "Trendy",
                    item: itemTrendy,
                    color: getShoeColorSuggestion("Trendy", input.topItemColor, input.layerColor),
                    note: "Modern choice to elevate the look."
                },
                {
                    type: "Comfort",
                    item: itemComfort,
                    color: getShoeColorSuggestion("Comfort", input.topItemColor, input.layerColor),
                    note: "Focuses on ease of movement."
                }
            ]
        };
    }
}

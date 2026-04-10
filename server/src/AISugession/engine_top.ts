import * as path from "path";
import Database, { Database as DatabaseType } from "better-sqlite3";
import { hashKey } from "./db_utils";

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'consultant_master.db');

interface ConsultantDicts {
    items: string[];
    colors: string[];
}

export interface UserInput {
    gender: "Male" | "Female";
    ageGroup: string;
    occasion: string;
    styleVibe: string;
    fitPreference: string;
    undertone: string;
    skinTone: string;
    season: "Summer" | "Winter" | "Monsoon";
    bodyShape: string;
    height: "Short" | "Medium" | "Tall";
}

export interface OutfitOption {
    label: string;
    vibe: string;
    top: { item: string; color: string; };
    queryForBottom: any;
}

export class ConsultantEngine {
    private db: DatabaseType;
    private dicts: ConsultantDicts;
    private stmt: any;

    constructor() {
        console.log("⚙️  Loading 10-Factor Consultant Brain (SQLite)...");
        try {
            this.db = new Database(DB_FILE, { readonly: true });
            this.db.pragma("cache_size = -8000"); // 8MB cache

            // Load dicts into memory (tiny — a few KB)
            this.dicts = { items: [], colors: [] };
            const rows = this.db.prepare("SELECT type, idx, value FROM dicts ORDER BY type, idx").all() as any[];
            for (const row of rows) {
                if (row.type === "items") this.dicts.items[row.idx] = row.value;
                else if (row.type === "colors") this.dicts.colors[row.idx] = row.value;
            }

            // Prepare lookup statement (reused for every query)
            this.stmt = this.db.prepare("SELECT v0, v1 FROM data WHERE h = ?");

            console.log("✅ Consultant Engine Online.");
        } catch (e) {
            console.error("❌ Error: DB not found at", DB_FILE, "Run 'npm run convert:db' first.");
            throw e;
        }
    }

    private generateKey(input: UserInput, vibeOverride?: string): string {
        const vibe = vibeOverride || input.styleVibe;
        // Key Order MUST match Builder Loop Order:
        // Gender|Occasion|Vibe|Age|Fit|Undertone|Skin|Season|Body|Height
        return `${input.gender}|${input.occasion}|${vibe}|${input.ageGroup}|${input.fitPreference}|${input.undertone}|${input.skinTone}|${input.season}|${input.bodyShape}|${input.height}`;
    }

    private lookupOutfit(input: UserInput, vibe: string, label: string): OutfitOption | null {
        const key = this.generateKey(input, vibe);
        const row = this.stmt.get(hashKey(key)) as { v0: number; v1: number } | undefined;

        if (!row) return null;

        const topItem = this.dicts.items[row.v0];
        const topColor = this.dicts.colors[row.v1];

        return {
            label: label,
            vibe: vibe,
            top: { item: topItem, color: topColor },
            queryForBottom: {
                gender: input.gender,
                category: "Top",
                type: topItem,
                color: topColor,
                season: input.season,
                skinTone: input.skinTone,
                bodyShape: input.bodyShape,
                height: input.height
            }
        };
    }

    public getDualSuggestions(input: UserInput): OutfitOption[] {
        const suggestions: OutfitOption[] = [];

        const primary = this.lookupOutfit(input, input.styleVibe, "Your Choice");
        if (primary) suggestions.push(primary);

        let altVibe = "Classic";
        if (input.styleVibe === "Classic") altVibe = "Trendy";
        else if (input.styleVibe === "Trendy") altVibe = "Classic";
        else if (input.styleVibe === "Desi") altVibe = "Fusion";
        else if (input.styleVibe === "Fusion") altVibe = "Desi";

        const secondary = this.lookupOutfit(input, altVibe, "Alternative Vibe");
        if (secondary) {
            const isDuplicate = primary && (primary.top.item === secondary.top.item && primary.top.color === secondary.top.color);
            if (!isDuplicate) suggestions.push(secondary);
        }

        return suggestions;
    }
}

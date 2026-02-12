import * as fs from "fs";
import * as path from "path";

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'consultant_master_db.json');

interface ConsultantDB {
    dicts: { items: string[], colors: string[] };
    data: { [key: string]: [number, number] };
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
    height: "Short" | "Medium" | "Tall"; // <--- Added Height to Interface
}

export interface OutfitOption {
    label: string;
    vibe: string;
    top: { item: string; color: string; };
    queryForBottom: any;
}

export class ConsultantEngine {
    private db: ConsultantDB;

    constructor() {
        console.log("⚙️  Loading 10-Factor Consultant Brain...");
        try {
            const raw = fs.readFileSync(DB_FILE, "utf-8");
            this.db = JSON.parse(raw);
            console.log("✅ Consultant Engine Online.");
        } catch (e) {
            console.error("❌ Error: DB not found at", DB_FILE, "Run builder first.");
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
        const ids = this.db.data[key];

        if (!ids) {
            // Optional: You can implement a fallback (e.g., default height) if specific key is missing
            return null;
        }

        const topItem = this.db.dicts.items[ids[0]];
        const topColor = this.db.dicts.colors[ids[1]];

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

import * as path from 'path';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { hashKey } from './db_utils';

// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'fashion_master.db');

interface FashionDicts {
    items: string[];
    colors: string[];
    patterns: string[];
}

export interface UserRequest {
    gender: "Male" | "Female";
    category: "Top" | "Bottom";
    type: string;
    color: string;
    pattern: string;
    season: "Summer" | "Winter" | "Monsoon";
    skinTone: "Fair" | "Wheatish" | "Dusky" | "Dark Brown";
    bodyShape: "Trapezoid" | "Rectangle" | "Triangle" | "Inverted_Triangle" | "Oval" | "Hourglass" | "Pear" | "Apple";
    height: "Short" | "Medium" | "Tall";
}

export class FashionEngine {
    private db: DatabaseType;
    private dicts: FashionDicts;
    private stmt: any;

    constructor() {
        try {
            console.log("⚙️  Loading Fashion Database (SQLite)...");
            console.log(`   📁 Path: ${DB_FILE}`);

            this.db = new Database(DB_FILE, { readonly: true });
            this.db.pragma("cache_size = -8000"); // 8MB cache

            // Load dicts into memory (tiny)
            this.dicts = { items: [], colors: [], patterns: [] };
            const rows = this.db.prepare("SELECT type, idx, value FROM dicts ORDER BY type, idx").all() as any[];
            for (const row of rows) {
                if (row.type === "items") this.dicts.items[row.idx] = row.value;
                else if (row.type === "colors") this.dicts.colors[row.idx] = row.value;
                else if (row.type === "patterns") this.dicts.patterns[row.idx] = row.value;
            }

            // Prepare lookup statement
            this.stmt = this.db.prepare("SELECT v0, v1, v2, v3, v4, v5 FROM data WHERE h = ?");

            const memAfter = process.memoryUsage();
            console.log(`   🧠 Memory: heap=${(memAfter.heapUsed / 1024 / 1024).toFixed(0)}MB`);
            console.log("✅ Fashion Engine Online.");
        } catch (e: any) {
            console.error("❌ Fatal Error loading Fashion Database:");
            console.error(`   Message: ${e.message}`);
            throw e;
        }
    }

    public getAdvice(input: UserRequest) {
        // 1. Construct the Key (Order must match builder_pair.ts)
        const key = `${input.gender}|${input.category}|${input.type}|${input.color}|${input.pattern}|${input.season}|${input.bodyShape}|${input.skinTone}|${input.height}`;

        // 2. O(1) Lookup (hash key for SQLite)
        const row = this.stmt.get(hashKey(key)) as { v0: number; v1: number; v2: number; v3: number; v4: number; v5: number } | undefined;

        // 3. Decode & Response
        if (row) {
            const classicItem = this.dicts.items[row.v0];
            const trendyItem = this.dicts.items[row.v1];
            const classicColor = this.dicts.colors[row.v2];
            const trendyColor = this.dicts.colors[row.v3];
            const classicPattern = this.dicts.patterns[row.v4];
            const trendyPattern = this.dicts.patterns[row.v5];

            return {
                status: "success",
                match_found: true,
                user_context: {
                    gender: input.gender,
                    skin: input.skinTone,
                    body: input.bodyShape
                },
                recommendations: [
                    {
                        vibe: "Classic / Safe",
                        item: classicItem,
                        color: classicColor,
                        pattern: classicPattern,
                        note: `Timeless ${input.gender === 'Female' ? 'chic' : 'classic'}. Safe bet.`
                    },
                    {
                        vibe: "Trendy / Modern",
                        item: trendyItem,
                        color: trendyColor,
                        pattern: trendyPattern,
                        note: "Modern pairing. Popular in current fashion trends."
                    }
                ]
            };
        } else {
            return {
                status: "partial_success",
                message: "Exact match not found. Providing generic advice.",
                recommendations: [
                    {
                        vibe: "Universal Safe",
                        item: input.category === "Top" ? "Blue Jeans / Black Trousers" : "White Shirt",
                        color: "Neutral (Black/Navy/White)",
                        pattern: "Solid",
                        note: "We couldn't match your exact inputs, but neutrals always work."
                    }
                ]
            };
        }
    }
}

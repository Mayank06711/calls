import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// Resolve path relative to compiled dist directory: dist/AISugession/ → server/
const DB_FILE = path.resolve(__dirname, '../..', 'fashion_master_db.json');

// --- INTERFACES ---

interface FashionDB {
    dicts: { items: string[], colors: string[], patterns: string[] };
    data: { [key: string]: [number, number, number, number, number, number] };
    // Value layout: [classicItemId, trendyItemId, classicColorId, trendyColorId, classicPatternId, trendyPatternId]
}

export interface UserRequest {
    gender: "Male" | "Female";
    category: "Top" | "Bottom";     // What does the user HAVE?
    type: string;                   // e.g., "Short Kurta"
    color: string;                  // e.g., "Mustard"
    pattern: string;                // e.g., "Solid"
    season: "Summer" | "Winter" | "Monsoon";
    skinTone: "Fair" | "Wheatish" | "Dusky" | "Dark Brown";
    bodyShape: "Trapezoid" | "Rectangle" | "Triangle" | "Inverted_Triangle" | "Oval" | "Hourglass" | "Pear" | "Apple";
    height: "Short" | "Medium" | "Tall";
}

// --- THE ENGINE CLASS ---
export class FashionEngine {
    private db: FashionDB;

    constructor() {
        try {
            console.log("⚙️  Loading Fashion Database...");
            console.log(`   📁 Path: ${DB_FILE}`);

            // Check if file exists
            if (!fs.existsSync(DB_FILE)) {
                console.error(`   ❌ File does NOT exist at: ${DB_FILE}`);
                console.error(`   📂 __dirname = ${__dirname}`);
                throw new Error(`Database file not found: ${DB_FILE}`);
            }

            // Get file size
            const stats = fs.statSync(DB_FILE);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`   📊 File size: ${sizeMB} MB`);

            // Log memory before + heap limit
            const memBefore = process.memoryUsage();
            const v8 = require('v8');
            const heapStats = v8.getHeapStatistics();
            const heapLimitMB = (heapStats.heap_size_limit / 1024 / 1024).toFixed(0);
            console.log(`   🧠 Memory before: heap=${(memBefore.heapUsed / 1024 / 1024).toFixed(0)}MB, limit=${heapLimitMB}MB`);

            // Read file
            console.log(`   📖 Reading file...`);
            const raw = fs.readFileSync(DB_FILE, 'utf-8');
            console.log(`   ✅ File read complete (${raw.length} chars)`);

            // Parse JSON
            console.log(`   🔄 Parsing JSON...`);
            this.db = JSON.parse(raw);
            console.log(`   ✅ JSON parsed successfully`);

            // Log memory after
            const memAfter = process.memoryUsage();
            console.log(`   🧠 Memory after: heap=${(memAfter.heapUsed / 1024 / 1024).toFixed(0)}MB`);

            console.log("✅ Fashion Engine Online.");
        } catch (e: any) {
            console.error("❌ Fatal Error loading Fashion Database:");
            console.error(`   Error type: ${e.name}`);
            console.error(`   Message: ${e.message}`);
            if (e.code) console.error(`   Code: ${e.code}`);
            throw e;
        }
    }

    public getAdvice(input: UserRequest) {
        // 1. Construct the Key (Order must match builder_pair.ts)
        // Format: Gender|Category|Type|Color|Pattern|Season|Body|Skin|Height
        const key = `${input.gender}|${input.category}|${input.type}|${input.color}|${input.pattern}|${input.season}|${input.bodyShape}|${input.skinTone}|${input.height}`;

        // 2. O(1) Lookup
        const ids = this.db.data[key];

        // 3. Decode & Response
        if (ids) {
            const classicItem = this.db.dicts.items[ids[0]];
            const trendyItem = this.db.dicts.items[ids[1]];
            const classicColor = this.db.dicts.colors[ids[2]];
            const trendyColor = this.db.dicts.colors[ids[3]];
            const classicPattern = this.db.dicts.patterns[ids[4]];
            const trendyPattern = this.db.dicts.patterns[ids[5]];

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
            // Fallback for edge cases (Safety net)
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

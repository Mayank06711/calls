import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const DB_FILE = 'fashion_master_db.json';

// --- INTERFACE ---
interface UserRequest {
    gender: "Male" | "Female";
    category: "Top" | "Bottom";     // What does the user HAVE?
    type: string;                   // e.g., "Short Kurta"
    color: string;                  // e.g., "Mustard"
    pattern: string;                // e.g., "Solid"
    season: "Summer" | "Winter" | "Monsoon";
    skinTone: "Fair" | "Wheatish" | "Dusky" | "Dark Brown";
    bodyShape: "Trapezoid" | "Rectangle" | "Triangle" | "Inverted_Triangle" | "Oval" | "Hourglass";
    height: "Short" | "Medium" | "Tall";
}

// --- THE ENGINE CLASS ---
class FashionEngine {
    private db: any;

    constructor() {
        try {
            console.log("⚙️  Loading Fashion Database...");
            const raw = fs.readFileSync(path.join(__dirname, DB_FILE), 'utf-8');
            this.db = JSON.parse(raw);
            console.log("✅ Engine Online.");
        } catch (e) {
            console.error("❌ Fatal Error: Database file not found. Run builder.ts first.");
        }
    }

    public getAdvice(input: UserRequest) {
        // 1. Construct the Key (Order must match builder.ts)
        const key = `${input.gender}|${input.category}|${input.type}|${input.color}|${input.pattern}|${input.season}|${input.bodyShape}|${input.skinTone}|${input.height}`;

        // 2. O(1) Lookup
        const result = this.db[key];

        // 3. Response
        if (result) {
            return {
                status: "success",
                match_found: true,
                user_context: {
                    gender: input.gender,
                    skin: input.skinTone,
                    body: input.bodyShape
                },
                recommendations: result.suggestions
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
                        note: "We couldn't match your exact inputs, but neutrals always work."
                    }
                ]
            };
        }
    }
}

// --- TEST ZONE (Verify Logic) ---

const engine = new FashionEngine();

// Test 1: North Indian Male (Pathani)
console.log("\n🔎 Test 1: Male, Pathani Kurta (White), Dark Skin");
const query1: UserRequest = {
    gender: "Male",
    category: "Top",
    type: "Pathani Kurta",
    color: "White",
    pattern: "Solid",
    season: "Summer",
    skinTone: "Dark Brown",
    bodyShape: "Trapezoid",
    height: "Medium"
};
console.log(JSON.stringify(engine.getAdvice(query1), null, 2));

// Test 2: North Indian Female (Sharara)
console.log("\n🔎 Test 2: Female, Sharara Top (Green), Short Height");
const query2: UserRequest = {
    gender: "Female",
    category: "Top",
    type: "Sharara Top (Short)",
    color: "Emerald",
    pattern: "Embroidered",
    season: "Summer",
    skinTone: "Fair",
    bodyShape: "Triangle",
    height: "Short"
};
console.log(JSON.stringify(engine.getAdvice(query2), null, 2));
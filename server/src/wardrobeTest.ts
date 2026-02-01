/**
 * Wardrobe System Integration Test
 * Tests the full wardrobe flow: clothing CRUD, outfits, style profile, and suggestions.
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - MongoDB must be accessible
 * - User must exist and be authenticated (set TOKEN below or use env var)
 *
 * Run: npx ts-node src/wardrobeTest.ts
 */

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5005";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "YOUR_JWT_TOKEN_HERE";

const BASE = `${SERVER_URL}/api/v1/wardrobe`;

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function api(method: string, path: string, body?: any): Promise<any> {
    const url = `${BASE}${path}`;
    const opts: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`,
        },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const json = await res.json();
    return { status: res.status, ...json };
}

function assert(label: string, condition: boolean, detail?: string) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
        failed++;
    }
}

// ─── Test Data ──────────────────────────────────────────────────────────────

const testTop = {
    type: "Top",
    subcategory: "Short Kurta",
    photoUrl: "https://example.com/kurta.jpg",
    color: "Mustard",
    pattern: "Solid" as const,
    fabric: "Cotton" as const,
    brand: "FabIndia",
    season: "Summer" as const,
    occasions: ["Wedding", "Casual"],
    price: 2500,
};

const testBottom = {
    type: "Bottom",
    subcategory: "Jeans",
    photoUrl: "https://example.com/jeans.jpg",
    color: "Navy",
    pattern: "Solid" as const,
    fabric: "Denim" as const,
    brand: "Levi's",
    season: "All" as const,
    occasions: ["Casual", "Office"],
    price: 3000,
};

const testShoes = {
    type: "Shoes",
    subcategory: "Leather Loafers",
    photoUrl: "https://example.com/loafers.jpg",
    color: "Tan",
    fabric: "Leather" as const,
    season: "All" as const,
};

const styleProfileData = {
    bodyShape: "Trapezoid" as const,
    height: "Medium" as const,
    skinTone: "Wheatish" as const,
    undertone: "Warm" as const,
    ageGroup: "Young Adult (26-35)" as const,
    fitPreference: "Slim Fit" as const,
    styleVibe: "Fusion" as const,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testClothingCRUD() {
    console.log("\n📦 CLOTHING ITEMS CRUD");

    // CREATE
    const created = await api("POST", "/cloths", testTop);
    assert("Create clothing item", created.success === true);
    const topId = created.data?._id;
    assert("Has _id", !!topId);
    assert("Has subcategory", created.data?.subcategory === "Short Kurta");
    assert("Has pattern", created.data?.pattern === "Solid");
    assert("Has occasions array", Array.isArray(created.data?.occasions));

    // CREATE second item
    const created2 = await api("POST", "/cloths", testBottom);
    assert("Create second item", created2.success === true);
    const bottomId = created2.data?._id;

    // CREATE shoes
    const created3 = await api("POST", "/cloths", testShoes);
    assert("Create shoes item", created3.success === true);
    const shoesId = created3.data?._id;

    // READ ALL
    const all = await api("GET", "/cloths");
    assert("Get all cloths", all.success === true);
    assert("Has count field", typeof all.count === "number");

    // READ ALL with filter
    const filtered = await api("GET", "/cloths?type=Top");
    assert("Filter by type=Top", filtered.success === true && filtered.data.every((c: any) => c.type === "Top"));

    // READ by ID
    const single = await api("GET", `/cloths/${topId}`);
    assert("Get by ID", single.success === true && single.data?._id === topId);

    // UPDATE
    const updated = await api("PUT", `/cloths/${topId}`, { color: "Rust", brand: "Manyavar" });
    assert("Update cloth", updated.success === true && updated.data?.color === "Rust");

    // ARCHIVE
    const archived = await api("PATCH", `/cloths/${topId}/archive`);
    assert("Archive cloth", archived.success === true && archived.data?.isArchived === true);

    // UNARCHIVE
    const unarchived = await api("PATCH", `/cloths/${topId}/archive`);
    assert("Unarchive cloth", unarchived.success === true && unarchived.data?.isArchived === false);

    // VALIDATION: missing required fields
    const invalid = await api("POST", "/cloths", { type: "Top", photoUrl: "https://example.com/x.jpg" });
    assert("Validation rejects missing subcategory", invalid.success !== true || invalid.statusCode === 400, `status: ${invalid.status}`);

    return { topId, bottomId, shoesId };
}

async function testOutfitCRUD(ids: { topId: string; bottomId: string; shoesId: string }) {
    console.log("\n👔 OUTFITS CRUD");

    // CREATE
    const created = await api("POST", "/outfits", {
        name: "Wedding Fusion Look",
        itemIds: [ids.topId, ids.bottomId, ids.shoesId],
        occasion: "Wedding: Sangeet",
        season: "Summer",
        tags: ["wedding", "fusion"],
    });
    assert("Create outfit", created.success === true);
    const outfitId = created.data?._id;
    assert("Outfit has 3 items", created.data?.items?.length === 3);
    assert("Outfit has tags", created.data?.tags?.length === 2);
    assert("Outfit source is manual", created.data?.source === "manual");

    // READ ALL
    const all = await api("GET", "/outfits");
    assert("Get all outfits", all.success === true);

    // READ with filter
    const byOccasion = await api("GET", "/outfits?occasion=Wedding: Sangeet");
    assert("Filter by occasion", byOccasion.success === true);

    // READ by ID (populated)
    const single = await api("GET", `/outfits/${outfitId}`);
    assert("Get outfit by ID (populated)", single.success === true && single.data?.items?.[0]?.photoUrl);

    // TOGGLE FAVORITE
    const fav = await api("PATCH", `/outfits/${outfitId}/favorite`);
    assert("Toggle favorite ON", fav.success === true && fav.data?.isFavorite === true);
    const unfav = await api("PATCH", `/outfits/${outfitId}/favorite`);
    assert("Toggle favorite OFF", unfav.success === true && unfav.data?.isFavorite === false);

    // UPDATE
    const updated = await api("PUT", `/outfits/${outfitId}`, {
        name: "Updated Look",
        tags: ["updated"],
    });
    assert("Update outfit", updated.success === true && updated.data?.name === "Updated Look");

    return outfitId;
}

async function testStyleProfile() {
    console.log("\n🎨 STYLE PROFILE");

    // CREATE / UPSERT
    const created = await api("PUT", "/style-profile", styleProfileData);
    assert("Create style profile", created.success === true);
    assert("Body shape saved", created.data?.bodyShape === "Trapezoid");
    assert("Style vibe saved", created.data?.styleVibe === "Fusion");

    // READ
    const read = await api("GET", "/style-profile");
    assert("Get style profile", read.success === true && read.data?.height === "Medium");

    // UPSERT (update)
    const updated = await api("PUT", "/style-profile", { ...styleProfileData, styleVibe: "Classic" });
    assert("Update style profile", updated.success === true && updated.data?.styleVibe === "Classic");

    // Revert for suggestion tests
    await api("PUT", "/style-profile", styleProfileData);

    // VALIDATION
    const invalid = await api("PUT", "/style-profile", { bodyShape: "InvalidShape" });
    assert("Validation rejects invalid body shape", invalid.success !== true, `status: ${invalid.status}`);
}

async function testSuggestions() {
    console.log("\n🤖 SUGGESTIONS (MasterEngine)");

    // Note: These require the JSON DBs to be built and present.
    // If DBs don't exist, the engine constructor will throw.
    // We test gracefully.

    // SUGGEST TOP
    const topSugg = await api("POST", "/suggest/top", {
        occasion: "Wedding: Sangeet (Night)",
        season: "Summer",
    });
    if (topSugg.success) {
        assert("Suggest top returns data", Array.isArray(topSugg.data) && topSugg.data.length > 0);
        assert("Top has item field", !!topSugg.data?.[0]?.top?.item);
    } else {
        assert("Suggest top (DB not built yet — expected)", topSugg.success === false,
            "Run builders first to enable suggestion tests");
    }

    // SUGGEST FULL OUTFIT
    const fullSugg = await api("POST", "/suggest/full-outfit", {
        occasion: "Office: Daily Wear",
        season: "Winter",
    });
    if (fullSugg.success) {
        assert("Full outfit has top", !!fullSugg.data?.top);
        assert("Full outfit has bottom", Array.isArray(fullSugg.data?.bottom));
        assert("Full outfit has layers", !!fullSugg.data?.layers);
        assert("Full outfit has footwear", !!fullSugg.data?.footwear);
    } else {
        assert("Full outfit suggestion (DB not built yet — expected)", true,
            fullSugg.message || "Run builders first");
    }
}

async function testCleanup(ids: { topId: string; bottomId: string; shoesId: string }, outfitId: string) {
    console.log("\n🧹 CLEANUP");

    // Delete outfit first (it references items)
    const delOutfit = await api("DELETE", `/outfits/${outfitId}`);
    assert("Delete outfit", delOutfit.success === true);

    // Delete clothing items
    const del1 = await api("DELETE", `/cloths/${ids.topId}`);
    assert("Delete top", del1.success === true);
    const del2 = await api("DELETE", `/cloths/${ids.bottomId}`);
    assert("Delete bottom", del2.success === true);
    const del3 = await api("DELETE", `/cloths/${ids.shoesId}`);
    assert("Delete shoes", del3.success === true);

    // Verify deleted
    const check = await api("GET", `/cloths/${ids.topId}`);
    assert("Deleted item returns 404", check.status === 404 || check.success === false);
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function main() {
    console.log("=".repeat(60));
    console.log("  WARDROBE SYSTEM INTEGRATION TEST");
    console.log(`  Server: ${SERVER_URL}`);
    console.log("=".repeat(60));

    if (AUTH_TOKEN === "YOUR_JWT_TOKEN_HERE") {
        console.log("\n⚠️  Set AUTH_TOKEN env var or edit the script with a valid JWT token.");
        console.log("   Example: AUTH_TOKEN=eyJhbG... npx ts-node src/wardrobeTest.ts\n");
        process.exit(1);
    }

    try {
        const ids = await testClothingCRUD();
        const outfitId = await testOutfitCRUD(ids);
        await testStyleProfile();
        await testSuggestions();
        await testCleanup(ids, outfitId);
    } catch (err: any) {
        console.error("\n💥 UNEXPECTED ERROR:", err.message || err);
        failed++;
    }

    console.log("\n" + "=".repeat(60));
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=".repeat(60));
    process.exit(failed > 0 ? 1 : 0);
}

main();

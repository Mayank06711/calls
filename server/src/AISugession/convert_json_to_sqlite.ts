/**
 * One-time conversion: JSON master DBs → SQLite (with hashed keys)
 *
 * Converts the precomputed lookup tables from JSON files (~400MB total, ~3GB in RAM)
 * to SQLite databases (~60-80MB total, <50MB in RAM).
 *
 * Keys are hashed (MD5 → 16 hex chars) to reduce storage from ~60 bytes to 16 bytes per key.
 * Collision detection is built in — the script will abort if any collisions are found.
 *
 * Usage: npm run convert:db
 *
 * After conversion, the JSON files are no longer needed at runtime.
 * The engine files use the same hash function for lookups.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Database from "better-sqlite3";

/** Hash a lookup key to 16 hex chars (64-bit). Used by both conversion and engines. */
export function hashKey(key: string): string {
    return crypto.createHash("md5").update(key).digest("hex").slice(0, 16);
}

interface DBFile {
    jsonFile: string;
    sqliteFile: string;
    dictKeys: string[];
    valueCols: number;
}

const DB_FILES: DBFile[] = [
    {
        jsonFile: "consultant_master_db.json",
        sqliteFile: "consultant_master.db",
        dictKeys: ["items", "colors"],
        valueCols: 2,
    },
    {
        jsonFile: "fashion_master_db.json",
        sqliteFile: "fashion_master.db",
        dictKeys: ["items", "colors", "patterns"],
        valueCols: 6,
    },
    {
        jsonFile: "layering_master_db.json",
        sqliteFile: "layering_master.db",
        dictKeys: ["items"],
        valueCols: 3,
    },
    {
        jsonFile: "footwear_master_db.json",
        sqliteFile: "footwear_master.db",
        dictKeys: ["items"],
        valueCols: 3,
    },
];

function convert(config: DBFile) {
    const jsonPath = path.resolve(__dirname, "../..", config.jsonFile);
    const sqlitePath = path.resolve(__dirname, "../..", config.sqliteFile);

    console.log(`\n Converting ${config.jsonFile} → ${config.sqliteFile}`);

    if (!fs.existsSync(jsonPath)) {
        console.error(`  JSON file not found: ${jsonPath}`);
        return;
    }

    const sizeMB = (fs.statSync(jsonPath).size / 1024 / 1024).toFixed(1);
    console.log(`  Reading JSON (${sizeMB} MB)...`);
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const json = JSON.parse(raw);

    const entries = Object.keys(json.data).length;
    console.log(`  Entries: ${entries.toLocaleString()}`);

    // Check for hash collisions before writing
    console.log(`  Checking for hash collisions...`);
    const hashSet = new Set<string>();
    let collisions = 0;
    for (const key of Object.keys(json.data)) {
        const h = hashKey(key);
        if (hashSet.has(h)) {
            collisions++;
            if (collisions <= 5) console.error(`  COLLISION: ${key} → ${h}`);
        }
        hashSet.add(h);
    }
    if (collisions > 0) {
        console.error(`  FATAL: ${collisions} hash collisions detected. Aborting.`);
        process.exit(1);
    }
    console.log(`  No collisions in ${entries.toLocaleString()} entries.`);
    hashSet.clear(); // Free memory

    // Remove old SQLite file if exists
    if (fs.existsSync(sqlitePath)) fs.unlinkSync(sqlitePath);

    // Create SQLite DB
    const db = new Database(sqlitePath);
    db.pragma("journal_mode = OFF");
    db.pragma("synchronous = OFF");
    db.pragma("page_size = 4096");
    db.pragma("cache_size = -64000");

    // Create dicts table
    db.exec(`CREATE TABLE dicts (type TEXT, idx INTEGER, value TEXT)`);
    const insertDict = db.prepare("INSERT INTO dicts VALUES (?, ?, ?)");

    for (const dictKey of config.dictKeys) {
        const arr: string[] = json.dicts[dictKey];
        console.log(`  Dict '${dictKey}': ${arr.length} entries`);
        for (let i = 0; i < arr.length; i++) {
            insertDict.run(dictKey, i, arr[i]);
        }
    }

    // Create data table with hashed key (16 hex chars instead of ~60 char string)
    const valCols = Array.from({ length: config.valueCols }, (_, i) => `v${i} INTEGER`).join(", ");
    db.exec(`CREATE TABLE data (h TEXT PRIMARY KEY, ${valCols}) WITHOUT ROWID`);

    const placeholders = Array.from({ length: config.valueCols }, () => "?").join(", ");
    const insertData = db.prepare(`INSERT INTO data VALUES (?, ${placeholders})`);

    // Batch insert
    console.log(`  Writing ${entries.toLocaleString()} rows (hashed keys)...`);
    const BATCH = 50000;
    const keys = Object.keys(json.data);
    let written = 0;

    for (let i = 0; i < keys.length; i += BATCH) {
        const batch = keys.slice(i, i + BATCH);
        const tx = db.transaction(() => {
            for (const key of batch) {
                const h = hashKey(key);
                const vals = json.data[key];
                insertData.run(h, ...vals);
            }
        });
        tx();
        written += batch.length;
        if (written % 500000 === 0 || written === keys.length) {
            console.log(`  ${written.toLocaleString()} / ${entries.toLocaleString()}`);
        }
    }

    // Optimize
    db.pragma("journal_mode = WAL");
    db.exec("ANALYZE");

    db.close();

    const dbSizeMB = (fs.statSync(sqlitePath).size / 1024 / 1024).toFixed(1);
    console.log(`  Done: ${sizeMB} MB JSON → ${dbSizeMB} MB SQLite`);
}

// Run all conversions
console.log("=== Converting JSON Master DBs to SQLite (hashed keys) ===");
const startTime = Date.now();

for (const config of DB_FILES) {
    convert(config);
}

console.log(`\n=== All done in ${((Date.now() - startTime) / 1000).toFixed(1)}s ===`);
console.log("You can now remove the JSON files if the SQLite files look correct.");
console.log("Run the server to verify everything works.");

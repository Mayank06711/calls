import * as crypto from "crypto";

/**
 * Hash a lookup key to 16 hex chars (64-bit MD5 prefix).
 * Used by both the conversion script and all engine lookups.
 * Must stay in sync with convert_json_to_sqlite.ts.
 */
export function hashKey(key: string): string {
    return crypto.createHash("md5").update(key).digest("hex").slice(0, 16);
}

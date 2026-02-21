import { v4 as uuidv4 } from "uuid";

/**
 * Session Limits Configuration
 * Defines maximum concurrent sessions per subscription type.
 */
export const SESSION_LIMITS: Record<string, number> = {
  free: 2,
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
  admin: 99, // Effectively unlimited
};

/**
 * Redis Key Patterns for Session Management
 */
export const SESSION_REDIS_KEYS = {
  // Set of active session IDs for a user: session:active:{userId}
  ACTIVE_SET: (userId: string) => `session:active:${userId}`,
  // Hash for session activity: session:activity:{userId}:{sessionId}
  ACTIVITY: (userId: string, sessionId: string) =>
    `session:activity:${userId}:${sessionId}`,
  // Hash for session metadata: session:meta:{userId}:{sessionId}
  META: (userId: string, sessionId: string) =>
    `session:meta:${userId}:${sessionId}`,
} as const;

/**
 * TTL Constants (in seconds)
 */
export const SESSION_TTL = {
  ACTIVITY: 86400, // 24 hours
  META: 1296000, // 15 days (same as refresh token)
  ACTIVE_SET: 1296000, // 15 days (must match refresh token lifetime)
} as const;

/**
 * Get the maximum number of concurrent sessions allowed for a subscription type.
 * @param subscriptionType - The user's subscription type (e.g., "free", "gold").
 * @returns The maximum number of sessions allowed.
 */
export function getMaxSessionsForSubscription(
  subscriptionType: string | undefined | null
): number {
  if (!subscriptionType) {
    return SESSION_LIMITS.free;
  }
  const type = subscriptionType.toLowerCase();
  return SESSION_LIMITS[type] ?? SESSION_LIMITS.free;
}

/**
 * Generate a unique session ID.
 * @returns A unique session ID string prefixed with "sess_".
 */
export function generateSessionId(): string {
  return `sess_${uuidv4()}`;
}

// Keep the old function name as an alias for backward compatibility
export const getSessionLimit = getMaxSessionsForSubscription;

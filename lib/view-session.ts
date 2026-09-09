import { randomBytes } from "crypto";

export const VIEW_SESSION_COOKIE = "dq_vsid";

/** Anonymous, non-identifying — exists only to dedupe view counts per visitor. */
export function generateViewSessionId(): string {
  return randomBytes(16).toString("base64url");
}

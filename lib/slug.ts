import { randomBytes } from "crypto";

/** Short, unguessable, URL-safe token used as an image's direct-link id. */
export function generateSlug(): string {
  return randomBytes(9).toString("base64url");
}

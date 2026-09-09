import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

/**
 * Credentials `authorize()` logic for Auth.js's Credentials provider
 * (auth.ts). Validates username + password against `User.passwordHash`.
 * There is no self-registration route in this app — accounts only ever
 * come from an admin using /admin/users, so this is the only way in.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<"username" | "password", unknown>> | undefined,
) {
  const username = typeof credentials?.username === "string" ? credentials.username.trim() : "";
  const password = typeof credentials?.password === "string" ? credentials.password : "";
  if (!username || !password) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.username,
    role: user.role,
  };
}

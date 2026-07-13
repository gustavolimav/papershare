import { cookies } from "next/headers";
import session from "@/models/session";
import user from "@/models/user";
import type { User } from "@/types/index";

// Server Component helper: resolves the current session's user (if any)
// directly against the DB, so pages can gate/redirect before any HTML is
// sent — no client-side auth-check flicker.
export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_id")?.value;

  if (!sessionToken) {
    return null;
  }

  const existingSession = await session.findOneByToken(sessionToken);

  if (!existingSession || new Date(existingSession.expires_at) < new Date()) {
    return null;
  }

  try {
    return await user.findOneById(existingSession.user_id);
  } catch {
    return null;
  }
}

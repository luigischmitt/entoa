import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type SessionAllowance = { limited: boolean; limit: number; minutes: number; interviewsLeft: number; conversationsLeft: number };

export const TRIAL_CONTACT_EMAIL = "ltodarosouza@gmail.com";

let cached: SessionAllowance | null = null;

export function readCachedSessionAllowance(): SessionAllowance | null { return cached; }

/** Loads the account's free-trial allowance; null when it cannot be read (the app then behaves as unlimited and the database still enforces the limit). */
export async function loadSessionAllowance(): Promise<SessionAllowance | null> {
  try {
    const { data, error } = await getSupabaseBrowserClient().rpc("get_session_allowance");
    if (error || !data || typeof data !== "object") return cached;
    const row = data as Record<string, unknown>;
    const limit = Number(row.limit) || 2;
    cached = {
      limited: row.limited === true,
      limit,
      minutes: Number(row.minutes) || 5,
      interviewsLeft: Math.max(0, limit - (Number(row.interviewsUsed) || 0)),
      conversationsLeft: Math.max(0, limit - (Number(row.conversationsUsed) || 0)),
    };
    return cached;
  } catch {
    return cached;
  }
}

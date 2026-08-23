import { z } from "zod";

/**
 * Recipients typed as one comma-separated line.
 *
 * The address field took exactly one email, so reaching a class or a
 * department meant sending the same message over and over. Splitting is done
 * here rather than at the boundary so the API route and the form agree on what
 * counts as valid, and so a typo in the middle of a list is caught before
 * anything is sent — a partial send cannot be taken back.
 */

/** Resend's per-request ceiling. */
export const MAX_RECIPIENTS = 50;

const emailSchema = z.string().trim().email().max(254);

// Newlines and semicolons too: addresses pasted out of a spreadsheet or a mail
// client rarely arrive separated by commas alone.
const SEPARATORS = /[,;\r\n]+/;

export type RecipientListResult =
  | { ok: true; recipients: string[] }
  | { ok: false; reason: "empty" | "too_many" | "invalid"; invalid?: string[] };

export function parseRecipientList(value: string): RecipientListResult {
  const entries = value.split(SEPARATORS).map((entry) => entry.trim()).filter(Boolean);

  if (entries.length === 0) return { ok: false, reason: "empty" };
  if (entries.length > MAX_RECIPIENTS) return { ok: false, reason: "too_many" };

  const invalid = entries.filter((entry) => !emailSchema.safeParse(entry).success);
  if (invalid.length > 0) return { ok: false, reason: "invalid", invalid };

  // Duplicates would send the same person the same mail twice.
  return { ok: true, recipients: [...new Set(entries.map((entry) => entry.toLowerCase()))] };
}

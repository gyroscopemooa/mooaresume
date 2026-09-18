import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export class MobileHttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

export function readBearerToken(headers: Headers): string {
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(headers.get("authorization") ?? "");
  if (!match || match[1].length > 8192) throw new MobileHttpError(401, "AUTH_REQUIRED");
  return match[1];
}

export async function authenticateMobile(request: Request, factory?: (token: string) => SupabaseClient) {
  const token = readBearerToken(request.headers);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new MobileHttpError(403, "ORIGIN_REJECTED");
  const client = factory ? factory(token) : (() => {
    const env = getPublicEnv();
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  })();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new MobileHttpError(401, "AUTH_REQUIRED");
  return { client, user: data.user };
}

export async function readMobileJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 196608) throw new MobileHttpError(413, "INPUT_TOO_LARGE");
  // Streaming bound: do not allocate an arbitrarily large body before checking.
  const reader = request.body?.getReader();
  if (!reader) throw new MobileHttpError(400, "INVALID_JSON");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 196608) { await reader.cancel(); throw new MobileHttpError(413, "INPUT_TOO_LARGE"); }
    parts.push(next.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(body)); }
  catch { throw new MobileHttpError(400, "INVALID_JSON"); }
}

export function mobileJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
}

export function mobileFailure(error: unknown) {
  if (error instanceof MobileHttpError) return mobileJson({ code: error.code }, error.status);
  // Do not expose provider errors, tokens or applicant text.
  return mobileJson({ code: "SERVICE_UNAVAILABLE" }, 503);
}

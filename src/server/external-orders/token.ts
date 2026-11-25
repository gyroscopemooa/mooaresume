import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function externalOrderSigningSecret() { return process.env.EXTERNAL_ORDER_SIGNING_SECRET?.trim() ?? ""; }
function signature(id: string, version: string, secret: string) {
  return createHmac("sha256", secret).update(`mooa:external-result:v1:${id}:${version}`).digest("hex");
}
export function externalOrderToken(id: string, version: string, secret = externalOrderSigningSecret()) {
  if (!uuid.test(id) || !uuid.test(version) || secret.length < 32) throw new Error("EXTERNAL_LINK_CONFIGURATION");
  return `${id}.${version}.${signature(id,version,secret)}`;
}
export function verifyExternalOrderToken(token: string, secret = externalOrderSigningSecret()) {
  if (secret.length < 32 || token.length !== 138) return null;
  const [id,version,mac,...rest] = token.split(".");
  if (rest.length || !uuid.test(id ?? "") || !uuid.test(version ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "")) return null;
  const expected = signature(id,version,secret);
  return timingSafeEqual(Buffer.from(mac),Buffer.from(expected)) ? { id,version } : null;
}

import { createHmac,randomUUID,timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const cookieName="mooa_analytics_identity";
const schema=z.object({anonymousId:z.uuid(),userId:z.uuid().nullable(),expires:z.number().int()});
export type Identity=z.infer<typeof schema>;
function sign(payload:string,secret:string) {return createHmac("sha256",secret).update(`analytics-v1:${payload}`).digest("base64url");}
export function encodeIdentity(identity:Identity,secret:string) {
  const payload=Buffer.from(JSON.stringify(identity)).toString("base64url");
  return `${payload}.${sign(payload,secret)}`;
}
export function decodeIdentity(value:string|undefined,secret:string,now=Date.now()):Identity|null {
  if(!value || value.length>1024 || secret.length<32) return null;
  const [payload,signature,extra]=value.split(".");
  if(!payload || !signature || extra) return null;
  const a=Buffer.from(signature),b=Buffer.from(sign(payload,secret));
  if(a.length!==b.length || !timingSafeEqual(a,b)) return null;
  try {const identity=schema.parse(JSON.parse(Buffer.from(payload,"base64url").toString("utf8")));return identity.expires>now ? identity : null;} catch{return null;}
}
export function nextIdentity(previous:Identity|null,userId:string|null,now=Date.now()):Identity {
  return {anonymousId:previous && (previous.userId===null || previous.userId===userId) ? previous.anonymousId : randomUUID(),userId,expires:now+7*86400000};
}

import {beforeEach,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {cookieName,decodeIdentity,encodeIdentity,nextIdentity} from "./identity";
const mocks=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn()}));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({rpc:mocks.rpc})}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
import {collect,readResource} from "./http";
const secret="test-only-secret-".repeat(3),user=randomUUID();
const identity=nextIdentity(null,user);
const event=()=>({schemaVersion:1,eventId:randomUUID(),eventName:"page_viewed",occurredAt:new Date().toISOString(),anonymousId:identity.anonymousId,sessionId:randomUUID(),clientPlatform:"web",surface:"browser",environment:"staging",properties:{}});
function request(body:unknown,headers:Record<string,string>={}) {return new Request("https://example.test/api/analytics/events",{method:"POST",headers:{origin:"https://example.test","content-type":"application/json",cookie:`${cookieName}=${encodeIdentity(identity,secret)}`,...headers},body:JSON.stringify(body)});}
beforeEach(()=>{vi.stubEnv("ANALYTICS_ENABLED","true");vi.stubEnv("ANALYTICS_ENVIRONMENT","staging");vi.stubEnv("ANALYTICS_IDENTITY_SECRET",secret);vi.stubEnv("HQ_ANALYTICS_SECRET",secret);vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co");vi.stubEnv("SUPABASE_SECRET_KEY","test-only");mocks.rpc.mockReset();mocks.getUser.mockResolvedValue({data:{user:{id:user}},error:null});});
describe("HTTP boundary",()=>{
  it("persists server-resolved identity only",async()=>{mocks.rpc.mockResolvedValue({data:1,error:null});expect((await collect(request({events:[event()]}),"events")).status).toBe(200);expect(mocks.rpc.mock.calls[0][1].p_user_id).toBe(user);});
  it("rejects forged provider verification without touching DB",async()=>{expect((await collect(request({events:[{...event(),eventName:"order_paid_verified"}]}),"events")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("rejects cross-origin collection",async()=>{expect((await collect(request({},{origin:"https://evil.test"}),"events")).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("rejects identity copied from another browser",async()=>{expect((await collect(request({events:[{...event(),anonymousId:randomUUID()}]}),"events")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("refreshes identity after account switch",async()=>{mocks.getUser.mockResolvedValue({data:{user:{id:randomUUID()}},error:null});expect((await collect(request({events:[event()]}),"events")).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("foreground must be explicit",async()=>{expect((await collect(request({platform:"web",foreground:false}),"presence")).status).toBe(400);});
  it("returns retriable 503 after DB failure",async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:"sensitive internal details"}});const response=await collect(request({events:[event()]}),"events");expect(response.status).toBe(503);expect(await response.text()).not.toContain("sensitive");});
  it("HQ auth fails before any DB access",async()=>{expect((await readResource(new Request("https://example.test/api/hq/analytics/summary"),"summary")).status).toBe(401);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("HQ environment mismatch fails closed",async()=>{expect((await readResource(new Request("https://example.test/api/hq/analytics/summary?environment=production",{headers:{authorization:`Bearer ${secret}`}}),"summary")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("HQ rejects timeline without user id",async()=>{expect((await readResource(new Request("https://example.test/api/hq/analytics/timeline",{headers:{authorization:`Bearer ${secret}`}}),"timeline")).status).toBe(400);});
});
describe("signed anonymous identity",()=>{
  it("keeps anonymous identity on first login",()=>{const anonymous=nextIdentity(null,null);expect(nextIdentity(anonymous,user).anonymousId).toBe(anonymous.anonymousId);});
  it("rotates identity on logout and account switch",()=>{expect(nextIdentity(identity,null).anonymousId).not.toBe(identity.anonymousId);expect(nextIdentity(identity,randomUUID()).anonymousId).not.toBe(identity.anonymousId);});
  it("rejects tampered and expired cookies",()=>{const value=encodeIdentity(identity,secret);expect(decodeIdentity(value+"x",secret)).toBeNull();expect(decodeIdentity(value,secret,identity.expires+1)).toBeNull();});
});

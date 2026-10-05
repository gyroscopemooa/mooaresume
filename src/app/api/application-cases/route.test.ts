import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: {id:"owner"} as {id:string}|null, reuse:vi.fn(), persist:vi.fn(), rpc:vi.fn() }));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user},error:null})},rpc:mocks.rpc})}));
vi.mock("@/server/application-cases/reuse-analysis",()=>({findReusableAnalysis:mocks.reuse}));
vi.mock("@/server/application-cases/persist-guest-handoff",()=>({persistGuestApplicationHandoff:mocks.persist,ApplicationCasePersistenceError:class extends Error {code="TEST";}}));
import { POST } from "./route";
const body={product:"PRO",writingMode:"POLISH",writingStyle:"BALANCED",targetLength:700,questions:[{id:"q1",title:"",prompt:"지원 동기",answer:"실제 경험입니다.",targetLength:700}],jobPosting:{url:"https://example.com/jobs",text:"",filenames:[]}};
function request(data:unknown){return new NextRequest("https://mooaresume.com/api/application-cases",{method:"POST",headers:{origin:"https://mooaresume.com","content-type":"application/json"},body:JSON.stringify(data)});}
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:"owner"};mocks.reuse.mockResolvedValue(null);mocks.persist.mockResolvedValue({applicationCaseId:"case",analysisRunId:"run"});});
describe("posting readiness before payment",()=>{
  it("requires authentication before any data lookup",async()=>{mocks.user=null;expect((await POST(request(body))).status).toBe(401);expect(mocks.reuse).not.toHaveBeenCalled();});
  it("requires explicit acknowledgement for a URL-only posting",async()=>{const result=await POST(request(body));expect(result.status).toBe(409);expect((await result.json()).code).toBe("POSTING_BODY_NOT_READY");expect(mocks.persist).not.toHaveBeenCalled();expect(mocks.reuse).not.toHaveBeenCalled();});
  it("allows proceeding without body only when acknowledged",async()=>{expect((await POST(request({...body,allowMissingPosting:true}))).status).toBe(201);expect(mocks.persist).toHaveBeenCalled();});
  it("uses the actually supplied body in the immutable submission plan",async()=>{expect((await POST(request({...body,jobPosting:{...body.jobPosting,text:"자격요건 개발 경험, 담당업무 서비스 개발"}}))).status).toBe(201);expect(mocks.reuse.mock.calls[0][2].documents.find((d:{kind:string})=>d.kind==="JOB_POSTING").normalizedText).toContain("담당업무 서비스 개발");});
  it("opens a matching owned result without creating a payable case",async()=>{mocks.reuse.mockResolvedValue("owned-run");const result=await POST(request({...body,allowMissingPosting:true}));expect(await result.json()).toEqual({reusedAnalysisRunId:"owned-run"});expect(mocks.persist).not.toHaveBeenCalled();});
});

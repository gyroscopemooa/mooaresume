import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/dev/interview-pro/questions/route";
import { GET } from "@/app/api/dev/interview-pro/materials/route";
import { DEFAULT_TRAINING_CONTEXT } from "@/domain/interview-training";

const db = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from, auth: { getUser: db.getUser } }) }));
const caseId = "12345678-1234-4234-8234-123456789012";
const docId = "22345678-1234-4234-8234-123456789012";
const headers = { cookie: "mooa_mail_admin=test-admin", origin: "http://localhost:3000", "content-type": "application/json" };
const questions = () => ["담당한 개선 경험을 설명해 주세요.", "협업하면서 확인한 점은 무엇인가요?", "자료를 공유할 때 무엇을 고려했나요?"].map(text => ({ text, type: "experience", sourceQuote: "인수인계 표를 만들었습니다", intent: "본인 행동 확인" }));
const input = () => ({ requestId: crypto.randomUUID(), consent: true, company: "지원기업", role: "생산", count: 3, context: { ...DEFAULT_TRAINING_CONTEXT, supportText: "인수인계 표를 만들었습니다." } });
const request = (body: unknown = input(), extra = {}) => new Request("http://localhost:3000/api/dev/interview-pro/questions", { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });
const response = (value: unknown = questions()) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ questions: value }) }] }] });
function query(data: unknown, error: unknown = null) {
  const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), in: vi.fn(), maybeSingle: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve) };
  for (const method of [q.select,q.eq,q.order,q.limit,q.in]) method.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue({ data, error }); return q;
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("NODE_ENV","development"); vi.stubEnv("MAIL_ADMIN_SECRET","test-admin"); vi.stubEnv("OPENAI_API_KEY","test-not-real"); vi.stubEnv("OPENAI_MODEL_INTERVIEW_PRO","gpt-6-astra"); vi.stubEnv("INTERVIEW_PRO_AI_ENABLED","true");
  delete (globalThis as typeof globalThis & { __mooaInterviewDevLimiter?: unknown }).__mooaInterviewDevLimiter;
  vi.stubGlobal("fetch",vi.fn(async()=>response())); db.getUser.mockResolvedValue({ data:{ user:{id:"owner"}},error:null });
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("personalized question boundary",()=>{
  it("requires admin, origin and consent before provider work",async()=>{
    expect((await POST(request(input(),{cookie:""}))).status).toBe(401);
    expect((await POST(request(input(),{origin:"https://evil.example"}))).status).toBe(403);
    expect((await POST(request({...input(),consent:false}))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns grounded questions with strict output and deduplicated requests",async()=>{
    const body=input(); const first=await POST(request(body)); expect(first.status).toBe(200);
    expect((await first.json()).questions).toHaveLength(3);
    expect((await POST(request(body))).status).toBe(200); expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({store:false,text:{format:{strict:true}},model:"gpt-6-astra"});
  });
  it("rejects invented source quotes, duplicate questions and wrong question types",async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(response(questions().map(q=>({...q,sourceQuote:"매출 50% 향상"})))); expect((await POST(request())).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(response([questions()[0],questions()[0],questions()[0]])); expect((await POST(request())).status).toBe(502);
    const body=input(); vi.mocked(fetch).mockResolvedValueOnce(response()); expect((await POST(request({...body,context:{...body.context,questionType:"motivation"}}))).status).toBe(502);
  });
  it("requires null source quotes without support material and hides incomplete responses",async()=>{
    const body=input(); expect((await POST(request({...body,context:DEFAULT_TRAINING_CONTEXT}))).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({status:"incomplete",output:[]})); expect((await POST(request())).status).toBe(502);
  });
});
describe("private interview material import",()=>{
  const get=(suffix="",authenticated=true)=>GET(new Request(`http://localhost:3000/api/dev/interview-pro/materials${suffix}`,{headers:authenticated?headers:{}}));
  it("requires both local admin and the owner account",async()=>{
    expect((await get("",false)).status).toBe(401); expect(db.getUser).not.toHaveBeenCalled();
    db.getUser.mockResolvedValueOnce({data:{user:null},error:null}); expect((await get()).status).toBe(401); expect(db.from).not.toHaveBeenCalled();
  });
  it("filters support cases by signed-in owner and never calls AI",async()=>{
    const q=query([]); db.from.mockReturnValueOnce(q); expect((await get()).status).toBe(200); expect(q.eq).toHaveBeenCalledWith("owner_user_id","owner"); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects an unowned case before reading documents",async()=>{
    const q=query(null); db.from.mockReturnValueOnce(q); expect((await get(`?caseId=${caseId}&documentId=${docId}`)).status).toBe(404); expect(db.from).toHaveBeenCalledTimes(1); expect(q.eq).toHaveBeenCalledWith("owner_user_id","owner");
  });
  it("rejects documents outside the selected owned case",async()=>{
    db.from.mockReturnValueOnce(query({id:caseId})).mockReturnValueOnce(query([])); expect((await get(`?caseId=${caseId}&documentId=${docId}`)).status).toBe(404); expect(db.from).toHaveBeenCalledTimes(2);
  });
  it("loads only the owned latest version with bounded text and no cache",async()=>{
    const documents=query([{id:docId}]),version=query({id:docId,normalized_text:"가".repeat(6500),version_number:3}); db.from.mockReturnValueOnce(query({id:caseId})).mockReturnValueOnce(documents).mockReturnValueOnce(version);
    const res=await get(`?caseId=${caseId}&documentId=${docId}`); const value=await res.json(); expect(res.status).toBe(200); expect(value.text).toHaveLength(6000); expect(value.truncated).toBe(true); expect(res.headers.get("cache-control")).toContain("no-store"); expect(documents.eq).toHaveBeenCalledWith("application_case_id",caseId); expect(version.eq).toHaveBeenCalledWith("owner_user_id","owner"); expect(version.eq).toHaveBeenCalledWith("document_id",docId); expect(version.order).toHaveBeenCalledWith("version_number",{ascending:false}); expect(fetch).not.toHaveBeenCalled();
  });
  it("is unavailable in production",async()=>{vi.stubEnv("NODE_ENV","production"); expect((await get()).status).toBe(404); expect(db.getUser).not.toHaveBeenCalled();});
});

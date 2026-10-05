import { describe, expect, it, vi } from "vitest";
import { fetchPosting, extractStructuredPosting, recruiterSource } from "./fetch-posting";
const posting = "모집 분야 개발자. 담당업무 서비스 개발. 자격요건 관련 경험. 우대 협업 능력. ".repeat(12);
describe("public posting fetch", () => {
  it("reads the actual recruiter body rather than the JavaScript shell", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ title: "공개 채용", jobDescription: "<p>" + posting + "</p>" }));
    const result = await fetchPosting("https://sample.recruiter.co.kr/career/jobs/123", fetcher);
    expect(result.ok).toBe(true);
    if(result.ok) expect(result.text).toContain("담당업무");
    expect(fetcher).toHaveBeenCalledWith("https://api-recruiter.recruiter.co.kr/position/v2/jobflex/123", expect.objectContaining({ redirect: "manual", headers: expect.objectContaining({ prefix: "sample.recruiter.co.kr" }) }));
  });
  it("does not claim image-only requirements were read", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ title: posting, jobDescription: '<img src="https://example.com/posting.png" />' }));
    expect(await fetchPosting("https://sample.recruiter.co.kr/career/jobs/123", fetcher)).toEqual({ ok:false, reason:"IMAGE_ONLY" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("never follows redirects into private addresses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status:302,headers:{location:"http://127.0.0.1/secrets"}}));
    expect((await fetchPosting("https://example.com/jobs",fetcher)).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bounds bodies before reading them", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(posting,{headers:{"content-type":"text/html","content-length":"3000001"}}));
    expect((await fetchPosting("https://example.com/jobs",fetcher)).ok).toBe(false);
  });
  it("extracts JobPosting metadata, not unrelated scripts", async () => {
    const html = '<script type="application/ld+json">' + JSON.stringify({"@graph":[{"@type":"JobPosting",description:posting}]}) + '</script>';
    expect(extractStructuredPosting(html)).toBe(posting.trim());
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(html,{headers:{"content-type":"text/html"}}));
    expect((await fetchPosting("https://example.com/jobs",fetcher)).ok).toBe(true);
  });
  it("rejects lookalike recruiter hosts", () => {
    expect(recruiterSource("https://sample.recruiter.co.kr.evil.com/career/jobs/123")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { communityTopics } from "@/domain/community";
import { buildCommunitySeedInstructions, generateCommunitySeedContent, selectCommunitySeedTopic } from "./community-seed-content";

describe("community editorial diversity", () => {
  it("covers every category without consecutive repeats over 120 days", () => {
    const history: string[] = [];
    for (let day = 0; day < 120; day++) {
      const selected = selectCommunitySeedTopic(history.slice(0, 30));
      expect(selected).not.toBe(history[0]);
      history.unshift(selected);
    }
    for (const topic of communityTopics) expect(history.filter((value) => value === topic)).toHaveLength(30);
  });

  it("recovers from production/application-heavy history and ignores unknown categories", () => {
    expect(selectCommunitySeedTopic(Array(30).fill("application"))).toBe("job-search");
    expect(selectCommunitySeedTopic(["unknown", "job-search"])).toBe("career");
    expect(selectCommunitySeedTopic(["career", "application", "work-life", "job-search"])).toBe("job-search");
  });

  it("includes review and experience boundaries plus varied formats", () => {
    const instructions = buildCommunitySeedInstructions(["최근 면접 준비 글"], ["application"]);
    for (const text of ["취업·진로·이직", "기업 리뷰", "직무 경험", "가상 사례", "지어내지 마세요", "현재 검색 결과나 검증된 자료는 제공되지 않았습니다", "마크다운 굵게 표기", "최근 면접 준비 글"])
      expect(instructions).toContain(text);
  });

  it("sends the selected category to the API and rejects off-category output", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({ topic: "application", title: "면접 준비", body: "테스트 본문" }),
    })));
    await expect(generateCommunitySeedContent({ apiKey: "test", model: "test-model", recentTitles: [], recentTopics: ["application"], fetchImplementation })).rejects.toThrow("지정 분류");
    const payload = JSON.parse(String(fetchImplementation.mock.calls[0][1]?.body));
    expect(payload.instructions).toContain("분류(topic)는 반드시 job-search");
    expect(payload.text.format.strict).toBe(true);
  });

  it("accepts structured output in the chosen category and rejects malformed content", async () => {
    const item = { topic: "job-search", title: "첫 취업 준비", body: "공고를 비교할 때 확인할 항목" };
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(item) }] }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ output_text: JSON.stringify({ ...item, topic: "unknown" }) })));
    const options = { apiKey: "test", model: "test-model", recentTitles: [], recentTopics: [], fetchImplementation };
    await expect(generateCommunitySeedContent(options)).resolves.toEqual(item);
    await expect(generateCommunitySeedContent(options)).rejects.toThrow();
  });

  it("removes markdown bold markers from generated titles and bodies", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({ topic: "job-search", title: "**첫 취업** 준비", body: "**공고**를 비교하세요." }),
    })));
    await expect(generateCommunitySeedContent({ apiKey: "test", model: "test-model", recentTitles: [], recentTopics: [], fetchImplementation }))
      .resolves.toEqual({ topic: "job-search", title: "첫 취업 준비", body: "공고를 비교하세요." });
  });
});

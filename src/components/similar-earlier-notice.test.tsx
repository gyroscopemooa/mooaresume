// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { formatEarlierDate, SimilarEarlierNotice } from "./similar-earlier-notice";

afterEach(cleanup);

const now = new Date("2026-10-06T03:00:00Z");

describe("SimilarEarlierNotice", () => {
  it("tells that a similar letter was analyzed before on this account, and that results can differ a little", () => {
    render(<SimilarEarlierNotice analysisRunId="run-old" analyzedAt="2026-10-04T03:20:00Z" now={now} />);
    const note = screen.getByRole("note", { name: "비슷한 글 안내" });
    expect(note.textContent).toContain("같은 계정에서 전에 첨삭한 비슷한 글이 있어요.");
    expect(note.textContent).toContain("같은 글도 AI 첨삭은 표현과 일부 판단이 조금 달라질 수 있어요.");
  });

  it("links to the earlier result with the date", () => {
    render(<SimilarEarlierNotice analysisRunId="run-old" analyzedAt="2026-10-04T03:20:00Z" now={now} />);
    const link = screen.getByRole("link", { name: "10월 4일에 첨삭한 결과 보기" });
    expect(link.getAttribute("href")).toBe("/result?analysisRunId=run-old");
  });

  it("encodes the run id in the link", () => {
    render(<SimilarEarlierNotice analysisRunId="a b&c" analyzedAt="2026-10-04T03:20:00Z" now={now} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/result?analysisRunId=a%20b%26c");
  });

  it("does not claim the earlier result was used as a baseline, or that the result is the same", () => {
    const { container } = render(<SimilarEarlierNotice analysisRunId="run-old" analyzedAt="2026-10-04T03:20:00Z" now={now} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/기준점|기존 첨삭 결과를 (기준|바탕)|이어서|이전 결과를 (반영|참고)|항상 같|똑같|보장/);
  });

  it("falls back to a dateless link when the date cannot be read", () => {
    render(<SimilarEarlierNotice analysisRunId="run-old" analyzedAt="not-a-date" now={now} />);
    expect(screen.getByRole("link", { name: "전에 첨삭한 결과 보기" })).toBeTruthy();
  });
});

describe("formatEarlierDate", () => {
  it("writes month and day for this year", () => {
    expect(formatEarlierDate("2026-01-09T03:00:00Z", now)).toBe("1월 9일");
  });

  it("adds the year for another year", () => {
    expect(formatEarlierDate("2025-12-30T03:00:00Z", now)).toBe("2025년 12월 30일");
  });

  it("uses the Korean calendar day, not the UTC one", () => {
    // UTC 10월 4일 16:00 = 한국 10월 5일 01:00
    expect(formatEarlierDate("2026-10-04T16:00:00Z", now)).toBe("10월 5일");
    // UTC로는 지난해 12월 31일이지만 한국에서는 올해 1월 1일이다 → 올해 날짜로 읽어 연도를 붙이지 않는다.
    expect(formatEarlierDate("2025-12-31T16:30:00Z", new Date("2026-01-02T00:00:00Z"))).toBe("1월 1일");
  });

  it("returns null for an unreadable date", () => {
    expect(formatEarlierDate("", now)).toBeNull();
    expect(formatEarlierDate("어제", now)).toBeNull();
  });
});

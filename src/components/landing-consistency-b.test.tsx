// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LandingConsistencyB } from "./landing-consistency-b";

afterEach(cleanup);
describe("landing B preview copy", () => {
  it("states the philosophy and the AI limitation without advertising unavailable choices", () => {
    render(<LandingConsistencyB/>);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("판단 기준은 일관되게,표현은 나답게.");
    expect(document.body.textContent).toContain("같은 글과 지원 조건");
    expect(document.body.textContent).toContain("일부 판단의 차이가 생길 수 있습니다");
    expect(document.body.textContent).not.toMatch(/합격 보장|항상 같은 결과|다른 표현 보기/);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

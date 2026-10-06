// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { LandingConsistency } from "./landing-consistency";

afterEach(cleanup);

describe("LandingConsistency", () => {
  it("질문으로 시작해 판단은 같고 표현은 달라도 된다는 답을 보여 준다", () => {
    render(<LandingConsistency />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("자소서 첨삭 결과는 같아야 할까요?");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("매번 달라야 할까요?");

    const same = screen.getByText("판단은 같아야 해요").closest("article") as HTMLElement;
    for (const item of ["문제 파악", "수정할 지점", "첨삭의 중점"]) expect(within(same).getByText(item)).toBeTruthy();

    const free = screen.getByText("표현은 달라도 돼요").closest("article") as HTMLElement;
    for (const item of ["문장의 뉘앙스", "말투"]) expect(within(free).getByText(item)).toBeTruthy();
    expect(within(free).getByText(/어떤 표현으로 낼지는 지원자가 고릅니다/)).toBeTruthy();
  });

  it("아직 지킬 수 없는 보장이나 근거 없는 단정을 쓰지 않는다", () => {
    const { container } = render(<LandingConsistency />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/항상 같은 결과가 (나옵니다|나와요)|매번 똑같|100%|보장|합격(이|을)? (달라|결정)/);
    // 같은 입력에도 문장이 달라질 수 있다는 한계를 숨기지 않는다.
    expect(text).toContain("같은 입력에도 문장이 조금씩 달라질 수 있어요");
    expect(text).toContain("다듬고 있습니다");
  });

  it("접근성 이름이 있는 섹션이다", () => {
    render(<LandingConsistency />);
    expect(screen.getByRole("region", { name: /자소서 첨삭 결과는 같아야 할까요/ })).toBeTruthy();
  });
});

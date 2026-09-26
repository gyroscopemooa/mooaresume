// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AccountDeletionPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => cleanup());

// Google Play 데이터 보안 양식의 계정 삭제 링크는 스토어 등록정보의 앱 또는 개발자 이름을 밝히고,
// 삭제 요청 단계와 삭제·보관 데이터·기간을 보여야 합니다(2026-09-26 심사 반려 사유).
describe("계정 삭제 요청 페이지(Google Play 요구사항)", () => {
  it("스토어에 등록된 앱 이름과 개발자 이름을 분명히 밝힌다", () => {
    const { container } = render(<AccountDeletionPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("자소서첨삭-직업심리검사,자기소개서,이력서,커리어검사");
    expect(text).toContain("GyroScope");
    expect(text).toContain("com.mooaresume.twa");
    expect(String(metadata.title)).toContain("GyroScope");
  });

  it("삭제 요청 단계, 삭제되는 데이터, 보관되는 데이터와 기간을 보여 준다", () => {
    const { container } = render(<AccountDeletionPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("삭제 요청 방법");
    expect(text).toContain("support@mooaresume.com");
    expect(text).toContain("삭제되는 데이터");
    expect(text).toContain("삭제되지 않고 보관되는 데이터");
    expect(text).toContain("5년");
    expect(text).toContain("3개월");
  });
});

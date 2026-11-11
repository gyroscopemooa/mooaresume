// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ServiceDeliveryNotice } from "./service-delivery-notice";
import { PricingComparison } from "./pricing-comparison";

vi.mock("@/components/runtime-event-slot", () => ({ RuntimeEventSlot: () => null }));
afterEach(cleanup);

describe("service delivery disclosure", () => {
  it("keeps every disclosure and the policy link visible in compact mode", () => {
    render(<ServiceDeliveryNotice kind="analysis" compact />);
    const notice = screen.getByRole("complementary", { name: "서비스 제공 안내" });
    expect(notice.textContent).toContain("QUICK·PRO·FINAL은 지원 건별 결제입니다.");
    expect(notice.textContent).toContain("결제 확인 후 분석을 시작할 수 있으며, 완료 시 구매한 상품 범위의 분석·첨삭 결과를 제공합니다.");
    expect(notice.textContent).toContain("자동 갱신되는 정기결제가 아닙니다.");
    expect(notice.textContent).toContain("처리 시간은 입력 분량과 시스템 상황에 따라 달라질 수 있습니다.");
    expect(notice.textContent).toContain("결과의 보관·열람 기간은 서비스 제공기간과 구분됩니다.");
    expect(screen.getByRole("link", { name: "서비스 제공·이용범위 안내" }).getAttribute("href")).toBe("/policy#service-delivery");
    expect(notice.style.fontSize).toBe("0.75rem");
    expect(notice.closest("details")).toBeNull();
    expect(notice.hidden).toBe(false);
  });

  it("preserves default styling for other product notices", () => {
    render(<ServiceDeliveryNotice kind="document" />);
    expect(screen.getByRole("complementary").style.fontSize).toBe("0.875rem");
    expect(screen.getByRole("complementary").textContent).toContain("문서 제작은 선택한 문서 1건에 대한 건별 결제입니다.");
  });

  it("places the compact notice below pricing cards but above the comparison", () => {
    const { container } = render(<PricingComparison />);
    const notice = screen.getByRole("complementary", { name: "서비스 제공 안내" });
    const cards = container.querySelectorAll("article");
    expect(cards.length).toBe(3);
    for (const card of cards) expect(card.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const toggle = screen.getByRole("button", { name: "전체 기능 비교 닫기" });
    expect(notice.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

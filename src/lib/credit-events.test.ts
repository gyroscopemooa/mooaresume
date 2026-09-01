// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { announceCreditChange, onCreditChange } from "./credit-events";

/**
 * 쿠폰을 등록해도 결제 화면이 나오던 사고의 접합부.
 *
 * 이용권 조회는 화면이 뜰 때 한 번만 돕니다. 등록은 그보다 늦게 끝나므로,
 * 알리지 않으면 방금 표를 받은 사람이 돈을 냅니다.
 */
describe("이용권 변경 알림", () => {
  it("알리면 듣고 있던 쪽이 다시 확인한다", () => {
    const recheck = vi.fn();
    const stop = onCreditChange(recheck);

    announceCreditChange();

    expect(recheck).toHaveBeenCalledTimes(1);
    stop();
  });

  it("떠난 뒤에는 부르지 않는다", () => {
    const recheck = vi.fn();
    onCreditChange(recheck)();

    announceCreditChange();

    expect(recheck).not.toHaveBeenCalled();
  });
});

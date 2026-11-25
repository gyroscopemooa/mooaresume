import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExternalOrderEmail, sendExternalOrderCompleteEmail, type ExternalOrderEmailInput } from "./external-order-complete-email";
const base: ExternalOrderEmailInput = { to: "customer@example.com", product: "PRO", resultUrl: "https://mooaresume.com/result/external/example-token", requestId: "example-order" };
afterEach(() => vi.unstubAllEnvs());
describe("external order completion mail", () => {
  it("includes supplied fields and omits missing ones", () => {
    const full = buildExternalOrderEmail({ ...base, customerName: "홍길동", salesChannel: "네이버 스마트스토어", orderNumber: "2026112500012345", paidAmountKrw: 17900, company: "현대자동차", role: "품질관리" });
    for (const value of ["홍길동","네이버 스마트스토어","2026112500012345","17,900원","현대자동차","품질관리"]) {
      expect(full.html).toContain(value); expect(full.text).toContain(value);
    }
    const minimal=buildExternalOrderEmail(base);
    for (const label of ["상품주문번호","구매처","결제 금액","지원 기업","지원 직무"]) expect(minimal.html).not.toContain(label);
  });
  it("escapes metadata and rejects foreign links", () => {
    expect(buildExternalOrderEmail({...base, customerName:"<script>bad</script>"}).html).not.toContain("<script>");
    expect(() => buildExternalOrderEmail({...base,resultUrl:"https://other.example/result/external/example"})).toThrow();
  });
  it("uses existing Resend configuration", async () => {
    vi.stubEnv("RESEND_API_KEY","test-key"); vi.stubEnv("ANALYSIS_EMAIL_FROM","noreply@mooaresume.com");
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:"message"})});
    expect(await sendExternalOrderCompleteEmail(base,fetcher as never)).toEqual({disposition:"SENT",messageId:"message"});
    const init=fetcher.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string,string>)["Idempotency-Key"]).toBe("external-order/example-order");
  });
});

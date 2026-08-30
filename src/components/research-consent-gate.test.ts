import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gate = readFileSync("src/components/research-consent-gate.tsx", "utf8");
const handoff = readFileSync("src/components/application-case-handoff.tsx", "utf8");

describe("연구 동의 강제 선택", () => {
  it("기본값이 없다", () => {
    // A pre-selected answer to an optional data question is not consent that
    // would survive a complaint, and every copy collected under it would have
    // to be deleted.
    expect(gate).toContain("useState<boolean | null>(null)");
    expect(gate).not.toMatch(/useState<boolean \| null>\((true|false)\)/);
  });

  it("고르기 전에는 시작할 수 없다", () => {
    expect(handoff).toContain("disabled={busy || !guest || !consentDecided}");
    expect(handoff).toContain("위에서 하나를 고르시면 시작할 수 있습니다.");
  });

  it("거절도 한 번의 선택으로 끝난다", () => {
    // Declining has to be as easy as accepting, or the choice is not free.
    expect(gate).toContain("사용하지 않겠습니다");
    expect(gate).toContain("결과와 기능은 완전히 같습니다");
  });

  it("이미 답한 사람에게 다시 묻지 않는다", () => {
    expect(gate).toContain("data.consent_version === RESEARCH_CONSENT_VERSION");
    expect(gate).toContain("onDecided(true)");
  });

  it("동의 문구가 바뀌면 다시 묻는다", () => {
    // Versioning the consent is pointless if an old answer keeps standing.
    expect(gate).toContain("RESEARCH_CONSENT_VERSION");
    expect(gate).toContain("consent_version");
  });

  it("요청이 막혀도 결제를 가로막지 않는다", () => {
    // A blocked request is not the applicant's problem and must not stand
    // between them and the run they are paying for.
    expect(gate).toContain("catch {\n        // A blocked request is not the applicant's problem");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gate = readFileSync("src/components/research-consent-gate.tsx", "utf8");
const handoff = readFileSync("src/components/application-case-handoff.tsx", "utf8");

describe("연구 동의 체크", () => {
  it("미리 체크돼 있지 않다", () => {
    // A pre-ticked box is not valid consent for an optional purpose, and every
    // copy gathered under it would have to be deleted.
    expect(gate).toContain("useState(false)");
    expect(gate).not.toMatch(/const \[granted, setGranted\] = useState\(true\)/);
  });

  it("설명은 접어 두고 눌러야 열린다", () => {
    // Four lines of policy above a pay button is read by nobody.
    expect(gate).toContain('aria-expanded={open}');
    expect(gate).toContain("{open && <div className={styles.detail}>");
  });

  it("동의하지 않아도 결제를 막지 않는다", () => {
    expect(handoff).toContain("disabled={busy || !guest}");
    expect(handoff).not.toContain("consentDecided");
  });

  it("거절해도 잃는 것이 없다고 말한다", () => {
    expect(gate).toContain("동의하지 않아도 결과와 기능은 완전히 같습니다.");
    expect(gate).toContain("철회하시면 보관 중이던 사본도 그 자리에서 지웁니다");
  });

  it("문구가 바뀌면 예전 답은 유효하지 않다", () => {
    expect(gate).toContain("data?.consent_version === RESEARCH_CONSENT_VERSION");
  });

  it("체크박스로 읽힌다", () => {
    // It is a button, so the role and state have to be said out loud.
    expect(gate).toContain('role="checkbox"');
    expect(gate).toContain("aria-checked={granted}");
  });
});

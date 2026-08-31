import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gate = readFileSync("src/components/research-consent-gate.tsx", "utf8");
const handoff = readFileSync("src/components/application-case-handoff.tsx", "utf8");

describe("연구 동의 체크", () => {
  it("미리 체크돼 있지 않다", () => {
    // A pre-ticked box is not valid consent for an optional purpose, and every
    // copy gathered under it would have to be deleted.
    expect(gate).toContain("useState<boolean | null>(null)");
    expect(gate).not.toMatch(/useState<boolean \| null>\((true|false)\)/);
  });

  it("설명은 접어 두고 눌러야 열린다", () => {
    // Four lines of policy above a pay button is read by nobody.
    expect(gate).toContain('aria-expanded={open}');
    expect(gate).toContain("{open && <div className={styles.detail}>");
  });

  it("하나를 고르기 전에는 시작할 수 없다", () => {
    expect(handoff).toContain("disabled={busy || !guest || !consentDecided}");
    expect(handoff).toContain("위에서 하나를 골라 주세요.");
  });

  it("거절도 한 번의 클릭이다", () => {
    // A choice that is harder to decline than to accept is not a free one.
    expect(gate).toContain('box(true, "데이터 활용")');
    expect(gate).toContain('box(false, "활용하지 않기")');
  });

  it("거절해도 잃는 것이 없다고 말한다", () => {
    expect(gate).toContain("활용하지 않아도 결과는 완전히 같고, 언제든 철회하실 수 있습니다.");
    expect(gate).toContain("개인정보를 삭제하고 데이터만 활용됩니다.");
    // The inducement names the standard, not the outcome: a promise of a
    // passing letter inside a consent panel is what makes the consent
    // challengeable, and the research dashboard already refuses pass-rate
    // claims until the sample can carry one.
    expect(gate).toContain("합격 자소서의 기준이 선명해집니다");
    expect(gate).not.toContain("합격 자소서가 완성됩니다");
  });

  it("문구가 바뀌면 예전 답은 유효하지 않다", () => {
    expect(gate).toContain("data.consent_version === RESEARCH_CONSENT_VERSION");
  });

  it("체크박스로 읽힌다", () => {
    // It is a button, so the role and state have to be said out loud.
    expect(gate).toContain('role="radiogroup"');
    expect(gate).toContain("aria-checked={choice === value}");
  });
});

describe("저장이 실패했을 때", () => {
  const source = readFileSync("src/components/research-consent-gate.tsx", "utf8");

  it("결제를 막지 않는다", () => {
    // Collection reads the consent table, so a write we could not make means no
    // collection either way — both answers fail closed. Holding the purchase
    // hostage to it protects nothing and loses the sale.
    const failure = source.slice(source.indexOf("if (error) {"), source.indexOf("setChoice(granted)"));
    expect(failure).toContain("onDecided(true)");
  });

  it("진짜 이유를 보여준다", () => {
    // "다시 눌러 주세요" is wrong advice for a missing function or a rejected
    // constraint: pressing again cannot fix either one.
    expect(source).toContain("error.code");
    expect(source).toContain("데이터는 활용되지 않으며, 분석은 그대로 진행됩니다");
  });
});

describe("죽은 세션과 저장 실패를 구분", () => {
  const source = readFileSync("src/components/research-consent-gate.tsx", "utf8");

  it("만료된 토큰은 고칠 방법을 알려준다", () => {
    // PGRST303 is the database refusing a token minted against a clock that ran
    // ahead. It refuses every authenticated call, so the reader needs the one
    // action that fixes it rather than a code that reads like a consent bug.
    expect(source).toContain("PGRST303");
    expect(source).toContain("로그아웃 후 다시 로그인하면 해결됩니다");
  });

  it("그 밖의 오류는 코드를 그대로 보여준다", () => {
    // Whoever has to fix an unknown failure needs the code; guessing at friendly
    // wording for it would hide the only useful thing in the message.
    expect(source).toContain('[code, message].filter(Boolean).join(" · ")');
  });
});

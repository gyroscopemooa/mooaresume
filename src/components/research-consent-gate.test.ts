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
    expect(handoff).toContain("disabled={busy || runActive || !guest || !consentDecided}");
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
    expect(readFileSync("src/server/research/research-consent-repository.ts", "utf8")).toContain("data.consent_version !== consentVersion");
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
    const failure = source.slice(source.indexOf("if (!response.ok) {"), source.indexOf("setChoice(granted)"));
    expect(failure).toContain("onDecided(true)");
  });

  it("진짜 이유를 보여준다", () => {
    // "다시 눌러 주세요" is wrong advice for a missing function or a rejected
    // constraint: pressing again cannot fix either one.
    expect(source).toContain("response.status");
    expect(source).toContain("데이터는 활용되지 않으며, 분석은 그대로 진행됩니다");
  });
});

describe("동의 저장은 서버를 거친다", () => {
  const source = readFileSync("src/components/research-consent-gate.tsx", "utf8");
  const route = readFileSync("src/app/api/research-consent/route.ts", "utf8");
  const repository = readFileSync("src/server/research/research-consent-repository.ts", "utf8");

  it("브라우저가 데이터베이스를 직접 부르지 않는다", () => {
    // This was the only important write in the app taking that path, and it was
    // the one that broke while every server-routed write kept working.
    expect(source).not.toContain("supabase.rpc");
    expect(source).not.toContain("@/lib/supabase/client");
    expect(source).toContain('fetch("/api/research-consent"');
  });

  it("누가 동의했는지는 서버가 직접 확인한다", () => {
    // Writing with the service key means the row's owner cannot come from the
    // request body — it has to come from the verified session.
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain("auth.user.id");
    expect(route).not.toContain("body.ownerUserId");
  });

  it("문구가 바뀌면 예전 답은 이어받지 않는다", () => {
    expect(repository).toContain("data.consent_version !== consentVersion");
  });

  it("추측한 해결책을 안내로 내보내지 않는다", () => {
    // "로그아웃 후 다시 로그인" was a guess, and a fresh token, a twenty-minute-old
    // token and a re-login all failed the same way.
    expect(source).not.toContain("로그아웃 후 다시 로그인하면 해결됩니다");
    expect(source).toContain('[code, message].filter(Boolean).join(" · ")');
  });
});

describe("분석이 시작된 뒤에는 다시 묻지 않는다", () => {
  const source = readFileSync("src/components/research-consent-gate.tsx", "utf8");
  const handoff = readFileSync("src/components/application-case-handoff.tsx", "utf8");
  const progress = readFileSync("src/components/quick-checkout-return.tsx", "utf8");

  it("아무것도 남기지 않는다", () => {
    // Pressing it mid-run changed nothing about the run, which is exactly what
    // made it read as though it might. Restating the settled answer instead was
    // one more line to read for no decision.
    expect(source).toContain("if (locked) return null;");
  });

  it("철회 경로는 결과 화면에 남아 있다", () => {
    // The requirement is that consent can be withdrawn, not that every screen
    // repeats that it can.
    expect(readFileSync("src/components/result-workspace-complete.tsx", "utf8")).toContain("<ResearchConsent />");
  });

  it("진행 중에는 결제 버튼도 잠근다", () => {
    expect(handoff).toContain("disabled={busy || runActive");
    expect(handoff).toContain('runActive ? "분석이 진행 중입니다"');
  });

  it("실패한 분석은 다시 결정할 수 있게 풀어 준다", () => {
    // A failed run needs the decisions back so it can be retried.
    expect(progress).toContain('phase === "waiting" || phase === "analyzing"');
  });
});

describe("결과 화면의 동의 항목", () => {
  const consent = readFileSync("src/components/research-consent.tsx", "utf8");

  it("여기도 서버를 거친다", () => {
    // Same path that took a day: the browser calling PostgREST with the user's
    // token. Two components asked for the same row, only one had been moved.
    expect(consent).not.toContain("supabase.rpc");
    expect(consent).not.toContain("@/lib/supabase/client");
    expect(consent).toContain('fetch("/api/research-consent"');
  });

  it("설명은 접어 두고 체크만 남긴다", () => {
    // Explaining already happened before payment. This is where the answer gets
    // changed, and it sat between the finished 첨삭 and the referral block taking
    // a screen for a decision most people had already made.
    expect(consent).toContain("aria-expanded={open}");
    expect(consent).toContain("{open && <div");
  });

  it("지워지지 않는 것을 계속 말한다", () => {
    // Dropping this would make the promise above it stronger than it is.
    expect(consent).toContain("REDACTION_LIMITS.map");
  });
});

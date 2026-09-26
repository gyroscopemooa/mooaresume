import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardIsComplete } from "@/domain/interview-pack";
import { SAMPLE_EXPECTATIONS } from "@/fixtures/interview-pack-expectations";
import { PACK_SAMPLES } from "@/fixtures/interview-pack-samples";
import { sampleDocs } from "@/fixtures/interview-pack-sample-ai";
import { locateQuote } from "@/domain/interview-pack-text";
import { PackApiError, createSampleApi } from "./client-api";

let key = 0;
const nextKey = () => `sample-key-${String((key += 1)).padStart(6, "0")}`;
const fetchSpy = vi.fn(async () => {
  throw new Error("샘플 모드에서 네트워크를 부르면 안 됩니다");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("샘플 A — 자료 충분", () => {
  it("점검하면 열한 문항이 모두 만들 수 있음이고, 생성하면 완성 답변 열한 개가 나온다", async () => {
    const api = createSampleApi("complete");
    const loaded = await api.load();
    expect(loaded.state?.materials.docs.length).toBe(9);
    expect(loaded.state?.answers).toEqual([]);

    const checked = (await api.check(nextKey())).state;
    expect(checked.assessment!.slots.every((slot) => slot.status === "ready")).toBe(true);
    expect(checked.usage.initial.used).toBe(0);
    expect(checked.testBudget).not.toBeNull();

    const generated = (await api.generate(nextKey(), "initial")).state;
    expect(generated.answers).toHaveLength(11);
    for (const answer of generated.answers) {
      expect(cardIsComplete(answer.card), `${answer.slot} ${JSON.stringify(answer.card.issues)}`).toBe(true);
      expect(answer.card.issues.filter((issue) => issue.severity === "error")).toEqual([]);
      expect(answer.card.keywords.length).toBeGreaterThanOrEqual(3);
      expect(answer.card.keywords.length).toBeLessThanOrEqual(5);
      expect(answer.card.steps.length).toBeGreaterThanOrEqual(2);
      expect(answer.card.followUps.length).toBeGreaterThanOrEqual(2);
      expect(answer.card.followUps.length).toBeLessThanOrEqual(3);
      expect(answer.card.evidence.length).toBeGreaterThanOrEqual(1);
      expect(answer.card.memoryLine.length).toBeGreaterThan(0);
      // 모든 키워드는 답변 문장에 연결된다.
      expect(answer.card.keywords.every((keyword) => keyword.sentenceIndex !== null)).toBe(true);
    }
    expect(generated.usage.initial).toMatchObject({ used: 1, limit: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("모든 근거는 자료 원문에 실제로 있고 문단 전체가 저장되어 있다", async () => {
    const api = createSampleApi("complete");
    await api.check(nextKey());
    const state = (await api.generate(nextKey(), "initial")).state;
    const docs = sampleDocs("complete");
    for (const answer of state.answers) {
      for (const evidence of answer.card.evidence) {
        expect(locateQuote(docs, { docId: evidence.docId, paragraph: evidence.paragraph, quote: evidence.quote }), `${answer.slot}: ${evidence.quote}`).not.toBeNull();
        expect(evidence.paragraphText).toContain(evidence.quote.slice(0, 6));
        expect(evidence.docTitle.length).toBeGreaterThan(0);
      }
    }
  });

  it("기대 동작 — 지어낸 표현이 없고 8건→2건·검사보조가 유지되며 30초/1분이 서로 다른 글이다", async () => {
    const api = createSampleApi("complete");
    await api.check(nextKey());
    const state = (await api.generate(nextKey(), "initial")).state;
    const all = state.answers.map((answer) => answer.card.answer).join("\n");
    const expectation = SAMPLE_EXPECTATIONS.complete;
    for (const phrase of expectation.mustNotAppear) expect(all, phrase).not.toContain(phrase);
    for (const phrase of expectation.mustAppear) expect(all, phrase).toContain(phrase);

    const intro30 = state.answers.find((answer) => answer.slot === "intro_30")!.card.answer;
    const intro60 = state.answers.find((answer) => answer.slot === "intro_60")!.card.answer;
    expect(intro30).not.toBe(intro60);
    expect(intro60.startsWith(intro30.slice(0, 20))).toBe(false);
    expect(state.answers.slice(0, 4).map((answer) => answer.slot)).toEqual(["intro_30", "intro_60", "motivation_company", "aspiration"]);
  });

  it("선택 답변 수정(줄이기)은 예시로만 동작하고 횟수를 쓰며, 예시가 없는 요청은 성공처럼 꾸미지 않는다", async () => {
    const api = createSampleApi("complete");
    await api.check(nextKey());
    await api.generate(nextKey(), "initial");
    const revised = (await api.revise({ slot: "intro_30", kind: "shorten", requestKey: nextKey() })).state;
    const intro = revised.answers.find((answer) => answer.slot === "intro_30")!;
    expect(intro.origin).toBe("ai_revised");
    expect(revised.usage.edit.used).toBe(1);
    expect(cardIsComplete(intro.card)).toBe(true);

    const error = await api.revise({ slot: "aspiration", kind: "shorten", requestKey: nextKey() }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PackApiError);
    expect((error as PackApiError).code).toBe("SAMPLE_NO_REVISION");
    expect((await api.load()).state?.usage.edit.used).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("직접 수정과 이전 버전 복원이 샘플에서도 동작한다", async () => {
    const api = createSampleApi("complete");
    await api.check(nextKey());
    const first = (await api.generate(nextKey(), "initial")).state.answers.find((answer) => answer.slot === "intro_30")!;
    const edited = (await api.edit({ slot: "intro_30", baseRevision: first.revisionNo, answer: "검사보조로 일하며 체크리스트 초안을 만들었습니다. 수정본입니다." })).state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(edited.origin).toBe("user_edited");
    const revisions = await api.revisions("intro_30");
    expect(revisions.map((revision) => revision.revisionNo)).toEqual([2, 1]);
    const restored = (await api.restore({ slot: "intro_30", revisionNo: 1, baseRevision: 2 })).state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(restored.origin).toBe("restored");
    expect(restored.card.answer).toBe(first.card.answer);
  });
});

describe("샘플 B — 자료 부족", () => {
  it("모든 항목이 자료 보완 필요이고, 문항마다 1~3개 질문이 있으며, 완성 답변은 만들어지지 않는다", async () => {
    const api = createSampleApi("insufficient");
    const state = (await api.check(nextKey())).state;
    expect(state.assessment!.slots).toHaveLength(11);
    for (const slot of state.assessment!.slots) {
      expect(slot.status, slot.slot).toBe("needs_material");
      expect(slot.questions.length).toBeGreaterThanOrEqual(1);
      expect(slot.questions.length).toBeLessThanOrEqual(3);
      expect(slot.reason.length).toBeGreaterThan(0);
    }
    const company = state.assessment!.slots.find((slot) => slot.slot === "motivation_company")!;
    expect(company.questions.join(" ")).toContain("회사");

    const error = await api.generate(nextKey(), "initial").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PackApiError);
    expect((error as PackApiError).code).toBe("NOTHING_TO_GENERATE");
    const after = (await api.load()).state!;
    expect(after.answers).toEqual([]);
    expect(after.usage.initial.used).toBe(0);
  });

  it("자료를 보완해도 새 자료 버전이 쌓일 뿐 원본은 그대로이고 다시 점검해야 한다", async () => {
    const api = createSampleApi("insufficient");
    await api.check(nextKey());
    const saved = await api.saveMaterials({
      supplements: { company: "샘플생산 주식회사(가상)", applyReason: "공정 일정을 맞추는 일에 관심이 있어 지원했습니다." },
      slotAnswers: [],
      confirmations: [],
    });
    expect(saved.state.pack.materialsVersion).toBe(2);
    expect(saved.state.assessment?.stale).toBe(true);
    expect(saved.state.materials.company).toBe("샘플생산 주식회사(가상)");
    const error = await api.generate(nextKey(), "initial").catch((caught: unknown) => caught);
    expect((error as PackApiError).code).toBe("NEEDS_CHECK");
  });
});

describe("샘플 C — 자료 충돌", () => {
  it("실제로 어긋난 세 가지를 원문 그대로 나란히 보여 주고, 확인 전에는 확정하지 않는다", async () => {
    const api = createSampleApi("conflicting");
    const state = (await api.check(nextKey())).state;
    const conflicts = state.assessment!.conflicts;
    expect(conflicts.map((conflict) => conflict.topic).sort()).toEqual(["metric", "period", "role"]);
    const period = conflicts.find((conflict) => conflict.topic === "period")!;
    expect(period.left.paragraphText).toContain("1년 6개월");
    expect(period.right.paragraphText).toContain("3년간");
    const role = conflicts.find((conflict) => conflict.topic === "role")!;
    expect(role.left.paragraphText).toContain("검사보조");
    expect(role.right.paragraphText).toContain("팀장으로서 팀원 5명");
    const metric = conflicts.find((conflict) => conflict.topic === "metric")!;
    expect(metric.left.paragraphText).toContain("누락 기록 8건");
    expect(metric.right.paragraphText).toContain("누락 기록이 20건");
    expect(conflicts.every((conflict) => conflict.resolved === false)).toBe(true);
    expect(state.assessment!.unresolvedConflictCount).toBe(3);

    const byId = new Map(state.assessment!.slots.map((slot) => [slot.slot, slot]));
    for (const slot of ["intro_30", "intro_60", "strength", "role_experience", "problem_solving"] as const) expect(byId.get(slot)?.status).toBe("needs_confirmation");
    expect(byId.get("motivation_company")?.status).toBe("ready");

    // 확인 전에 만들면 충돌과 무관한 항목만 만들어지고, 어느 쪽 숫자·기간·역할도 확정하지 않는다.
    const generated = (await api.generate(nextKey(), "initial")).state;
    expect(generated.answers.map((answer) => answer.slot).sort()).toEqual(["aspiration", "closing", "motivation_company"]);
    const text = generated.answers.map((answer) => answer.card.answer).join("\n");
    for (const phrase of SAMPLE_EXPECTATIONS.conflicting.mustNotAppear) expect(text, phrase).not.toContain(phrase);
    expect(text).not.toContain("8건");
  });

  it("이력서 쪽으로 확인하면 AI 호출 없이 풀리고, 이어서 만든 답변은 물리친 값(3년·팀장·20건)을 쓰지 않는다", async () => {
    const api = createSampleApi("conflicting");
    const checked = (await api.check(nextKey())).state;
    await api.generate(nextKey(), "initial");
    const confirmations = checked.assessment!.conflicts.map((conflict) => ({ conflictId: conflict.id, choice: "left" as const }));
    const resolved = (await api.saveMaterials({ supplements: {}, slotAnswers: [], confirmations })).state;
    expect(resolved.assessment!.unresolvedConflictCount).toBe(0);
    expect(resolved.assessment!.stale).toBe(false);
    for (const slot of ["intro_30", "intro_60", "strength", "role_experience", "problem_solving"] as const) {
      expect(resolved.assessment!.slots.find((entry) => entry.slot === slot)?.status).toBe("ready");
    }

    const completed = (await api.generate(nextKey(), "complete")).state;
    expect(completed.usage.initial.used).toBe(1);
    expect(completed.usage.complete.used).toBe(1);
    const experience = completed.answers.filter((answer) => ["intro_30", "intro_60", "strength", "role_experience", "problem_solving"].includes(answer.slot));
    expect(experience).toHaveLength(5);
    for (const answer of experience) {
      expect(cardIsComplete(answer.card), `${answer.slot} ${JSON.stringify(answer.card.issues)}`).toBe(true);
      for (const phrase of SAMPLE_EXPECTATIONS.conflicting.mustNotAppear) expect(answer.card.answer, phrase).not.toContain(phrase);
    }
    expect(experience.find((answer) => answer.slot === "intro_60")!.card.answer).toContain("1년 6개월");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("샘플 모드는 외부 호출이 없다", () => {
  it.each(PACK_SAMPLES.map((sample) => [sample.id]))("%s — 전체 흐름을 돌려도 fetch 가 한 번도 불리지 않는다", async (id) => {
    const api = createSampleApi(id as "complete" | "insufficient" | "conflicting");
    await api.load();
    await api.check(nextKey());
    await api.generate(nextKey(), "initial").catch(() => undefined);
    await api.revise({ slot: "intro_30", kind: "shorten", requestKey: nextKey() }).catch(() => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("샘플 코드는 서버 키·OpenAI 주소·결제 SDK 를 참조하지 않는다", () => {
    const files = [
      "src/lib/interview-pack/client-api.ts",
      "src/fixtures/interview-pack-sample-ai.ts",
      "src/fixtures/interview-pack-samples.ts",
      "src/server/interview-pack/memory-repository.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      // client-api.ts 의 실제(live) 부분은 자기 서버 라우트를 부르지만, 외부 서비스는 어디에도 없다.
      expect(source, file).not.toMatch(/api\.openai\.com|OPENAI_API_KEY|SUPABASE_SECRET_KEY|polar-sh|@polar|POLAR_/);
    }
  });

  it("기대 동작(정답 설명)은 서버 코드가 가져오지 않는다 — 모델 입력에 섞이지 않는다", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && readFileSync(path, "utf8").includes("interview-pack-expectations")) offenders.push(path);
      }
    };
    walk(join(process.cwd(), "src/server"));
    walk(join(process.cwd(), "src/domain"));
    expect(offenders).toEqual([]);
  });
});

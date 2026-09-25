import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";

const getUser = vi.fn();
const resultMaybeSingle = vi.fn();
const tipMaybeSingle = vi.fn();
const tipInsert = vi.fn();
const explainConnectorMerge = vi.fn();

// 표 이름별로 다른 응답을 돌려주는 최소한의 Supabase 대역.
const filters = () => {
  const query: { eq: () => typeof query; maybeSingle: typeof resultMaybeSingle } = { eq: () => query, maybeSingle: resultMaybeSingle };
  return query;
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: (table: string) => table === "analysis_results"
      ? { select: () => filters() }
      : {
          select: () => {
            const query: { eq: () => typeof query; maybeSingle: typeof tipMaybeSingle } = { eq: () => query, maybeSingle: tipMaybeSingle };
            return query;
          },
          insert: (row: unknown) => tipInsert(row),
        },
  }),
}));
vi.mock("@/server/ai/style-tip-gateway", () => ({ explainConnectorMerge: (...args: unknown[]) => explainConnectorMerge(...args) }));

const { POST } = await import("./route");

const RUN_ID = "0f3c1d52-7a4e-4b8e-9c55-2f1f6a7d3b10";
const opening = "저는 이러한 경험이 센터 업무와 매우 잘 연결된다고 생각합니다. 취업을 준비하는 학생에게는 면접 준비를 돕겠습니다.";
const claim = "또한 저는 사무직·관리직뿐 아니라 생산·제조·품질·현장 업무도 직접 경험했습니다.";
const evidence = "울산 지역은 자동차, 제조, 협력사, 생산관리 직무가 중요한 비중을 차지합니다. 저는 현장 분위기와 교대근무의 차이를 몸으로 경험했습니다.";
const closing = "저는 다양한 경험을 갖춘 실무형 직업상담사로서 학생들이 자신의 경험을 취업 경쟁력으로 바꿀 수 있도록 돕고 싶습니다.";
const question = sampleResultDocument.questions[0];
const storedResult = { ...sampleResultDocument, questions: [{ ...question, revisedAnswer: [opening, claim, evidence, closing].join("\n\n") }] };
const generated = "현장 경험이라는 주장 바로 뒤에 울산 지역의 근거가 이어져서 흐름이 또렷해져요.";

const post = (body: unknown) => POST(new Request("https://mooaresume.com/api/result/style-tip", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
}));
const validBody = { analysisRunId: RUN_ID, questionId: question.id, lead: claim };

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } } });
  resultMaybeSingle.mockReset().mockResolvedValue({ data: { result_data: storedResult } });
  tipMaybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  tipInsert.mockReset().mockResolvedValue({ error: null });
  explainConnectorMerge.mockReset().mockResolvedValue(generated);
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-model";
});

describe("POST /api/result/style-tip", () => {
  it("로그인하지 않았으면 막는다", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await post(validBody)).status).toBe(401);
    expect(explainConnectorMerge).not.toHaveBeenCalled();
  });

  it("입력이 올바르지 않으면 400", async () => {
    expect((await post({ ...validBody, analysisRunId: "not-a-uuid" })).status).toBe(400);
    expect((await post({ ...validBody, lead: "" })).status).toBe(400);
    expect(explainConnectorMerge).not.toHaveBeenCalled();
  });

  it("결과나 문항을 못 찾으면 404", async () => {
    resultMaybeSingle.mockResolvedValue({ data: null });
    expect((await post(validBody)).status).toBe(404);

    resultMaybeSingle.mockResolvedValue({ data: { result_data: storedResult } });
    expect((await post({ ...validBody, questionId: "없는-문항" })).status).toBe(404);
    expect(explainConnectorMerge).not.toHaveBeenCalled();
  });

  it("제안 대상이 아닌 글은 모델을 부르지 않고 422", async () => {
    const response = await post({ ...validBody, lead: evidence });
    expect(response.status).toBe(422);
    expect(explainConnectorMerge).not.toHaveBeenCalled();
    expect(tipInsert).not.toHaveBeenCalled();
  });

  it("모델에는 브라우저가 보낸 글이 아니라 저장된 결과에서 서버가 꺼낸 글만 간다", async () => {
    // 공백만 다른 lead: 서버는 이 글이 아니라 저장된 원문 문단을 쓴다.
    const response = await post({ ...validBody, lead: `  ${claim.replace(" 저는 ", "  저는  ")} ` });

    expect(response.status).toBe(200);
    expect(explainConnectorMerge).toHaveBeenCalledWith(
      { connector: "또한", lead: claim, next: evidence },
      { apiKey: "test-key", model: "test-model", reasoningEffort: undefined },
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ explanation: generated });
  });

  it("모델 설정이 없으면 503", async () => {
    delete process.env.OPENAI_API_KEY;
    expect((await post(validBody)).status).toBe(503);
    expect(explainConnectorMerge).not.toHaveBeenCalled();
  });

  it("모델 호출이 실패하면 502이고 글 내용을 로그에 남기지 않는다", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    explainConnectorMerge.mockRejectedValue(new Error("STYLE_TIP_INVENTED_NUMBER"));

    expect((await post(validBody)).status).toBe(502);
    expect(errorLog).toHaveBeenCalledWith("style_tip_failed", "STYLE_TIP_INVENTED_NUMBER");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("사무직");
    errorLog.mockRestore();
  });

  describe("설명 저장", () => {
    it("이미 저장된 설명이 있으면 모델을 부르지 않고 그대로 돌려준다", async () => {
      tipMaybeSingle.mockResolvedValue({ data: { explanation: "예전에 저장해 둔 설명입니다. 다시 열어도 같은 문구가 나와요." }, error: null });

      const response = await post(validBody);

      expect(await response.json()).toEqual({ explanation: "예전에 저장해 둔 설명입니다. 다시 열어도 같은 문구가 나와요." });
      expect(explainConnectorMerge).not.toHaveBeenCalled();
      expect(tipInsert).not.toHaveBeenCalled();
    });

    it("새로 만든 설명은 소유자·실행·문항·글의 해시와 함께 저장한다", async () => {
      await post(validBody);

      expect(tipInsert).toHaveBeenCalledTimes(1);
      const [row] = tipInsert.mock.calls[0] as [Record<string, string>];
      expect(row).toMatchObject({ analysis_run_id: RUN_ID, owner_user_id: "user-1", question_id: question.id, kind: "connector_merge", explanation: generated });
      expect(row.tip_key).toMatch(/^[0-9a-f]{32}$/);
    });

    it("제안 자리의 글이 바뀌면 다른 키로 저장한다", async () => {
      await post(validBody);
      resultMaybeSingle.mockResolvedValue({ data: { result_data: { ...storedResult, questions: [{ ...storedResult.questions[0], revisedAnswer: [opening, claim, `${evidence} 덧붙인 문장입니다.`, closing].join("\n\n") }] } } });
      await post(validBody);

      const keys = tipInsert.mock.calls.map(([row]) => (row as { tip_key: string }).tip_key);
      expect(keys).toHaveLength(2);
      expect(keys[0]).not.toBe(keys[1]);
    });

    it("저장에 실패해도(표가 아직 없는 환경 등) 설명은 돌려준다", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      tipInsert.mockResolvedValue({ error: { code: "42P01" } });

      const response = await post(validBody);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ explanation: generated });
      expect(errorLog).toHaveBeenCalledWith("style_tip_save_failed", "42P01");
      errorLog.mockRestore();
    });

    it("저장된 설명을 읽지 못해도(표가 아직 없음) 새로 만들어 돌려준다", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      tipMaybeSingle.mockResolvedValue({ data: null, error: { code: "42P01" } });

      const response = await post(validBody);

      expect(await response.json()).toEqual({ explanation: generated });
      expect(explainConnectorMerge).toHaveBeenCalledTimes(1);
      errorLog.mockRestore();
    });

    it("같은 순간 다른 요청이 먼저 저장했다면(중복) 저장된 설명으로 맞춘다", async () => {
      tipInsert.mockResolvedValue({ error: { code: "23505" } });
      tipMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { explanation: "먼저 저장된 설명입니다. 두 화면이 같은 문구를 보게 돼요." }, error: null });

      const response = await post(validBody);

      expect(await response.json()).toEqual({ explanation: "먼저 저장된 설명입니다. 두 화면이 같은 문구를 보게 돼요." });
    });
  });
});

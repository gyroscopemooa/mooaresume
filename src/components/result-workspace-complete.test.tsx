// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { sampleResultDocument } from "@/fixtures/result-document";
import { ResultWorkspaceComplete } from "./result-workspace-complete";

// 재첨삭 요청이 결과 화면에서 분석 준비 화면으로 넘어가므로 컴포넌트가
// 라우터를 사용합니다. 테스트에는 앱 라우터가 없어 최소한으로 대체합니다.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(cleanup);

describe("ResultWorkspaceComplete 제출본 탭", () => {
  it("저장된 구버전 결과도 실제 원문과 첨삭 차이로 표시한다", () => {
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);

    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("제출본 피드백")).toBeTruthy();
    expect(screen.getAllByText(/분석 엔진을 다시 호출하지 않았습니다/).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("mark[data-type='revise']").length).toBeGreaterThan(0);
    expect(screen.getByText(sampleResultDocument.questions[0].title)).toBeTruthy();
  });

  it("새 분석에 저장된 의미 기반 원문 피드백을 우선 표시한다", () => {
    const first = sampleResultDocument.questions[0];
    const phrase = first.originalAnswer.slice(0, 5);
    const result = {
      ...sampleResultDocument,
      questions: sampleResultDocument.questions.map((question, index) => index === 0 ? {
        ...question,
        originalAnnotations: [{
          id: "stored-1",
          phrase,
          type: "good" as const,
          comment: "실제 분석에서 저장한 피드백입니다.",
          start: 0,
          end: phrase.length,
        }],
      } : question),
    };

    render(<ResultWorkspaceComplete result={result}/>);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("실제 분석에서 저장한 피드백입니다.")).toBeTruthy();
    expect(screen.getByText("좋은 표현")).toBeTruthy();
  });
});

describe("ResultWorkspaceComplete 빈 문항 안내", () => {
  const result = { ...sampleResultDocument, coverageNotes: ['"지원 후 포부" 문항은 작성된 내용이 없어 이번 분석에서 제외했습니다.'] };

  it("한눈에 보기와 제출본 양쪽에서 '처음부터 작성' 유형을 안내한다", () => {
    render(<ResultWorkspaceComplete result={result}/>);

    expect(screen.getByText(result.coverageNotes[0])).toBeTruthy();
    expect(screen.getByText(/아직 아무것도 못 썼어요/)).toBeTruthy();
    expect(screen.getByText(/빈 문항까지 보완하려면 PRO · 내용 보완으로 진행해 주세요/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "제출본" }));
    expect(screen.getByText(/아직 아무것도 못 썼어요/)).toBeTruthy();
    expect(screen.getByText(/번호 줄만 있고/)).toBeTruthy();
  });

  it("제외된 문항이 없으면 안내를 띄우지 않는다", () => {
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);
    expect(screen.queryByText("빈 문항은 첨삭 대상이 아닙니다")).toBeNull();
  });
});

describe("ResultWorkspaceComplete 새 주석 형식", () => {
  it("왜 문제인지와 고쳐 쓴 예시를 나눠 보여주고 확인 필요 라벨을 그린다", () => {
    const first = sampleResultDocument.questions[0];
    const phrase = first.originalAnswer.slice(0, 8);
    const result = {
      ...sampleResultDocument,
      questions: sampleResultDocument.questions.map((question, index) => index === 0 ? {
        ...question,
        originalAnnotations: [{
          id: "fact-1",
          phrase,
          type: "fact" as const,
          comment: "제출본만으로는 확인할 수 없는 성과입니다.",
          suggestion: "확인이 어렵다면 해결했다 대신 원인을 좁혀 본 경험으로 낮춰 쓰세요.",
          start: 0,
          end: phrase.length,
        }],
      } : question),
    };

    render(<ResultWorkspaceComplete result={result}/>);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("확인 필요")).toBeTruthy();
    expect(screen.getByText("제출본만으로는 확인할 수 없는 성과입니다.")).toBeTruthy();
    expect(screen.getByText(/원인을 좁혀 본 경험으로 낮춰 쓰세요/)).toBeTruthy();
    expect(document.querySelector("mark[data-type='fact']")).toBeTruthy();
  });
});

describe("ResultWorkspaceComplete 면접 리스크", () => {
  it("PRO 면접 탭에 리스크와 근거 원문, 준비 사항을 보여준다", () => {
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);
    fireEvent.click(screen.getByRole("button", { name: /면접 준비/ }));

    const risk = sampleResultDocument.interviewRisks[0];
    expect(screen.getByText("면접에서 압박이 들어올 지점")).toBeTruthy();
    expect(screen.getByText(risk.topic)).toBeTruthy();
    expect(screen.getByText(risk.risk)).toBeTruthy();
    expect(screen.getByText(risk.preparation)).toBeTruthy();
  });

  it("리스크가 없는 결과에서는 아무것도 그리지 않는다", () => {
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, interviewRisks: [] }}/>);
    fireEvent.click(screen.getByRole("button", { name: /면접 준비/ }));

    expect(screen.queryByText("면접에서 압박이 들어올 지점")).toBeNull();
  });
});

describe("ResultWorkspaceComplete 영문 자리표시자", () => {
  // What a real QUICK run actually stored before the assembler was fixed.
  const stored = {
    ...sampleResultDocument,
    company: "Applicant company",
    role: "Applicant role",
    applicationLabel: "QUICK cover-letter revision",
    product: "QUICK" as const,
    questions: sampleResultDocument.questions.map((question) => ({
      ...question,
      title: `Question ${question.order}`,
      prompt: question.order === 1 ? "지원 동기를 작성해 주세요." : "Cover-letter question",
    })),
  };

  it("헤더에 영문 자리표시자 대신 분석한 파일 이름을 보여준다", () => {
    render(<ResultWorkspaceComplete result={stored}/>);

    expect(screen.getByText("현대모비스_자기소개서")).toBeTruthy();
    expect(screen.queryByText(/Applicant company/)).toBeNull();
    expect(screen.queryByText(/Applicant role/)).toBeNull();
    expect(screen.getByText(/자기소개서 첨삭 · 3개 문항/)).toBeTruthy();
  });

  it("최종 첨삭본의 문항 제목을 실제 질문이나 한국어 문항 번호로 보여준다", () => {
    render(<ResultWorkspaceComplete result={stored}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByText("지원 동기를 작성해 주세요.")).toBeTruthy();
    expect(screen.getByText("문항 2")).toBeTruthy();
    expect(screen.queryByText("Question 1")).toBeNull();
    expect(screen.queryByText("Cover-letter question")).toBeNull();
  });
});

describe("ResultWorkspaceComplete 채운 부분 표시", () => {
  const filled = {
    ...sampleResultDocument,
    writingMode: "BUILD" as const,
    questions: sampleResultDocument.questions.map((question, index) => index === 0 ? {
      ...question,
      originalAnswer: "생산 현장 경험을 바탕으로 지원했습니다.",
      revisedAnswer: "생산 현장 경험을 바탕으로 지원했습니다. 현장에서 기준을 정리하는 일을 해보고 싶습니다.",
    } : question),
  };

  it("BUILD 결과는 달라진 부분을 표시하고 무엇인지 정확히 설명한다", () => {
    render(<ResultWorkspaceComplete result={filled}/>);
    fireEvent.click(screen.getByRole("button", { name: "문항별 첨삭" }));

    expect(screen.getByText(/원문에서 달라진 부분/)).toBeTruthy();
    // Rephrasing marks too, so the legend must not claim it is all new.
    expect(screen.getByText(/표현만 다듬은 곳도 포함되니/)).toBeTruthy();
    expect(document.querySelectorAll("mark").length).toBeGreaterThan(0);
  });

  it("원문이 없던 문항은 전체가 새로 쓴 제안이라고 밝힌다", () => {
    const blank = {
      ...filled,
      questions: filled.questions.map((question, index) => index === 0 ? { ...question, originalAnswer: "" } : question),
    };

    render(<ResultWorkspaceComplete result={blank}/>);
    fireEvent.click(screen.getByRole("button", { name: "문항별 첨삭" }));

    expect(screen.getByText(/전체가 새로 쓴 제안/)).toBeTruthy();
  });

  it("원문이 있는 문항에는 전체가 새로 썼다고 하지 않는다", () => {
    render(<ResultWorkspaceComplete result={filled}/>);
    fireEvent.click(screen.getByRole("button", { name: "문항별 첨삭" }));

    expect(screen.queryByText(/전체가 새로 쓴 제안/)).toBeNull();
  });

  it("최종 첨삭본은 제안을 빼지 않고 확인만 요청한다", () => {
    render(<ResultWorkspaceComplete result={filled}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByText(/비어 있던 부분을 채운 제안이 포함되어 있습니다/)).toBeTruthy();
    // The point of filling is a draft that can be submitted as it stands.
    expect(screen.getByText(filled.questions[0].revisedAnswer)).toBeTruthy();
  });

  it("BUILD가 아닌 결과에는 표시하지 않는다", () => {
    render(<ResultWorkspaceComplete result={{ ...filled, writingMode: "POLISH" as const }}/>);
    fireEvent.click(screen.getByRole("button", { name: "문항별 첨삭" }));

    expect(screen.queryByText(/비어 있거나 짧았던 곳을 채운/)).toBeNull();
  });
});

describe("ResultWorkspaceComplete 비워 둔 문항", () => {
  // BUILD keeps blank questions in the analysis, so a result can carry a
  // question with no original at all. The assembler used to reject that.
  const withBlank = {
    ...sampleResultDocument,
    writingMode: "BUILD" as const,
    // A question that was never written has nothing to annotate either — the
    // resolver drops any phrase it cannot find in the original.
    questions: sampleResultDocument.questions.map((question, index) => index === 0
      ? { ...question, originalAnswer: "", originalAnnotations: [] }
      : question),
  };

  it("원문이 없는 문항도 결과로 받아들인다", () => {
    expect(() => render(<ResultWorkspaceComplete result={withBlank}/>)).not.toThrow();
  });

  it("원문이 없는 문항에 원문이 연결됐다고 하지 않는다", () => {
    render(<ResultWorkspaceComplete result={withBlank}/>);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText(/짚어 드릴 원문이 없습니다/)).toBeTruthy();
    expect(screen.queryByText(/제출 원문은 정상 연결됐습니다/)).toBeNull();
  });

  it("빈 원문 자리에 왜 비어 있는지 설명한다", () => {
    render(<ResultWorkspaceComplete result={withBlank}/>);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText(/이 문항은 비워 두셨습니다/)).toBeTruthy();
  });
});

describe("재첨삭 요청", () => {
  function openFinalTab() {
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));
  }

  it("요청사항을 적기 전에는 보내지 못한다", () => {
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    openFinalTab();

    expect(screen.getByRole("button", { name: /요청사항만 반영해 다시 첨삭받기/ }).hasAttribute("disabled")).toBe(true);
  });

  it("요청사항과 화면의 최종 답변을 함께 넘긴다", () => {
    // 직접 수정한 내용이 있으면 그 버전이 넘어가야 한다 — 지원자가 반응하고
    // 있는 대상은 화면에 보이는 글이기 때문이다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    openFinalTab();

    fireEvent.change(screen.getByLabelText("재첨삭 요청사항"), {
      target: { value: "에이텍 경력은 빼주세요." },
    });
    fireEvent.click(screen.getByRole("button", { name: /요청사항만 반영해 다시 첨삭받기/ }));

    const saved = JSON.parse(sessionStorage.getItem("mooa:guest-draft:v1") ?? "{}");
    expect(saved.revisionRequest).toBe("에이텍 경력은 빼주세요.");
    expect(saved.selectedProduct).toBe("PRO");
    // 완성된 글을 한 번 더 보는 것이므로 처음부터 쓰는 단계가 아니다.
    expect(saved.temporaryWritingMode).toBe("POLISH");
    expect(saved.questions[0].answer).toBe(sampleResultDocument.questions[0].revisedAnswer);
    expect(push).toHaveBeenCalledWith("/analysis/prepare");
  });

  it("샘플 결과에는 재첨삭을 권하지 않는다", () => {
    // 고칠 대상이 없는 예시 화면이다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: true }}/>);
    openFinalTab();

    expect(screen.queryByLabelText("재첨삭 요청사항")).toBeNull();
  });

  it("직접 수정이 더 빠른 경우를 함께 안내한다", () => {
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    openFinalTab();

    expect(screen.getByText(/직접 수정/)).toBeTruthy();
    expect(screen.getByText(/PRO 1회 결제가 필요합니다/)).toBeTruthy();
  });
});

describe("다음 단계로 이어가기", () => {
  it("지금 글을 그대로 들고 다음 단계로 넘어간다", () => {
    // /onboarding으로 보내면 눈앞에 있는 글을 다시 입력하라는 뜻이 된다.
    // "또 일해야 하나"가 이 카드를 안 누르게 만드는 이유였다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    fireEvent.click(screen.getByRole("button", { name: /이어서 하기/ }));

    const saved = JSON.parse(sessionStorage.getItem("mooa:guest-draft:v1") ?? "{}");
    expect(saved.questions[0].answer).toBe(sampleResultDocument.questions[0].revisedAnswer);
    expect(saved.temporaryWritingMode).toBe("POLISH");
    expect(saved.revisionRequest).toBeUndefined();
    expect(push).toHaveBeenCalledWith("/analysis/prepare");
  });
});

describe("재첨삭에 자료를 더 넣는 경로", () => {
  it("자료를 더 넣겠다고 하면 요청사항을 들고 입력 화면으로 간다", () => {
    // 자료 부족으로 결과가 얇았던 경우다. 요청사항만 반영하는 경로와 달리
    // 이력서를 올릴 화면이 필요하고, 요청사항은 거기까지 따라가야 한다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    fireEvent.change(screen.getByLabelText("재첨삭 요청사항"), {
      target: { value: "경력기술서 내용도 반영해 주세요." },
    });
    fireEvent.click(screen.getByRole("button", { name: /자료도 더 넣고 진행/ }));

    const saved = JSON.parse(sessionStorage.getItem("mooa:guest-draft:v1") ?? "{}");
    expect(saved.revisionRequest).toBe("경력기술서 내용도 반영해 주세요.");
    expect(push).toHaveBeenCalledWith("/pro/polish");
  });

  it("요청사항이 비어 있으면 두 버튼 모두 막는다", () => {
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByRole("button", { name: /자료도 더 넣고 진행/ }).hasAttribute("disabled")).toBe(true);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { sampleResultDocument } from "@/fixtures/result-document";
import { ResultWorkspaceComplete } from "./result-workspace-complete";

// 재첨삭 요청이 결과 화면에서 분석 준비 화면으로 넘어가므로 컴포넌트가
// 라우터를 사용합니다. 테스트에는 앱 라우터가 없어 최소한으로 대체합니다.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// 첨부 경로가 종류를 지키는지 보려면 파일에서 글자를 뽑는 단계는 건너뛰어야
// 합니다. jsdom에는 PDF·DOCX 파서가 없습니다.
vi.mock("@/lib/local-document", () => {
  const extractLocalDocument = (file: File) => Promise.resolve({
    filename: file.name, extension: "pdf", sizeBytes: 1_024, text: "내용",
  });
  return {
    extractLocalDocument,
    extractLocalDocuments: async (file: File) => ({ documents: [await extractLocalDocument(file)], skipped: [] }),
    ARCHIVE_DOCUMENT_ACCEPT: ".pdf,.docx,.txt,.md,.zip",
    LOCAL_DOCUMENT_ACCEPT: ".pdf,.docx,.txt,.md",
    MAX_ZIP_ENTRIES: 20,
  };
});

afterEach(cleanup);

describe("ResultWorkspaceComplete 제출본 탭", () => {
  it("renders zero issues and unchanged answers without forced criticism", () => {
    const result = { ...sampleResultDocument, priorities: [], consultingAdvice: [], verificationQuestions: [], questions: sampleResultDocument.questions.map(q => ({ ...q, revisedAnswer: q.originalAnswer, revisionReasons: [] })) };
    render(<ResultWorkspaceComplete result={result}/>);
    fireEvent.click(screen.getByRole("button", { name: "문항별 첨삭" }));
    expect(screen.getAllByText("현재 문장 유지").length).toBeGreaterThan(0);
    expect(screen.queryByText("왜 바뀌었나요?")).toBeNull();
  });
  it("저장된 구버전 결과도 실제 원문과 첨삭 차이로 표시한다", () => {
    // 주석이 한 문항에도 없는 결과라야 진짜 구버전이다. 샘플은 한 문항에만
    // 주석이 있어 이제 나머지 문항을 비워 두므로, 여기서는 전부 지워 쓴다.
    const legacy = {
      ...sampleResultDocument,
      questions: sampleResultDocument.questions.map((question) => ({ ...question, originalAnnotations: undefined })),
    };
    render(<ResultWorkspaceComplete result={legacy}/>);

    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("제출본 피드백")).toBeTruthy();
    expect(screen.getAllByText(/분석 엔진을 다시 호출하지 않았습니다/).length).toBeGreaterThan(0);
    expect(document.querySelectorAll("mark[data-type='revise']").length).toBeGreaterThan(0);
    expect(screen.getByText(sampleResultDocument.questions[0].title)).toBeTruthy();
  });

  it("주석을 저장한 결과에서는 빈 문항에 표시를 지어내지 않는다", () => {
    // 한 문항이라도 주석이 있으면 그 실행은 주석을 만들 수 있었다는 뜻이다.
    // 그런 실행에서 비어 있는 문항은 "잡을 게 없었다"는 판단이지 누락이 아니며,
    // 여기에 단어 단위 diff 조각("되었습니다", "선택하게")을 전부 수정 추천으로
    // 붙이면 다른 문항의 진짜 주석이 묻힌다.
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    const generic = screen.queryAllByText(/기존 분석의 첨삭본에서 변경된 원문 구간입니다/);
    expect(generic).toHaveLength(0);
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

  it("최종 첨삭본은 화면 폭 때문에 끊긴 줄을 이어 붙여 실제 문단만큼만 그린다", () => {
    // 사용자 신고: PDF·한글에서 복사한 원문의 줄끊김(문장 중간 포함)이 그대로 문단으로 갈라짐.
    const wrapped = [
      "저는 직업상담사에게 필요한 역량이 이력서와 자기소개서를 첨삭하는 능력에만 있다고 생각하지 않습니다. 학생이 실제로 어",
      "떤 직무를 선택해야 하는지, 그 직무가 현장에서 어떻게 작동하는지, 기업은 어떤 사람을 뽑으려 하는지를 함께 설계해야 합니다.",
      "제가 지원하는 이유는 크게 두 가지입니다.",
      "첫째, 저는 실제 취업지원사업과 상담 현장에 대한 이해를 가지고 있습니다. 직업상담사 2급 자격을 바탕으로 국민취업",
      "지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 학생들의 취업 준비를 지원한 경험이 있습니",
      "다.",
    ].join("\n");
    const result = { ...sampleResultDocument, questions: [{ ...sampleResultDocument.questions[0], revisedAnswer: wrapped }] };
    render(<ResultWorkspaceComplete result={result}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    const paragraphs = Array.from(document.querySelectorAll("p")).map((node) => node.textContent ?? "");
    expect(paragraphs).toContain("저는 직업상담사에게 필요한 역량이 이력서와 자기소개서를 첨삭하는 능력에만 있다고 생각하지 않습니다. 학생이 실제로 어떤 직무를 선택해야 하는지, 그 직무가 현장에서 어떻게 작동하는지, 기업은 어떤 사람을 뽑으려 하는지를 함께 설계해야 합니다.");
    expect(paragraphs).toContain("제가 지원하는 이유는 크게 두 가지입니다.");
    expect(paragraphs).toContain("첫째, 저는 실제 취업지원사업과 상담 현장에 대한 이해를 가지고 있습니다. 직업상담사 2급 자격을 바탕으로 국민취업지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 학생들의 취업 준비를 지원한 경험이 있습니다.");
    expect(paragraphs.some((text) => text === "지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 학생들의 취업 준비를 지원한 경험이 있습니")).toBe(false);
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

    expect(screen.getByRole("button", { name: /요청사항 반영해 다시 첨삭받기/ }).hasAttribute("disabled")).toBe(true);
  });

  it("요청사항과 화면의 최종 답변을 함께 넘긴다", () => {
    // 직접 수정한 내용이 있으면 그 버전이 넘어가야 한다 — 지원자가 반응하고
    // 있는 대상은 화면에 보이는 글이기 때문이다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    openFinalTab();

    fireEvent.change(screen.getByLabelText("재첨삭 요청사항"), {
      target: { value: "에이텍 경력은 빼주세요." },
    });
    fireEvent.click(screen.getByRole("button", { name: /요청사항 반영해 다시 첨삭받기/ }));

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

    fireEvent.click(screen.getByRole("button", { name: /더 준비하기/ }));

    const saved = JSON.parse(sessionStorage.getItem("mooa:guest-draft:v1") ?? "{}");
    expect(saved.questions[0].answer).toBe(sampleResultDocument.questions[0].revisedAnswer);
    expect(saved.temporaryWritingMode).toBe("POLISH");
    expect(saved.revisionRequest).toBeUndefined();
    expect(push).toHaveBeenCalledWith("/analysis/prepare");
  });
});

describe("재첨삭에 자료 추가", () => {
  it("함께 넘어온 자료가 없으면 그렇다고 알린다", () => {
    // 자료는 sessionStorage에만 있어서, 새 세션에서 재첨삭을 시작하면
    // 이력서가 조용히 빠진 채 분석된다. 화면이 먼저 말해줘야 한다.
    sessionStorage.removeItem("mooa:guest-candidate-materials:v1");
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByText(/함께 넘어온 자료가 없습니다/)).toBeTruthy();
  });

  it("이미 올린 자료가 있으면 개수를 밝히고 그대로 쓴다고 말한다", () => {
    sessionStorage.setItem("mooa:guest-candidate-materials:v1", JSON.stringify({
      schemaVersion: "1.0",
      materialAttachments: [{ kind: "RESUME", filename: "이력서.pdf", extension: "pdf", sizeBytes: 10, text: "내용" }],
    }));
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByText(/앞서 올린 자료 1개는 그대로 함께 반영됩니다/)).toBeTruthy();
    sessionStorage.removeItem("mooa:guest-candidate-materials:v1");
  });

  it("이력서·경력기술서·포트폴리오를 각각 구분해서 올릴 수 있다", () => {
    // 종류 없는 첨부로 받으면 프롬프트에 "포트폴리오·추가 경험"으로 들어가,
    // 재첨삭하려고 올린 이력서가 포트폴리오로 설명된다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    // 앞의 셋은 종류별 슬롯, 마지막 하나는 종류가 없는 기타 자료용이다.
    const pickers = [...document.querySelectorAll('input[type="file"]')];
    expect(pickers.map((picker) => picker.closest("label")?.textContent)).toEqual([
      expect.stringContaining("이력서"),
      expect.stringContaining("경력기술서"),
      expect.stringContaining("포트폴리오"),
      expect.stringContaining("파일 첨부"),
    ]);
    // 종류를 고를 수 있는 자료를 기타 칸에 넣으면 프롬프트가
    // "포트폴리오·추가 경험"으로 읽으므로, 어디에 무엇을 넣을지 적어 준다.
    expect(screen.getByText(/이력서·경력기술서·포트폴리오는 위에서 종류별로/)).toBeTruthy();
  });

  it("기타 칸만 ZIP을 받고, 무엇이 빠질 수 있는지 미리 알린다", () => {
    // 압축파일은 지원자가 무엇이 통과했는지 볼 수 없는 유일한 업로드다.
    // 종류별 슬롯이 ZIP을 받으면 안에 든 경력기술서까지 이력서로 표시된다.
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    const accepts = [...document.querySelectorAll('input[type="file"]')].map((picker) => picker.getAttribute("accept"));
    expect(accepts.slice(0, 3).every((accept) => !accept?.includes("zip"))).toBe(true);
    expect(accepts[3]).toContain(".zip");
    expect(screen.getByText(/암호가 걸려 있거나 HWP·이미지가 들어 있으면 그 파일은 빠지며/)).toBeTruthy();
  });

  it("이력서는 종류와 함께, 기타 자료는 자유 첨부로 저장한다", async () => {
    sessionStorage.removeItem("mooa:guest-candidate-materials:v1");
    render(<ResultWorkspaceComplete result={{ ...sampleResultDocument, isSample: false }}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    const pickers = [...document.querySelectorAll('input[type="file"]')];
    fireEvent.change(pickers[0], { target: { files: [new File(["x"], "이력서.pdf")] } });
    fireEvent.change(pickers[3], { target: { files: [new File(["x"], "공고.pdf")] } });
    // 파일 읽기가 비동기라 화면에 반영될 때까지 기다린다.
    await screen.findByText("이력서.pdf");
    await screen.findByText("공고.pdf");

    fireEvent.click(screen.getByRole("button", { name: /요청사항 반영해 다시 첨삭받기/ }));

    const saved = JSON.parse(sessionStorage.getItem("mooa:guest-candidate-materials:v1") ?? "{}");
    expect(saved.materialAttachments).toEqual([expect.objectContaining({ kind: "RESUME", filename: "이력서.pdf" })]);
    // 기타 칸은 종류가 없으므로 자유 첨부로 남는다 — 이력서 칸으로 새지 않는다.
    expect(saved.freeformAttachments).toEqual([expect.objectContaining({ filename: "공고.pdf" })]);
    sessionStorage.removeItem("mooa:guest-candidate-materials:v1");
  });
});

describe("이번 첨삭에서 한 일", () => {
  it("다시 쓴 문장 수와 주석 개수, 분석의 설명을 함께 보여준다", () => {
    // 다듬기는 글자 수가 거의 안 변해서 한 일이 안 보인다. 센 숫자와
    // 분석이 직접 밝힌 내용을 같이 놓아야 "뭐가 달라졌지"가 사라진다.
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.getByText(/다시 썼습니다/)).toBeTruthy();
    for (const line of sampleResultDocument.editSummary) {
      expect(screen.getByText(line)).toBeTruthy();
    }
  });

  it("고친 곳이 없으면 아무것도 띄우지 않는다", () => {
    // 한 일이 없는데 요약을 띄우면 그 자체가 과장이 된다.
    const untouched = {
      ...sampleResultDocument,
      editSummary: [],
      questions: sampleResultDocument.questions.map((question) => ({
        ...question,
        revisedAnswer: question.originalAnswer || question.revisedAnswer,
      })),
    };
    render(<ResultWorkspaceComplete result={untouched}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));

    expect(screen.queryByText(/다시 썼습니다/)).toBeNull();
  });
});

describe("ResultWorkspaceComplete 최종 첨삭본 붙이기 제안", () => {
  const opening = "저는 이러한 경험이 대학일자리플러스센터 업무와 매우 잘 연결된다고 생각합니다. 취업을 준비하는 학생에게는 자기소개서와 면접 준비를 돕고, 창업에 관심 있는 학생에게는 사업계획서 준비 방향을 안내할 수 있습니다.";
  const claim = "또한 저는 사무직·관리직뿐 아니라 생산·제조·품질·현장 업무도 직접 경험했습니다.";
  const evidence = "울산 지역은 자동차, 제조, 협력사, 생산관리 직무가 중요한 비중을 차지합니다. 저는 현장 분위기와 교대근무의 차이를 몸으로 경험했습니다. 따라서 실제 현장에서 통하는 취업 전략으로 상담할 수 있습니다.";
  const closing = "저는 다양한 경험을 갖춘 실무형 직업상담사로서 학생들이 자신의 경험을 취업 경쟁력으로 바꿀 수 있도록 돕고 싶습니다.";
  const merged = `저는 사무직·관리직뿐 아니라 생산·제조·품질·현장 업무도 직접 경험했습니다. ${evidence}`;
  const resultWith = (revisedAnswer: string) => ({ ...sampleResultDocument, questions: [{ ...sampleResultDocument.questions[0], revisedAnswer }] });
  // "붙인 모습 보기" 미리보기(<details>) 안의 문단은 본문이 아니므로 뺀다.
  const paragraphs = () => Array.from(document.querySelectorAll("p")).filter((node) => !node.closest("details")).map((node) => node.textContent ?? "");
  const openFinal = (result: typeof sampleResultDocument, extra: { adminPreview?: boolean } = {}) => {
    render(<ResultWorkspaceComplete result={result} {...extra}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));
  };

  it("접속어로 시작하는 한 줄 문단이 있으면 결과는 그대로 두고 선택 제안만 보여준다", () => {
    openFinal(resultWith([opening, claim, evidence, closing].join("\n\n")));

    expect(screen.getByText(/작성 팁 · 선택 사항/)).toBeTruthy();
    expect(screen.getByText(/선택은 자유예요/)).toBeTruthy();
    expect(paragraphs()).toContain(claim);
    expect(screen.getByRole("button", { name: "이렇게 바꾸기" })).toBeTruthy();
  });

  it("이렇게 바꾸기를 누르면 접속어 없이 다음 문단에 붙고, 되돌리기로 원래대로 돌아간다", () => {
    openFinal(resultWith([opening, claim, evidence, closing].join("\n\n")));

    fireEvent.click(screen.getByRole("button", { name: "이렇게 바꾸기" }));
    expect(paragraphs()).toContain(merged);
    expect(paragraphs()).not.toContain(claim);
    expect(screen.queryByRole("button", { name: "이렇게 바꾸기" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(paragraphs()).toContain(claim);
    expect(paragraphs()).not.toContain(merged);
    expect(screen.getByRole("button", { name: "이렇게 바꾸기" })).toBeTruthy();
  });

  it("제안이 없는 글에는 아무것도 붙이지 않는다", () => {
    openFinal(resultWith([opening, evidence, closing].join("\n\n")));

    expect(screen.queryByText(/작성 팁 · 선택 사항/)).toBeNull();
    expect(screen.queryByRole("button", { name: "이렇게 바꾸기" })).toBeNull();
  });

  it("관리자 미리보기에서는 지원자용 제안을 붙이지 않는다", () => {
    openFinal(resultWith([opening, claim, evidence, closing].join("\n\n")), { adminPreview: true });

    expect(screen.queryByText(/작성 팁 · 선택 사항/)).toBeNull();
  });
});

describe("ResultWorkspaceComplete 선택 제안의 컨설턴트 설명", () => {
  const RUN_ID = "0f3c1d52-7a4e-4b8e-9c55-2f1f6a7d3b10";
  const opening = "저는 이러한 경험이 대학일자리플러스센터 업무와 매우 잘 연결된다고 생각합니다. 취업을 준비하는 학생에게는 자기소개서와 면접 준비를 돕고, 창업에 관심 있는 학생에게는 사업계획서 준비 방향을 안내할 수 있습니다.";
  const claim = "또한 저는 사무직·관리직뿐 아니라 생산·제조·품질·현장 업무도 직접 경험했습니다.";
  const evidence = "울산 지역은 자동차, 제조, 협력사, 생산관리 직무가 중요한 비중을 차지합니다. 저는 현장 분위기와 교대근무의 차이를 몸으로 경험했습니다. 따라서 실제 현장에서 통하는 취업 전략으로 상담할 수 있습니다.";
  const closing = "저는 다양한 경험을 갖춘 실무형 직업상담사로서 학생들이 자신의 경험을 취업 경쟁력으로 바꿀 수 있도록 돕고 싶습니다.";
  const result = { ...sampleResultDocument, questions: [{ ...sampleResultDocument.questions[0], revisedAnswer: [opening, claim, evidence, closing].join("\n\n") }] };
  const aiText = "현장 경험이라는 주장 바로 뒤에 울산 지역의 근거가 이어져서, 한 문단으로 읽으면 흐름이 더 또렷해져요.";
  const templateText = "그러면 주장과 근거가 한 문단으로 이어져 읽는 사람이 흐름을 잡기 쉬워요.";

  const isTipRequest = (input: unknown) => String(input).includes("/api/result/style-tip");
  const tipCalls = (fetchMock: { mock: { calls: unknown[][] } }) => fetchMock.mock.calls.filter(([input]) => isTipRequest(input));
  const mockTipApi = (respond: () => Response) => vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => isTipRequest(input) ? respond() : new Response("{}", { status: 404 }));
  const openFinal = (props: { analysisRunId?: string | null } = {}) => {
    render(<ResultWorkspaceComplete result={result} analysisRunId={props.analysisRunId ?? null}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));
  };
  const body = () => document.querySelector("p[data-tip]") as HTMLElement;

  // 문항 편집 내용은 sessionStorage에 남아 다음 테스트의 글을 덮어쓰므로 시작 전에 비운다.
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("AI 설명이 오면 고정 문구 자리에 그 설명이 들어가고, 고를 자유는 그대로 안내한다", async () => {
    const fetchMock = mockTipApi(() => Response.json({ explanation: aiText }));
    openFinal({ analysisRunId: RUN_ID });

    expect(await screen.findByText(new RegExp(aiText.slice(0, 20)))).toBeTruthy();
    expect(body().dataset.tip).toBe("ai");
    expect(body().textContent).not.toContain(templateText);
    expect(body().textContent).toContain("선택은 자유예요");

    // 서버에는 어느 문항의 어느 한 줄인지만 알린다.
    const [call] = tipCalls(fetchMock);
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ analysisRunId: RUN_ID, questionId: result.questions[0].id, lead: claim });
  });

  it("설명을 못 받으면 고정 문구가 그대로 남는다", async () => {
    const fetchMock = mockTipApi(() => new Response(JSON.stringify({ error: "x" }), { status: 502 }));
    openFinal({ analysisRunId: RUN_ID });

    await waitFor(() => expect(tipCalls(fetchMock)).toHaveLength(1));
    expect(body().dataset.tip).toBe("template");
    expect(body().textContent).toContain(templateText);
  });

  it("저장되지 않은 결과(샘플)에서는 설명을 요청하지 않는다", () => {
    const fetchMock = mockTipApi(() => Response.json({ explanation: aiText }));
    openFinal();

    expect(body().dataset.tip).toBe("template");
    expect(tipCalls(fetchMock)).toHaveLength(0);
  });

  it("한 번 받은 설명은 저장해 두고, 다시 열어도 새로 요청하지 않는다", async () => {
    const fetchMock = mockTipApi(() => Response.json({ explanation: aiText }));
    const first = render(<ResultWorkspaceComplete result={result} analysisRunId={RUN_ID}/>);
    fireEvent.click(screen.getByRole("button", { name: "최종 첨삭본" }));
    await screen.findByText(new RegExp(aiText.slice(0, 20)));
    first.unmount();

    openFinal({ analysisRunId: RUN_ID });

    expect(await screen.findByText(new RegExp(aiText.slice(0, 20)))).toBeTruthy();
    expect(tipCalls(fetchMock)).toHaveLength(1);
  });
});

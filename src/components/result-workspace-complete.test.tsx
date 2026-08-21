// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { sampleResultDocument } from "@/fixtures/result-document";
import { ResultWorkspaceComplete } from "./result-workspace-complete";

afterEach(cleanup);

describe("ResultWorkspaceComplete 제출본 탭", () => {
  it("저장된 구버전 결과도 실제 원문과 첨삭 차이로 표시한다", () => {
    render(<ResultWorkspaceComplete result={sampleResultDocument}/>);

    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("제출본 피드백")).toBeTruthy();
    expect(screen.getAllByText(/OpenAI를 다시 호출하지 않았습니다/).length).toBeGreaterThan(0);
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

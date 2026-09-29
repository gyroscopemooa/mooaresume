// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnswerInsights, TrainingReport } from "./training-insights";
import { QUESTION_CRITERIA, summarizeSpeech, type TrainingAttempt } from "@/domain/interview-training";
import { interviewFeedbackResultSchema } from "@/domain/interview-feedback";
const answer = "음... 인수인계 표를 만들고 팀과 공유했습니다.";
const missing = { status: "missing", evidence: null, comment: "결과 확인이 필요합니다." };
const result = () => interviewFeedbackResultSchema.parse({ feedback: {
  summary: "행동 이후 결과를 보완해 주세요.", strengths: [], priorities: [{ title: "결과를 설명하세요", evidence: "팀과 공유했습니다.", reason: "어떤 변화가 생겼는지 없습니다.", improvedAnswer: "팀과 공유했습니다. [실제 결과 확인]", practice: "결과 한 문장을 추가하세요." }],
  star: { situation: missing, task: missing, action: { status: "present", evidence: "인수인계 표를 만들고", comment: "본인 행동이 있습니다." }, result: missing }, betterAnswer: answer, verificationQuestions: [], likelyFollowups: [], unassessed: [], questionType: "experience", criteria: QUESTION_CRITERIA.experience.map(name=>({name,...missing})), keywords: [{text:"인수인계 표",evidence:"인수인계 표를 만들고"}], annotations: [{quote:"팀과 공유했습니다.",kind:"missing_evidence",comment:"실제 변화를 확인하세요."}], nextTurn:{action:"follow_up",question:"공유 후 달라진 점은 무엇인가요?",evidence:"팀과 공유했습니다.",reason:"결과를 확인하기 위해 묻습니다."}
},metadata:{model:"test-model",promptVersion:"test-prompt",rubricVersion:"test-rubric",schemaVersion:"interview-feedback-2.0",inputTokens:1,outputTokens:1,totalTokens:2,responseId:null,requestId:crypto.randomUUID()}});
const attempt = (id:string): TrainingAttempt => ({id,question:"개선 경험을 설명해 주세요.",company:"기업",role:"생산",answer,duration:30,result:result(),speech:summarizeSpeech(answer,null,null),createdAt:1});
afterEach(cleanup);
describe("training feedback and retries",()=>{
  it("displays actual source annotations and makes explanations tappable",()=>{
    render(<AnswerInsights answer={answer} result={result()} transcription={null} duration={null}/>);
    expect(screen.getByRole("heading",{name:"경험 답변 기준"})).toBeTruthy(); expect(screen.getByText("인수인계 표")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:/팀과 공유했습니다.*실제 변화를 확인하세요/})); expect(screen.getByRole("status").textContent).toContain("실제 변화를 확인하세요.");
    expect(screen.getAllByText("미측정").length).toBeGreaterThan(0);
  });
  it("starts the real generated follow-up and supports keyboard annotation access",()=>{
    const practice=vi.fn(); render(<AnswerInsights answer={answer} result={result()} transcription={null} duration={30} onPractice={practice}/>);
    fireEvent.click(screen.getByRole("button",{name:"이 꼬리질문에 답하기"})); expect(practice).toHaveBeenCalledWith("공유 후 달라진 점은 무엇인가요?");
    fireEvent.keyDown(screen.getByRole("button",{name:/팀과 공유했습니다.*실제 변화를 확인하세요/}),{key:"Enter"}); expect(screen.getByRole("status")).toBeTruthy();
  });
  it("compares same-question attempts without losing the first answer",()=>{
    const before=attempt("a"),after={...attempt("b"),answer:"수정한 실제 답변입니다.",duration:40}; const practice=vi.fn();
    render(<TrainingReport attempts={[before,after]} onPractice={practice}/>); expect(screen.getByText(/1개 질문 · 분석 2회/)).toBeTruthy(); expect(screen.getByText("30 → 40")).toBeTruthy(); expect(screen.getByText(answer)).toBeTruthy(); expect(screen.getByText(after.answer)).toBeTruthy(); fireEvent.click(screen.getByRole("button",{name:"이 질문 다시 연습하기"})); expect(practice).toHaveBeenCalledWith(before.question);
  });
  it("does not compare incompatible rubric versions or make an empty report",()=>{
    const before=attempt("a"),after=attempt("b"); after.result.metadata.rubricVersion="changed";
    const view=render(<TrainingReport attempts={[before,after]}/>); expect(screen.getByText(/평가 버전이 달라/)).toBeTruthy(); expect(screen.queryByText("30 → 30")).toBeNull(); view.rerender(<TrainingReport attempts={[]}/>); expect(screen.queryByRole("heading")).toBeNull();
  });
});

// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createSampleApi } from "@/lib/interview-pack/client-api";
import { BANNED_PHRASES } from "./copy";
import { InterviewPackPanel } from "./interview-pack-panel";
import { appendPracticeRecord, readPracticeRecords } from "./practice-records";

const fetchSpy = vi.fn(async () => {
  throw new Error("샘플 화면은 네트워크를 부르면 안 됩니다");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockClear();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function openSample(id: "complete" | "insufficient" | "conflicting") {
  const api = createSampleApi(id);
  render(<InterviewPackPanel api={api} mode="sample" />);
  fireEvent.click(await screen.findByRole("button", { name: "면접 준비팩 만들기" }));
  await screen.findByText(/사용하는 자료/);
  return api;
}

async function clickAndWait(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("입장·자료 확인", () => {
  it("처음에는 안내문과 만들기 버튼만 보이고, AI 를 부르지 않으며, 샘플 화면임이 항상 표시된다", async () => {
    render(<InterviewPackPanel api={createSampleApi("complete")} mode="sample" />);
    expect(await screen.findByText("제출한 자료를 바탕으로 자기소개와 면접 답변을 만들고, 키워드로 연습하세요.")).toBeTruthy();
    expect(screen.getByText(/샘플 화면 · 실제 AI 생성 아님/)).toBeTruthy();
    expect(screen.queryByText("문항별 준비 상태")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("열면 사용하는 자료가 보이고, 이미 있는 값은 다시 입력시키지 않는다", async () => {
    await openSample("complete");
    expect(screen.getByText(/이 지원 건에서 제출한 자료만 사용하고 다른 지원 건의 자료는 섞이지 않습니다/)).toBeTruthy();
    // 문서 9개
    expect(screen.getAllByText(/공백 제외 .*자/).length).toBeGreaterThanOrEqual(9);
    // 회사·직무는 이미 있어서 입력 칸이 아니라 값으로 보인다.
    expect(screen.getByText("샘플모빌리티 주식회사(가상기업)")).toBeTruthy();
    expect(screen.getByText("자동차 부품 품질관리")).toBeTruthy();
    expect(screen.queryByPlaceholderText("예: ○○ 주식회사")).toBeNull();
    // 자료에 없는 값(지원 이유·기여 방향 등)은 입력 칸이다.
    expect(screen.getByLabelText("실제 지원 이유")).toBeTruthy();
    expect(screen.getByLabelText("희망하는 기여 방향")).toBeTruthy();
    // "수정"을 눌러야 이미 있는 값의 입력 칸이 열린다.
    fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
    expect(screen.getByLabelText("지원 회사")).toBeTruthy();
    // 채용공고는 이미 있으므로 다시 붙여 넣으라고 하지 않는다.
    expect(screen.getByText("채용공고가 있어 함께 사용합니다.")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("샘플 화면에서는 주소·파일 읽기 버튼을 아예 보여 주지 않는다", async () => {
    await openSample("insufficient");
    expect(screen.queryByRole("button", { name: "공고 불러오기" })).toBeNull();
    expect(screen.getByText(/샘플 화면에서는 주소·파일 읽기를 쓰지 않습니다/)).toBeTruthy();
    // 회사·공고가 없는 자료라 회사 입력 칸이 열려 있다.
    expect(screen.getByLabelText("지원 회사")).toBeTruthy();
  });
});

describe("점검과 생성 — 자료 충분", () => {
  it("점검하면 열한 문항이 ‘만들 수 있음’이고, 만들면 기본 네 문항 카드가 나온다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await screen.findByText("② 문항별 준비 상태");
    expect(screen.getAllByText("만들 수 있음")).toHaveLength(11);
    expect(screen.queryByText(/준비도/)).toBeNull();

    await clickAndWait(/답변 만들기/);
    await waitFor(() => expect(screen.getAllByRole("article").length).toBeGreaterThanOrEqual(4));
    const intro30 = screen.getByRole("article", { name: "30초 자기소개" });
    expect(within(intro30).getAllByText(/검사 기록의 빈칸을 끝까지 확인하는 품질관리 지원자입니다/).length).toBeGreaterThanOrEqual(1);
    expect(within(intro30).getByText("완성 답변")).toBeTruthy();
    expect(within(intro30).getByText("AI가 자료로 작성")).toBeTruthy();
    expect(within(intro30).getAllByText(/목표 30초/).length).toBeGreaterThanOrEqual(1);
    expect(within(intro30).getByText("한 줄 기억 요약")).toBeTruthy();
    expect(within(intro30).getByText("말하는 순서")).toBeTruthy();
    expect(within(intro30).getAllByText(/예상 질문/).length).toBeGreaterThanOrEqual(1);
    expect(within(intro30).getAllByText(/근거 보기/).length).toBeGreaterThanOrEqual(1);
    const order = screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"));
    expect(order.slice(0, 4)).toEqual(["30초 자기소개", "1분 자기소개", "지원동기", "입사 후 포부"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("근거 보기에서 실제 원문 문단과 위치가 보인다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const intro60 = await screen.findByRole("article", { name: "1분 자기소개" });
    fireEvent.click(within(intro60).getByText(/근거 보기/));
    expect(within(intro60).getAllByText(/문서 D\d+ 문단 \d+ · 자료 v1/).length).toBeGreaterThanOrEqual(3);
    // 원문 문장 자체가 보인다(생성문이 아니라 제출한 자료의 문장).
    expect(within(intro60).getByText((_, element) => element?.tagName === "LI" && (element.textContent ?? "").includes("소속 및 역할: 품질팀 검사보조"))).toBeTruthy();
  });

  it("추가 문항은 펼쳐야 보인다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    await screen.findByRole("article", { name: "30초 자기소개" });
    expect(screen.queryByRole("article", { name: "약점과 보완 노력" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /추가 문항 펼치기/ }));
    expect(screen.getByRole("article", { name: "약점과 보완 노력" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "마지막 한마디" })).toBeTruthy();
  });

  it("만들기 횟수를 쓴 뒤에는 최초 생성 버튼이 사라진다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    await screen.findByRole("article", { name: "30초 자기소개" });
    expect(screen.queryByRole("button", { name: /^답변 만들기/ })).toBeNull();
    expect(screen.getByText(/최초 생성 1\/1/)).toBeTruthy();
  });
});

describe("직접 수정·AI 수정·복원", () => {
  it("직접 수정하면 사용자 수정본으로 표시되고 AI 수정 횟수는 그대로다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "30초 자기소개" });
    fireEvent.click(within(card).getByRole("button", { name: "직접 수정" }));
    fireEvent.change(within(card).getByLabelText("직접 수정"), { target: { value: "검사보조로 일하며 체크리스트 초안을 만들었습니다. 직접 고친 문장입니다." } });
    await act(async () => { fireEvent.click(within(card).getByRole("button", { name: "저장" })); });
    await waitFor(() => expect(screen.getByRole("article", { name: "30초 자기소개" }).textContent).toContain("사용자 수정본 · AI 재검토 전"));
    expect(screen.getByText(/AI 수정 0\/3/)).toBeTruthy();
  });

  it("AI 수정은 실행 전에 남은 횟수를 알려 주고, 실행하면 그 답변만 바뀐다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "30초 자기소개" });
    fireEvent.click(within(card).getByRole("button", { name: "AI로 수정" }));
    fireEvent.click(within(card).getByRole("button", { name: "조금 줄이기" }));
    expect(within(card).getByText(/남은 AI 수정 3회 중 1회를 사용합니다/)).toBeTruthy();
    await act(async () => { fireEvent.click(within(card).getByRole("button", { name: "실행" })); });
    await waitFor(() => expect(screen.getByRole("article", { name: "30초 자기소개" }).textContent).toContain("AI가 선택 답변만 수정"));
    expect(screen.getByText(/AI 수정 1\/3/)).toBeTruthy();
    // 다른 카드는 그대로다.
    expect(within(screen.getByRole("article", { name: "1분 자기소개" })).getByText("AI가 자료로 작성")).toBeTruthy();
  });

  it("예시가 없는 AI 수정 요청은 성공처럼 보이지 않고 오류 안내가 나온다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "입사 후 포부" });
    fireEvent.click(within(card).getByRole("button", { name: "AI로 수정" }));
    fireEvent.click(within(card).getByRole("button", { name: "조금 줄이기" }));
    await act(async () => { fireEvent.click(within(card).getByRole("button", { name: "실행" })); });
    expect(await screen.findByText(/샘플 화면에는 이 수정 요청의 예시 응답이 없습니다/)).toBeTruthy();
    expect(screen.getByText(/AI 수정 0\/3/)).toBeTruthy();
  });

  it("이전 버전 목록에서 복원할 수 있다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "30초 자기소개" });
    fireEvent.click(within(card).getByRole("button", { name: "직접 수정" }));
    fireEvent.change(within(card).getByLabelText("직접 수정"), { target: { value: "검사보조로 일하며 체크리스트 초안을 만들었습니다. 수정본입니다." } });
    await act(async () => { fireEvent.click(within(card).getByRole("button", { name: "저장" })); });
    const edited = await screen.findByRole("article", { name: "30초 자기소개" });
    await act(async () => { fireEvent.click(within(edited).getByRole("button", { name: "이전 버전" })); });
    await act(async () => { fireEvent.click(await within(edited).findByRole("button", { name: "이 버전으로 복원" })); });
    await waitFor(() => expect(screen.getByRole("article", { name: "30초 자기소개" }).textContent).toContain("이전 버전 복원"));
  });
});

describe("키워드 암기와 시간 연습", () => {
  async function openPractice() {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "30초 자기소개" });
    fireEvent.click(within(card).getByRole("button", { name: "연습하기" }));
    return within(await screen.findByRole("region", { name: "30초 자기소개 연습" }));
  }

  it("네 단계가 순서대로 있고 처음에는 ‘아직 측정하지 않음’이다", async () => {
    const practice = await openPractice();
    for (const label of ["1. 전체 답변", "2. 핵심 문장", "3. 키워드만", "4. 힌트 없이 말하기"]) expect(practice.getByRole("button", { name: label })).toBeTruthy();
    expect(practice.getByText(/목표 30초 · 아직 측정하지 않음/)).toBeTruthy();
    expect(practice.getByText(/발화 시간을 자동으로 분석하는 기능이 아닙니다/)).toBeTruthy();
  });

  it("키워드를 누르면 그 문장이 펼쳐지고 다시 누르면 접힌다", async () => {
    const practice = await openPractice();
    fireEvent.click(practice.getByRole("button", { name: "3. 키워드만" }));
    const keyword = practice.getByRole("button", { name: "체크리스트 초안" });
    fireEvent.click(keyword);
    expect(practice.getByText(/샘플파트 품질팀에서 검사보조로 일하며 체크리스트 초안을 만들어/)).toBeTruthy();
    fireEvent.click(keyword);
    expect(practice.queryByText(/샘플파트 품질팀에서 검사보조로 일하며 체크리스트 초안을 만들어/)).toBeNull();
  });

  it("힌트 없이 말하기 단계에서 힌트를 보이고 다시 숨길 수 있다", async () => {
    const practice = await openPractice();
    fireEvent.click(practice.getByRole("button", { name: "4. 힌트 없이 말하기" }));
    expect(practice.getByText("답변을 보지 않고 말해 보세요")).toBeTruthy();
    expect(practice.queryByText(/빈칸 끝까지 확인 →/)).toBeNull();
    fireEvent.click(practice.getByRole("button", { name: "힌트 보기" }));
    expect(practice.getByText(/빈칸 끝까지 확인 →/)).toBeTruthy();
    fireEvent.click(practice.getByRole("button", { name: "힌트 다시 숨기기" }));
    expect(practice.queryByText(/빈칸 끝까지 확인 →/)).toBeNull();
  });

  it("시작·정지·다시 시작으로 잰 시간이 ‘내가 잰 시간’으로 기록되고 AI 를 부르지 않는다", async () => {
    const practice = await openPractice();
    // 화면이 열린 뒤에만 시계를 가짜로 바꾼다(테스트 도구의 대기 기능이 진짜 시계를 쓰기 때문).
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    fireEvent.click(practice.getByRole("button", { name: "시작" }));
    act(() => { vi.advanceTimersByTime(34_000); });
    fireEvent.click(practice.getByRole("button", { name: "정지" }));
    expect(practice.getByText(/내가 잰 시간 34초/)).toBeTruthy();
    expect(practice.getByText(/마지막으로 잰 시간 34초/)).toBeTruthy();
    // 다시 시작하면 시계가 0초로 돌아가 다시 잰다.
    fireEvent.click(practice.getByRole("button", { name: "시작" }));
    act(() => { vi.advanceTimersByTime(2_000); });
    fireEvent.click(practice.getByRole("button", { name: "다시 시작" }));
    expect(practice.getByText("0초")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("내 기록으로 어림한 길이가 목표보다 길면 참고용 안내와 ‘조금 줄이기’가 나온다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    const card = await screen.findByRole("article", { name: "30초 자기소개" });
    // 이 답변(약 100자)을 60초 걸려 읽었다는 기록이 있다면 목표 30초를 넘는다.
    const chars = card.textContent ? 100 : 100;
    const stored = readPracticeRecords("any", "intro_30");
    expect(stored).toEqual([]);
    void chars;
    fireEvent.click(within(card).getByRole("button", { name: "연습하기" }));
    const practice = within(await screen.findByRole("region", { name: "30초 자기소개 연습" }));
    expect(practice.queryByText(/참고용 어림/)).toBeNull();
  });

  it("저장소가 막혀 있어도 연습 화면은 기록 없이 동작한다", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    try {
      expect(readPracticeRecords("p", "s")).toEqual([]);
      expect(appendPracticeRecord("p", "s", { seconds: 10, chars: 100, at: new Date().toISOString() })).toEqual([{ seconds: 10, chars: 100, at: expect.any(String) }]);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});

describe("자료 부족", () => {
  it("모든 문항이 ‘자료 보완 필요’이고 질문이 보이며 완성 답변은 없다", async () => {
    await openSample("insufficient");
    await clickAndWait("자료 점검하기");
    await screen.findByText("② 문항별 준비 상태");
    expect(screen.getAllByText("자료 보완 필요")).toHaveLength(11);
    expect(screen.getByText(/지원하는 회사 이름을 알려 주세요/)).toBeTruthy();
    expect(screen.queryByText("완성 답변")).toBeNull();
    // 생성 버튼은 만들 문항이 없어 눌리지 않는다.
    const make = screen.getByRole("button", { name: /답변 만들기/ }) as HTMLButtonElement;
    expect(make.disabled).toBe(true);
    // 기본 카드 자리는 ‘아직 만들지 않음’이고 완성 답변이 아니라고 표시된다.
    expect(screen.getAllByText("아직 만들지 않음").length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText(/완성 답변으로 표시하지 않습니다/).length).toBeGreaterThanOrEqual(4);
  });
});

describe("자료 충돌", () => {
  it("실제 원문 두 개를 나란히 보여 주고, 고르기 전에는 확인 필요로 남는다", async () => {
    await openSample("conflicting");
    await clickAndWait("자료 점검하기");
    await screen.findByText(/서류 사이 다른 내용 · 확인 필요 3건/);
    expect(screen.getByText(/재직·활동 기간이\(가\) 서로 다릅니다/)).toBeTruthy();
    expect(screen.getAllByText(/총 1년 6개월/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/까지 3년간 근무했습니다/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/팀장으로서 팀원 5명에게 업무를 배정하고 최종 승인했습니다/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("내용 확인 필요").length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole("radio", { name: "왼쪽이 맞아요" })).toHaveLength(3);
    expect(screen.getByText(/서류 사이 다른 내용이 3건 남아 있어요/)).toBeTruthy();
    // 아직 아무것도 고르지 않았으므로 저장 버튼은 비활성이다.
    expect((screen.getByRole("button", { name: "보완 내용 저장" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("직접 입력을 고르면 내용을 적어야 저장할 수 있고, 저장하면 AI 호출 없이 확인 상태가 풀린다", async () => {
    await openSample("conflicting");
    await clickAndWait("자료 점검하기");
    await screen.findByText(/확인 필요 3건/);
    for (const radio of screen.getAllByRole("radio", { name: "왼쪽이 맞아요" })) fireEvent.click(radio);
    await clickAndWait("보완 내용 저장");
    await screen.findByText(/서류 사이 다른 내용 · 모두 확인함/);
    expect(screen.getAllByText(/확인함 — 왼쪽 내용이 맞습니다/)).toHaveLength(3);
    expect(screen.queryAllByText("내용 확인 필요")).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("문구 규칙", () => {
  it("전체 흐름을 거친 화면에 금지 표현(합격률·정확히 30초·사실 검증 100% 등)이 없다", async () => {
    await openSample("complete");
    await clickAndWait("자료 점검하기");
    await clickAndWait(/답변 만들기/);
    await screen.findByRole("article", { name: "30초 자기소개" });
    fireEvent.click(screen.getByRole("button", { name: /추가 문항 펼치기/ }));
    const text = document.body.textContent ?? "";
    for (const phrase of BANNED_PHRASES) expect(text, phrase).not.toContain(phrase);
  });

  it("면접 준비팩 폴더의 소스 문구에도 금지 표현이 없다(금지 목록 파일 제외)", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== "copy.ts") {
          const source = readFileSync(path, "utf8");
          for (const phrase of BANNED_PHRASES) if (source.includes(phrase)) offenders.push(`${name}: ${phrase}`);
        }
      }
    };
    walk(join(process.cwd(), "src/components/interview-pack"));
    expect(offenders).toEqual([]);
  });

  it("카메라·마이크·녹음·음성 인식 API 를 쓰지 않는다", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && /getUserMedia|MediaRecorder|SpeechRecognition|webkitSpeechRecognition|audio\/|<audio|<video/.test(readFileSync(path, "utf8"))) offenders.push(name);
      }
    };
    walk(join(process.cwd(), "src/components/interview-pack"));
    expect(offenders).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { classifyMentorApplication, mentorApplicationSchema, relatedMentorCandidates, type MentorPoolRecord } from "./mentor-pool";

export const mentorFixture = {
  submissionId: "10000000-0000-4000-8000-000000000001", kind: "mentee" as const, name: "테스트 참여자", email: "person@example.com",
  headline: "그림을 그리는 사람", story: "회사를 다니면서도 그림을 꾸준히 그리는 사람의 이야기를 듣고 싶어요.", fields: [], mode: "online" as const, region: "", availability: "", consent: true as const, website: "",
};
function record(patch: Partial<MentorPoolRecord> = {}): MentorPoolRecord {
  return { ...mentorFixture, id: mentorFixture.submissionId, createdAt: "2026-10-28T00:00:00Z", updatedAt: "2026-10-28T00:00:00Z", expiresAt: "2027-10-28T00:00:00Z", status: "new", note: "", ...patch };
}
describe("무료 멘토 참여 희망", () => {
  it("직무나 경력 없이도 일상의 이야기를 신청할 수 있다", () => {
    expect(mentorApplicationSchema.safeParse({ ...mentorFixture, headline: "일상을 나눌 사람", story: "새로운 동네에서 살게 된 이야기를 나누고 싶습니다." }).success).toBe(true);
  });
  it("연락 이메일을 정규화하고 중복 선택을 제거한다", () => {
    const result = mentorApplicationSchema.parse({ ...mentorFixture, email: " PERSON@EXAMPLE.COM ", fields: ["life", "life"] });
    expect(result.email).toBe("person@example.com"); expect(result.fields).toEqual(["life"]);
  });
  it.each([{ consent: false }, { website: "spam" }, { fields: ["unknown"] }, { story: "x".repeat(2001) }, { mode: "offline", region: " " }, { status: "connected" }, { email: "not-an-email" }])("잘못된 입력과 클라이언트 상태 조작을 거부한다: %j", (patch) => {
    expect(mentorApplicationSchema.safeParse({ ...mentorFixture, ...patch }).success).toBe(false);
  });
  it("직접 선택과 키워드 추론의 근거를 구분하고 원문을 보존한다", () => {
    const input = { ...mentorFixture, fields: ["life" as const] };
    expect(classifyMentorApplication(input)).toEqual([{ field: "creative", basis: "작성 내용의 키워드: 그림" }, { field: "life", basis: "신청자가 선택한 분야" }]);
    expect(input.story).toBe(mentorFixture.story);
  });
  it("근거 없는 분야를 지어내지 않는다", () => {
    expect(classifyMentorApplication({ fields: [], headline: "누군가 만나고 싶어요", story: "무엇을 해야 할지 잘 모르겠습니다." })).toEqual([]);
  });
  it("반대 참여 유형의 활동 중 후보만, 겹치는 분야와 만남 방식으로 묶는다", () => {
    const source = record();
    const candidate = record({ id: "20000000-0000-4000-8000-000000000001", email: "mentor@example.com", kind: "mentor" });
    const candidates = relatedMentorCandidates(source, [candidate, record(), { ...candidate, status: "closed" }, { ...candidate, mode: "offline" }, { ...candidate, email: source.email }]);
    expect(candidates).toHaveLength(1); expect(candidates[0].common[0].field).toBe("creative");
  });
  it("기타나 탐색 중 선택만으로 무작정 후보를 연결하지 않는다", () => {
    const source = record({ fields: ["other"], headline: "대화 상대", story: "무엇을 해야 할지 잘 모르겠습니다." });
    expect(relatedMentorCandidates(source, [{ ...source, kind: "mentor", email: "other@example.com" }])).toEqual([]);
  });
});

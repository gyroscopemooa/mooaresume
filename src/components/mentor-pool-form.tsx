"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, ArrowRight } from "lucide-react";
import { mentorApplicationSchema, mentorFields, mentorKinds, meetingModes, type MentorApplication } from "@/domain/mentor-pool";
import styles from "@/app/mentors/mentors.module.css";

export function MentorPoolForm({ initialKind }: { initialKind: MentorApplication["kind"] }) {
  const [kind, setKind] = useState(initialKind);
  const [mode, setMode] = useState<MentorApplication["mode"]>("online");
  const [fields, setFields] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submissionId = useRef("");
  const previousPayload = useRef("");
  const sending = useRef(false);
  const isMentor = kind === "mentor";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const values = new FormData(event.currentTarget);
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    const parsed = mentorApplicationSchema.safeParse({
      submissionId: submissionId.current, kind, name: values.get("name"), email: values.get("email"),
      headline: values.get("headline"), story: values.get("story"), fields, mode,
      region: values.get("region"), availability: values.get("availability"), consent: values.get("consent") === "on", website: values.get("website"),
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message === "오프라인 만남을 희망하는 지역을 적어 주세요." ? parsed.error.issues[0].message : "필수 항목을 확인해 주세요. 이야기는 10자 이상, 분야는 최대 4개까지 선택할 수 있어요."); return; }
    const comparablePayload = JSON.stringify({ ...parsed.data, submissionId: "" });
    if (previousPayload.current && previousPayload.current !== comparablePayload) {
      submissionId.current = crypto.randomUUID();
      parsed.data.submissionId = submissionId.current;
    }
    previousPayload.current = comparablePayload;
    sending.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/mentor-pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(typeof result === "object" && result && "error" in result && typeof result.error === "string" ? result.error : "신청을 저장하지 못했어요.");
      setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "연결이 원활하지 않아요. 입력은 그대로 있으니 다시 시도해 주세요."); }
    finally { sending.current = false; setPending(false); }
  }

  if (done) return <div className={styles.success} role="status">
    <span><Check size={30} /></span><h2 id="mentor-form-title">참여 희망을 남겨 주셔서 고마워요.</h2>
    <p>남겨 주신 이야기를 잘 보관할게요.<br />어울리는 상대가 있으면 입력하신 이메일로 연락드리겠습니다.</p>
    <p>지금은 모집 단계이며, 만남이 확정된 것은 아니에요. 연락처와 신청 내용은 상대에게 자동 공개되지 않습니다.</p>
    <a href="mailto:support@mooaresume.com">내용 수정·신청 철회 문의</a>
  </div>;

  return <>
    <div className={styles.formHeading}><span>작은 만남의 시작</span><h2 id="mentor-form-title">어떤 만남을 기다리고 있나요?</h2><p>아직 생각이 정리되지 않았어도 괜찮아요.</p></div>
    <form onSubmit={submit} className={styles.form} data-clarity-mask="True">
      <fieldset disabled={pending} className={styles.formFields}>
        <legend className="visually-hidden">참여 희망 신청</legend>
        <fieldset className={styles.kind}><legend>참여 방식</legend>{Object.entries(mentorKinds).map(([value, label]) => <label key={value} data-active={kind === value}><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => { setKind(value as MentorApplication["kind"]); setError(""); }} /><b>{label}</b><small>{value === "mentee" ? "궁금한 사람과 이야기를 나누고 싶어요" : "내가 걸어온 길과 일상을 들려줄게요"}</small></label>)}</fieldset>
        <div className={styles.twoColumns}><label>이름 또는 활동명 <em>필수</em><input name="name" required maxLength={60} autoComplete="name" placeholder="어떻게 불러드릴까요?" /></label><label>연락받을 이메일 <em>필수</em><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="hello@example.com" /></label></div>
        <label>{isMentor ? "어떤 경험을 나눌 수 있나요?" : "어떤 사람을 만나고 싶나요?"} <em>필수</em><input name="headline" required minLength={2} maxLength={160} placeholder={isMentor ? "예: 작은 가게를 열고 운영해 온 이야기" : "예: 회사에 다니면서 그림을 계속 그리는 사람"} /></label>
        <label>{isMentor ? "편하게 들려줄 수 있는 이야기를 적어 주세요" : "만나고 싶은 이유나 궁금한 이야기를 적어 주세요"} <em>필수</em><textarea name="story" required minLength={10} maxLength={2000} rows={5} placeholder={isMentor ? "직업 경험, 도전했던 일, 일상의 이야기까지 좋아요. 전문적인 상담 경력이 없어도 괜찮아요." : "직업이나 꿈에 관한 질문도, 비슷한 경험을 가진 사람과 나누고 싶은 대화도 좋아요. 아직 구체적이지 않아도 괜찮아요."} /><small>10~2,000자 · 주민번호, 건강정보, 타인의 연락처 등 민감한 내용은 적지 말아 주세요.</small></label>
        <fieldset className={styles.fieldChoices}><legend>{isMentor ? "경험과 가까운 분야" : "관심 있는 분야"} <span>선택 · 최대 4개</span></legend><div>{mentorFields.map((field) => <label key={field.id} data-selected={fields.includes(field.id)}><input type="checkbox" checked={fields.includes(field.id)} disabled={!fields.includes(field.id) && fields.length >= 4} onChange={(event) => setFields(event.target.checked ? [...fields, field.id] : fields.filter((value) => value !== field.id))} />{field.label}</label>)}</div></fieldset>
        <div className={styles.twoColumns}><label>희망하는 만남 방식<select value={mode} onChange={(event) => setMode(event.target.value as MentorApplication["mode"])}>{Object.entries(meetingModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>지역 <em>{mode === "online" ? "선택" : "필수"}</em><input name="region" maxLength={120} required={mode !== "online"} placeholder="예: 서울, 울산 · 상세 주소 제외" /></label></div>
        <label>가능한 시간이나 참여 빈도 <em>선택</em><input name="availability" maxLength={120} placeholder={isMentor ? "예: 평일 저녁, 한 달에 한 번 정도" : "예: 주말 오후, 시간은 함께 정하고 싶어요"} /></label>
        <div className={styles.honeypot} aria-hidden="true"><label>웹사이트<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <div className={styles.consent}><p>현재 모집과 연결은 무료예요. 운영자가 적합한 상대를 찾으면 의사를 확인하며, 연결 여부와 시기는 보장되지 않습니다.</p><details><summary>개인정보 수집·이용 안내</summary><p>수집 항목: 참여 방식, 이름·활동명, 이메일, 작성한 이야기, 선택 분야, 만남 방식, 선택한 지역·시간. 목적: 참여 희망 풀 관리, 연결 가능성 검토 및 개별 연락. 보관: 등록일부터 1년이며 만료 후 일일 정리 시 삭제합니다. 철회 요청은 본인 확인 후 삭제합니다. 입력 내용은 분야별 분류를 보조하는 데 사용되며 운영자가 최종 검토합니다. 상대에게 내용을 전달하기 전 별도로 의사를 확인합니다. 동의를 거부할 수 있으나 신청은 제한됩니다. 유료 상품 홍보에 대한 동의는 포함하지 않습니다.</p><p>수정·철회: 신청한 이메일에서 <a href="mailto:support@mooaresume.com">support@mooaresume.com</a>으로 연락해 주세요.</p></details><label><input type="checkbox" name="consent" required /> <span>위 개인정보 수집·이용에 동의합니다. <em>필수</em></span></label></div>
        <button className={styles.submit} type="submit" disabled={pending}>{pending ? "참여 희망을 저장하고 있어요…" : "무료로 참여 희망 남기기"}<ArrowRight size={18} /></button>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  </>;
}

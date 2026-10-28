"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { classifyMentorApplication, mentorFields, mentorKinds, mentorStatuses, meetingModes, relatedMentorCandidates, type MentorPoolRecord } from "@/domain/mentor-pool";
import { kst } from "../format";
import styles from "./queue.module.css";

function RecordCard({ record, records }: { record: MentorPoolRecord; records: MentorPoolRecord[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(record.status);
  const [note, setNote] = useState(record.note);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const classification = classifyMentorApplication(record);
  const candidates = relatedMentorCandidates(record, records);

  async function save(remove = false) {
    if (pending) return;
    if (remove && window.prompt("신청 이메일로 본인과 철회 의사를 확인한 뒤 진행하세요. 개인정보가 영구 삭제됩니다. ‘본인 확인 후 삭제’를 입력하세요.") !== "본인 확인 후 삭제") return;
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/meensoo/mentor-pool", { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(remove ? { id: record.id, confirmation: "본인 확인 후 삭제" } : { id: record.id, status, note, updatedAt: record.updatedAt }) });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "처리하지 못했습니다.");
      setMessage(remove ? "삭제했습니다." : "저장했습니다."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "처리하지 못했습니다."); }
    finally { setPending(false); }
  }
  return <article className={styles.card} id={`application-${record.id}`}>
    <div className={styles.cardHead}><div><span>{record.kind === "mentor" ? "경험 나눔 멘토" : "만남 희망자"} · {mentorStatuses[record.status]}</span><h2>{record.name}</h2><span className={styles.email}>{record.email}</span></div><small>{kst(record.createdAt)}</small></div>
    <h3>{record.headline}</h3><p className={styles.story}>{record.story}</p>
    <p className={styles.meta}>{meetingModes[record.mode]} · {record.region || "지역 미입력"} · {record.availability || "시간 추후 협의"}</p>
    <div className={styles.tags}>{classification.map((item) => <span key={item.field} title={item.basis}>{mentorFields.find((field) => field.id === item.field)?.label}<small>{item.basis}</small></span>)}{!classification.length && <span>미분류 · 원문을 살펴봐 주세요</span>}</div>
    <details className={styles.candidates}><summary>유사 분야 후보 {candidates.length}명</summary><p>현재 불러온 기록 중 분야가 겹치는 후보입니다. 적합성·경력 검증이나 자동 매칭 결과가 아닙니다. 원문, 가능한 지역·시간, 양쪽 의사를 확인하세요.</p>{candidates.map(({ entry, common }) => <div key={entry.id}><b>{entry.name} · {entry.headline}</b><small>{common.map((field) => mentorFields.find((value) => value.id === field.field)?.label).join(" · ")} / {meetingModes[entry.mode]} / {entry.region || "지역 미입력"}</small><p>{entry.story}</p><span className={styles.email}>{entry.email}</span></div>)}{!candidates.length && <p>표시할 후보가 없습니다. 자유기술을 검색해 다른 경험도 살펴보세요.</p>}</details>
    <div className={styles.editor}><label>진행 상태<select value={status} disabled={pending} onChange={(event) => setStatus(event.target.value as MentorPoolRecord["status"])}>{Object.entries(mentorStatuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>운영 메모<textarea value={note} disabled={pending} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} placeholder="확인한 내용, 연락 여부, 다음에 살펴볼 점" /></label><button disabled={pending} onClick={() => save()}>상태·메모 저장</button></div>
    <div className={styles.bottom}><small>보관 만료: {kst(record.expiresAt)} · 이후 일일 정리 시 삭제</small><button disabled={pending} onClick={() => save(true)}>본인 확인한 철회 요청 삭제</button></div>
    {message && <p role="status">{message}</p>}
  </article>;
}

export function MentorPoolQueue({ records }: { records: MentorPoolRecord[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [field, setField] = useState("");
  const [status, setStatus] = useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = records.filter((record) => (!kind || record.kind === kind) && (!status || record.status === status)
    && (!field || classifyMentorApplication(record).some((entry) => entry.field === field))
    && (!normalized || [record.name, record.email, record.headline, record.story, record.region, record.note].join(" ").toLocaleLowerCase().includes(normalized)));
  return <div className={styles.queue} data-clarity-mask="True">
    <header className={styles.head}><div><h1>무료 멘토 연결 · 참여 희망 풀</h1><p>프리랜서 모집과 별개인 비공개 신청 기록입니다. 분류는 검토 보조이며, 연락·연결은 운영자가 진행합니다.</p></div><Link href="/mentors">신청 화면 보기</Link></header>
    <p>불러온 최근 {records.length}건 · 멘토 {records.filter((record) => record.kind === "mentor").length}명 · 만남 희망자 {records.filter((record) => record.kind === "mentee").length}명</p>
    {records.length === 500 && <p role="status">최근 500건만 불러왔습니다. 아래 검색·분류·후보는 이 범위 안에서만 표시됩니다.</p>}
    <div className={styles.filters}><label>검색<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이야기·이름·이메일·지역" /></label><label>참여 방식<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">전체</option>{Object.entries(mentorKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>분야<select value={field} onChange={(event) => setField(event.target.value)}><option value="">전체</option>{mentorFields.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label><label>진행 상태<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">전체</option>{Object.entries(mentorStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <p>{filtered.length}건 표시 · 자동 분류는 신청자가 선택한 분야와 작성 내용의 키워드에 근거합니다.</p>
    <div className={styles.list}>{filtered.map((record) => <RecordCard key={`${record.id}:${record.updatedAt}`} record={record} records={records} />)}</div>
    {!filtered.length && <p className={styles.empty}>{records.length ? "조건에 맞는 신청이 없습니다." : "아직 접수된 참여 희망이 없습니다."}</p>}
  </div>;
}

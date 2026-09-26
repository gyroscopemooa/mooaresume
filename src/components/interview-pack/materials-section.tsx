"use client";

import { useState } from "react";
import { PACK_DOC_KIND_LABEL, type PackDocKind, type PackSupplements } from "@/domain/interview-pack";
import type { PackState } from "@/server/interview-pack/service";
import { PACK_COPY } from "./copy";
import styles from "./interview-pack.module.css";

export type SupplementDrafts = Record<keyof PackSupplements, string>;
export const EMPTY_DRAFTS: SupplementDrafts = { company: "", role: "", jobPostingText: "", emphasis: "", applyReason: "", contribution: "", exclude: "" };

type FieldSpec = {
  key: keyof PackSupplements;
  label: string;
  multiline: boolean;
  placeholder: string;
  hint?: string;
};

const FIELDS: FieldSpec[] = [
  { key: "company", label: "지원 회사", multiline: false, placeholder: "예: ○○ 주식회사" },
  { key: "role", label: "지원 직무", multiline: false, placeholder: "예: 품질관리" },
  { key: "emphasis", label: "강조할 경험", multiline: true, placeholder: "면접에서 꼭 이야기하고 싶은 경험이 있다면 적어 주세요.", hint: "선택 — 비워 두어도 됩니다." },
  { key: "applyReason", label: "실제 지원 이유", multiline: true, placeholder: "이 회사·직무에 지원하려는 진짜 이유를 본인의 말로 적어 주세요.", hint: "지원동기 답변은 여기 적은 이유와 자료에 있는 내용만으로 만듭니다." },
  { key: "contribution", label: "희망하는 기여 방향", multiline: true, placeholder: "입사 후 어떤 일로 기여하고 싶은지 적어 주세요.", hint: "입사 후 포부는 여기 적은 방향만으로 만듭니다." },
  { key: "exclude", label: "제외할 내용", multiline: true, placeholder: "답변에 넣고 싶지 않은 이야기가 있다면 적어 주세요.", hint: "선택 — 쉼표나 줄바꿈으로 나눠 적으면 답변에 들어갔는지 점검합니다." },
];

type Props = {
  state: PackState;
  drafts: SupplementDrafts;
  onDraft: (key: keyof PackSupplements, value: string) => void;
  /** 화면만 보기 모드에서는 외부 주소를 부르는 URL 불러오기·파일 읽기를 쓰지 않는다. */
  externalInputs: boolean;
  onFetchPosting?: (url: string) => Promise<{ ok: true; text: string } | { ok: false }>;
  onReadFile?: (file: File) => Promise<string>;
  disabled: boolean;
};

function currentValue(state: PackState, key: keyof PackSupplements): string {
  if (key === "company") return state.materials.company;
  if (key === "role") return state.materials.role;
  return (state.materials.supplements[key] ?? "").toString();
}

/**
 * 사용하는 자료 + 부족한 필드만 묻는 보완 입력.
 * 이미 값이 있는 칸은 다시 입력시키지 않고 "수정"을 눌러야 입력 칸이 열린다.
 */
export function MaterialsSection({ state, drafts, onDraft, externalInputs, onFetchPosting, onReadFile, disabled }: Props) {
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [postingUrl, setPostingUrl] = useState("");
  const [postingMessage, setPostingMessage] = useState("");
  const [postingBusy, setPostingBusy] = useState(false);

  const startEditing = (key: string) => setEditing((previous) => new Set(previous).add(key));

  async function fetchPosting() {
    if (!onFetchPosting || !postingUrl.trim()) return;
    setPostingBusy(true);
    setPostingMessage("");
    try {
      const result = await onFetchPosting(postingUrl.trim());
      if (result.ok) {
        onDraft("jobPostingText", result.text);
        setPostingMessage("공고 내용을 불러왔어요. 내용을 확인한 뒤 ‘보완 내용 저장’을 눌러 주세요.");
      } else {
        setPostingMessage("이 주소의 내용을 읽지 못했어요. 공고 본문을 복사해서 아래 칸에 붙여 넣어 주세요.");
      }
    } catch {
      setPostingMessage("이 주소의 내용을 읽지 못했어요. 공고 본문을 복사해서 아래 칸에 붙여 넣어 주세요.");
    } finally {
      setPostingBusy(false);
    }
  }

  async function readFile(file: File | null) {
    if (!file || !onReadFile) return;
    setPostingBusy(true);
    setPostingMessage("");
    try {
      onDraft("jobPostingText", await onReadFile(file));
      setPostingMessage("파일에서 글을 읽어 왔어요. 내용을 확인한 뒤 ‘보완 내용 저장’을 눌러 주세요.");
    } catch (error) {
      setPostingMessage(error instanceof Error ? error.message : "파일을 읽지 못했어요.");
    } finally {
      setPostingBusy(false);
    }
  }

  const hasPosting = state.materials.hasJobPosting;

  return <section className={styles.section} aria-labelledby="pack-materials">
    <h3 id="pack-materials">① {PACK_COPY.materialsTitle} <span className={styles.tag}>자료 v{state.materials.version}</span></h3>
    <p className={styles.hint}>{PACK_COPY.materialsNote}</p>

    <ul className={styles.docs}>
      {state.materials.docs.map((doc) => <li key={doc.id}>
        <strong>{doc.title}</strong>
        <em>{PACK_DOC_KIND_LABEL[doc.kind as PackDocKind] ?? doc.kind} · 공백 제외 {doc.chars.toLocaleString("ko-KR")}자{doc.filename ? ` · ${doc.filename}` : ""}</em>
        {doc.truncated && <p className={styles.truncNote}>길어서 앞부분만 사용합니다.</p>}
        <p>{doc.preview}{doc.preview.length >= 140 ? "…" : ""}</p>
      </li>)}
      {state.materials.docs.length === 0 && <li><p>제출된 자료에서 읽을 수 있는 글이 없습니다. 아래에 공고 본문이나 경험을 붙여 넣어 주세요.</p></li>}
    </ul>

    <div className={styles.subhead}>부족한 내용만 보완하기</div>
    <div className={styles.fields}>
      {FIELDS.map((field) => {
        const value = currentValue(state, field.key);
        const open = !value || editing.has(field.key);
        return <div className={styles.field} key={field.key}>
          <label htmlFor={`pack-field-${field.key}`}>{field.label}</label>
          {open
            ? field.multiline
              ? <textarea id={`pack-field-${field.key}`} value={drafts[field.key]} onChange={(event) => onDraft(field.key, event.target.value)} placeholder={value || field.placeholder} disabled={disabled} maxLength={1500} />
              : <input id={`pack-field-${field.key}`} type="text" value={drafts[field.key]} onChange={(event) => onDraft(field.key, event.target.value)} placeholder={value || field.placeholder} disabled={disabled} maxLength={120} />
            : <div className={styles.value}><span>{value}</span><button type="button" className={styles.linkBtn} onClick={() => startEditing(field.key)} disabled={disabled}>수정</button></div>}
          {field.hint && open && <span className={styles.hint}>{field.hint}</span>}
        </div>;
      })}

      <div className={styles.field}>
        <span className={styles.fieldLabel}>채용공고 본문</span>
        {hasPosting && !editing.has("jobPostingText")
          ? <div className={styles.value}><span>채용공고가 있어 함께 사용합니다.</span><button type="button" className={styles.linkBtn} onClick={() => startEditing("jobPostingText")} disabled={disabled}>본문 바꾸기</button></div>
          : <>
            {externalInputs && <div className={styles.row}>
              <input type="url" aria-label="채용공고 주소" value={postingUrl} onChange={(event) => setPostingUrl(event.target.value)} placeholder="채용공고 주소(URL)를 붙여 넣으면 본문을 불러와요" disabled={disabled || postingBusy} />
              <button type="button" className={styles.btn} data-variant="ghost" data-size="sm" onClick={() => void fetchPosting()} disabled={disabled || postingBusy || !postingUrl.trim()}>{postingBusy ? "읽는 중…" : "공고 불러오기"}</button>
              <label className={styles.btn} data-variant="quiet" data-size="sm" aria-disabled={disabled || postingBusy}>
                파일에서 읽기
                <input type="file" accept=".pdf,.docx,.txt,.md" hidden disabled={disabled || postingBusy} onChange={(event) => { void readFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
              </label>
            </div>}
            {!externalInputs && <span className={styles.hint}>샘플 화면에서는 주소·파일 읽기를 쓰지 않습니다(외부 호출 없음). 아래 칸에 직접 붙여 넣을 수 있어요.</span>}
            <textarea aria-label="채용공고 본문" value={drafts.jobPostingText} onChange={(event) => onDraft("jobPostingText", event.target.value)} placeholder="채용공고 본문을 붙여 넣어 주세요. 주소를 읽지 못하면 이 칸에 직접 붙여 넣으면 됩니다." disabled={disabled} maxLength={8000} rows={5} />
            {postingMessage && <span className={styles.hint} role="status">{postingMessage}</span>}
          </>}
      </div>
    </div>
  </section>;
}

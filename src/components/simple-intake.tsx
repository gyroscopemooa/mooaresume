"use client";

import { ChangeEvent, DragEvent, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, FileText, HelpCircle, Link as LinkIcon, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import {
  CLASSIFIED_KIND_LABEL,
  CLASSIFIED_KIND_ORDER,
  classifyDocument,
  summarizeClassification,
  type ClassifiedKind,
  type ClassifiedItem,
} from "@/domain/document-classify";
import { writeQuestionTargetLength } from "@/domain/cover-letter-parser";
import {
  ACCEPTED_UPLOAD_ACCEPT,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  checkUploads,
  describeRejections,
  formatBytes,
} from "@/domain/upload-limits";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import { findPostingUrl, removePostingUrlLine } from "@/domain/posting-link";
import type { QuestionLengthPlan } from "@/domain/simple-intake-mapping";
import styles from "./simple-intake.module.css";

/**
 * 간편 입력 — one box for everything, sorted afterwards.
 *
 * The detailed screen asks the applicant to file each document into the right
 * slot before it will do anything. That is work the product should be doing:
 * they already know what their files are, and sorting them into labelled boxes
 * teaches them nothing and takes a minute.
 *
 * So: paste or drop, and the classification is shown back as a list they can
 * correct. The correction step is the part that makes this a product rather
 * than a chat window — a guess nobody can see or fix is worse than no guess.
 *
 * Nothing here calls a model. Classification is filename and heading patterns,
 * which costs nothing and runs before payment, where a paid call would be
 * spending money on people who never buy.
 */

export type SimpleIntakeFile = {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
  basis: ClassifiedItem["basis"];
  /** 글자가 없는 스캔본. 무엇인지는 본인만 압니다. */
  unreadable?: boolean;
};

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  targetLength: string;
  onTargetLengthChange: (value: string) => void;
  resolvedLengths: string;
  lengthPlans: QuestionLengthPlan[];
  lengthLoss: string | null;
  /** 이 상품이 포함하는 자기소개서 총 글자 수. */
  limitCharacters: number;
  files: SimpleIntakeFile[];
  onFilesChange: (files: SimpleIntakeFile[]) => void;
  onError?: (message: string) => void;
};

/**
 * 문항 하나의 목표 글자 수 칸.
 *
 * ------------------------------------------------------------------
 * 왜 타이핑하는 동안에는 본문을 고치지 않는가
 * ------------------------------------------------------------------
 * 고친 숫자는 본문 제목 뒤의 `(700자)` 표시로 저장되는데, 그 표시가 읽히는
 * 범위는 100~9999입니다. 글자를 칠 때마다 바로 쓰면 "3", "30"을 지나가는
 * 순간마다 범위 밖이라 표시가 지워지고, 지워지면 값이 전체 기본값으로 되돌아
 * 옵니다. **그래서 아무리 눌러도 숫자가 안 바뀌었습니다** — 치는 족족 되돌려
 * 놓고 있었습니다.
 *
 * 치는 동안에는 화면에만 담아 두고, 칸을 벗어나거나 Enter를 칠 때 한 번
 * 씁니다. 100 미만이면 표시를 지워 전체 기본값으로 되돌립니다.
 */
function TargetLengthField({ label, target, fallback, onCommit }: {
  label: string;
  target: number | null;
  fallback: string;
  onCommit: (value: number | null) => void;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  const shown = typing ?? (target ? String(target) : "");
  const inRange = (value: string) => Boolean(value) && Number(value) >= 100 && Number(value) <= 9999;

  return <input
    aria-label={`${label} 목표 글자 수`}
    inputMode="numeric"
    maxLength={4}
    value={shown}
    placeholder={fallback || "기본"}
    onChange={(event) => {
      const digits = event.target.value.replace(/[^0-9]/g, "");
      setTyping(digits);
      // 범위에 들어오는 순간 바로 반영합니다. 칸을 벗어나야만 저장하면,
      // 숫자를 고치고 곧장 다음 단추를 누른 사람의 값이 사라질 수 있습니다.
      if (inRange(digits)) onCommit(Number(digits));
    }}
    onBlur={() => {
      // 100 미만으로 두고 나가면 표시를 지워 전체 기본값으로 되돌립니다.
      // 지우려고 비운 경우도 여기로 옵니다.
      if (typing !== null && !inRange(typing)) onCommit(null);
      setTyping(null);
    }}
    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
  />;
}

export function SimpleIntake({ draft, onDraftChange, targetLength, onTargetLengthChange, resolvedLengths, lengthPlans, lengthLoss, limitCharacters, files, onFilesChange, onError }: Props) {
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const postingUrl = findPostingUrl(draft);

  /**
   * 공고를 읽어 자료 목록에 한 장으로 넣습니다.
   *
   * 분석이 링크를 여는 것이 아닙니다. 여기서 한 번 읽어 글자로 바꿔 두고,
   * 그 뒤로는 다른 첨부와 똑같이 취급합니다 — 손님이 내용을 확인하고 고칠 수도
   * 있어야 하기 때문입니다.
   */
  async function loadPostingLink() {
    if (!postingUrl || loadingLink) return;
    setLoadingLink(true);
    setLinkMessage("");
    try {
      const response = await fetch("/api/job-postings/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: postingUrl }),
      });
      const body = await response.json().catch(() => ({})) as { ok?: boolean; text?: string; title?: string };
      if (body.ok !== true || typeof body.text !== "string" || !body.text.trim()) {
        // 그림으로 올린 공고나 스크립트로 그리는 공고는 읽을 것이 없습니다.
        // 못 읽었다고 말하고 붙여넣기를 권합니다 — 조용히 넘어가면 손님은
        // 공고를 넣은 줄 압니다.
        setLinkMessage(" 이 주소에서는 내용을 읽지 못했습니다. 공고 본문을 복사해 붙여넣어 주세요.");
        return;
      }
      const host = (() => { try { return new URL(postingUrl).hostname.replace(/^www\./, ""); } catch { return "채용공고"; } })();
      onFilesChange([...files, {
        id: `posting-link-${Date.now()}`,
        filename: body.title?.trim() || `${host} 채용공고`,
        extension: "link",
        sizeBytes: body.text.length,
        text: body.text,
        kind: "JOB_POSTING",
        basis: "content",
      }]);
      onDraftChange(removePostingUrlLine(draft, postingUrl));
    } catch {
      setLinkMessage(" 지금은 불러오지 못했습니다. 공고 본문을 복사해 붙여넣어 주세요.");
    } finally {
      setLoadingLink(false);
    }
  }

  const limitFieldId = useId();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<Array<{ name: string; reason: string }>>([]);
  // A counter rather than Date.now(): ids only have to be unique within this
  // list, and a clock read is not something a component should be doing.
  const nextId = useRef(0);

  const summary = useMemo(() => summarizeClassification(files), [files]);
  const draftCharacters = countNonWhitespaceCharacters([draft]);
  const usedBytes = files.reduce((total, file) => total + file.sizeBytes, 0);

  async function intake(selected: File[]) {
    if (!selected.length) return;
    setBusy(true);
    onError?.("");
    // Rejected by name, not as a batch: a folder of twenty-five files should
    // add the twenty it can and say which five it could not.
    const { accepted, rejected } = checkUploads(selected, { count: files.length, bytes: usedBytes });
    // Appended, not replaced. Someone fixes one rejected file, adds it, and a
    // second one fails — replacing the list would make the first look solved.
    if (rejected.length) {
      setRejections((current) => {
        const seen = new Set(current.map((item) => `${item.name}:${item.reason}`));
        return [...current, ...rejected.filter((item) => !seen.has(`${item.name}:${item.reason}`))];
      });
    }
    try {
      const { extractLocalDocuments } = await import("@/lib/local-document");
      const added: SimpleIntakeFile[] = [];
      // 한 파일이 넘어졌다고 나머지를 잃지 않습니다. 압축파일 하나가 안
      // 열렸다고 같이 고른 자소서·이력서까지 사라지면, 손님은 무엇이 문제였는지
      // 알 길이 없이 처음부터 다시 골라야 합니다.
      const failures: Array<{ name: string; reason: string }> = [];
      for (const file of accepted) {
        // A ZIP comes back as several documents, which is the point of taking
        // it: the applicant compresses a folder rather than picking files.
        let batch;
        try {
          batch = await extractLocalDocuments(file);
        } catch (reason) {
          failures.push({ name: file.name, reason: reason instanceof Error ? reason.message : "읽지 못했어요" });
          continue;
        }
        // 압축파일이 지나친 항목들입니다. 여기까지 와서 버려지고 있었습니다 —
        // 자격증 사진(jpg·png)만 담긴 압축파일을 올리면 아무 일도 일어나지
        // 않는 것처럼 보였고, 실제로 손님이 그렇게 겪었습니다.
        for (const name of batch.skipped) {
          failures.push({ name: `${file.name} 안의 ${name}`, reason: "글자를 읽을 수 없는 형식" });
        }
        for (const document of batch.documents) {
          const guess = classifyDocument({ filename: document.filename, text: document.text });
          added.push({
            id: `${document.filename}-${document.sizeBytes}-${(nextId.current += 1)}`,
            filename: document.filename,
            extension: document.extension,
            sizeBytes: document.sizeBytes,
            text: document.text,
            kind: guess.kind,
            basis: guess.basis,
            ...(document.unreadable ? { unreadable: true } : {}),
          });
        }
      }
      // Same name and same size twice is the same file twice — someone dropped
      // a folder, then dropped it again.
      const seen = new Set(files.map((file) => `${file.filename}:${file.sizeBytes}`));
      onFilesChange([...files, ...added.filter((file) => {
        const key = `${file.filename}:${file.sizeBytes}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })]);
      if (failures.length) {
        setRejections((current) => {
          const seen = new Set(current.map((item) => `${item.name}:${item.reason}`));
          return [...current, ...failures.filter((item) => !seen.has(`${item.name}:${item.reason}`))];
        });
      }
    } catch (reason) {
      onError?.(reason instanceof Error ? reason.message : "파일을 읽지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    await intake(selected);
  }

  async function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    await intake(Array.from(event.dataTransfer.files ?? []));
  }

  function setKind(id: string, kind: ClassifiedKind) {
    // Corrected by hand, so the hint about how it was guessed no longer applies.
    onFilesChange(files.map((file) => file.id === id ? { ...file, kind, basis: "filename" } : file));
  }

  const unsetCount = files.filter((file) => file.kind === "UNSET").length;
  const letterCharacters = lengthPlans.reduce((total, plan) => total + plan.current, 0) || draftCharacters;

  return <section className={styles.intake}>
    <div
      className={`${styles.box} ${dragging ? styles.boxDragging : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <div className={styles.boxHead}>
        <h3>지원 자료를 한 번에 넣어주세요</h3>
        <p>자기소개서를 붙여넣고, 나머지 파일은 <b>여기에 끌어다 놓으세요.</b> 무엇인지는 무아가 알아서 나눕니다.</p>
        {/* The speech bubble carries the formats and the ceilings, so the box
            itself does not have to read like a warning notice. */}
        <button type="button" className={styles.help} aria-label="넣을 수 있는 파일 안내">
          <HelpCircle/>
          <span role="tooltip" className={styles.tooltip}>
            <b>넣을 수 있는 것</b>
            PDF · DOCX · TXT · MD · ZIP<br/>
            최대 {MAX_UPLOAD_FILES}개 · 총 {formatBytes(MAX_TOTAL_UPLOAD_BYTES)}까지<br/>
            <em>압축파일은 풀어서 안의 문서를 하나씩 읽습니다. 같은 파일을 두 번 넣으면 한 번만 셉니다.</em>
          </span>
        </button>
      </div>

      <textarea
        rows={9}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={"자기소개서 전체를 그대로 붙여넣어 주세요.\n채용공고 주소를 한 줄로 붙여넣으면 공고 내용을 불러옵니다.\n\n1. 지원 동기\n작성한 답변...\n\n2. 직무 역량\n작성한 답변..."}
      />

      {/* 칸이 하나뿐이라 사람들은 여기에 공고 주소도 함께 붙여넣습니다. 지금까지
          그 줄은 자기소개서 본문으로 읽혔습니다 — 공고를 넣었다고 생각한 사람이
          공고 대조 없는 결과를 받았습니다.

          자동으로 불러오지는 않습니다. 붙여넣는 중에 주소가 잠깐 완성되는
          순간마다 남의 서버를 두드리게 되고, 무엇보다 손님이 시키지 않은 일을
          하게 됩니다. 찾았다고 말하고 누를 것을 내밀기만 합니다. */}
      {/* 붙여넣은 글이 첨부한 자기소개서를 밀어냅니다.
          `mapSimpleIntake`가 "친 글이 이긴다"로 정해 두었기 때문입니다 — 새로
          붙여넣은 원고와 예전 사본이 함께 있을 때는 그게 맞습니다. 그런데
          이 칸에 참고사항이나 메모를 한 줄 적는 순간에도 같은 일이 벌어져,
          **첨부한 자기소개서가 통째로 분석에서 빠집니다.** 조용히 일어나던
          일이라 손님은 자기 자소서가 빠진 줄도 몰랐습니다.
          고르는 것은 손님이 하도록 두고, 무슨 일이 벌어지는지만 말합니다. */}
      {draft.trim() && files.some((file) => file.kind === "COVER_LETTER") && (
        <div className={styles.letterOverride}>
          <AlertCircle />
          <span>
            <b>붙여넣은 글을 자기소개서로 봅니다.</b>{" "}
            첨부하신 {files.filter((file) => file.kind === "COVER_LETTER").map((file) => file.filename).join(", ")}는 이번 분석에 쓰이지 않습니다.
            첨부한 쪽으로 하시려면 이 칸을 비워 주세요. 참고사항이나 추가 정보는 아래 <b>더 정확하게 써드릴게요</b>에 적어 주시면 자소서를 밀어내지 않습니다.
          </span>
        </div>
      )}

      {postingUrl && (
        <div className={styles.linkFound}>
          <LinkIcon />
          <span><b>채용공고 주소를 찾았어요.</b>{linkMessage || " 불러오면 공고 요구사항까지 함께 봅니다."}</span>
          <button type="button" disabled={loadingLink} onClick={() => void loadPostingLink()}>
            {loadingLink ? "불러오는 중..." : "공고 불러오기"}
          </button>
        </div>
      )}

      {/* Optional, and one number for the whole form, because that is what most
          application forms actually say. A question that prints its own limit
          keeps it — see applyDefaultTargetLength. Making this required would
          stop people who genuinely have no limit. */}
      {/* label이 아니라 div입니다. 안내를 여는 단추가 label 안에 있으면 그 클릭이
          입력칸 포커스까지 같이 끌고 갑니다. htmlFor로 따로 묶습니다. */}
      <div className={styles.limit}>
        <span>
          <label htmlFor={limitFieldId}>문항별 글자 수</label>
          {/* 안내를 한 칸으로 깔면 라벨·입력칸과 합쳐 세 칸이 되는데, 좁은
              화면에서 안내에 남는 폭이 117px뿐이라 어떻게 줄여도 두 줄이 됩니다.
              이 파일이 위쪽 분류 안내에 이미 쓰는 말풍선을 그대로 씁니다. */}
          <button type="button" className={styles.why} aria-label="글자 수를 어떻게 적는지">
            <HelpCircle/>
            <span role="tooltip" className={styles.tooltip}>
              <b>문항마다 글자 수가 다르면</b>
              제목 뒤에 <em>(800자)</em>처럼 적어 주세요. 그렇게 적힌 문항은 그 숫자를 쓰고, 나머지는 여기 값을 씁니다.
            </span>
          </button>
        </span>
        <input
          id={limitFieldId}
          inputMode="numeric"
          value={targetLength}
          maxLength={4}
          onChange={(event) => onTargetLengthChange(event.target.value.replace(/[^0-9]/g, ""))}
          placeholder="예: 500"
        />
        {/* One slot, because only one of these is ever the useful thing to
            say. Before there is a draft the marker is what someone needs to
            know; after there is one, what the number resolved to matters more —
            it decides how much gets written, and a wrong one here is the
            difference between a trim and a thousand characters of filler. The
            marker comes back on its own in the shrink warning below, which is
            the moment it actually matters. */}
        {resolvedLengths && <b className={styles.resolved}>{resolvedLengths}</b>}

        {/* 설정이 아니라 결과를 보여줍니다. 이 숫자가 없어서 완성된 자기소개서를
            올린 사람이 기본값 그대로 절반 가까이 잘렸습니다. */}
        {lengthPlans.length > 0 && <ul className={styles.plans}>
          {lengthPlans.map((plan) => <li key={plan.index} data-shrink={plan.shrink >= 0.25 ? "big" : undefined}>
            <span>{plan.label}</span>
            <b>{plan.current.toLocaleString()}자</b>
            {/* 문항마다 다른 글자 수를 넣을 칸이 지금까지 없었습니다. 기능은
                있었지만 본문 제목 뒤에 "(700자)"라고 손님이 직접 타이핑해야
                했고, 그 방법은 말풍선 안에만 적혀 있었습니다. 이미 보고 있는
                숫자를 그 자리에서 고치게 하고, 고친 값은 그 표시로 본문에
                되써넣습니다 — 실어 나르는 길은 그대로 두고 손잡이만 답니다. */}
            <em>
              →
              <TargetLengthField
                label={plan.label}
                target={plan.target}
                fallback={targetLength}
                onCommit={(value) => onDraftChange(writeQuestionTargetLength(draft, plan.index, value))}
              />
              자{plan.shrink > 0 && ` (-${Math.round(plan.shrink * 100)}%)`}
            </em>
          </li>)}
        </ul>}
        {lengthLoss && <small className={styles.loss}>{lengthLoss}</small>}

        {/* 번호가 하나도 없으면 붙여넣은 글 전체가 한 문항이 됩니다. 그러면
            목표 글자 수가 통째로 걸려, 네 문항 1,200자가 300자 하나로
            압축됩니다. 위 목록에 줄이 하나만 뜨는 것이 그 신호인데, 그걸
            읽으려면 이 화면이 문항을 어떻게 나누는지 알아야 합니다.

            길이 조건을 두는 이유: 문항이 정말 하나뿐인 자기소개서도 있습니다.
            짧은 글에까지 물으면 맞는 입력에 매번 경고가 뜹니다. */}
        {lengthPlans.length === 1 && letterCharacters >= 500 && <small className={styles.merged}>
          <AlertCircle />
          <span>
            <b>전체를 한 문항으로 읽었어요.</b> 문항이 하나뿐이면 이대로 괜찮습니다.
            여러 문항이라면 각 문항 앞에 <em>1. 지원 동기</em>처럼 번호와 제목을 붙여 주세요.
          </span>
        </small>}
      </div>

      <div className={styles.boxFoot}>
        {/* 한도를 옆에 붙여 둡니다. 지금까지는 지금 몇 자인지만 말하고 몇 자까지
            되는지는 어디에서도 말하지 않아, 넘기고 있는 줄 모른 채 넘길 수
            있었습니다. 자기소개서 본문만 셉니다 — 첨부 자료는 이 한도가
            아니라 참고자료 예산으로 따로 잘립니다. */}
        <span data-over={letterCharacters > limitCharacters ? "true" : undefined}>
          공백 제외 {letterCharacters.toLocaleString()} / {limitCharacters.toLocaleString()}자
          {letterCharacters > limitCharacters && " · 초과분은 결제 시 추가됩니다"}
          {files.length > 0 && ` · 파일 ${files.length}개 ${formatBytes(usedBytes)}`}
        </span>
        <label className={styles.attach}>
          {busy ? <Loader2 className={styles.spin}/> : <Paperclip/>}
          {busy ? "파일 확인 중" : "파일 추가"}
          <input type="file" multiple accept={ACCEPTED_UPLOAD_ACCEPT} onChange={pickFiles} disabled={busy}/>
        </label>
      </div>

      {rejections.length > 0 && <div className={styles.note}>
        <p><b>넣지 못한 파일 {rejections.length}개</b> — {describeRejections(rejections)}</p>
        <button type="button" onClick={() => setRejections([])}>지우기</button>
      </div>}

      {dragging && <div className={styles.dropVeil} aria-hidden="true"><UploadCloud/><b>여기에 놓으면 자동으로 분류합니다</b></div>}
    </div>

    {files.length > 0 && <div className={styles.sorted}>
      <div className={styles.sortedHead}>
        <b><Check/> 자료를 정리했습니다.</b>
        <span>{summary.map((row) => `${row.label} · ${row.count}개`).join("　")}</span>
      </div>
      <ul className={styles.fileList}>
        {files.map((file) => <li key={file.id} data-unset={file.kind === "UNSET" ? "true" : undefined}>
          <FileText/>
          <div>
            <b>{file.filename}</b>
            <small>
              {file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)}
              {/* Says how it guessed, so a wrong row stands out instead of
                  needing every line read to catch. */}
              {file.basis === "content" && " · 내용을 보고 분류"}
              {/* 이름과 내용이 서로 다른 말을 했다는 뜻입니다. 한쪽을 골라
                  넘어가는 대신 물어봅니다 — 잘못 고르면 본인 경력이 근거에서
                  빠집니다. */}
              {file.basis === "conflict" && " · 파일 이름과 내용이 달라 고르지 못했습니다"}
              {file.unreadable && " · 스캔본이라 글자를 읽지 못했습니다"}
            </small>
            {/* 글자가 없는 파일에는 한 줄을 받습니다.
                자격증·면허증·증명서는 대부분 스캔본이고, 예전에는 여기서
                아예 거부당했습니다 — 근거로 쓰라고 올린 파일이 문 앞에서
                막힌 셈입니다. 사진을 모델에 보내는 대신(값·정확도도 있지만
                주민번호가 찍혀 있습니다) 무엇인지만 본인에게 묻습니다. */}
            {file.unreadable && (
              <input
                className={styles.scanNote}
                value={file.text}
                maxLength={200}
                onChange={(event) => onFilesChange(files.map((item) => item.id === file.id ? { ...item, text: event.target.value } : item))}
                placeholder="무엇인지 한 줄로 적어 주세요. 예: 직업상담사 2급 · 2020.09 취득"
              />
            )}
          </div>
          <select value={file.kind} onChange={(event) => setKind(file.id, event.target.value as ClassifiedKind)} aria-label={`${file.filename} 자료 종류`}>
            {file.kind === "UNSET" && <option value="UNSET">{CLASSIFIED_KIND_LABEL.UNSET}</option>}
            {CLASSIFIED_KIND_ORDER.map((kind) => <option key={kind} value={kind}>{CLASSIFIED_KIND_LABEL[kind]}</option>)}
          </select>
          <button type="button" onClick={() => onFilesChange(files.filter((item) => item.id !== file.id))} aria-label={`${file.filename} 빼기`}><Trash2/></button>
        </li>)}
      </ul>
      {/* 길게 늘어놓던 안내를 말풍선으로 옮겼습니다. 매번 읽히지 않으면서도
          누르면 나오고, 목록 아래에 문단이 하나 줄어듭니다. */}
      <p className={styles.sortedNote}>
        분류가 다르면 오른쪽에서 바꿔 주세요.
        <button type="button" className={styles.why} aria-label="분류가 왜 중요한지">
          <HelpCircle/>
          <span role="tooltip" className={styles.tooltip}>
            <b>분류에 따라 읽는 방법이 달라집니다</b>
            <em>채용공고</em>는 요구사항만 뽑고 <b>첨삭에 인용하지 않습니다.</b> 회사가 쓴 글이라 지원자의 경력으로 쓸 수 없기 때문입니다.<br/>
            <em>이력서·경력기술서</em>는 자기소개서의 근거로 대조합니다.<br/>
            <em>기타 자료</em>는 참고로만 씁니다.<br/>
            분류가 틀리면 본인 경력이 근거에서 빠져 첨삭이 실패할 수 있습니다.
          </span>
        </button>
      </p>

      {unsetCount > 0 && <p className={styles.unsetWarning}>
        <AlertCircle/>
        <span><b>분류를 고르지 못한 자료가 {unsetCount}개 있습니다.</b> 파일 이름과 내용이 서로 다른 말을 해서, 저희가 고르면 틀릴 수 있습니다. 직접 골라 주셔야 진행됩니다.</span>
      </p>}
    </div>}
  </section>;
}

"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, FileCheck2, FilePenLine, LockKeyhole, ScanSearch, Upload } from "lucide-react";
import { decideWritingMode, type WritingMode } from "@/domain/writing-mode";
import { isFinalEnabled } from "@/domain/final-availability";
import { loadGuestDraft, saveGuestDraft } from "@/lib/guest-draft";
import { AttachmentCard } from "@/components/attachment-card";
import styles from "./onboarding.module.css";

const options = [
  {
    id: "CREATE" as const,
    icon: Compass,
    label: "처음부터 작성",
    title: "아직 아무것도 못 썼어요",
    description: "경험을 찾고 소재와 개요부터 함께 만들어요.",
  },
  {
    id: "BUILD" as const,
    icon: FilePenLine,
    label: "내용 보완",
    title: "써보긴 했는데 내용이 부족해요",
    description: "부족한 행동과 결과를 확인해 초안을 발전시켜요.",
  },
  {
    id: "POLISH" as const,
    icon: FileCheck2,
    label: "최종 첨삭",
    title: "거의 완성했고 제출 전 확인이 필요해요",
    description: "문장, 글자 수, 논리와 적합성을 최종 점검해요.",
  },
];

export default function OnboardingPage() {
  const [mode, setMode] = useState<WritingMode | null>(null);
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState(700);
  const [filename, setFilename] = useState("");
  const [fileExtension, setFileExtension] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isTemporarySelection, setIsTemporarySelection] = useState(false);

  const automatic = useMemo(
    () => decideWritingMode({ draft, targetLength: target, hasJobPosting: true }),
    [draft, target],
  );
  const activeMode = mode ?? (draft.trim() ? automatic.mode : null);
  const quickEnabled = activeMode !== null && activeMode !== "CREATE";
  const proHref =
    activeMode === "BUILD" ? "/pro/build" : activeMode === "POLISH" ? "/pro/polish" : "/pro/create";
  // The FINAL routes are already behind this flag; without the same check here
  // the card stayed COMING SOON even where the routes were open, so FINAL could
  // not be walked end to end anywhere — including locally, which is the one
  // place the flag exists for.
  const finalOpen = isFinalEnabled();
  const finalHref =
    activeMode === "BUILD" ? "/final/build" : activeMode === "POLISH" ? "/final/polish" : "/final/create";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const guest = loadGuestDraft();
      if (!guest) return;
      setDraft(guest.draftText);
      setTarget(guest.targetLength);
      setFilename(guest.sourceFilename ?? "");
      setFileExtension(guest.sourceFileExtension ?? "");
      setFileSizeBytes(guest.sourceFileSizeBytes);
      setMode(guest.temporaryWritingMode ?? null);
      setIsTemporarySelection(Boolean(guest.temporaryWritingMode));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!draft.trim()) return;
    saveGuestDraft({
      draftText: draft,
      targetLength: target,
      sourceFilename: filename || undefined,
      sourceFileExtension: fileExtension || undefined,
      sourceFileSizeBytes: fileSizeBytes,
      temporaryWritingMode: activeMode ?? undefined,
    });
  }, [draft, target, filename, fileExtension, fileSizeBytes, activeMode]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const result = await extractLocalDocument(file);
      setDraft(result.text);
      setFilename(result.filename);
      setFileExtension(result.extension);
      setFileSizeBytes(result.sizeBytes);
      setMode(null);
      setIsTemporarySelection(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "파일을 읽지 못했어요.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <main className={styles.page}>
      <header>
        <Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link>
        <Link href="/examples">첨삭 예시</Link>
      </header>
      <div className={`${styles.container} ${activeMode ? styles.hasStickyCta : ""}`}>
        <Link href="/" className={styles.back}><ArrowLeft /> 홈으로</Link>
        <section className={styles.hero}>
          <span>내 작성 단계 확인</span>
          <h1>지금 어디까지 작성하셨나요?</h1>
          <p>상태를 직접 선택하거나, 잘 모르겠다면 작성본을 넣어 임시 추천을 받을 수 있어요.</p>
        </section>

        <div className={styles.options}>
          {options.map(({ id, icon: Icon, label, title, description }) => (
            <button
              key={id}
              className={activeMode === id ? styles.selected : ""}
              onClick={() => {
                setMode(id);
                setIsTemporarySelection(false);
              }}
            >
              <span className={styles.radio} aria-hidden="true" />
              <Icon />
              <small>{label}</small>
              <b>{title}</b>
              <p>{description}</p>
            </button>
          ))}
        </div>

        {activeMode && isTemporarySelection && (
          <div className={styles.autoResult}>
            <ScanSearch />
            <span>
              <b>입력한 내용을 기준으로 임시 선택했어요.</b>
              <small>작성 상태가 다르다면 위 카드에서 바로 변경할 수 있습니다.</small>
            </span>
          </div>
        )}

        <details className={styles.unknown}>
          <summary>어떤 단계인지 모르겠어요 <span>결제 없이 무료로 확인</span></summary>
          <div className={styles.unknownBody}>
            {filename && (
              <AttachmentCard
                filename={filename}
                extension={fileExtension}
                sizeBytes={fileSizeBytes}
                onRemove={() => {
                  setFilename("");
                  setFileExtension("");
                  setFileSizeBytes(undefined);
                }}
              />
            )}
            <div className={styles.privacy}>
              <LockKeyhole />
              <span>
                <b>파일은 이 브라우저 안에서만 읽어요.</b>
                <small>결제 전에는 서버 전송·저장·AI 분석 엔진 호출을 하지 않습니다.</small>
              </span>
            </div>
            <div className={styles.inputs}>
              <label>
                <span>작성 내용</span>
                <textarea
                  rows={7}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMode(null);
                    setIsTemporarySelection(Boolean(event.target.value.trim()));
                  }}
                  placeholder="직접 붙여넣거나 아래에서 파일을 선택하세요."
                />
                <small>공백 제외 {draft.replace(/\s/g, "").length}자 {filename && `· ${filename}`}</small>
              </label>
              <div>
                <label className={styles.upload}>
                  <Upload />{busy ? "파일 확인 중..." : "PDF·DOCX·TXT 선택"}
                  <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFile} disabled={busy} />
                </label>
                <label className={styles.length}>
                  {/* The number drives both the stage we detect and the length
                      the analysis writes to, and it is prefilled — so someone
                      who never touches it gets 700 as if they had chosen it.
                      Saying it is a placeholder is what makes the rest honest. */}
                  <span>목표 글자 수 <small>기본 700자 · 공고에 적힌 분량으로 바꿔 주세요</small></span>
                  <input type="number" min="100" max="3000" value={target} onChange={(event) => setTarget(Number(event.target.value) || 700)} />
                </label>
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {draft.trim() && (
              <div className={styles.autoResult}>
                <ScanSearch />
                <span>
                  <b>{options.find((item) => item.id === automatic.mode)?.label} 단계로 임시 추천해요.</b>
                  <small>분량을 기준으로 한 추천이며 내용의 완성도는 결제 후 분석합니다.</small>
                </span>
              </div>
            )}
          </div>
        </details>

        {activeMode && (
          <section id="onboarding-products" className={styles.products}>
            <div>
              <span>이용 가능한 상품</span>
              <h2>{activeMode === "CREATE" ? "처음 작성은 PRO로 시작합니다." : "원하는 검토 범위를 선택하세요."}</h2>
            </div>
            <div className={styles.productGrid}>
              {quickEnabled ? (
                <Link href="/quick" className={activeMode === "POLISH" ? styles.recommended : ""}>
                  {activeMode === "POLISH" && <em>추천</em>}
                  <small>QUICK · 5,900원</small>
                  <b>작성한 글을 빠르게 첨삭</b>
                  <p>다음 화면에서 글을 입력하거나 파일을 올려 최종 첨삭을 진행해요.</p>
                  <span>QUICK 시작 <ArrowRight /></span>
                </Link>
              ) : (
                <div className={styles.disabled}>
                  <small>QUICK · 이용 불가</small>
                  <b>첨삭할 작성본이 필요해요</b>
                  <p>아직 작성된 글이 없으므로 PRO에서 경험과 소재부터 시작합니다.</p>
                </div>
              )}
              <Link href={proHref} className={activeMode !== "POLISH" ? styles.recommended : ""}>
                {activeMode !== "POLISH" && <em>추천</em>}
                <small>PRO · 12,900원</small>
                <b>{activeMode === "CREATE" ? "무엇을 쓸지부터 함께 찾기" : "공고와 지원자료 전체 분석"}</b>
                <p>소재 선정부터 공고 교차검수까지 한 지원 건을 함께 진행해요.</p>
                <span>PRO 시작 <ArrowRight /></span>
              </Link>
              {finalOpen ? (
                <Link href={finalHref}>
                  <small>FINAL · 19,900원</small>
                  <b>PRO 전체 + AI 모의면접</b>
                  <p>{activeMode === "CREATE" ? "처음 작성부터 지원서를 완성한 뒤" : "지원서 분석과 첨삭을 완료한 뒤"} 실제 답변 평가, 동적 꼬리질문과 면접 최종 리포트까지 이어집니다.</p>
                  <span>FINAL 시작 <ArrowRight /></span>
                </Link>
              ) : (
                <div className={styles.disabled}>
                  <em>COMING SOON</em>
                  <small>FINAL · 19,900원</small>
                  <b>PRO 전체 + AI 모의면접</b>
                  <p>{activeMode === "CREATE" ? "처음 작성부터 지원서를 완성한 뒤" : "지원서 분석과 첨삭을 완료한 뒤"} 실제 답변 평가, 동적 꼬리질문과 면접 최종 리포트까지 이어집니다.</p>
                  <span>처음부터 FINAL 19,900원</span>
                </div>
              )}
            </div>
            <p style={{ margin: "14px 2px 0", color: "#68756f", fontSize: 11, lineHeight: 1.6 }}>FINAL은 처음부터 19,900원에 선택하거나, PRO 이용 후 결과 화면에서 차액 7,000원으로 업그레이드할 수 있어요. 두 경로의 FINAL 이용 범위는 같습니다.</p>
          </section>
        )}
      </div>

      {/* 좁은 화면 전용. 유형을 고르면 상품 섹션이 화면 아래쪽에 조용히
          나타나는데, 스크롤하지 않으면 그게 생겼는지조차 모릅니다. 다음
          할 일을 화면에 항상 붙여 두면 스크롤을 안내할 필요가 없어집니다
          — 토스 같은 앱이 선택 화면마다 쓰는 방식입니다. 데스크톱은
          가릴 콘텐츠가 없어(css에서 숨김) 필요 없습니다. */}
      {activeMode && (
        <div className={styles.stickyCta}>
          <button
            type="button"
            onClick={() => document.getElementById("onboarding-products")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            다음 · 상품 선택하기 <ArrowRight />
          </button>
        </div>
      )}
    </main>
  );
}

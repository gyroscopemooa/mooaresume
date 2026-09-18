"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, FileCheck2, FilePenLine, LockKeyhole, ScanSearch, Upload } from "lucide-react";
import { decideWritingMode, type WritingMode } from "@/domain/writing-mode";
import { isFinalEnabled } from "@/domain/final-availability";
import { FINAL_BASE_PRICE_KRW, PRO_BASE_PRICE_KRW, QUICK_BASE_PRICE_KRW, type ProductTier } from "@/domain/usage-entitlement";
import { carryDraftTextIntoAppIntake, saveAppSelection } from "@/lib/app-intake-draft";
import { AttachmentCard } from "./attachment-card";
import styles from "./app-start-wizard.module.css";

/**
 * 앱의 "시작" 메뉴 — 단계 고르기 → 상품 고르기, 두 화면.
 *
 * 첨삭 홈(`/app`) 위쪽에도 같은 선택(QUICK/PRO/FINAL·작성 유형)이 있습니다.
 * 그쪽은 이미 무엇을 할지 아는 사람이 바로 고르는 자리고, 여기는 **무엇을
 * 골라야 할지 모르는 사람**을 위한 자리입니다. 온보딩에 한 번만 보여 주고
 * 치우면, 두 번째 지원서를 쓸 때 다시 볼 방법이 없어집니다 — 그래서 메뉴로
 * 계속 둡니다.
 *
 * 판단 로직은 웹 `/onboarding`과 같은 `decideWritingMode`를 그대로 씁니다.
 * 파일도 브라우저 안에서만 읽습니다(결제 전 서버 전송·AI 호출 없음).
 * 마지막에 고른 값은 첨삭 홈의 선택으로 저장되고, 화면은 홈으로 넘어갑니다.
 */

const STAGES: Array<{ id: WritingMode; icon: typeof Compass; label: string; title: string; description: string }> = [
  { id: "CREATE", icon: Compass, label: "처음부터 작성", title: "아직 아무것도 못 썼어요", description: "경험을 찾고 소재와 개요부터 함께 만들어요." },
  { id: "BUILD", icon: FilePenLine, label: "내용 보완", title: "써보긴 했는데 내용이 부족해요", description: "부족한 행동과 결과를 확인해 초안을 발전시켜요." },
  { id: "POLISH", icon: FileCheck2, label: "최종 첨삭", title: "거의 완성했고 제출 전 확인이 필요해요", description: "문장, 글자 수, 논리와 적합성을 최종 점검해요." },
];

const PRICE: Record<ProductTier, number> = {
  QUICK: QUICK_BASE_PRICE_KRW,
  PRO: PRO_BASE_PRICE_KRW,
  FINAL: FINAL_BASE_PRICE_KRW,
};

export function AppStartWizard() {
  const router = useRouter();
  const finalOpen = isFinalEnabled();
  const [step, setStep] = useState<1 | 2>(1);
  const [stage, setStage] = useState<WritingMode | null>(null);
  const [fromDraft, setFromDraft] = useState(false);
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState(700);
  const [filename, setFilename] = useState("");
  const [fileExtension, setFileExtension] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>();
  const [checking, setChecking] = useState(false);
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [error, setError] = useState("");

  const automatic = useMemo(
    () => decideWritingMode({ draft, targetLength: target, hasJobPosting: true }),
    [draft, target],
  );

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setChecking(true);
    setError("");
    try {
      // 브라우저 안에서만 읽습니다 — 결제 전에는 서버로 보내지 않습니다.
      const { extractLocalDocument } = await import("@/lib/local-document");
      const result = await extractLocalDocument(file);
      setDraft(result.text);
      setFilename(result.filename);
      setFileExtension(result.extension);
      setFileSizeBytes(result.sizeBytes);
      setStage(null);
      setFromDraft(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "파일을 읽지 못했어요.");
    } finally {
      setChecking(false);
      event.target.value = "";
    }
  }

  const activeStage = stage ?? (draft.trim() ? automatic.mode : null);
  // QUICK은 지금 쓴 글만 봅니다. 작성본이 없으면 첨삭할 것이 없습니다.
  const quickAvailable = activeStage !== null && activeStage !== "CREATE";

  function start(product: ProductTier) {
    if (!activeStage) return;
    saveAppSelection({ product, mode: activeStage });
    // 단계 확인용으로 붙여넣은 글은 입력칸으로 넘깁니다(이미 쓰고 있던 글이
    // 있으면 건드리지 않습니다).
    carryDraftTextIntoAppIntake(draft);
    router.push("/app");
  }

  if (step === 2 && activeStage) {
    const stageLabel = STAGES.find((item) => item.id === activeStage)?.label ?? "";
    return <main className={styles.page}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => setStep(1)}><ArrowLeft/> 단계 다시 고르기</button>
        <span className={styles.stepCount}>2 / 2</span>
      </div>
      <header className={styles.head}>
        <small>이용 가능한 상품</small>
        <h1>{activeStage === "CREATE" ? "처음 작성은 PRO로 시작합니다." : "원하는 검토 범위를 고르세요."}</h1>
        <p>고른 단계: <b>{stageLabel}</b></p>
      </header>

      <div className={styles.products}>
        {quickAvailable
          ? <button type="button" className={activeStage === "POLISH" ? styles.productOn : styles.product} onClick={() => start("QUICK")}>
              {activeStage === "POLISH" && <em>추천</em>}
              <small>QUICK · {PRICE.QUICK.toLocaleString()}원</small>
              <b>작성한 글을 빠르게 첨삭</b>
              <p>다음 화면에서 글을 붙여넣거나 파일을 올려 최종 첨삭을 진행해요.</p>
              <span>QUICK으로 시작 <ArrowRight/></span>
            </button>
          : <div className={styles.locked}>
              <small>QUICK · 이용 불가</small>
              <b>첨삭할 작성본이 필요해요</b>
              <p>아직 쓴 글이 없으니 PRO에서 경험과 소재부터 시작합니다.</p>
            </div>}

        <button type="button" className={activeStage === "POLISH" ? styles.product : styles.productOn} onClick={() => start("PRO")}>
          {activeStage !== "POLISH" && <em>추천</em>}
          <small>PRO · {PRICE.PRO.toLocaleString()}원</small>
          <b>{activeStage === "CREATE" ? "무엇을 쓸지부터 함께 찾기" : "공고와 지원자료 전체 분석"}</b>
          <p>소재 선정부터 공고 교차검수까지 한 지원 건을 함께 진행해요.</p>
          <span>PRO로 시작 <ArrowRight/></span>
        </button>

        {finalOpen
          ? <button type="button" className={styles.product} onClick={() => start("FINAL")}>
              <small>FINAL · {PRICE.FINAL.toLocaleString()}원</small>
              <b>PRO 전체 + AI 모의면접</b>
              <p>지원서 분석과 첨삭을 완료한 뒤 실제 답변 평가와 면접 리포트까지 이어집니다.</p>
              <span>FINAL로 시작 <ArrowRight/></span>
            </button>
          : <div className={styles.locked}>
              <em>준비 중</em>
              <small>FINAL · {PRICE.FINAL.toLocaleString()}원</small>
              <b>PRO 전체 + AI 모의면접</b>
              <p>아직 열리지 않았습니다. PRO 결과 화면에서 업그레이드로 이용할 수 있게 준비하고 있어요.</p>
            </div>}
      </div>
    </main>;
  }

  return <main className={styles.page}>
    <div className={styles.top}>
      <span className={styles.brand}><b>MOOA</b> Resume</span>
      <span className={styles.stepCount}>1 / 2</span>
    </div>
    <header className={styles.head}>
      <small>내 작성 단계 확인</small>
      <h1>지금 어디까지 작성하셨나요?</h1>
      <p>직접 고르거나, 잘 모르겠다면 작성본을 넣어 임시 추천을 받을 수 있어요.</p>
    </header>

    <div className={styles.stages}>
      {STAGES.map(({ id, icon: Icon, label, title, description }) => <button
        key={id}
        type="button"
        className={activeStage === id ? styles.stageOn : styles.stage}
        aria-pressed={activeStage === id}
        onClick={() => { setStage(id); setFromDraft(false); }}
      >
        <Icon/>
        <span>
          <small>{label}</small>
          <b>{title}</b>
          <p>{description}</p>
        </span>
        <i className={styles.radio} aria-hidden="true"/>
      </button>)}
    </div>

    {activeStage && fromDraft && <p className={styles.auto}>
      <ScanSearch/> <span><b>넣으신 내용을 기준으로 임시 선택했어요.</b> 다르면 위에서 바로 바꿀 수 있습니다.</span>
    </p>}

    <section className={styles.unknown}>
      <button type="button" className={styles.unknownToggle} aria-expanded={unknownOpen} onClick={() => setUnknownOpen((open) => !open)}>
        어떤 단계인지 모르겠어요 <em>결제 없이 무료로 확인</em>
      </button>
      {unknownOpen && <div className={styles.unknownBody}>
        {filename && <AttachmentCard
          filename={filename}
          extension={fileExtension}
          sizeBytes={fileSizeBytes}
          onRemove={() => { setFilename(""); setFileExtension(""); setFileSizeBytes(undefined); }}
        />}
        <p className={styles.privacy}>
          <LockKeyhole/>
          <span><b>파일은 이 휴대폰 안에서만 읽어요.</b> 결제 전에는 서버 전송·저장·AI 호출을 하지 않습니다.</span>
        </p>
        <label className={styles.draftField}>
          <span>작성 내용</span>
          <textarea
            rows={6}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setStage(null); setFromDraft(Boolean(event.target.value.trim())); }}
            placeholder="쓰던 자기소개서를 붙여넣거나, 아래에서 파일을 고르세요."
          />
          <small>공백 제외 {draft.replace(/\s/g, "").length}자{filename ? ` · ${filename}` : ""}</small>
        </label>
        <div className={styles.unknownActions}>
          <label className={styles.upload}>
            <Upload/>{checking ? "파일 확인 중..." : "PDF·DOCX·TXT 고르기"}
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={readFile} disabled={checking}/>
          </label>
          <label className={styles.length}>
            <span>목표 글자 수</span>
            <input type="number" min="100" max="3000" inputMode="numeric" value={target} onChange={(event) => setTarget(Number(event.target.value) || 700)}/>
          </label>
        </div>
        <small className={styles.lengthHint}>기본 700자입니다. 공고에 적힌 분량으로 바꿔 주세요 — 단계 추천이 이 숫자를 기준으로 나옵니다.</small>
        {error && <p className={styles.error}>{error}</p>}
        {draft.trim() && <p className={styles.auto}>
          <ScanSearch/>
          <span>
            <b>{STAGES.find((item) => item.id === automatic.mode)?.label} 단계로 임시 추천해요.</b>{" "}
            분량을 기준으로 한 추천이며, 내용의 완성도는 결제 후 분석합니다.
          </span>
        </p>}
      </div>}
    </section>

    <div className={styles.cta}>
      <button type="button" className={styles.next} disabled={!activeStage} onClick={() => setStep(2)}>
        {activeStage ? "다음 · 상품 고르기" : "위에서 단계를 골라 주세요"} <ArrowRight/>
      </button>
    </div>
  </main>;
}

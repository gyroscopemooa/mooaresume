"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { ResumeIntake, type ResumeAttachment } from "@/components/resume-intake";
import { loadGuestDraft, saveGuestDraft } from "@/lib/guest-draft";
import type { WritingMode } from "@/domain/writing-mode";
import { countNonWhitespaceCharacters, createQuickCheckoutQuote, QUICK_SOFT_LIMIT_CHARS } from "@/domain/usage-entitlement";
import { createCoverLetterQuestion, serializeQuestionAnswers, type CoverLetterQuestion } from "@/domain/cover-letter-question";
import styles from "./quick.module.css";

export default function QuickPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<CoverLetterQuestion[]>([createCoverLetterQuestion()]);
  const [file, setFile] = useState<ResumeAttachment | null>(null);
  const [error, setError] = useState("");
  const [writingMode, setWritingMode] = useState<Extract<WritingMode, "BUILD" | "POLISH">>("POLISH");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const guest = loadGuestDraft();
      if (!guest) return;
      setQuestions(guest.questions ?? (guest.questionDrafts ?? [guest.draftText]).map((answer, index) => createCoverLetterQuestion(answer, index)));
      if (guest.temporaryWritingMode === "BUILD" || guest.temporaryWritingMode === "POLISH") {
        setWritingMode(guest.temporaryWritingMode);
      }
      if (guest.sourceFilename) setFile({
        filename: guest.sourceFilename,
        extension: guest.sourceFileExtension ?? "",
        sizeBytes: guest.sourceFileSizeBytes ?? 0,
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function continueFlow() {
    const answers = questions.map((question) => question.answer);
    if (!answers.some((answer) => answer.trim())) {
      setError("첨삭할 자기소개서를 입력하거나 파일을 올려 주세요.");
      return;
    }
    const combinedDraft = serializeQuestionAnswers(questions);
    saveGuestDraft({
      draftText: combinedDraft,
      questionDrafts: answers,
      questions,
      targetLength: 700,
      sourceFilename: file?.filename,
      sourceFileExtension: file?.extension,
      sourceFileSizeBytes: file?.sizeBytes,
      temporaryWritingMode: writingMode,
      selectedProduct: "QUICK",
    });
    router.push("/analysis/prepare");
  }

  const totalCharacters = countNonWhitespaceCharacters(questions.map((question) => question.answer));
  const quote = createQuickCheckoutQuote(totalCharacters);

  return <main className={styles.page}>
    <header><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><span><ShieldCheck/> 입력 자료는 공개되지 않아요</span></header>
    <div className={styles.container}>
      <Link href="/onboarding" className={styles.back}><ArrowLeft/> 상품 선택으로</Link>
      <div className={styles.heading}><span>QUICK · 4,900원 · {writingMode === "BUILD" ? "내용 보완" : "최종 첨삭"}</span><h1>{writingMode === "BUILD" ? "현재 초안을 바탕으로 부족한 내용을 보완합니다." : "작성한 글을 빠르고 정확하게 고칩니다."}</h1><p>{writingMode === "BUILD" ? "새로운 경험을 임의로 만들지 않고 현재 글 안에서 논리와 구체성을 강화합니다." : "말투와 사실을 보존하면서 문장, 글자 수, 논리와 최종 수정본에 집중합니다."}</p></div>
      <section className={styles.form}>
        <ResumeIntake questions={questions} onChange={(next) => { setQuestions(next); setError(""); }} attachment={file} onAttachmentChange={setFile} onError={setError}/>
        <div className={`${styles.usage} ${totalCharacters > QUICK_SOFT_LIMIT_CHARS ? styles.overSoftLimit : ""}`}>
          <div><span>현재 지원서 전체</span><b>공백 제외 {totalCharacters.toLocaleString()}자</b></div>
          <div className={styles.usageBar}><i style={{width: `${Math.min(100, totalCharacters / quote.allowedCharacters * 100)}%`}}/></div>
          {totalCharacters <= QUICK_SOFT_LIMIT_CHARS
            ? <p>권장 {QUICK_SOFT_LIMIT_CHARS.toLocaleString()}자 · 같은 지원 건의 문항을 더 추가할 수 있어요.</p>
            : quote.extraBlocks === 0
              ? <p>권장 분량을 조금 넘었지만 같은 지원 건이라면 추가 결제 없이 계속할 수 있어요.</p>
              : <p>대용량 입력 범위입니다. 결제 전 같은 회사·직무인지 확인하고 총 결제금액을 한 번에 계산해요.</p>}
          {quote.extraBlocks > 0 && <div className={styles.quote}><span>QUICK {quote.basePriceKrw.toLocaleString()}원 + 추가 범위 {quote.extraPriceKrw.toLocaleString()}원</span><strong>예상 결제 {quote.totalPriceKrw.toLocaleString()}원</strong><small>추가 블록 가격은 출시 전 최종 확정됩니다.</small></div>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.submit} onClick={continueFlow}>입력 내용·결제금액 확인 <ArrowRight/></button>
      </section>
      <div className={styles.scope}><b>QUICK에 포함되는 내용</b><span>맞춤법·문장 표현</span><span>논리·구체성</span><span>핵심 개선점 3개</span><span>Before → After</span><span>수정 이유와 최종본</span></div>
      <section className={styles.notIncluded}><FileText/><div><b>공고·이력서까지 함께 보려면 PRO</b><p>QUICK은 지금 작성한 글만 분석합니다. 기업 맞춤성, 경험 배치, 자료 충돌과 면접질문은 PRO 범위입니다.</p></div><Link href="/onboarding">PRO 비교 <ArrowRight/></Link></section>
    </div>
  </main>;
}

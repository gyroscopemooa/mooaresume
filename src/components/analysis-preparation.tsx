"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { loadGuestDraft, type GuestDraft } from "@/lib/guest-draft";
import {
  countNonWhitespaceCharacters,
  createQuickCheckoutQuote,
} from "@/domain/usage-entitlement";
import { writingStyleConfig } from "@/domain/writing-style";
import { ApplicationCaseHandoff } from "@/components/application-case-handoff";
import { QuickCheckoutReturn } from "@/components/quick-checkout-return";
import styles from "./analysis-preparation.module.css";

const scope = {
  QUICK: [
    "맞춤법·표현·논리",
    "핵심 개선점 3개",
    "문항별 Before/After",
    "최종 첨삭본",
  ],
  PRO: [
    "QUICK 전체",
    "공고 요구역량 분석",
    "경험 근거·문항 배치",
    "자료 간 충돌·중복",
    "면접 예상질문",
  ],
} as const;

export function AnalysisPreparation() {
  const [guest, setGuest] = useState<GuestDraft | null>(null);
  const [postingLength, setPostingLength] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setGuest(loadGuestDraft());
      setPostingLength(
        (sessionStorage.getItem("mooa:guest-job-posting:v1") ?? "").replace(
          /\s/g,
          "",
        ).length,
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const product = guest?.selectedProduct ?? "QUICK";
  const totalCharacters = countNonWhitespaceCharacters(
    guest?.questions?.map((question) => question.answer) ??
      guest?.questionDrafts ?? [guest?.draftText ?? ""],
  );
  const quickQuote = createQuickCheckoutQuote(totalCharacters);
  const price =
    product === "PRO"
      ? "9,900원"
      : `${quickQuote.totalPriceKrw.toLocaleString()}원`;
  const modeLabel =
    guest?.temporaryWritingMode === "CREATE"
      ? "처음부터 작성"
      : guest?.temporaryWritingMode === "BUILD"
        ? "내용 보완"
        : "최종 첨삭";

  const styleLabel = writingStyleConfig[guest?.writingStyle ?? "BALANCED"].label;
  return (
    <main className={styles.page}>
      <header>
        <Link href="/" className={styles.brand}>
          <span>M</span>MOOA <b>Resume</b>
        </Link>
        <span>
          <ShieldCheck /> 결제 전 AI 호출 없음
        </span>
      </header>
      <QuickCheckoutReturn />
      <div className={styles.container}>
        <Link href="/onboarding" className={styles.back}>
          <ArrowLeft /> 상품 선택으로
        </Link>
        <section className={styles.heading}>
          <small>분석 시작 전 확인</small>
          <h1>
            입력한 자료와 제공 범위를
            <br />한 번만 확인해 주세요.
          </h1>
          <p>
            지금까지 입력한 내용은 이 브라우저에만 있습니다. 실제 분석은
            로그인과 결제 완료 후 시작합니다.
          </p>
        </section>
        <div className={styles.grid}>
          <section className={styles.summary}>
            <div className={styles.product}>
              <span>{product}</span>
              <strong>{price}</strong>
              <small>
                기업 지원서 1건 · {modeLabel} · {styleLabel}
                {product === "QUICK" && quickQuote.extraBlocks > 0
                  ? ` · 추가 입력 ${quickQuote.extraBlocks}블록`
                  : ""}
              </small>
            </div>
            <div className={styles.materials}>
              <b>준비된 자료</b>
              {guest?.questions
                ?.filter((question) => question.answer.trim())
                .map((question, index) => (
                  <article key={question.id}>
                    <FileText />
                    <span>
                      <strong>
                        {index + 1}.{" "}
                        {question.title.trim() ||
                          `자기소개서 문항 ${index + 1}`}
                      </strong>
                      <small>
                        공백 제외{" "}
                        {countNonWhitespaceCharacters([
                          question.answer,
                        ]).toLocaleString()}
                        자
                        {question.targetLength
                          ? ` / 제한 ${question.targetLength.toLocaleString()}자`
                          : ""}
                      </small>
                    </span>
                    <Check />
                  </article>
                )) ?? (
                <article>
                  <FileText />
                  <span>
                    <strong>
                      자기소개서{" "}
                      {guest?.questionDrafts
                        ? `${guest.questionDrafts.filter((item) => item.trim()).length}문항`
                        : ""}
                    </strong>
                    <small>
                      공백 제외 {totalCharacters.toLocaleString()}자
                      {guest?.sourceFilename
                        ? " · " + guest.sourceFilename
                        : ""}
                    </small>
                  </span>
                  <Check />
                </article>
              )}
              {product === "PRO" && (
                <article>
                  <FileText />
                  <span>
                    <strong>채용공고</strong>
                    <small>공백 제외 {postingLength}자</small>
                  </span>
                  {postingLength > 0 && <Check />}
                </article>
              )}
            </div>
            <div className={styles.privacy}>
              <LockKeyhole />
              <span>
                <b>로그인 후 비공개로 저장합니다.</b>
                <small>
                  공개 링크를 만들지 않고 분석에 필요한 자료만 서버로
                  전송합니다.
                </small>
              </span>
            </div>
          </section>
          <section className={styles.scope}>
            <small>{product} 제공 범위</small>
            <h2>
              {product === "PRO"
                ? "공고와 지원자료 전체를 함께 봅니다."
                : "작성한 글을 빠르게 정밀 첨삭합니다."}
            </h2>
            <ul>
              {scope[product].map((item) => (
                <li key={item}>
                  <Check /> {item}
                </li>
              ))}
            </ul>
            <ApplicationCaseHandoff guest={guest}/>
            <Link href="/result">
              결제 후 결과 화면 샘플 보기 <ArrowRight />
            </Link>
            <p>
              결제가 완료되면 AI 분석을 시작하고 이 형태의 결과 대시보드로
              이동합니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileText,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { loadGuestDraft, type GuestDraft } from "@/lib/guest-draft";
import {
  PRO_BASE_PRICE_KRW,
  PRO_INCLUDED_LIMIT_CHARS,
  countNonWhitespaceCharacters,
  createFinalCheckoutQuote,
  createProCheckoutQuote,
  createQuickCheckoutQuote,
  exceedsQuickCeiling,
} from "@/domain/usage-entitlement";
import { writingStyleConfig } from "@/domain/writing-style";
import { CANDIDATE_MATERIAL_LABEL, candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import { ApplicationCaseHandoff } from "@/components/application-case-handoff";
import { CouponCodeEntry } from "@/components/coupon-code-entry";
import { ReferralCodeEntry } from "@/components/referral-code-entry";
import { QuickCheckoutReturn } from "@/components/quick-checkout-return";
import styles from "./analysis-preparation.module.css";

const scope = {
  // "QUICK 전체"로 뭉뚱그리면 PRO 화면만 보는 사람은 무엇이 포함인지 모른다.
  // 그리고 채우기 여부가 두 상품의 실제 경계이므로 양쪽 목록에 명시한다 —
  // 밝히지 않으면 QUICK 구매자의 환불 사유가 된다.
  QUICK: [
    "맞춤법·표현·논리",
    "핵심 개선점 3개",
    "문항별 Before/After",
    "최종 첨삭본",
    "부족한 부분 지적 (내용을 대신 채우지는 않습니다)",
  ],
  PRO: [
    "첨삭·개선점·Before/After·최종본 전부",
    "빈 문항과 부족한 분량을 실제로 채움",
    "이력서·경력기술서와 자소서 교차 확인",
    "공고 요구역량 분석",
    "경험 근거·문항 배치",
    "면접 예상질문과 면접 리스크",
  ],
  FINAL: [
    "PRO가 하는 것 전부",
    "이력서 × 자소서 교차검증과 커리어 타임라인",
    "탈락요인 점검과 네 가지 관점 검토",
    "주장마다 근거가 있는지 확인",
    "면접관이 물어볼 지점과 꼬리질문",
  ],
} as const;

export function AnalysisPreparation() {
  const [guest, setGuest] = useState<GuestDraft | null>(null);
  const [postingLength, setPostingLength] = useState(0);
  const [materialSummary, setMaterialSummary] = useState<string[]>([]);
  const [confirmedProduct, setConfirmedProduct] = useState<"QUICK" | "PRO" | "FINAL" | null>(null);
  const [hasResumeMaterial, setHasResumeMaterial] = useState(true);
  // Lifted here because the checkout button and the progress screen are
  // siblings on this one page. A URL parameter would not remount either of
  // them, so the progress screen would never learn the run had started.
  const [creditRunId, setCreditRunId] = useState<string | null>(null);
  // 이미 시작된 분석에 대해 다시 결정을 묻지 않기 위한 신호.
  const [runActive, setRunActive] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setGuest(loadGuestDraft());
      setPostingLength(
        (sessionStorage.getItem("mooa:guest-job-posting:v1") ?? "").replace(
          /\s/g,
          "",
        ).length,
      );
      // The résumé is what makes a PRO run different — it is the document that
      // catches a mismatch between the letter and the applicant's own record —
      // so it has to appear in the list of what is about to be analysed.
      const materials = candidateMaterialDraftSchema.safeParse(
        JSON.parse(sessionStorage.getItem("mooa:guest-candidate-materials:v1") ?? "null"),
      );
      // A résumé, a career document, or a company application form — any of the
      // three stands in for one. Tracked separately from the summary list
      // because the warning below has to fire on absence, and an absence cannot
      // be read off a list of what is present without knowing what to look for.
      setHasResumeMaterial(materials.success
        && materials.data.materialAttachments.some((file) => file.kind === "RESUME" || file.kind === "CAREER_DOCUMENT"));
      setMaterialSummary(materials.success
        ? [
            ...materials.data.materialAttachments.map((file) => `${CANDIDATE_MATERIAL_LABEL[file.kind]} · ${file.filename}`),
            ...materials.data.freeformAttachments.map((file) => `추가 자료 · ${file.filename}`),
            ...(materials.data.profileEntries.length > 0 ? [`자격·스펙 ${materials.data.profileEntries.length}개`] : []),
            ...(materials.data.experiences.length > 0 ? [`추가 경험 ${materials.data.experiences.length}개`] : []),
          ]
        : []);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // Once a checkout has actually been paid, trust the server's own record of
  // what was purchased over the browser's local draft, which can go stale or
  // get lost on the round trip to Polar and back.
  const product = confirmedProduct ?? guest?.selectedProduct ?? "QUICK";
  // What the analysis will actually see: the server re-splits the stored cover
  // letter, so a whole-letter paste becomes several questions there while the
  // browser still holds it as one.
  const analysedQuestions = useMemo(() => {
    const stored = guest?.questions ?? [];
    const isBulk = stored.length === 1 && !stored[0].title.trim() && !stored[0].prompt.trim();
    if (!isBulk) return stored;
    const split = splitCoverLetterDraft(stored[0].answer);
    return split.length > 1 ? split : stored;
  }, [guest?.questions]);

  const totalCharacters = countNonWhitespaceCharacters(
    guest?.questions?.map((question) => question.answer) ??
      guest?.questionDrafts ?? [guest?.draftText ?? ""],
  );
  const quickQuote = createQuickCheckoutQuote(totalCharacters);
  const filledQuestionCount = guest?.questions?.filter((question) => question.answer.trim()).length ?? guest?.questionDrafts?.filter((question) => question.trim()).length ?? (guest?.draftText?.trim() ? 1 : 0);
  const totalQuestionCount = guest?.questions?.length ?? guest?.questionDrafts?.length ?? (guest?.draftText !== undefined ? 1 : 0);
  const missingQuestionCount = Math.max(totalQuestionCount - filledQuestionCount, 0);
  // 등급마다 자기 견적을 씁니다.
  //
  // FINAL fell into the else branch and was shown the QUICK quote, so a 19,900원
  // product advertised itself at 8,800원 — QUICK's base plus one extra block.
  const quote =
    product === "FINAL" ? createFinalCheckoutQuote(totalCharacters)
    : product === "PRO" ? createProCheckoutQuote(totalCharacters)
    : quickQuote;
  const price = `${quote.totalPriceKrw.toLocaleString()}원`;
  const modeLabel =
    guest?.temporaryWritingMode === "CREATE"
      ? "처음부터 작성"
      : guest?.temporaryWritingMode === "BUILD"
        ? "내용 보완"
        : "최종 첨삭";

  /*
   * How full the answers are, per question.
   *
   * The numbers are already on this screen — "공백 제외 409자 / 제한 700자" sits
   * beside every question — but nothing said what they mean. Someone heading
   * into 최종 첨삭 at 64% gets a polished answer that is still short, and only
   * learns it after paying, when switching mode costs another payment. This is
   * the last screen where changing your mind is free.
   */
  const answeredQuestions = analysedQuestions.filter((question) => question.answer.trim());
  const fillRatio = answeredQuestions.length > 0
    ? answeredQuestions.reduce((total, question) => {
        const target = question.targetLength ?? guest?.targetLength ?? 700;
        return total + Math.min(countNonWhitespaceCharacters([question.answer]) / target, 1);
      }, 0) / answeredQuestions.length
    : 1;
  // Same threshold decideWritingMode uses to route a draft to 내용 보완, so the
  // notice and the recommendation cannot disagree.
  const underFilledForPolish = guest?.temporaryWritingMode === "POLISH" && fillRatio < 0.78;

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
      <QuickCheckoutReturn onProductConfirmed={setConfirmedProduct} creditRunId={creditRunId} onRunActive={setRunActive} />
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
              {/* The three PRO modes cost the same and read the same on this
                  screen, so the only place the choice was visible was an 8px
                  grey line below the price. Wrong-mode runs are unrecoverable
                  — the analysis is paid for and consumed — so the mode belongs
                  beside the product name, not in the fine print. */}
              <span>{product}{product === "PRO" && <em className={styles.mode}>{modeLabel}</em>}</span>
              <strong>{price}</strong>
              <small>
                기업 지원서 1건 · {modeLabel} · {styleLabel}
                {product === "QUICK" && quickQuote.extraBlocks > 0
                  ? ` · 추가 입력 ${quickQuote.extraBlocks}블록`
                  : ""}
              </small>
            </div>
            {underFilledForPolish && (
              // Informing, never blocking. A short answer can be a deliberate
              // choice; a wrong mode cannot be undone after payment.
              <p className={styles.shortNotice}>
                문항당 목표 분량의 <b>{Math.round(fillRatio * 100)}%</b>가 작성돼 있습니다. 최종 첨삭은 <b>이미 쓰신 내용을 풀어 쓰는 데까지만</b> 합니다. 이력서에서 새 소재를 가져와 채우려면 <b>내용 보완</b>이 맞습니다.
                <Link href="/onboarding">유형 다시 고르기 <ArrowRight /></Link>
              </p>
            )}
            {product === "QUICK" && missingQuestionCount > 0 && (
              <p className={styles.missingNotice}>작성되지 않은 문항 {missingQuestionCount}개는 첨삭·생성 대상에서 제외됩니다. 빈 문항까지 보완하려면 PRO · 내용 보완으로 진행해 주세요.</p>
            )}
            {/* 이 분량에서는 QUICK이 손님에게 손해입니다.
                8,000자를 품고 7,000자마다 2,900원을 더 받다 보면 PRO 값에
                닿고, 결국 넘습니다. 무엇이 더 싼지는 우리가 알고 손님은
                모릅니다 — 알면 아무도 고르지 않을 선택지를 모른다는 이유로
                파는 것은 팔 이유가 되지 못합니다.
                막지는 않습니다. 사실을 말하고 고르게 합니다. */}
            {product === "QUICK" && exceedsQuickCeiling(totalCharacters) && (
              <p className={styles.betterTierNotice}>
                <b>이 분량은 PRO가 더 낫습니다.</b>{" "}
                지금 QUICK으로 진행하면 {quickQuote.totalPriceKrw.toLocaleString("ko-KR")}원인데,
                PRO는 {PRO_BASE_PRICE_KRW.toLocaleString("ko-KR")}원에 공고 요구역량 대조와 경험 근거 매칭,
                면접 예상질문까지 포함하고 {PRO_INCLUDED_LIMIT_CHARS.toLocaleString("ko-KR")}자까지 추가금이 없습니다.
                <Link href="/pro/polish">PRO로 진행하기 <ArrowRight /></Link>
              </p>
            )}
            <div className={styles.materials}>
              <b>준비된 자료</b>
              {analysedQuestions
                .filter((question) => question.answer.trim())
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
                ))}
              {analysedQuestions.length === 0 && (
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
              {product !== "QUICK" && (
                <article>
                  <FileText />
                  <span>
                    <strong>채용공고</strong>
                    <small>공백 제외 {postingLength}자</small>
                  </span>
                  {postingLength > 0 && <Check />}
                </article>
              )}
              {product !== "QUICK" && materialSummary.map((item) => (
                <article key={item}>
                  <FileText />
                  <span><strong>{item.split(" · ")[0]}</strong><small>{item.split(" · ")[1] ?? "직접 입력"}</small></span>
                  <Check />
                </article>
              ))}
            </div>
            {product !== "QUICK" && !hasResumeMaterial && (
              // Not a blocker. Some applicants genuinely have no résumé — a new
              // graduate often has only the employer's own application form —
              // and refusing to run would cost them the analysis entirely.
              //
              // One line, no argument. The list of what will come back empty
              // was here and was cut: this notice sits on the last screen
              // before payment, and a paragraph explaining what they are about
              // to miss reads as pressure at exactly the wrong moment. Someone
              // who wants the detail has it on the input screen and in the
              // guide; what they need here is to know, and to move on.
              <div className={styles.resumeNotice}>
                <TriangleAlert />
                <span><b>이력서(입사지원서) 없이 진행합니다.</b></span>
              </div>
            )}
            <div className={styles.runtimeNotice}>
              <Clock />
              <span>
                <b>분석에는 5~10분 정도 걸립니다.</b>
                <small>분석에는 5~10분이 걸립니다. 창을 닫으셔도 서버에서 계속 진행되고, 끝나면 결과 링크를 이메일로 보내드립니다. 기다리시면 완료 즉시 결과 화면으로 이동합니다. 분석에 실패하면 추가 결제 없이 다시 시도할 수 있습니다.</small>
              </span>
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
            {/* Sits with the other notes rather than in the middle of the
                decision. It is optional, and most people do not have a code. */}
            <div className={styles.referralNote}><ReferralCodeEntry compact requireSignIn returnTo="/analysis/prepare" /></div>
            {/* 추천코드 바로 아래, 그러나 같은 칸이 아닙니다. 추천코드는 넣은
                사람이 결제해야 추천한 사람에게 이용권이 가고, 쿠폰은 넣는 즉시
                넣은 사람이 받습니다. 한 칸이면 그 차이를 물어보게 됩니다. */}
            <div className={styles.referralNote}><CouponCodeEntry compact requireSignIn returnTo="/analysis/prepare" /></div>
          </section>
          <section className={styles.scope}>
            <small>{product} 제공 범위</small>
            <h2>
              {product === "FINAL"
                ? "제출 직전 지원서 전체를 검증하고 면접까지 잇습니다."
                : product === "PRO"
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
            <ApplicationCaseHandoff guest={guest} onCreditRunStarted={setCreditRunId} runActive={runActive || Boolean(creditRunId)}/>
            {/* /result/sample rather than /result: with no id, /result falls
                back to the visitor's most recent analysis, so a returning
                customer pressing "샘플 보기" was shown their own past result. And
                in a new tab, because this sits directly under the pay button —
                the one place a link away is a checkout abandoned. */}
            <a href="/result/sample" target="_blank" rel="noopener noreferrer">
              결제 후 결과 화면 샘플 보기 <ArrowRight />
            </a>
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

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
} from "lucide-react";
import { loadGuestDraft, type GuestDraft } from "@/lib/guest-draft";
import {
  countNonWhitespaceCharacters,
  createQuickCheckoutQuote,
} from "@/domain/usage-entitlement";
import { writingStyleConfig } from "@/domain/writing-style";
import { CANDIDATE_MATERIAL_LABEL, candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { splitCoverLetterDraft } from "@/domain/cover-letter-parser";
import { ApplicationCaseHandoff } from "@/components/application-case-handoff";
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
} as const;

export function AnalysisPreparation() {
  const [guest, setGuest] = useState<GuestDraft | null>(null);
  const [postingLength, setPostingLength] = useState(0);
  const [materialSummary, setMaterialSummary] = useState<string[]>([]);
  const [confirmedProduct, setConfirmedProduct] = useState<"QUICK" | "PRO" | null>(null);

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
  const price =
    product === "PRO"
      ? "12,900원"
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
      <QuickCheckoutReturn onProductConfirmed={setConfirmedProduct} />
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
            {product === "QUICK" && missingQuestionCount > 0 && (
              <p className={styles.missingNotice}>작성되지 않은 문항 {missingQuestionCount}개는 첨삭·생성 대상에서 제외됩니다. 빈 문항까지 보완하려면 PRO · 내용 보완으로 진행해 주세요.</p>
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
              {product === "PRO" && materialSummary.map((item) => (
                <article key={item}>
                  <FileText />
                  <span><strong>{item.split(" · ")[0]}</strong><small>{item.split(" · ")[1] ?? "직접 입력"}</small></span>
                  <Check />
                </article>
              ))}
            </div>
            <div className={styles.runtimeNotice}>
              <Clock />
              <span>
                <b>분석에는 5~10분 정도 걸립니다.</b>
                <small>창을 닫아도 계속 진행되고, 끝나면 이메일로 결과 링크를 보내드립니다. 분석에 실패하면 추가 결제 없이 다시 시도할 수 있습니다.</small>
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

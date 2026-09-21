import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis, type AdminAnalysisDetail } from "@/server/admin/admin-repository";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { resultDocumentSchema } from "@/domain/result-document";
import styles from "../../admin.module.css";
import { MODE_LABEL, kst } from "../../format";
import { Pill } from "../../pill";

export const dynamic = "force-dynamic";

type ResultQuestion = {
  id?: string;
  order?: number;
  title?: string;
  subheading?: string;
  originalAnswer?: string;
  revisedAnswer?: string;
  revisionReasons?: string[];
};

/**
 * Read loosely rather than through `resultDocumentSchema`.
 *
 * A record written by an older prompt version must still be openable here —
 * this screen exists to inspect results, and refusing to render the ones that
 * no longer validate would hide exactly the cases worth looking at. Anything
 * unreadable falls through to the raw JSON below.
 */
function readQuestions(data: unknown): ResultQuestion[] {
  if (!data || typeof data !== "object") return [];
  const questions = (data as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];
  return questions.filter((question): question is ResultQuestion => Boolean(question) && typeof question === "object");
}

const DOCUMENT_KIND_LABEL: Record<string, string> = {
  COVER_LETTER: "자기소개서",
  JOB_POSTING: "채용공고",
  RESUME: "이력서",
  CAREER_DOCUMENT: "경력기술서",
  PORTFOLIO: "포트폴리오",
  CERTIFICATE: "자격·증명서",
  APPLICANT_NOTE: "추가 사실",
  REVISION_REQUEST: "재첨삭 요청",
  OTHER: "기타 자료",
};

const PURPOSE_LABEL: Record<string, string> = {
  PRIMARY: "주 분석 대상",
  REFERENCE: "참고 자료",
};

const STYLE_LABEL: Record<string, string> = {
  CONCISE: "간결형",
  BALANCED: "균형형",
  STRENGTH_FOCUSED: "강점 강조형",
};

const STANCE_LABEL: Record<string, string> = {
  SAFE: "안정형",
  BALANCED: "균형형",
  CONVICTION: "소신 강조형",
};

const REFERENCE_PRIORITY: Record<string, number> = {
  JOB_POSTING: 1, RESUME: 2, CERTIFICATE: 3, APPLICANT_NOTE: 4,
  CAREER_DOCUMENT: 5, REVISION_REQUEST: 6, PORTFOLIO: 7,
};

function inputCoverage(detail: AdminAnalysisDetail) {
  const perDocumentLimit = detail.run.paid ? 20_000 : 10_000;
  const referenceBudget = detail.run.product === "QUICK" ? 0 : (detail.run.paid ? 60_000 : 30_000);
  let spentReference = 0;
  const referenceOrder = [...detail.inputDocuments]
    .filter((document) => document.purpose !== "PRIMARY")
    .sort((left, right) => (REFERENCE_PRIORITY[left.kind] ?? 8) - (REFERENCE_PRIORITY[right.kind] ?? 8) || left.createdAt.localeCompare(right.createdAt));
  const used = new Map<string, number>();
  for (const document of detail.inputDocuments.filter((item) => item.purpose === "PRIMARY")) {
    used.set(document.createdAt + document.title, Math.min(document.normalizedText.length, perDocumentLimit));
  }
  for (const document of referenceOrder) {
    const cappedLength = Math.min(document.normalizedText.length, perDocumentLimit);
    const included = spentReference + cappedLength <= referenceBudget ? cappedLength : 0;
    used.set(document.createdAt + document.title, included);
    spentReference += cappedLength;
  }
  return { perDocumentLimit, referenceBudget, used };
}

function InputSnapshot({ detail }: { detail: AdminAnalysisDetail }) {
  const { run, inputDocuments } = detail;
  const coverage = inputCoverage(detail);
  const referenceDocuments = inputDocuments.filter((document) => document.purpose !== "PRIMARY");

  return <section className={styles.panel}>
    <div className={styles.panelHead}>
      <div><h2>분석 입력 스냅샷</h2><small>분석을 시작한 당시의 불변 문서 버전입니다. 이후 사용자가 바꾼 자료는 섞이지 않습니다.</small></div>
      <small>{inputDocuments.length}개 자료</small>
    </div>
    <div className={styles.meta}>
      <div><span>상품</span><strong>{run.product}</strong></div>
      <div><span>작성 단계</span><strong>{MODE_LABEL[run.writingMode] ?? run.writingMode}</strong></div>
      <div><span>문체</span><strong>{STYLE_LABEL[detail.writingStyle ?? ""] ?? detail.writingStyle ?? "—"}</strong></div>
      <div><span>첨삭 방향</span><strong>{STANCE_LABEL[detail.editingStance ?? ""] ?? detail.editingStance ?? "—"}</strong></div>
    </div>
    <p className={styles.hint}>
      {run.product === "QUICK"
        ? `QUICK은 자기소개서만 분석합니다. 참고 자료 ${referenceDocuments.length}개는 제출되었더라도 결과 생성에는 넣지 않습니다.`
        : `${run.paid ? "유료" : "무료 이용권"} 분석 기준: 자료 한 개당 최대 ${coverage.perDocumentLimit.toLocaleString("ko-KR")}자, 참고 자료 전체 최대 ${coverage.referenceBudget.toLocaleString("ko-KR")}자까지 투입됩니다. 각 자료에 실제 투입된 범위도 아래에 표시합니다.`}
    </p>
    {inputDocuments.length === 0 ? <p className={styles.empty}>저장된 입력 스냅샷을 읽지 못했습니다.</p> : <div className={styles.inputSnapshotList}>
      {inputDocuments.map((document, index) => {
        const excludedFromQuick = run.product === "QUICK" && document.purpose !== "PRIMARY";
        const includedLength = coverage.used.get(document.createdAt + document.title) ?? 0;
        const inputStatus = excludedFromQuick
          ? "QUICK 미사용"
          : includedLength === 0 ? "참고 자료 한도 초과 · 미투입"
            : includedLength < document.normalizedText.length ? `앞부분 ${includedLength.toLocaleString("ko-KR")}자만 투입`
              : "전체 투입";
        return <details key={`${document.title}-${index}`} className={styles.inputSnapshot}>
          <summary>
            <span><b>{DOCUMENT_KIND_LABEL[document.kind] ?? document.kind}</b><em>{PURPOSE_LABEL[document.purpose] ?? document.purpose} · {inputStatus}</em></span>
            <span>{document.filename ?? document.title} · {document.characterCount.toLocaleString("ko-KR")}자</span>
          </summary>
          <div>
            <dl><dt>자료 제목</dt><dd>{document.title}</dd><dt>입력 방식</dt><dd>{document.sourceType}</dd>{document.filename && <><dt>파일명</dt><dd>{document.filename}</dd></>}</dl>
            <pre className={styles.inputText}>{document.normalizedText || "(텍스트를 추출하지 못한 자료)"}</pre>
          </div>
        </details>;
      })}
    </div>}
  </section>;
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAnalysis(id);
  if (!detail) notFound();

  const { run, resultData } = detail;
  const parsedResult = resultDocumentSchema.safeParse(resultData);
  const questions = readQuestions(resultData);
  const readiness = (resultData as { readiness?: { score?: number; label?: string; summary?: string } } | null)?.readiness;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>{run.companyName || run.caseTitle || "첨삭 결과"}</h1>
          <p>{run.email} · {run.product} · {MODE_LABEL[run.writingMode] ?? run.writingMode}</p>
        </div>
        <Link href="/meensoo/analyses" className={styles.mono}>← 목록으로</Link>
      </div>

      <section className={styles.panel}>
        <div className={styles.meta}>
          <div><span>상태</span><strong><Pill status={run.status} /></strong></div>
          <div><span>시작</span><strong>{kst(run.createdAt)}</strong></div>
          <div><span>완료</span><strong>{kst(run.completedAt)}</strong></div>
          <div><span>목표 분량</span><strong>{detail.targetLength ? `${detail.targetLength}자` : "—"}</strong></div>
          <div><span>모델</span><strong>{run.model ?? "—"}</strong></div>
          <div><span>프롬프트</span><strong>{run.promptVersion ?? "—"}</strong></div>
          <div><span>토큰</span><strong>{run.totalTokens?.toLocaleString("ko-KR") ?? "—"}</strong></div>
          <div><span>실행 ID</span><strong className={styles.mono}>{run.id}</strong></div>
        </div>
      </section>

      <InputSnapshot detail={detail} />

      {parsedResult.success && (
        <section className={styles.adminResultPreview}>
          <div className={styles.panelHead}>
            <div><h2>신청자 결과표 미리보기</h2><small>신청자가 받은 결과 화면과 같은 구성입니다. 관리자 읽기 모드라 재첨삭·추천·동의 같은 사용자 동작은 표시하지 않습니다.</small></div>
          </div>
          <ResultWorkspaceComplete result={parsedResult.data} analysisRunId={run.id} adminPreview />
        </section>
      )}

      {!parsedResult.success && readiness && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>준비도</h2><small>{readiness.score}점 · {readiness.label}</small></div>
          <div className={styles.question}><p className={styles.prose}>{readiness.summary}</p></div>
        </section>
      )}

      {!parsedResult.success && questions.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>문항별 결과</h2><small>{questions.length}문항</small></div>
          {questions.map((question, index) => (
            <div key={question.id ?? index} className={styles.question}>
              <h3>{question.order ?? index + 1}. {question.title ?? "제목 없음"}</h3>
              {question.subheading && <p className={styles.mono}>소제목: {question.subheading}</p>}

              <h4>원문</h4>
              <p className={styles.prose}>{question.originalAnswer?.trim() || "(비어 있음)"}</p>

              <h4>첨삭본</h4>
              <p className={styles.prose}>{question.revisedAnswer?.trim() || "(없음)"}</p>

              {question.revisionReasons && question.revisionReasons.length > 0 && (
                <>
                  <h4>수정 이유</h4>
                  <p className={styles.prose}>{question.revisionReasons.map((reason) => `· ${reason}`).join("\n")}</p>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {run.failureCode && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>실패</h2></div>
          <div className={styles.question}><p className={styles.mono}>{run.failureCode}</p></div>
        </section>
      )}

      <section className={styles.panel}>
        {/* The structured view above covers the common shape; the raw record is
            what to read when a result looks wrong in a way the view hides. */}
        <details className={styles.details}>
          <summary>저장된 원본 JSON 보기</summary>
          <pre className={styles.raw}>{resultData ? JSON.stringify(resultData, null, 2) : "결과가 저장되지 않았습니다."}</pre>
        </details>
      </section>
    </>
  );
}

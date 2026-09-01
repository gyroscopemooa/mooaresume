"use client";

import { CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { computeFinalVerdict, countAnswerStructure } from "@/domain/final-verdict";
import type { ResultDocument } from "@/domain/result-document";
import styles from "./final-verification.module.css";

/**
 * FINAL's verification screen.
 *
 * Kept out of result-workspace-complete.tsx, which is already long and shared
 * by QUICK and PRO. This tab renders only FINAL's own findings, so a change
 * here cannot reach the two products that came before it.
 *
 * Two rules run through the whole file:
 *
 * 1. Every number on screen is computed here from quoted sentences the
 *    applicant can read back. Nothing is a figure the model felt its way to.
 * 2. An empty section says why it is empty. Silence reads as "nothing was
 *    found", and "we could not look" is a different answer.
 */

const SOURCE_LABEL: Record<string, string> = {
  conflict: "이력서 대조",
  rejection: "탈락요인",
  interviewer: "면접관 시선",
  claim: "주장·근거",
};

const LENS_LABEL: Record<string, string> = {
  hr: "인사담당자",
  field_lead: "현업 팀장",
  domain_expert: "직무 전문가",
  editor: "첨삭 전문가",
};

const HANDLING_LABEL: Record<string, { label: string; tone: string }> = {
  removed: { label: "첨삭본에서 제거", tone: "tagOk" },
  softened: { label: "완화함", tone: "tagOk" },
  // Not a leftover problem — a decision the applicant made by choosing 소신 강조형.
  kept_by_choice: { label: "선택에 따라 유지", tone: "tagLow" },
  needs_applicant: { label: "확인 필요", tone: "tagMedium" },
};

const CLAIM_VERDICT: Record<string, { label: string; tone: string }> = {
  supported: { label: "근거 있음", tone: "tagOk" },
  weak: { label: "근거 약함", tone: "tagMedium" },
  unsupported: { label: "근거 없음", tone: "tagHigh" },
};

const SEVERITY_LABEL: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };

function Panel({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export function FinalVerification({ result, hasResume }: { result: ResultDocument; hasResume: boolean }) {
  const verdict = computeFinalVerdict(result);
  // Said once, in the two places it would otherwise look like "we found
  // nothing wrong with your dates".
  const noResumeNote = "이력서(입사지원서)를 올리지 않아 대조하지 못했습니다. 이력서를 넣고 다시 돌리면 이 항목이 채워집니다.";

  return (
    <div className={styles.wrap}>
      <section className={styles.verdict}>
        <div className={styles.verdictHead}>
          <div>
            <span>FINAL 판정</span>
            <h2>{verdict.label}</h2>
          </div>
          {/* "고치고 다시 돌리면 이 숫자가 줄어듭니다"라고 적혀 있었습니다.
              돈을 한 번 더 내라는 말로 읽힙니다 — 그럴 필요가 없고, 여기서
              나온 것은 옆 탭에서 그대로 정리할 수 있습니다. */}
          <small>아래 항목은 <b>제출 전 마무리</b>에서 할 일 순서로 정리해 두었습니다</small>
        </div>
        {verdict.count === 0 ? (
          <p className={styles.clear}>
            이번 분석에서 심각도 높은 위험요소는 나오지 않았습니다. 아래 항목들은 그대로 확인해 보시고, 남은 것은 면접 준비 쪽에서 이어가시면 됩니다.
          </p>
        ) : (
          <ul className={styles.verdictList}>
            {verdict.items.map((item, index) => (
              <li key={`${item.source}-${index}`}>
                <span className={`${styles.sev} ${item.severity === "high" ? styles.sevHigh : styles.sevMedium}`}>{SEVERITY_LABEL[item.severity]}</span>
                <span className={styles.from}>{SOURCE_LABEL[item.source]}</span>
                <b>{item.headline}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Panel
        eyebrow="RED TEAM"
        title="이 지원서를 떨어뜨린다면"
        description="좋은 점을 찾는 대신 반대 방향으로 읽었습니다. 평가자가 감점 사유로 쓸 수 있는 지점만 모았습니다."
      >
        {result.rejectionRisks.length === 0 ? (
          <p className={styles.empty}>감점 사유로 삼을 만한 지점을 찾지 못했습니다.</p>
        ) : (
          <div className={styles.cards}>
            {result.rejectionRisks.map((risk) => {
              const handling = HANDLING_LABEL[risk.handling];
              return (
                <article key={risk.id}>
                  <div className={styles.cardTop}>
                    <b>{risk.headline}</b>
                    <span className={`${styles.tag} ${styles[`tag${risk.severity === "high" ? "High" : risk.severity === "medium" ? "Medium" : "Low"}`]}`}>위험 {SEVERITY_LABEL[risk.severity]}</span>
                    <span className={`${styles.tag} ${styles[handling.tone]}`}>{handling.label}</span>
                  </div>
                  <p className={styles.quote}>{risk.evidenceQuote}</p>
                  <p>{risk.reason}</p>
                  <p><b>이렇게 하면 됩니다.</b> {risk.fix}</p>
                </article>
              );
            })}
          </div>
        )}
        <div className={styles.honest}>
          <Info/>
          <p><b>&ldquo;선택에 따라 유지&rdquo;</b>는 문제가 남았다는 뜻이 아닙니다. 고르신 첨삭 방향에 따라 지원자의 표현을 일부러 살린 것이고, 위험이 있다는 사실만 알려드리는 것입니다.</p>
        </div>
      </Panel>

      <Panel
        eyebrow="FOUR LENSES"
        title="네 가지 관점에서 점검했습니다"
        description="같은 지원서를 인사담당자·현업 팀장·직무 전문가·첨삭 전문가의 시선으로 나눠 읽었습니다. 관점마다 걸리는 지점이 다릅니다."
      >
        {result.reviewerNotes.length === 0 ? (
          <p className={styles.empty}>네 관점 모두에서 따로 지적할 것이 없었습니다.</p>
        ) : (
          <div className={styles.lenses}>
            {result.reviewerNotes.map((note) => (
              <article key={note.id}>
                <div className={styles.cardTop}>
                  <b>{LENS_LABEL[note.lens] ?? note.lens}</b>
                </div>
                <p className={styles.quote}>{note.evidenceQuote}</p>
                <p>{note.finding}</p>
                <p><b>제안.</b> {note.recommendation}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="CLAIM → EVIDENCE"
        title="주장마다 근거가 있는지"
        description="&ldquo;문제해결 능력이 있습니다&rdquo;는 지원자에 대한 사실이 아니라, 다른 문장이 증명해야 할 약속입니다. 약속과 그 값을 나란히 놓았습니다."
      >
        {result.claimEvidence.length === 0 ? (
          <p className={styles.empty}>따로 검증할 만큼 강한 주장이 없었습니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead><tr><th>주장</th><th>근거</th><th>판정</th></tr></thead>
              <tbody>
                {result.claimEvidence.map((item) => {
                  const verdictTone = CLAIM_VERDICT[item.verdict];
                  return (
                    <tr key={item.id}>
                      <td>{item.claim}</td>
                      {/* Null is the finding, not missing data: nothing in the
                          application backs this claim up. */}
                      <td>{item.evidenceQuote ?? <em>지원서에서 찾지 못했습니다</em>}<small>{item.note}</small></td>
                      <td><span className={`${styles.tag} ${styles[verdictTone.tone]}`}>{verdictTone.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="FIRST READ"
        title="처음 읽었을 때 남는 것"
        description="읽는 사람은 쓴 사람만큼 꼼꼼히 읽지 않습니다. 첫 문단에서 남는 것이 결국 남는 전부입니다."
      >
        {!result.firstImpression ? (
          <p className={styles.empty}>첫인상 점검 결과가 없습니다.</p>
        ) : (
          <>
            <div className={styles.impression}>
              <div className={styles.kept}>
                <h4>기억에 남는 것</h4>
                {result.firstImpression.remembered.length === 0
                  ? <p className={styles.empty}>또렷하게 남는 것이 없습니다.</p>
                  : <ul>{result.firstImpression.remembered.map((item) => <li key={item}>{item}</li>)}</ul>}
              </div>
              <div className={styles.lost}>
                <h4>남아야 하는데 남지 않는 것</h4>
                {result.firstImpression.missing.length === 0
                  ? <p className={styles.empty}>빠진 것이 없습니다.</p>
                  : <ul>{result.firstImpression.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
              </div>
            </div>
            {result.firstImpression.openingIssue && <p className={styles.reading}><b>첫 두 문단.</b> {result.firstImpression.openingIssue}</p>}
            <p className={styles.reading}><b>이렇게 바꾸세요.</b> {result.firstImpression.advice}</p>
          </>
        )}
      </Panel>

      <Panel
        eyebrow="STRUCTURE X-RAY"
        title="문항마다 무엇으로 채워져 있는지"
        description="첨삭본의 문장을 상황·본인 행동·결과·직무 연결로 나눴습니다. 아래 숫자는 그 문장들을 세어 계산한 값입니다."
      >
        {result.answerStructures.length === 0 ? (
          <p className={styles.empty}>문항 구성 분석 결과가 없습니다.</p>
        ) : (
          <div className={styles.xray}>
            {result.answerStructures.map((structure) => {
              const counted = countAnswerStructure(structure);
              const total = counted.situation.characters + counted.action.characters + counted.result.characters + counted.jobLink.characters;
              const width = (value: number) => (total === 0 ? 0 : (value / total) * 100);
              return (
                <div key={structure.questionOrder} className={styles.xrayCard}>
                  <div className={styles.xrayTop}>
                    <b>문항 {structure.questionOrder}</b>
                    <small>{counted.totalSentences}문장</small>
                  </div>
                  <div className={styles.bar}>
                    <i className={styles.barSituation} style={{ width: `${width(counted.situation.characters)}%` }}/>
                    <i className={styles.barAction} style={{ width: `${width(counted.action.characters)}%` }}/>
                    <i className={styles.barResult} style={{ width: `${width(counted.result.characters)}%` }}/>
                    <i className={styles.barJobLink} style={{ width: `${width(counted.jobLink.characters)}%` }}/>
                  </div>
                  <div className={styles.legend}>
                    <span><i className={styles.barSituation}/>상황 {counted.situation.sentences}문장 · {counted.situation.characters}자</span>
                    <span><i className={styles.barAction}/>본인 행동 {counted.action.sentences}문장 · {counted.action.characters}자</span>
                    <span><i className={styles.barResult}/>결과 {counted.result.sentences}문장 · {counted.result.characters}자</span>
                    <span><i className={styles.barJobLink}/>직무 연결 {counted.jobLink.sentences}문장 · {counted.jobLink.characters}자</span>
                  </div>
                  <p className={styles.reading}>{counted.actionThin && <b>상황 설명이 본인 행동보다 깁니다. </b>}{counted.reading}</p>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.honest}>
          <Info/>
          <p>문장을 어디에 넣을지는 분석이 판단하고, <b>문장 수와 글자 수는 이 화면이 직접 셉니다.</b> 그래서 위 숫자는 모두 지원자가 눈으로 확인할 수 있는 문장에서 나온 값입니다.</p>
        </div>
      </Panel>

      <Panel
        eyebrow="TIMELINE"
        title="커리어 타임라인"
        description="이력서와 자기소개서에 나타난 이력을 시간 순서로 세웠습니다. 한쪽에만 있는 항목이 면접에서 먼저 질문이 되는 지점입니다."
      >
        {result.careerTimeline.length === 0 ? (
          <p className={styles.empty}>{hasResume ? "시간 순서로 세울 만한 이력을 찾지 못했습니다." : noResumeNote}</p>
        ) : (
          <ul className={styles.timeline}>
            {result.careerTimeline.map((entry) => (
              <li key={entry.id}>
                <span className={styles.period}>{entry.period}</span>
                <div>
                  <b>
                    {entry.title}
                    {entry.source !== "both" && <span className={styles.srcOne}>{entry.source === "resume" ? "이력서에만 있음" : "자소서에만 있음"}</span>}
                  </b>
                  <p>{entry.note}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        eyebrow="CROSS-CHECK"
        title="이력서 × 자기소개서"
        description="두 문서를 나란히 놓고 어긋나는 곳을 찾았습니다. 면접관이 실제로 하는 일이기도 합니다."
      >
        {result.documentConflicts.length === 0 ? (
          <p className={styles.empty}>{hasResume ? "두 자료 사이에서 어긋나는 곳을 찾지 못했습니다." : noResumeNote}</p>
        ) : (
          <div className={styles.cards}>
            {result.documentConflicts.map((conflict) => (
              <article key={conflict.id}>
                <div className={styles.cardTop}>
                  <b>{conflict.conflict}</b>
                  <span className={`${styles.tag} ${styles[`tag${conflict.severity === "high" ? "High" : conflict.severity === "medium" ? "Medium" : "Low"}`]}`}>심각도 {SEVERITY_LABEL[conflict.severity]}</span>
                </div>
                <p className={styles.quote}><b>이력서.</b> {conflict.resumeStatement}</p>
                <p className={styles.quote}><b>자소서.</b> {conflict.coverLetterQuote}</p>
                <p><b>이렇게 맞추세요.</b> {conflict.resolution}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="INTERVIEWER"
        title="면접관이라면 여기서 묻습니다"
        description="이 지원서를 이력서와 함께 펼쳐 놓았을 때 확인하려 들 지점과, 그 뒤에 이어질 꼬리질문입니다."
      >
        {result.interviewerFlags.length === 0 ? (
          <p className={styles.empty}>{hasResume ? "이력서와 대조했을 때 따로 걸리는 지점이 없었습니다." : noResumeNote}</p>
        ) : (
          <div className={styles.cards}>
            {result.interviewerFlags.map((flag) => (
              <article key={flag.id}>
                <div className={styles.cardTop}>
                  <ShieldAlert size={16}/>
                  <b>{flag.headline}</b>
                  <span className={`${styles.tag} ${styles[`tag${flag.likelihood === "high" ? "High" : flag.likelihood === "medium" ? "Medium" : "Low"}`]}`}>질문 가능성 {SEVERITY_LABEL[flag.likelihood]}</span>
                </div>
                <p className={styles.quote}>{flag.evidenceQuote}</p>
                {flag.resumeReference && <p><b>이력서 기재.</b> {flag.resumeReference}</p>}
                <p>{flag.observation}</p>
                <p><b>예상 질문.</b> {flag.likelyQuestion}</p>
                {flag.followUps.length > 0 && <p><b>이어질 꼬리질문.</b> {flag.followUps.join(" / ")}</p>}
                <p><b>준비 포인트.</b> {flag.preparation}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        eyebrow="BEFORE THE ROOM"
        title="면접 전 최종 체크리스트"
        description="이 지원서에서만 나올 수 있는 준비 항목입니다. 일반적인 면접 조언은 넣지 않았습니다."
      >
        {result.finalChecklist.length === 0 ? (
          <p className={styles.empty}>따로 준비할 항목이 없었습니다.</p>
        ) : (
          <ul className={styles.checklist}>
            {result.finalChecklist.map((item) => (
              <li key={item.id}><CheckCircle2/><div><b>{item.item}</b><p>{item.why}</p></div></li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

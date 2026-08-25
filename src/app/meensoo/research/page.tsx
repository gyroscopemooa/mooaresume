import { listResearchCorpus } from "@/server/admin/admin-repository";
import {
  MIN_GROUP_SIZE,
  describeConfidence,
  documentPassRate,
  findingPatterns,
  groupBy,
  splitOutcomes,
} from "@/domain/research-insight";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminResearchPage() {
  const corpus = await listResearchCorpus(1000);
  const overall = splitOutcomes(corpus);
  const overallRate = documentPassRate(overall);
  const patterns = findingPatterns(corpus, 20);
  const byCompany = groupBy(corpus, "targetCompany");
  const byRole = groupBy(corpus, "targetRole");

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>축적 데이터</h1>
          <p>동의를 받은 지원서의 비식별 사본입니다. 지원자 글은 개인정보를 지운 상태로 보관되고, 이 화면은 <b>지적 내용과 결과만</b> 셉니다.</p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}><span>보관 사본</span><strong>{corpus.length}건</strong><small>동의한 분석만</small></div>
        <div className={styles.card}><span>결과 확인</span><strong>{overall.passed + overall.failed}건</strong><small>미확인 {overall.unknown}건</small></div>
        <div className={styles.card}>
          <span>서류 통과</span>
          <strong>{overallRate === null ? "—" : `${overallRate}%`}</strong>
          {/* A percentage from two known results looks like knowledge and is
              not. Below the floor the number is simply not shown. */}
          <small>{overallRate === null ? `결과 확인 ${MIN_GROUP_SIZE}건 미만이라 비율을 내지 않습니다` : "자발적 응답 · 미검증"}</small>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>반복되는 지적</h2>
          <small>같은 지원서 안에서 여러 번 나와도 1건</small>
        </div>
        {patterns.length === 0 ? (
          <p className={styles.empty}>아직 셀 것이 없습니다. 동의한 분석이 쌓이면 여기에 나옵니다.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead><tr><th>지적</th><th>종류</th><th>전체</th><th>서류 통과 쪽</th><th>서류 탈락 쪽</th></tr></thead>
              <tbody>
                {patterns.map((pattern) => (
                  <tr key={`${pattern.kind}-${pattern.note}`}>
                    <td className={styles.wrap}>{pattern.note}</td>
                    <td className={styles.mono}>{pattern.kind}</td>
                    <td>{pattern.total}</td>
                    <td className={styles.mono}>{pattern.amongPassed}</td>
                    <td className={styles.mono}>{pattern.amongFailed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {([["회사별", byCompany], ["직무별", byRole]] as const).map(([title, result]) => (
        <section key={title} className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{title}</h2>
            <small>{MIN_GROUP_SIZE}건 미만은 표시하지 않음 · 제외 {result.belowFloor}건, 미기재 {result.unlabelled}건</small>
          </div>
          {result.groups.length === 0 ? (
            <p className={styles.empty}>
              아직 {MIN_GROUP_SIZE}건 이상 쌓인 묶음이 없습니다. {result.belowFloor > 0 && `${result.belowFloor}건이 바닥 미만이라 빠졌습니다.`}
            </p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead><tr><th>{title === "회사별" ? "회사" : "직무"}</th><th>건수</th><th>서류 통과</th><th>신뢰도</th><th>가장 자주 나온 지적</th></tr></thead>
                <tbody>
                  {result.groups.map((group) => (
                    <tr key={group.label}>
                      <td>{group.label}</td>
                      <td>{group.count}</td>
                      <td className={styles.mono}>{group.passRate === null ? "—" : `${group.passRate}%`}</td>
                      <td className={`${styles.mono} ${styles.wrap}`}>{describeConfidence(group)}</td>
                      <td className={styles.wrap}>
                        {group.topFindings.slice(0, 3).map((finding) => `${finding.note} (${finding.total})`).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>이 숫자로 무엇을 할 수 있나</h2></div>
        <div className={styles.form}>
          <p className={styles.formMessage} style={{ color: "var(--admin-muted)", lineHeight: 1.9 }}>
            여기서 나오는 것은 <b>&ldquo;이 지적이 이 회사·직무에서 유독 자주 나온다&rdquo;</b>까지입니다.
            그것만으로도 프롬프트에 넣을 규칙이 됩니다 — 예를 들어 특정 직무에서 <b>본인 기여 불명확</b>이 계속 잡히면
            그 직무에는 그 항목을 먼저 보라고 지시할 수 있습니다.
            <br/><br/>
            <b>하지 말아야 할 것:</b> 결과 데이터는 지원자가 스스로 알려준 것이고 검증되지 않았습니다.
            합격에는 스펙·경쟁률·채용 규모가 섞여 있어 <b>&ldquo;이 문장이 합격률을 몇 % 높인다&rdquo;는 말은 표본이 훨씬 커지고
            통계적으로 확인되기 전까지 쓰지 않습니다.</b>
          </p>
        </div>
      </section>
    </>
  );
}

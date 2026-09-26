import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/admin/admin-session";
import { loadConsoleData } from "@/server/interview-pack/console-data";
import { PACK_SAMPLES } from "@/fixtures/interview-pack-samples";
import { SAMPLE_EXPECTATIONS } from "@/fixtures/interview-pack-expectations";
import adminStyles from "../admin.module.css";
import styles from "./final-test.module.css";
import { CloneRuns, GrantManager, MaterialSetManager, PacksTable, SamplePackButtons } from "./console-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 관리자 "FINAL 테스트" — 실제 결제·재입력 없이 FINAL 면접 준비팩과 FINAL 흐름을 점검하는 콘솔.
 *
 * 문은 세 겹이다: 관리자 레이아웃(쿠키) → 이 페이지의 재확인 → 각 API 가 관리자 쿠키·로그인 세션·서버 환경변수의
 * 승인된 테스트 계정을 다시 확인한다. 이 화면이 그리는 버튼은 편의일 뿐 권한의 근거가 아니다.
 */
export default async function FinalTestPage() {
  // 레이아웃이 이미 확인하지만, 페이지가 레이아웃과 따로 실행되는 경우에도 자료를 읽지 않게 한 번 더 본다.
  if (!(await isAdmin())) return null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const data = await loadConsoleData({ email: auth.user?.email ?? null, userId: auth.user?.id ?? null });
  const acting = data.session.approved && data.schema.ready;

  return (
    <div className={styles.stack}>
      <div className={adminStyles.head}>
        <div>
          <h1>FINAL 테스트</h1>
          <p>매번 실제로 결제하거나 자료를 새로 입력하지 않고 FINAL 면접 준비팩을 점검합니다. 테스트 이용권은 결제·주문·매출을 만들지 않으며, 이 화면의 모든 동작은 서버가 관리자·승인된 테스트 계정을 다시 확인합니다.</p>
        </div>
      </div>

      {/* ───────── 상태 ───────── */}
      <section className={adminStyles.panel} aria-labelledby="ft-status">
        <div className={adminStyles.panelHead}><h2 id="ft-status">현재 상태</h2><small>설정이 빠진 곳이 있으면 아래에 이유가 나옵니다</small></div>
        <div className={styles.body}>
          {!data.schema.ready && <div className={styles.banner} data-tone="bad" role="alert">
            <b>데이터베이스 마이그레이션이 아직 적용되지 않았습니다.</b> 그래서 실제 저장이 필요한 테스트(면접팩·테스트 이용권)는 아직 쓸 수 없습니다. ‘화면만 보기’는 지금도 됩니다.
            <ul>
              <li>적용할 파일: <code>supabase/migrations/20260926010000_admin_test_grants.sql</code> → <code>20260926020000_interview_packs.sql</code> (이 순서로, Supabase SQL Editor 에서 프로젝트 이름을 확인한 뒤)</li>
              {data.schema.missing.length > 0 && <li>없는 표: {data.schema.missing.join(", ")}</li>}
            </ul>
          </div>}
          {data.schema.ready && !data.session.userId && <div className={styles.banner} data-tone="warn" role="status">
            이 브라우저는 사이트에 <b>로그인되어 있지 않습니다.</b> 테스트 팩과 테스트 이용권은 로그인한 <b>승인된 테스트 계정</b> 이름으로 만들어집니다. 새 탭에서 <Link href="/">사이트</Link>에 로그인한 뒤 이 화면을 새로고침해 주세요.
          </div>}
          {data.schema.ready && data.session.userId && !data.session.approved && <div className={styles.banner} data-tone="warn" role="status">
            현재 로그인한 계정({data.session.email})은 <b>승인된 테스트 계정이 아닙니다.</b> 서버 환경변수 <code>FINAL_TEST_ACCOUNT_EMAILS</code>(쉼표로 구분)에 이 계정의 이메일을 넣고 서버를 다시 시작해야 실제 테스트를 쓸 수 있습니다.
          </div>}
          {data.approvedEmails.length === 0 && <div className={styles.banner} data-tone="warn" role="status">
            <code>FINAL_TEST_ACCOUNT_EMAILS</code> 가 비어 있습니다. 비어 있으면 어떤 계정도 테스트 팩·테스트 이용권을 쓸 수 없도록 막혀 있습니다(안전한 기본값).
          </div>}
          {!data.ai.configured && <div className={styles.banner} data-tone="warn" role="status">
            <code>OPENAI_API_KEY</code> 또는 <code>OPENAI_MODEL</code> 이 없어 실제 AI 테스트(점검·생성·수정)는 안내 오류로 끝납니다. ‘화면만 보기’는 영향이 없습니다.
          </div>}

          <dl className={styles.kv}>
            <dt>로그인한 계정</dt><dd>{data.session.email ?? "로그인 안 됨"} {data.session.userId && <span className={styles.status} data-tone={data.session.approved ? "ok" : "warn"}>{data.session.approved ? "승인된 테스트 계정" : "승인 안 됨"}</span>}</dd>
            <dt>승인된 테스트 계정</dt><dd>{data.approvedEmails.length > 0 ? data.approvedEmails.join(", ") : "(없음)"}</dd>
            <dt>사용 모델</dt><dd>{data.ai.model ?? "(AI 설정 없음)"} — 호출별 출력 토큰 상한: 점검 {data.ai.tokenLimits.assess.toLocaleString("ko-KR")} · 생성 {data.ai.tokenLimits.generate.toLocaleString("ko-KR")} · 수정 {data.ai.tokenLimits.revise.toLocaleString("ko-KR")}</dd>
            <dt>오늘 실제 AI 테스트</dt><dd>{data.usage ? `${data.usage.usedToday} / ${data.usage.dailyLimit}회 사용 (남은 ${Math.max(0, data.usage.dailyLimit - data.usage.usedToday)}회) — 서울 기준 하루, 초기화해도 리셋되지 않음` : "확인하지 못함"}</dd>
            <dt>면접팩 공개 플래그</dt><dd><span className={styles.status} data-tone={data.flags.publicEnabled ? "warn" : "ok"}>{data.flags.publicEnabled ? "켜짐(일반 사용자에게 노출)" : "꺼짐(일반 사용자에게 안 보임)"}</span> <code>NEXT_PUBLIC_ENABLE_INTERVIEW_PACK</code></dd>
            <dt>기존 구매자 적용</dt><dd>{data.flags.eligibility} <code>INTERVIEW_PACK_ELIGIBLE_FROM</code></dd>
            <dt>면접팩 사용량 한도</dt><dd>최초 생성 {data.flags.limits.initial}회 + 선택 답변 AI 수정 {data.flags.limits.edit}회 (자료 점검 안전 상한 {data.flags.limits.check}회) — 팩 만들 때 고정</dd>
            <dt>테스트 이용권 범위</dt><dd>FINAL, 글자 수 {data.flags.testGrantCharacters.toLocaleString("ko-KR")}자까지(실제 FINAL 이용권과 같은 자리)</dd>
          </dl>
          {data.errors.length > 0 && <div className={styles.banner} data-tone="warn" role="status"><ul>{data.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        </div>
      </section>

      {/* ───────── A. 화면만 보기 ───────── */}
      <section className={adminStyles.panel} aria-labelledby="ft-a">
        <div className={adminStyles.panelHead}><h2 id="ft-a">A. 화면만 보기 — 결제·AI·외부 호출 없음</h2><small>고정 가상 자료 + 미리 써 둔 예시 응답</small></div>
        <div className={styles.body}>
          <p>실제 결과 화면의 버튼·상태·키워드 연습을 눈으로 점검합니다. 화면 위에 <b>‘샘플 화면 · 실제 AI 생성 아님’</b>이 항상 표시되고, 실제 AI 품질을 검증한 것으로 보지 않습니다. 이 경로에는 네트워크 호출 코드가 없습니다.</p>
          <div className={styles.samples}>
            {PACK_SAMPLES.map((sample) => <div className={styles.sample} key={sample.id}>
              <h3>{sample.title}</h3>
              <p>{sample.summary}</p>
              <div className={styles.row}><Link className={styles.btn} href={`/meensoo/final-test/preview/${sample.id}`}>화면만 보기</Link></div>
            </div>)}
          </div>
        </div>
      </section>

      {/* ───────── B. 면접팩만 실제 AI 테스트 ───────── */}
      <section className={adminStyles.panel} aria-labelledby="ft-b">
        <div className={adminStyles.panelHead}><h2 id="ft-b">B. 면접팩만 실제 AI 테스트</h2><small>실제 AI 사용 요금 발생 · 결제·원본 파일 파싱은 검증하지 않음</small></div>
        <div className={styles.body}>
          <p>가상 FINAL 스냅샷(샘플·내 자료 세트) 또는 <b>내 완료 FINAL 결과의 사본</b>으로 실제 면접팩 생성·저장·권한 확인·수정 로직을 돌립니다. 자소서 첨삭은 다시 돌리지 않고, 면접팩에 필요한 AI 호출만 일어납니다. 오늘 남은 호출 한도 안에서만 실행됩니다.</p>
        </div>
        <div className={adminStyles.panelHead}><h2>샘플 자료로 시작</h2><small>A 자료 충분 · B 자료 부족 · C 자료 충돌</small></div>
        <div className={styles.body}>
          <SamplePackButtons
            disabled={!acting}
            samples={PACK_SAMPLES.map((sample) => ({ id: sample.id, title: sample.title, summary: sample.summary, watch: SAMPLE_EXPECTATIONS[sample.id].watch }))}
          />
        </div>
        <div className={adminStyles.panelHead}><h2>내 자료 세트 저장·불러오기</h2><small>한 번만 붙여 넣으면 계속 씁니다</small></div>
        <MaterialSetManager sets={data.sets} disabled={!acting} />
        <div className={adminStyles.panelHead}><h2>내 기존 FINAL 결과 복제</h2><small>이 계정으로 완료된 FINAL 결과 최근 10건</small></div>
        <CloneRuns runs={data.runs} disabled={!acting} />
        <div className={adminStyles.panelHead}><h2>만든 테스트 팩</h2><small>{data.packs.length}개</small></div>
        <PacksTable packs={data.packs} />
      </section>

      {/* ───────── C. FINAL 전체 흐름 ───────── */}
      <section className={adminStyles.panel} aria-labelledby="ft-c">
        <div className={adminStyles.panelHead}><h2 id="ft-c">C. FINAL 전체 흐름 테스트</h2><small>실제 AI 사용 요금 발생 · 결제대행사 연동은 별도 검증</small></div>
        <div className={styles.body}>
          <p>테스트 이용권으로 <b>실제 사용자와 같은 입력 화면·파일 파서·FINAL 분석·결과 화면·면접 준비팩 경로</b>를 처음부터 끝까지 걷습니다. 샘플은 자료 입력만 돕고, 검증이나 생성 로직을 건너뛰지 않습니다. 자소서 첨삭과 면접팩 양쪽에서 AI 사용 요금이 발생할 수 있습니다.</p>
          <ol className={styles.steps}>
            <li>아래에서 테스트 FINAL 이용권을 발급합니다(받는 계정은 승인된 테스트 계정만).</li>
            <li>발급받은 계정으로 사이트에 로그인한 뒤 <Link href="/final/polish">FINAL 입력 화면</Link>에서 아래 가상 TXT 파일 <b>하나</b>를 올리거나 내용을 붙여 넣습니다.</li>
            <li>결제 단계에 <b>‘테스트 이용권으로 분석 시작 · 결제 없음’</b>이 나타납니다. 누르면 결제 없이 실제 분석이 시작됩니다.</li>
            <li>결과 화면에서 <b>면접 준비팩</b> 탭이 보이면(테스트 이용권 결과는 승인된 테스트 계정에 자동으로 보입니다) 점검 → 만들기 → 연습까지 진행합니다.</li>
          </ol>
          <div className={styles.row}>
            {PACK_SAMPLES.map((sample) => <a key={sample.id} className={styles.btn} data-variant="ghost" data-size="sm" href={`/api/meensoo/final-test/sample-file?id=${sample.id}`}>{sample.filename} 내려받기</a>)}
          </div>
          <p>세 파일은 서로 다른 사례입니다. 한 지원 건에 하나씩만 넣으세요. TXT 만 제공하며, 다른 형식을 지원하는 것처럼 보이게 하지 않습니다.</p>
        </div>
        <GrantManager
          approvedEmails={data.approvedEmails}
          defaultEmail={data.session.approved && data.session.email ? data.session.email.toLowerCase() : (data.approvedEmails[0] ?? "")}
          grants={data.grants}
          disabled={!acting}
        />
      </section>

      {/* ───────── 결제 연동은 별도 ───────── */}
      <section className={adminStyles.panel} aria-labelledby="ft-d">
        <div className={adminStyles.panelHead}><h2 id="ft-d">결제 연동 점검은 별도입니다</h2><small>이 화면의 성공 ≠ 결제 성공</small></div>
        <div className={styles.body}>
          <p>테스트 이용권으로 FINAL 이 돌아간 것은 <b>결제 연동이 성공했다는 뜻이 아닙니다.</b> 결제는 연결된 결제사(Polar)의 별도 sandbox 환경에서 다음을 따로 점검해야 합니다.</p>
          <ul className={styles.checks}>
            <li>☐ 정상 결제 → 웹훅 서명 검증 → 이용권 1회 발급</li>
            <li>☐ 취소·실패, 중복·지연 웹훅에서 이용권이 두 번 발급되지 않음</li>
            <li>☐ 다른 상품 결제·위조·다른 환경(운영↔샌드박스) 웹훅이 거절됨</li>
            <li>☐ 환불·취소 뒤 새 생성권이 기존 정책대로 막힘(이미 만든 답변 읽기는 유지)</li>
            <li>☐ 샌드박스 토큰·상품 ID·웹훅 비밀키·주문이 운영과 분리되어 있음</li>
          </ul>
          <p>실제 돈이 움직이는 결제·환불은 자동으로 실행하지 않습니다.</p>
        </div>
      </section>
    </div>
  );
}

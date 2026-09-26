import { fileURLToPath } from "node:url";
import { makeDb, applyMigrations } from "./harness.mjs";
const DIR = process.argv[2] ?? fileURLToPath(new URL("../../supabase/migrations", import.meta.url));
const db = await makeDb();
const failed = await applyMigrations(db, DIR);
const unexpected = failed.filter(([f]) => !/pg_cron|schedule_analysis|community_daily_seed|editorial_alias|community_seed_once_daily/.test(f));
console.log("migrations applied; unexpected failures:", unexpected);
if (unexpected.length) process.exit(1);

let pass = 0, fail = 0;
function ok(cond, name, extra) { if (cond) { pass++; console.log("  ok  ", name); } else { fail++; console.log("  FAIL", name, extra ?? ""); } }
async function q(sql, params = []) { return (await db.query(sql, params)).rows; }
async function expectErr(sql, params, needle, name) {
  try { await db.query(sql, params); ok(false, name + " (no error raised)"); }
  catch (e) { ok(String(e.message).includes(needle), name, e.message); try { await db.exec("rollback"); } catch {} }
}
async function asUser(uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

const uid = async (email) => (await q("insert into auth.users(email) values ($1) returning id", [email]))[0].id;
async function seedCase(owner, title = "c") {
  return (await q("insert into public.application_cases(owner_user_id, title, company_name, role_name) values ($1,$2,'C','R') returning id", [owner, title]))[0].id;
}
async function seedRun(owner, caseId, { product = "FINAL", status = "PENDING", text = "가".repeat(120) } = {}) {
  const snap = (await q("insert into public.submission_snapshots(application_case_id, owner_user_id) values ($1,$2) returning id", [caseId, owner]))[0].id;
  const doc = (await q("insert into public.documents(application_case_id, owner_user_id, kind, title) values ($1,$2,'COVER_LETTER','t') returning id", [caseId, owner]))[0].id;
  const ver = (await q("insert into public.document_versions(document_id, owner_user_id, version_number, source_type, normalized_text, character_count) values ($1,$2,1,'TEXT',$3,$4) returning id", [doc, owner, text, text.length]))[0].id;
  await q("insert into public.submission_snapshot_items(snapshot_id, document_version_id, owner_user_id, purpose) values ($1,$2,$3,'PRIMARY')", [snap, ver, owner]);
  const run = (await q(`insert into public.analysis_runs(submission_snapshot_id, application_case_id, owner_user_id, product, writing_mode, writing_style, target_length, status, completed_at)
    values ($1,$2,$3,$4,'POLISH','BALANCED',500,($5::text)::public.analysis_run_status, case when $5::text='COMPLETED' then now() else null end) returning id`, [snap, caseId, owner, product, status]))[0].id;
  return run;
}

console.log("\n== 테스트 이용권 ==");
const admin = await uid("admin@example.com");
const tester = await uid("tester@example.com");
const stranger = await uid("stranger@example.com");

const grantOut = (await q("select public.issue_admin_test_grant($1,$2,2,60000,24,'테스트') as r", [tester, admin]))[0].r;
ok(!!grantOut.grantId && grantOut.maxUses === 2, "이용권 발급");
await expectErr("select public.issue_admin_test_grant($1,$2,2,60000,0,null)", [tester, admin], "TEST_GRANT_TTL_INVALID", "만료 시간 0 은 거절");
await expectErr("select public.issue_admin_test_grant($1,$2,2,60000,24,null)", ["00000000-0000-0000-0000-000000000000", admin], "TEST_GRANT_TARGET_NOT_FOUND", "없는 계정에는 발급 불가");
await q("select public.issue_admin_test_grant($1,$2,1,60000,24,null)", [tester, admin]);
await q("select public.issue_admin_test_grant($1,$2,1,60000,24,null)", [tester, admin]);
await expectErr("select public.issue_admin_test_grant($1,$2,1,60000,24,null)", [tester, admin], "TEST_GRANT_TOO_MANY_ACTIVE", "살아 있는 이용권 3장 초과 발급 불가");
const allGrants = await q("select id from public.admin_test_grants where target_user_id=$1 order by created_at", [tester]);
for (const g of allGrants.slice(1)) await q("select public.revoke_admin_test_grant($1)", [g.id]);

const caseT = await seedCase(tester, "T1");
const runT = await seedRun(tester, caseT);
const consumed = await asUser(tester, async () => (await q("select public.consume_admin_test_grant($1,'FINAL') as r", [caseT]))[0].r);
ok(!!consumed.entitlementId, "본인 지원 건에 테스트 이용권 사용");
const ent = (await q("select billing_order_id, test_grant_id, status, allowed_characters from public.analysis_entitlements where id=$1", [consumed.entitlementId]))[0];
ok(ent.billing_order_id === null && ent.test_grant_id === grantOut.grantId && ent.status === "ACTIVE" && ent.allowed_characters === 60000, "주문 없이 테스트 출처 이용권 생성");
ok((await q("select count(*)::int as n from public.billing_orders"))[0].n === 0, "가짜 주문(billing_orders)은 만들어지지 않음");
await asUser(tester, async () => expectErr("select public.consume_admin_test_grant($1,'FINAL')", [caseT], "ACTIVE_ENTITLEMENT_EXISTS", "같은 지원 건에 이용권을 쌓지 않음"));
const caseS = await seedCase(stranger, "S1");
await asUser(tester, async () => expectErr("select public.consume_admin_test_grant($1,'FINAL')", [caseS], "APPLICATION_CASE_NOT_FOUND", "남의 지원 건에는 사용 불가"));
await asUser(stranger, async () => expectErr("select public.consume_admin_test_grant($1,'FINAL')", [caseS], "TEST_GRANT_NOT_AVAILABLE", "이용권이 없는 계정은 사용 불가"));
await asUser(tester, async () => expectErr("select public.consume_admin_test_grant($1,'QUICK')", [caseT], "INVALID_PRODUCT", "FINAL 외 상품 불가"));
await expectErr("select public.consume_admin_test_grant($1,'FINAL')", [caseT], "AUTHENTICATION_REQUIRED", "로그인 없이 사용 불가");

await asUser(stranger, async () => expectErr("select public.issue_admin_test_grant($1,$2,1,60000,24,null)", [stranger, stranger], "permission denied", "일반 사용자는 발급 함수 호출 불가"));
await asUser(stranger, async () => expectErr("select public.revoke_admin_test_grant($1)", [grantOut.grantId], "permission denied", "일반 사용자는 회수 함수 호출 불가"));
await asUser(stranger, async () => expectErr("insert into public.admin_test_grants(target_user_id, product, max_uses, allowed_characters, expires_at) values ($1,'FINAL',1,60000, now() + interval '1 hour')", [stranger], "permission denied", "일반 사용자는 이용권 행을 직접 삽입 불가"));
await asUser(stranger, async () => {
  const rows = await q("select id from public.admin_test_grants");
  ok(rows.length === 0, "남의 테스트 이용권은 읽히지 않음(RLS)");
});
await asUser(tester, async () => {
  const rows = await q("select id from public.admin_test_grants");
  ok(rows.length >= 1, "본인 테스트 이용권은 읽힘");
});

await expectErr("insert into public.analysis_entitlements(application_case_id, owner_user_id, product, allowed_characters) values ($1,$2,'FINAL',1000)", [caseT, tester], "analysis_entitlements_single_source", "주문도 테스트 출처도 없는 이용권은 만들 수 없음");

console.log("\n== 실제 FINAL 분석 경로(begin_quick_analysis)에 테스트 이용권이 통한다 ==");
const begin = (await q("select public.begin_quick_analysis($1,$2) as r", [runT, tester]))[0].r;
ok(begin.analysisRunId === runT && begin.request.product === "FINAL", "begin_quick_analysis 가 테스트 이용권으로 FINAL 실행을 시작");
const ent2 = (await q("select status, consumed_by_analysis_run_id from public.analysis_entitlements where id=$1", [consumed.entitlementId]))[0];
ok(ent2.status === "CONSUMED" && ent2.consumed_by_analysis_run_id === runT, "테스트 이용권이 소비 처리됨");
await q("update public.analysis_runs set status='COMPLETED', completed_at=now() where id=$1", [runT]);

console.log("\n== 면접팩 접근 판정 ==");
const acc = async (run, owner) => (await q("select public.interview_pack_run_access($1,$2) as r", [run, owner]))[0].r;
let a = await acc(runT, tester);
ok(a.allowed === true && a.accessSource === "admin_test" && a.testGrantId === grantOut.grantId, "테스트 이용권 FINAL → admin_test 로 허용");
ok((await acc(runT, stranger)).reason === "RUN_NOT_FOUND", "남의 실행은 RUN_NOT_FOUND");
const quickRun = await seedRun(tester, await seedCase(tester, "Q"), { product: "QUICK", status: "COMPLETED" });
ok((await acc(quickRun, tester)).reason === "NOT_FINAL", "QUICK 은 새 생성 API 접근 불가");
const pendingRun = await seedRun(tester, await seedCase(tester, "P"), { status: "PENDING" });
ok((await acc(pendingRun, tester)).reason === "NOT_COMPLETED", "미완료 FINAL 불가");
const noEntRun = await seedRun(tester, await seedCase(tester, "N"), { status: "COMPLETED" });
ok((await acc(noEntRun, tester)).reason === "ENTITLEMENT_NOT_FOUND", "이용권 없는 실행(미결제) 불가");

async function seedPaidFinal(owner, { status = "PAID", provider = "POLAR", amount = 19900 } = {}) {
  const caseId = await seedCase(owner, "PAY");
  const run = await seedRun(owner, caseId, { status: "COMPLETED" });
  const order = (await q(`insert into public.billing_orders(provider, provider_order_id, application_case_id, owner_user_id, product, amount, currency, status, paid_at)
    values ($1, 'ord-' || gen_random_uuid(), $2, $3, 'FINAL', $4, 'krw', $5, now()) returning id`, [provider, caseId, owner, amount, status]))[0].id;
  const entId = (await q(`insert into public.analysis_entitlements(billing_order_id, application_case_id, owner_user_id, product, allowed_characters, status, consumed_by_analysis_run_id, consumed_at)
    values ($1,$2,$3,'FINAL',60000,'CONSUMED',$4, now()) returning id`, [order, caseId, owner, run]))[0].id;
  return { caseId, run, order, entId };
}
const paid = await seedPaidFinal(stranger);
a = await acc(paid.run, stranger);
ok(a.allowed === true && a.accessSource === "polar", "실제 Polar FINAL → polar 로 허용");
const refunded = await seedPaidFinal(stranger, { status: "REFUNDED" });
ok((await acc(refunded.run, stranger)).reason === "ORDER_NOT_PAID", "환불된 주문은 새 생성 불가");
const credit = await seedPaidFinal(stranger, { provider: "MOOA_CREDIT", amount: 0 });
ok((await acc(credit.run, stranger)).accessSource === "mooa_credit", "무료 이용권(MOOA_CREDIT)은 별도 출처");

console.log("\n== 팩 만들기 ==");
const limits = { initial: 1, edit: 3, check: 5, complete: 6 };
const mat = { schema: 1, baseVersion: null, documents: [], supplements: {}, slotAnswers: [], confirmations: [] };
const packOut = (await q("select public.create_interview_pack($1,$2,$3,$4) as r", [tester, runT, mat, limits]))[0].r;
ok(packOut.created === true, "팩 생성");
const packAgain = (await q("select public.create_interview_pack($1,$2,$3,$4) as r", [tester, runT, mat, limits]))[0].r;
ok(packAgain.created === false && packAgain.packId === packOut.packId, "같은 실행에 다시 만들면 기존 팩(중복 없음)");
await expectErr("select public.create_interview_pack($1,$2,$3,$4)", [stranger, runT, mat, limits], "PACK_NOT_ALLOWED:RUN_NOT_FOUND", "남의 FINAL 로 팩 생성 불가");
await expectErr("select public.create_interview_pack($1,$2,$3,$4)", [tester, quickRun, mat, limits], "PACK_NOT_ALLOWED:NOT_FINAL", "QUICK 으로 팩 생성 불가");
await expectErr("select public.create_interview_pack($1,$2,$3,$4)", [stranger, refunded.run, mat, limits], "PACK_NOT_ALLOWED:ORDER_NOT_PAID", "환불 건으로 팩 생성 불가");
const pk = (await q("select access_source, is_test, origin, limit_edit, materials_version from public.interview_packs where id=$1", [packOut.packId]))[0];
ok(pk.access_source === "admin_test" && pk.is_test === true && pk.origin === "final_run" && pk.limit_edit === 3, "테스트 이용권 팩은 admin_test/is_test 로 표시");
const paidPack = (await q("select public.create_interview_pack($1,$2,$3,$4) as r", [stranger, paid.run, mat, limits]))[0].r;
ok((await q("select is_test from public.interview_packs where id=$1", [paidPack.packId]))[0].is_test === false, "실제 구매 팩은 is_test=false");

console.log("\n== 자료 버전 ==");
const v2 = (await q("select public.save_interview_pack_materials($1,$2,$3) as v", [tester, packOut.packId, { ...mat, baseVersion: 1, supplements: { company: "X" } }]))[0].v;
ok(v2 === 2, "새 자료 버전 2");
ok((await q("select materials_version from public.interview_packs where id=$1", [packOut.packId]))[0].materials_version === 2, "팩의 최신 자료 버전 갱신");
ok((await q("select payload from public.interview_pack_materials where pack_id=$1 and version_no=1", [packOut.packId]))[0].payload.supplements.company === undefined, "1번(원본 스냅샷)은 그대로");
await expectErr("select public.save_interview_pack_materials($1,$2,$3)", [stranger, packOut.packId, mat], "PACK_NOT_FOUND", "남의 팩에 자료 저장 불가");

console.log("\n== 사용량 예약 ==");
const reserve = async (owner, pack, kind, key, slot = null) => (await q("select public.reserve_interview_pack_usage($1,$2,$3,$4,$5) as r", [owner, pack, kind, key, slot]))[0].r;
let r1 = await reserve(tester, packOut.packId, "check", "key-check-0001");
ok(r1.outcome === "RESERVED" && r1.used === 1 && r1.limit === 5, "점검 예약");
ok((await reserve(tester, packOut.packId, "check", "key-check-0001")).outcome === "DUPLICATE", "같은 요청 키 재전송은 중복(이중 예약 없음)");
ok((await reserve(tester, packOut.packId, "check", "key-check-0002")).outcome === "BUSY", "진행 중에는 다른 요청이 BUSY");
ok((await q("select public.settle_interview_pack_usage($1,$2,'released','PROVIDER_FAILED') as ok", [tester, r1.usageId]))[0].ok === true, "실패 → 예약 반납");
ok((await q("select public.settle_interview_pack_usage($1,$2,'released',null) as ok", [tester, r1.usageId]))[0].ok === false, "이미 정리된 예약은 다시 정리되지 않음");
ok((await q("select busy_until from public.interview_packs where id=$1", [packOut.packId]))[0].busy_until === null, "정리하면 진행 잠금이 풀림");
let r2 = await reserve(tester, packOut.packId, "check", "key-check-0003");
ok(r2.outcome === "RESERVED" && r2.used === 1, "반납된 예약은 사용 횟수에 들지 않음");
await q("select public.save_interview_pack_assessment($1,$2,2,$3)", [tester, r2.usageId, { materialsVersion: 2, facts: [], conflicts: [], slots: [] }]);
ok((await q("select assessment_materials_version from public.interview_packs where id=$1", [packOut.packId]))[0].assessment_materials_version === 2, "점검 결과 저장");
await expectErr("select public.save_interview_pack_assessment($1,$2,2,$3)", [tester, r2.usageId, {}], "USAGE_NOT_ACTIVE", "이미 확정된 예약으로는 다시 저장 불가");
for (let i = 4; i <= 7; i++) {
  const r = await reserve(tester, packOut.packId, "check", `key-check-000${i}`);
  if (r.outcome === "RESERVED") await q("select public.save_interview_pack_assessment($1,$2,2,$3)", [tester, r.usageId, { materialsVersion: 2 }]);
}
const lim = await reserve(tester, packOut.packId, "check", "key-check-0099");
ok(lim.outcome === "LIMIT_REACHED" && lim.limit === 5 && lim.used === 5, "점검 5회 후에는 LIMIT_REACHED");

ok((await reserve(tester, packOut.packId, "complete", "key-comp-0001")).outcome === "INITIAL_REQUIRED", "최초 생성 전에는 이어 만들기 불가");
ok((await reserve(tester, packOut.packId, "edit", "key-edit-0001", "intro_30")).outcome === "INITIAL_REQUIRED", "최초 생성 전에는 AI 수정 불가");

console.log("\n== 최초 생성·수정 ==");
const init = await reserve(tester, packOut.packId, "initial", "key-init-0001");
ok(init.outcome === "RESERVED" && init.limit === 1, "최초 생성 예약");
const card = (extra = {}) => ({ answer: "답변", keywords: [], steps: [], memoryLine: "m", followUps: [], evidence: [], usedFactIds: [], issues: [], ...extra });
const saved = (await q("select public.save_interview_pack_answers($1,$2,2,$3) as r", [tester, init.usageId, [
  { slot: "intro_30", card: card(), model: "m", promptVersion: "p1" },
  { slot: "intro_60", card: card(), model: "m", promptVersion: "p1" },
]]))[0].r;
ok(saved.saved === 2, "최초 생성 결과 저장(2개 문항)");
ok((await q("select initial_generated_at from public.interview_packs where id=$1", [packOut.packId]))[0].initial_generated_at !== null, "최초 생성 시각 기록");
ok((await reserve(tester, packOut.packId, "initial", "key-init-0002")).outcome === "LIMIT_REACHED", "최초 생성은 1회만");
const comp = await reserve(tester, packOut.packId, "complete", "key-comp-0002");
ok(comp.outcome === "RESERVED", "보류 문항 이어 만들기 예약(사용자 몫 아님)");
const compSaved = (await q("select public.save_interview_pack_answers($1,$2,2,$3) as r", [tester, comp.usageId, [
  { slot: "intro_30", card: card({ answer: "덮어쓰면 안 됨" }), model: "m", promptVersion: "p1" },
  { slot: "aspiration", card: card(), model: "m", promptVersion: "p1" },
]]))[0].r;
ok(compSaved.saved === 1, "이어 만들기는 이미 있는 답변을 덮어쓰지 않고 새 문항만 채움");

for (let i = 1; i <= 3; i++) {
  const e = await reserve(tester, packOut.packId, "edit", `key-edit-000${i}`, "intro_30");
  ok(e.outcome === "RESERVED" && e.used === i && e.limit === 3, `AI 수정 ${i}/3 예약`);
  const s = (await q("select public.save_interview_pack_answers($1,$2,2,$3) as r", [tester, e.usageId, [
    { slot: "intro_60", card: card({ answer: "다른 문항이면 무시" }) },
    { slot: "intro_30", card: card({ answer: `수정 ${i}` }), model: "m", promptVersion: "p1" },
  ]]))[0].r;
  ok(s.saved === 1, `수정 ${i}회는 예약한 문항 하나만 바꿈`);
}
ok((await reserve(tester, packOut.packId, "edit", "key-edit-0004", "intro_30")).outcome === "LIMIT_REACHED", "AI 수정 3회 후에는 LIMIT_REACHED");
const revs = await q("select revision_no, origin from public.interview_pack_answers where pack_id=$1 and slot='intro_30' order by revision_no", [packOut.packId]);
ok(revs.length === 4 && revs[0].origin === "ai" && revs[3].origin === "ai_revised", "이전 판이 남고 새 판이 쌓임(복원 가능)");

console.log("\n== 사용자 직접 수정·복원 ==");
await expectErr("select public.save_interview_pack_user_answer($1,$2,'intro_30','user_edited',1,2,$3)", [tester, packOut.packId, card()], "STALE_REVISION", "오래된 판 기준 수정은 거절");
const newRev = (await q("select public.save_interview_pack_user_answer($1,$2,'intro_30','user_edited',4,2,$3) as r", [tester, packOut.packId, card({ answer: "내가 고침" })]))[0].r;
ok(newRev === 5, "사용자 수정은 새 판(5)으로 저장");
const restored = (await q("select public.save_interview_pack_user_answer($1,$2,'intro_30','restored',5,2,$3) as r", [tester, packOut.packId, card({ answer: "복원본" })]))[0].r;
ok(restored === 6, "복원도 새 판으로 저장");
ok((await q("select count(*)::int as n from public.interview_pack_usage where pack_id=$1 and kind='edit'", [packOut.packId]))[0].n === 3, "직접 수정·복원은 사용량을 늘리지 않음");
await expectErr("select public.save_interview_pack_user_answer($1,$2,'closing','user_edited',0,2,$3)", [tester, packOut.packId, card()], "ANSWER_NOT_FOUND", "없는 문항은 수정 불가");

console.log("\n== 소유자 분리(RLS) ==");
await asUser(stranger, async () => {
  ok((await q("select id from public.interview_packs where id=$1", [packOut.packId])).length === 0, "남의 팩은 읽히지 않음");
  ok((await q("select id from public.interview_pack_answers where pack_id=$1", [packOut.packId])).length === 0, "남의 답변은 읽히지 않음");
  ok((await q("select id from public.interview_pack_materials where pack_id=$1", [packOut.packId])).length === 0, "남의 자료 버전은 읽히지 않음");
  await expectErr("insert into public.interview_packs(owner_user_id, origin, analysis_run_id, access_source, limit_initial, limit_edit, limit_check, limit_complete) values ($1,'final_run',$2,'polar',1,3,5,6)", [stranger, paid.run], "permission denied", "브라우저는 팩을 직접 만들 수 없음");
  await expectErr("select public.reserve_interview_pack_usage($1,$2,'check','key-xxxx-0001',null)", [stranger, packOut.packId], "permission denied", "브라우저는 예약 함수를 직접 부를 수 없음");
  await expectErr("select * from public.interview_pack_ai_calls", [], "permission denied", "AI 호출 원장은 브라우저에서 읽을 수 없음");
});
await asUser(tester, async () => {
  ok((await q("select id from public.interview_packs where id=$1", [packOut.packId])).length === 1, "본인 팩은 읽힘");
});

console.log("\n== 회수·환불 뒤 새 생성 차단 ==");
const paidReserve = await reserve(stranger, paidPack.packId, "check", "key-paid-0001");
ok(paidReserve.outcome === "RESERVED", "실제 구매 팩도 정상 예약");
await q("select public.settle_interview_pack_usage($1,$2,'released',null)", [stranger, paidReserve.usageId]);
await q("update public.billing_orders set status='REFUNDED' where id=$1", [paid.order]);
ok((await reserve(stranger, paidPack.packId, "check", "key-paid-0002")).outcome === "DENIED", "환불된 뒤에는 새 AI 작업 예약이 거절됨");
await q("select public.revoke_admin_test_grant($1)", [grantOut.grantId]);
const denied = await reserve(tester, packOut.packId, "check", "key-revoked-0001");
ok(denied.outcome === "DENIED" && denied.reason === "TEST_GRANT_REVOKED", "테스트 이용권 회수 뒤에는 새 AI 작업 예약이 거절됨");
const stillEdit = (await q("select public.save_interview_pack_user_answer($1,$2,'intro_30','user_edited',6,2,$3) as r", [tester, packOut.packId, card({ answer: "회수 후 직접 수정" })]))[0].r;
ok(stillEdit === 7, "이미 받은 답변의 직접 수정은 회수 뒤에도 가능(추가 이용권 불필요)");

console.log("\n== 관리자 스냅샷 팩·초기화 ==");
const snap = (await q("select public.create_admin_snapshot_pack($1,$2,$3,'샘플 A',null) as r", [tester, mat, limits]))[0].r;
ok(!!snap.packId, "관리자 스냅샷 팩 생성");
const sp = (await q("select origin, access_source, is_test, analysis_run_id from public.interview_packs where id=$1", [snap.packId]))[0];
ok(sp.origin === "admin_snapshot" && sp.access_source === "admin_test" && sp.is_test && sp.analysis_run_id === null, "스냅샷 팩은 항상 admin_test 이고 실행과 이어지지 않음");
await expectErr("insert into public.interview_packs(owner_user_id, origin, access_source, limit_initial, limit_edit, limit_check, limit_complete) values ($1,'admin_snapshot','polar',1,3,5,6)", [tester], "interview_packs_check", "스냅샷 팩이 실제 결제 출처를 주장할 수 없음");
const sr = await reserve(tester, snap.packId, "check", "key-snap-0001");
ok(sr.outcome === "RESERVED", "스냅샷 팩도 같은 예약 로직을 탐");
await q("insert into public.interview_pack_ai_calls(owner_user_id, pack_id, is_test, purpose, outcome, model, input_tokens, output_tokens) values ($1,$2,true,'check','COMPLETED','m',100,50)", [tester, snap.packId]);
const delCount = (await q("select public.delete_admin_test_packs($1,$2) as n", [tester, [snap.packId, paidPack.packId]]))[0].n;
ok(delCount === 1, "테스트 팩만 지워지고 실제 구매 팩은 남음");
ok((await q("select id from public.interview_packs where id=$1", [paidPack.packId])).length === 1, "실제 구매 팩 보존");
await expectErr("select public.save_interview_pack_assessment($1,$2,1,$3)", [tester, sr.usageId, { materialsVersion: 1 }], "USAGE_NOT_ACTIVE", "초기화 뒤 늦게 끝난 작업은 저장할 수 없음");
const ledger = await q("select pack_id, is_test from public.interview_pack_ai_calls where owner_user_id=$1", [tester]);
ok(ledger.length === 1 && ledger[0].pack_id === null && ledger[0].is_test === true, "초기화해도 AI 호출 원장은 남음(pack_id 만 비워짐)");
const resetRunPack = (await q("select public.delete_admin_test_packs($1,$2) as n", [tester, [packOut.packId]]))[0].n;
ok(resetRunPack === 1, "테스트 이용권으로 만든 FINAL 팩도 초기화 가능");
ok((await q("select count(*)::int as n from public.analysis_runs where id=$1", [runT]))[0].n === 1, "초기화는 FINAL 실행 자체는 지우지 않음");

console.log("\n== 스냅샷 팩 한도 ==");
for (let i = 0; i < 30; i++) await q("select public.create_admin_snapshot_pack($1,$2,$3,'x',null)", [tester, mat, limits]);
await expectErr("select public.create_admin_snapshot_pack($1,$2,$3,'x',null)", [tester, mat, limits], "TOO_MANY_TEST_PACKS", "테스트 팩은 30개까지");

console.log("\n== 계정 삭제 호환 ==");
const del = (await q("select public.delete_account_preserving_billing($1) as r", [tester]))[0].r;
ok(del !== null, "테스트 이용권·팩이 있는 계정도 삭제 함수가 막히지 않음");
ok((await q("select count(*)::int as n from public.admin_test_grants where target_user_id=$1", [tester]))[0].n === 0, "계정 삭제 시 이용권이 함께 지워짐");
const del2 = (await q("select public.delete_account_preserving_billing($1) as r", [stranger]))[0].r;
ok(del2 !== null, "실제 구매 팩이 있는 계정도 삭제 가능");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

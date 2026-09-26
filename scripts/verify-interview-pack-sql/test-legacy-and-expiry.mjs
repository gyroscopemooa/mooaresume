import { fileURLToPath } from "node:url";
import { makeDb, applyMigrations } from "./harness.mjs";
const DIR = process.argv[2] ?? fileURLToPath(new URL("../../supabase/migrations", import.meta.url));
const db = await makeDb();
const isMine = (f) => f.startsWith("20260926");
const failedBase = await applyMigrations(db, DIR, { only: (f) => !isMine(f) });
console.log("base applied; failures:", failedBase.length);

let pass = 0, fail = 0;
function ok(cond, name, extra) { if (cond) { pass++; console.log("  ok  ", name); } else { fail++; console.log("  FAIL", name, extra ?? ""); } }
async function q(sql, params = []) { return (await db.query(sql, params)).rows; }

console.log("\n== 기존 데이터가 있는 DB 에 마이그레이션 적용 ==");
const u = (await q("insert into auth.users(email) values ('legacy@example.com') returning id"))[0].id;
const c = (await q("insert into public.application_cases(owner_user_id, title) values ($1,'legacy') returning id", [u]))[0].id;
const order = (await q(`insert into public.billing_orders(provider, provider_order_id, application_case_id, owner_user_id, product, amount, currency, status, paid_at)
  values ('POLAR','legacy-1',$1,$2,'FINAL',19900,'krw','PAID',now()) returning id`, [c, u]))[0].id;
await q("insert into public.analysis_entitlements(billing_order_id, application_case_id, owner_user_id, product, allowed_characters) values ($1,$2,$3,'FINAL',60000)", [order, c, u]);
await q("insert into public.analysis_entitlements(billing_order_id, application_case_id, owner_user_id, product, allowed_characters, status, revoked_at) select id, $1, $2, 'FINAL', 1000, 'REVOKED', now() from public.billing_orders limit 0", [c, u]);

const failedMine = await applyMigrations(db, DIR, { only: isMine });
ok(failedMine.length === 0, "새 마이그레이션 두 개가 기존 행이 있는 DB 에 그대로 적용됨", JSON.stringify(failedMine));
const rows = await q("select billing_order_id, test_grant_id, status from public.analysis_entitlements");
ok(rows.length === 1 && rows[0].billing_order_id === order && rows[0].test_grant_id === null && rows[0].status === "ACTIVE", "기존 이용권 행은 그대로(주문 연결 유지)");

console.log("\n== 만료 처리 ==");
const admin = (await q("insert into auth.users(email) values ('a@example.com') returning id"))[0].id;
const mat = { schema: 1, baseVersion: null, documents: [], supplements: {}, slotAnswers: [], confirmations: [] };
const limits = { initial: 1, edit: 3, check: 2, complete: 6 };
const pack = (await q("select public.create_admin_snapshot_pack($1,$2,$3,'x',null) as r", [admin, mat, limits]))[0].r.packId;
const reserve = async (key, kind = "check", slot = null) => (await q("select public.reserve_interview_pack_usage($1,$2,$3,$4,$5) as r", [admin, pack, kind, key, slot]))[0].r;
const first = await reserve("key-exp-0001");
ok(first.outcome === "RESERVED", "예약");
ok((await reserve("key-exp-0002")).outcome === "BUSY", "진행 중에는 BUSY");
// 서버가 중간에 죽은 상황: 잠금과 예약이 5분보다 오래됨
await q("update public.interview_packs set busy_until = now() - interval '1 minute' where id=$1", [pack]);
await q("update public.interview_pack_usage set reserved_at = now() - interval '6 minutes' where id=$1", [first.usageId]);
const second = await reserve("key-exp-0002");
console.log("   second =", JSON.stringify(second));
ok(second.outcome === "RESERVED" && second.used === 1, "죽은 요청의 잠금·예약은 만료되어 새 요청이 받아들여지고 횟수도 되살아남");
await q("select public.settle_interview_pack_usage($1,$2,'confirmed',null)", [admin, second.usageId]);
const third = await reserve("key-exp-0003");
ok(third.outcome === "RESERVED" && third.used === 2, "확정된 것만 영구히 셈");
await q("select public.settle_interview_pack_usage($1,$2,'confirmed',null)", [admin, third.usageId]);
const fourth = await reserve("key-exp-0004");
ok(fourth.outcome === "LIMIT_REACHED", "한도(2) 도달");
// 늦게 도착한 옛 요청(만료된 예약)의 저장은 이미 다른 요청이 이어받았으므로 거절
let lateRejected = false;
try { await db.query("select public.save_interview_pack_assessment($1,$2,1,$3)", [admin, first.usageId, { materialsVersion: 1 }]); } catch (e) { lateRejected = String(e.message).includes("USAGE_NOT_ACTIVE"); try { await db.exec("rollback"); } catch {} }
ok(lateRejected, "만료된 옛 예약으로 늦게 저장하려 해도 거절");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

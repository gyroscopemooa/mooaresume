import "server-only";
import { createHash } from "node:crypto";
import { INTERVIEW_FEEDBACK_LIMITS } from "@/domain/interview-feedback";
import { InterviewApiError } from "./access";

type Entry = { digest: string; expiresAt: number; promise: Promise<unknown> | null };
type LimiterState = { entries: Map<string, Entry>; calls: number[]; active: number };
// A dev-server process guard, not distributed billing enforcement. HMR shares it.
const shared = globalThis as typeof globalThis & { __mooaInterviewDevLimiter?: LimiterState };
function state() { return shared.__mooaInterviewDevLimiter ??= { entries: new Map(), calls: [], active: 0 }; }

export function payloadDigest(value: string | Uint8Array) { return createHash("sha256").update(value).digest("hex"); }

export async function runInterviewRequest<T>(key: string, digest: string, run: () => Promise<T>): Promise<T> {
  const current = state();
  const now = Date.now();
  for (const [id, entry] of current.entries) if (entry.expiresAt < now) current.entries.delete(id);
  current.calls = current.calls.filter(time => time > now - 3_600_000);
  const previous = current.entries.get(key);
  if (previous) {
    if (previous.digest !== digest) throw new InterviewApiError(409, "REQUEST_ID_CONFLICT", "같은 요청 번호에 다른 입력을 사용할 수 없습니다.");
    if (!previous.promise) throw new InterviewApiError(409, "RESULT_EXPIRED", "임시 결과 보관 시간이 지났습니다. 같은 요청을 자동 재실행하지 않습니다. 다시 분석하려면 새 요청으로 시작해 주세요.");
    return previous.promise as Promise<T>;
  }
  if (current.active >= 1) throw new InterviewApiError(429, "BUSY", "다른 분석이 진행 중입니다. 완료 후 다시 시도해 주세요.");
  if (current.calls.length >= INTERVIEW_FEEDBACK_LIMITS.callsPerHour) throw new InterviewApiError(429, "CALL_LIMIT", "로컬 테스트의 시간당 호출 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.");
  current.calls.push(now);
  current.active += 1;
  // Include failures: an uncertain upstream outcome must never auto-bill again on retry.
  const promise = Promise.resolve().then(run).finally(() => { current.active -= 1; });
  const entry: Entry = { digest, promise, expiresAt: now + 3_600_000 };
  current.entries.set(key, entry);
  // Actively release output/transcript text even if the dev server receives no next request.
  // Keep only a hash/UUID tombstone for one hour to stop accidental repeat billing.
  setTimeout(() => { entry.promise = null; }, 600_000).unref();
  setTimeout(() => { if (current.entries.get(key) === entry) current.entries.delete(key); }, 3_600_000).unref();
  return promise;
}

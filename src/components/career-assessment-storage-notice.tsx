"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, LoaderCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./career-assessment-storage-notice.module.css";

type AssessmentCode = "interest" | "work_style" | "work_values";
type SaveState = "checking" | "guest" | "saving" | "saved" | "unavailable" | "error" | "restored";
const pendingSaves = new Map<string, Promise<SaveState>>();

function fingerprint(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

export function CareerAssessmentStorageNotice({ assessmentCode, assessmentVersion, answersRaw, resultPath, restored = false }: { assessmentCode: AssessmentCode; assessmentVersion: string; answersRaw: string | null; resultPath: string; restored?: boolean }) {
  const [state, setState] = useState<SaveState>(restored ? "restored" : answersRaw ? "checking" : "guest");

  useEffect(() => {
    if (restored || !answersRaw) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (error || !data.user) { if (active) setState("guest"); return; }
        const saveKey = `mooa-career-assessment-saved:${data.user.id}:${assessmentCode}:${assessmentVersion}:${fingerprint(answersRaw)}`;
        if (window.sessionStorage.getItem(saveKey) === "1") { if (active) setState("saved"); return; }
        let save = pendingSaves.get(saveKey);
        if (!save) {
          save = fetch("/api/career-assessments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assessmentCode, assessmentVersion, answers: JSON.parse(answersRaw) }) })
            .then(async (response) => {
              const body = await response.json().catch(() => ({})) as { error?: string };
              if (!response.ok) throw new Error(body.error ?? "저장에 실패했습니다.");
              window.sessionStorage.setItem(saveKey, "1");
              return "saved" as const;
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
              return message.includes("데이터베이스 적용 상태") ? "unavailable" as const : "error" as const;
            });
          pendingSaves.set(saveKey, save);
        }
        if (active) setState("saving");
        const completedState = await save;
        pendingSaves.delete(saveKey);
        if (active) setState(completedState);
      } catch {
        if (active) setState("error");
      }
    })();
    return () => { active = false; };
  }, [answersRaw, assessmentCode, assessmentVersion, restored]);

  if (state === "checking") return null;
  if (state === "guest") return <section className={styles.notice}><Cloud /><span><b>현재 결과는 이 브라우저에만 임시 보관돼요.</b><small>로그인하면 결과를 내 계정에 자동 저장하고, 다른 탭·기기에서도 다시 볼 수 있어요.</small></span><Link href={`/career/login?next=${encodeURIComponent(resultPath)}`}><LogIn />로그인하고 보관하기</Link></section>;
  if (state === "saving") return <section className={styles.notice}><LoaderCircle className={styles.spin} /><span><b>내 계정에 결과를 저장하고 있어요.</b><small>이 결과는 로그인한 본인만 볼 수 있습니다.</small></span></section>;
  if (state === "saved" || state === "restored") return <section className={styles.notice}><CheckCircle2 /><span><b>{state === "restored" ? "계정에 보관한 결과를 불러왔어요." : "내 계정에 결과를 저장했어요."}</b><small>{state === "restored" ? "현재 탭의 임시 기록이 없어도 다시 확인할 수 있습니다." : "다른 탭이나 기기에서도 저장된 결과를 다시 볼 수 있어요."}</small></span></section>;
  return <section className={styles.notice}><Cloud /><span><b>{state === "unavailable" ? "계정 저장 기능을 준비하고 있어요." : "결과를 계정에 저장하지 못했어요."}</b><small>현재 결과는 이 브라우저에 그대로 남아 있습니다.</small></span></section>;
}

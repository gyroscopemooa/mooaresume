"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Info, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WorkStyleTypeDefinition } from "@/domain/work-style-type-config";
import { WorkStyleCharacterResult } from "./work-style-character-result";
import styles from "./career-assessment-closed.module.css";

/**
 * 직업흥미·직업가치의 캐릭터 화면과 같은 이유로 로그인만 걸고 결제는 걸지 않는다 —
 * 퍼뜨리는 카드이고, 문장도 AI가 아니라 미리 써 둔 것이다. 로그인 확인을 서버가 아니라
 * 여기서 하는 이유도 같다(다른 커리어 화면들과 세션 확인 시점을 맞추기 위해).
 */
export function WorkStyleCharacterGate({ type }: { type: WorkStyleTypeDefinition }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (active) setSignedIn(!error && Boolean(data.user));
      } catch {
        if (active) setSignedIn(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (signedIn === null) return null;
  if (signedIn) return <WorkStyleCharacterResult type={type} />;

  return (
    <div className={styles.shell}>
      <main className={styles.body}>
        <div className={styles.lock}><LockKeyhole /></div>
        <span className={styles.kicker}>SIGN IN</span>
        <h1>캐릭터 해설은<br />로그인하면 무료로 볼 수 있어요.</h1>
        <p>결제는 필요 없습니다. 로그인하면 검사 결과가 계정에 저장돼, 기기를 바꾸거나 나중에 다시 와도 이 카드를 그대로 볼 수 있습니다.</p>
        <div className={styles.actions}>
          <Link href={`/career/login?next=${encodeURIComponent(`/career/work-style/character?type=${type.id}`)}`}>로그인하고 보기 <ArrowRight /></Link>
          <Link href="/career/work-style/result">기본 결과로 돌아가기 <ArrowRight /></Link>
        </div>
        <div className={styles.note}>
          <Info />
          <p>이 브라우저에서 마친 검사 결과는 그대로 남아 있습니다. 로그인해도 다시 풀지 않습니다.</p>
        </div>
      </main>
    </div>
  );
}

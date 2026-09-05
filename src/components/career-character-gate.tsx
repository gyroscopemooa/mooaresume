"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Info, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RiasecCharacterProfile } from "@/domain/career-interest";
import { CareerCharacterResult } from "./career-character-result";
import styles from "./career-assessment-closed.module.css";

/**
 * 캐릭터 해설을 로그인한 사람에게만 보여 줍니다.
 *
 * ------------------------------------------------------------------
 * 왜 유료가 아니라 로그인인가
 * ------------------------------------------------------------------
 * 이 카드는 파는 물건이 아니라 **퍼뜨리는 물건**입니다. 공유 단추와 카드
 * 이미지가 이미 붙어 있고, 유형 결과를 공짜로 뿌려서 사람이 들어오는 것이
 * 이런 검사의 작동 방식입니다. 여기에 결제를 걸면 유입 통로를 스스로 잠급니다.
 *
 * 게다가 이 해설은 AI가 아니라 미리 써 둔 문장을 조합한 것입니다. 돈을 받고
 * 팔면 나중에 진짜 AI 심층해설이 나올 때 "이미 산 것 아니냐"가 됩니다.
 *
 * 대신 로그인은 걸립니다. 공짜로 주는 대가로 계정을 받고, 결과가 계정에
 * 저장되고, 나중에 심층해설을 팔 상대가 남습니다.
 *
 * ------------------------------------------------------------------
 * 왜 서버가 아니라 여기서 확인하는가
 * ------------------------------------------------------------------
 * 이 화면의 다른 커리어 페이지들이 모두 브라우저에서 세션을 확인합니다
 * (`career-ai-preparation.tsx`). 한 화면만 서버에서 막으면 로그인 직후의
 * 세션 반영 시점이 달라져, 방금 로그인한 사람이 다시 로그인 화면을 봅니다.
 */
export function CareerCharacterGate({ profile }: { profile: RiasecCharacterProfile }) {
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

  // 확인하는 동안은 아무것도 단정하지 않습니다. 여기서 잠깐 로그인 화면을
  // 보여 주면, 이미 로그인한 사람에게 화면이 두 번 바뀝니다.
  if (signedIn === null) return null;
  if (signedIn) return <CareerCharacterResult profile={profile} />;

  return (
    <div className={styles.shell}>
      <main className={styles.body}>
        <div className={styles.lock}><LockKeyhole /></div>
        <span className={styles.kicker}>SIGN IN</span>
        <h1>캐릭터 해설은<br />로그인하면 무료로 볼 수 있어요.</h1>
        <p>
          결제는 필요 없습니다. 로그인하면 검사 결과가 계정에 저장돼, 기기를
          바꾸거나 나중에 다시 와도 이 카드를 그대로 볼 수 있습니다.
        </p>

        <div className={styles.actions}>
          <Link href={`/career/login?next=${encodeURIComponent(`/career/character?code=${profile.code}`)}`}>로그인하고 보기 <ArrowRight /></Link>
          <Link href="/career/interest/result">기본 결과로 돌아가기 <ArrowRight /></Link>
        </div>

        <div className={styles.note}>
          <Info />
          <p>
            이 브라우저에서 마친 검사 결과는 그대로 남아 있습니다. 로그인해도
            다시 풀지 않습니다.
          </p>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Info, UsersRound } from "lucide-react";
import styles from "./mentor-pool-banner.module.css";

export function MentorPoolBanner() {
  return <aside className={styles.banner} aria-labelledby="mentor-pool-title">
    <div className={styles.illustration}>
      <Image src="/images/mentors/conversation.webp" alt="" width={1536} height={1024} unoptimized className={styles.art} />
    </div>
    <div className={styles.copy}>
      <span className={styles.badge}><UsersRound size={16} aria-hidden="true" />무료 멘토 연결 · 참여 희망 모집</span>
      <h2 id="mentor-pool-title">한 번쯤 만나,<br /><em>이야기를 나누고 싶은 사람.</em></h2>
      <p>궁금했던 직업, 꿈꾸는 일, 먼저 걸어본 삶의 이야기.<br />만나고 싶은 분과 경험을 나눌 분을 기다립니다.</p>
      <div className={styles.notice}><Info size={17} aria-hidden="true" /><small>지금은 참여자를 모으는 단계예요.<br className={styles.noticeBreak} /> 어울리는 상대가 있으면 개별 연락드려요.</small></div>
    </div>
    <div className={styles.actions}>
      <Link href="/mentors?kind=mentee#apply">멘토를 만나고 싶어요 <ArrowRight size={18} aria-hidden="true" /></Link>
      <Link href="/mentors?kind=mentor#apply">경험을 나누고 싶어요 <ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  </aside>;
}

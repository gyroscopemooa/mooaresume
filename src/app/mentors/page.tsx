import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessagesSquare, Sprout, HandHeart } from "lucide-react";
import { MentorPoolForm } from "@/components/mentor-pool-form";
import styles from "./mentors.module.css";

export const metadata: Metadata = {
  title: "무료 멘토 연결 · 참여 희망 모집",
  description: "만나고 싶은 멘토가 있나요? 나누고 싶은 경험이 있나요? 직업, 꿈, 삶의 이야기를 나눌 멘토와 참여 희망자를 모집합니다.",
  alternates: { canonical: "/mentors" },
};
export default async function MentorsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}>MOOA <b>Resume</b></Link><Link href="/"><ArrowLeft size={16} /> 홈으로</Link></header>
    <div className={styles.layout}>
      <section className={styles.intro}>
        <span className={styles.badge}><span /> 무료 멘토 연결 · 참여 희망 모집</span>
        <h1>그 사람의 이야기를<br />한 번 들어볼 수 있다면.</h1>
        <p className={styles.lead}>궁금했던 직업을 가진 사람,<br />내가 꿈꾸는 일을 먼저 해본 사람.<br />어쩌면 그저, 편하게 이야기를 나눌 사람.</p>
        <p className={styles.description}>거창한 상담이 아니어도 괜찮아요. 만나고 싶은 멘토와 나누고 싶은 경험을 알려 주세요. 서로에게 맞는 만남을 찾을 수 있도록, 지금은 참여할 분들을 모으고 있어요.</p>
        <div className={styles.examples}>
          <p><MessagesSquare size={18} /><span>“그 일을 하는 하루는 어떤가요?”</span></p>
          <p><Sprout size={18} /><span>“저도 새로운 일을 시작해 보고 싶어요.”</span></p>
          <p><HandHeart size={18} /><span>“제가 겪었던 이야기가 도움이 될까요?”</span></p>
        </div>
        <div className={styles.process}>
          <h2>이렇게 이어가려고 해요</h2>
          <ol><li><b>참여 희망 남기기</b><span>관심과 이야기를 비공개로 받아요.</span></li><li><b>서로 맞는 사람 찾기</b><span>운영자가 기록을 읽고 연결 가능성을 살펴봐요.</span></li><li><b>양쪽의 의사 확인하기</b><span>어울리는 상대가 있으면 개별 연락드려요.</span></li></ol>
        </div>
        <p className={styles.note}>전국 온라인 만남을 중심으로 준비합니다. 오프라인은 울산에서 먼저 진행할 예정이며, 지금은 관심 지역을 함께 받고 있어요. 연결 여부와 시기는 아직 확정되지 않았습니다.</p>
      </section>
      <section className={styles.formCard} id="apply" aria-labelledby="mentor-form-title">
        <MentorPoolForm initialKind={kind === "mentor" ? "mentor" : "mentee"} />
      </section>
    </div>
    <footer className={styles.footer}><span>경험을 나누는 작은 만남에서 시작합니다.</span><Link href="/privacy">개인정보 처리방침</Link><a href="mailto:support@mooaresume.com">운영자 문의</a></footer>
  </main>;
}

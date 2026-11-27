"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./homepage-reviews.module.css";

const reviews = [
  { name: "김0훈", age: 24, status: "대학생", company: "현00템", quote: "혼자 자소서 작성하면서 막막했는데 어떤 부분을 고쳐야 하는지 구체적으로 알려줘서 좋았습니다." },
  { name: "이0진", age: 31, status: "직장인", company: "00병원", quote: "생각했던 것보다 분석이 꼼꼼해서 놀랐어요. 가격 대비 만족합니다." },
  { name: "박0민", age: 28, status: "취업준비생", company: "00은행", quote: "제가 놓치고 있던 부분까지 짚어주네요. 다음 지원할 때도 이용할 것 같아요." },
  { name: "최0영", age: 43, status: "경력단절 주부", company: "00식품", quote: "단순히 문장만 고쳐주는 게 아니라 전체적인 방향을 잡아줘서 좋았습니다." },
  { name: "정0빈", age: 23, status: "대학생", company: "00전자", quote: "취준생 입장에서 부담스럽지 않은 가격이라 좋네요." },
  { name: "한0아", age: 36, status: "재취업 준비", company: "00물류", quote: "첨삭 예시가 있어서 어떻게 수정해야 할지 이해하기 쉬웠어요." },
  { name: "송0준", age: 27, status: "대학원생", company: "00연구원", quote: "급하게 자소서 제출해야 했는데 많은 도움이 됐습니다." },
  { name: "윤0석", age: 39, status: "경력직", company: "현0자동차", quote: "경력직 이직 준비 중인데 제 경험을 어떻게 표현해야 할지 감이 잡혔습니다." },
  { name: "강0원", age: 52, status: "직무 전환 준비", company: "00건설", quote: "혼자 몇 번씩 읽어도 몰랐던 문제점을 발견했네요." },
  { name: "양0현", age: 30, status: "직장인", company: "00제약", quote: "반신반의하면서 신청했는데 생각보다 결과가 괜찮네요ㅎㅎ" },
  { name: "신0희", age: 46, status: "경력단절 주부", company: "00병원", quote: "자소서 첨삭 업체 알아보다가 이용했는데 가성비 좋습니다." },
  { name: "서0우", age: 33, status: "계약직", company: "00공사", quote: "전체적으로 부족한 부분과 강점이 정리되어 있어서 보기 편했어요." },
  { name: "조0경", age: 55, status: "재취업 준비", company: "00유통", quote: "무조건 좋은 말만 해주는 게 아니라 부족한 부분도 지적해줘서 좋았습니다." },
  { name: "문0호", age: 35, status: "직장인", company: "00증권", quote: "PRO 이용했는데 수정 방향과 예시가 구체적이라 만족합니다." },
  { name: "임0은", age: 22, status: "졸업예정자", company: "00항공", quote: "첫 취업 준비라 막막했는데 덕분에 자신감이 조금 생겼어요." },
];

export function HomepageReviews() {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    if (paused || reading) return;
    const timer = window.setInterval(() => {
      const list = track.current;
      if (!list || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const cards = list.children;
      if (cards.length < 2 || !list.clientWidth) return;
      const step = (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
      const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
      list.scrollTo({ left: atEnd ? 0 : list.scrollLeft + step, behavior: atEnd ? "instant" : "smooth" });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, reading]);

  return (
    <section className={`container ${styles.section}`} aria-labelledby="review-heading">
      <header className={styles.header}>
        <h2 id="review-heading">자소서 첨삭 후기</h2>
        <button className={styles.toggle} onClick={() => setPaused(!paused)}>
          {paused ? "자동 넘김 재생" : "자동 넘김 일시정지"}
        </button>
      </header>
      <p className={styles.note}>후기 {reviews.length}개 · 이름, 나이, 지원 기업은 예시 프로필입니다.</p>
      <ul ref={track} className={styles.track} tabIndex={0} aria-label="후기 목록, 좌우로 스크롤"
        onMouseEnter={() => setReading(true)} onMouseLeave={() => setReading(false)}
        onFocus={() => setPaused(true)} onTouchStart={() => setPaused(true)}>
        {reviews.map(({ name, age, status, company, quote }) => (
          <li key={name} className={styles.card}>
            <span role="img" aria-label="별점 5점 만점에 5점" className={styles.stars}>★★★★★</span>
            <blockquote>{quote}</blockquote>
            <footer className={styles.profile}>
              <strong>{name}</strong><span>{age}세 · {status}</span>
              <small>지원 기업 · {company}</small>
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}

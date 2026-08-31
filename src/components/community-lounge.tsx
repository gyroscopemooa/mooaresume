"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Compass,
  FilePenLine,
  LockKeyhole,
  MessageCircleMore,
  PenLine,
  Sparkles,
} from "lucide-react";
import { communityPreviewPosts, communityTopics, type CommunityTopicId } from "@/domain/community-lounge";
import styles from "./community-lounge.module.css";

const topicIcons = {
  "job-search": BriefcaseBusiness,
  career: Compass,
  application: FilePenLine,
  "work-life": MessageCircleMore,
} as const;

export function CommunityLounge() {
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopicId>("all");
  const visiblePosts = useMemo(
    () => communityPreviewPosts.filter((post) => selectedTopic === "all" || post.topic === selectedTopic),
    [selectedTopic],
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="MOOA Resume 홈">
          <span className={styles.brandMark}>M</span>
          <span>MOOA Resume</span>
        </Link>
        <nav className={styles.navigation} aria-label="커뮤니티 바로가기">
          <Link href="/career">커리어 검사</Link>
          <Link href="/career/ai?scope=combined">AI 심층해설</Link>
          <Link className={styles.loginLink} href="/career/login?next=/community">로그인</Link>
        </nav>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>MOOA COMMUNITY LOUNGE</span>
          <h1>취업/진로 고민 익명게시판</h1>
          <p>혼자 정리하기 어려운 취업·진로 고민을 나누고, 나에게 맞는 다음 행동을 찾아보는 공간입니다.</p>
          <div className={styles.notice}>
            <LockKeyhole aria-hidden="true" />
            <span>공개 전 기초 화면입니다. 실제 글쓰기와 댓글 기능은 다음 단계에서 연결됩니다.</span>
          </div>
        </section>

        <section className={styles.topicSection} aria-labelledby="community-topics">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>FIND YOUR START</span>
              <h2 id="community-topics">지금 어떤 고민이 가장 큰가요?</h2>
            </div>
            <p>주제를 고르면 관련 예시와 바로 해볼 수 있는 탐색을 함께 보여줍니다.</p>
          </div>
          <div className={styles.topicGrid}>
            {communityTopics.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  className={`${styles.topicCard} ${isSelected ? styles.topicCardSelected : ""}`}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  aria-pressed={isSelected}
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.feed} aria-labelledby="community-feed">
            <div className={styles.feedHeading}>
              <div>
                <span className={styles.eyebrow}>LOUNGE PREVIEW</span>
                <h2 id="community-feed">고민을 이렇게 나눌 수 있어요</h2>
              </div>
              <span className={styles.previewBadge}>예시 글</span>
            </div>

            <div className={styles.posts}>
              {visiblePosts.map((post) => {
                const Icon = topicIcons[post.topic];
                return (
                  <article className={styles.postCard} key={post.id}>
                    <div className={styles.postMeta}>
                      <span className={styles.avatar} aria-hidden="true"><Icon /></span>
                      <span>익명의 취업 준비자</span>
                      <span className={styles.dot}>·</span>
                      <span>{post.topicLabel}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <div className={styles.promptBox}>
                      <Sparkles aria-hidden="true" />
                      <span>{post.prompt}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className={styles.sidebar} aria-label="커리어 탐색 바로가기">
            <section className={styles.actionCard}>
              <span className={styles.eyebrow}>FREE CAREER START</span>
              <h2>고민을 말로 꺼내기 전, 내 방향부터 정리해 보세요.</h2>
              <p>검사 결과는 정답이 아니라 내 선택을 비교해 볼 출발점이에요.</p>
              <Link href="/career/interest" className={styles.primaryAction}>
                직업흥미 탐색하기 <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/career" className={styles.secondaryAction}>
                커리어 검사 전체 보기 <ArrowRight aria-hidden="true" />
              </Link>
            </section>

            <section className={styles.guidelineCard}>
              <h2>익명 라운지 약속</h2>
              <ul>
                <li>개인 연락처·실명·회사 내부 정보는 적지 않아요.</li>
                <li>합격 여부나 직업을 단정하는 답변은 지양해요.</li>
                <li>경험과 상황을 중심으로 서로의 다음 선택을 돕습니다.</li>
              </ul>
            </section>
          </aside>
        </div>

        <section className={styles.composer} aria-labelledby="community-compose">
          <div>
            <span className={styles.eyebrow}>COMING NEXT</span>
            <h2 id="community-compose">내 고민을 익명으로 남기기</h2>
            <p>로그인·안전 가이드·신고 흐름을 정리한 뒤 열 예정입니다.</p>
          </div>
          <button type="button" disabled className={styles.composerButton}>
            <PenLine aria-hidden="true" /> 익명 고민 남기기 준비 중
          </button>
        </section>
      </div>
    </main>
  );
}
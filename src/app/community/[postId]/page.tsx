import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { communityPostPath, communitySearchDescription, communityTopicMeta } from "@/domain/community";
import { getPublishedCommunityComments, getPublishedCommunityPost, getRelatedCommunityPosts } from "@/server/community/community-publication";
import { communityAuthorName, communityStructuredData, serializeCommunityStructuredData } from "@/domain/community-structured-data";
import { getSiteUrl } from "@/lib/site-url";
import { communityGuidance } from "@/domain/community-guidance";
import { PostComments } from "./post-comments";
import styles from "./page.module.css";

type PageProps = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPublishedCommunityPost(postId);
  if (!post) return { title: "글을 찾을 수 없어요", robots: { index: false, follow: false } };
  const description = communitySearchDescription(post.body);
  const canonical = communityPostPath(post.id);
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: { type: "article", locale: "ko_KR", title: post.title, description, url: canonical, publishedTime: post.createdAt, modifiedTime: post.updatedAt || post.createdAt },
    twitter: { card: "summary", title: post.title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CommunityPostPage({ params }: PageProps) {
  const { postId } = await params;
  const post = await getPublishedCommunityPost(postId);
  if (!post) notFound();
  const [comments, relatedPosts] = await Promise.all([
    getPublishedCommunityComments(post.id),
    getRelatedCommunityPosts(post.id, post.topic).catch(() => []),
  ]);
  const guidance = communityGuidance(post.topic);
  const jsonLd = communityStructuredData(post, comments, getSiteUrl());
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeCommunityStructuredData(jsonLd) }} />
    <header className={styles.header}><Link href="/community">← 취업·진로 라운지</Link><Link href="/">MOOA Resume</Link></header>
    <article className={styles.article}>
      <p className={styles.topic}>{communityTopicMeta[post.topic].label}</p>
      <h1>{post.title}</h1>
      <p className={styles.meta}>{communityAuthorName(post)}{post.isEditorial && <BadgeCheck className={styles.editorialBadge}/>} · <time dateTime={post.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(post.createdAt))}</time> · 추천 {post.recommendationCount}</p>
      <div className={styles.body}>{post.body}</div>
    </article>
    {(relatedPosts.length > 0 || guidance.length > 0) && <nav className={styles.related} aria-label="관련 글과 이용 안내">
      {relatedPosts.length > 0 && <section><h2>같은 주제의 최근 글</h2><ul>{relatedPosts.map((item) => <li key={item.id}><Link href={communityPostPath(item.id)}>{item.title}</Link></li>)}</ul></section>}
      {guidance.length > 0 && <section><h2>이어서 살펴볼 안내</h2><ul>{guidance.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul></section>}
    </nav>}
    <section className={styles.comments} aria-labelledby="community-comments-title">
      {/* 목록과 입력창을 클라이언트 조각으로 옮겼습니다. 첫 요청에서는 서버가
          렌더하므로 댓글 본문은 그대로 HTML에 남습니다 — 위 JSON-LD와 함께
          이 페이지가 검색에서 갖는 값이라 잃으면 안 됩니다. */}
      <PostComments postId={post.id} initialComments={comments} />
    </section>
    <footer className={styles.footer}><Link href="/community">다른 취업·진로 고민 읽기</Link></footer>
  </main>;
}
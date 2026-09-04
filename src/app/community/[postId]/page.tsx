import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { communityPostPath, communitySearchDescription, communityTopicMeta } from "@/domain/community";
import { getPublishedCommunityComments, getPublishedCommunityPost } from "@/server/community/community-publication";
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
  const comments = await getPublishedCommunityComments(post.id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: post.title,
    articleBody: post.body,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    url: communityPostPath(post.id),
    interactionStatistic: [{ "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.recommendationCount }, { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: comments.length }],
    comment: comments.map((comment) => ({ "@type": "Comment", text: comment.body, dateCreated: comment.createdAt })),
  };
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className={styles.header}><Link href="/community">← 취업·진로 라운지</Link><Link href="/">MOOA Resume</Link></header>
    <article className={styles.article}>
      <p className={styles.topic}>{communityTopicMeta[post.topic].label}</p>
      <h1>{post.title}</h1>
      <p className={styles.meta}>{post.isEditorial && <span className={styles.editorialBadge}>운영팀</span>}익명 · <time dateTime={post.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(post.createdAt))}</time> · 추천 {post.recommendationCount}</p>
      <div className={styles.body}>{post.body}</div>
    </article>
    <section className={styles.comments} aria-labelledby="community-comments-title">
      <h2 id="community-comments-title">댓글 {comments.length}</h2>
      {comments.length === 0 ? <p>아직 댓글이 없어요.</p> : <ol>{comments.map((comment) => <li key={comment.id}><p>{comment.body}</p><small>{comment.isEditorial && <span className={styles.editorialBadge}>운영팀</span>}익명 · <time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(comment.createdAt))}</time></small></li>)}</ol>}
    </section>
    <footer className={styles.footer}><Link href="/community">다른 취업·진로 고민 읽기</Link></footer>
  </main>;
}
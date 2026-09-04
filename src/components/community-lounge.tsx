"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Flame, ImagePlus, LoaderCircle, MessageCircle, PenLine, Send, ShieldAlert, Sparkles, ThumbsUp, Trash2, X } from "lucide-react";
import { communityPostPath, communityTopicMeta, communityTopics, type CommunityAttachmentInput, type CommunityComment, type CommunityPost, type CommunityTopicId } from "@/domain/community";
import { HeaderAccount } from "@/components/header-account";
import { createClient } from "@/lib/supabase/client";
import styles from "./community-lounge.module.css";

type Sort = "latest" | "popular";
type ApiError = { error?: string };

async function responseJson(response: Response) { return await response.json().catch(() => ({})) as ApiError; }
function displayTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return value; const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000)); return minutes < 60 ? `${minutes}분 전` : minutes < 1440 ? `${Math.floor(minutes / 60)}시간 전` : `${Math.floor(minutes / 1440)}일 전`; }

export function CommunityLounge({ attachmentNotice = false }: { attachmentNotice?: boolean } = {}) {
  const router = useRouter();
  // 처음 값(마운트 시점)만 씁니다 — 배너를 닫은 뒤 부모가 리렌더된다고
  // 다시 켜지면 안 됩니다. 그래서 useState 초깃값으로만 받습니다.
  const [showAttachmentNotice, setShowAttachmentNotice] = useState(attachmentNotice);
  useEffect(() => {
    // 새로고침해도 같은 배너가 또 뜨지 않게, 보여준 즉시 주소의 표시만 지웁니다.
    if (attachmentNotice) router.replace("/community");
  }, [attachmentNotice, router]);
  // 화면 표시 여부만 결정합니다 — 실제 삭제 권한은 서버(/api/community/posts/[id])가
  // 같은 이메일을 COMMUNITY_ADMIN_EMAILS와 다시 대조해 확인합니다. 여기서
  // 틀려도(예: 세션 조회 실패) 버튼이 안 보일 뿐, 권한 없는 삭제가 되지 않습니다.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void createClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setIsAdmin(data.user?.email === "jeonmeensoo@gmail.com");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [sort, setSort] = useState<Sort>("latest");
  const [topic, setTopic] = useState<CommunityTopicId | "all">("all");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [feedStatus, setFeedStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ sort });
    if (topic !== "all") params.set("topic", topic);

    void fetch(`/api/community/posts?${params}`).then(async (response) => {
      if (!response.ok) throw new Error("게시글을 불러오지 못했어요.");
      const data = await responseJson(response) as ApiError & { posts?: CommunityPost[]; hasMore?: boolean };
      if (!cancelled) {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setHasMore(Boolean(data.hasMore));
        setFeedStatus("ready");
      }
    }).catch(() => {
      if (!cancelled) setFeedStatus("error");
    });
    return () => { cancelled = true; };
  }, [sort, topic, reloadKey]);

  // 정렬/주제를 바꾸면 처음부터 다시 세므로, "더 보기"는 언제나 지금까지
  // 쌓인 글 개수를 다음 페이지의 시작점으로 씁니다.
  async function loadMore() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort, offset: String(posts.length) });
      if (topic !== "all") params.set("topic", topic);
      const response = await fetch(`/api/community/posts?${params}`);
      if (!response.ok) throw new Error();
      const data = await responseJson(response) as ApiError & { posts?: CommunityPost[]; hasMore?: boolean };
      setPosts((current) => [...current, ...(Array.isArray(data.posts) ? data.posts : [])]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setMessage("더 보기를 불러오지 못했어요.");
    } finally {
      setLoadingMore(false);
    }
  }

  const topicPosts = useMemo(() => posts.filter((post) => topic === "all" || post.topic === topic), [posts, topic]);

  // 지금 로드된 페이지(최대 20개, 게다가 주제로 걸러진 것)가 아니라 사이트
  // 전체에서 뽑아야 하는 목록이라 별도로 요청합니다. 예전에는 이 화면에
  // 보이는 posts만 정렬해 "인기글"이라고 이름 붙였는데, 그러면 실제로는
  // "지금 이 페이지 안에서 인기"였고 500개 중 최신 20개만 대상이 됐습니다.
  const [hotPosts, setHotPosts] = useState<CommunityPost[]>([]);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/community/posts?sort=popular&window=7d&limit=3").then(async (response) => {
      if (!response.ok) return;
      const data = await responseJson(response) as ApiError & { posts?: CommunityPost[] };
      if (!cancelled && Array.isArray(data.posts)) setHotPosts(data.posts);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function toggleRecommend(post: CommunityPost) {
    if (post.id.startsWith("preview-")) { setMessage("정식 라운지가 열리면 추천할 수 있어요."); return; }
    const response = await fetch(`/api/community/posts/${post.id}/recommend`, { method: "POST" });
    const data = await responseJson(response) as ApiError & { recommendationCount?: number };
    if (!response.ok) { setMessage(data.error ?? "추천을 반영하지 못했어요."); return; }
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, recommendationCount: data.recommendationCount ?? item.recommendationCount } : item));
  }

  async function toggleComments(post: CommunityPost) {
    if (post.id.startsWith("preview-")) { setMessage("정식 라운지가 열리면 댓글을 남길 수 있어요."); return; }
    if (activeComments === post.id) { setActiveComments(null); return; }
    setActiveComments(post.id);
    if (comments[post.id]) return;
    const response = await fetch(`/api/community/posts/${post.id}/comments`);
    const data = await responseJson(response) as ApiError & { comments?: CommunityComment[] };
    if (response.ok && Array.isArray(data.comments)) setComments((current) => ({ ...current, [post.id]: data.comments! }));
  }

  async function submitComment(postId: string, body: string) {
    const response = await fetch(`/api/community/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    const data = await responseJson(response) as ApiError & { comment?: CommunityComment };
    if (!response.ok || !data.comment) { setMessage(data.error ?? "댓글을 저장하지 못했어요."); return false; }
    setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), data.comment!] }));
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post));
    return true;
  }

  async function reportPost(postId: string) {
    if (postId.startsWith("preview-") || !window.confirm("개인정보·괴롭힘·광고 등 운영정책 위반으로 신고할까요?")) return;
    const response = await fetch("/api/community/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectType: "POST", subjectId: postId, reason: "OTHER" }) });
    const data = await responseJson(response);
    setMessage(response.ok ? "신고를 접수했어요. 운영 기준에 따라 검토합니다." : data.error ?? "신고를 접수하지 못했어요.");
  }

  async function deletePost(postId: string) {
    if (postId.startsWith("preview-") || !window.confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    const data = await responseJson(response);
    if (!response.ok) { setMessage(data.error ?? "글을 삭제하지 못했어요."); return; }
    setPosts((current) => current.filter((item) => item.id !== postId));
    setMessage("글을 삭제했어요.");
  }

  // 헤더의 계정 메뉴가 쓰는 것과 같은 로그인입니다. 첨부를 누르자마자
  // 새 탭이 아니라 이 배너에서 바로 로그인까지 끝낼 수 있게 여기서도
  // 직접 부릅니다.
  async function signInForAttachment() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/community` },
    });
  }

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/" aria-label="MOOA Resume 홈"><span>M</span><b>MOOA</b> Resume</Link>
      <nav aria-label="라운지 주요 메뉴"><Link href="/career">커리어 검사</Link><Link className={styles.activeLink} href="/community">라운지</Link><Link href="/#plans">요금</Link><HeaderAccount /></nav>
    </header>

    {showAttachmentNotice && <div className={styles.loginNotice} role="status">
      <ShieldAlert/> 첨부파일은 로그인 후에 볼 수 있어요.
      <button type="button" onClick={() => void signInForAttachment()}>로그인하기</button>
      <button type="button" aria-label="안내 닫기" onClick={() => setShowAttachmentNotice(false)}><X/></button>
    </div>}

    <section className={styles.hero}>
      <div><span className={styles.kicker}>MOOA COMMUNITY</span><h1>취업 고민을<br/><em>혼자 쌓아두지 마세요.</em></h1><p>지원, 직무, 자소서, 회사생활. 비슷한 고민을 읽고<br/>지금 내게 필요한 다음 행동을 찾아보세요.</p></div>
      <div className={styles.heroCard}><Sparkles/><b>오늘의 시작 질문</b><p>지금 가장 막히는 건 경험 정리인가요, 직무 선택인가요?</p><button type="button" onClick={() => setComposerOpen(true)}>내 고민 정리하기 <ArrowRight/></button></div>
    </section>

    <section className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTitle}><Flame/><b>이번 주 많이 읽은 글</b></div>
        {hotPosts.map((post, index) => <button type="button" className={styles.hotPost} key={post.id} onClick={() => setTopic(post.topic)}><span>{index + 1}</span><b>{post.title}</b><small>추천 {post.recommendationCount}</small></button>)}
        <div className={styles.sideGuide}><b>라운지 약속</b><p>실명·연락처·회사 내부정보는 쓰지 않아요. 합격 여부를 단정하는 답변보다 다음 행동을 함께 찾아요.</p><Link href="/career">내 방향 먼저 정리하기 <ArrowRight/></Link></div>
      </aside>

      <section className={styles.feed} aria-label="취업 진로 고민 게시글">
        <div className={styles.feedTop}><div className={styles.sortTabs}><button className={sort === "latest" ? styles.selected : ""} type="button" onClick={() => { setFeedStatus("loading"); setSort("latest"); }}>최신</button><button className={sort === "popular" ? styles.selected : ""} type="button" onClick={() => { setFeedStatus("loading"); setSort("popular"); }}>인기</button></div><button type="button" className={styles.writeButton} onClick={() => setComposerOpen(true)}><PenLine/> 고민 남기기</button></div>
        <div className={styles.topicTabs}><button className={topic === "all" ? styles.topicSelected : ""} type="button" onClick={() => setTopic("all")}>전체</button>{communityTopics.map((item) => <button className={topic === item ? styles.topicSelected : ""} type="button" key={item} onClick={() => { setFeedStatus("loading"); setTopic(item); }}>{communityTopicMeta[item].label}</button>)}</div>
        <p className={styles.feedHint}>{sort === "latest" ? "방금 올라온 고민부터 읽어보세요." : "추천과 대화가 이어진 글을 먼저 봐요."}</p>
        <div className={styles.posts}>{topicPosts.map((post) => <PostCard key={post.id} post={post} comments={comments[post.id] ?? []} commentsOpen={activeComments === post.id} onRecommend={() => void toggleRecommend(post)} onToggleComments={() => void toggleComments(post)} onSubmitComment={submitComment} onReport={() => void reportPost(post.id)} onDelete={isAdmin ? () => void deletePost(post.id) : undefined} />)}</div>
        {feedStatus === "ready" && hasMore && <button type="button" className={styles.loadMore} disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? <LoaderCircle/> : "더 보기"}</button>}
        {feedStatus === "loading" && <div className={styles.empty} aria-live="polite"><b>글을 불러오는 중이에요.</b><p>잠시만 기다려 주세요.</p></div>}
        {feedStatus === "error" && <div className={styles.empty} role="alert"><b>글을 불러오지 못했어요.</b><p>연결을 확인한 뒤 다시 시도해 주세요.</p><button type="button" onClick={() => { setFeedStatus("loading"); setReloadKey((value) => value + 1); }}>다시 불러오기</button></div>}
        {feedStatus === "ready" && topicPosts.length === 0 && <div className={styles.empty}><b>아직 이 주제의 글이 없어요.</b><p>첫 고민을 남기면 같은 길을 걷는 사람에게 도움이 될 수 있어요.</p><button type="button" onClick={() => setComposerOpen(true)}>첫 글 남기기</button></div>}
      </section>
    </section>

    {message && <div className={styles.toast} role="status">{message}<button type="button" aria-label="안내 닫기" onClick={() => setMessage("")}><X/></button></div>}
    {composerOpen && <PostComposer onClose={() => setComposerOpen(false)} onCreated={(post) => { setPosts((current) => [post, ...current]); setFeedStatus("ready"); setComposerOpen(false); setTopic("all"); setSort("latest"); }} onError={setMessage}/>}
  </main>;
}

function PostCard({ post, comments, commentsOpen, onRecommend, onToggleComments, onSubmitComment, onReport, onDelete }: { post: CommunityPost; comments: CommunityComment[]; commentsOpen: boolean; onRecommend: () => void; onToggleComments: () => void; onSubmitComment: (postId: string, body: string) => Promise<boolean>; onReport: () => void; onDelete?: () => void }) {
  const [comment, setComment] = useState(""); const [sending, setSending] = useState(false);
  async function send() { if (!comment.trim()) return; setSending(true); if (await onSubmitComment(post.id, comment.trim())) setComment(""); setSending(false); }
  return <article className={styles.post}><header><span className={styles.category}>{communityTopicMeta[post.topic].label}</span><span>{post.anonymousAlias}</span><i>·</i><time>{displayTime(post.createdAt)}</time>{onDelete && <button type="button" onClick={onDelete} aria-label="게시글 삭제(관리자)"><Trash2/></button>}<button type="button" onClick={onReport} aria-label="게시글 신고"><ShieldAlert/></button></header><h2><Link href={communityPostPath(post.id)}>{post.title}</Link></h2><p>{post.body}</p>{post.attachments.length > 0 && <div className={styles.attachments}>{post.attachments.map((file) => <a key={file.id} href={`/api/community/attachments/${file.id}`} target="_blank" rel="noreferrer"><FileText/>{file.filename}<small>로그인 후 열기</small></a>)}</div>}<footer><button type="button" onClick={onRecommend}><ThumbsUp/> 추천 <b>{post.recommendationCount}</b></button><button type="button" onClick={onToggleComments}><MessageCircle/> 댓글 <b>{post.commentCount}</b></button></footer>{commentsOpen && <div className={styles.comments}>{comments.map((item) => <div key={item.id}><b>{item.anonymousAlias}</b><time>{displayTime(item.createdAt)}</time><p>{item.body}</p></div>)}<div className={styles.commentForm}><input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="익명으로 댓글을 남겨보세요."/><button type="button" disabled={sending} onClick={() => void send()}>{sending ? <LoaderCircle/> : <Send/>}<span>등록</span></button></div></div>}</article>;
}

function PostComposer({ onClose, onCreated, onError }: { onClose: () => void; onCreated: (post: CommunityPost) => void; onError: (message: string) => void }) {
  const [topic, setTopic] = useState<CommunityTopicId>("job-search"); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]); const [saving, setSaving] = useState(false);
  async function submit() {
    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    if (normalizedTitle.length < 2) { onError("제목을 2자 이상 입력해 주세요."); return; }
    if (normalizedBody.length < 5) { onError("고민 내용을 5자 이상 입력해 주세요."); return; }
    setSaving(true);
    // catch에서도 참조해야 해서 try 바깥에 둡니다 — 업로드는 됐는데 글 저장이
    // 실패한 경우, 여기까지 올라온 파일만 정리 대상입니다.
    const attachments: CommunityAttachmentInput[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/community/uploads", { method: "POST", body: form });
        const data = await responseJson(response) as ApiError & CommunityAttachmentInput;
        if (!response.ok) throw new Error(data.error ?? "첨부파일을 올리지 못했어요.");
        attachments.push(data);
      }
      const response = await fetch("/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, title: normalizedTitle, body: normalizedBody, attachments }) });
      const data = await responseJson(response) as ApiError & { post?: CommunityPost };
      if (!response.ok || !data.post) throw new Error(data.error ?? "글을 저장하지 못했어요.");
      onCreated(data.post);
    } catch (error) {
      // 첨부는 글보다 먼저 올라갑니다. 글 저장이 실패하면(또는 두 번째
      // 첨부 업로드가 실패하면) 이미 올라간 파일이 주인 없이 남으므로
      // 지웁니다. 정리가 실패해도 원래 오류를 그대로 보여줍니다 —
      // 정리 실패가 "글을 못 올린 이유"를 가리면 안 됩니다.
      if (attachments.length) {
        await fetch("/api/community/uploads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storagePaths: attachments.map((file) => file.storagePath) }) }).catch(() => {});
      }
      onError(error instanceof Error ? error.message : "글을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }
  return <div className={styles.modalBackdrop} role="presentation"><section className={styles.composer} role="dialog" aria-modal="true" aria-labelledby="community-compose-title"><header><div><span className={styles.kicker}>ANONYMOUS POST</span><h2 id="community-compose-title">내 고민 남기기</h2></div><button type="button" aria-label="글쓰기 닫기" onClick={onClose}><X/></button></header><p className={styles.safety}><ShieldAlert/> 실명·연락처·회사 내부정보·이력서 원문은 올리지 마세요. 글과 첨부는 로그인한 라운지 사용자에게 보여요.</p><label>주제<select value={topic} onChange={(event) => setTopic(event.target.value as CommunityTopicId)}>{communityTopics.map((item) => <option key={item} value={item}>{communityTopicMeta[item].label}</option>)}</select></label><label>제목<input value={title} maxLength={110} onChange={(event) => setTitle(event.target.value)} placeholder="예: 첫 지원 직무를 정하는 기준이 있을까요?"/></label><label>고민 내용<textarea value={body} maxLength={5000} onChange={(event) => setBody(event.target.value)} placeholder="지금 상황과 이미 해본 것, 가장 막힌 지점을 적어주세요." rows={7}/><small>{body.length.toLocaleString()} / 5,000</small></label><label className={styles.filePicker}><ImagePlus/> 이미지·PDF 첨부 <small>최대 3개 · 각 8MB</small><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}/></label>{files.length > 0 && <ul className={styles.fileList}>{files.map((file) => <li key={`${file.name}-${file.size}`}><FileText/>{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X/></button></li>)}</ul>}<footer><button type="button" onClick={onClose}>취소</button><button type="button" className={styles.publish} disabled={saving} onClick={() => void submit()}>{saving ? <LoaderCircle/> : <PenLine/>} 익명으로 올리기</button></footer></section></div>;
}
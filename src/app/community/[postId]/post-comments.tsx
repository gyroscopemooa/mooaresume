"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle, Send, Trash2 } from "lucide-react";
import { COMMUNITY_ADMIN_DISPLAY_EMAIL, type CommunityComment } from "@/domain/community";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

/**
 * 상세 페이지의 댓글.
 *
 * 이 페이지는 검색에 걸리라고 만든 서버 컴포넌트인데, 댓글을 읽을 수만 있고
 * 달 수는 없었습니다 — 라운지에서 열어야만 쓸 수 있으니, 검색으로 들어온
 * 사람은 답을 달 방법이 없었습니다.
 *
 * 목록은 서버가 넘겨준 값으로 먼저 그립니다. 클라이언트 컴포넌트도 첫
 * 요청에서는 서버가 렌더하므로 댓글 본문이 그대로 HTML에 남습니다 —
 * JSON-LD와 함께 이 페이지가 검색에서 갖는 값이라 잃으면 안 됩니다.
 */
export function PostComments({ postId, initialComments }: { postId: string; initialComments: CommunityComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 화면 표시 여부만 결정합니다 — 실제 권한은 서버가 COMMUNITY_ADMIN_EMAILS로
  // 다시 확인합니다. 여기서 틀려도 단추가 안 보일 뿐입니다.
  useEffect(() => {
    let cancelled = false;
    void createClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setIsAdmin(data.user?.email === COMMUNITY_ADMIN_DISPLAY_EMAIL);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setMessage("");
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string; comment?: CommunityComment };
    setSending(false);
    if (!response.ok || !data.comment) { setMessage(data.error ?? "댓글을 남기지 못했어요."); return; }
    setComments((current) => [...current, data.comment as CommunityComment]);
    setBody("");
  }

  async function remove(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "댓글을 삭제하지 못했어요."); return; }
    setComments((current) => current.filter((item) => item.id !== commentId));
  }

  return <>
    <h2 id="community-comments-title">댓글 {comments.length}</h2>
    {comments.length === 0 ? <p>아직 댓글이 없어요.</p> : <ol>{comments.map((comment) => <li key={comment.id}>
      <p>{comment.body}</p>
      <small>
        익명{comment.isEditorial && <BadgeCheck className={styles.editorialBadge}/>} · <time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(comment.createdAt))}</time>
        {(comment.isMine || isAdmin) && <button type="button" className={styles.commentDelete} onClick={() => void remove(comment.id)} aria-label="댓글 삭제"><Trash2/></button>}
      </small>
    </li>)}</ol>}

    <div className={styles.commentForm}>
      <textarea
        value={body}
        maxLength={1000}
        rows={3}
        onChange={(event) => setBody(event.target.value)}
        placeholder="익명으로 댓글을 남겨보세요."
        aria-label="댓글 내용"
      />
      <button type="button" disabled={sending || !body.trim()} onClick={() => void submit()}>
        {sending ? <LoaderCircle className={styles.spin}/> : <Send/>} 등록
      </button>
    </div>
    {message && <p className={styles.commentMessage}>{message}</p>}
  </>;
}

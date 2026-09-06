import { z } from "zod";

export const communityTopics = ["job-search", "career", "application", "work-life"] as const;
export type CommunityTopicId = typeof communityTopics[number];
export const communityTopicMeta: Record<CommunityTopicId, { label: string; description: string }> = {
  "job-search": { label: "취업 준비", description: "지원 일정, 첫 취업, 공백기" },
  career: { label: "직무·진로", description: "직무 탐색과 방향 설정" },
  application: { label: "자소서·면접", description: "경험 정리와 지원서 표현" },
  "work-life": { label: "회사생활", description: "입사 전후의 일하는 환경" },
};
export const communityAttachmentSchema = z.object({ storagePath: z.string().min(1).max(500), filename: z.string().min(1).max(160), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), byteSize: z.number().int().positive().max(8 * 1024 * 1024) });
export type CommunityAttachmentInput = z.infer<typeof communityAttachmentSchema>;
/**
 * 화면에서 관리자 단추를 띄울지 정할 때만 쓰는 값입니다. 실제 삭제 권한은
 * 서버가 환경변수 `COMMUNITY_ADMIN_EMAILS`로 다시 확인하므로, 이 값이 틀려도
 * 단추가 안 보일 뿐 권한 없는 삭제가 되지는 않습니다. 라운지와 글 상세 두
 * 화면이 같은 값을 봐야 해서 여기에 둡니다.
 */
export const COMMUNITY_ADMIN_DISPLAY_EMAIL = "jeonmeensoo@gmail.com";

export const createCommunityPostSchema = z.object({ topic: z.enum(communityTopics), title: z.string().trim().min(2, "제목을 두 글자 이상 입력해 주세요.").max(50, "제목은 50자 이내로 적어주세요."), body: z.string().trim().min(5, "고민을 조금만 더 알려주세요.").max(5000), attachments: z.array(communityAttachmentSchema).max(3) });
export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>;
export const createCommunityCommentSchema = z.object({ body: z.string().trim().min(2, "댓글을 두 글자 이상 입력해 주세요.").max(1000) });
export const createCommunityReportSchema = z.object({ subjectType: z.enum(["POST", "COMMENT"]), subjectId: z.string().uuid(), reason: z.enum(["PERSONAL_INFORMATION", "HARASSMENT", "MISINFORMATION", "SPAM", "OTHER"]), note: z.string().trim().max(500).optional() });
export type CommunityAttachment = CommunityAttachmentInput & { id: string };
export type CommunityPost = { id: string; topic: CommunityTopicId; title: string; body: string; anonymousAlias: string; isEditorial: boolean; isMine: boolean; recommendationCount: number; commentCount: number; createdAt: string; updatedAt: string; attachments: CommunityAttachment[] };

export function communityPostPath(postId: string) { return `/community/${postId}`; }

export function communitySearchDescription(value: string, limit = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}
export type CommunityComment = { id: string; body: string; anonymousAlias: string; isEditorial: boolean; isMine: boolean; createdAt: string };
export function isSameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin) return true; try { return new URL(origin).host === new URL(request.url).host; } catch { return false; } }
export const communityPreviewPosts: CommunityPost[] = [
  { id: "preview-role", topic: "career", title: "첫 지원 직무를 어떻게 정해야 할지 모르겠어요", body: "관심 있는 분야는 여러 개인데 지금 가진 경험으로 어디부터 지원해야 할지 막막해요.", anonymousAlias: "익명 준비자", isEditorial: false, isMine: false, recommendationCount: 12, commentCount: 3, createdAt: "방금 전", updatedAt: "", attachments: [] },
  { id: "preview-application", topic: "application", title: "자소서에 쓸 경험이 너무 평범한 것 같아요", body: "대단한 프로젝트는 없지만 일하면서 문제를 해결했던 과정은 있어요. 어떻게 꺼내야 할까요?", anonymousAlias: "익명 준비자", isEditorial: false, isMine: false, recommendationCount: 8, commentCount: 2, createdAt: "18분 전", updatedAt: "", attachments: [] },
  { id: "preview-job-search", topic: "job-search", title: "전공과 다른 직무로 지원해도 괜찮을까요?", body: "관심은 확실하지만 관련 스펙이 많지 않아 처음부터 포기해야 하나 고민돼요.", anonymousAlias: "익명 준비자", isEditorial: false, isMine: false, recommendationCount: 6, commentCount: 4, createdAt: "42분 전", updatedAt: "", attachments: [] },
];
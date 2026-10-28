import { isAdmin } from "@/server/admin/admin-session";
import { mentorAdminUpdateSchema, mentorDeleteSchema } from "@/domain/mentor-pool";
import { mentorJson, mentorSameOrigin, readMentorBody } from "@/server/mentor-pool/http";
import { deleteMentorApplication, updateMentorApplication } from "@/server/mentor-pool/repository";

export async function PATCH(request: Request) {
  if (!await isAdmin()) return mentorJson({ error: "관리자 로그인이 필요합니다." }, 401);
  if (!mentorSameOrigin(request)) return mentorJson({ error: "허용되지 않은 요청입니다." }, 403);
  const parsed = mentorAdminUpdateSchema.safeParse(await readMentorBody(request).catch(() => null));
  if (!parsed.success) return mentorJson({ error: "입력 내용을 확인해 주세요." }, 400);
  try {
    if (!await updateMentorApplication(parsed.data)) return mentorJson({ error: "다른 곳에서 변경됐거나 만료된 기록입니다. 새로고침 후 확인해 주세요." }, 409);
    return mentorJson({ ok: true });
  } catch { return mentorJson({ error: "변경을 저장하지 못했습니다." }, 503); }
}
export async function DELETE(request: Request) {
  if (!await isAdmin()) return mentorJson({ error: "관리자 로그인이 필요합니다." }, 401);
  if (!mentorSameOrigin(request)) return mentorJson({ error: "허용되지 않은 요청입니다." }, 403);
  const parsed = mentorDeleteSchema.safeParse(await readMentorBody(request).catch(() => null));
  if (!parsed.success) return mentorJson({ error: "본인 확인 후 삭제 문구가 필요합니다." }, 400);
  try { await deleteMentorApplication(parsed.data.id); return mentorJson({ ok: true }); }
  catch { return mentorJson({ error: "삭제하지 못했습니다." }, 503); }
}

import { mentorApplicationSchema } from "@/domain/mentor-pool";
import { mentorJson, mentorSameOrigin, readMentorBody } from "@/server/mentor-pool/http";
import { saveMentorApplication, takeMentorPoolLimit } from "@/server/mentor-pool/repository";

export async function POST(request: Request) {
  if (!mentorSameOrigin(request)) return mentorJson({ error: "신청 페이지에서 다시 시도해 주세요." }, 403);
  let body: unknown;
  try { body = await readMentorBody(request); }
  catch (error) { return mentorJson({ error: "입력 내용의 형식과 길이를 확인해 주세요." }, error instanceof Error && error.message === "TOO_LARGE" ? 413 : 400); }
  const parsed = mentorApplicationSchema.safeParse(body);
  if (!parsed.success) return mentorJson({ error: "필수 항목과 개인정보 동의를 확인해 주세요." }, 400);
  try {
    // Production ingress is Cloudflare; never trust arbitrary forwarded-for.
    const network = request.headers.get("cf-connecting-ip") ?? "unknown-network";
    if (!await takeMentorPoolLimit(`network:${network}`, 20, 3600) || !await takeMentorPoolLimit(`email:${parsed.data.email}`, 4, 86400)) {
      return mentorJson({ error: "신청 시도가 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
    }
    await saveMentorApplication(parsed.data);
    return mentorJson({ ok: true }, 201);
  } catch { return mentorJson({ error: "아직 신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, 503); }
}

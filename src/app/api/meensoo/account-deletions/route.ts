import { NextResponse } from "next/server";
import { isAdmin } from "@/server/admin/admin-session";
import {
  accountDeletionAdminInput,
  createAccountDeletionRequest,
  executeAdminAccountDeletion,
  linkAccountDeletionRequest,
  previewAccountDeletion,
  retryAccountDeletionNotice,
} from "@/server/account/admin-account-deletion";

function isStrictSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "ACCOUNT_NOT_FOUND") return "가입 계정을 찾지 못했습니다.";
  if (code === "INVALID_CONFIRMATION") return "확인 문구가 올바르지 않습니다.";
  if (code === "DELETION_REQUEST_NOT_READY") return "삭제 준비가 끝난 요청만 처리할 수 있습니다.";
  if (code === "ACCOUNT_IDENTITY_CHANGED") return "요청에 연결된 계정 정보가 달라졌습니다. 다시 조회해 주세요.";
  if (code === "NOTICE_NOT_RETRYABLE") return "완료 메일을 재발송할 수 있는 상태가 아닙니다.";
  if (code.startsWith("DELETION_REQUEST_FINALIZE_FAILED")) return "계정 삭제는 실행됐지만 처리 기록 저장에 실패했을 수 있습니다. 다시 삭제하지 말고 운영 DB를 확인해 주세요.";
  return "처리하지 못했습니다. 계정과 데이터는 임의로 삭제하지 않았습니다.";
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  if (!isStrictSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("action" in body)) return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 });
  try {
    switch (body.action) {
      case "CREATE": {
        const parsed = accountDeletionAdminInput.create.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
        const deletionRequest = await createAccountDeletionRequest({ ...parsed.data, source: "ADMIN_EMAIL" });
        const preview = deletionRequest.accountEmail ? await previewAccountDeletion(deletionRequest.accountEmail) : null;
        return NextResponse.json({ request: deletionRequest, preview });
      }
      case "LINK": {
        const parsed = accountDeletionAdminInput.link.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "요청과 가입 이메일을 확인해 주세요." }, { status: 400 });
        return NextResponse.json(await linkAccountDeletionRequest(parsed.data.requestId, parsed.data.accountEmail));
      }
      case "PREVIEW": {
        const parsed = accountDeletionAdminInput.preview.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
        const preview = await previewAccountDeletion(parsed.data.accountEmail);
        return preview ? NextResponse.json({ preview }) : NextResponse.json({ error: "가입 계정을 찾지 못했습니다." }, { status: 404 });
      }
      case "EXECUTE": {
        const parsed = accountDeletionAdminInput.execute.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "삭제 요청을 확인해 주세요." }, { status: 400 });
        return NextResponse.json(await executeAdminAccountDeletion(parsed.data.requestId, parsed.data.confirmation));
      }
      case "RETRY_NOTICE": {
        const parsed = accountDeletionAdminInput.retryNotice.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "삭제 요청을 확인해 주세요." }, { status: 400 });
        return NextResponse.json({ request: await retryAccountDeletionNotice(parsed.data.requestId) });
      }
      default:
        return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
    }
  } catch (error) {
    console.error("admin_account_deletion_failed", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

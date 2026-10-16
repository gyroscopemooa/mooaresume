import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdminRequest } from "@/server/admin/admin-session";
import { assertLocalInterviewRequest, InterviewApiError, interviewJson, interviewErrorResponse } from "@/server/ai/interview-pro/access";

/** User-scoped RLS client only. Admin test access never grants access to another user's documents. */
export async function GET(request: Request) {
  try {
    assertLocalInterviewRequest(request);
    if (!isAdminRequest(request)) throw new InterviewApiError(401, "ADMIN_REQUIRED", "관리자 로그인 후 사용할 수 있습니다.");
    const client = await createClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new InterviewApiError(401, "USER_REQUIRED", "내 자료를 불러오려면 일반 회원 계정으로도 로그인해 주세요.");
    const userId = auth.user.id;
    const params = new URL(request.url).searchParams;
    const caseId = params.get("caseId"), documentId = params.get("documentId");
    if (!caseId) {
      if (documentId) throw new InterviewApiError(400, "INVALID_INPUT", "지원 건을 먼저 선택하세요.");
      const { data, error } = await client.from("application_cases").select("id,title,company_name,role_name").eq("owner_user_id", userId).order("updated_at", { ascending: false }).limit(20);
      if (error) throw new InterviewApiError(500, "LOAD_FAILED", "내 지원 건을 불러오지 못했습니다.");
      return interviewJson({ cases: data ?? [] });
    }
    if (!z.uuid().safeParse(caseId).success || (documentId && !z.uuid().safeParse(documentId).success)) throw new InterviewApiError(400, "INVALID_INPUT", "지원 건·자료 식별자가 올바르지 않습니다.");
    const { data: owned, error: ownerError } = await client.from("application_cases").select("id").eq("id", caseId).eq("owner_user_id", userId).maybeSingle();
    if (ownerError || !owned) throw new InterviewApiError(404, "NOT_FOUND", "지원 건을 찾을 수 없습니다.");
    const { data: documents, error: documentError } = await client.from("documents").select("id,title,kind").eq("application_case_id", caseId).eq("owner_user_id", userId).in("kind", ["COVER_LETTER", "RESUME", "CAREER_DOCUMENT", "APPLICANT_NOTE"]).limit(30);
    if (documentError) throw new InterviewApiError(500, "LOAD_FAILED", "자료 목록을 불러오지 못했습니다.");
    if (!documentId) return interviewJson({ documents: documents ?? [] });
    if (!documents?.some(document => document.id === documentId)) throw new InterviewApiError(404, "NOT_FOUND", "자료를 찾을 수 없습니다.");
    const { data: version, error: versionError } = await client.from("document_versions").select("id,normalized_text,version_number").eq("document_id", documentId).eq("owner_user_id", userId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    if (versionError || !version || !version.normalized_text?.trim()) throw new InterviewApiError(404, "NO_TEXT", "텍스트로 저장된 자료가 없습니다. 필요한 내용을 직접 붙여넣어 주세요.");
    return interviewJson({ text: version.normalized_text.slice(0, 6000), truncated: version.normalized_text.length > 6000, documentVersionId: version.id, version: version.version_number });
  } catch (error) { return interviewErrorResponse(error); }
}

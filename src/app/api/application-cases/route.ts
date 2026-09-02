import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ApplicationCasePersistenceError,
  persistGuestApplicationHandoff,
} from "@/server/application-cases/persist-guest-handoff";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    return [request.nextUrl.host, request.headers.get("host"), forwardedHost]
      .filter((host): host is string => Boolean(host))
      .includes(originHost);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  try {
    const result = await persistGuestApplicationHandoff(body, async (plan) => {
      const { data, error } = await supabase.rpc("create_application_case_from_plan", {
        p_plan: plan,
      });
      return {
        data,
        error: error ? { message: error.message, code: error.code } : null,
      };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "저장할 입력 내용을 다시 확인해 주세요.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      }, { status: 400 });
    }
    if (error instanceof ApplicationCasePersistenceError) {
      // 무엇 때문에 거절당했는지 서버 로그에 남깁니다.
      //
      // 지금까지 화면에는 "지원 건을 비공개로 저장하지 못했습니다."만 남았고,
      // 그 한 문장으로는 첨부가 문제인지 마이그레이션이 빠진 것인지 구분할 수
      // 없었습니다. 자료 없이 자소서만 넣으면 되고 첨부를 더하면 안 되는 일이
      // 실제로 있었는데, 매번 브라우저 개발자도구를 열어야 알 수 있었습니다.
      //
      // 본문은 남기지 않습니다 — 지원서 내용이 로그에 쌓이면 안 됩니다.
      // 종류와 개수, 길이만으로 어느 자료가 걸렸는지는 충분히 좁혀집니다.
      const documents = Array.isArray((body as { documents?: unknown[] })?.documents)
        ? (body as { documents: Array<Record<string, unknown>> }).documents
        : [];
      console.error("application_case_persist_failed", {
        code: error.code,
        documentCount: documents.length,
        kinds: documents.map((item) => `${item.kind}:${String(item.normalizedText ?? "").length}`),
      });
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }
    return NextResponse.json({ error: "지원 건 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

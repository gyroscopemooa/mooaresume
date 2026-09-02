import { NextResponse } from "next/server";
import { z } from "zod";
import { listCommunityReports, resolveCommunityReport } from "@/server/admin/admin-repository";
import { isAdmin } from "@/server/admin/admin-session";
const schema = z.object({ reportId: z.string().uuid(), subjectType: z.enum(["POST", "COMMENT"]), subjectId: z.string().uuid(), action: z.enum(["REVIEW", "HIDE"]) });
export async function GET() { if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 }); return NextResponse.json({ reports: await listCommunityReports() }); }
export async function PATCH(request: Request) { if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 }); const error = await resolveCommunityReport(parsed.data); return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true }); }
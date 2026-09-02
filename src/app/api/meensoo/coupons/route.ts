import { NextResponse } from "next/server";
import { z } from "zod";
import { createCouponCode, deleteCouponCode, revokeCouponCode } from "@/server/admin/admin-repository";
import { isAdmin } from "@/server/admin/admin-session";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9-]+$/, "영문·숫자·하이픈만 쓸 수 있습니다."),
  label: z.string().trim().min(1).max(120),
  partnerName: z.string().trim().min(1).max(60),
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  allowedCharacters: z.number().int().positive(),
  totalCount: z.number().int().min(1).max(100000),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  subtitleText: z.string().trim().min(1).max(120),
  benefitText: z.string().trim().min(1).max(120),
  audienceText: z.string().trim().min(1).max(120),
  usageText: z.string().trim().min(1).max(160),
  footnoteText: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { coupon, error } = await createCouponCode(parsed.data);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ coupon }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  const error = await revokeCouponCode(body.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** 완전 삭제. PATCH는 못 쓰게 막을 뿐이고, 이쪽은 사용 기록까지 지웁니다. */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  const error = await deleteCouponCode(body.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

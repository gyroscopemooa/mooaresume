import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveCampaign, createCampaign, deleteCampaign, getCampaignCodeUses, updateCampaignText } from "@/server/admin/admin-repository";
import { isAdmin } from "@/server/admin/admin-session";
import { buildCouponCsv, generateCouponCodes, normalizeCodePrefix } from "@/domain/coupon-code";

export const runtime = "nodejs";

const createSchema = z.object({
  partnerName: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  product: z.enum(["QUICK", "PRO", "FINAL"]),
  benefitType: z.enum(["FREE_CREDIT", "FIXED_DISCOUNT", "PERCENT_DISCOUNT"]),
  benefitAmount: z.number().int().positive().nullable(),
  allowedCharacters: z.number().int().positive(),
  perUserLimit: z.number().int().min(1).max(100),
  totalCount: z.number().int().min(1).max(5000),
  codePrefix: z.string().trim().max(12),
  mode: z.enum(["UNIQUE", "SHARED"]).default("UNIQUE"),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  description: z.string().trim().max(1000).nullable(),
  notice: z.string().trim().max(1000).nullable(),
  subtitleText: z.string().trim().min(1).max(120),
  benefitText: z.string().trim().min(1).max(120),
  audienceText: z.string().trim().min(1).max(120),
  usageText: z.string().trim().min(1).max(160),
  footnoteText: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const input = parsed.data;
  // 지급 경로가 있는 것은 무료 이용권뿐입니다. 할인 캠페인을 저장은 하되,
  // 만들 때부터 "아직 지급되지 않는다"고 말해 두어야 배포한 뒤에 알게 되는
  // 일이 없습니다.
  if (input.benefitType !== "FREE_CREDIT") {
    return NextResponse.json({
      error: "할인 쿠폰은 아직 지급 경로가 없습니다. 무료 이용권으로 만들어 주세요.",
    }, { status: 400 });
  }

  // 접두어를 비워 두면 자동으로 채웁니다. 손으로 정할 이유가 없고, 비어 있는
  // 채로 만들면 어느 캠페인 코드인지 목록에서 구분되지 않습니다.
  const prefix = normalizeCodePrefix(input.codePrefix) || normalizeCodePrefix(input.name) || "MOOA";

  // 공유 방식이면 코드는 한 장이고, 그 한 장이 수량만큼을 감당합니다.
  // 고유 방식이면 수량만큼 코드를 만들고 각각 1회용입니다.
  const shared = input.mode === "SHARED";
  let codes: string[];
  try {
    codes = generateCouponCodes(shared ? 1 : input.totalCount, prefix);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "코드를 만들지 못했습니다." }, { status: 400 });
  }

  const { campaign, error } = await createCampaign({
    ...input,
    codes,
    usesPerCode: shared ? input.totalCount : 1,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ campaign, codes }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  const error = await archiveCampaign(body.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  partnerName: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  notice: z.string().trim().max(1000).nullable(),
  subtitleText: z.string().trim().min(1).max(120),
  benefitText: z.string().trim().min(1).max(120),
  audienceText: z.string().trim().min(1).max(120),
  usageText: z.string().trim().min(1).max(160),
  footnoteText: z.string().trim().min(1).max(200),
});

/**
 * 문구만 고칩니다. PATCH(보관)와 다른 자리를 쓰는 이유는 둘이 다른 일이기
 * 때문입니다 — 코드·수량·기간은 여기서 받지 않습니다.
 */
export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { id, ...fields } = parsed.data;
  const error = await updateCampaignText(id, fields);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/**
 * 완전 삭제. PATCH(보관)와 나란히 두는 이유는 둘이 다른 일이기 때문입니다 —
 * 보관은 목록에서 내리고, 이쪽은 코드와 사용 기록까지 지웁니다.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  const error = await deleteCampaign(body.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** 코드 목록. `?format=csv`면 파일로 내려줍니다. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId가 필요합니다." }, { status: 400 });

  // 사용일시와 사용자를 함께 읽습니다. 예전에는 `claimedAt`을 null로 채워
  // 내보내고 있었는데, 그러면 협업 기관이 받은 CSV에는 아무도 안 쓴 것처럼
  // 적힙니다.
  const rows = await getCampaignCodeUses(campaignId);

  if (url.searchParams.get("format") === "csv") {
    return new NextResponse(buildCouponCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="coupons_${campaignId.slice(0, 8)}.csv"`,
      },
    });
  }
  return NextResponse.json({ codes: rows });
}

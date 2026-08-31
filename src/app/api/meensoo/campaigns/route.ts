import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveCampaign, createCampaign, getCampaignCodes } from "@/server/admin/admin-repository";
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

  let codes: string[];
  try {
    codes = generateCouponCodes(input.totalCount, normalizeCodePrefix(input.codePrefix));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "코드를 만들지 못했습니다." }, { status: 400 });
  }

  const { campaign, error } = await createCampaign({ ...input, codes });
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

/** 코드 목록. `?format=csv`면 파일로 내려줍니다. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId가 필요합니다." }, { status: 400 });

  const codes = await getCampaignCodes(campaignId);
  const rows = codes.map((code) => ({
    code: code.code,
    status: code.revokedAt ? "중지" : code.claimedCount > 0 ? "사용됨" : "미사용",
    claimedAt: null as string | null,
  }));

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

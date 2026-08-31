"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCampaign } from "@/server/admin/admin-repository";
import { CouponPamphlet } from "./coupon-pamphlet";
import styles from "./coupons.module.css";

/**
 * 프로모션/이용권 캠페인.
 *
 * 캠페인 하나가 코드 여러 장을 거느립니다. 코드마다 한 사람이라 누가 어느
 * 코드를 썼는지 남고, 한 장이 새어 나가도 그 한 장만 막을 수 있습니다.
 *
 * 팜플렛 문구를 캠페인이 들고 있는 이유: 종이와 코드가 어긋나면 그 종이는
 * 배포한 기관의 신뢰를 대신 깎습니다. 같은 자리에 두면 어긋날 수가 없습니다.
 */

const PRODUCT_CHARACTERS: Record<string, number> = { QUICK: 8000, PRO: 30000, FINAL: 30000 };

export function CampaignCreator({ campaigns }: { campaigns: AdminCampaign[] }) {
  const router = useRouter();
  const [partnerName, setPartnerName] = useState("");
  const [name, setName] = useState("");
  const [codePrefix, setCodePrefix] = useState("");
  const [product, setProduct] = useState("QUICK");
  const [benefitType, setBenefitType] = useState("FREE_CREDIT");
  const [benefitAmount, setBenefitAmount] = useState("");
  const [totalCount, setTotalCount] = useState("50");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notice, setNotice] = useState("");
  const [subtitleText, setSubtitleText] = useState("이벤트·설문 참여자를 위한 특별 혜택");
  const [benefitText, setBenefitText] = useState("QUICK 자소서 첨삭 1회 무료");
  const [audienceText, setAudienceText] = useState("이벤트 참여자 및 선정자");
  const [usageText, setUsageText] = useState("mooaresume.com 접속 → 쿠폰 등록 → 첨삭 신청");
  const [footnoteText, setFootnoteText] = useState("1인 1회 사용 가능 / 타 쿠폰과 중복 사용 불가 / 이벤트 경품용");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<AdminCampaign | null>(null);
  const [singleCode, setSingleCode] = useState("");
  const [codeList, setCodeList] = useState<{ id: string; codes: string[] } | null>(null);

  function pickProduct(next: string) {
    setProduct(next);
    if (/^(QUICK|PRO|FINAL) /.test(benefitText)) setBenefitText(`${next} 자소서 첨삭 1회 무료`);
  }

  async function create() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/meensoo/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerName, name, product, benefitType,
          benefitAmount: benefitType === "FREE_CREDIT" ? null : Number(benefitAmount) || null,
          allowedCharacters: PRODUCT_CHARACTERS[product] ?? 8000,
          perUserLimit: Number(perUserLimit) || 1,
          totalCount: Number(totalCount) || 0,
          codePrefix,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
          description: null,
          notice: notice.trim() ? notice.trim() : null,
          subtitleText, benefitText, audienceText, usageText, footnoteText,
        }),
      });
      const body = await response.json().catch(() => ({})) as { campaign?: AdminCampaign; codes?: string[]; error?: string };
      if (!response.ok) { setMessage(body.error ?? `만들지 못했습니다. (${response.status})`); setBusy(false); return; }
      setMessage(`${body.codes?.length ?? 0}장을 만들었습니다.`);
      if (body.campaign) { setPreview(body.campaign); setCodeList({ id: body.campaign.id, codes: body.codes ?? [] }); }
      router.refresh();
    } catch (error) {
      console.error("campaign-create", error);
      setMessage("만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  async function loadCodes(campaign: AdminCampaign) {
    const response = await fetch(`/api/meensoo/campaigns?campaignId=${campaign.id}`);
    const body = await response.json().catch(() => ({})) as { codes?: { code: string }[] };
    setCodeList({ id: campaign.id, codes: (body.codes ?? []).map((row) => row.code) });
  }

  const field = (labelText: string, value: string, onChange: (next: string) => void, placeholder = "", type = "text") => (
    <label className={styles.field}>
      <span>{labelText}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} disabled={busy}/>
    </label>
  );

  return (
    <>
      <section className={styles.creator}>
        <div className={styles.grid}>
          {field("협업 기관명", partnerName, setPartnerName, "청년재단")}
          {field("캠페인명", name, setName, "청년재단 설문 이벤트")}
          {field("코드 접두어", codePrefix, (next) => setCodePrefix(next.toUpperCase()), "YOUTH")}
          <label className={styles.field}>
            <span>대상 상품</span>
            <select value={product} onChange={(event) => pickProduct(event.target.value)} disabled={busy}>
              <option value="QUICK">QUICK</option><option value="PRO">PRO</option><option value="FINAL">FINAL</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>혜택 유형</span>
            <select value={benefitType} onChange={(event) => setBenefitType(event.target.value)} disabled={busy}>
              <option value="FREE_CREDIT">무료 이용권</option>
              <option value="FIXED_DISCOUNT">정액 할인</option>
              <option value="PERCENT_DISCOUNT">정률 할인</option>
            </select>
          </label>
          {benefitType !== "FREE_CREDIT" && field(benefitType === "FIXED_DISCOUNT" ? "할인 금액(원)" : "할인율(%)", benefitAmount, setBenefitAmount, "", "number")}
          {field("발급 수량", totalCount, setTotalCount, "50", "number")}
          {field("1인 사용 제한", perUserLimit, setPerUserLimit, "1", "number")}
          {field("시작일", startsAt, setStartsAt, "", "date")}
          {field("종료일", expiresAt, setExpiresAt, "", "date")}
        </div>

        {benefitType !== "FREE_CREDIT" && (
          <p className={styles.message}>
            할인 쿠폰은 <b>아직 지급 경로가 없습니다.</b> 지금은 무료 이용권만 실제로 지급됩니다.
          </p>
        )}

        <details className={styles.pamphletFields}>
          <summary>설명·팜플렛 문구 — 기본값 그대로 두셔도 됩니다</summary>
          <div className={styles.grid}>
            {field("주의사항", notice, setNotice)}
            {field("부제", subtitleText, setSubtitleText)}
            {field("혜택", benefitText, setBenefitText)}
            {field("대상", audienceText, setAudienceText)}
            {field("사용방법", usageText, setUsageText)}
            {field("하단 안내", footnoteText, setFootnoteText)}
          </div>
        </details>

        <div className={styles.creatorFoot}>
          <button type="button" onClick={() => void create()} disabled={busy || !partnerName || !name}>
            {busy ? "만드는 중..." : "캠페인 만들기"}
          </button>
          {message && <p className={styles.message} data-ok={message.includes("만들었습니다")}>{message}</p>}
        </div>
      </section>

      {campaigns.length > 0 && <section className={styles.list}>
        {campaigns.map((campaign) => (
          <article key={campaign.id} data-done={Boolean(campaign.archivedAt)}>
            <div>
              <b>{campaign.partnerName} · {campaign.name}</b>
              <small>
                {campaign.product} · 전체 {campaign.totalCodes}장 · 사용 {campaign.usedCodes} · 미사용 {campaign.totalCodes - campaign.usedCodes - campaign.expiredCodes} · 만료 {campaign.expiredCodes}
              </small>
            </div>
            <span>{campaign.expiresAt ? `${campaign.expiresAt.slice(0, 10)}까지` : "기한 없음"}</span>
            <button type="button" onClick={() => void loadCodes(campaign)}>코드 목록</button>
            <a href={`/api/meensoo/campaigns?campaignId=${campaign.id}&format=csv`}>CSV</a>
            <button type="button" onClick={() => setPreview(preview?.id === campaign.id ? null : campaign)}>
              {preview?.id === campaign.id ? "닫기" : "팜플렛"}
            </button>
          </article>
        ))}
      </section>}

      {codeList && <section className={styles.codeBox}>
        <div>
          <b>쿠폰 코드 {codeList.codes.length}장</b>
          <button type="button" onClick={() => void navigator.clipboard.writeText(codeList.codes.join("\n"))}>전체 복사</button>
        </div>
        <textarea readOnly value={codeList.codes.join("\n")} rows={Math.min(12, Math.max(3, codeList.codes.length))}/>
      </section>}

      {preview && <>
        {/* 기본은 코드 없는 기관 배포용. 개별 코드를 넣은 장은 아래에서 따로 만듭니다. */}
        <CouponPamphlet coupon={{ ...preview, code: null }} filename={`mooaresume_${preview.partnerName}_배포용`}/>
        <section className={styles.singleCode}>
          <label className={styles.field}>
            <span>개별 코드 이미지 (선택)</span>
            <input value={singleCode} onChange={(event) => setSingleCode(event.target.value.toUpperCase())} placeholder="YOUTH-AB12-CD34"/>
          </label>
          {singleCode.trim() && <CouponPamphlet coupon={{ ...preview, code: singleCode }} filename={`mooaresume_${singleCode}`}/>}
        </section>
      </>}
    </>
  );
}

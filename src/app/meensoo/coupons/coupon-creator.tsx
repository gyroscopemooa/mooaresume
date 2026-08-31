"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCouponCode } from "@/server/admin/admin-repository";
import { CouponPamphlet } from "./coupon-pamphlet";
import styles from "./coupons.module.css";

/**
 * 협업 배포용 쿠폰 코드를 만듭니다.
 *
 * 팜플렛 문구를 여기서 같이 받는 이유: 나중에 따로 쓰면 코드와 문구가 어긋납니다.
 * "QUICK 1회 무료"라고 적힌 종이가 PRO 쿠폰을 가리키는 순간, 그 종이는 배포한
 * 기관의 신뢰를 대신 깎습니다. 기본값이 채워져 있어 기관명만 바꿔도 나옵니다.
 */

const PRODUCT_CHARACTERS: Record<string, number> = { QUICK: 8000, PRO: 30000, FINAL: 30000 };

export function CouponCreator({ existing }: { existing: AdminCouponCode[] }) {
  const router = useRouter();
  const [partnerName, setPartnerName] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [product, setProduct] = useState("QUICK");
  const [totalCount, setTotalCount] = useState("50");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [subtitleText, setSubtitleText] = useState("이벤트·설문 참여자를 위한 특별 혜택");
  const [benefitText, setBenefitText] = useState("QUICK 자소서 첨삭 1회 무료");
  const [audienceText, setAudienceText] = useState("이벤트 참여자 및 선정자");
  const [usageText, setUsageText] = useState("mooaresume.com 접속 → 쿠폰 등록 → 첨삭 신청");
  const [footnoteText, setFootnoteText] = useState("1인 1회 사용 가능 / 타 쿠폰과 중복 사용 불가 / 이벤트 경품용");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [made, setMade] = useState<AdminCouponCode | null>(null);
  const [preview, setPreview] = useState<AdminCouponCode | null>(null);

  // 상품을 바꾸면 혜택 문구도 따라갑니다. 손으로 고치신 뒤에는 건드리지 않습니다.
  function pickProduct(next: string) {
    setProduct(next);
    if (benefitText.startsWith("QUICK ") || benefitText.startsWith("PRO ") || benefitText.startsWith("FINAL ")) {
      setBenefitText(`${next} 자소서 첨삭 1회 무료`);
    }
  }

  async function create() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/meensoo/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code, label, partnerName, product,
          allowedCharacters: PRODUCT_CHARACTERS[product] ?? 8000,
          totalCount: Number(totalCount) || 0,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
          subtitleText, benefitText, audienceText, usageText, footnoteText,
        }),
      });
      const body = await response.json().catch(() => ({})) as { coupon?: AdminCouponCode; error?: string };
      if (!response.ok) { setMessage(body.error ?? `만들지 못했습니다. (${response.status})`); setBusy(false); return; }
      setMade(body.coupon ?? null);
      setPreview(body.coupon ?? null);
      setMessage("만들었습니다. 아래 팜플렛을 내려받아 메일에 붙이시면 됩니다.");
      router.refresh();
    } catch (error) {
      console.error("coupon-create", error);
      setMessage("만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
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
          {field("협업 기관", partnerName, setPartnerName, "청년재단")}
          {field("쿠폰명", label, setLabel, "청년재단 협업 이벤트")}
          {field("쿠폰 코드", code, (next) => setCode(next.toUpperCase()), "YOUTH-MUA-2026")}
          <label className={styles.field}>
            <span>상품</span>
            <select value={product} onChange={(event) => pickProduct(event.target.value)} disabled={busy}>
              <option value="QUICK">QUICK</option>
              <option value="PRO">PRO</option>
              <option value="FINAL">FINAL</option>
            </select>
          </label>
          {field("수량", totalCount, setTotalCount, "50", "number")}
          {field("시작일", startsAt, setStartsAt, "", "date")}
          {field("만료일", expiresAt, setExpiresAt, "", "date")}
        </div>

        <details className={styles.pamphletFields}>
          <summary>팜플렛 문구 — 기본값 그대로 두셔도 됩니다</summary>
          <div className={styles.grid}>
            {field("부제", subtitleText, setSubtitleText)}
            {field("혜택", benefitText, setBenefitText)}
            {field("대상", audienceText, setAudienceText)}
            {field("사용방법", usageText, setUsageText)}
            {field("하단 안내", footnoteText, setFootnoteText)}
          </div>
        </details>

        <div className={styles.creatorFoot}>
          <button type="button" onClick={() => void create()} disabled={busy || !partnerName || !label || !code}>
            {busy ? "만드는 중..." : "쿠폰 만들기"}
          </button>
          {message && <p className={styles.message} data-ok={Boolean(made)}>{message}</p>}
        </div>
      </section>

      {existing.length > 0 && <section className={styles.list}>
        {existing.map((coupon) => (
          <article key={coupon.id} data-done={coupon.claimedCount >= coupon.totalCount || Boolean(coupon.revokedAt)}>
            <div>
              <b>{coupon.code}</b>
              <small>{coupon.partnerName} · {coupon.label}</small>
            </div>
            <span>{coupon.product}</span>
            <span>{coupon.claimedCount} / {coupon.totalCount}장</span>
            <span>{coupon.revokedAt ? "중지됨" : coupon.expiresAt ? `${coupon.expiresAt.slice(0, 10)}까지` : "기한 없음"}</span>
            <button type="button" onClick={() => setPreview(preview?.id === coupon.id ? null : coupon)}>
              {preview?.id === coupon.id ? "닫기" : "팜플렛"}
            </button>
          </article>
        ))}
      </section>}

      {preview && <CouponPamphlet coupon={preview}/>}
    </>
  );
}

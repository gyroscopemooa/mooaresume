"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCampaign } from "@/server/admin/admin-repository";
import { MailComposer } from "../mail/mail-composer";
import { buildCouponCsv } from "@/domain/coupon-code";
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

type CodeUse = { code: string; status: string; claimedAt: string | null; claimedBy: string | null };

const asDate = (value: Date) => value.toISOString().slice(0, 10);

/**
 * 기본 기간은 오늘부터 석 달.
 *
 * 비워 두면 "기한 없음"이 되는데, 기한 없는 협업 쿠폰은 몇 년 뒤에 누가 들고
 * 와도 받아 주어야 합니다. 손으로 매번 적게 하는 대신 흔한 값을 채워 두고,
 * 다를 때만 고치게 합니다.
 */
function defaultPeriod(): { from: string; to: string } {
  const today = new Date();
  const later = new Date(today);
  later.setMonth(later.getMonth() + 3);
  return { from: asDate(today), to: asDate(later) };
}

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
  const period = defaultPeriod();
  const [startsAt, setStartsAt] = useState(period.from);
  const [expiresAt, setExpiresAt] = useState(period.to);
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
  const [codeList, setCodeList] = useState<{ id: string; codes: CodeUse[] } | null>(null);
  const [mailFiles, setMailFiles] = useState<File[] | null>(null);
  const [copied, setCopied] = useState("");
  // 두 방식을 한 화면에서 고릅니다. 따로 두었더니 "왜 두 개냐"가 먼저 걸렸습니다.
  const [mode, setMode] = useState("UNIQUE");
  /**
   * 목록이 먼저, 나머지는 위에 겹칩니다.
   *
   * 만들기·코드·홍보물·메일을 한 장에 쌓아 두었더니 열고 나면 닫을 방법이
   * 애매했습니다. 관리자 화면을 여는 이유는 대개 "지금 어떻게 되고 있나"이므로
   * 목록을 바닥에 두고, 나머지는 옆에서 밀려 나왔다가 ✕ 또는 Esc로 닫힙니다.
   */
  const [panel, setPanel] = useState<null | "create" | "detail">(null);
  const [tab, setTab] = useState<"codes" | "flyer" | "mail">("codes");

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  // 기관명 하나로 나머지를 채웁니다. 직접 고치신 뒤에는 덮어쓰지 않습니다 —
  // 자동으로 채우는 편의가 손으로 쓴 값을 지우면 그건 편의가 아닙니다.
  function pickPartner(next: string) {
    const before = partnerName;
    setPartnerName(next);
    if (!name || name === `${before} 협업 이벤트`) setName(next ? `${next} 협업 이벤트` : "");
    if (!audienceText || audienceText === "이벤트 참여자 및 선정자" || audienceText === `${before} 참여자 및 선정자`) {
      setAudienceText(next ? `${next} 참여자 및 선정자` : "이벤트 참여자 및 선정자");
    }
  }

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
          mode,
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
      if (body.campaign) {
        setPreview(body.campaign);
        setCodeList({ id: body.campaign.id, codes: (body.codes ?? []).map((code) => ({ code, status: "미사용", claimedAt: null, claimedBy: null })) });
        setTab("codes");
        setPanel("detail");
      }
      router.refresh();
    } catch (error) {
      console.error("campaign-create", error);
      setMessage("만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  function openDetail(campaign: AdminCampaign, next: "codes" | "flyer" | "mail") {
    setPreview(campaign);
    setTab(next);
    setPanel("detail");
    setMailFiles(null);
    void loadCodes(campaign);
  }

  async function loadCodes(campaign: AdminCampaign) {
    const response = await fetch(`/api/meensoo/campaigns?campaignId=${campaign.id}`);
    const body = await response.json().catch(() => ({})) as { codes?: CodeUse[] };
    setCodeList({ id: campaign.id, codes: body.codes ?? [] });
  }

  // 코드가 한 장뿐이면 그것이 곧 공유 코드입니다.
  const sharedCode = codeList && codeList.codes.length === 1 ? codeList.codes[0].code : null;

  const field = (labelText: string, value: string, onChange: (next: string) => void, placeholder = "", type = "text") => (
    <label className={styles.field}>
      <span>{labelText}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} disabled={busy}/>
    </label>
  );


  return (
    <>
      {/* 바닥은 목록입니다. 이 화면을 여는 이유가 대개 현황 확인이기 때문입니다. */}
      <div className={styles.toolbar}>
        <span>{campaigns.length}개 캠페인</span>
        <button type="button" className={styles.primary} onClick={() => { setPanel("create"); setMessage(""); }}>
          새 캠페인
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className={styles.empty}>아직 만든 캠페인이 없습니다. <b>새 캠페인</b>으로 시작하세요.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>기관 · 캠페인</th><th>상품</th><th>사용</th><th>기간</th><th /></tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} data-done={Boolean(campaign.archivedAt)}>
                <td>
                  <b>{campaign.partnerName}</b>
                  <small>{campaign.name}</small>
                </td>
                <td>{campaign.product}</td>
                <td>
                  <b>{campaign.usedCodes}</b> / {campaign.totalCodes}
                  {campaign.expiredCodes > 0 && <small>만료 {campaign.expiredCodes}</small>}
                </td>
                <td>{campaign.expiresAt ? `${campaign.expiresAt.slice(0, 10)}까지` : "기한 없음"}</td>
                <td className={styles.rowActions}>
                  <button type="button" onClick={() => openDetail(campaign, "codes")}>코드</button>
                  <button type="button" onClick={() => openDetail(campaign, "flyer")}>홍보물</button>
                  <button type="button" onClick={() => openDetail(campaign, "mail")}>메일</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {panel && (
        <>
          <button type="button" className={styles.backdrop} aria-label="닫기" onClick={() => setPanel(null)} />
          <aside className={styles.panel} role="dialog" aria-modal="true">
            <header className={styles.panelHead}>
              <div>
                <b>{panel === "create" ? "새 캠페인" : preview?.partnerName ?? ""}</b>
                {panel === "detail" && <small>{preview?.name}</small>}
              </div>
              {/* 닫는 방법이 셋입니다: ✕, 바깥 클릭, Esc. 하나만 두면 그 하나를
                  못 찾은 사람은 갇힙니다. */}
              <button type="button" onClick={() => setPanel(null)} aria-label="닫기">✕</button>
            </header>

            <div className={styles.panelBody}>
              {panel === "create" && <>
                <div className={styles.grid}>
                  <label className={styles.field}>
                    <span>발급 방식</span>
                    <select value={mode} onChange={(event) => setMode(event.target.value)} disabled={busy}>
                      <option value="UNIQUE">고유 코드 여러 장 — 기관에 목록 전달, 사용 추적</option>
                      <option value="SHARED">공유 코드 한 장 — 홍보물에 찍어 배포</option>
                    </select>
                  </label>
                  {field("협업 기관명", partnerName, pickPartner, "청년재단")}
                  {field("캠페인명", name, setName, "청년재단 설문 이벤트")}
                  {field("코드 접두어", codePrefix, (next) => setCodePrefix(next.toUpperCase()), "비워 두면 자동")}
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
                  {field(mode === "SHARED" ? "사용 가능 인원" : "발급 수량", totalCount, setTotalCount, "50", "number")}
                  {field("1인 사용 제한", perUserLimit, setPerUserLimit, "1", "number")}
                  {field("시작일", startsAt, setStartsAt, "", "date")}
                  {field("종료일", expiresAt, setExpiresAt, "", "date")}
                </div>

                {benefitType !== "FREE_CREDIT" && (
                  <p className={styles.message}>할인 쿠폰은 <b>아직 지급 경로가 없습니다.</b> 지금은 무료 이용권만 실제로 지급됩니다.</p>
                )}

                <details className={styles.pamphletFields}>
                  <summary>설명·홍보물 문구 — 기본값 그대로 두셔도 됩니다</summary>
                  <div className={styles.grid}>
                    {field("주의사항", notice, setNotice)}
                    {field("부제", subtitleText, setSubtitleText)}
                    {field("혜택", benefitText, setBenefitText)}
                    {field("대상", audienceText, setAudienceText)}
                    {field("사용방법", usageText, setUsageText)}
                    {field("하단 안내", footnoteText, setFootnoteText)}
                  </div>
                </details>
              </>}

              {panel === "detail" && preview && <>
                <nav className={styles.tabs}>
                  <button type="button" data-active={tab === "codes"} onClick={() => setTab("codes")}>코드</button>
                  <button type="button" data-active={tab === "flyer"} onClick={() => setTab("flyer")}>홍보물</button>
                  <button type="button" data-active={tab === "mail"} onClick={() => setTab("mail")}>메일</button>
                </nav>

                {tab === "codes" && codeList && <>
                  <div className={styles.codeHead}>
                    <b>{codeList.codes.length}장 · 사용 {codeList.codes.filter((row) => row.status === "사용됨").length}</b>
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(codeList.codes.map((row) => row.code).join("\n")); setCopied("all"); }}>
                      {copied === "all" ? "복사됨" : "전체 복사"}
                    </button>
                    <a href={`/api/meensoo/campaigns?campaignId=${codeList.id}&format=csv`}>CSV</a>
                  </div>
                  {/* 한 장씩 복사하는 자리. 전체 복사밖에 없으면 한 명에게 코드
                      하나를 보낼 때 남의 코드까지 함께 붙여 넣게 됩니다. */}
                  <ul className={styles.codeGrid}>
                    {codeList.codes.map((row) => (
                      <li key={row.code} data-used={row.status !== "미사용"}>
                        <code>{row.code}</code>
                        <small>
                          {row.status}
                          {row.claimedBy ? ` · ${row.claimedBy}` : ""}
                          {row.claimedAt ? ` · ${row.claimedAt.slice(0, 10)}` : ""}
                        </small>
                        <button type="button" onClick={() => { void navigator.clipboard.writeText(row.code); setCopied(row.code); }}>
                          {copied === row.code ? "복사됨" : "복사"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>}

                {tab === "flyer" && <>
                  {/* 기본은 코드 없는 기관 배포용. 개별 코드를 넣은 장은 아래에서 따로. */}
                  {/* 코드가 한 장뿐이면 그 코드를 찍습니다. 공유 코드는 애초에
                      "이 종이 한 장으로 다 같이 쓰세요"라서, 코드를 빼면 받는
                      사람이 어디서 코드를 구해야 하는지 알 수 없습니다.
                      여러 장일 때는 비워 둡니다 — 종이에 코드가 있으면 그 한
                      장이 한 사람 것이 되어 버립니다. */}
                  <CouponPamphlet
                    coupon={{ ...preview, code: sharedCode }}
                    filename={`mooaresume_${preview.partnerName}_배포용`}
                    onAttach={(file) => { setMailFiles((current) => [...(current ?? []).filter((item) => !item.name.endsWith(".png")), file]); setTab("mail"); }}/>
                  <label className={styles.field}>
                    <span>개별 코드 이미지 (선택)</span>
                    <input value={singleCode} onChange={(event) => setSingleCode(event.target.value.toUpperCase())} placeholder="YOUTH-AB12-CD34"/>
                  </label>
                  {singleCode.trim() && <CouponPamphlet coupon={{ ...preview, code: singleCode }} filename={`mooaresume_${singleCode}`}/>}
                </>}

                {tab === "mail" && <>
                  {/* 파일을 만든 화면에서 바로 보냅니다. 내려받아 두었다가 나중에
                      폴더에서 찾아 올리면 다른 캠페인 것을 붙이게 됩니다. */}
                  {/* 코드가 여러 장이면 목록이 CSV로 자동으로 붙습니다.
                      한 장뿐이면 붙이지 않습니다 — 그 한 줄짜리 파일보다
                      본문에 코드를 적는 편이 받는 사람에게 낫습니다. */}
                  <div className={styles.creatorFoot}>
                    <small>
                      첨부 {(mailFiles ?? []).length}개
                      {(mailFiles ?? []).length > 0 && ` · ${(mailFiles ?? []).map((file) => file.name).join(", ")}`}
                    </small>
                  </div>

                  {/* 보이지 않게 한 장 그려서 곧바로 첨부합니다. 내려받아 다시
                      올리는 왕복이 사라집니다. */}
                  <CouponPamphlet
                    coupon={{ ...preview, code: sharedCode }}
                    filename={`mooaresume_${preview.partnerName}_배포용`}
                    hidden
                    autoAttach
                    onAttach={(file) => setMailFiles((current) => {
                      const kept = (current ?? []).filter((item) => !item.name.endsWith(".png"));
                      const rows = codeList?.codes ?? [];
                      const csv = rows.length > 1 && !kept.some((item) => item.name.endsWith(".csv"))
                        ? [new File([buildCouponCsv(rows)], `coupons_${preview.partnerName}.csv`, { type: "text/csv" })]
                        : [];
                      return [...kept, file, ...csv];
                    })}/>

                  <MailComposer
                    campaignId={preview.id}
                    initialSubject={`[무아레쥬메] ${preview.partnerName} 협업 무료 이용권 안내`}
                    initialBody={`안녕하세요, 무아레쥬메입니다.\n\n${preview.name} 진행을 위한 무료 이용권 ${preview.totalCodes}장을 보내드립니다.\n\n· 혜택: ${preview.benefitText}\n· 대상: ${preview.audienceText}\n· 사용방법: ${preview.usageText}\n\n첨부된 이미지는 배포용이며, 쿠폰 코드는 CSV 파일에 있습니다.\n감사합니다.`}
                    initialFiles={mailFiles ?? []}
                  />
                </>}
              </>}
            </div>

            {panel === "create" && (
              <footer className={styles.panelFoot}>
                {message && <p className={styles.message} data-ok={message.includes("만들었습니다")}>{message}</p>}
                <button type="button" onClick={() => setPanel(null)}>취소</button>
                <button type="button" className={styles.primary} onClick={() => void create()} disabled={busy || !partnerName || !name}>
                  {busy ? "만드는 중..." : "캠페인 만들기"}
                </button>
              </footer>
            )}
          </aside>
        </>
      )}
    </>
  );
}

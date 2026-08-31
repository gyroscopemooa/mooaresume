"use client";

import { useRef, useState } from "react";
import styles from "./coupons.module.css";

/**
 * 협업 기관에 보낼 팜플렛. SVG로 그리고 PNG로 내려줍니다.
 *
 * 이미지 생성 AI를 쓰지 않는 이유가 있습니다. 팜플렛은 창작이 아니라 **양식**
 * 입니다 — 기관명, 혜택, 기간, 코드를 정해진 자리에 넣는 일이고, 매번 같은
 * 자리에 있어야 브랜드가 됩니다. 생성 모델은 한글을 자주 깨뜨리고, 쿠폰 코드가
 * 한 글자라도 어긋나면 그 이미지는 배포용으로 쓸 수 없습니다. 게다가 장당
 * 돈이 나갑니다.
 *
 * SVG는 공짜이고, 즉시이고, 매번 똑같고, 코드가 절대 깨지지 않습니다.
 */

const W = 1134;
const H = 1404;

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export type PamphletSource = {
  partnerName: string;
  subtitleText: string;
  benefitText: string;
  audienceText: string;
  usageText: string;
  footnoteText: string;
  startsAt: string | null;
  expiresAt: string | null;
  /** 개별 코드를 찍은 이미지를 만들 때만 넣습니다. */
  code?: string | null;
};

function describePeriod(coupon: PamphletSource): string {
  const from = formatDate(coupon.startsAt);
  const to = formatDate(coupon.expiresAt);
  if (from && to) return `${from} - ${to}`;
  if (to) return `${to}까지`;
  if (from) return `${from}부터`;
  return "기간 제한 없음";
}

/** 코드 길이에 따라 글자 크기를 줄입니다. 넘치면 잘리는 대신 작아져야 합니다. */
function codeFontSize(code: string): number {
  if (code.length <= 14) return 78;
  if (code.length <= 20) return 60;
  if (code.length <= 28) return 44;
  return 34;
}

function Row({ y, label, value }: { y: number; label: string; value: string }) {
  return (
    <g>
      <rect x={96} y={y} width={78} height={78} rx={20} fill="#eaf0fd" />
      <rect x={196} y={y + 22} width={92} height={34} rx={17} fill="#dfe8fb" />
      <text x={242} y={y + 45} fontSize={21} fontWeight={700} fill="#2b5bd7" textAnchor="middle">{label}</text>
      <text x={312} y={y + 46} fontSize={23} fill="#2c3444">{value}</text>
      <line x1={196} y1={y + 88} x2={1038} y2={y + 88} stroke="#e6ebf5" strokeWidth={1} />
    </g>
  );
}

export function CouponPamphlet({ coupon, filename }: { coupon: PamphletSource; filename?: string }) {
  // 기본은 기관 배포용입니다. 종이 한 장에 코드가 찍혀 있으면 그 코드는 한
  // 사람 것이 되어 버리므로, 기관이 여러 사람에게 나눠 줄 이미지에는 코드를
  // 넣지 않고 "등록하고 쓰세요"만 남깁니다. 개별 코드를 넣은 장은 옵션입니다.
  const code = coupon.code?.trim() ?? "";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  async function download() {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(true);
    setFailed("");
    try {
      const source = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("SVG를 이미지로 읽지 못했습니다."));
        image.src = url;
      });
      // 2배로 그립니다. 인쇄물이나 카드뉴스로 올릴 때 1배는 글자가 뭉갭니다.
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("캔버스를 만들지 못했습니다.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `${filename ?? `mooaresume_${coupon.partnerName}`}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("pamphlet", error);
      setFailed(error instanceof Error ? error.message : "내려받지 못했습니다.");
    }
    setBusy(false);
  }

  return (
    <div className={styles.pamphletWrap}>
      <svg ref={svgRef} className={styles.pamphlet} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
        fontFamily="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif">
        <rect width={W} height={H} fill="#f7f9ff" />

        <rect x={455} y={44} width={224} height={56} rx={28} fill="#2b5bd7" />
        <text x={567} y={81} fontSize={24} fontWeight={700} fill="#fff" textAnchor="middle">협업 이벤트</text>

        <text x={567} y={172} fontSize={38} fontWeight={800} textAnchor="middle" fill="#2b5bd7">
          {coupon.partnerName}
          <tspan fill="#2c3444" fontSize={30}>{"  X  "}</tspan>
          <tspan fill="#2b5bd7">mooaresume</tspan>
        </text>

        <text x={567} y={272} fontSize={62} fontWeight={800} textAnchor="middle">
          <tspan fill="#22b573">무료</tspan>
          <tspan fill="#1b2a4a">{" 자소서 첨삭 이용권 증정"}</tspan>
        </text>

        <text x={567} y={352} fontSize={26} fill="#4a5468" textAnchor="middle">
          {coupon.partnerName} {coupon.subtitleText}
        </text>

        <Row y={430} label="혜택" value={coupon.benefitText} />
        <Row y={526} label="대상" value={coupon.audienceText} />
        <Row y={622} label="사용기간" value={describePeriod(coupon)} />
        <Row y={718} label="사용방법" value={coupon.usageText} />

        {/* 쿠폰 몸통. 왼쪽 띠와 톱니로 "표"처럼 보이게 합니다. */}
        <rect x={96} y={824} width={942} height={296} rx={26} fill="#fff" stroke="#2b5bd7" strokeWidth={5} />
        <path d="M96 850 a26 26 0 0 1 26-26 h96 v296 h-96 a26 26 0 0 1-26-26 z" fill="#2b5bd7" />
        <text x={170} y={972} fontSize={22} fontWeight={700} fill="#fff" textAnchor="middle"
          transform="rotate(-90 170 972)" letterSpacing={4}>COUPON</text>

        <rect x={452} y={846} width={232} height={52} rx={26} fill="#fff" stroke="#2b5bd7" strokeWidth={3} />
        <text x={568} y={881} fontSize={24} fontWeight={700} fill="#2b5bd7" textAnchor="middle">쿠폰 코드</text>

        {code ? (
          <text x={628} y={1002} fontSize={codeFontSize(code)} fontWeight={800} fill="#2b5bd7"
            textAnchor="middle" letterSpacing={2}>{code}</text>
        ) : (
          <text x={628} y={996} fontSize={40} fontWeight={800} fill="#2b5bd7" textAnchor="middle">
            쿠폰코드 등록 후 사용
          </text>
        )}

        <line x1={300} y1={1042} x2={956} y2={1042} stroke="#dbe4f7" strokeWidth={2} />
        <text x={628} y={1084} fontSize={25} fontWeight={700} fill="#1b2a4a" textAnchor="middle">
          협업기관 배포용 무료 이용권
        </text>

        <rect x={287} y={1156} width={560} height={92} rx={46} fill="#2b5bd7" />
        <text x={567} y={1216} fontSize={34} fontWeight={800} fill="#fff" textAnchor="middle">지금 사용하기</text>

        <text x={567} y={1310} fontSize={26} fontWeight={700} fill="#2b5bd7" textAnchor="middle">
          www.mooaresume.com
        </text>
        <text x={567} y={1362} fontSize={19} fill="#77839a" textAnchor="middle">
          * {coupon.footnoteText}
        </text>
      </svg>

      <div className={styles.pamphletFoot}>
        <button type="button" onClick={() => void download()} disabled={busy}>
          {busy ? "만드는 중..." : "PNG로 저장"}
        </button>
        <small>2268 × 2808px · 협업 기관에 메일로 그대로 보내시면 됩니다.</small>
        {failed && <small className={styles.pamphletFailed}>{failed}</small>}
      </div>
    </div>
  );
}

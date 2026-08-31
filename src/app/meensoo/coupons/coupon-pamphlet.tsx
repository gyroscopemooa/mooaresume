"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./coupons.module.css";

/**
 * 협업 기관에 보낼 홍보물. 전부 inline SVG입니다.
 *
 * 이미지 생성 AI를 쓰지 않는 이유가 있습니다. 이것은 창작이 아니라 **양식**
 * 입니다 — 기관명, 혜택, 기간, 코드를 정해진 자리에 넣는 일이고, 매번 같은
 * 자리에 있어야 브랜드가 됩니다. 생성 모델은 한글을 자주 깨뜨리고, 쿠폰 코드가
 * 한 글자라도 어긋나면 그 이미지는 배포용으로 쓸 수 없습니다. 장당 돈도 듭니다.
 *
 * 장식까지 코드여야 하는 이유도 같습니다. 배경 곡선과 일러스트를 그림 파일로
 * 두면 기관이 바뀔 때마다 디자이너를 불러야 하지만, 도형으로 그려 두면 바뀌는
 * 것은 글자뿐입니다.
 */

const W = 1122;
const H = 1402;

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
  eventLabel?: string;
  headline?: string;
  couponDescription?: string;
  url?: string;
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function describePeriod(coupon: PamphletSource): string {
  const from = formatDate(coupon.startsAt);
  const to = formatDate(coupon.expiresAt);
  if (from && to) return `${from} - ${to}`;
  if (to) return `${to}까지`;
  if (from) return `${from}부터`;
  return "기간 제한 없음";
}

/** 코드가 길면 잘리는 대신 작아집니다. */
function codeFontSize(code: string): number {
  if (code.length <= 14) return 76;
  if (code.length <= 20) return 58;
  if (code.length <= 28) return 43;
  return 33;
}

const BLUE = "#2b5bd7";
const NAVY = "#1b2a4a";

/** 선물·사람·달력·모니터. 선으로 그려 크기를 바꿔도 두께가 유지됩니다. */
function RowIcon({ kind, x, y }: { kind: "gift" | "people" | "calendar" | "monitor"; x: number; y: number }) {
  const line = { stroke: BLUE, strokeWidth: 2.4, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y})`}>
      {kind === "gift" && (
        <g {...line}>
          <rect x={4} y={14} width={30} height={19} rx={3} />
          <path d="M2 14h34v6H2z" />
          <path d="M19 14v19M19 14c-4-8-13-6-11 0M19 14c4-8 13-6 11 0" />
        </g>
      )}
      {kind === "people" && (
        <g {...line}>
          <circle cx={15} cy={13} r={6} />
          <path d="M5 32c0-6 4.5-9 10-9s10 3 10 9" />
          <circle cx={28} cy={15} r={4.5} />
          <path d="M27 24c4 .6 7 3.4 7 8" />
        </g>
      )}
      {kind === "calendar" && (
        <g {...line}>
          <rect x={5} y={9} width={28} height={26} rx={4} />
          <path d="M5 17h28M13 5v8M25 5v8" />
          <circle cx={14} cy={25} r={1.7} fill={BLUE} stroke="none" />
          <circle cx={24} cy={25} r={1.7} fill={BLUE} stroke="none" />
        </g>
      )}
      {kind === "monitor" && (
        <g {...line}>
          <rect x={4} y={8} width={30} height={21} rx={3} />
          <path d="M14 35h10M19 29v6" />
        </g>
      )}
    </g>
  );
}

function Row({ y, label, value, icon }: { y: number; label: string; value: string; icon: "gift" | "people" | "calendar" | "monitor" }) {
  return (
    <g>
      <rect x={92} y={y} width={76} height={76} rx={22} fill="#eef3fd" />
      <RowIcon kind={icon} x={111} y={y + 17} />
      <rect x={190} y={y + 21} width={94} height={34} rx={17} fill="#dde7fb" />
      <text x={237} y={y + 44} fontSize={21} fontWeight={700} fill={BLUE} textAnchor="middle">{label}</text>
      <text x={306} y={y + 45} fontSize={23} fill="#2c3444">{value}</text>
      {/* 점선입니다. 실선이면 표처럼 읽히는데 이건 목록입니다. */}
      <line x1={190} y1={y + 86} x2={1030} y2={y + 86} stroke="#d9e2f4" strokeWidth={1.4} strokeDasharray="3 5" />
    </g>
  );
}

/** 오른쪽 일러스트 — 이력서, 체크리스트, 펜. 전부 도형입니다. */
function Illustration() {
  return (
    <g transform="translate(686 318)">
      <ellipse cx={168} cy={196} rx={170} ry={166} fill="#eaf1fd" opacity={0.75} />

      <g filter="url(#soft)">
        <rect x={44} y={22} width={210} height={268} rx={14} fill="#fff" />
      </g>
      <circle cx={86} cy={70} r={19} fill="#cfe0fb" />
      <circle cx={86} cy={64} r={7.5} fill="#8fb2ee" />
      <path d="M75 79c2-6 20-6 22 0z" fill="#8fb2ee" />
      {[62, 78].map((y) => <rect key={y} x={118} y={y} width={106} height={9} rx={4.5} fill="#dbe6fa" />)}
      {[118, 146, 174, 202, 230].map((y, index) => (
        <rect key={y} x={72} y={y} width={index % 2 === 0 ? 154 : 122} height={10} rx={5} fill="#e6edfa" />
      ))}

      <g filter="url(#soft)">
        <rect x={186} y={116} width={158} height={196} rx={14} fill="#eaf7f0" />
      </g>
      {[152, 200, 248].map((y) => (
        <g key={y}>
          <rect x={210} y={y} width={26} height={26} rx={7} fill="#fff" stroke="#57c69a" strokeWidth={2.4} />
          <path d={`M216 ${y + 13} l6 6 10-12`} stroke="#2fa877" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x={248} y={y + 8} width={72} height={10} rx={5} fill="#c8e8d8" />
        </g>
      ))}

      <g transform="rotate(38 300 300)">
        <rect x={288} y={214} width={26} height={132} rx={13} fill="#4d84e8" />
        <rect x={288} y={214} width={26} height={26} rx={13} fill="#3f6fd0" />
        <path d="M288 346h26l-13 26z" fill="#2b5bd7" />
      </g>
    </g>
  );
}

export function CouponPamphlet({ coupon, filename, onAttach, autoAttach = false, hidden = false }: {
  coupon: PamphletSource;
  filename?: string;
  /** 내려받는 대신 메일 첨부로 넘길 때. 같은 그림을 두 번 그리지 않습니다. */
  onAttach?: (file: File) => void;
  /**
   * 뜨자마자 한 번 첨부합니다.
   *
   * 메일 화면에서 "홍보물을 내려받아 다시 올려야 하나"를 묻게 만들면, 그
   * 왕복 어딘가에서 다른 캠페인의 파일이 붙습니다. 붙어 있는 채로 시작하고,
   * 빼고 싶으면 첨부 목록에서 지우면 됩니다.
   */
  autoAttach?: boolean;
  /** 첨부만 하고 그림은 보이지 않게. */
  hidden?: boolean;
}) {
  // 기본은 기관 배포용입니다. 종이 한 장에 코드가 찍혀 있으면 그 코드는 한
  // 사람 것이 되어 버리므로, 여러 사람에게 나눠 줄 이미지에는 코드를 넣지 않고
  // "등록하고 쓰세요"만 남깁니다. 개별 코드를 넣은 장은 옵션입니다.
  const code = coupon.code?.trim() ?? "";
  const siteUrl = coupon.url ?? "www.mooaresume.com";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const attached = useRef(false);

  async function render(): Promise<Blob> {
    const svg = svgRef.current;
    if (!svg) throw new Error("아직 그려지지 않았습니다.");
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG를 이미지로 읽지 못했습니다."));
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("캔버스를 만들지 못했습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG를 만들지 못했습니다.")), "image/png");
    });
  }

  const name = `${filename ?? `mooaresume_${coupon.partnerName}`}.png`;

  async function run(after: (blob: Blob) => void) {
    setBusy(true);
    setFailed("");
    try {
      after(await render());
    } catch (error) {
      console.error("pamphlet", error);
      setFailed(error instanceof Error ? error.message : "만들지 못했습니다.");
    }
    setBusy(false);
  }

  useEffect(() => {
    // 한 번만. 탭을 오갈 때마다 같은 파일이 쌓이면 안 됩니다.
    if (!autoAttach || !onAttach || attached.current) return;
    attached.current = true;
    void run((blob) => onAttach(new File([blob], name, { type: "image/png" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAttach]);

  function download() {
    void run((blob) => {
      const link = document.createElement("a");
      link.download = name;
      link.href = URL.createObjectURL(blob);
      link.click();
    });
  }

  return (
    <div className={styles.pamphletWrap} hidden={hidden}>
      <svg ref={svgRef} className={styles.pamphlet} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
        fontFamily="'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif">
        <defs>
          <linearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f8ff" />
            <stop offset="1" stopColor="#e8f0fe" />
          </linearGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#2b5bd7" floodOpacity="0.13" />
          </filter>
          <filter id="ticket" x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#2b5bd7" floodOpacity="0.16" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="#fff" />
        {/* 배경 곡선. 모서리에서 흘러들어오게 두어 종이가 비어 보이지 않게 합니다. */}
        <path d={`M0 0 H${W} V150 C820 250 420 90 0 330 Z`} fill="url(#wash)" />
        <path d={`M0 ${H} H${W} V${H - 300} C760 ${H - 190} 380 ${H - 340} 0 ${H - 120} Z`} fill="url(#wash)" />
        <path d="M0 470 C240 560 300 760 0 900 Z" fill="#eef4ff" opacity={0.85} />

        <path d="M152 168 l7 17 17 7 -17 7 -7 17 -7-17 -17-7 17-7z" fill="#57c69a" opacity={0.85} />
        <path d="M1006 356 l6 14 14 6 -14 6 -6 14 -6-14 -14-6 14-6z" fill="#8fb2ee" opacity={0.8} />
        <circle cx={884} cy={186} r={9} fill="#cfe0fb" />
        <circle cx={946} cy={230} r={5} fill="#a9c6f5" />
        <circle cx={92} cy={618} r={6} fill="#cfe0fb" />
        <circle cx={1044} cy={772} r={7} fill="#d7e4fb" />

        <rect x={449} y={42} width={224} height={56} rx={28} fill={BLUE} />
        <text x={561} y={79} fontSize={24} fontWeight={700} fill="#fff" textAnchor="middle">
          {coupon.eventLabel ?? "협업 이벤트"}
        </text>

        <text x={561} y={170} fontSize={38} fontWeight={800} textAnchor="middle" fill={BLUE}>
          {coupon.partnerName}
          <tspan fill="#2c3444" fontSize={30}>{"  X  "}</tspan>
          <tspan fill={BLUE}>mooaresume</tspan>
        </text>

        <text x={561} y={272} fontSize={60} fontWeight={800} textAnchor="middle">
          <tspan fill="#22b573">무료</tspan>
          <tspan fill={NAVY}>{` ${coupon.headline ?? "자소서 첨삭 이용권 증정"}`}</tspan>
        </text>

        <text x={92} y={348} fontSize={25} fill="#4a5468">
          {coupon.partnerName} {coupon.subtitleText}
        </text>

        <Illustration />

        <Row y={424} label="혜택" value={coupon.benefitText} icon="gift" />
        <Row y={518} label="대상" value={coupon.audienceText} icon="people" />
        <Row y={612} label="사용기간" value={describePeriod(coupon)} icon="calendar" />
        <Row y={706} label="사용방법" value={coupon.usageText} icon="monitor" />

        {/* 쿠폰 티켓. 좌우를 반원으로 파내 표 모양을 만듭니다. */}
        <g filter="url(#ticket)">
          <path d="M118 820 h886 a24 24 0 0 1 24 24 v96 a26 26 0 0 0 0 52 v96 a24 24 0 0 1 -24 24 h-886 a24 24 0 0 1 -24 -24 v-96 a26 26 0 0 0 0 -52 v-96 a24 24 0 0 1 24 -24 z"
            fill="#fff" stroke={BLUE} strokeWidth={5} />
        </g>
        <path d="M118 820 h100 v292 h-100 a24 24 0 0 1 -24 -24 v-96 a26 26 0 0 0 0 -52 v-96 a24 24 0 0 1 24 -24 z" fill={BLUE} />
        <line x1={218} y1={834} x2={218} y2={1098} stroke="#fff" strokeWidth={3} strokeDasharray="9 11" />
        <text x={166} y={966} fontSize={22} fontWeight={700} fill="#fff" textAnchor="middle"
          transform="rotate(-90 166 966)" letterSpacing={5}>COUPON</text>

        <line x1={296} y1={880} x2={430} y2={880} stroke="#dbe4f7" strokeWidth={2} />
        <line x1={692} y1={880} x2={962} y2={880} stroke="#dbe4f7" strokeWidth={2} />
        <rect x={446} y={856} width={230} height={50} rx={25} fill="#fff" stroke={BLUE} strokeWidth={3} />
        <text x={561} y={889} fontSize={24} fontWeight={700} fill={BLUE} textAnchor="middle">쿠폰 코드</text>

        {code ? (
          <text x={629} y={1000} fontSize={codeFontSize(code)} fontWeight={800} fill={BLUE}
            textAnchor="middle" letterSpacing={2}>{code}</text>
        ) : (
          <text x={629} y={994} fontSize={42} fontWeight={800} fill={BLUE} textAnchor="middle">
            쿠폰코드 등록 후 사용
          </text>
        )}

        <line x1={300} y1={1036} x2={588} y2={1036} stroke="#dbe4f7" strokeWidth={2} />
        <path d="M629 1027 l5 11 11 5 -11 5 -5 11 -5-11 -11-5 11-5z" fill="#8fb2ee" />
        <line x1={670} y1={1036} x2={958} y2={1036} stroke="#dbe4f7" strokeWidth={2} />
        <path d="M368 1074 c14-16 32-16 40-6 -12 12-28 14-40 6z" fill="#8fd6b4" />
        <path d="M890 1074 c-14-16-32-16-40-6 12 12 28 14 40 6z" fill="#8fd6b4" />
        <text x={629} y={1082} fontSize={25} fontWeight={700} fill={NAVY} textAnchor="middle">
          {coupon.couponDescription ?? "협업기관 배포용 무료 이용권"}
        </text>

        <g filter="url(#soft)">
          <rect x={281} y={1150} width={560} height={92} rx={46} fill={BLUE} />
        </g>
        <circle cx={368} cy={1196} r={26} fill="#fff" opacity={0.22} />
        <path d="M358 1196 h20 M370 1188 l8 8 -8 8" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={584} y={1210} fontSize={34} fontWeight={800} fill="#fff" textAnchor="middle">지금 사용하기</text>

        <g transform="translate(392 1288)" stroke={BLUE} strokeWidth={2.2} fill="none">
          <circle cx={12} cy={12} r={11} />
          <path d="M1 12h22M12 1c6 6 6 16 0 22M12 1c-6 6-6 16 0 22" />
        </g>
        <text x={432} y={1307} fontSize={26} fontWeight={700} fill={BLUE}>{siteUrl}</text>

        <text x={561} y={1356} fontSize={19} fill="#77839a" textAnchor="middle">
          * {coupon.footnoteText}
        </text>
      </svg>

      <div className={styles.pamphletFoot}>
        <button type="button" onClick={download} disabled={busy}>
          {busy ? "만드는 중..." : "PNG로 저장"}
        </button>
        {onAttach && (
          <button type="button" onClick={() => void run((blob) => onAttach(new File([blob], name, { type: "image/png" })))} disabled={busy}>
            메일에 첨부
          </button>
        )}
        <small>{W} × {H}px · 협업 기관에 메일로 그대로 보내시면 됩니다.</small>
        {failed && <small className={styles.pamphletFailed}>{failed}</small>}
      </div>
    </div>
  );
}

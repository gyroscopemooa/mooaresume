"use client";
import Image from "next/image";
import { CreditCard } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isInstalledAppContext } from "@/lib/app-context";
import { nicepayBrandNames, type NicepayAction, type NicepayBrand, type NicepayConsent } from "@/domain/nicepay-method";
import styles from "./nicepay-payment-actions.module.css";

const subscribe = () => () => {};
const brands: { method: NicepayBrand; logo: string; width: number; height: number; className: string }[] = [
  { method: "KAKAO", logo: "/payment-brands/kakaopay.svg", width: 57, height: 22, className: styles.kakao },
  { method: "NAVER", logo: "/payment-brands/naverpay.svg", width: 72, height: 23, className: styles.naver },
  { method: "TOSS", logo: "/payment-brands/tosspay.png", width: 180, height: 60, className: styles.toss },
];
const secondaryBrands: typeof brands = [
  { method: "SAMSUNG", logo: "/payment-brands/samsungpay.png", width: 94, height: 42, className: styles.samsung },
  { method: "APPLE", logo: "/payment-brands/applepay.svg", width: 82, height: 34, className: styles.apple },
  { method: "PAYCO", logo: "/payment-brands/payco.png", width: 64, height: 64, className: styles.payco },
];
type Props = { onPay: (method: NicepayAction, consent?: NicepayConsent) => void; disabled?: boolean; actionLabel?: string; availabilityUrl?: string; hideUnavailable?: boolean };

/** Pure buttons are also used by the local design preview; they never store a payment choice. */
export function NicepayPaymentButtons({ onPay, disabled = false, actionLabel = "분석 시작" }: Props) {
  const [agreed, setAgreed] = useState([false, false, false]);
  const [expanded, setExpanded] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [message, setMessage] = useState("");
  const [naverOpen, setNaverOpen] = useState(false);
  const consentRef = useRef<HTMLDivElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const all = agreed.every(Boolean);
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = agreed.some(Boolean) && !all; }, [agreed, all]);
  useEffect(() => { if (nudge) allRef.current?.focus({ preventScroll: true }); }, [nudge]);
  function pay(method: NicepayAction) {
    if (disabled) return;
    if (method === "CARD") { onPay(method); return; }
    if (!all) {
      setNudge(value => value + 1);
      setMessage("필수 결제 약관에 동의해 주세요.");
      consentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      allRef.current?.focus({ preventScroll: true });
      return;
    }
    setMessage("");
    if (method === "NAVER") { setNaverOpen(value => !value); return; }
    beginPay(method);
  }
  function beginPay(method: NicepayBrand, naverMethod?: "CARD" | "POINT") {
    if (disabled) return;
    if (!all) { pay(method); return; }
    setMessage("");
    onPay(method, { version: "2026-11-13", financial: true, collection: true, sharing: true, ...(naverMethod ? { naverMethod } : {}) });
  }
  return <section className={styles.actions} aria-label={`카드·간편결제로 ${actionLabel}`}>
    <div className={styles.divider}><span>또는 카드·간편결제로</span></div>
    <div ref={consentRef} className={styles.consent}>
      <div key={nudge} className={`${styles.consentBar} ${message ? styles.attention : ""}`}>
        <label><input ref={allRef} type="checkbox" checked={all} disabled={disabled} onChange={event => { setAgreed([event.target.checked, event.target.checked, event.target.checked]); setMessage(""); }}/> 필수 결제 약관 전체 동의</label>
        <button type="button" className={styles.expand} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "접기 ∧" : "보기 ∨"}</button>
      </div>
      {expanded && <div className={styles.consentDetails}>
        {["전자금융거래 이용약관", "개인정보 수집 및 이용", "개인정보 제3자 제공"].map((label, index) => <div key={label}><label><input type="checkbox" checked={agreed[index]} disabled={disabled} onChange={event => { setAgreed(values => values.map((value, i) => i === index ? event.target.checked : value)); setMessage(""); }}/> [필수] {label}</label><a href={index === 0 ? "https://www.nicepay.co.kr/cs/terms/policy1.do" : "https://www.nicepay.co.kr/cs/terms/private.do"} target="_blank" rel="noopener noreferrer">내용 보기</a></div>)}
      </div>}
      {message && <p role="alert" className={styles.consentMessage}>{message}</p>}
    </div>
    <button type="button" className={`${styles.payButton} ${styles.card}`} disabled={disabled} onClick={() => onPay("CARD")}><CreditCard aria-hidden="true"/><span>카드로 결제하고 {actionLabel}</span></button>
    {brands.map(brand => <div key={brand.method} className={styles.primaryAction}><button type="button" className={`${styles.payButton} ${brand.className}`} disabled={disabled} onClick={() => pay(brand.method)}>
      <span className={styles.logo}><Image src={brand.logo} width={brand.width} height={brand.height} alt="" unoptimized/></span>
      <span>{nicepayBrandNames[brand.method]}로 결제하고 {actionLabel}</span>
    </button>{brand.method === "NAVER" && naverOpen && <div className={styles.naverChoice} role="group" aria-label="네이버페이 결제수단"><span>네이버페이 결제수단</span><button type="button" disabled={disabled} onClick={() => beginPay("NAVER", "CARD")}>네이버페이 카드로 결제</button><button type="button" disabled={disabled} onClick={() => beginPay("NAVER", "POINT")}>네이버페이 포인트로 결제</button><small>카드·포인트 복합결제는 지원하지 않습니다.</small></div>}</div>)}
    <div className={styles.secondary} role="group" aria-label="다른 간편결제">
      {secondaryBrands.map(brand => <button key={brand.method} type="button" aria-label={`${nicepayBrandNames[brand.method]}로 결제하고 ${actionLabel}`} title={nicepayBrandNames[brand.method]} className={`${styles.square} ${brand.className}`} disabled={disabled} onClick={() => pay(brand.method)}>
        <Image src={brand.logo} width={brand.width} height={brand.height} alt="" unoptimized/>
      </button>)}
    </div>
    <p>{actionLabel === "심층해설 시작" ? "결제 완료 후 검사 결과 심층해설을 자동으로 시작합니다." : "결제 완료 후 분석·첨삭을 자동으로 시작합니다."}</p>
  </section>;
}

export function NicepayPaymentActions({ availabilityUrl = "/api/billing/payment-methods", hideUnavailable = false, ...props }: Props) {
  const installed = useSyncExternalStore(subscribe, isInstalledAppContext, () => true);
  const [attempt, setAttempt] = useState(0);
  const key = `${availabilityUrl}:${attempt}`;
  const [result, setResult] = useState<{ key: string; status: "available" | "unavailable" | "error" } | null>(null);
  const status = result?.key === key ? result.status : "loading";
  useEffect(() => {
    if (installed) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    void fetch(availabilityUrl, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("nicepay" in data) || typeof data.nicepay !== "boolean") throw new Error("PAYMENT_METHODS_UNAVAILABLE");
      if (!cancelled) setResult({ key, status: data.nicepay ? "available" : "unavailable" });
    }).catch(() => { if (!cancelled) setResult({ key, status: "error" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [installed, availabilityUrl, key]);
  if (installed || (hideUnavailable && status === "unavailable")) return null;
  return <>
    {status !== "available" && <div className={styles.availability} role="status">
      <p>{status === "loading" ? "결제수단을 확인하고 있습니다…" : status === "error" ? "결제수단을 불러오지 못했습니다. 다시 확인해 주세요." : "현재 계정에서 NICE 카드·간편결제를 사용할 수 없습니다. 일반결제를 이용하거나 다시 확인해 주세요."}</p>
      {status !== "loading" && <button type="button" onClick={() => setAttempt(value => value + 1)}>결제수단 다시 확인</button>}
    </div>}
    <NicepayPaymentButtons {...props} disabled={props.disabled || status !== "available"}/>
  </>;
}

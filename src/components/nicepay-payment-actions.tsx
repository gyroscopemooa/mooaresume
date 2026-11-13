"use client";
import Image from "next/image";
import { CreditCard } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isInstalledAppContext } from "@/lib/app-context";
import { nicepayBrandNames, type NicepayAction, type NicepayBrand, type NicepayConsent } from "@/domain/nicepay-method";
import { CheckoutPaymentMethods } from "./checkout-payment-methods";
import styles from "./nicepay-payment-actions.module.css";

const subscribe = () => () => {};
const brands: { method: NicepayBrand; logo: string; width: number; height: number; className: string }[] = [
  { method: "KAKAO", logo: "/payment-brands/kakaopay.svg", width: 57, height: 22, className: styles.kakao },
  { method: "NAVER", logo: "/payment-brands/naverpay.svg", width: 72, height: 23, className: styles.naver },
  { method: "SAMSUNG", logo: "/payment-brands/samsungpay.png", width: 94, height: 42, className: styles.samsung },
];
type Props = { onPay: (method: NicepayAction, consent?: NicepayConsent) => void; disabled?: boolean };

/** Pure buttons are also used by the local design preview; they never store a payment choice. */
export function NicepayPaymentButtons({ onPay, disabled = false }: Props) {
  const [agreed, setAgreed] = useState([false, false, false]);
  const [expanded, setExpanded] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [message, setMessage] = useState("");
  const [naverMethod, setNaverMethod] = useState<"CARD" | "POINT" | "">("");
  const consentRef = useRef<HTMLDivElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const all = agreed.every(Boolean);
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = agreed.some(Boolean) && !all; }, [agreed, all]);
  useEffect(() => { if (nudge) allRef.current?.focus({ preventScroll: true }); }, [nudge]);
  function pay(method: NicepayAction) {
    if (disabled) return;
    if (method === "CARD") { onPay(method); return; }
    if (!all || (method === "NAVER" && !naverMethod)) {
      setNudge(value => value + 1);
      setMessage(!all ? "필수 결제 약관에 동의해 주세요." : "네이버페이 카드 또는 포인트를 선택해 주세요.");
      if (method === "NAVER" && all) setExpanded(true);
      consentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      allRef.current?.focus({ preventScroll: true });
      return;
    }
    setMessage("");
    onPay(method, { version: "2026-11-13", financial: true, collection: true, sharing: true, ...(naverMethod ? { naverMethod } : {}) });
  }
  return <section className={styles.actions} aria-label="카드·간편결제로 분석 시작">
    <div className={styles.divider}><span>또는 카드·간편결제로</span></div>
    <div ref={consentRef} className={styles.consent}>
      <div key={nudge} className={`${styles.consentBar} ${message ? styles.attention : ""}`}>
        <label><input ref={allRef} type="checkbox" checked={all} disabled={disabled} onChange={event => { setAgreed([event.target.checked, event.target.checked, event.target.checked]); setMessage(""); }}/> 필수 결제 약관 전체 동의</label>
        <button type="button" className={styles.expand} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "접기 ∧" : "보기 ∨"}</button>
      </div>
      {expanded && <div className={styles.consentDetails}>
        {["전자금융거래 이용약관", "개인정보 수집 및 이용", "개인정보 제3자 제공"].map((label, index) => <div key={label}><label><input type="checkbox" checked={agreed[index]} disabled={disabled} onChange={event => { setAgreed(values => values.map((value, i) => i === index ? event.target.checked : value)); setMessage(""); }}/> [필수] {label}</label><a href={index === 0 ? "https://www.nicepay.co.kr/cs/terms/policy1.do" : "https://www.nicepay.co.kr/cs/terms/private.do"} target="_blank" rel="noopener noreferrer">내용 보기</a></div>)}
        <label>네이버페이 결제수단 <select value={naverMethod} disabled={disabled} onChange={event => { setNaverMethod(event.target.value as "CARD" | "POINT" | ""); setMessage(""); }}><option value="">선택</option><option value="CARD">카드</option><option value="POINT">포인트</option></select></label>
      </div>}
      {message && <p role="alert" className={styles.consentMessage}>{message}</p>}
    </div>
    {brands.map(brand => <button key={brand.method} type="button" className={`${styles.payButton} ${brand.className}`} disabled={disabled} onClick={() => pay(brand.method)}>
      <span className={styles.logo}><Image src={brand.logo} width={brand.width} height={brand.height} alt="" unoptimized/></span>
      <span>{nicepayBrandNames[brand.method]}로 결제하고 분석 시작</span>
    </button>)}
    <button type="button" className={`${styles.payButton} ${styles.card}`} disabled={disabled} onClick={() => onPay("CARD")}><CreditCard aria-hidden="true"/><span>카드로 결제하고 분석 시작</span></button>
    <p>간편결제는 약관 동의 후 해당 페이로 연결됩니다. 카드는 NICE 결제창에서 선택해 주세요.</p>
  </section>;
}

export function NicepayPaymentActions(props: Props) {
  const installed = useSyncExternalStore(subscribe, isInstalledAppContext, () => true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    if (installed) return;
    let cancelled = false;
    void fetch("/api/billing/payment-methods", { cache: "no-store" }).then(async response => {
      const data: unknown = await response.json();
      if (!cancelled) setEnabled(response.ok && !!data && typeof data === "object" && "nicepay" in data && data.nicepay === true);
    }).catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, [installed]);
  if (installed) return null;
  if (enabled === null) return <p role="status">결제수단을 확인하고 있습니다…</p>;
  return enabled ? <NicepayPaymentButtons {...props}/> : <CheckoutPaymentMethods/>;
}

"use client";
import Image from "next/image";
import { CreditCard } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isInstalledAppContext } from "@/lib/app-context";
import { nicepayBrandNames, type NicepayAction, type NicepayBrand } from "@/domain/nicepay-method";
import { CheckoutPaymentMethods } from "./checkout-payment-methods";
import styles from "./nicepay-payment-actions.module.css";

const subscribe = () => () => {};
const brands: { method: NicepayBrand; logo: string; width: number; height: number; className: string }[] = [
  { method: "KAKAO", logo: "/payment-brands/kakaopay.svg", width: 57, height: 22, className: styles.kakao },
  { method: "NAVER", logo: "/payment-brands/naverpay.svg", width: 72, height: 23, className: styles.naver },
  { method: "SAMSUNG", logo: "/payment-brands/samsungpay.png", width: 94, height: 42, className: styles.samsung },
];
type Props = { onPay: (method: NicepayAction) => void; disabled?: boolean };

/** Pure buttons are also used by the local design preview; they never store a payment choice. */
export function NicepayPaymentButtons({ onPay, disabled = false }: Props) {
  return <section className={styles.actions} aria-label="카드·간편결제로 분석 시작">
    <div className={styles.divider}><span>또는 카드·간편결제로</span></div>
    {brands.map(brand => <button key={brand.method} type="button" className={`${styles.payButton} ${brand.className}`} disabled={disabled} onClick={() => onPay(brand.method)}>
      <span className={styles.logo}><Image src={brand.logo} width={brand.width} height={brand.height} alt="" unoptimized/></span>
      <span>{nicepayBrandNames[brand.method]}로 결제하고 분석 시작</span>
    </button>)}
    <button type="button" className={`${styles.payButton} ${styles.card}`} disabled={disabled} onClick={() => onPay("CARD")}><CreditCard aria-hidden="true"/><span>카드로 결제하고 분석 시작</span></button>
    <p>NICE 결제창에서 약관과 이용할 결제수단을 확인해 주세요.</p>
  </section>;
}

export function NicepayPaymentActions(props: Props) {
  const installed = useSyncExternalStore(subscribe, isInstalledAppContext, () => true);
  const [enabled, setEnabled] = useState(false);
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
  return enabled ? <NicepayPaymentButtons {...props}/> : <CheckoutPaymentMethods/>;
}

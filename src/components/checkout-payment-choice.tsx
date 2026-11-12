"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isInstalledAppContext } from "@/lib/app-context";
import { CheckoutPaymentMethods } from "./checkout-payment-methods";
import styles from "./checkout-payment-choice.module.css";

export type WebPaymentMethod = "POLAR" | "NICE_CARD" | "NICE_EASYPAY";
const subscribe = () => () => {};
const serverSnapshot = () => true;

export function CheckoutPaymentChoice({ value, onChange, disabled = false }: {
  value: WebPaymentMethod; onChange: (value: WebPaymentMethod) => void; disabled?: boolean;
}) {
  const installed = useSyncExternalStore(subscribe, isInstalledAppContext, serverSnapshot);
  const [nicepay, setNicepay] = useState(false);
  useEffect(() => {
    if (installed) return;
    let cancelled = false;
    void fetch("/api/billing/payment-methods", { cache: "no-store" }).then(async response => {
      const data: unknown = await response.json();
      const enabled = response.ok && !!data && typeof data === "object" && "nicepay" in data && data.nicepay === true;
      if (!cancelled) { setNicepay(enabled); if (!enabled) onChange("POLAR"); }
    }).catch(() => { if (!cancelled) { setNicepay(false); onChange("POLAR"); } });
    return () => { cancelled = true; };
  }, [installed, onChange]);
  if (installed) return null;
  return <fieldset className={styles.choice} disabled={disabled}>
    <legend>결제수단</legend>
    {nicepay && <>
      <label><input type="radio" name="webPaymentMethod" value="NICE_CARD" checked={value === "NICE_CARD"} onChange={() => onChange("NICE_CARD")}/><span><b>국내 카드결제</b><small>NICE에서 신용·체크카드 선택</small></span></label>
      <label><input type="radio" name="webPaymentMethod" value="NICE_EASYPAY" checked={value === "NICE_EASYPAY"} onChange={() => onChange("NICE_EASYPAY")}/><span><b>카카오페이 · 네이버페이 · 삼성페이 등</b><small>NICE 결제창의 간편결제 탭에서 선택</small></span></label>
    </>}
    <label><input type="radio" name="webPaymentMethod" value="POLAR" checked={value === "POLAR"} onChange={() => onChange("POLAR")}/><span><b>{nicepay ? "기존 결제 · Polar" : "카드·간편결제 · Polar"}</b><small>결제창에서 이용 가능한 수단 선택</small></span></label>
    {value === "POLAR" && <CheckoutPaymentMethods/>}
    <p>결제가 확인되면 분석을 자동으로 시작합니다.</p>
  </fieldset>;
}

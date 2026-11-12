"use client";

import { useSyncExternalStore } from "react";
import { isInstalledAppContext } from "@/lib/app-context";
import styles from "./checkout-payment-methods.module.css";

const subscribe = () => () => {};
// Hide external payment messaging until the browser has identified the app context.
const serverSnapshot = () => true;

/** Informational methods, not direct-pay controls: Polar owns method selection. */
export function CheckoutPaymentMethods() {
  const installed = useSyncExternalStore(subscribe, isInstalledAppContext, serverSnapshot);
  if (installed) return null;

  return <section className={styles.methods} aria-label="간편결제 안내">
    <strong>간편결제</strong>
    <ul aria-label="Polar 지원 간편결제">
      <li className={styles.kakao}>카카오페이</li>
      <li className={styles.naver}>네이버페이</li>
      <li>삼성페이</li>
    </ul>
    <p>결제 버튼을 누른 뒤 Polar 결제창에서 선택해 주세요. 한국·원화 결제 기준이며, 실제 이용 가능한 수단은 결제창에서 확인할 수 있습니다.</p>
  </section>;
}

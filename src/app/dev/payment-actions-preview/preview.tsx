"use client";
import { useState } from "react";
import { NicepayPaymentButtons } from "@/components/nicepay-payment-actions";
export function PaymentActionsPreview() {
  const [message, setMessage] = useState("버튼 디자인만 확인합니다. 실제 결제·AI 호출은 없습니다.");
  return <main style={{ maxWidth: 470, margin: "56px auto", padding: 24, fontFamily: "inherit" }}>
    <h1 style={{ fontSize: 24, color: "#176b4a", marginBottom: 12 }}>결제 버튼 미리보기</h1>
    <p style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>기존 결제 버튼 아래에 간편결제와 NICE 카드 버튼을 추가합니다. 로그인 세션 없이 확인할 수 있는 로컬 디자인 화면입니다.</p>
    <button type="button" style={{ width: "100%", minHeight: 52, border: 0, borderRadius: 9, background: "#176b4a", color: "#fff", fontSize: 14, fontWeight: 800 }} onClick={() => setMessage("기존 버튼은 Polar 연결을 유지합니다. 미리보기에서는 결제하지 않습니다.")}>결제하고 분석 시작</button>
    <NicepayPaymentButtons onPay={method => setMessage(`${method} 버튼 선택 확인. 미리보기에서는 결제하지 않습니다.`)}/>
    <p role="status" style={{ marginTop: 20, padding: 14, background: "#f1f6f3", borderRadius: 9, fontSize: 12, lineHeight: 1.7 }}>{message}</p>
  </main>;
}

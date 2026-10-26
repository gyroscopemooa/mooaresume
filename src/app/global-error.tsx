"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

const colors = {
  background: "#f4f7f5",
  card: "#ffffff",
  ink: "#15231c",
  muted: "#607068",
  primary: "#176b46",
  primaryDark: "#0f5235",
  line: "#dce5e0",
};

const styles = {
  body: {
    margin: 0,
    background: colors.background,
    color: colors.ink,
    fontFamily:
      'Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  main: {
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    padding: "24px",
  },
  card: {
    width: "min(100%, 520px)",
    boxSizing: "border-box",
    border: `1px solid ${colors.line}`,
    borderRadius: "20px",
    background: colors.card,
    padding: "clamp(28px, 7vw, 48px)",
    boxShadow: "0 18px 50px rgba(24, 56, 40, 0.09)",
  },
  brand: {
    margin: "0 0 32px",
    color: colors.primary,
    fontSize: "14px",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },
  status: {
    margin: "0 0 10px",
    color: colors.primary,
    fontSize: "13px",
    fontWeight: 700,
  },
  heading: {
    margin: 0,
    fontSize: "clamp(24px, 7vw, 34px)",
    lineHeight: 1.25,
    letterSpacing: "-0.04em",
  },
  description: {
    margin: "16px 0 0",
    color: colors.muted,
    fontSize: "15px",
    lineHeight: 1.75,
    wordBreak: "keep-all",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "30px",
  },
  button: {
    minHeight: "48px",
    borderRadius: "12px",
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    font: "inherit",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
  },
  primaryButton: {
    border: `1px solid ${colors.primary}`,
    background: colors.primary,
    color: "#ffffff",
  },
  secondaryButton: {
    border: `1px solid ${colors.line}`,
    background: colors.card,
    color: colors.primaryDark,
  },
} satisfies Record<string, CSSProperties>;

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const reload = () => {
    retry();
    window.location.reload();
  };

  return (
    <html lang="ko">
      <head>
        <title>서비스를 불러오지 못했습니다 | MOOA Resume</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={styles.body}>
        <main style={styles.main}>
          <section style={styles.card} aria-labelledby="service-error-title">
            <p style={styles.brand}>MOOA RESUME</p>
            <p style={styles.status}>일시적인 서비스 오류</p>
            <h1 id="service-error-title" style={styles.heading}>
              잠시 후 다시 이용해 주세요
            </h1>
            <p style={styles.description}>
              서비스를 불러오는 중 문제가 생겼습니다. 현재 점검 중이거나 잠시 연결이
              불안정할 수 있습니다. 작성 중인 내용은 가능하면 그대로 두고 잠시 후 다시
              불러와 주세요.
            </p>
            <div style={styles.actions}>
              <button type="button" style={{ ...styles.button, ...styles.primaryButton }} onClick={reload}>
                다시 불러오기
              </button>
              <Link href="/" style={{ ...styles.button, ...styles.secondaryButton }}>
                홈으로 이동
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

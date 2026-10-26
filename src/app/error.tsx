"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="site-error-page">
      <section className="site-error-card" aria-labelledby="page-error-title">
        <p className="site-error-brand">MOOA RESUME</p>
        <p className="site-error-status">일시적인 서비스 오류</p>
        <h1 id="page-error-title">페이지를 불러오지 못했습니다</h1>
        <p>
          연결이 잠시 불안정하거나 새 버전을 불러오는 중일 수 있습니다.
          다시 시도해도 계속되면 홈으로 이동해 주세요.
        </p>
        <div className="site-error-actions">
          <button type="button" onClick={() => reset()}>다시 시도</button>
          <a href="/">홈으로 이동</a>
        </div>
      </section>
      <style jsx>{`
        .site-error-page { min-height: 75vh; display: grid; place-items: center; padding: 24px; background: #f4f7f5; color: #15231c; }
        .site-error-card { box-sizing: border-box; width: min(100%, 520px); padding: clamp(28px, 7vw, 48px); border: 1px solid #dce5e0; border-radius: 20px; background: #fff; box-shadow: 0 18px 50px rgba(24, 56, 40, .09); }
        .site-error-brand { margin: 0 0 32px; color: #176b46; font-size: 14px; font-weight: 800; letter-spacing: .12em; }
        .site-error-status { margin: 0 0 10px; color: #176b46; font-size: 13px; font-weight: 700; }
        h1 { margin: 0; font-size: clamp(24px, 7vw, 34px); line-height: 1.25; letter-spacing: -.04em; }
        .site-error-card > p:last-of-type { margin: 16px 0 0; color: #607068; font-size: 15px; line-height: 1.75; word-break: keep-all; }
        .site-error-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 30px; }
        .site-error-actions button, .site-error-actions a { box-sizing: border-box; min-height: 48px; display: grid; place-items: center; border-radius: 12px; font: inherit; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; }
        .site-error-actions button { border: 1px solid #176b46; background: #176b46; color: #fff; }
        .site-error-actions a { border: 1px solid #dce5e0; background: #fff; color: #0f5235; }
      `}</style>
    </main>
  );
}

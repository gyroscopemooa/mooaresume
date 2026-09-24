"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMaintenanceBypass, useRuntimeMaintenanceMode } from "@/lib/live-sub-runtime/maintenance-hooks";
import styles from "./maintenance-gate.module.css";

/**
 * HQ 점검 모드. 브라우저에서만 판단하며 서버 API 는 막지 않는다.
 *  - scope "all": 자식 대신 전체 화면 점검 안내만 렌더 (딥링크로 들어와도 동일)
 *  - scope 가 기능 key: 그 기능의 진입 화면만 점검 안내로 대체, 나머지는 평소대로
 * HQ 응답 전·실패 시에는 항상 자식을 그대로 보여 준다.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const bypassed = useMaintenanceBypass();
  const state = useRuntimeMaintenanceMode(pathname, bypassed);

  if (state?.mode === "full") {
    return (
      <main className={styles.full} role="alert" aria-live="polite">
        <div className={styles.card}>
          <p className={styles.badge}>서비스 점검</p>
          <h1>{state.message}</h1>
        </div>
      </main>
    );
  }
  if (state?.mode === "feature") {
    return (
      <main className={styles.feature} role="status">
        <div className={styles.card}>
          <p className={styles.badge}>기능 점검</p>
          <h1>{state.message}</h1>
          <Link href="/" className={styles.home}>홈으로 돌아가기</Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

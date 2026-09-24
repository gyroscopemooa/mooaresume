"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { MaintenanceImage } from "@/lib/live-sub-runtime/maintenance";
import { useMaintenanceBypass, useRuntimeMaintenanceMode } from "@/lib/live-sub-runtime/maintenance-hooks";
import styles from "./maintenance-gate.module.css";

const MOBILE_MEDIA = "(max-width: 760px)";

/**
 * 전체 차단 화면. 이미지가 있으면 이미지를 화면 전체에 contain 으로 보여 주고(자르지 않음),
 * 이미지가 뜨기 전에는 문구 카드를 보여 빈 화면이 깜빡이지 않게 한다. 로드에 실패하면 문구 카드로 남는다.
 */
function FullMaintenance({ message, image }: { message: string; image?: MaintenanceImage }) {
  const imageKey = image ? `${image.desktop}|${image.mobile}` : "";
  const [outcome, setOutcome] = useState<{ key: string; status: "loaded" | "failed" } | null>(null);
  const status = image ? (outcome?.key === imageKey ? outcome.status : "loading") : "failed";
  const showImage = Boolean(image) && status !== "failed";

  return (
    <main
      className={`${styles.full} ${showImage ? styles.fullImage : ""}`}
      style={showImage && image ? { background: image.background } : undefined}
      role="alert"
      aria-live="polite"
    >
      {showImage && image && (
        <picture className={status === "loaded" ? styles.pictureLoaded : styles.picture}>
          {image.mobile !== image.desktop && <source media={MOBILE_MEDIA} srcSet={image.mobile} />}
          <img
            src={image.desktop}
            alt={message}
            ref={(element) => { if (element?.complete && element.naturalWidth > 0 && status === "loading") setOutcome({ key: imageKey, status: "loaded" }); }}
            onLoad={() => setOutcome({ key: imageKey, status: "loaded" })}
            onError={() => setOutcome({ key: imageKey, status: "failed" })}
          />
        </picture>
      )}
      {status !== "loaded" && (
        <div className={styles.card}>
          <p className={styles.badge}>서비스 점검</p>
          <h1>{message}</h1>
        </div>
      )}
    </main>
  );
}

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
    return <FullMaintenance message={state.message} image={state.image} />;
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

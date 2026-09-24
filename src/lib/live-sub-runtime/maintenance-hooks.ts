"use client";

import { useEffect, useMemo, useState } from "react";
import { useRuntimeMaintenance } from "./hooks";
import { readMaintenanceBypass, resolveMaintenance, writeMaintenanceBypass } from "./maintenance";

const BYPASS_PARAM = "bypass";

/**
 * 이 브라우저가 점검을 우회하는지. null 은 "아직 모름"이고, 그동안은 막지 않는다
 * (우회 확인이 끝나기 전에 QA 화면이 깜빡 막히지 않게 하고, 실패하면 열어 두는 쪽이 안전하다).
 *
 * `?bypass=<토큰>` 으로 들어오면 서버에 토큰을 확인하고, 맞으면 12시간 기억한 뒤 주소에서 토큰을 지운다.
 * `?bypass=off` 는 우회를 끈다.
 */
export function useMaintenanceBypass(): boolean | null {
  const [bypassed, setBypassed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = new URL(window.location.href);
    const token = url.searchParams.get(BYPASS_PARAM);

    const stripParam = () => {
      url.searchParams.delete(BYPASS_PARAM);
      try { window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash); } catch {}
    };

    const resolveBypass = async (): Promise<boolean> => {
      if (token === "off") {
        writeMaintenanceBypass(window.localStorage, false);
        stripParam();
        return false;
      }
      if (!token) return readMaintenanceBypass(window.localStorage);

      const ok = await fetch("/api/maintenance/bypass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((response) => response.ok)
        .catch(() => false);
      if (ok) writeMaintenanceBypass(window.localStorage, true);
      // 확인이 끝난 뒤에 주소에서 지운다. 먼저 지우면 개발 모드(StrictMode)에서 effect 가 두 번 돌 때
      // 두 번째 실행이 토큰을 못 보고 우회를 잃는다.
      stripParam();
      return ok || readMaintenanceBypass(window.localStorage);
    };

    void resolveBypass().then((value) => { if (!cancelled) setBypassed(value); });
    return () => { cancelled = true; };
  }, []);

  return bypassed;
}

/** HQ 점검 설정을 현재 화면 기준으로 풀어 준다. 우회 확인 중(null)이거나 우회 중이면 null. */
export function useRuntimeMaintenanceMode(pathname: string, bypassed: boolean | null) {
  const maintenance = useRuntimeMaintenance();
  return useMemo(
    () => (bypassed === false ? resolveMaintenance(maintenance, { pathname }) : null),
    [maintenance, pathname, bypassed],
  );
}

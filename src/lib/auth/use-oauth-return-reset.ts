"use client";

import { useEffect } from "react";

/** OAuth navigation can be restored from BFCache without remounting React. */
export function useOAuthReturnReset(reset: () => void) {
  useEffect(() => {
    function restored(event: PageTransitionEvent) { if (event.persisted) reset(); }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [reset]);
}

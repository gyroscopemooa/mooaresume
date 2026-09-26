"use client";

import { useMemo } from "react";
import { InterviewPackPanel } from "@/components/interview-pack/interview-pack-panel";
import { createLiveApi } from "@/lib/interview-pack/client-api";

export function PackView({ packId }: { packId: string }) {
  const api = useMemo(() => createLiveApi({ packId }), [packId]);
  return <InterviewPackPanel api={api} mode="live" />;
}

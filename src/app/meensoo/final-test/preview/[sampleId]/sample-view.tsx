"use client";

import { useMemo } from "react";
import { InterviewPackPanel } from "@/components/interview-pack/interview-pack-panel";
import { createSampleApi } from "@/lib/interview-pack/client-api";
import type { PackSampleId } from "@/fixtures/interview-pack-samples";

export function SampleView({ sampleId }: { sampleId: PackSampleId }) {
  const api = useMemo(() => createSampleApi(sampleId), [sampleId]);
  return <InterviewPackPanel api={api} mode="sample" />;
}

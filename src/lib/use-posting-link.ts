"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { hasJobPostingText } from "@/domain/job-posting-source";

type ReadState = { url: string; loading: boolean; message: string };
export function usePostingLink(url: string | null, onLoaded: (text: string, url: string, truncated: boolean) => void) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReadState>({ url: "", loading: false, message: "" });
  const deliver = useEffectEvent(onLoaded);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      setState({ url, loading: true, message: "공고 본문을 자동으로 읽는 중입니다. 주소만으로는 아직 제출 자료가 준비되지 않았습니다." });
      try {
        const response = await fetch("/api/job-postings/fetch", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }), signal: controller.signal,
        });
        const value: unknown = await response.json();
        if (!active) return;
        const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
        if (response.ok && body.ok === true && typeof body.text === "string" && hasJobPostingText(body.text)) {
          const limit = Math.max(0, 20_000 - url.length - 2);
          const truncated = body.truncated === true || body.text.length > limit;
          deliver(body.text.slice(0, limit), url, truncated);
          setState({ url, loading: false, message: truncated ? "공고 본문을 일부만 가져왔습니다. 잘린 모집 조건이 없는지 확인해 주세요." : "공고 본문을 입력 자료에 반영했습니다. 지원 직무와 모집 조건이 포함됐는지 확인해 주세요." });
        } else {
          setState({ url, loading: false, message: body.reason === "IMAGE_ONLY"
            ? "이미지로 된 공고여서 본문을 자동으로 읽지 못했습니다. 공고 내용을 텍스트로 붙여넣어 주세요. 그대로 진행하면 공고 대조는 제외됩니다."
            : "공고 본문을 읽지 못했습니다. 본문을 붙여넣거나 다시 시도해 주세요. 그대로 진행하면 공고 대조는 제외됩니다." });
        }
      } catch {
        if (active) setState({ url, loading: false, message: "공고 본문을 가져오지 못했습니다. 그대로 진행하면 공고 대조는 제외됩니다." });
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [url, attempt]);
  return {
    loading: Boolean(url) && (state.url !== url || state.loading),
    message: url && state.url !== url ? "공고 본문 자동 읽기를 준비 중입니다." : state.message,
    retry: () => setAttempt(value => value + 1),
  };
}

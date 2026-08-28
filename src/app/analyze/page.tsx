import { redirect } from "next/navigation";

/**
 * The pre-launch mock that used to live here now redirects to the real flow.
 *
 * It was a complete facade: the posting textarea had no state at all, the
 * cover-letter text was never saved, "파일로 올리기" did nothing, and
 * "분석 시작하기" linked to /result with no id — which renders the built-in
 * sample. Someone who typed their whole application into it lost every word and
 * was shown a stranger's 현대모비스 result.
 *
 * That matters more than it looks: nine links across the site point here,
 * including the header's 무료로 진단하기 — the main call to action on a launched
 * product. Redirecting keeps every one of them working while sending people to
 * /onboarding, where the same first question is asked for real.
 *
 * The old markup is preserved at docs/removed-analyze-mock.tsx.txt.
 */
export default function AnalyzePage() {
  redirect("/onboarding?from=analyze");
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자소서 첨삭 전후 비교 예시",
  description: "작성 단계별 자소서 첨삭 전후와 수정 이유, 핵심 개선점 및 면접 연결 예시를 확인하세요.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "자소서 첨삭 전후 비교 예시 | MOOA Resume",
    description: "자소서 Before·After와 수정 이유를 가상 사례로 확인하세요.",
    url: "/examples",
  },
};

export default function ExamplesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

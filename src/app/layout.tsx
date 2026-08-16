import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";


const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "AI 자소서 첨삭·취업 준비 | MOOA Resume", template: "%s | MOOA Resume" },
  description: "채용공고, 자기소개서, 이력서와 경험을 연결해 고칠 이유와 최종 첨삭본을 제공하는 AI 취업 지원서 코치입니다.",
  applicationName: "MOOA Resume",
  authors: [{ name: "MOOA Resume" }],
  creator: "MOOA Resume",
  publisher: "MOOA Resume",
  category: "employment",
  keywords: ["자소서 첨삭", "자기소개서 첨삭", "AI 자소서", "취업 준비", "대기업 자소서", "생산직 자소서"],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "MOOA Resume",
    title: "AI 자소서 첨삭·취업 준비 | MOOA Resume",
    description: "공고와 경험, 자소서를 연결해 입력은 간단하게 분석은 섬세하게.",
  },
  twitter: { card: "summary_large_image", title: "AI 자소서 첨삭 | MOOA Resume", description: "공고와 경험, 자소서를 연결하는 AI 취업 지원서 코치" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : {},
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.variable}>{children}</body>
    </html>
  );
}

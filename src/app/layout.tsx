import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
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
  keywords: ["무아레쥬메", "무아 레쥬메", "MOOA Resume", "mooaresume", "자소서 첨삭", "자기소개서 첨삭", "AI 자소서", "AI 자기소개서", "자소서 첨삭 사이트", "자소서 AI 첨삭", "취업 준비", "대기업 자소서", "생산직 자소서", "채용공고 분석"],
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
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
    // Checked into the repo on purpose. This token is not a credential — it is
    // published in the HTML of every page for anyone to read, and Google
    // requires it to stay there permanently or the property loses its verified
    // status. Behind an env var it produced the one failure it could: this
    // export is evaluated when the page is generated, so a value present only
    // at runtime yields no tag at all, and the live site served none while
    // local development looked fine. An override is still honoured for anyone
    // deploying this under a different Search Console property.
    google: process.env.GOOGLE_SITE_VERIFICATION || "y6v6fCOXM0u3Uq5XESQB1g-yduLoGXJvARLW3I6RGEk",
    other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : {},
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.variable}>
        {children}
        {/* next/script's onLoad prop needs "use client", which the root layout
            can't be (it exports metadata). Naver's own snippet relies on
            wcslog.js loading and running before wcs_add/wcs_do exist, which a
            plain blocking <script src> gives for free — creating the tag by
            hand and hooking its own onload reproduces that without needing a
            client boundary. */}
        <Script id="naver-wcslog" strategy="afterInteractive">
          {`(function(){
  var s = document.createElement("script");
  s.src = "//wcs.pstatic.net/wcslog.js";
  s.onload = function() {
    window.wcs_add = window.wcs_add || {};
    window.wcs_add["wa"] = "1c6334533aa6fe0";
    if (window.wcs) { window.wcs_do(); }
  };
  document.head.appendChild(s);
})();`}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "y66zftrtdb");`}
        </Script>
      </body>
    </html>
  );
}

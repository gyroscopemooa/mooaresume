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
  // Long-tail terms alongside the head ones. Nobody types "자소서 첨삭" alone —
  // they type "무료 자소서 첨삭 사이트" or "자소서 첨삭 어디서 받나요".
  keywords: [
    "무아레쥬메", "무아 레쥬메", "MOOA Resume", "mooaresume",
    "자소서 첨삭", "자기소개서 첨삭", "자소서 첨삭 사이트", "자소서 첨삭 추천",
    "무료 자소서 첨삭", "자소서 무료 첨삭", "자기소개서 무료 첨삭",
    "AI 자소서", "AI 자기소개서", "AI 자소서 첨삭", "자소서 AI 첨삭", "AI 자기소개서 첨삭",
    "자소서 첨삭 후기", "자소서 첨삭 잘하는곳", "자소서 대필 아닌 첨삭",
    "자기소개서 작성법", "자소서 쓰는 법", "지원동기 쓰는 법", "자소서 첨삭 받는 법",
    "취업 준비", "신입 자소서", "경력직 자소서", "대기업 자소서", "공기업 자소서",
    "생산직 자소서", "현대자동차 생산직 자소서", "반도체 자소서",
    "채용공고 분석", "이력서 자소서 교차검증", "면접 예상질문",
  ],
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
    // 네이버도 같은 이유로 기본값을 적어 둡니다. 환경변수만 있을 때 이 export가
    // 빌드 시점에 평가되어 실서버에는 태그가 하나도 안 실렸던 것이 바로 위에
    // 적힌 그 실패입니다. 구글 쪽만 고치고 네이버를 그대로 두면 같은 일이
    // 네이버에서 반복됩니다. 이 값도 자격증명이 아니라 모든 페이지 HTML에
    // 공개되는 확인용 문자열입니다.
    other: { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION || "e82574b967e594d90dde7bcd1f05cc3febda9aea" },
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
        {/* Google Ads (gtag.js), AW-18415179469.

            beforeInteractive, which puts both tags in <head> where Google's
            instructions and its automated "tag not found" check expect them.
            afterInteractive worked — the tag was in the served HTML either way,
            verified with curl — but an ad account flagged over placement costs
            real money, and the script is async, so the cost of being certain is
            close to nothing. The Naver and Clarity tags below stay where they
            are; nobody audits those. */}
        <Script id="google-ads-lib" strategy="beforeInteractive" src="https://www.googletagmanager.com/gtag/js?id=AW-18415179469" />
        <Script id="google-ads-config" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
// Google's snippet leaves gtag as a bare function declaration, which is global
// only because the tag is a classic script. Assigning it as well means a
// conversion call from a component finds it either way.
window.gtag = gtag;
gtag('js', new Date());
gtag('config', 'AW-18415179469');
// GA4. 구글이 안내하는 스니펫은 gtag.js를 한 번 더 불러오게 되어 있는데, 그
// 라이브러리는 위에서 이미 실었습니다. 두 번 실으면 페이지뷰가 두 번 세지고
// 광고 태그까지 함께 흔들립니다 — 측정 ID만 하나 더 붙이면 됩니다.
gtag('config', 'G-XF0JRSBBZX');`}
        </Script>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const launchedAt = new Date("2026-08-24");
  return [
    { url: siteUrl, lastModified: launchedAt, changeFrequency: "weekly", priority: 1 },
    // 라운지는 아직 예시 글 위주지만, 취업·진로 고민 검색어의 착지점입니다.
    // 낱개 게시글은 여기 없습니다 — 게시글 상세 라우트가 아직 없어서 크롤러가
    // 찾아갈 낱개 주소 자체가 없습니다. 그 라우트가 생기면 동적으로 채웁니다.
    //
    // 한때 이 주소가 사이트맵에 두 번 실려 있었습니다. 커리어 페이지를 더하면서
    // 이미 있던 줄을 못 보고 하나 더 적은 것입니다. 같은 주소가 두 번 있으면
    // 크롤러가 그 사이트맵을 덜 믿습니다.
    { url: `${siteUrl}/community`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/examples`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guide`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/landing`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/privacy`, lastModified: new Date("2026-08-31"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/result/sample`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.8 },
    // 커리어 검사 쪽은 제품 화면이 아니라 읽고 바로 해 볼 수 있는 페이지들이라
    // 위의 "제품 경로는 뺀다" 규칙에 걸리지 않습니다. 로그인도 결제도 필요
    // 없고, 검색으로 들어온 사람이 그 자리에서 할 일이 있습니다.
    //
    // 색인 대상에서 빠져 있던 것이 이 셋이었습니다. 직업심리검사·진로검사
    // 계열 검색어를 실제로 받는 화면이 사이트맵에 없어서, 크롤러는 홈에서
    // 링크를 타고 들어오기를 기다리고 있었습니다.
    { url: `${siteUrl}/career`, lastModified: new Date("2026-09-02"), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/career/assessments`, lastModified: new Date("2026-09-02"), changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/career/interest`, lastModified: new Date("2026-09-02"), changeFrequency: "monthly", priority: 0.8 },
  ];
}

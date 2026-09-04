import type { MetadataRoute } from "next";
import { communityPostPath } from "@/domain/community";
import { listPublishedCommunityPostsForSitemap } from "@/server/community/community-publication";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const launchedAt = new Date("2026-08-24");

  // 낱개 게시글 상세 라우트(/community/[postId])는 이미 서버 컴포넌트로
  // 완성돼 있어(제목=h1, JSON-LD 포함) 크롤러가 주소만 알면 색인하기 좋은
  // 상태입니다. 문제는 그 주소를 알려줄 방법이었습니다 — 목록 화면
  // (community-lounge.tsx)이 클라이언트 컴포넌트라 서버가 내려주는 최초
  // HTML에는 글 링크가 하나도 없고, 전부 마운트 후 JS로 불러옵니다.
  // 자바스크립트를 잘 못 읽는 크롤러(네이버 등)는 "더 보기"를 눌러볼 수
  // 없으니, 목록의 페이지네이션 방식과 무관하게 사이트맵으로 직접 알려줘야
  // 합니다. 이 조회 함수(`listPublishedCommunityPostsForSitemap`)는 이미
  // 만들어져 있었는데 여기서 부르는 곳이 없어 실제로는 쓰인 적이
  // 없었습니다.
  const communityPosts = await listPublishedCommunityPostsForSitemap().catch(() => []);

  return [
    { url: siteUrl, lastModified: launchedAt, changeFrequency: "weekly", priority: 1 },
    // 한때 이 주소가 사이트맵에 두 번 실려 있었습니다. 커리어 페이지를 더하면서
    // 이미 있던 줄을 못 보고 하나 더 적은 것입니다. 같은 주소가 두 번 있으면
    // 크롤러가 그 사이트맵을 덜 믿습니다.
    { url: `${siteUrl}/community`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    ...communityPosts.map((post) => ({
      url: `${siteUrl}${communityPostPath(post.id)}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
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

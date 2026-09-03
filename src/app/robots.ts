import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * 크롤러에게 열지 않는 곳.
 *
 * 한 곳에 적어 두는 이유는 규칙이 둘로 늘었기 때문입니다. 로봇 묶음마다
 * 따로 적으면 언젠가 한쪽만 고쳐집니다.
 */
const DISALLOWED = ["/redeem/", "/meensoo/", "/comingsoon"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    // Open, with three exceptions that exist for the crawler's sake as much as
    // ours: /redeem carries a claim token in the path (indexing it publishes
    // the one secret that lets anyone take the credit), /meensoo is the
    // operator console, and /comingsoon is the pre-launch page that would
    // otherwise compete with the real front door for the brand name.
    // 네이버 검색로봇의 이름은 `Yeti`입니다. `*`가 이미 그를 포함하지만,
    // 네이버 웹마스터도구 가이드는 명시적인 Yeti 규칙을 권합니다.
    //
    // **막는 주소를 그대로 옮겨 적는 것이 핵심입니다.** robots.txt는 가장
    // 구체적인 User-agent 묶음 하나만 읽습니다 — Yeti 묶음을 만들면서 이
    // 목록을 빠뜨리면, Yeti는 `*`의 disallow를 아예 보지 않고 `/redeem/`을
    // 수집합니다. 그 주소에는 이용권을 가져갈 수 있는 토큰이 들어 있습니다.
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
      { userAgent: "Yeti", allow: "/", disallow: DISALLOWED },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

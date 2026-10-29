import type { CommunityTopicId } from "./community";

/** Only established public pages; no generated URLs or promised outcomes. */
export function communityGuidance(topic: CommunityTopicId): { href: string; label: string }[] {
  switch (topic) {
    case "application": return [
      { href: "/guide", label: "자소서 첨삭 이용 순서와 준비할 자료" },
      { href: "/examples", label: "자소서 첨삭 예시 살펴보기" },
    ];
    case "career": return [{ href: "/career", label: "진로·직무 탐색을 위한 커리어 검사 살펴보기" }];
    // General job/life discussions need not turn into an unrelated sales pitch.
    default: return [];
  }
}

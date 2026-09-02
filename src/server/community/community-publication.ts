import "server-only";

/**
 * 사이트맵에 실릴 게시글 목록.
 *
 * ------------------------------------------------------------------
 * 지금은 빈 목록입니다 — 그리고 그게 맞습니다
 * ------------------------------------------------------------------
 * `src/app/sitemap.ts`가 이 이름을 가져오는데, 개별 게시글 페이지가
 * 저장소 어디에도 없습니다. `/community`는 목록 한 화면뿐이고
 * (`src/app/community/page.tsx`), 그 화면(`community-lounge.tsx`)도
 * 추천·댓글·신고를 전부 그 자리에서 끝내지 낱개 URL로 이동하지
 * 않습니다.
 *
 * 그래서 여기서 실제 게시글을 채워 넣으면 사이트맵에 **가리킬 페이지가
 * 없는 주소**만 잔뜩 올라갑니다. 크롤러가 그 주소로 들어와도 낱개 글이
 * 아니라 목록 화면을 보게 되고, 그건 없느니만 못합니다. `/community`
 * 자체는 이미 정적 목록에 매일 갱신으로 올라가 있으므로 라운지가
 * 색인에서 빠지는 것도 아닙니다.
 *
 * 개별 게시글 페이지가 생기면 그때 이 함수를 채우면 됩니다 —
 * `domain/community.ts`의 `communityPostPath`도 함께 고쳐야 합니다.
 */
export async function listPublishedCommunityPostsForSitemap(): Promise<
  Array<{ id: string; updatedAt: string | null }>
> {
  return [];
}

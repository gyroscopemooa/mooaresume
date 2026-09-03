# 커뮤니티 인수인계 (모바일 이어서 개발용)

작성: 2026-09-04 · Claude
목적: 집 밖에서 GitHub 앱 GUI 채팅으로 이어서 개발할 때, 이 문서만 읽어도 무엇을 해야 하는지 알 수 있게.

---

## 0. 붙여넣을 명령문

새 세션에서 이것만 붙여넣으면 됩니다.

```
docs/handoff-community-mobile.md 를 읽고 1번(첨부 글쓰기 전멸)부터 순서대로 고쳐줘.
코덱스가 만든 커뮤니티 구현은 지우거나 갈아엎지 말고, 있는 것 위에서 고쳐.
docs/agent-change-log.md 에 변경 기록을 남기고, 하나 고칠 때마다 커밋해줘.
```

---

## 1. 🔴 첨부 있는 글이 지금 100% 실패합니다 (최우선)

`src/app/api/community/posts/route.ts:41`

```ts
await supabase.rpc("take_community_attachment_post_limit")
```

**이 함수가 DB에 없습니다.** 마이그레이션 어디에도 없고 이 파일에만 있습니다.
rpc가 에러 → `allowed !== true` → 첫 시도부터 429 `"첨부가 있는 글은 하루 한 번만 올릴 수 있어요."`

### 고치는 법 — 새 함수 만들지 마세요

이미 `public.take_community_rate_limit(p_action text)` 가 있고, 액션마다 한도를 `case`로 고릅니다.
`supabase/migrations/20260903120000_relax_community_post_rate_limit.sql` 을 그대로 복사해 새 마이그레이션을 만들고 **한 줄만** 더합니다.

```sql
when 'ATTACHMENT_POST' then v_limit := 1; v_window_seconds := 86400;
```

그리고
- `src/server/community/community-rate-limit.ts` 의 `CommunityAction` 에 `"ATTACHMENT_POST"` 추가
- 라우트 호출을 `takeCommunityRateLimit(supabase, "ATTACHMENT_POST")` 로 교체

> 참고: 이 창은 **UTC 고정 버킷**이라 "하루 한 번"이 한국시간 **오전 9시**에 초기화됩니다. 기존 신고 제한(86400)도 같습니다. 자정 기준으로 바꾸려면 `v_window_started_at` 계산에 `+ interval '9 hours'` 를 반영해야 합니다.

---

## 2. 🔴 입력창과 서버 규칙이 달라서, 다 쓰고 나서 실패합니다

| | 화면이 허용 | 서버가 거부 |
|---|---|---|
| 제목 | `maxLength={110}` | **80자** |
| 파일 개수 | `.slice(0, 3)` | **이미지 2장 / PDF 1개** |
| 안내 문구 | "최대 3개 · 각 8MB" | 이미지 3MB · PDF 24MB · 전체 24MB |

`src/components/community-lounge.tsx:125` 의 작성 모달을 서버 규칙에 맞추세요.

### 더 나쁜 건 순서입니다

`submit()` 이 **파일을 먼저 업로드하고** 그 다음 글을 저장합니다. 글 저장이 실패하면 파일만 스토리지에 남고 아무도 지우지 않습니다.
1번 버그 때문에 지금은 **첨부한 사람 전원이 고아 파일을 남깁니다.**

고치는 방향 둘 중 하나:
- (쉬움) 업로드 전에 제목·개수·용량을 화면에서 먼저 막기 — 대부분의 실패가 사라집니다
- (확실함) 글 저장이 실패하면 방금 올린 `storagePath` 들을 지우는 정리 호출 추가

---

## 3. 🟠 목록이 40 → 20개로 줄었는데 "더 보기"가 없습니다

API(`posts/route.ts`)는 `hasMore`, `nextOffset` 을 이미 내려줍니다. **클라이언트가 안 씁니다.**
지금 배포하면 글이 절반만 보이고 나머지를 볼 방법이 없습니다.

`community-lounge.tsx:32` 의 fetch에 `offset` 을 실어 보내고, `hasMore` 일 때 "더 보기" 버튼을 답니다.

> 페이지 계산은 **맞습니다.** `range(offset, offset+20)` 이 21개를 가져오는 것은 21번째가 있는지 보려는 것이고, `slice(0,20)` + `hasMore` 도 정확합니다. **고치지 마세요.**

---

## 4. 🟠 인기글이 "전체 인기"가 아니라 "이번 페이지 인기"입니다

`community-lounge.tsx:46`

```ts
const hotPosts = [...posts].sort(...).slice(0, 3)
```

`posts` 는 지금 로드된 20개뿐입니다. 글이 500개여도 최신 20개 중에서만 뽑습니다.

요구사항이 "이번주 많이 읽은 글 10개 / 인기글 20개" 이므로, **서버가 따로 뽑아 주어야** 합니다.
`GET /api/community/posts?sort=popular&window=7d&limit=10` 같은 별도 질의를 만들고 사이드바는 그걸 씁니다.

---

## 5. 🟡 비로그인으로 첨부를 누르면 안내가 없습니다

`attachments/[attachmentId]/route.ts` 가 `/community?attachment=login-required` 로 보냅니다.
**그 파라미터를 읽는 코드가 어디에도 없습니다.** 새 탭에 라운지만 뜨고 이유를 안 알려줍니다.

`src/app/community/page.tsx` 에서 검색 파라미터를 읽어 "첨부파일은 로그인 후 열 수 있어요" 안내와 로그인 링크를 띄우세요.

---

## 6. 🟡 파일 크기를 클라이언트가 신고합니다

`communityAttachmentSchema.byteSize` 는 브라우저가 보내는 값입니다. 거짓말하면 "전체 24MB" 검사를 통과합니다.
업로드 라우트가 실제 크기를 막으므로 최대 30MB(이미지 2×3 + PDF 24)까지만 뚫립니다. 큰 구멍은 아니지만, 저장된 첨부의 실제 크기로 검사하는 편이 맞습니다.

---

## 7. 🟢 주제 목록이 두 군데입니다

`posts/route.ts` 에 `communityTopics` 배열을 새로 적어 두었는데 `src/domain/community.ts` 에도 있습니다.
나중에 주제를 늘리면 한쪽만 고쳐집니다. 도메인 것을 import 해서 쓰세요.

---

# 매일 자동 글 (글 3 · 댓글 3)

## 먼저 읽어야 할 것

이 기능은 **검색 유입을 늘리려다 사이트 전체를 깎아먹을 수 있습니다.**
구글은 "scaled content abuse"(순위를 노리고 대량 생산한 콘텐츠)를 명시적으로 제재합니다. 하루 3+3이면 한 달에 180개이고, 그것이 **익명 사용자 글로 보이면** 사람에게는 속임이고 검색엔진에는 스팸 신호입니다.

그래서 아래 설계는 두 가지를 지킵니다.

1. **운영팀 글이라고 밝힙니다.** 익명 사용자로 위장하지 않습니다. 화면에 `운영팀` 배지를 답니다.
2. **한 편이 실제로 답이 되게 씁니다.** 질문만 늘리는 글은 검색에도, 사람에게도 쓸모가 없습니다.

밝히고 쓰면 이건 스팸이 아니라 **편집 콘텐츠**입니다. 실제로 검색 유입을 만드는 것도 그쪽입니다.

## 설계

- 라우트: `POST /api/community/seed`
- 인증: `Authorization: Bearer ${COMMUNITY_SEED_CRON_SECRET}` — 비어 있으면 **항상 거부**(`/api/analysis-runs/advance` 와 같은 규칙)
- 예약: Cloudflare Cron, 하루 1회
- 글 주인: `COMMUNITY_SEED_USER_ID`
- 스위치: `COMMUNITY_SEED_ENABLED=1` 일 때만 실제로 씁니다
- 모델: `COMMUNITY_SEED_MODEL`, 비우면 `OPENAI_MODEL`

### 반드시 지킬 것

- **하루 한 번만.** 크론이 두 번 불려도 그날 이미 쓴 글이 있으면 아무것도 하지 않습니다(같은 날 `is_editorial` 글 개수를 먼저 셉니다). 크론은 재시도합니다.
- **`is_editorial` 컬럼을 새로 추가**하고 화면에서 배지를 답니다. 이 표시가 없으면 만들지 마세요.
- **댓글 3개는 기존 사용자 글이 아니라 그날 쓴 운영팀 글에만** 답니다. 남의 글에 AI가 답을 다는 것은 다른 이야기입니다.
- 실패해도 던지지 않습니다. 자동 글이 안 써졌다고 커뮤니티가 멈추면 안 됩니다.

### 글 주제 (검색 유입이 실제로 있는 것)

자소서·취업 롱테일 질문. 예: `생산직 자기소개서 지원동기`, `경력기술서 쓰는 법`, `면접 1분 자기소개`, `공백기 설명하는 법`, `직무 전환 자소서`.
한 편에 **질문 + 실제로 쓸 수 있는 답 + 예시 문장** 이 들어가야 합니다. 그래야 색인되고, 그래야 읽힙니다.

---

# 환경변수 (집 밖에서는 못 만지니 나가기 전에)

`.env.example` 에 넣어 두었고 `.env.local` 에도 자리를 만들어 두었습니다.
**Cloudflare 대시보드에도 같은 이름으로 넣어야 배포본이 씁니다.**

| 이름 | 값 |
|---|---|
| `COMMUNITY_SEED_CRON_SECRET` | `Hgke-PVzZe2_1_FJUUFvUIhGj4YJ9jXfzfwQHH1IAhw` (생성해 둠) |
| `COMMUNITY_SEED_USER_ID` | 운영팀 글의 주인이 될 Supabase 계정 uuid |
| `COMMUNITY_SEED_ENABLED` | 켤 준비가 되면 `1`. **지금은 비워 두세요** — 기능이 아직 없습니다 |
| `COMMUNITY_SEED_MODEL` | 비워도 됩니다(`OPENAI_MODEL` 사용) |

`COMMUNITY_SEED_USER_ID` 는 계정을 하나 만들어 그 uuid를 쓰는 것이 깔끔합니다.
당장은 본인 계정(`350bf922-72cb-43fd-a8b3-ebf80854bf55`)을 넣어도 동작합니다 — 화면 배지가 `운영팀` 이면 표시상 문제는 없습니다.

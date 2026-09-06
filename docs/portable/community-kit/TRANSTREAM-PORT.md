# 트랜스트림(TransTream) 전용 이식 메모

트랜스트림 = 해외 스트리머 라이브 · 실시간 방송 자막 · 해외 뉴스/영상/유튜브 번역 서비스.
아래는 커뮤니티 킷을 트랜스트림 성격으로 바꿀 때 **정확히 어디를 어떻게 고치는지**입니다.
(값은 제안입니다. 이름만 바꿔도 되지만, **같은 값이 두 곳에 있다**는 점만은 꼭 지키세요.)

---

## 1) 주제(토픽) 갈아끼우기 — 두 곳을 반드시 같이

**A. `src/domain/community.ts`**

```ts
export const communityTopics = ["streamers", "vtuber-cam", "subtitles", "clips-news"] as const;
export const communityTopicMeta: Record<CommunityTopicId, { label: string; description: string }> = {
  streamers:    { label: "스트리머",     description: "해외 스트리머 방송·근황·하이라이트" },
  "vtuber-cam": { label: "버튜버·여캠",  description: "버튜버와 여성 스트리머 방송 이야기" },
  subtitles:    { label: "자막·번역",    description: "실시간 자막, 번역 품질, 설정 팁" },
  "clips-news": { label: "클립·해외소식", description: "짧은 영상과 해외 커뮤니티 소식" },
};
```

**B. `supabase/migrations/20260901050000_community_lounge.sql`** 안의 두 줄
`check (topic in ('job-search','career','application','work-life'))` →
`check (topic in ('streamers','vtuber-cam','subtitles','clips-news'))`
그리고 `community-seed-content.ts`의 JSON 스키마는 `communityTopics`를 그대로 참조하므로 자동으로 따라옵니다.

> **이미 배포한 뒤에 주제를 바꾸려면** 새 마이그레이션에서
> `alter table public.community_posts drop constraint community_posts_topic_check, add constraint ... check (...)` 로 바꿔야 합니다. 처음이라면 그냥 원본 파일을 고치는 게 깔끔합니다.

## 2) 글자 수 — 다국어라 제목 제한을 늘리세요

`src/domain/community.ts`의 `createCommunityPostSchema`는 제목을 **50자**로 막습니다.
한국어엔 맞지만 스페인어·영어·베트남어는 같은 뜻이 2배 길어집니다.

```ts
title: z.string().trim().min(2, "...").max(80, "제목은 80자 이내로 적어주세요."),
```

DB는 이미 110까지 허용하므로 **SQL은 안 고쳐도 됩니다**(80 ≤ 110).

## 3) 익명 별칭을 영어로

`20260901050000_community_lounge.sql`의 `set_community_alias()`:

```sql
new.anonymous_alias := 'Guest ' || upper(substr(md5(new.owner_user_id::text), 1, 4));
```

## 4) AI 자동 글: 질문형 → 정보글 + 다국어

고칠 파일은 `src/server/community/community-seed-content.ts` 하나입니다.

**주제풀 교체** (`TOPIC_POOL`):

```ts
const TOPIC_POOL = [
  "IShowSpeed 방송 하이라이트 정리하는 법",
  "Kai Cenat 라이브 한국 시간으로 보는 법",
  "트위치 스트리머 다시보기 자막 켜는 법",
  "버튜버 방송 실시간 번역 지연 줄이기",
  "스페인어 스트리머 방송 자막 정확도 높이기",
  "베트남 게임 스트리밍 인기 채널 흐름",
  "유튜브 라이브 자동 번역과 수동 자막의 차이",
  "해외 클립 사이트에서 원본 찾는 법",
];
```

**언어 로테이션 추가** — `generateCommunitySeedContent`에 언어를 넘겨 돌아가며 씁니다.
하루 3번 호출되므로, 예를 들어 호출 시각/글 개수로 언어를 고르면 자연스럽게 섞입니다.

```ts
export const SEED_LANGUAGES = ["ko", "en", "es", "vi", "ja"] as const;
const LANGUAGE_LABEL: Record<(typeof SEED_LANGUAGES)[number], string> = {
  ko: "한국어", en: "영어", es: "스페인어", vi: "베트남어", ja: "일본어",
};
// buildInstructions(recentTitles, language) 안에 한 줄 추가:
`글 전체(title, body, comment)를 ${LANGUAGE_LABEL[language]}로만 쓰세요. 언어를 섞지 마세요.`
```

`seed/route.ts`에서는 그날 몇 번째 글인지로 언어를 고르면 됩니다:
```ts
const language = SEED_LANGUAGES[((count ?? 0) + new Date().getUTCDate()) % SEED_LANGUAGES.length];
```

**말투를 "질문"에서 "정보글"로** — `buildInstructions`의 첫 두 줄을 바꿉니다:

```ts
"당신은 TransTream 커뮤니티 운영팀입니다. 해외 스트리머·라이브 방송·자막 번역을 즐기는 시청자에게 바로 도움이 되는 정보 글을 씁니다.",
"질문을 던지는 글이 아니라 정보 글입니다. '무슨 일이 있었는지 / 왜 그런지 / 시청자가 지금 할 수 있는 것' 순서로 쓰세요.",
```

### ⚠️ 실존 인물 안전장치 (이건 빼지 마세요)

무아레주메는 회사 얘기라 위험이 낮았지만, 트랜스트림은 **실존 스트리머**를 다룹니다.
AI가 지어낸 사실이 그대로 올라가면 허위사실·명예훼손이 되고, 여성 스트리머 관련은
성적 대상화 문제까지 생깁니다. 프롬프트에 아래 줄을 꼭 넣으세요:

```ts
"확인되지 않은 사실을 단정하지 마세요. 특정 인물이 무엇을 했다/말했다는 주장은, 널리 공개적으로 알려진 것이 아니면 쓰지 마세요.",
"루머, 사생활, 연애, 건강, 수익 추정, 외모 평가, 성적인 묘사는 쓰지 마세요. 방송 콘텐츠와 시청 방법에 대해서만 쓰세요.",
"인물 중심 대신 '어떻게 보는지 / 자막을 어떻게 맞추는지'처럼 시청자가 따라할 수 있는 정보를 중심에 두세요.",
```

원본 프롬프트에 이미 있는 "실명·개인 신상 금지" 줄은 트랜스트림에선 **스트리머 활동명은 허용**으로 풀어야 하니, 위 세 줄로 대체하는 게 맞습니다.

## 5) 하루 3개 → 1개로 줄이기 (나중에 자동 활성화되면)

두 곳만 고치면 됩니다.

1. `src/app/api/community/seed/route.ts`: `if ((count ?? 0) >= 3)` → `>= 1`
2. 크론 3개 중 2개 끄기 (Supabase SQL 에디터):
   ```sql
   select cron.unschedule('community-seed-midday');
   select cron.unschedule('community-seed-evening');
   ```
   완전히 끄려면 배포 없이 `COMMUNITY_SEED_ENABLED=0`만 바꾸면 됩니다.

## 6) 색상 테마

`community-lounge.module.css`와 `[postId]/page.module.css`가 초록색(`#176b4a`, `#e9f7ee`, `#173a2b`)으로 되어 있습니다.
트랜스트림 브랜드 색으로 전체 치환하세요 — 파일 안에서 이 세 값을 찾아 바꾸면 대부분 끝납니다.

## 7) 트랜스트림에서 안 쓸 것

- `src/domain/community-lounge.ts` — 무아레주메 랜딩 미리보기 데이터. 삭제해도 됩니다.
- `communityPreviewPosts` (`community.ts` 맨 아래) — 로그인 전 미리보기용 더미 글 3개. 트랜스트림 내용으로 바꾸거나 지우세요.

# 커뮤니티 이식 킷 (Community Portable Kit)

MOOA Resume의 커뮤니티(익명 게시판 + AI 자동 글) 기능만 통째로 떼어낸 꾸러미입니다.
다른 웹서비스(트랜스트림 등)에 그대로 붙여 넣고, **주제·말투·언어만 갈아끼우면** 돌아갑니다.

> 이 폴더의 `src/**`, `supabase/**` 파일은 **원본 그대로의 사본**입니다. 손대지 않았습니다.
> 무엇을 어떻게 바꿔야 하는지는 이 문서와 `TRANSTREAM-PORT.md`에 따로 적었습니다.

---

## 0. 쓰는 법 (에이전트에게 시킬 때)

1. 이 폴더(`community-kit`)를 통째로 대상 프로젝트 루트에 복사한다.
2. 대상 프로젝트의 Claude/Codex에게 딱 이 한 줄만 말한다:

   ```
   community-kit/README.md 와 TRANSTREAM-PORT.md 를 읽고, 이 프로젝트에 커뮤니티 기능을 이식해줘.
   ```

이렇게 하면 원본 레포를 통째로 읽힐 필요가 없어서 토큰이 훨씬 적게 듭니다.
(전체 코드 2천 줄 미만 = 대략 3만 토큰. 무아레주메 레포 전체를 탐색시키면 그 몇 배가 듭니다.)

---

## 1. 이 기능이 하는 일

| 기능 | 파일 |
|---|---|
| 라운지(목록·정렬·주제탭·글쓰기·추천·댓글·신고·이미지첨부) | `src/components/community-lounge.tsx` (+ `.module.css`) |
| 글 상세 페이지(SEO용 서버 렌더 + JSON-LD) | `src/app/community/[postId]/` |
| 글/댓글/추천/신고/업로드 API | `src/app/api/community/**` |
| DB 조회·변환 | `src/server/community/community-publication.ts`, `community-repository.ts` |
| 도배 방지(시간당 횟수 제한) | `src/server/community/community-rate-limit.ts` + SQL 함수 |
| **AI 자동 글 (하루 3회, 글1+댓글1씩)** | `src/app/api/community/seed/route.ts` + `src/server/community/community-seed-content.ts` |
| 테이블·권한(RLS)·스토리지·크론 | `supabase/migrations/*.sql` |
| (선택) 신고 처리 관리자 화면 | `optional-admin/` |

## 2. 대상 프로젝트에 필요한 전제

- **Next.js App Router** (`src/app`), TypeScript, 경로 별칭 `@/*` → `src/*`
- **Supabase** — Auth(구글 로그인) + Postgres + Storage
- 패키지: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `lucide-react`
- Supabase 클라이언트 두 개: `@/lib/supabase/client`(브라우저), `@/lib/supabase/server`(서버)
  - 없으면 `lib-reference/supabase-client.ts`, `supabase-server.ts`를 참고해서 만드세요.
- 로그인 콜백 라우트 `/auth/callback?next=...` (없으면 `community-lounge.tsx` 167행의 로그인 방식을 대상 프로젝트 것으로 교체)

## 3. 붙이는 순서

1. **파일 복사**
   - `src/domain/community.ts`, `community.test.ts` → 대상 `src/domain/`
   - `src/components/community-lounge.tsx`, `.module.css` → 대상 `src/components/`
   - `src/app/community/**`, `src/app/api/community/**` → 대상 같은 경로
   - `src/server/community/**` → 대상 같은 경로
   - `src/domain/community-lounge.ts`는 **랜딩용 미리보기 데이터**라 필요 없으면 빼도 됩니다.
2. **의존성 끊기 2곳** (이거 안 하면 빌드 안 됩니다)
   - `community-lounge.tsx` 8행 `import { SiteNav } from "@/components/site-nav";`
     → 대상 프로젝트의 헤더 컴포넌트로 교체하거나, 179행 `<SiteNav/>`와 함께 삭제
   - `src/app/api/community/seed/route.ts` 3행 `@/server/admin/admin-repository`
     → 함께 넣어둔 `src/server/community/community-service-client.ts`로 교체
3. **DB 마이그레이션 실행** (순서대로)
   1. `00000000000000_prereq_set_updated_at.sql` — 이미 같은 함수가 있으면 건너뛰세요
   2. `20260901050000_community_lounge.sql` — 테이블·RLS·스토리지 버킷
   3. `20260903090000_community_rate_limits.sql`
   4. `20260903110000_lock_community_rate_limit_rules.sql`
   5. `20260903120000_relax_community_post_rate_limit.sql`
   6. `20260904030000_community_daily_seed.sql` — AI 자동 글 크론 (pg_cron·pg_net 필요)
   - 파일명 날짜는 대상 프로젝트 규칙에 맞게 바꿔도 됩니다. **순서만 지키면 됩니다.**
4. **환경변수 넣기** (5번 표 참고)
5. **AI 자동 글 계정 만들기** — 운영팀 계정으로 쓸 유저 하나를 가입시키고 그 `auth.users.id`를 `COMMUNITY_SEED_USER_ID`에 넣습니다.
6. **크론 설정** — Supabase SQL 에디터에서 (비밀은 파일에 두지 않습니다):
   ```sql
   insert into private.app_config (key, value) values
     ('community_seed_url', 'https://<도메인>/api/community/seed'),
     ('community_seed_cron_secret', '<COMMUNITY_SEED_CRON_SECRET과 같은 값>')
   on conflict (key) do update set value = excluded.value, updated_at = timezone('utc', now());
   ```
7. **문구·주제 갈아끼우기** → `TRANSTREAM-PORT.md` 참고
8. **사이트맵에 추가**(SEO, 선택) — 대상 `src/app/sitemap.ts`에 `/community`와 글 상세 주소를 넣으세요. 목록 화면이 클라이언트 컴포넌트라 크롤러가 링크를 못 봅니다. 조회 함수는 `community-publication.ts`의 `listPublishedCommunityPostsForSitemap()`이 이미 있습니다.

## 4. 검증 (다 붙인 뒤 확인할 것)

- [ ] `/community` 열림 → 글 목록·주제탭·정렬 동작
- [ ] 로그인 후 글쓰기 → 저장되고 목록에 뜸 (익명 별칭이 자동으로 붙음)
- [ ] 댓글·추천·신고·이미지 첨부 각각 1회
- [ ] `/community/<글id>` 서버 렌더 확인 (JS 끄고도 제목·본문 보이면 성공)
- [ ] AI 자동 글 수동 호출:
  ```bash
  curl -X POST https://<도메인>/api/community/seed -H "Authorization: Bearer <CRON_SECRET>"
  ```
  `{"ok":true,...}`면 성공, `{"skipped":"..."}`면 그 이유(설정 누락)를 보고 채우세요.
- [ ] `select * from cron.job where jobname like 'community-seed-%';` 3줄 나오는지

## 5. 환경변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 대상 프로젝트에 이미 있을 것 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | 브라우저용 공개 키 |
| `SUPABASE_SECRET_KEY` | ✅ | service_role 키. **서버 전용, NEXT_PUBLIC 금지** |
| `COMMUNITY_ADMIN_EMAILS` | ✅ | 남의 글/댓글을 지울 수 있는 이메일(쉼표 구분). 비면 아무도 못 지웁니다 |
| `COMMUNITY_SEED_CRON_SECRET` | 자동글 쓰면 | 크론만 이 라우트를 부를 수 있게 하는 비밀번호 |
| `COMMUNITY_SEED_ENABLED` | 자동글 쓰면 | `1`이어야 켜집니다. 이상한 글 나오면 이것만 꺼서 배포 없이 중단 |
| `COMMUNITY_SEED_USER_ID` | 자동글 쓰면 | 운영팀 계정의 `auth.users.id` |
| `OPENAI_API_KEY` | 자동글 쓰면 | |
| `COMMUNITY_SEED_MODEL` | 선택 | 없으면 `OPENAI_MODEL` 사용 |

## 6. 프로젝트마다 반드시 갈아끼워야 하는 곳 (하드코딩 지점)

| 무엇 | 어디 |
|---|---|
| 주제(토픽) 4종 id/이름/설명 | `src/domain/community.ts` `communityTopics`, `communityTopicMeta` **+ SQL의 `check (topic in (...))`** ← 두 곳이 반드시 같아야 함 |
| 관리자 이메일(화면 표시용) | `src/domain/community.ts` `COMMUNITY_ADMIN_DISPLAY_EMAIL` |
| 제목/본문 글자 수 제한 | `src/domain/community.ts` 스키마 **+ SQL의 `char_length` check** ← 두 곳 같이 |
| 브랜드 로고·상단바 | `community-lounge.tsx` 178~180행 |
| 히어로 카피("취업 고민을...") | `community-lounge.tsx` 197행 |
| 라운지 약속 문구·링크 | `community-lounge.tsx` 205행 |
| 상세 페이지 헤더/푸터 문구 | `src/app/community/[postId]/page.tsx` 46, 59행 |
| 페이지 메타(제목/설명) | `src/app/community/page.tsx` |
| 색상 테마(초록 `#176b4a` 계열) | `community-lounge.module.css`, `[postId]/page.module.css` |
| 익명 별칭 접두사 `'익명 '` | SQL `set_community_alias()` 함수 (`20260901050000`) |
| AI 자동 글 프롬프트·주제풀 | `src/server/community/community-seed-content.ts` |
| 하루 몇 개 쓸지 | `seed/route.ts`의 `>= 3` + 크론 `cron.schedule` 개수 |
| 첨부 파일 종류·용량 | `community.ts` 스키마 + SQL의 mime/size check + 버킷 설정 |

## 7. 안 가져가는 것 (일부러 뺀 것)

- `src/components/site-nav.tsx` — 무아레주메 전용 네비게이션
- `src/server/admin/admin-repository.ts` — 커뮤니티와 무관한 관리자 기능 덩어리 (필요한 조각만 `community-service-client.ts`로 옮겨 담았습니다)
- `src/app/meensoo/**` 관리자 셸 — 신고 처리 화면만 `optional-admin/`에 참고용으로 뒀습니다. 대상 프로젝트의 관리자 레이아웃에 맞춰 고쳐야 붙습니다.

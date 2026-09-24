# LIVE-SUB HQ 런타임 표시 설정

무아레쥬메 웹은 LIVE-SUB HQ의 공개 Runtime Config를 **브라우저에서만** 읽어 홈 런칭 배너와 공개 페이지 공지 띠의 표시 문구를 바꿉니다. 가격, 상품, Polar 결제, 쿠폰, 이용권과 분석 실행은 이 설정의 영향을 받지 않으며 기존 서버 로직이 계속 기준입니다.

## 웹 설정

| 항목 | 값 |
| --- | --- |
| app key | `mooaresume` |
| platform | `web` |
| app version | `web` |
| 기본 Runtime URL | `https://runtime.live-sub.com` |
| 기본 환경 | `production` |
| 요청 제한 | 3초 |

환경 변수는 다음 두 개이며 공개 Runtime API URL과 환경 이름만 포함합니다.

```env
NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS=https://runtime.live-sub.com
NEXT_PUBLIC_LIVESUB_RUNTIME_ENV=production
```

Cloudflare Worker의 `wrangler.jsonc`에도 동일한 프로덕션 값을 `vars`로 선언했습니다. `NEXT_PUBLIC_*` 변수는 빌드 시 클라이언트 번들에 포함되므로 값은 공개 URL과 환경 이름으로만 제한해야 합니다. API 키·Polar·Supabase 서비스 키는 절대 넣지 않습니다.

## HQ에 발행할 값

- feature flag: `launchPriceBanner` (기본 `true`)
- feature flag: `siteNotice` (기본 `true`)
- 홈 배너 placement: `home_launch_price`
- 공지: `type: "banner"`
- 전체 점검 안내: `maintenance.enabled: true`, `maintenance.scope: "all"`

`enabled`, `startAt`, `endAt`, 한국어 locale (`ko`/`ko-KR`), `audience: "all"`, `priority`를 적용합니다. `free`와 `premium` audience는 로그인 상태를 안전하게 판별하는 흐름이 준비될 때까지 표시하지 않습니다. 우선순위가 높은 항목이 먼저 선택됩니다.

홈 배너는 `eyebrow`, `title`, `description`, `ctaLabel`, `targetUrl`을 표시합니다. `targetUrl`이 `/`로 시작하면 앱 내부 이동으로, `linkType: "external"`의 HTTPS URL은 새 탭으로 엽니다. 그 외 URL은 링크로 만들지 않습니다.

공개 페이지 공지 띠는 배너 공지만 표시합니다. 닫을 수 있는 공지는 브라우저 `localStorage`에 공지 ID를 기록합니다. `showOnce` 공지는 한 번 표시된 뒤 다음 방문부터 숨깁니다. 분석·결제 진행 경로(`/analysis`, `/analyze`, `/quick`, `/pro`, `/final`, `/result`, `/feedback`, `/begin`, `/entry`, `/start`, `/app`)와 관리자 경로에는 띠를 표시하지 않습니다.

## 장애 시 동작

첫 화면은 항상 로컬 기본값으로 즉시 렌더링됩니다. HQ 404, 네트워크 오류, 3초 timeout, 잘못된 JSON 또는 스키마 불일치 시 마지막 정상 설정을 `localStorage` 키 `livesub.runtime.v1.{environment}`에서 사용하고, 캐시도 없으면 기본값을 사용합니다. 개별 배너·공지의 형식이 잘못돼도 해당 항목만 제외합니다.

이 조회는 클라이언트 hydration 뒤에만 실행됩니다. 서버 렌더, Next 빌드, 미들웨어에서는 HQ에 요청하지 않습니다.


## 점검 모드 2단계 (`maintenance`)

HQ Runtime Control 의 `maintenance.scope` 값 하나로 강도를 고릅니다. 별도 플래그는 없고, 서버 API 는 막지 않습니다(화면 진입이 막히면 결제·분석 버튼을 누를 방법이 없으므로).

| scope | 동작 |
| --- | --- |
| `all` | **전체 차단.** 홈이든 메일로 받은 결과표 딥링크든 어떤 경로로 들어와도 자식 대신 전체 화면 점검 안내만 렌더. 하단 메뉴바·공지 띠까지 덮음 |
| 기능 key | **가벼운 차단.** 그 기능의 진입 화면만 점검 안내로 대체(“홈으로 돌아가기” 링크). 홈·커뮤니티·결제·결과 보기는 평소대로 |

- 적용 조건: `enabled` 이고 `startsAt` 이 없거나 지났고 `endsAt` 이 없거나 안 지남. 문구는 `message`, 비어 있으면 기본 문구.
- 기능 key → 화면(`src/lib/live-sub-runtime/maintenance.ts` 의 `maintenanceFeatureRoutes`, 경로는 세그먼트 단위 비교):
  `resume_analysis`(/analysis /analyze /begin /entry /start /new /quick /pro /final), `resume_build`(/resume), `career_assessment`(/career), `career_description`(/career-description), `portfolio`(/portfolio), `legal`(/legal), `community`(/community).
  등록표에 없는 key 는 첫 경로 세그먼트와 같을 때만 막습니다(`my_page` → `/my-page`).
- 결제 진입(`/#plans`, 결제 API)과 `/result` 는 어떤 기능 key 로도 막히지 않습니다. 전체 차단(`all`)에서만 함께 막힙니다.
- HQ 응답 전·실패·잘못된 값에서는 막지 않습니다(항상 페이지가 먼저 뜸). 마지막 정상 응답이 localStorage 에 남아 있으면 HQ 가 죽어도 그 값이 유지됩니다.
- 구현: `MaintenanceGate`(루트 레이아웃이 `children` 을 감쌈), `useRuntimeMaintenanceMode`, `resolveMaintenance`.

### 점검 이미지 (`scope: "all"` 전체 차단 화면만)

`maintenance` 에 선택 필드 3개가 있다. HQ 가 값을 지우면 필드가 생략되지만 `null` 이 와도 점검이 꺼지지 않는다(`startsAt`/`endsAt`/`message` 도 `null` 허용).

| 필드 | 형식 | 의미 |
| --- | --- | --- |
| `imageUrl` | https URL | 기본(PC·가로형) 이미지 |
| `mobileImageUrl` | https URL | 폭 760px 이하 세로형 이미지. 없으면 `imageUrl` |
| `imageBackground` | `#rrggbb` | contain 으로 맞출 때 남는 여백 색, 기본 `#000000` |

- 이미지가 있으면 문구 카드 대신 이미지가 화면 전체(하단 메뉴바까지)를 덮는다. `<picture>` 로 좁은 화면은 `mobileImageUrl ?? imageUrl`, 넓은 화면은 `imageUrl ?? mobileImageUrl`. `object-fit: contain` 이라 절대 잘리지 않는다. `alt` 는 점검 문구, `role="alert"` 유지.
- 이미지가 로드되기 전에는 문구 카드가 보이고(빈 화면 없음), 로드가 끝나면 카드가 사라진다. 로드에 실패하면 원래 문구 카드로 남는다.
- URL 이 https 가 아니거나 형식이 틀렸거나 색이 `#rrggbb` 가 아니면 그 필드만 "없음"으로 취급하고 점검 자체는 유지한다(`http://localhost` 는 개발 빌드에서만 허용).
- 기능(feature) 점검은 이미지를 무시하고 기존 카드를 쓴다. 우회(bypass) 동작은 그대로.

### 우회 (QA)

- 서버 환경변수 `HQ_MAINTENANCE_BYPASS_TOKEN` (16자 이상, `NEXT_PUBLIC_` 금지, 커밋 금지, `wrangler secret put`).
- `https://mooaresume.com/?bypass=<토큰>` 으로 들어오면 브라우저가 `POST /api/maintenance/bypass` 로 토큰을 확인하고, 맞으면 12시간 동안 점검 화면을 건너뜁니다(주소의 토큰은 즉시 지움). `?bypass=off` 로 해제.
- 토큰이 서버에 설정돼 있지 않으면 어떤 값도 통과하지 않습니다. 이 우회는 화면 편의일 뿐 서버 API 권한과 무관합니다.

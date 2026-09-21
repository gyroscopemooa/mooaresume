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

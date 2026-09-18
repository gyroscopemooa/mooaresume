# Google Play 결제 연결 — 실제로 팔리게 만드는 순서

작성: Claude · 2026-09-18 · 관련 코드: `src/server/billing/google-play-*.ts`, `src/lib/google-play/*`, `supabase/migrations/20260911010000_google_play_billing.sql`

## 한 줄 답

**마이그레이션 + 환경변수만으로는 안 됩니다.** 네 덩어리입니다: ①DB 적용 확인 ②Play Console 설정 ③환경변수(서버/클라이언트가 들어가는 자리가 다름) ④배포·업로드·실구매 1건. 코드 쪽은 더 할 일이 없습니다.

지금 상태: 웹 = Polar(그대로), 앱 = Play 결제. 앱에서 Play 결제를 못 쓰면 Polar로 우회하지 않고 멈춥니다(Play 정책). 로컬에 `GOOGLE_PLAY_*`가 하나도 없어 앱 결제는 꺼진 상태입니다.

---

## ① DB — 가장 위험한 항목, 제일 먼저

`20260911010000_google_play_billing.sql`이 원격에 적용돼 있지 않으면 **결제는 되고 이용권 지급만 실패합니다**. `billing_orders.provider`의 체크 제약이 `'GOOGLE_PLAY'`를 거부하고, `grant_google_play_order_entitlement` 함수가 아예 없습니다. 돈은 빠져나가고 분석은 시작되지 않는 상태 — 환불 처리부터 해야 합니다.

```bash
npx supabase login
npm.cmd run db:remote:list
```

`20260911010000`이 remote 열에 있어야 합니다. 없으면:

```bash
npm.cmd run db:remote:plan   # dry-run으로 무엇이 올라가는지 먼저 확인
npm.cmd run db:remote:push
```

주의: 이 계정이 `mooaresume` 프로젝트(ref `oiucnkrknedqyktnwbce`) 권한이 있어야 합니다. 2026-09-11에 다른 계정으로 로그인해 403(`LegacyDbConfigLoginRoleStatusError`)이 났던 적이 있습니다.

## ② Play Console

1. **앱 등록** — 패키지명은 반드시 `com.mooaresume.twa`(이미 그 이름으로 서명된 빌드가 있습니다).
2. **인앱상품(관리형 상품) 생성.** 상품 ID는 환경변수 값과 **글자 단위로** 같아야 합니다. 이름은 자유이고, 아래는 권장 ID입니다.

   | 상품 | 권장 ID | 가격(원) | 비고 |
   |---|---|---:|---|
   | QUICK 기본 | `quick_1` | 5,900 | 필수 |
   | QUICK +1블록 | `quick_extra_1` | 8,800 | 8,000자 초과분 |
   | QUICK +2블록 | `quick_extra_2` | 11,700 | |
   | QUICK +3블록 | `quick_extra_3` | 14,600 | |
   | PRO 기본 | `pro_1` | 12,900 | 필수 |
   | PRO +1블록 | `pro_extra_1` | 16,800 | 30,000자 초과분 |
   | PRO +2블록 | `pro_extra_2` | 20,700 | |
   | PRO +3블록 | `pro_extra_3` | 24,600 | |
   | FINAL 기본 | `final_1` | 19,900 | FINAL 플래그를 열 때만 |
   | FINAL +1블록 | `final_extra_1` | 23,800 | FINAL도 PRO와 같은 30,000자·3,900원 기준 |
   | FINAL +2블록 | `final_extra_2` | 27,700 | |
   | FINAL +3블록 | `final_extra_3` | 31,600 | |
   | 모의면접 재시도 | `interview_retry_1` | 3,000 | 2026-09-18 소비(consume) 수정 완료 |

   **가격은 반드시 위 숫자와 맞춰야 합니다.** Play Developer API의 구매 조회 응답에는 실제 청구액이 없어서, 서버가 원장에 적는 금액은 "이 상품 ID의 카탈로그 가격일 것"이라는 기대값입니다(`google-play-verification.ts`의 `amount` 주석). Console에서 다른 값을 넣으면 매출 원장이 틀어집니다.

   추가블록 가격은 `domain/usage-entitlement.ts`의 기본가 + 블록당 가격(QUICK 2,900 / PRO·FINAL 3,900)으로 계산한 값입니다. 사다리 칸을 안 만들면 그 분량은 앱에서 결제가 **거절**됩니다(웹으로 유도하지 않습니다 — 정책).

3. **Play Developer API 서비스 계정** — Play Console → 설정 → API 액세스에서 만들고, 권한은 "재무 데이터 보기"와 주문 관리(구매 조회·승인)까지. JSON 키를 내려받아 ③에 넣습니다. **저장소에 커밋하지 않습니다.**
4. **내부 테스트 트랙 + 테스터 계정**(본인 Google 계정) 등록. 테스터로 등록된 계정만 인앱상품을 살 수 있습니다. 라이선스 테스터로 넣으면 실제 청구 없이 결제 흐름을 돌려볼 수 있습니다.

## ③ 환경변수 — 서버와 클라이언트가 들어가는 자리가 다릅니다

**서버(Cloudflare 대시보드 → Workers & Pages → mooaresume → Settings → Variables).** `wrangler.jsonc`에 `keep_vars: true`라 배포가 대시보드 값을 지우지 않습니다.

```
GOOGLE_PLAY_PACKAGE_NAME=com.mooaresume.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"..."}   # 한 줄 JSON, 시크릿
GOOGLE_PLAY_QUICK_PRODUCT_ID=quick_1
GOOGLE_PLAY_QUICK_EXTRA_1_PRODUCT_ID=quick_extra_1
GOOGLE_PLAY_QUICK_EXTRA_2_PRODUCT_ID=quick_extra_2
GOOGLE_PLAY_QUICK_EXTRA_3_PRODUCT_ID=quick_extra_3
GOOGLE_PLAY_PRO_PRODUCT_ID=pro_1
GOOGLE_PLAY_PRO_EXTRA_1_PRODUCT_ID=pro_extra_1
GOOGLE_PLAY_PRO_EXTRA_2_PRODUCT_ID=pro_extra_2
GOOGLE_PLAY_PRO_EXTRA_3_PRODUCT_ID=pro_extra_3
GOOGLE_PLAY_FINAL_PRODUCT_ID=final_1                  # FINAL을 열 때만
GOOGLE_PLAY_FINAL_EXTRA_1_PRODUCT_ID=final_extra_1
GOOGLE_PLAY_FINAL_EXTRA_2_PRODUCT_ID=final_extra_2
GOOGLE_PLAY_FINAL_EXTRA_3_PRODUCT_ID=final_extra_3
GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID=interview_retry_1   # 모의면접 재시도를 열 때만
```

QUICK/PRO 기본 ID와 패키지명·서비스계정 JSON 넷 중 하나라도 없으면 검증 라우트가 시작부터 실패합니다(의도된 동작 — 반쯤 설정된 상태로 돈을 받지 않습니다).

**클라이언트(빌드 시점에 번들에 박힙니다).** `NEXT_PUBLIC_`은 대시보드에 넣어도 소용이 없습니다 — 빌드가 도는 자리(`npm run deploy`를 실행하는 이 컴퓨터의 `.env.local`)에 있어야 하고, **값을 바꾸면 반드시 다시 빌드·배포**해야 합니다.

```
NEXT_PUBLIC_GOOGLE_PLAY_QUICK_PRODUCT_ID=quick_1
NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_1_PRODUCT_ID=quick_extra_1
NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_2_PRODUCT_ID=quick_extra_2
NEXT_PUBLIC_GOOGLE_PLAY_QUICK_EXTRA_3_PRODUCT_ID=quick_extra_3
NEXT_PUBLIC_GOOGLE_PLAY_PRO_PRODUCT_ID=pro_1
NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_1_PRODUCT_ID=pro_extra_1
NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_2_PRODUCT_ID=pro_extra_2
NEXT_PUBLIC_GOOGLE_PLAY_PRO_EXTRA_3_PRODUCT_ID=pro_extra_3
NEXT_PUBLIC_GOOGLE_PLAY_FINAL_PRODUCT_ID=final_1
NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_1_PRODUCT_ID=final_extra_1
NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_2_PRODUCT_ID=final_extra_2
NEXT_PUBLIC_GOOGLE_PLAY_FINAL_EXTRA_3_PRODUCT_ID=final_extra_3
NEXT_PUBLIC_GOOGLE_PLAY_INTERVIEW_RETRY_PRODUCT_ID=interview_retry_1
```

서버/클라이언트 ID가 어긋나면 결제창은 열리고 서버 검증이 `GOOGLE_PLAY_PRODUCT_MISMATCH`(409)로 거절합니다. 소비하지 않으므로 그 구매는 다음 실행에서 복구 대상으로 남습니다.

**켜는 스위치는 따로 없습니다.** 상품 ID가 채워지고 앱이 Play에서 설치된 TWA로 실행되면(Digital Goods API 존재) 그 경로를 씁니다. 일반 브라우저는 계속 Polar입니다.

## ④ 배포 → 업로드 → 실구매 1건

1. `/app`을 실서버에 배포: `npm.cmd run deploy`(빌드에 위 `NEXT_PUBLIC_*`이 포함되도록 먼저 `.env.local`을 채운 뒤).
2. TWA 재빌드 — `C:\6.mooaresume-android`:
   ```powershell
   npx @bubblewrap/cli update --skipVersionUpgrade
   # 이후 README의 gradlew/apksigner/jarsigner 수동 서명 절차
   ```
   `startUrl`이 `/app?source=twa`로 이미 바뀌어 있습니다. 배포 전에 빌드하면 앱 첫 화면이 404입니다.
3. `app-release-bundle.aab`를 내부 테스트 트랙에 업로드.
4. 업로드 후 Play Console → 앱 무결성에서 **App Signing 키**의 SHA-256을 확인해 `public/.well-known/assetlinks.json`의 배열에 **추가**(현재의 업로드 키 지문은 지우지 말 것 — 사이드로드 테스트용). 그다음 웹을 다시 배포해야 TWA 신뢰 검증이 통과합니다.
5. 실기기에서: 로그인 → 입력 → QUICK 1건 결제 → 결과까지. 확인할 것:
   - `billing_orders`에 `provider='GOOGLE_PLAY'` 행과 금액이 카탈로그 가격과 같은지
   - `analysis_entitlements`가 생기고 분석이 시작되는지
   - **같은 상품을 두 번 살 수 있는지**(소비가 정상 동작하는지)
   - 결제 후 앱을 강제 종료했다가 다시 열었을 때 "완료되지 않은 결제를 확인했습니다"가 뜨는지
   - 환불 후 그 이용권이 어떻게 되는지 — **환불·취소(voided purchase) 자동 회수는 구현되어 있지 않습니다.** 지금은 수동 확인입니다.

## 몇 개 만들어야 하나

- **최소 2개**: `quick_1`, `pro_1`. 기본 분량(QUICK 8,000자 / PRO 30,000자)까지 팔립니다. 초과 분량은 앱에서 결제가 거절됩니다.
- **권장 9개**: QUICK 4 + PRO 4 + 모의면접 재시도 1.
- **FINAL까지 열면 13개.**
- **"문항 추가"는 상품이 아닙니다.** 문항을 더 넣는 것은 글자 수로 과금되고(한 지원 건 최대 5문항), 포함 분량을 넘으면 위 사다리 상품이 그 역할을 합니다.

## ⚠️ 앱에 남아 있는 Polar 결제 진입점 (업로드 전 반드시 처리)

자소서 첨삭(QUICK/PRO/FINAL)과 모의면접 재시도만 Play 경로가 있습니다. 아래는 **전부 Polar 전용**이고, 앱 안에서 그 버튼을 누르면 외부 결제창이 열립니다 — Play 정책 위반입니다.

| 기능 | 가격(원) | 앱에서 닿는 길 |
|---|---:|---|
| 이력서 AI 제작 | 3,900 | 이력서 탭 → 제작 패널 |
| 경력기술서 | 7,900 | `/career-description` |
| 포트폴리오 설명글 | 7,900 | `/portfolio` |
| AI 심층해설(단일/통합) | 5,900 / 9,900 | 커리어 → AI 해설 |
| 법률 문서 | 99,000 | `/legal` (출시 차단 상태) |

**2026-09-18: (A)로 처리 완료.** 앱(TWA)으로 실행됐을 때만 위 다섯 곳의 결제 버튼이 안내 문구로 바뀝니다(`src/components/app-paid-tool-gate.tsx`). 무료로 쓰는 부분(수동 이력서 작성·PDF 저장, 커리어 검사, 예시 보기)은 그대로입니다. 안내는 웹으로 유도하지 않습니다 — 그 유도가 정확히 정책이 막는 것입니다. 웹 화면은 바뀌지 않습니다.

나중에 이 기능들을 앱에서도 팔려면 (B)가 필요합니다: Play 상품 6개 추가 + 기능별 지급 RPC(`document_builds`·`career_ai_builds` 등)에 맞는 검증 경로 구현. 자소서 쪽만큼의 서버 작업이 또 듭니다.

## 코드 쪽에 남은 것

- **환불/취소 회수(RTDN 또는 voidedpurchases 폴링)** 미구현 — 환불되면 이용권이 자동으로 회수되지 않습니다(수동 확인).
- FINAL은 `NEXT_PUBLIC_ENABLE_FINAL` 플래그가 꺼져 있으면 앱에서도 고를 수 없습니다.
- 앱에서 파는 범위를 넓히려면 위 (B).

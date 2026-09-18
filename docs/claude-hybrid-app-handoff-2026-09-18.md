# Claude 인계 — MOOA Resume 하이브리드 앱

작성: Codex · 2026-09-18 · 작업 폴더 `C:\6.mooaresume`

## 바로 실행할 지시

이 문서를 읽고 멈춘 부분부터 로컬 구현을 이어가세요. 사용자 확정 목표는 **기존 웹의 취업 기능을 재사용하고 입력 화면·이동·하단 메뉴를 앱에 맞게 최적화하는 하이브리드 앱 + Google Play 결제 연결**입니다. 계획 제안만 하고 끝내지 말고 구현·검증까지 진행하세요. 정상 로컬 편집·테스트는 이미 승인됐습니다. 실제 유료 구매/AI 호출, 프로덕션 배포, 스토어 업로드, 파괴적 작업은 별도 승인입니다.

시작 전 `AGENTS.md`, `MOOA_RESUME_PROJECT_SPEC.md`, 현재 체크포인트 `docs/development-checkpoint-2026-09-07.md`의 하이브리드 재개 부분, `docs/agent-change-log.md`의 최근 모바일 항목을 읽으세요. `PROJECT_SPEC.md`라는 파일 대신 실제 마스터 스펙 파일을 사용하세요. `docs/development-checkpoint-2026-08-21.md`에는 아직 해결되지 않은 QUICK 입력 확인·실결제 분석 복구·결과 비교 항목이 있습니다.

## 사용자가 확정한 UX와 기능

- 앱을 켜면 바로 넓은 간편 첨삭 입력창. 별도의 홍보 홈과 첨삭 화면으로 나누지 않습니다.
- 상단 QUICK / PRO / FINAL 선택, 서비스에 맞는 작성 유형 설정. 기존 CREATE / BUILD / POLISH 및 상품 범위를 보존합니다.
- 붙여넣기와 파일 첨부, 여러 자료 추가, 서류 종류 분류 확인/수정, 문항 구분, 공백 제외 글자 수와 문항별 목표 글자 수 설정을 웹처럼 사용할 수 있어야 합니다.
- PDF / DOCX / TXT / MD 등 기존 웹 지원을 재사용합니다. ZIP은 업로드 경로별로 확인하세요. HWP나 OCR 등 웹에서 안 되는 기능까지 지원한다고 약속하지 않습니다.
- 입력 시작 때 지원서 이름을 요구하지 않습니다. 저장 시 자동 이름 또는 선택 입력으로 처리합니다.
- 하단 메뉴바는 유지하되 홈=첨삭. 이력서·커리어·내 계정/기록 등 기존 기능으로 이동합니다. 정확한 탭 수와 명칭은 이 목표 안에서 단순하게 결정하세요.
- 입력 영역·터치 영역·글자 크기를 모바일에 맞게 넓고 읽기 쉽게 만듭니다. 데스크톱 웹 화면을 작게 축소해서 넣는 방식은 목표가 아닙니다.
- 탭 이동과 결과 화면 왕복 시 입력·첨부가 사라지지 않아야 합니다.
- 커뮤니티 제외는 기존 앱 범위입니다. 전문가 마켓/대학 관리자/영상 면접 등 새 플랫폼 기능을 추가하지 않습니다.
- 결제는 사용자가 **“Google Play 결제까지 연결”**을 명시 선택했습니다. 결제 보류가 아닙니다.

## 현재 상태 — 완료된 것과 아직 없는 것

`apps/mobile/`에는 Expo SDK 57 / React Native 0.86 별도 네이티브 첫 시안이 있습니다. 다섯 탭, TXT 가져오기, 일부 분석·결과·수동 이력서·흥미검사·OTP·네이티브 결제 코드가 있습니다. 하지만 웹 기능이 많이 빠져 사용자 의도와 달랐고 **이 시안을 최종 방향으로 채택하지 않았습니다**. 삭제하지 말고 이전 variant로 보존하세요.

`artifacts/mooa-mobile-20260918/mooa-resume-preview.apk`는 이 네이티브 시안의 검토용 APK입니다. 하이브리드 APK가 아닙니다. 디버그 서명이며 백엔드 설정이 들어 있지 않습니다. `http://127.0.0.1:8089/`도 이 시안의 Expo 웹 미리보기입니다. 서버가 종료되어 있을 수 있습니다.

**하이브리드 래퍼·공유 웹 입력 화면·앱 이동·결제 브리지는 아직 미구현입니다.** WebView/TWA/기타 최종 래퍼는 확정하지 않았습니다. iframe 방식 등 대화 중 검토 아이디어를 확정 구조로 취급하지 마세요. 기존 웹 재사용과 모바일 최적화를 만족하는 가장 단순하고 안전한 방식을 선택하고 이유를 기록하세요.

`apps/mobile`에서 `npm install react-native-webview`를 시작했다가 사용자 중단 요청으로 종료했습니다. 당시 package.json과 lockfile 루트에는 해당 의존성이 없었습니다. 재개 시 설치 상태를 확인하세요. 설치 완료로 가정하지 마세요.

## 먼저 읽을 구현 파일

| 영역 | 파일/경로 | 용도 |
|---|---|---|
| 간편 입력 전체 흐름 | `src/components/pro-input-page.tsx` | 기본 SIMPLE, 상세 입력, 작성 유형, 입력 검증/저장 |
| 여러 파일·분류 | `src/components/simple-intake.tsx` | 파일 선택, 분류 결과와 수정, 문항별 길이 UI |
| 입력 매핑 | `src/domain/simple-intake-mapping.ts` | 서류를 분석 입력으로 매핑, 문항/길이 처리 |
| 분류·업로드 제한 | `src/domain/document-classify.ts`, `src/domain/upload-limits.ts` | 기존 분류와 제한 재사용 |
| 문항 입력 | `src/components/resume-intake.tsx`, `question-editor.tsx` | 문항 구분, 글자 수/목표 길이 |
| 로컬 문서 추출 | `src/lib/local-document.ts` | PDF/DOCX/TXT/MD와 ZIP 처리 |
| QUICK | `src/app/quick/page.tsx` | 기존 상품 입력과 결제 준비로 이동 |
| PRO/FINAL 진입 | `src/app/pro/`, `src/app/final/` | 기존 작성 유형별 화면 |
| 저장/결제/분석 시작 | `src/components/application-case-handoff.tsx` | 로그인·지원 건 생성·결제 분기·분석 시작 |
| 웹 Google Play | `src/lib/google-play/purchase.ts` | TWA Digital Goods API 구매, 기존 Polar와 분리 |
| 웹 서버 구매 검증 | `src/server/billing/google-play-verify-route.ts` 및 관련 billing 모듈 | 쿠키 인증, 상품/구매 확인과 이용권 |
| 새 네이티브 결제 | `apps/mobile/src/billing.ts`, `src/app/api/mobile/billing/route.ts` | expo-iap 구매/복구, Bearer 인증 검증 |
| 구매 바인딩 | `src/server/mobile/purchase-binding.ts` | 사용자/분석 건 바인딩 및 KR 스토어 제한 |
| 새 앱/API 설명 | `apps/mobile/README.md`, `src/server/mobile/` | 첫 시안의 한계·환경·인증·테스트 |

기존 웹 쿠키 로그인과 네이티브 Bearer 인증을 혼동하지 마세요. 하이브리드 로그인·구매 연결 방식은 아직 결정되지 않았습니다. 브라우저 메시지나 구매 성공 UI만으로 분석 권한을 부여하지 않습니다.

## 결제 구현 요구

- 앱 구매 → 서버 Google Play 검증 → 이용권 확인 → 기존 분석 실행 흐름으로 연결합니다.
- 기존 웹 Polar/TWA 결제는 보존합니다. 앱에서 Play 실패 시 Polar로 자동 우회하지 않습니다.
- 사용자·분석 건·상품·입력 분량 일치, 취소·대기·중복 이벤트·미완료 구매 복구를 검증하세요. 서버 검증과 권한 확인을 통과하기 전에 거래를 소비하지 않습니다.
- 기존 FINAL 활성화 조건과 상품 카탈로그를 존중합니다. 막힌 기능을 임의로 출시 상태로 바꾸지 않습니다.
- 현재 네이티브 결제는 KR만 허용하고 기존 원장은 KRW 기준입니다. 해외 결제/영문 AI를 무조건 열지 않습니다.
- 스토어 앱/상품/테스트 트랙/테스터, 서버 환경변수, 패키지와 서명 관계가 필요합니다. 새 앱의 임시 패키지는 `com.mooaresume.app`; 기존 TWA 등록과 관계를 확인하세요.
- OpenAI 키, Supabase service-role, Play 서비스 계정은 서버에만 둡니다. 키가 없어도 구현 가능한 로컬 작업은 계속하고 실구매 검증은 미완료로 정확히 기록합니다.

## 작업 보존과 Git

인계 당시 브랜치 `codex/legal-launch-design-20260912`, HEAD `c020b5967e9ec596cf63fcedc4a3bfb63b00e075`. 시작할 때 다시 확인하세요. Windows Git 안전 경고가 나오면 명령별 `git -c safe.directory=C:/6.mooaresume ...`을 사용하고 전역 설정은 바꾸지 마세요.

법률 화면/컴포넌트, 체크포인트와 next-env 변경 등이 이미 dirty 상태입니다. 모바일 앱/API/artifacts도 미커밋입니다. 전체 `git add -A`, 일괄 되돌리기, 광범위 포매팅/병합으로 다른 작업을 덮지 마세요. 기존 앱을 보존한 별도 하이브리드 variant/엔트리로 시작하세요. 겹치는 수정은 정확한 diff를 확인하고 복구 사본/참조와 영향부터 기록하세요. 사용자 선택 없이 이전 variant를 제거하지 마세요.

모바일 첫 시안이 기존 실행 route에 추가한 변경은 `/api/mobile/execute`일 때만 Bearer 인증을 선택하는 분기입니다. 기존 쿠키 경로와 origin 검증은 유지됐습니다. 루트 TS/ESLint/Vitest에는 새 앱/생성물 격리 변경도 있으므로 무관한 수정으로 지우지 마세요.

모든 변경은 `docs/agent-change-log.md`에 에이전트·파일·이유·검증·복구 방법·상태를 기록하세요. 현재 살아 있는 체크포인트는 계속 `docs/development-checkpoint-2026-09-07.md`이며 이 인계 문서가 대체하는 것은 아닙니다.

## 구현 순서와 완료 기준

1. 위 핵심 문서와 Git 상태 확인 → 기존 시안 보존 → 래퍼/공유 UI 연결 방식 결정 및 변경 기록.
2. 앱 실행 즉시 간편 입력, 상단 상품/유형, 하단 이동 구현. 분류·문항·길이·AI/DB 로직을 새로 복사하지 말고 기존 모듈을 재사용.
3. 기존 결과·이력서·커리어·계정 기능 연결. Android 뒤로가기, 로그인 반환, 외부 링크, 파일 선택, 다운로드/공유, 초안 보존 검증.
4. Google Play 연결 및 인증/구매 경계 테스트. 테스트 설정이 없으면 미검증 범위를 명시.
5. 타입 검사/lint/테스트와 모바일 화면 검증 후 새 미리보기/APK 제작. 사용자에게 실제 동작과 미완료를 구분해 보고.

명령: 루트 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`, 필요 시 `npm.cmd run build`; 모바일 프로젝트는 별도 `npm.cmd run typecheck`. Next 코드를 쓰기 전 설치된 `node_modules/next/dist/docs/`의 관련 가이드를 읽으세요.

이전 네이티브 시안은 타입 검사, lint 오류 0/기존 경고 2, 149개 파일/1,172개 테스트, Next build/Expo export/Android 빌드가 통과했습니다. 실제 기기 로그인·실구매·환불·유료 AI·원격 RLS E2E는 미검증입니다. 과거 결과를 새 하이브리드의 검증으로 주장하지 마세요.

## 토큰을 아끼는 읽기 방식

대화 전체 대신 이 문서와 필요한 코드부터 읽으세요. 긴 변경 기록은 최근 모바일 항목을 먼저 읽고, 다른 작업과 겹칠 때 관련 항목을 추가 확인하세요. 비밀 환경파일 전체를 출력하거나 node_modules/generated Android/dist를 광범위 탐색하지 마세요. 발견한 사실과 다음 단계를 체크포인트에 갱신하면 다음 세션도 대화를 재구성할 필요가 없습니다.

# MOOA Resume 개발 공유 문서

최종 업데이트: 2026-08-17

이 문서는 다른 ChatGPT/Codex 세션이 현재 구현 상태와 다음 작업을 바로 이어가기 위한 공유용 문서입니다.

## 현재 구현된 핵심 흐름

### QUICK 결제·분석

- 지원건 비공개 저장(ApplicationCase)과 AnalysisRun 생성
- Polar Sandbox Checkout 생성
- KRW 기본 결제 통화 처리
- 할인 코드 입력 허용
- Polar webhook의 `order.paid` 및 `order.updated(status=paid)` 처리
- 결제 완료 후 entitlement 확인 및 QUICK 분석 실행
- 분석 완료 시 결과 화면 이동
- 분석 실패·결제 확인 지연·이메일 안내 상태 표시
- 동일 checkout에 대한 중복 실행 방지

현재 QUICK은 로컬에서 실제 Sandbox 결제부터 분석 결과까지 테스트하는 단계입니다.

### QUICK AI 검증

- 원문에 없는 숫자·사실 검증
- 수정 이유와 우선순위의 원문 근거 검증
- 목표 글자 수 검증
- DOCX 추출 시 문장 중간 줄바꿈 때문에 정상 근거가 거부되던 문제를 수정함
- 빈 문항은 임의로 생성하지 않도록 프롬프트를 강화함

수정 파일:

- `src/server/ai/quick/validator.ts`
- `src/server/ai/quick/prompt.ts`

검증 완료:

```powershell
npm run typecheck
npm test -- --run src/server/ai/quick
```

### 문항·상품 UX

- QUICK은 작성된 문항을 첨삭하는 상품
- BUILD/POLISH는 QUICK 안에서 진입 목적만 다름
- CREATE는 원문이 거의 없는 사용자를 위한 PRO 흐름
- BUILD 상태에서 빈 문항이 있으면 PRO · 내용 보완을 추천하는 방향으로 정리
- 결제 전 화면에서 빈 문항은 QUICK 첨삭·생성 대상에서 제외된다고 안내
- 1~3번 작성, 4번 공란인 경우 QUICK은 1~3번만 분석
- 4번까지 보완하려면 PRO · 내용 보완에서 자료와 확인 질문을 통해 초안을 만드는 방향
- 근거 없는 경험·성과·수치는 생성하지 않음

수정 파일:

- `src/components/analysis-preparation.tsx`
- `src/components/analysis-preparation.module.css`

## 아직 미완료인 부분

### PRO 결제·분석 연결

PRO 입력 화면(`/pro/create`, `/pro/build`, `/pro/polish`)은 입력 UI와 저장 흐름이 있으나, 현재 ApplicationCase 저장 후 실제 PRO 결제 CTA와 PRO 분석 실행 연결은 아직 완성되지 않았습니다. 그래서 현재는 PRO 화면에서 비공개 저장 완료 후 샘플 보기만 보일 수 있습니다.

QUICK 결제/분석을 먼저 테스트하고, PRO는 별도 Checkout·entitlement·분석 실행 연결 작업이 필요합니다.

### 분석 진행 시간 UX

고정된 5분 카운트다운은 실제 처리 시간이 달라질 때 신뢰를 떨어뜨릴 수 있습니다. 권장 방식:

- `보통 1~3분 정도 걸립니다`
- `경과 시간 00:42`
- `이 화면을 닫아도 분석은 계속됩니다`
- 3~5분을 넘으면 `예상보다 시간이 더 걸리고 있습니다` 안내
- 완료되면 대시보드에서 확인

상단 상태바는 유지하고 하단 진행 패널을 추가했습니다. 예상 2~5분, 단계 안내, 움직이는 진행 바, 경과 시간, 5분 초과 안내를 표시합니다. 실제 백엔드 세부 단계 API가 없으므로 단계 표시는 현재 MVP의 안내용 상태입니다.

### 기타 확인 필요

- 브라우저 확장 프로그램이 삽입한 HTML 때문에 발생하는 hydration 경고
- `favicon.ico` 404
- `pdfjs-dist` 서버 external 경고
- Cloudflare 자동 배포 여부와 최신 커밋 반영 여부
- Polar Sandbox webhook delivery와 실제 DB entitlement 반영 E2E
- AI 결과가 목표 글자 수를 초과하는 경우의 재시도/안내

## 로컬 테스트 명령

```powershell
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후:

1. 로그인
2. 작성된 자기소개서 업로드 또는 입력
3. BUILD/POLISH에서 QUICK 선택
4. 새 Sandbox 결제 생성
5. 결제 완료 후 분석 진행 확인
6. 결과 화면 또는 실패 상세 확인

정적 검증:

```powershell
npm run typecheck
npm test -- --run src/server/ai/quick
npm run lint
```

DOCX 추출 확인:

```powershell
node -e "const mammoth=require('mammoth'); mammoth.extractRawText({path:'C:\\6.mooaresume\\신민규_자기소개서 - 복사.docx'}).then(r=>console.log(r.value))"
```

## 다음 작업 우선순위

1. QUICK Sandbox 결제 → webhook → entitlement → AI 분석 → 결과 화면 E2E 재확인
2. 분석 진행 화면에 예상 소요 범위와 경과 시간 추가
3. PRO BUILD 결제 CTA 및 PRO 분석 실행 연결
4. 빈 문항 보완 결과에서 확인 필요 사항을 명확히 표시
5. 배포 환경에서 동일 E2E 재확인

## 주의사항

- Sandbox와 Production 환경변수를 혼용하지 않기
- 결제 재시도 전 checkout/status를 먼저 확인하기
- 분석 실패 시 같은 결제를 반복 청구하지 않기
- 원문에 없는 경험·성과·수치를 AI가 만들지 않도록 유지하기
- 비밀키·토큰은 문서나 로그에 기록하지 않기
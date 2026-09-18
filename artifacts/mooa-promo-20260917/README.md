# MOOA Resume — 60초 브랜드 필름

제작일: 2026-09-17. 기존 서비스를 참고한 독립 홍보영상. 제품 소스와 운영 설정은 수정하지 않았습니다.

- 최종 파일: `mooa-resume-60s-1080p.mp4`
- 포맷: 1920 × 1080, 16:9, 60fps, H.264 / AAC stereo, 60.000초
- 미리보기: `preview.html` (동일 디렉터리를 로컬 HTTP 서버로 열거나 영상 파일 직접 재생)
- 썸네일: `poster.png`
- 사운드: 오리지널 기악 BGM 및 전환 사운드. 내레이션 없음. 화면 카피로 의미 전달.
- 비주얼: 에메랄드/아이보리 브랜드 색상, 한국어 모션 타이포그래피, 순차 UI 애니메이션, 생성형 유리 오브제.

## 구성

| 시간 | 장면 | 메시지 |
|---|---|---|
| 00.0–04.8 | 오프닝 | 막막한 시작을, 나를 보여줄 기회로. |
| 04.8–09.6 | 서비스 소개 | 자소서만 보지 않습니다. 공고와 이력서, 내 경험을 함께. |
| 09.6–19.2 | 처음 시작 | 아무것도 몰라요? 그 시작부터 함께. PRO 작성 흐름에서 소재와 개요 정리. |
| 19.2–28.8 | QUICK | 이미 쓴 글, 더 또렷하게. 핵심 개선점·수정 이유·Before/After. |
| 28.8–38.4 | PRO | 내 경험을, 공고에 맞는 이야기로. 소재부터 지원서 완성까지. |
| 38.4–48.0 | FINAL | 제출 전 검수에서 텍스트 AI 모의면접까지. 답변 평가·꼬리질문·면접 리포트. |
| 48.0–55.2 | 브랜드 약속 | 없는 경험은 만들지 않고. 내 경험이 전해지도록. |
| 55.2–60.0 | 브랜드·CTA | 나의 다음을 준비하는 방법. mooaresume.com |

## 표현과 사실 근거

기능 카피는 `src/components/pricing-comparison.tsx`, `src/app/page.tsx`, `src/components/landing-entry.tsx`, `src/components/guided-create-form.tsx`, `src/components/interactive-interview.tsx`와 최신 `docs/agent-change-log.md`를 대조했습니다.

영상 속 UI는 현재 제품 흐름을 광고용으로 재구성한 예시이며 실제 화면 녹화가 아닙니다. 해당 장면에 예시 화면 표기를 넣었습니다. 실사용자 이력서·개인정보·실제 분석 결과는 사용하지 않았습니다. QUICK 예시의 수정본은 원문에 있는 사실만 재배열합니다. FINAL은 텍스트 면접 흐름이며 음성/영상 면접을 주장하지 않습니다. 가격·인기순위·합격률·사용자 수·합격 보장은 넣지 않았습니다. 초보자 경로는 별도 유료 상품이 아니라 PRO의 작성 흐름으로 표시했습니다.

## 제작 자산·출처

- 로고: 기존 `src/app/icon.svg`의 녹색 M 마크 형태와 기존 영문 브랜드명을 모션 그래픽으로 재현.
- 브랜드 색상: `src/app/globals.css`의 녹색 `#176b4a`, 어두운 녹색, 아이보리 계열을 광고용으로 조정.
- 한글 서체: 이 컴퓨터에 설치된 Pretendard 사용. 폰트 파일을 이 결과물에 재배포하지 않음. 렌더러는 폰트가 없으면 Windows 맑은 고딕으로 대체.
- 오브제: built-in `image_gen__imagegen`으로 새로 생성. `assets/hero-glass.png`와 전체 프롬프트 `assets/hero-glass-prompt.txt` 보존. 생성 원본 1672 × 941을 영상에서 확대 사용. 외부 스톡 이미지 없음.
- 음악: `audio/generate_score.py`에서 합성한 오리지널 음악. 외부 음원 샘플 없음. 음악의 상세 출처와 검증은 `audio/README.md`, `audio/quality-check.json` 참고.
- 유료 외부 API 호출, 배포, 결제·DB 변경 없음.

## 편집·재생성

화면 카피와 장면 시간표는 `source/film.json`, 상세 모션과 UI는 `source/render.mjs`에 있습니다. `film.json`의 장면 카피는 편집 참조용이며 실제 화면 문구 변경 시 렌더러의 해당 문자열도 함께 수정합니다.

저장소에 이미 설치된 `@napi-rs/canvas`와 시스템 FFmpeg를 사용합니다. 새 npm 패키지를 추가하지 않았습니다.

```powershell
# 저장소 루트에서 장면 이미지 생성
node artifacts/mooa-promo-20260917/source/render.mjs --stills

# 60초 마스터 재생성 (필요하면 MOOA_FFMPEG에 다른 ffmpeg 경로 지정)
node artifacts/mooa-promo-20260917/source/render.mjs
```

`qa/contact-sheet.jpg`와 장면별 PNG는 시각 검수용입니다. 최종 컨테이너·프레임·오디오 검증 결과는 `qa/media-validation.json`에 기록합니다.

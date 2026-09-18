# MOOA Resume — 60초 세로 브랜드 필름

제작일: 2026-09-17. 쇼츠·틱톡에 맞춘 **9:16 / 1080 × 1920 / 60fps / 60초** 버전입니다.

기존 가로 영상의 음악·핵심 카피·장면 시간을 유지하고, 제목·카드·예시 UI·브랜드 화면을 세로 화면에 맞게 별도로 재배치했습니다. 중요한 문구는 화면 가장자리에서 여유를 두었습니다. 업로드 후 플랫폼의 버튼·설명 영역과 겹치는지는 최종 게시 미리보기에서 확인할 수 있습니다. 가로 원본 파일은 그대로 보존했습니다.

- 영상: `mooa-resume-60s-vertical-1080x1920.mp4`
- 미리보기: `preview-vertical.html`
- 포스터: `poster-vertical.png`
- 편집 소스: `source/render-vertical.mjs`
- 음악: 기존 `audio/`의 오리지널 기악 BGM·전환 사운드 사용. 내레이션 없음.

## 재생과 편집

같은 폴더를 로컬 HTTP 서버로 열고 `preview-vertical.html`에 접속하거나, MP4를 직접 재생합니다. 기존 미리보기 서버 사용 시 `http://127.0.0.1:4186/preview-vertical.html`에서 확인할 수 있습니다.

저장소 루트에서 실행합니다. 기존 `@napi-rs/canvas`와 FFmpeg를 사용합니다.

```powershell
node artifacts/mooa-promo-20260917/source/render-vertical.mjs --stills
node artifacts/mooa-promo-20260917/source/render-vertical.mjs
```

장면 바로가기: 오프닝 0초 / 아무것도 몰라요 9.6초 / QUICK 19.2초 / PRO 28.8초 / FINAL 38.4초 / MOOA의 약속 48초 / 브랜드 55.2초.

기능 표현의 근거, 생성 이미지·음악의 출처, 편집용 UI 예시에 대한 설명은 기존 `README.md`에 기록되어 있습니다. 이 버전은 로컬 제작물이며 게시·배포는 수행하지 않았습니다.

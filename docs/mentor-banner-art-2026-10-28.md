## 2026-10-28 배너 디자인 보완

사용자가 제공한 밝은 세이지/아이보리 시안을 기준으로 반응형 배너를 수정했다. 사람 일러스트만 이미지이며 제목, 설명, 안내, 두 신청 링크는 HTML이다. PC 3열, 태블릿 설명 아래 버튼, 560px 이하 세로 배치. 원본 시안 전체를 축소하거나 이미지 위에 클릭 영역을 겹치지 않는다.

- 소재: `public/images/mentors/conversation.webp` (1536×1024, 46,684 bytes). 내장 imagegen으로 시안의 일러스트를 분리·재구성하고 기존 sharp로 WebP 인코딩만 수행. 원본 PNG는 `tmp/mentor-conversation-source.png` 및 Codex generated_images에 보존.
- 초기 밝은 배너 복구: `tmp/mentor-banner-before-polish/`의 두 파일. 중간 짙은 배너 복구: `tmp/mentor-banner-dark/`의 두 파일.
- 변경 파일: `src/components/mentor-pool-banner.tsx`, 해당 CSS module, 위 이미지, 이 문서 및 agent-change-log.
- 브라우저 검증: PC와 820px 태블릿, 390/360px 모바일. 360px에서 배너 하위 콘텐츠 넘침 없음, 49px 버튼, 일러스트 로드 확인. 기존 전역 페이지/헤더 설정은 변경하지 않았다.

### 이미지 제작 프롬프트 (built-in image_gen)

```text
Use case: background-extraction. Input image: edit target, a Korean mentor signup banner. Create ONLY the left-side illustration as a standalone reusable web illustration asset. Preserve the same two friendly adults talking across a desk: woman with long dark hair and sage green blouse on left, man in forest green sweater gesturing on right, laptop and books, small white and sage speech bubbles with three dots, leafy plants and pale sage organic shape behind them. Preserve the gentle warm hand-painted editorial style and original character poses/colors. Frame this scene tightly in a landscape 3:2 canvas with no unnecessary blank margins; keep whole heads, bubbles and hands visible. Remove ALL Korean lettering, headings, informational text, CTA buttons, banner border, and all other UI elements completely. Soft warm ivory #f7f8f0 background, edges blending into that ivory, table gently curving across the bottom. No text, no logo, no watermark. This asset sits beside real HTML text and buttons in a responsive card, so do not create a full banner or poster.
```

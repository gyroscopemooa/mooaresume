# LIVE-SUB HQ `eventCampaigns` — MOOA Resume

MOOA는 기존 공개 Runtime Config endpoint만 호출한다. 별도 이벤트 API, DB, 관리자, mock campaign은 없다. `notices` 기반 전역 공지바는 독립적으로 그대로 유지한다.

## API와 최종 계약

`GET {NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS}/api/runtime/v1/apps/mooaresume/config?env={NEXT_PUBLIC_LIVESUB_RUNTIME_ENV}&platform=web&appVersion=web`

최상위 `events`는 더 이상 읽지 않는다. HQ의 `eventCampaigns`만 읽으며, 노출 기준은 오직 `status === "active"`다. 현재 MOOA가 소비하는 HQ 구조는 아래와 같다.

```json
{
  "eventCampaigns": [{
    "id": "sns-review-2026-09",
    "status": "active",
    "placements": ["home_modal", "home_banner"],
    "placementConfigs": {
      "home_modal": { "delayMs": 3000, "showCloseButton": true, "layout": "card", "maxWidth": 440, "triggerEvent": "page_load" },
      "home_banner": { "layout": "banner", "maxWidth": 1180, "triggerEvent": "page_load" }
    },
    "platforms": ["web"],
    "locales": ["ko"],
    "audience": "all",
    "targetRules": {},
    "frequency": { "mode": "daily", "hideDaysAfterClose": 7 },
    "linkType": "external",
    "startAt": "2026-09-22T00:00:00.000Z",
    "endAt": "2026-10-01T14:59:59.000Z",
    "priority": 10,
    "defaultLocale": "ko",
    "defaultContent": { "title": "SNS 후기 이벤트", "body": "서비스 소개나 이용 후기를 공유해보세요.", "buttonText": "이벤트 참여", "secondaryButtonText": "나중에", "badgeText": "SNS 이벤트", "imageUrl": "https://cdn.example.com/event.png", "linkUrl": "https://example.com/event" },
    "localizedContent": { "ko": { "title": "무아레쥬메 SNS 후기 이벤트" } }
  }]
}
```

`defaultContent` 위에 기본 locale override, 한국어 override를 필드별로 병합한다. 생략된 본문·버튼·링크는 기본 콘텐츠를 유지한다. 콘텐츠 키는 title/body/buttonText/secondaryButtonText/badgeText/imageUrl/linkUrl이다. secondaryButtonText는 닫기 보조 버튼으로 사용한다.

placementConfigs는 enabled/showCloseButton/delayMs/scrollTriggerPercent/triggerEvent/maxWidth/layout을 읽는다. enabled=false는 해당 placement를 제외하며, delayMs와 scrollTriggerPercent는 모두 충족해야 표시한다. frequency.hideDaysAfterClose는 닫은 시각부터 지정 일수 동안 재노출을 막는다. 기존 frequency.mode 제한도 함께 적용한다.

## 필드 → MOOA 동작 대조

| HQ 필드 | MOOA 적용 |
| --- | --- |
| `status` | `active`만 노출; draft/paused/ended는 숨김 |
| `placements` | 홈 모달/배너, 결과 상단/하단, 요금제 슬롯 선택 |
| `placementConfigs.delayMs` | 실제 표시 전 지연(ms) |
| `showCloseButton` | 닫기 버튼 표시 여부 |
| `layout` | `card`, `banner`, `compact` UI |
| `maxWidth` | 슬롯/모달 최대 너비(px) |
| `triggerEvent` | HQ enum `page_load`, `result_rendered`, `translation_end`, `paywall_open`만 파싱. MOOA 슬롯은 page_load와 result_rendered만 실제 지원 |
| `platforms` | `web` 포함 캠페인만 표시 |
| `locales` | 한국어(`ko`) 대상 확인 |
| `audience`, `targetRules` | 계약은 보존하되, 결제 여부를 추론해 숨기지 않음 |
| `frequency.mode` | `once`, `daily`, `every_3_days`, `per_session`; 실제 노출 즉시 impression 기록 |
| `linkType` + 콘텐츠 `linkUrl` | 안전한 내부/HTTPS 링크 CTA |
| `startAt`, `endAt`, `priority` | 기간 필터와 슬롯별 최고 우선순위 선택 |
| `defaultLocale`, `defaultContent`, `localizedContent` | 한국어 우선 콘텐츠 fallback |

### 슬롯 매핑

| placement | 실제 슬롯 | triggerEvent |
| --- | --- | --- |
| `home_modal` | 홈 진입 모달 | `page_load` |
| `home_banner` | 홈 hero 아래 | `page_load` |
| `result_top_banner` | 결과 hero 아래 | `result_rendered` |
| `result_bottom_cta` | 최종 첨삭본 하단 | `result_rendered` |
| `pricing_banner` | 가격 카드 아래 | `page_load` |

샘플 결과는 두 result placement를 숨겨 실제 개인 결과 공유로 오해시키지 않는다. `announcement_bar`는 이벤트 카드로 중복 렌더링하지 않고 기존 `notices.type = banner`가 계속 담당한다.

## 실패 안전성·QA

API 404, fetch 실패, schema 오류, 빈 campaign에서는 기존 MOOA UX를 유지하고 이벤트만 숨긴다. 실제 HQ 발행값과 PC/390px 모바일 브라우저 QA는 배포 전 수행해야 한다.

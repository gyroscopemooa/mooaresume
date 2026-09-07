# 집에서 할 일 — 새 서류 기능 켜기

> 기준일: 2026-09-07 · 브랜치 `claude/job-description-input-attach-cx44pf`
> 지금 상태: 코드는 다 됐고 **아무도 못 봅니다**(목록에서 빠짐 + 검색 색인 막힘).

---

## 0. 먼저 알 것 — 지금 팔면 안 됩니다

법률은 **실제로 읽는 양이 40쪽뿐**입니다(프롬프트 상한 6만 자). 300쪽 플랜을 99,000원에 팔면서 40쪽만 읽는 상태라, **5번(대용량 파이프라인)이 끝나기 전에는 법률을 공개하면 안 됩니다.**

취업 쪽(경력기술서·포트폴리오)은 분량이 작아 이 문제가 없습니다. 값만 정하면 열 수 있습니다.

---

## 1. 확인부터 (10분, 아무것도 안 사고)

```bash
git checkout claude/job-description-input-attach-cx44pf
npm install
npm run dev
```

주소를 직접 치세요. 메뉴에는 안 나옵니다.

- `localhost:3000/career-description`
- `localhost:3000/portfolio`
- `localhost:3000/legal`

Supabase 값이 없어도 **화면은 뜹니다**(로그인 안 된 상태로 보임). 실제 저장·생성은 2번부터.

---

## 2. Supabase 마이그레이션 4개 적용

```bash
supabase db push
```

들어가는 것:

| 파일 | 무엇 |
|---|---|
| `20260906213838_career_description_builds.sql` | 경력기술서 결제 건 |
| `20260906220000_portfolio_builds.sql` | 포트폴리오 결제 건 |
| `20260906230000_legal_cases.sql` | 사건·자료·문서·결제 (4개 표 + RLS) |
| `20260907010000_legal_build_cost.sql` | 건당 원가 기록 열 |

적용 후 확인: `legal_cases`에 RLS가 켜져 있고 정책이 4개(select/insert/update/delete) 붙어 있어야 합니다. 사건 자료는 이 서비스에서 가장 민감한 자료라 여기서 한 번 눈으로 보세요.

---

## 3. 값 정하기 — 파일 한 곳

`src/domain/builder-pricing.ts`

| 상품 | 현재 | 할 일 |
|---|---:|---|
| 경력기술서 | 7,900 | **정해야 함** (자리표시값) |
| 포트폴리오 설명글 | 7,900 | **정해야 함** (자리표시값) |
| 법률 서면 작성 | 99,000 | 확정 (지시하신 값) |

**사건자료 분석은 이 파일에 없습니다.** 분량제라 플랜 표가 정합니다 —
`src/domain/case-intake-limits.ts`의 `CASE_PLANS`:

```
300쪽   99,000원   파일 100개 / 해제 후 1GB
700쪽  149,000원   파일 200개 / 2GB
1,500쪽 199,000원  파일 400개 / 4GB
```

> 포트폴리오 99,000원은 권하지 않습니다. QUICK 첨삭이 5,900원인데 포트폴리오 글이 99,000원이면 같은 서비스로 안 보입니다. 취업 쪽은 만원 안팎이 자연스럽습니다.

---

## 4. Polar 상품 3개 만들고 env 채우기

Polar 대시보드에서 상품을 만들고 id를 넣으세요. **값이 비면 그 결제만 이름을 붙여 실패하고 나머지는 그대로 돕니다** — 하나씩 열어도 됩니다.

```
POLAR_CAREER_DESCRIPTION_PRODUCT_ID=
POLAR_PORTFOLIO_PRODUCT_ID=
POLAR_LEGAL_PRODUCT_ID=
```

법률은 지금 문서 10종이 **한 상품**을 같이 씁니다. 종류별로 값을 달리 받으려면 상품을 나눈 뒤 `src/server/document-builds/products.ts`를 고치면 됩니다.

---

## 5. Upstage 키 넣기 (OCR)

```
UPSTAGE_API_KEY=            ← 여기
READING_PROVIDER=           ← 비우면 UPSTAGE. OpenAI로 갈아탈 때만 OPENAI
READING_ALLOW_ENHANCED=     ← 비워 두세요(가장 비싼 단계 닫힘)
READING_PRICE_UPSTAGE_OCR_KRW=
READING_PRICE_UPSTAGE_PARSE_STANDARD_KRW=
READING_PRICE_UPSTAGE_PARSE_ENHANCED_KRW=
READING_PRICE_OPENAI_VISION_KRW=
```

**단가는 직접 확인해서 넣으세요.** 공시가 × 환율 × VAT로 계산한 원 단위입니다. 안 넣으면 원가를 못 세고(차단기는 막지 않음), 관리자 장부에 금액이 안 남습니다.

키를 넣어도 **아직 실제로 OCR을 부르지는 않습니다.** 정책·라우팅·과금가드까지만 돼 있고 HTTP 호출부가 없습니다 — 키를 넣으신 뒤 저한테 말씀하시면 그 위에 붙이겠습니다.

키가 없으면 자동으로 OpenAI 경로로 내려가서 서비스는 안 멈춥니다.

### 단계별 모델 (선택)

비우면 전부 `OPENAI_MODEL_LEGAL_BUILD`로 내려갑니다. 원가를 줄이려면 훑기용에 싼 모델을 붙이세요.

```
OPENAI_MODEL_LEGAL_SCAN=      ← 분류·색인·요약 (전체를 훑는 유일한 단계)
OPENAI_MODEL_LEGAL_REVIEW=    ← 쟁점 추출·재검토
OPENAI_MODEL_LEGAL_FINAL=     ← 서면 작성
OPENAI_PRICE_INPUT_PER_1M_LEGAL_SCAN=   (급마다 단가가 다르면 급별로)
OPENAI_PRICE_OUTPUT_PER_1M_LEGAL_SCAN=
... REVIEW, FINAL 동일
```

---

## 6. 공개 스위치 (확인 끝난 뒤에)

`src/domain/application-document.ts`에서 `status: "preview"` → `"available"`.
세 곳입니다: `career-description`, `portfolio-note`, `legal-case`.

바꾸면 **드로어 목록 노출과 검색 색인이 함께 열립니다.**

사이트맵에 올리려면 `src/app/sitemap.ts`에 세 줄 추가(지금은 "로그인·결제 필요한 화면은 사이트맵에서 뺀다"는 기존 규칙을 따라 빠져 있습니다).

---

## 7. 배포

브랜치를 main에 병합해야 실제 사이트에 올라갑니다. **제가 병합·배포는 안 했습니다** — 말씀 주시면 합니다.

전부 `preview` 상태라 병합해도 사용자는 못 봅니다. 그러니 **먼저 병합해서 실제 사이트에서 주소로 확인하고, 그다음 6번을 켜는** 순서를 권합니다.

---

## 다음에 제가 할 일 (말씀 주시면)

1. **대용량 파이프라인** — 페이지 분해 → 읽기 → 쪽번호 보존 저장 → 색인 → 필요한 쪽만 재검토. **법률 출시 전 마지막 관문.**
2. **Upstage 호출부 + 이미지 업로드** — 키 넣으신 뒤. 지금은 PDF·DOCX·TXT·ZIP만 받고 사진은 아예 못 올립니다.
3. 관리자 화면에 건당 원가 표시 (데이터는 이미 쌓이게 해 뒀습니다)
4. 취업 쪽 이미지 입력 (자격증·성적표 스캔)

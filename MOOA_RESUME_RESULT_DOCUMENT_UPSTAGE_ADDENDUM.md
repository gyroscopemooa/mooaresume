# MOOA Resume — Result Experience & Document Parsing Addendum
## Web Result Dashboard, File Handling, Upstage Routing Strategy

> 작성 기준일: 2026-08-16  
> 용도: 기존 MOOA Resume 기획에 추가되는 **결과물 UX + 첨부파일 처리 + HWP/HWPX/PDF + Upstage 역할 분리** 최신 명세  
> 핵심 결정:
> 1. 결과물의 중심은 다운로드 파일이 아니라 **웹 Result Experience**다.
> 2. 첨부파일은 텍스트로 변환되더라도 **원본 파일 자체를 별도 객체로 유지하고 UI에 계속 표시**한다.
> 3. Upstage는 결과 작성 AI가 아니라 **선택적 Document Parsing/OCR 계층**으로 사용한다.
> 4. 모든 파일을 무조건 Upstage/OCR에 보내지 않는다.
> 5. 원본 양식 그대로 HWP/PDF를 재생성하는 기능은 MVP 핵심 범위에서 제외한다.

---

# 0. 한 줄 결론

MOOA Resume의 핵심 결과물은:

```text
첨부한 원본 문서
+
AI 분석
+
문항별 Before / After
+
수정 이유와 근거
+
편집 가능한 최종본
+
문항별/전체 복사
+
필요한 범용 다운로드
```

를 한 화면에서 제공하는 **웹 기반 지원서 결과 페이지**다.

Upstage는 이 결과를 만드는 서비스가 아니라:

```text
HWP/HWPX
스캔 PDF
이미지
복잡한 레이아웃 문서
```

를 **정확하게 읽어서 MOOA Resume 내부 문서 구조로 변환하는 입력 어댑터**로 사용한다.

---

# 1. 가장 중요한 제품 방향: 결과 파일보다 Result Page

초기에는 다음 목표를 잡지 않는다.

```text
사용자가 현대모비스_지원서.hwp 업로드
↓
AI 수정
↓
원본 표/폰트/페이지/레이아웃이 100% 보존된
현대모비스_지원서_첨삭본.hwp 자동 생성
```

이 기능은 문서 포맷 편집/레이아웃 엔진에 가까워져
AI 첨삭 품질과 무관한 구현 비용이 매우 커질 수 있다.

특히:

- HWP 표
- 병합 셀
- 들여쓰기
- 글꼴
- 글자 크기
- 줄간격
- 문단 스타일
- 페이지 나눔
- 이미지
- 머리말/꼬리말
- 글자수 변화로 인한 페이지 밀림

등을 완벽히 유지하기 어렵다.

따라서 MVP의 핵심 약속은:

> **원본 파일의 내용을 정확히 이해하고, 사용자가 실제 제출본에 반영하기 쉬운 최종 콘텐츠를 제공한다.**

이다.

---

# 2. 입력파일은 없어지면 안 된다

현재처럼 파일을 읽어 textarea에 텍스트를 채우는 UX 자체는 좋다.

이유:

- 제대로 읽혔는지 사용자가 확인 가능
- 잘못 추출된 부분 직접 수정 가능
- 실제 AI에 들어갈 내용을 투명하게 확인 가능

하지만 파일 업로드 후 **첨부파일 존재가 사라지면 안 된다.**

잘못:

```text
resume.hwp 업로드
↓
텍스트 추출
↓
textarea에 내용 표시
↓
resume.hwp는 UI와 데이터 모델에서 사실상 사라짐
```

권장:

```text
① Original File
② Parsed / Normalized Document
③ Editable Extracted Content
```

세 개념을 분리한다.

---

# 3. 첨부파일 UI

업로드 후 입력창 상단 또는 하단에:

```text
📄 현대모비스_자기소개서.hwp

HWP · 184 KB
✓ 내용 추출 완료

[원본] [다시 읽기] [교체] [삭제]
```

형태의 attachment card/chip을 유지한다.

상태 예:

```text
업로드 준비
읽는 중
내용 추출 완료
확인 필요
파싱 실패
지원하지 않는 형식
```

---

# 4. 내부 문서 모델

예:

```text
OriginalFile
- id
- filename
- extension
- mime_type
- size
- storage_path
- checksum

ParsedDocument
- document_type
- parser
- parser_version
- raw_text
- structured_content
- parse_status
- warnings

EditableDocument
- user_edited_text
- questions/sections
- current_version
```

중요:

> `textarea content === original file`

로 취급하지 않는다.

---

# 5. 결과 페이지는 textarea로 만들지 않는다

입력에서는 textarea가 단순하고 적합하다.

하지만 결과에서 긴 수정본 전체를 하나의 textarea로 보여주면:

- 읽기 어려움
- 원문/수정본 비교 어려움
- 어떤 문항인지 구분 어려움
- 피드백과 수정 결과가 분리됨
- 사용자가 다시 드래그해야 함

따라서 **읽기 모드 중심의 Result Document UI**를 만든다.

---

# 6. Result Page 최상단

예:

```text
현대모비스 · 생산관리

📎 분석한 원본
현대모비스_지원서.hwp
✓ 분석 완료

지원서 준비도
82 / 100

가장 먼저 고칠 3가지

01 지원동기의 기업 연결이 약합니다.
02 결과를 뒷받침하는 근거가 부족합니다.
03 2·3번 문항의 경험이 겹칩니다.
```

---

# 7. 문항별 결과가 중심

예:

```text
1번. 지원동기
642 / 700자

[첨삭 전] [첨삭 후] [비교]

────────────────────────

첨삭 후

생산 현장에서 직접 공정을 경험하며 ...
...

[이 문항 복사]
[직접 수정]

────────────────────────

왜 이렇게 수정했나요?

- 기업 선택 이유를 구체화
- 본인의 실제 경험을 직무와 연결
- 추상적인 책임감 표현 삭제
```

다음 문항도 동일 구조.

---

# 8. Desktop / Mobile 비교

## Desktop

가능하면 좌우:

```text
┌──────────── BEFORE ────────────┬──────────── AFTER ─────────────┐
│                                │                               │
│ 기존 문장                       │ 수정 문장                      │
│                                │                               │
└────────────────────────────────┴───────────────────────────────┘
```

## Mobile

세로:

```text
첨삭 전
↓
AI가 발견한 문제
↓
첨삭 후
↓
수정 이유
```

모바일에서 억지로 2열을 유지하지 않는다.

---

# 9. 수정 Highlight

문장 전체를 새로 썼다는 느낌보다
실제 변경점을 확인할 수 있어야 한다.

가능한 표시:

- 추가된 표현 highlight
- 삭제/대체된 핵심 표현
- 문장 클릭 시 수정 이유

예:

```text
기존:
"품질 업무를 하며 책임감을 배웠습니다."

변경:
"시험 과정에서 반복되는 품질 문제를 확인하고
관련 담당자와 원인을 검토했습니다."

수정 이유:
추상적 역량 주장을 실제 행동 중심으로 변경

영향:
- 경험 구체성 ↑
- 직무 연결 ↑
```

---

# 10. 읽기 모드 + 편집 모드

결과는 기본적으로 `읽기 모드`.

```text
[직접 수정]
```

을 누르면 해당 문항만 편집 가능하게 한다.

장점:

- 결과 페이지가 textarea 덩어리처럼 보이지 않음
- 사용자는 수정본을 읽다가 필요한 부분만 편집 가능
- 변경된 최종 버전을 다시 저장 가능

---

# 11. 복사 기능은 매우 중요

파일 다운로드보다 실제 취업 사이트에 붙여넣는 사용자가 많을 수 있으므로:

```text
[문항 복사]
```

는 각 문항에 둔다.

페이지 상단/하단:

```text
[전체 첨삭본 복사]
```

도 제공한다.

복사 시 가능하면:

- 질문 제목 제외 옵션
- 답변만 복사
- 문항 순서 유지

를 고려한다.

---

# 12. 다운로드 전략

초기:

```text
문항별 복사
전체 복사
DOCX 결과 저장
PDF 결과 리포트 저장
```

정도를 권장한다.

## DOCX

범용 편집용.

목적:

> 원본 DOCX를 완벽하게 보존하는 것

보다:

> MOOA Resume에서 확정한 최종 콘텐츠를 Word에서 계속 편집할 수 있게 제공

에 가깝다.

## PDF

`원본 PDF 수정본`이 아니라:

```text
MOOA Resume 첨삭 결과
- 지원정보
- 최종 지원서
- 핵심 피드백
```

형태의 새 결과 문서로 생성하면 된다.

---

# 13. HWP/HWPX 결과 출력

초기 핵심 기능으로 잡지 않는다.

가능한 로드맵:

## V1

```text
HWP/HWPX 입력 O
웹 결과 O
복사 O
DOCX/PDF 결과 O
동일양식 HWP 출력 X
```

## V1.5 / V2

```text
HWPX 출력 실험
```

## 이후

```text
원본 HWP/HWPX 양식 반영 Beta
```

가능하면:

```text
[원본 양식에 반영해보기 BETA]
```

정도로 제공.

안내:

> 문서 레이아웃이 달라질 수 있으니 제출 전 반드시 확인해주세요.

---

# 14. Upstage의 역할

## 결론

**Upstage를 결과 생성 AI로 넣을 필요는 낮다.**

MOOA Resume의 역할 분리:

```text
Upstage
= 문서를 읽는 역할

OpenAI
= 의미 이해 / 분석 / 첨삭 / 작성 / 면접 질문

MOOA Resume UI
= 결과 전달 / 비교 / 편집 / 저장
```

이 구성이 가장 명확하다.

---

# 15. 왜 Upstage를 모든 파일에 사용하지 않는가

모든 업로드를 무조건:

```text
File
↓
Upstage
↓
OpenAI
```

로 보내면:

- 추가 API 비용
- 추가 latency
- 외부 서비스 장애점 증가
- 이미 텍스트가 잘 추출되는 문서까지 불필요한 재처리
- 개인정보를 외부 API 하나에 더 전달

이 생긴다.

따라서 **Selective Routing**을 사용한다.

---

# 16. 추천 Document Ingestion Router

```text
UPLOAD
  │
  ▼
파일 타입 / 문서 특성 확인
  │
  ├── TXT
  │     ↓
  │   Direct
  │
  ├── DOCX
  │     ↓
  │   Native parser / simple extraction
  │
  ├── HWP / HWPX
  │     ↓
  │   Upstage Document Parse
  │
  ├── PDF
  │     ↓
  │   Text extraction quality check
  │       ├ Good → Native/OpenAI path
  │       └ Poor / Scan / Complex → Upstage
  │
  └── JPG / PNG / scanned document
        ↓
      Upstage OCR / Document Parse

                ↓
       Normalized Document
                ↓
            OpenAI
```

---

# 17. Upstage를 적극적으로 쓸 파일

## 1. HWP

강력 추천.

이유:
- 한국 취업/공공/기업 문서에서 실제 사용
- 일반적인 웹 parser 선택지가 제한적
- Upstage Document Parse는 HWP 변환 입력을 지원

## 2. HWPX

추천.

HWPX는 구조적으로 직접 파싱하는 옵션도 장기적으로 가능하지만,
MVP에서는 동일 Document Adapter 인터페이스로 Upstage를 사용할 수 있다.

## 3. 스캔 PDF

추천.

텍스트 레이어가 없거나 추출 품질이 낮은 PDF.

## 4. JPG / PNG

스캔/사진으로 제출된 문서라면 추천.

## 5. 복잡한 표/다단/양식 PDF

일반 텍스트 추출에서 읽기 순서가 깨지는 문서.

---

# 18. Upstage를 기본적으로 안 써도 되는 파일

## TXT

직접 처리.

## 단순 DOCX

네이티브 parser로 텍스트/문단 추출이 안정적이라면 직접 처리.

## 텍스트 레이어가 깨끗한 단순 PDF

먼저 기본 extractor/OpenAI path.

문제가 발견됐을 때 Upstage fallback.

---

# 19. OCR vs Document Parse

Upstage OCR과 Document Parse는 같은 목적이 아니다.

## OCR

주로:

```text
이미지/스캔
↓
문자 인식
```

에 집중.

한글/한자 및 저품질 스캔 인식에 유용.

## Document Parse

주로:

```text
문서
↓
제목
문단
표
읽기 순서
레이아웃
구조
↓
HTML / Markdown 등
```

처럼 LLM이 이해하기 쉬운 구조화 결과를 만드는 역할.

MOOA Resume에는 단순 OCR보다 **Document Parse가 기본적으로 더 어울린다.**

---

# 20. Upstage OCR 사용 조건

무조건 OCR을 사용하지 않는다.

추천:

```text
스캔 이미지
사진
텍스트 레이어 없는 PDF
기본 추출 품질이 매우 낮은 PDF
```

에서 사용.

가능하면 Document Parse의 OCR/auto 기능 또는 별도 OCR fallback을 구성한다.

---

# 21. Parsed Document 품질 체크

Upstage든 직접 parser든 결과를 무조건 신뢰하지 않는다.

파싱 후 검사:

```text
text_length
replacement_character_count
empty_page_ratio
question_heading_detection
broken_line_ratio
table_detection
confidence/warnings
```

등으로 간단한 quality check.

실패 시:

```text
기본 parser
↓ 실패
Upstage fallback

또는

Upstage
↓ 실패
사용자에게 확인 요청
```

---

# 22. 사용자에게 파싱 상태를 투명하게 표시

예:

```text
현대모비스_지원서.hwp
✓ 문서 읽기 완료
```

또는:

```text
현대모비스_지원서.pdf
⚠ 일부 내용을 확인해주세요.

스캔 품질 때문에 일부 문장이 정확히 읽히지 않았을 수 있습니다.

[추출 내용 확인]
```

사용자가 잘못 읽힌 내용을 수정할 수 있게 한다.

---

# 23. HWP 업로드 후 textarea 자동입력

유지하는 것을 추천한다.

플로우:

```text
HWP attachment
↓
Document Parse
↓
Normalized Document
↓
자기소개서 답변 영역 추출
↓
입력창 자동 채움
```

하지만:

```text
첨부파일 카드
+
추출된 편집 텍스트
```

둘 다 보여준다.

---

# 24. 문서 구조를 버리지 않는다

NormalizedDocument 예:

```json
{
  "type": "cover_letter",
  "rawText": "...",
  "sections": [
    {
      "type": "question",
      "title": "1. 지원동기",
      "limit": 700,
      "answer": "..."
    }
  ],
  "tables": [],
  "metadata": {
    "sourceFormat": "hwp",
    "parser": "upstage-document-parse"
  }
}
```

단순 plain text 하나만 저장하지 않는다.

---

# 25. PRO에서 문서 구조가 더 중요하다

PRO는:

```text
채용공고
이력서
경력기술서
자기소개서
포트폴리오
```

를 함께 처리한다.

따라서 Document Parse 결과를:

```text
Candidate Facts
Experience Records
Job Requirements
Cover Letter Questions
```

로 후속 구조화한다.

그러면 CREATE에서:

> 이력서에서 이미 확인 가능한 내용을 다시 묻지 않는다.

가 가능해진다.

---

# 26. Upstage를 AI 첨삭 모델로 쓰지 않는 이유

문서 parsing 품질이 좋아도
첨삭/지원전략 모델까지 같은 공급자로 통일해야 할 이유는 없다.

Provider 역할을 분리한다.

예:

```text
DocumentParserProvider

- NativeTextParser
- DocxParser
- PdfParser
- UpstageParser
```

와:

```text
ResumeAnalysisProvider

- OpenAI
```

를 독립시킨다.

장점:
- 나중에 parser 교체 가능
- AI 모델 교체 가능
- 비용 비교 가능
- 특정 공급자 lock-in 감소

---

# 27. Result Page가 실제 상품의 핵심

사용자가 결제 후 가장 오래 보는 화면은
AI API 응답 자체가 아니라 결과 페이지다.

따라서 우선순위:

```text
AI model 5% 더 좋게 만들기
vs
Result Page를 훨씬 읽고 쓰기 쉽게 만들기
```

라면 초기 제품에서는 Result Page 개선의 체감가치가 매우 클 수 있다.

결과 페이지는 단순 AI 출력창이 아니라:

> **지원서를 실제 제출 가능한 상태로 완성하는 작업 공간**

이 되어야 한다.

---

# 28. Result Page 권장 Tabs / Sections

탭을 너무 많이 만들지는 않는다.

예:

```text
[한눈에 보기]
[지원서 첨삭]
[공고·경험 분석]
[면접 준비]
```

QUICK은:

```text
한눈에 보기
지원서 첨삭
```

중심.

PRO는 전체.

---

# 29. 한눈에 보기

```text
지원서 준비도 82

가장 먼저 수정할 3가지

잘된 점

확인 필요한 내용

[최종 첨삭본 바로 보기]
```

---

# 30. 지원서 첨삭

문항별:

```text
문항 제목
글자수

Before / After

최종본

수정 이유

[복사]
[직접 수정]
```

---

# 31. 공고·경험 분석

PRO:

```text
공고 요구역량
✓ / △ / 확인 필요

사용한 경험
추천 경험

문항 간 경험 중복
자료 간 충돌
누락된 근거
```

---

# 32. 면접 준비

```text
예상질문

왜 이 질문이 나오는지

답변에 넣을 내용

관련 자기소개서 문장
```

---

# 33. 다운로드는 결과 페이지를 보조한다

우선순위:

```text
1. 웹 결과
2. 복사
3. DOCX
4. PDF 결과
5. HWPX/HWP same-format export
```

순을 권장.

---

# 34. 현재 구현 우선순위

## Phase 1 — Attachment UX

- 업로드한 파일 표시
- filename
- extension
- size
- parsing status
- remove/replace
- extracted text editor

## Phase 2 — Result Document UI

- 문항 분리
- 읽기 모드
- Before/After
- 수정 이유
- 문항별 복사
- 전체 복사

## Phase 3 — Parsing Router

- TXT direct
- DOCX direct
- PDF baseline
- HWP/HWPX Upstage
- Scan/complex PDF Upstage fallback

## Phase 4 — Result Dashboard

- top 3 issues
- score summary
- job fit
- risk
- interview preview

## Phase 5 — Export

- DOCX
- PDF report

## Later

- HWPX output
- original-layout round-trip beta

---

# 35. Upstage 도입 여부 최종 판단

추천:

> **도입한다. 단, 전체 AI 스택에 넣지 않고 문서 입력 계층에 제한한다.**

우선 적용:

```text
HWP
HWPX
스캔 PDF
이미지
복잡한 PDF fallback
```

후순위/불필요:

```text
TXT
단순 DOCX
깨끗한 text PDF
```

---

# 36. 비용 최적화 원칙

파일마다 parser_used를 기록한다.

예:

```text
native
openai
upstage_standard
upstage_enhanced
```

그리고:

```text
parse_latency
parse_cost
parse_failure
fallback_used
```

를 측정한다.

실제 데이터로:

- HWP Upstage 유지 여부
- PDF Upstage 기준
- Enhanced mode 사용 기준

을 결정한다.

---

# 37. 개인정보 원칙

이력서/자소서는 개인정보를 포함할 수 있다.

따라서:

- 원본 파일 private storage
- public bucket 금지
- 외부 parser 전송 최소화
- 필요한 파일만 Upstage에 전송
- parsing 결과에 불필요한 개인정보 복제 최소화
- 로그에 원문 전체 기록 금지
- 삭제 요청 시 original + parsed + derivative 연결 삭제 고려

---

# 38. 실패/Fallback UX

예:

```text
문서를 정확히 읽지 못했습니다.

다음 중 하나를 선택해주세요.

[다시 읽기]
[PDF로 변환해서 다시 올리기]
[직접 내용 붙여넣기]
```

가능하면 사용자에게 기술 오류코드만 보여주지 않는다.

---

# 39. Codex CLI 검토 명령문

```text
Read all MOOA Resume product specifications, especially the latest addenda.

Audit the current file-upload, parsing, editor, and result-page implementation.

Do not modify code yet.

Latest product decision:

1. The primary paid deliverable is the web Result Experience, not a perfectly round-tripped HWP/PDF file.
2. Keep the original uploaded file as a first-class private object.
3. Parsed/normalized content and editable extracted text are separate from the original file.
4. Uploaded files must remain visibly attached in the UI after text extraction.
5. The result page should not be one large textarea.
6. Build a document-like result UI with question-level sections, Before/After, revision reasons, copy buttons, and optional edit mode.
7. Same-format HWP/HWPX layout-preserving export is not an MVP requirement.
8. Upstage should be treated as a selective Document Parsing/OCR provider, not as the main resume-writing/result-generation AI.
9. Proposed routing:
   - TXT: direct
   - simple DOCX: native/direct
   - HWP/HWPX: Upstage Document Parse
   - clean text PDF: baseline/native/OpenAI path
   - scanned/complex PDF: Upstage fallback
   - JPG/PNG scans: Upstage OCR/Document Parse
10. Do not OCR every file.
11. Normalize all parser outputs behind a provider-independent NormalizedDocument contract.
12. Keep the analysis/writing model provider independent from the parser provider.
13. Track parser used, parsing failures, latency, and estimated parsing cost.
14. Store uploaded user files privately.

Report:

A. What file types are actually supported by the current code.
B. What the UI claims versus what actually works.
C. Whether uploaded files are currently being discarded after extraction.
D. Current parsing packages/providers.
E. Proposed DocumentParser adapter architecture.
F. Exact schema changes required.
G. Exact Result Page information architecture.
H. Minimal implementation sequence.
I. Risks for HWP/HWPX, PDFs, and scanned documents.
J. Which work should be MVP versus later.

Do not implement until the review is complete.
```

---

# 40. Codex 구현 명령문 — Result UI 우선

```text
Implement the approved Result Experience changes first.

Do not implement HWP round-trip export.

Requirements:

1. Build a typed ResultDocument structure.
2. Render each cover-letter question as a separate result section.
3. Add:
   - question title,
   - current/target character count,
   - Before / After comparison,
   - final revised answer,
   - revision reasons,
   - copy answer,
   - edit answer.
4. Add top-level:
   - original attachment summary,
   - overall readiness summary,
   - top 3 priority issues,
   - copy all revised answers.
5. Desktop Before/After may use two columns.
6. Mobile must stack vertically.
7. Default to reading mode; edit mode should be explicit.
8. Do not use a giant textarea as the primary result presentation.
9. Use typed fixture data before tightly coupling the UI to live AI output.

Run lint, typecheck, and tests.
```

---

# 41. Codex 구현 명령문 — Parsing Router

```text
After the Result Experience is stable, implement the document parsing abstraction.

Requirements:

- Original file must remain private and persisted independently.
- NormalizedDocument must be provider-independent.
- Add adapters for the formats currently practical.
- Design an Upstage adapter for HWP/HWPX and scan/complex-document fallback.
- Do not route every file through Upstage.
- Do not add OCR when a high-quality text extraction path already works.
- Store parser metadata and parse warnings.
- Surface parsing status in the attachment UI.
- If parsing fails, provide a user-friendly fallback.

Do not implement HWP/HWPX same-layout output in this phase.
```

---

# 42. Source of Truth

문서 입력/결과 UX/Upstage 역할 관련 우선순위:

1. 보안 및 개인정보
2. 최신 명시적 사용자 결정
3. `MOOA_RESUME_RESULT_DOCUMENT_UPSTAGE_ADDENDUM.md`
4. 최신 Landing/Guest/Paywall Addendum
5. Product Mode/Pricing Addendum
6. Additional Spec
7. PROJECT_SPEC.md
8. AGENTS.md

이 문서는 **웹 결과 페이지, 첨부파일 유지, HWP/HWPX 입력, Upstage selective routing, 결과 다운로드 방향에 대한 최신 결정**이다.

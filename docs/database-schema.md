# MOOA Resume MVP 데이터베이스 설계

## 현재 필요한 관계

```text
auth.users
  └─ application_cases
       ├─ documents
       │    └─ document_versions (내용 불변)
       ├─ submission_snapshots
       │    └─ submission_snapshot_items
       │         └─ document_versions
       ├─ analysis_runs
       │    └─ analysis_results
       │         (구조화 AI 결과)
       └─ create_workflow_states
```

### application_cases

한 기업·직무·채용공고에 지원하는 전체 프로젝트다. PRO 가격 단위이자 CREATE 진행 상태의 부모다.

### documents / document_versions

`Document`는 이력서, 자기소개서, 공고 등의 논리적 문서다. 실제 내용은 `DocumentVersion`으로 저장하며 기존 버전을 수정하지 않는다. 재분석과 Before/After의 입력을 재현하기 위해 필요하다.

### submission_snapshots / submission_snapshot_items

분석 당시 사용한 정확한 문서 버전 조합이다. 이후 사용자가 문서를 수정해도 과거 결과의 입력이 변하지 않는다.

### analysis_runs / analysis_results

분석 실행 상태와 모델·프롬프트·루브릭·스키마·토큰 메타데이터를 AnalysisRun에 기록한다. 구조화 결과는 AnalysisResult에 분리하며 실행당 하나만 저장한다. 두 테이블 모두 ApplicationCase와 SubmissionSnapshot의 소유권을 RLS로 재검증한다.

### create_workflow_states

PRO CREATE의 현재 단계를 명시적으로 저장한다. 채팅 로그에서 진행 상태를 추론하지 않고, 후보 사실·경험·답변·개요·현재 초안을 구조화된 JSON으로 보존한다.

## 지금 만들지 않는 테이블

- 결제·주문·entitlement: 결제 구현 시 추가
- Experience Bank: 반복 사용 흐름을 구현할 때 추가
- 전문가·리뷰어·정산·메시지: Human Review 검증 이후 추가
- 대학·조직·상담사: B2B 단계에서 추가

## 보안 원칙

- 공개 스키마의 모든 사용자 테이블에 RLS를 적용한다.
- `auth.uid()`가 소유자와 일치해야 하며 자식 생성 시 부모 소유권도 검사한다.
- 문서 버전에는 UPDATE 정책이 없어 내용을 덮어쓸 수 없다.
- 사용자 문서 Storage 버킷은 비공개다.
- 게스트 인계 RPC는 security invoker로 실행하며 authenticated 역할에만 권한을 부여한다.
- ApplicationCase, DocumentVersion, SubmissionSnapshot, AnalysisRun 최초 생성은 하나의 DB 트랜잭션으로 처리한다.
- 저장 경로 첫 폴더는 반드시 현재 사용자 ID다.
- 서비스 역할 키는 브라우저 코드에서 사용하지 않는다.

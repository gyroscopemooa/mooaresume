# 계정 삭제 관리자 처리

## 관리자 화면

`/meensoo/account-deletions`에서 다음 순서로 처리한다.

1. 삭제 요청 메일의 발신 주소를 등록한다.
2. 발신 주소와 가입 주소가 다르면 실제 가입 이메일을 별도로 연결한다.
3. 지원 건·문서·분석·결제·미사용 이용권 수를 확인한다.
4. `계정 삭제` 확인 문구를 입력하고 영구 삭제한다.
5. 삭제 성공 후 짧은 완료 메일이 기존 Resend 설정으로 자동 발송된다.
6. 삭제는 성공했지만 메일만 실패하면 같은 목록에서 완료 메일만 다시 보낸다.

관리자 API는 매 요청마다 관리자 쿠키와 동일 Origin을 다시 검사한다. 메일 주소만
받았다고 자동 삭제하지 않으며, 현재 Auth 계정과 연결된 요청만 삭제할 수 있다.

## 배포 전 필수 순서

1. `20261007010000_admin_account_deletion_requests.sql`을 운영 Supabase에 적용한다.
2. 테스트 계정으로 조회 → 삭제 → Auth/Storage/사용자 표 삭제 → 결제 원장 분리보관 → 완료 메일을 검증한다.
3. 검증 후 웹 코드를 배포한다.

마이그레이션은 계정과 연결된 지원 데이터뿐 아니라 Auth 밖에서 이메일만 보관하던
사전 신청·문의·메일 발송 기록을 제거하고, LIVE-SUB 지급 기록의 연락처는 복구할 수
없는 값으로 바꾼다. 결제·환불 원장은 기존 정책대로 사용자 연결정보 없이 분리 보관한다.

## 수신 메일 자동 등록

메일 제공자 또는 Cloudflare Email Worker가 아래 엔드포인트로 정규화된 메타데이터만
보내면 관리자 큐에 자동 등록된다. 메일 본문과 첨부는 저장하지 않는다.

`POST /api/webhooks/account-deletion-email`

```json
{
  "messageId": "provider-message-id",
  "from": "user@example.com",
  "subject": "[계정 삭제 요청]"
}
```

요청 헤더는 `Authorization: Bearer <ACCOUNT_DELETION_INBOUND_SECRET>`이며, 운영 Worker와
웹 앱 양쪽에 같은 32자 이상 비밀값을 설정한다. 같은 `messageId`는 한 번만 등록된다.
제목에 `계정 삭제 요청`이 없는 일반 문의는 무시한다.

외부 메일 라우팅이 연결되기 전에도 관리자 화면에서 메일 주소를 직접 등록해 처리할 수 있다.

## 자동 처리 정책

Cloudflare Email Routing이 `support@mooaresume.com` 메일을 전용 Worker로 전달한다. Worker는 원본 메일을 기존 검증된 운영자 Gmail로 그대로 전달하고, 제목·envelope 발신주소·수신주소·Message-ID만 인증 웹훅에 보낸다. 본문과 첨부는 앱으로 보내거나 저장하지 않는다.

Cloudflare가 인증한 envelope 발신주소와 가입 이메일이 정확히 일치해 요청이 `READY`가 된 경우에만 즉시 삭제한다. 계정이 없거나 발신주소가 가입 이메일과 다르면 `NEEDS_ACCOUNT_EMAIL` 상태로 관리자 큐에 남긴다. 동일 Message-ID 재전송은 기존 요청을 재사용해 중복 삭제를 막는다.

# 네이버 · 카카오 로그인 연결

상태: 로컬 구현/검증 중. 운영 공급자, 비밀키, 배포는 변경하지 않았다. Google/이메일 로그인은 유지되며 새 공급자는 공개 표시 플래그의 기본값 `false`로 숨겨진다. 이 문서의 설정은 실제 개발자 계정과 Supabase 프로젝트를 확인한 후 적용한다.

## 유지되는 계정과 데이터

- 인증 세션은 기존 Supabase Auth/PKCE를 사용한다. 별도 JWT, 서비스 역할 기반 사용자 생성, 강제 이메일 확인, 이메일 문자열 기반 계정 병합을 구현하지 않는다.
- 기존 사용자는 **처음 네이버/카카오로 로그인하기 전에**, 이전 로그인 방법으로 기존 계정에 들어온 뒤 헤더 `내 계정 → 네이버 계정 연결 / 카카오 계정 연결`을 사용한다. `linkIdentity`는 현재 UUID에 공급자를 추가한다. 구매 내역·문서·RLS 소유권은 이 UUID를 유지한다.
- 이미 다른 UUID로 가입한 네이버 계정은 자동 병합할 수 없다. `identity_already_exists`인 경우 기존 로그인으로 내역에 접근하고 별도 지원 절차로 처리한다. 이 구현은 다른 계정의 자료를 옮기거나 삭제하지 않는다.
- Supabase 자동 연결 정책은 프로젝트 기존 설정을 유지한다. 카카오의 이메일 검증/자동 연결 동작은 운영에서 별도 테스트한다. 이름·닉네임만으로 연결하지 않는다.

## 카카오

1. Kakao Developers의 실제 서비스 앱에서 카카오 로그인을 켜고 REST API 키와 활성화된 Client Secret을 준비한다. 값을 코드/공개 환경변수/문서에 넣지 않는다.
2. Supabase Authentication → Sign In / Providers → Kakao에서 표시하는 Callback URL을 복사해 카카오 앱 Redirect URI에 등록한다. 서비스 `/auth/callback` URL과 Supabase 공급자 callback은 서로 다르다.
3. 키는 Supabase Kakao 공급자 설정에만 입력한다. 필요한 동의항목과 이메일 제공 조건을 확인한다. 앱 상태상 이메일을 받을 수 없다면 Supabase 이메일 없는 사용자 허용을 검토하고 아래 이메일 확인 흐름을 검증한다.
4. 앱 클라이언트는 `provider: "kakao"`를 기존 `signInWithOAuth`에 전달한다.

공식 자료: [Supabase Kakao](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao), [Kakao Developers](https://developers.kakao.com/docs/latest/ko/kakaologin/common).

## 네이버: 최신 OIDC 사용

네이버의 **새 `/oauth2/*` OIDC 경로**를 사용한다. 기존 `/oauth2.0/*` 일반 OAuth에 중첩 `response.id` 매핑을 넣는 방식으로 설정하지 않는다. 현재 Supabase custom OAuth의 평면 매핑은 네이버의 중첩 프로필 응답을 읽지 못하며, 구형 token endpoint의 state 처리에도 차이가 있다.

Supabase Authentication → Custom OAuth Providers에 다음 값을 준비한다. 비밀키는 대시보드의 보호된 입력으로만 넣는다. 초기 실험은 테스트 프로젝트 또는 제한된 앱 사용자로 진행한다.

- Type: `oidc`
- Identifier: `custom:naver`
- Issuer: `https://nid.naver.com`
- Scopes: `openid`
- PKCE: enabled
- Skip nonce check: false
- Email optional: true
- Attribute mapping: empty
- Client ID / Secret: 실제 네이버 개발자 앱 값
- Callback: Supabase가 표시한 **정확한 값**을 네이버 앱에 등록

현재 네이버 [OIDC discovery](https://nid.naver.com/.well-known/openid-configuration)는 새 authorize/token endpoint, RS256, S256 PKCE, client_secret_post를 제공한다. 네이버 OIDC `sub`는 안정적인 로그인 식별자지만 ID token에는 이메일/이름이 없다. 프로필에서 이메일을 읽어 검증된 이메일로 위장하지 않는다.

공식 자료: [네이버 개발가이드 §3.5](https://developers.naver.com/docs/login/devguide/devguide.md), [Supabase custom providers](https://supabase.com/docs/guides/auth/custom-oauth-providers), [Supabase custom provider source](https://github.com/supabase/auth/blob/master/internal/api/provider/custom_oauth.go).

## 네이버 신규 계정의 이메일 확인

- OAuth 완료 시 `user.email`과 `user.email_confirmed_at`가 없으면 `/auth/complete-profile?next=...`로 이동한다.
- 사용자가 입력한 이메일은 현재 로그인한 UUID의 `updateUser({ email })`로 확인 메일을 요청한다. 기존 계정의 이메일 충돌은 병합하지 않고 이전 로그인 방법을 안내한다.
- 기본 Change Email 메일의 확인 링크를 같은 브라우저에서 연다. 기존 Supabase PKCE 코드 및 token_hash 콜백을 지원한다. 코드 입력을 제공하려면 Change Email 메일 템플릿에 `{{ .Token }}`이 표시돼야 한다.
- 코드 검증은 `type: "email_change"`. 검증 뒤 같은 UUID, 요청한 이메일과 일치하는 주소, `email_confirmed_at`를 확인하고 원래 경로로 복귀한다. Secure Email Change를 끄지 않는다.
- 이 화면은 연락처 확인 UX이며 RLS/권한 검사를 대신하지 않는다. 서버의 사용자 인증/소유권 검사는 기존 그대로다. 메일 미제공/미완료 사용자의 결제·알림·계정 삭제도 출시 전 점검한다.

자료: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## 사이트/계정 연결 설정과 공개

1. Supabase Redirect URLs에 실제 사이트의 `/auth/callback`과 개발/스테이징에 필요한 callback을 허용한다. `next` query가 포함된 실제 경로 왕복을 테스트한다. 임의 외부 origin이나 과도하게 넓은 wildcard를 추가하지 않는다.
2. 기존 사용자 연결을 위해 Supabase의 **Enable Manual Linking**을 검증한 뒤 `NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED=true`로 표시한다. 이는 화면 플래그일 뿐 서버 권한을 켜지 않는다.
3. 각 공급자에 대해 실제 로그인 검증이 끝난 뒤 해당 빌드 환경에 다음 값을 넣고 다시 빌드한다. 서버 런타임 값만 바꾸면 이미 빌드된 `NEXT_PUBLIC_*` 값은 바뀌지 않는다.

```env
NEXT_PUBLIC_KAKAO_LOGIN_ENABLED=true
NEXT_PUBLIC_NAVER_LOGIN_ENABLED=true
NEXT_PUBLIC_NAVER_AUTH_PROVIDER=custom:naver
NEXT_PUBLIC_SOCIAL_ACCOUNT_LINKING_ENABLED=true
```

공급자 하나만 준비됐다면 해당 공급자만 켠다. 새 비밀키를 애플리케이션 `NEXT_PUBLIC_*` 변수에 넣지 않는다. 운영 배포는 별도 승인 후 진행한다.

## 출시 전 실제 확인 목록

- 신규/기존 Google 로그인 및 이메일 코드 로그인 유지.
- 카카오/네이버 승인·거절·취소·실패, 같은 브라우저 PKCE 복귀, 로그인 재시도.
- 네이버 첫 로그인 이메일 미제공 → 확인 링크/코드 → 원래 결과 query 복원; 중복 이메일 실패, 만료코드, 재전송, 새로고침, 다른 탭에서 계정 변경.
- 기존 Google 계정에서 네이버 연결 전후 UUID 동일, 기존 구매/쿠폰/문서 접근 동일, 타인 UUID 접근 거부.
- 별도로 만들어진 네이버 계정 연결 시 안전하게 실패하며 자동 병합/이관 없음.
- 쿠폰/추천코드 입력 → 공급자 선택 → 취소/로그인 왕복에서 입력 보존, 인증 전 RPC 없음.
- PC/모바일 헤더 열기/바깥 클릭/Escape, 중복 클릭 차단, 앱 `source=twa` 및 결과 ID 보존.
- 이메일 없는 사용자 헤더/내 정보에 로그인 상태와 로그아웃이 유지되는지 확인.
- 배포 후 실제 public 환경변수와 원격 Supabase 설정, callback, 보안 mail template 확인.

## 로컬 검증 상태

검증 최종 결과는 `docs/agent-change-log.md`의 같은 날짜 항목에 기록한다. 실제 개발자 키, Supabase 대시보드 설정, 메일 발송 및 OAuth 공급자 왕복은 로컬 단위 테스트로 대체할 수 없다.

### 개인정보 고지 확인

현재 `src/app/privacy/page.tsx`는 이메일/Google 로그인만 명시한다. 새 공급자를 공개하기 전 실제 동의항목(계정 식별자, 제공되는 이메일/프로필)과 네이버 추가 이메일 확인 흐름에 맞게 고지 문구를 검토·반영한다. 이번 코드 준비 단계에서는 운영 법률 고지를 임의로 변경하지 않았다.

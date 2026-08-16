# MOOA Resume

공고와 지원서 전체를 함께 읽고, 근거 중심으로 개선 우선순위를 알려주는 한국어 AI 취업 코칭 서비스입니다.

## 실행

```bash
npm install
npm run dev
```

## 외부 E2E 준비 점검

`.env.example`을 참고해 `.env.local`을 설정한 뒤 아래 명령을 실행합니다.

```bash
npm run check:e2e
```

점검기는 Supabase·Polar·OpenAI 설정, Auth callback, migration 및 Supabase CLI 준비 여부만 표시하며 비밀값은 출력하지 않습니다. 모든 항목이 `READY`가 된 뒤 sandbox E2E와 원격 migration을 진행합니다.


### Supabase migration 명령

Supabase CLI는 프로젝트 dev dependency로 고정되어 있습니다.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:remote:list
npm run db:remote:plan
```

`db:remote:plan` 결과를 검토하기 전에는 `npm run db:remote:push`를 실행하지 않습니다. 원격 프로젝트 연결과 migration 적용은 외부 상태를 변경하므로 대상 프로젝트를 먼저 확인해야 합니다.
주요 기준 문서는 `MOOA_RESUME_PROJECT_SPEC.md`, 대화 요약은 `docs/chatgpt-conversation-context.md`입니다.

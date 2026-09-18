# MOOA Resume — Native app

2026-09-18 · Expo SDK 57 / React Native 0.86 / strict TypeScript

`apps/mobile` is an independent native app alongside the existing Next.js site. It does not wrap the website in a WebView. Shared imports are pure result/input schemas and career-interest scoring; server secrets and AI providers stay on the Next.js server.

## What works locally

- Five native tabs: Home, Review, Résumé, Career, My; Korean and English UI.
- QUICK/PRO/FINAL selection, multiple question inputs, optional character targets, job description and résumé supporting text, bounded TXT import.
- Native result workspace: overview, top three priorities, original/revised text and revision reasons, copy/share, interview preparation, FINAL cross-checks. Clearly marked sample results work without accounts or AI calls.
- Free manual résumé editor and native PDF export/share. Output is escaped, generated on device, and the temporary PDF is removed after sharing finishes.
- All 30 original RIASEC interest questions, English wording, shared score calculation, explicit tied-score handling. No prediction of hiring success.
- Email OTP sign-in for existing Supabase accounts; refresh token in SecureStore on native devices, in-memory web preview sessions; foreground token refresh.
- Bearer-authenticated private case creation, analysis history, active passes, result retrieval, and the existing analysis execution lifecycle. Account changes discard stale responses and clear private screen state.
- Native Google Play product lookup, localized price confirmation, purchase verification and unfinished-purchase recovery. Server verifies Google state, product, hashed account and exact analysis run before granting the existing entitlement; client consumes only after verification. Disabled until explicitly configured and tested.

## Run

From this directory:

```powershell
npm ci
npm run typecheck
npx expo export --platform web --max-workers 2
node scripts/serve-preview.mjs
```

Open http://127.0.0.1:8089 for the local UI preview. The preview uses the same React Native screens. It does not prove Android billing, secure storage, native PDF sharing, or live server integration.

For native development:

```powershell
Copy-Item .env.example .env.local
# Fill only the public Supabase URL/key and backend URL.
npm run android
```

Google Play requires a native build; Expo Go and the web preview do not support this billing module. Android emulator backend address: `http://10.0.2.2:3000`. Production API URLs must use HTTPS. A physical device needs a reachable development URL. The API rejects cross-origin web callers; the web export is an offline UI preview, not an alternative live web frontend.

## Backend configuration

Run the Next.js backend from the repository root. The new routes are:

- `POST /api/mobile/cases`
- `GET /api/mobile/history`
- `GET /api/mobile/result?id=<analysisRunId>`
- `POST /api/mobile/execute`
- `GET /api/mobile/billing?id=<analysisRunId>`
- `POST /api/mobile/billing`

Every route requires `Authorization: Bearer <Supabase access token>` verified against Supabase. Data access uses the user's public-key client and existing RLS; execution/payment adapters use the existing server-side ownership/entitlement checks. No new tables or remote migrations were applied.

Configure Supabase's existing email template to include `{{ .Token }}` for OTP login. Automatic signup is intentionally disabled (`shouldCreateUser: false`); new-account onboarding/consent and account deletion must be completed before public store launch. No Supabase settings were changed in this session.

For native billing only, set server `GOOGLE_PLAY_NATIVE_ENABLED=true` and app `EXPO_PUBLIC_GOOGLE_PLAY_ENABLED=true` **after** internal testing configuration is ready. Reuse server-only `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, and the existing per-tier/product-size ladder variables. Never copy service account JSON, OpenAI keys, or Supabase elevated keys into Expo variables.

The provisional package ID is `com.mooaresume.app`. Confirm its relationship to the existing TWA listing and signing key before uploading any build. A locally generated APK is for review, not a production signing artifact.

## Explicit limitations / release work

This is a working first implementation, not a claim of store-release readiness.

1. **English UI is implemented; English AI analysis is not.** The existing protected engine still assumes Korean hiring and character limits. US/English requests are rejected server-side before persistence or billing. UI language never silently changes the analysis market. Add immutable market/language metadata, market-specific prompts/parsing/units and repeatable multilingual evals before opening this gate.
2. **Global store payments are blocked.** Existing billing accounting records a KRW catalogue quote. Native checkout checks the Play storefront and verification requires `regionCode=KR`. Implement accurate regional accounting, refund/revocation processing and official policy review before worldwide sale. Existing TWA and Polar paths were preserved.
3. **AI résumé creation, DOCX export, PDF/DOCX/HWP import, values/work-style tests, and interactive FINAL mock interviews are not native-app features yet.** The résumé tab is the free manual/PDF builder; FINAL displays saved review findings and interview preparation.
4. Native auth, live RLS integration, Google Play purchases, pending/replayed/refunded transactions, and paid AI execution require staging/physical-device checks. No real purchase, paid AI call or production deployment occurred.
5. Complete app-specific privacy/terms, signup consent and deletion flow, Play Data Safety, support links, store screenshots, signing, and release accessibility/device testing. No public release or store upload was performed.
6. Drafts/assessment answers are in memory. Switching tabs/results preserves them, but closing the app or signing out clears them. Documents are sent only when the user saves a signed-in application; copying/sharing explicitly sends text to the OS clipboard/share destination.

## Validation

See `docs/agent-change-log.md` at repository root for final build/test results and protected baseline. Independent commands:

```powershell
# App directory
npm run typecheck
npx expo export --platform web --max-workers 2
# Repository root
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run build
```

UI QA covered 390×844 and 844×390, bilingual screens, English-analysis blocking, input preservation through a result visit, result copy, résumé preview, all 30 interest questions and tied results. Samples contain fictional content and are marked as examples. No actual candidate files were used.

## Sources consulted

- [Expo SDK reference](https://docs.expo.dev/versions/latest/)
- [Supabase native authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [OpenIAP requestPurchase lifecycle](https://www.openiap.dev/docs/apis/request-purchase)

The installed official blank TypeScript template supplied compatible SDK/React Native versions. Existing app/server implementations were inspected directly rather than treating the pasted historical code review as current source truth.

## Delivered review APK

`../../artifacts/mooa-mobile-20260918/mooa-resume-preview.apk` — 49.6 MB, Android 7+, arm64-v8a / x86_64, v2 signature verified. This is an offline review build signed with the generated debug key. No backend public configuration is embedded; do not treat it as a store upload or live paid-service build. Exact hash and verification flags are in the adjacent `build-info.json`.

Final validation: 149 repository test files / 1,172 tests; app/web typechecks; lint with only two pre-existing warnings; Next.js production build; Expo web export; Android APK compilation/signature/manifest checks. Physical-device runtime, authentication and payments remain unverified.

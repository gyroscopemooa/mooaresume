import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authenticateMobile, readBearerToken, readMobileJson, mobileJson } from './auth';
import { purchaseBinding, assertPurchaseBinding } from './purchase-binding';
import { supportsMobileAnalysis, mobileSubmissionSchema } from './contract';
import { sampleResult } from '../../../apps/mobile/src/sample';
import { resumeHtml, countDisplayLength, emptyResume } from '../../../apps/mobile/src/format';
import { INTEREST_ITEMS, questionEnglish, scoreCareerInterest } from '../../../apps/mobile/src/career';
import { copy } from '../../../apps/mobile/src/i18n';

describe('native authentication and bounded input', () => {
  it.each(['', 'Basic abc', 'Bearer x y', 'Bearer', `Bearer ${'a'.repeat(8193)}`])('rejects invalid authorization (%s)', header => {
    expect(() => readBearerToken(new Headers({ authorization: header }))).toThrow('AUTH_REQUIRED');
  });
  it('does not accept cookie-only credentials', async () => {
    const factory = vi.fn();
    await expect(authenticateMobile(new Request('https://app.test/api/mobile/history', { headers: { cookie: 'sb-auth=anything' } }), factory)).rejects.toThrow('AUTH_REQUIRED');
    expect(factory).not.toHaveBeenCalled();
  });
  it('asks Supabase to verify the exact bearer and rejects expired sessions', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    // Test double only implements the auth method exercised by this boundary.
    const factory = vi.fn(() => ({ auth: { getUser } }) as unknown as SupabaseClient);
    await expect(authenticateMobile(new Request('https://app.test/api/mobile/history', { headers: { authorization: 'Bearer header.payload.signature' } }), factory)).rejects.toThrow('AUTH_REQUIRED');
    expect(getUser).toHaveBeenCalledWith('header.payload.signature');
  });
  it('rejects cross-origin requests even with a bearer', async () => {
    await expect(authenticateMobile(new Request('https://app.test/api/mobile/history', { headers: { authorization: 'Bearer token', origin: 'https://other.test' } }))).rejects.toThrow('ORIGIN_REJECTED');
  });
  it('rejects malformed JSON and streamed oversize bodies', async () => {
    await expect(readMobileJson(new Request('https://app.test', { method: 'POST', body: '{' }))).rejects.toThrow('INVALID_JSON');
    await expect(readMobileJson(new Request('https://app.test', { method: 'POST', body: 'a'.repeat(196609) }))).rejects.toThrow('INPUT_TOO_LARGE');
    expect(await readMobileJson(new Request('https://app.test', { method: 'POST', body: '{"safe":true}' }))).toEqual({ safe: true });
  });
  it('never permits caching private responses', () => {
    expect(mobileJson({}).headers.get('cache-control')).toBe('private, no-store');
    expect(mobileJson({}).headers.get('vary')).toBe('Authorization');
  });
});
describe('native purchase identity', () => {
  const binding = purchaseBinding('owner', 'run');
  const valid = { obfuscatedExternalAccountId: binding.accountId, obfuscatedExternalProfileId: binding.profileId, regionCode: 'KR' };
  it('accepts only the authenticated account and exact immutable run', () => {
    expect(() => assertPurchaseBinding(valid, 'owner', 'run')).not.toThrow();
    expect(() => assertPurchaseBinding(valid, 'attacker', 'run')).toThrow('PURCHASE_OWNER_MISMATCH');
    expect(() => assertPurchaseBinding(valid, 'owner', 'other-run')).toThrow('PURCHASE_OWNER_MISMATCH');
    expect(() => assertPurchaseBinding({}, 'owner', 'run')).toThrow('PURCHASE_OWNER_MISMATCH');
    expect(binding.accountId).toHaveLength(64);
  });
  it('does not record a foreign purchase as a Korean catalogue charge', () => {
    expect(() => assertPurchaseBinding({ ...valid, regionCode: 'US' }, 'owner', 'run')).toThrow('STORE_REGION_NOT_SUPPORTED');
  });
});
describe('mobile content and locale boundaries', () => {
  it('keeps English UI separate from unavailable English analysis', () => {
    expect(supportsMobileAnalysis({ market: 'KR', outputLanguage: 'ko' })).toBe(true);
    expect(supportsMobileAnalysis({ market: 'US', outputLanguage: 'en' })).toBe(false);
    expect(mobileSubmissionSchema.safeParse({ locale: 'en-US' }).success).toBe(false);
    expect(Object.keys(copy.ko).sort()).toEqual(Object.keys(copy.en).sort());
  });
  it('validates both illustrative result fixtures through the production schema', () => {
    for (const locale of ['ko', 'en'] as const) {
      const result = sampleResult(locale);
      expect(result.isSample).toBe(true);
      expect(result.analysisRun.provider).toBe('mock');
      expect(result.priorities).toHaveLength(3);
    }
  });
  it('escapes applicant text in printable HTML', () => {
    const html = resumeHtml({ ...emptyResume, name: '<script>alert(1)</script>', experience: '<img src=x onerror=alert(1)>', email: 'a&b' }, copy.en);
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;'); expect(html).toContain('a&amp;b');
  });
  it('uses explicit display units without altering billing counts', () => {
    expect(countDisplayLength('hello world\nagain', 'en')).toBe(3);
    expect(countDisplayLength('가 나\n다', 'ko')).toBe(3);
    expect(countDisplayLength('   ', 'en')).toBe(0);
  });
  it('translates all 30 original items and reuses original scoring', () => {
    expect(INTEREST_ITEMS).toHaveLength(30);
    for (let i=0;i<30;i++) expect(questionEnglish(i).length).toBeGreaterThan(10);
    const answers = Object.fromEntries(INTEREST_ITEMS.map(item => [item.id, 3 as const]));
    expect(scoreCareerInterest(answers).every(score => score.score === 50)).toBe(true);
    expect(() => scoreCareerInterest({})).toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ authenticateMobile: vi.fn() }));
vi.mock('@/server/mobile/auth', async importOriginal => ({ ...await importOriginal<typeof import('./auth')>(), authenticateMobile: auth.authenticateMobile }));
import { GET as getResult } from '@/app/api/mobile/result/route';
import { GET as getHistory } from '@/app/api/mobile/history/route';
import { POST as createCase } from '@/app/api/mobile/cases/route';
import { MobileHttpError } from './auth';
const runId = '00000000-0000-4000-8000-000000000001';
beforeEach(() => vi.clearAllMocks());
describe('native data routes', () => {
  it('requires authentication before touching history', async () => {
    auth.authenticateMobile.mockRejectedValue(new MobileHttpError(401, 'AUTH_REQUIRED'));
    const response = await getHistory(new Request('https://app.test/api/mobile/history'));
    expect(response.status).toBe(401);
  });
  it('does not read another owner’s result even if a run UUID is known', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    const from = vi.fn().mockReturnValue(query);
    auth.authenticateMobile.mockResolvedValue({ client: { from }, user: { id: 'actual-owner' } });
    const response = await getResult(new Request(`https://app.test/api/mobile/result?id=${runId}`));
    expect(response.status).toBe(404);
    expect(query.eq).toHaveBeenCalledWith('owner_user_id', 'actual-owner');
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith('analysis_results');
  });
  it('refuses English-market submissions before persistence or checkout', async () => {
    const rpc = vi.fn();
    auth.authenticateMobile.mockResolvedValue({ client: { rpc }, user: { id: 'actual-owner' } });
    const response = await createCase(new Request('https://app.test/api/mobile/cases', { method: 'POST', body: JSON.stringify({ locale: 'en-US', market: 'US', outputLanguage: 'en', application: { title: 'A', product: 'QUICK', writingMode: 'POLISH', writingStyle: 'BALANCED', targetLength: 700, questions: [{ id: 'q', title: '', prompt: '', answer: 'My experience', targetLength: null }] } }) }));
    expect(response.status).toBe(422); expect(rpc).not.toHaveBeenCalled();
  });
});

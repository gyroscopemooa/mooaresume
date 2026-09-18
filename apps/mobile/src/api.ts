import { z } from 'zod';
import { resultDocumentSchema } from '../../../src/domain/result-document';
import { supabase } from './auth';
const runSchema = z.object({ id: z.string().uuid(), product: z.enum(['QUICK', 'PRO', 'FINAL']), status: z.string(), created_at: z.string(), application_case_id: z.string().uuid() });
export const historySchema = z.object({ runs: z.array(runSchema), entitlements: z.array(z.object({ id: z.string(), product: z.string(), status: z.string(), application_case_id: z.string() })) });
export type History = z.infer<typeof historySchema>;
export type Run = z.infer<typeof runSchema>;
export const resultResponseSchema = z.object({ status: z.string(), result: resultDocumentSchema.nullable() });
export const savedSchema = z.object({ analysisRunId: z.string().uuid(), applicationCaseId: z.string().uuid(), submissionSnapshotId: z.string().uuid() });
export const billingSchema = z.object({ productId: z.string(), accountId: z.string(), profileId: z.string() });
export class ApiError extends Error { constructor(readonly code: string) { super(code); } }
export async function api<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base || !supabase) throw new ApiError('CONFIG_REQUIRED');
  const target = new URL(base);
  if (target.protocol !== 'https:' && !(__DEV__ && target.protocol === 'http:')) throw new ApiError('HTTPS_REQUIRED');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError('AUTH_REQUIRED');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 65000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/mobile/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: abort.signal,
      credentials: 'omit',
    });
    const json: unknown = await response.json();
    if (!response.ok) {
      const problem = z.object({ code: z.string().optional() }).safeParse(json);
      throw new ApiError(problem.success ? problem.data.code ?? 'REQUEST_FAILED' : 'REQUEST_FAILED');
    }
    return schema.parse(json);
  } finally { clearTimeout(timer); }
}

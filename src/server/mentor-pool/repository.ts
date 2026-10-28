import "server-only";
import { createHmac } from "node:crypto";
import { serviceClient } from "@/server/admin/admin-repository";
import { isAdmin } from "@/server/admin/admin-session";
import { MENTOR_CONSENT_VERSION, mentorApplicationSchema, mentorAdminUpdateSchema, type MentorApplication, type MentorPoolRecord } from "@/domain/mentor-pool";
import { z } from "zod";

export async function takeMentorPoolLimit(subject: string, limit: number, seconds: number) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("UNAVAILABLE");
  const hash = createHmac("sha256", secret).update(`mentor-pool:${subject}`).digest("hex");
  const { data, error } = await serviceClient().rpc("take_mentor_pool_limit", { p_subject: hash, p_limit: limit, p_seconds: seconds });
  if (error) throw new Error("UNAVAILABLE");
  return data === true;
}

export async function saveMentorApplication(input: MentorApplication) {
  const { submissionId, consent: _consent, website: _website, ...fields } = mentorApplicationSchema.parse(input);
  void _consent; void _website;
  // Retrying the same submission never overwrites a record or exposes existence.
  const { error } = await serviceClient().from("mentor_pool_applications").upsert({
    id: submissionId, ...fields, consent_version: MENTOR_CONSENT_VERSION,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error("UNAVAILABLE");
}

export async function listMentorApplications(): Promise<MentorPoolRecord[]> {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
  const { data, error } = await serviceClient().from("mentor_pool_applications")
    .select("id,kind,name,email,headline,story,fields,mode,region,availability,status,admin_note,created_at,updated_at,expires_at")
    .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("UNAVAILABLE");
  return (data ?? []).map((row) => ({
    ...mentorApplicationSchema.parse({ submissionId: row.id, kind: row.kind, name: row.name, email: row.email, headline: row.headline, story: row.story, fields: row.fields, mode: row.mode, region: row.region, availability: row.availability, consent: true, website: "" }),
    id: z.string().uuid().parse(row.id),
    status: mentorAdminUpdateSchema.shape.status.parse(row.status), note: z.string().parse(row.admin_note),
    createdAt: z.string().parse(row.created_at), updatedAt: z.string().parse(row.updated_at), expiresAt: z.string().parse(row.expires_at),
  }));
}

export async function updateMentorApplication(input: z.infer<typeof mentorAdminUpdateSchema>) {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
  const { data, error } = await serviceClient().from("mentor_pool_applications")
    .update({ status: input.status, admin_note: input.note, updated_at: new Date().toISOString() })
    .eq("id", input.id).eq("updated_at", input.updatedAt).gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
  if (error) throw new Error("UNAVAILABLE");
  return Boolean(data);
}

export async function deleteMentorApplication(id: string) {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
  const { error } = await serviceClient().from("mentor_pool_applications").delete().eq("id", id);
  if (error) throw new Error("UNAVAILABLE");
}

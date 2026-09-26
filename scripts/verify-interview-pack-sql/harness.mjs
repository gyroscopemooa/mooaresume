/**
 * 실제 Postgres(PGlite, WASM)에 이 저장소의 마이그레이션 전체를 적용해 SQL 을 검증하는 도구.
 *
 * Supabase 에서만 있는 것(auth 스키마, anon/authenticated/service_role 역할, storage, 기본 권한)은 최소한으로 흉내 낸다.
 * pg_cron 이 필요한 마이그레이션 몇 개는 실패해도 정상이다(예약 작업일 뿐 이 기능과 무관).
 * 패키지를 저장소에 추가하지 않는다: `npm i --no-save @electric-sql/pglite` 로 잠시만 설치해 쓴다.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import path from "node:path";

export async function makeDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path to public, extensions;
create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;

grant usage on schema public, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema if not exists storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text);
create schema if not exists cron; create schema if not exists net; create schema if not exists vault;
`);
  return db;
}

export async function applyMigrations(db, dir, { stopAfter, only } = {}) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const failed = [];
  for (const f of files) {
    if (only && !only(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, "");
    try { await db.exec(sql); }
    catch (e) {
      failed.push([f, String(e.message).split("\n")[0]]);
      try { await db.exec("rollback"); } catch {}
    }
    if (stopAfter && f === stopAfter) break;
  }
  return failed;
}


/**
 * Banco Postgres em memória (PGlite) que imita o essencial do Supabase
 * para testar as migrações e as políticas de RLS sem rede e sem Docker:
 * papéis anon/authenticated/service_role, schema auth com auth.users e auth.uid().
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PASTA_MIGRACOES = join(process.cwd(), "supabase", "migrations");

const AMBIENTE_SUPABASE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(
        current_setting('request.jwt.claim.sub', true),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      ),
      ''
    )::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- Storage: o mínimo para testar as políticas de anexos.
  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid default auth.uid()
  );
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;

  -- Mesmo padrão do Supabase: tudo em public é concedido aos papéis da API,
  -- e cada migração restringe com RLS e revokes.
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type Banco = {
  db: PGlite;
  /** Cria um usuário em auth.users (dispara os gatilhos) e devolve o id. */
  criarUsuario(email: string, meta?: Record<string, unknown>): Promise<string>;
  /** Roda `fn` como um usuário autenticado (papel `authenticated` com o JWT dele). */
  comoUsuario<T>(id: string, fn: (db: PGlite) => Promise<T>): Promise<T>;
  /** Roda `fn` como visitante sem login. */
  comoAnonimo<T>(fn: (db: PGlite) => Promise<T>): Promise<T>;
  /** Roda `fn` com a chave de serviço do servidor. */
  comoServico<T>(fn: (db: PGlite) => Promise<T>): Promise<T>;
};

export async function criarBanco(): Promise<Banco> {
  const db = new PGlite();
  await db.exec(AMBIENTE_SUPABASE);

  const migracoes = readdirSync(PASTA_MIGRACOES)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const arquivo of migracoes) {
    await db.exec(readFileSync(join(PASTA_MIGRACOES, arquivo), "utf8"));
  }

  async function comoPapel<T>(papel: string, sub: string | null, fn: (db: PGlite) => Promise<T>) {
    await db.exec(`set role ${papel}`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub ?? ""]);
    try {
      return await fn(db);
    } finally {
      await db.exec(`reset role`);
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  }

  return {
    db,
    async criarUsuario(email, meta = {}) {
      const id = randomUUID();
      await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
        id,
        email,
        JSON.stringify(meta),
      ]);
      return id;
    },
    comoUsuario: (id, fn) => comoPapel("authenticated", id, fn),
    comoAnonimo: (fn) => comoPapel("anon", null, fn),
    comoServico: (fn) => comoPapel("service_role", null, fn),
  };
}

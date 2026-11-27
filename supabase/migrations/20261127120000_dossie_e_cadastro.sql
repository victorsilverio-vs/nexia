-- Marco 2: cadastro de membros pela equipe e dossiê.
--
-- Regras desta migração:
--   * perfis ganha e-mail (cópia do auth.users, para a equipe listar membros) e dados do convite.
--   * Todo membro tem um dossiê (criado junto com o perfil), com as respostas em jsonb.
--   * Membro edita só o próprio dossiê e só enquanto está em rascunho.
--   * Enviar e devolver dossiê só por função (enviar_dossie / devolver_dossie), nunca por UPDATE direto.
--   * Consentimentos são um histórico: cada aceite ou recusa é uma linha nova, com data. Nada se apaga.
--   * Anexos do dossiê ficam no bucket privado "dossie", na pasta do membro.
--   * notificacoes registra envios de e-mail (sem conteúdo nem endereço: LGPD).

-- perfis: e-mail e convite -----------------------------------------------------

alter table public.perfis
  add column email        text,
  add column convidado_em  timestamptz,
  add column convidado_por uuid references public.perfis (id) on delete set null;

update public.perfis p
set email = lower(u.email)
from auth.users u
where u.id = p.id;

create index perfis_email_idx on public.perfis (email);

-- Novas colunas também protegidas: só o servidor (service_role) altera e-mail e convite.
create or replace function public.perfis_proteger_colunas()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if new.id is distinct from old.id or new.criado_em is distinct from old.criado_em then
    raise exception 'id e criado_em não podem ser alterados' using errcode = '42501';
  end if;

  if new.email is distinct from old.email
     or new.convidado_em is distinct from old.convidado_em
     or new.convidado_por is distinct from old.convidado_por then
    raise exception 'e-mail e dados do convite só mudam pelo servidor' using errcode = '42501';
  end if;

  if new.papel is distinct from old.papel and not public.eh_admin() then
    raise exception 'só o admin altera papel' using errcode = '42501';
  end if;

  if new.plano_assinatura is distinct from old.plano_assinatura and not public.eh_equipe_ou_admin() then
    raise exception 'só equipe ou admin altera plano de assinatura' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Mantém perfis.email igual ao auth.users se o e-mail mudar.
create function public.sincronizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

revoke all on function public.sincronizar_email_perfil() from public, anon, authenticated;

create trigger ao_mudar_email_sincronizar_perfil
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sincronizar_email_perfil();

-- Dossiês ---------------------------------------------------------------------

create type public.status_dossie as enum ('rascunho', 'enviado');

create table public.dossies (
  membro_id     uuid primary key references public.perfis (id) on delete cascade,
  respostas     jsonb not null default '{}'::jsonb,
  status        public.status_dossie not null default 'rascunho',
  enviado_em    timestamptz,
  devolvido_em  timestamptz,
  devolvido_por uuid references public.perfis (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  constraint respostas_e_objeto check (jsonb_typeof(respostas) = 'object')
);

comment on table public.dossies is 'Ficha de onboarding do membro. Uma por membro.';

alter table public.dossies enable row level security;
revoke all on public.dossies from anon, authenticated;
grant select on public.dossies to authenticated;
grant update (respostas) on public.dossies to authenticated;

create policy "dossies: ler o próprio ou ser equipe/admin"
  on public.dossies for select
  to authenticated
  using (membro_id = auth.uid() or public.eh_equipe_ou_admin());

create policy "dossies: membro edita o próprio rascunho"
  on public.dossies for update
  to authenticated
  using (membro_id = auth.uid() and status = 'rascunho')
  with check (membro_id = auth.uid() and status = 'rascunho');

create function public.dossies_carimbar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger dossies_carimbar_atualizacao
  before update on public.dossies
  for each row execute function public.dossies_carimbar_atualizacao();

-- Consentimentos ----------------------------------------------------------------

create type public.tipo_consentimento as enum ('lgpd', 'conexoes', 'mapa');

create table public.consentimentos (
  id        bigint generated always as identity primary key,
  membro_id uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  tipo      public.tipo_consentimento not null,
  aceito    boolean not null,
  data      timestamptz not null default now()
);

comment on table public.consentimentos is 'Histórico de consentimentos (LGPD). Vale a linha mais recente de cada tipo.';

create index consentimentos_membro_tipo_idx on public.consentimentos (membro_id, tipo, data desc);

alter table public.consentimentos enable row level security;
revoke all on public.consentimentos from anon, authenticated;
grant select on public.consentimentos to authenticated;
-- Só tipo e aceito: membro_id e data vêm dos padrões (auth.uid() e now()), sem como forjar.
grant insert (tipo, aceito) on public.consentimentos to authenticated;

create policy "consentimentos: ler os próprios ou ser equipe/admin"
  on public.consentimentos for select
  to authenticated
  using (membro_id = auth.uid() or public.eh_equipe_ou_admin());

create policy "consentimentos: registrar só os próprios"
  on public.consentimentos for insert
  to authenticated
  with check (membro_id = auth.uid());

create function public.consentimento_vigente(p_membro uuid, p_tipo public.tipo_consentimento)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select c.aceito from public.consentimentos c
      where c.membro_id = p_membro and c.tipo = p_tipo
      order by c.data desc, c.id desc
      limit 1),
    false)
$$;

revoke all on function public.consentimento_vigente(uuid, public.tipo_consentimento) from public, anon, authenticated;

-- Enviar e devolver ------------------------------------------------------------

create function public.enviar_dossie()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quando timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'é preciso estar logado' using errcode = '42501';
  end if;

  if not public.consentimento_vigente(auth.uid(), 'lgpd') then
    raise exception 'aceite de LGPD obrigatório para enviar o dossiê' using errcode = '23514';
  end if;

  update public.dossies
  set status = 'enviado', enviado_em = v_quando
  where membro_id = auth.uid() and status = 'rascunho';

  if not found then
    raise exception 'dossiê não encontrado ou já enviado' using errcode = 'P0002';
  end if;

  return v_quando;
end;
$$;

create function public.devolver_dossie(p_membro uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_equipe_ou_admin() then
    raise exception 'só equipe ou admin devolve dossiê' using errcode = '42501';
  end if;

  update public.dossies
  set status = 'rascunho', devolvido_em = now(), devolvido_por = auth.uid()
  where membro_id = p_membro and status = 'enviado';

  if not found then
    raise exception 'dossiê não encontrado ou não está enviado' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.enviar_dossie() from public, anon;
revoke all on function public.devolver_dossie(uuid) from public, anon;
grant execute on function public.enviar_dossie() to authenticated;
grant execute on function public.devolver_dossie(uuid) to authenticated;

-- Criação do perfil passa a criar o dossiê do membro ---------------------------

create or replace function public.criar_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel public.papel := case when public.email_eh_admin_inicial(new.email) then 'admin'::public.papel
                               else 'membro'::public.papel end;
begin
  insert into public.perfis (id, nome, whatsapp, papel, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'whatsapp',
    v_papel,
    lower(new.email)
  )
  on conflict (id) do nothing;

  if v_papel = 'membro' then
    insert into public.dossies (membro_id) values (new.id) on conflict (membro_id) do nothing;
  end if;

  return new;
end;
$$;

insert into public.dossies (membro_id)
select p.id from public.perfis p where p.papel = 'membro'
on conflict (membro_id) do nothing;

-- Notificações (registro de envios) --------------------------------------------

create table public.notificacoes (
  id              bigint generated always as identity primary key,
  destinatario_id uuid references public.perfis (id) on delete cascade,
  gatilho         text not null,
  canal           text not null default 'email',
  enviada_em      timestamptz,
  erro            text,
  criado_em       timestamptz not null default now()
);

comment on table public.notificacoes is 'Registro de e-mails enviados (ou que falharam). Sem conteúdo nem endereço.';

alter table public.notificacoes enable row level security;
revoke all on public.notificacoes from anon, authenticated;
grant select on public.notificacoes to authenticated;

create policy "notificacoes: equipe/admin leem"
  on public.notificacoes for select
  to authenticated
  using (public.eh_equipe_ou_admin());

-- Anexos do dossiê (Storage) ----------------------------------------------------
-- Caminho: dossie/<id do membro>/<arquivo>. Bucket privado; leitura por URL assinada.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dossie', 'dossie', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create function public.dossie_em_rascunho(p_membro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.dossies d where d.membro_id = p_membro and d.status = 'rascunho')
$$;

revoke all on function public.dossie_em_rascunho(uuid) from public, anon;
grant execute on function public.dossie_em_rascunho(uuid) to authenticated;

create policy "dossie: membro envia anexos na própria pasta enquanto rascunho"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dossie'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.dossie_em_rascunho(auth.uid())
  );

create policy "dossie: ler anexos próprios ou ser equipe/admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dossie'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_equipe_ou_admin())
  );

create policy "dossie: membro apaga anexos próprios enquanto rascunho"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dossie'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.dossie_em_rascunho(auth.uid())
  );

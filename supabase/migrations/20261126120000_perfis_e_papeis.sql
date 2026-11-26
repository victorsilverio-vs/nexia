-- Marco 1: perfis e papéis.
--
-- Cada usuário do Supabase Auth tem um perfil com o papel na plataforma:
--   admin  (Victor)   tudo; único que publica planos
--   equipe            vê membros, cadastra, confirma itens, edita agenda
--   membro            vê e edita só o que é dele
--
-- Regras desta migração:
--   * Todo usuário novo nasce como `membro`, exceto o e-mail do admin inicial.
--   * Membro lê e edita só o próprio perfil, e não pode mudar o próprio papel nem plano.
--   * Equipe lê todos os perfis e pode alterar plano de assinatura, mas não papel.
--   * Só admin muda papel.
--   * Perfis nascem por gatilho; ninguém insere nem apaga pela API.

-- Tipos ---------------------------------------------------------------------

create type public.papel as enum ('admin', 'equipe', 'membro');
create type public.plano_assinatura as enum ('nexia', 'advisor', 'advisor_private');

-- Tabela --------------------------------------------------------------------

create table public.perfis (
  id               uuid primary key references auth.users (id) on delete cascade,
  nome             text not null default '',
  whatsapp         text,
  papel            public.papel not null default 'membro',
  plano_assinatura public.plano_assinatura,
  criado_em        timestamptz not null default now()
);

comment on table public.perfis is 'Perfil e papel de cada usuário da NEXIA (1:1 com auth.users).';

alter table public.perfis enable row level security;

-- Visitantes não autenticados não enxergam nada.
revoke all on public.perfis from anon;
-- Usuários autenticados: só leitura e atualização (sujeitas às políticas abaixo).
revoke all on public.perfis from authenticated;
grant select, update on public.perfis to authenticated;

-- Funções auxiliares de papel ----------------------------------------------
-- security definer para poderem ler `perfis` dentro das próprias políticas
-- de `perfis` sem recursão de RLS.

create function public.papel_atual()
returns public.papel
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel from public.perfis p where p.id = auth.uid()
$$;

create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() = 'admin', false)
$$;

create function public.eh_equipe_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() in ('admin', 'equipe'), false)
$$;

revoke all on function public.papel_atual() from public, anon;
revoke all on function public.eh_admin() from public, anon;
revoke all on function public.eh_equipe_ou_admin() from public, anon;
grant execute on function public.papel_atual() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_equipe_ou_admin() to authenticated;

-- Políticas -----------------------------------------------------------------

create policy "perfis: ler o próprio ou ser equipe/admin"
  on public.perfis for select
  to authenticated
  using (id = auth.uid() or public.eh_equipe_ou_admin());

create policy "perfis: editar o próprio ou ser equipe/admin"
  on public.perfis for update
  to authenticated
  using (id = auth.uid() or public.eh_equipe_ou_admin())
  with check (id = auth.uid() or public.eh_equipe_ou_admin());

-- Proteção de colunas sensíveis --------------------------------------------
-- RLS controla linhas; este gatilho controla quem muda papel e plano.
-- Chamadas do servidor com a chave de serviço (service_role) passam direto.
-- Atenção: esta função NÃO pode ser security definer, senão current_user
-- seria sempre o dono da função e a verificação abaixo nunca barraria nada.

create function public.perfis_proteger_colunas()
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

  if new.papel is distinct from old.papel and not public.eh_admin() then
    raise exception 'só o admin altera papel' using errcode = '42501';
  end if;

  if new.plano_assinatura is distinct from old.plano_assinatura and not public.eh_equipe_ou_admin() then
    raise exception 'só equipe ou admin altera plano de assinatura' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger perfis_proteger_colunas
  before update on public.perfis
  for each row execute function public.perfis_proteger_colunas();

-- Criação automática do perfil ----------------------------------------------

-- E-mails que recebem papel admin ao entrar pela primeira vez.
create function public.email_eh_admin_inicial(email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(email, '')) in ('contato@ecossistemavs.com.br')
$$;

create function public.criar_perfil_para_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, whatsapp, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.raw_user_meta_data ->> 'whatsapp',
    case when public.email_eh_admin_inicial(new.email) then 'admin'::public.papel
         else 'membro'::public.papel end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.criar_perfil_para_usuario() from public, anon, authenticated;
revoke all on function public.perfis_proteger_colunas() from public, anon, authenticated;

create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_para_usuario();

-- Usuários que já existiam antes desta migração ganham perfil também.
insert into public.perfis (id, nome, papel)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'nome', ''),
       case when public.email_eh_admin_inicial(u.email) then 'admin'::public.papel
            else 'membro'::public.papel end
from auth.users u
on conflict (id) do nothing;

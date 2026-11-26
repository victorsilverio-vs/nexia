# NEXIA

Plataforma de assessoria em desenvolvimento imobiliário do Ecossistema VS.
Regras do projeto em [`CLAUDE.md`](CLAUDE.md); escopo da primeira entrega em [`docs/SPEC-MVP-1.md`](docs/SPEC-MVP-1.md).

## O que já existe (marco 1)

- Next.js 16 (App Router) + TypeScript, interface em português.
- Login sem senha por link mágico (Supabase Auth). Só entra quem foi cadastrado; não há cadastro aberto.
- Perfis e papéis (`admin`, `equipe`, `membro`) com Row Level Security e testes.
- Layout na identidade VS (preto, amarelo, claro, Red Hat Display), pensado primeiro para o celular.
- Telas: entrar, início por papel, Membros (admin e equipe) e Mesa do Victor (só admin), ainda vazias.

## Rodar na sua máquina

Pré-requisitos: Node 22 e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe o Supabase local e aplica as migrações
cp .env.example .env.local  # preencha com a URL e a PUBLISHABLE_KEY que o comando acima mostrou
npm run dev
```

E-mails do ambiente local (links mágicos) aparecem no Mailpit: http://127.0.0.1:54324.
Para criar um usuário local: `npx supabase status` mostra a URL do painel, ou use a API admin com a chave secreta local.

## Verificação

```bash
npm run verificar   # lint + tipos + testes + build
```

Os testes de banco (`tests/db`) rodam as migrações num Postgres em memória (PGlite) e conferem as políticas de RLS como cada papel.

## Colocar em produção (passo a passo)

### 1. Supabase (projeto `nexia`, região São Paulo)

1. **Aplicar as migrações.** Na sua máquina: `npx supabase login`, `npx supabase link --project-ref <ref-do-projeto>` e `npx supabase db push`.
   Alternativa sem terminal: copiar o conteúdo de `supabase/migrations/*.sql`, em ordem, no SQL Editor do painel.
2. **Authentication → Sign In / Providers:** desligar *Allow new users to sign up*. Manter *Email* ligado.
3. **Authentication → URL Configuration:**
   - *Site URL*: o endereço de produção (ex.: `https://nexia.ecossistemavs.com.br`, ou o `*.vercel.app` enquanto o domínio não estiver pronto).
   - *Redirect URLs*: o mesmo endereço com `/**` no fim, e `http://localhost:3000/**`.
4. **Authentication → Users → Add user:** criar `contato@ecossistemavs.com.br`. Ele vira admin sozinho.
5. **E-mail próprio (obrigatório antes dos membros):** configurar o Resend em *Authentication → Emails → Set up SMTP*,
   com o domínio `ecossistemavs.com.br` verificado. Sem isso o Supabase envia poucos e-mails por hora
   e não deixa editar os modelos.
6. **Depois do SMTP, Authentication → Emails → Magic link or OTP:** assunto `Seu link de acesso à NEXIA`
   e corpo (aba *Source*) copiado de [`supabase/templates/link-magico.html`](supabase/templates/link-magico.html).
   Até isso ser feito, o e-mail chega em inglês e o link só funciona no mesmo navegador em que foi pedido.
   Com o modelo, funciona em qualquer aparelho.

### 2. Vercel

1. Importar o repositório `victorsilverio-vs/nexia`. O *Application Preset* deve aparecer como **Next.js**.
2. Em *Environment Variables*, cadastrar:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase → Project Settings → API → Project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase → Project Settings → API Keys → *Publishable key* (`sb_publishable_...`).
   - `NEXT_PUBLIC_SITE_URL` (opcional): o endereço de produção.
3. Deploy. Produção sai do branch `main`.

### 3. Antes de abrir para os membros fundadores

- [ ] Supabase no plano Pro (sem pausa por inatividade, com backup diário).
- [ ] Vercel no plano Pro (o Hobby não permite uso comercial).
- [ ] SMTP do Resend configurado no Supabase.
- [ ] Modelo do link mágico em português colado no Supabase (passo 6 acima).
- [ ] Domínio `nexia.ecossistemavs.com.br` apontado para a Vercel e cadastrado no Supabase (Site URL e Redirect URLs).

## Estrutura

```
src/
  app/
    entrar/            tela de login e envio do link mágico
    auth/confirmar/    destino do link mágico
    sair/              encerrar sessão (POST)
    (area)/            telas logadas: início, equipe, mesa
  lib/
    auth/papeis.ts     regras de acesso por papel (puras, testadas)
    auth/sessao.ts     usuário logado + perfil
    supabase/          clientes do Supabase e renovação de sessão
  proxy.ts             manda para /entrar quem não está logado
supabase/
  migrations/          banco, sempre com RLS junto
  templates/           modelos de e-mail
tests/                 testes de permissão e de RLS
```

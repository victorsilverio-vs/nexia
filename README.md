# NEXIA

Plataforma de assessoria em desenvolvimento imobiliário do Ecossistema VS.
Regras do projeto em [`CLAUDE.md`](CLAUDE.md); escopo da primeira entrega em [`docs/SPEC-MVP-1.md`](docs/SPEC-MVP-1.md).

## O que já existe

**Marco 1:** login sem senha por link mágico (só entra quem foi cadastrado), perfis e papéis (`admin`, `equipe`, `membro`) com RLS, layout na identidade VS pensado primeiro para o celular.

**Marco 2:**
- A equipe cadastra membros (nome, e-mail, WhatsApp, plano) e o convite sai por e-mail. Sem e-mail configurado, a tela mostra o link para mandar pelo WhatsApp.
- Dossiê completo: 7 etapas, uma por tela, barra de progresso, salvamento automático, perguntas que aparecem conforme as respostas, vários empreendimentos com fotos e documentos.
- As perguntas ficam em `src/lib/dossie/perguntas.ts`. Para mudar o questionário, edite só essa lista.
- Envio exige o aceite de LGPD e trava o dossiê. Admin e equipe podem devolver para correção.
- Depois do envio, o membro vê o link de agendamento da reunião com o Victor (`LINK_AGENDAMENTO`).
- A equipe vê a lista de membros com a situação do dossiê, abre cada um, baixa os anexos, edita o cadastro e reenvia o convite. Só o admin muda papéis (por exemplo, promover alguém a equipe).
- Consentimentos guardados como histórico com data; registro de e-mails enviados sem dados pessoais.
- Página `/privacidade` com um **rascunho** de política, que precisa de revisão jurídica.

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

1. **Aplicar as migrações**, uma de cada vez e em ordem, colando o conteúdo de cada arquivo de `supabase/migrations/` no SQL Editor do painel e clicando em Run.
   Cada arquivo roda uma vez só. Já aplicadas: `20261126120000_perfis_e_papeis.sql`.
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
   - `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → *Secret keys* (`sb_secret_...`). Marque como *Sensitive*.
   - `LINK_AGENDAMENTO`: a página de agendamento da reunião inicial.
   - `RESEND_API_KEY` e `EMAIL_REMETENTE`: quando o domínio estiver verificado no Resend.
   - `NEXT_PUBLIC_SITE_URL` (opcional): o endereço de produção.
3. Deploy. Produção sai do branch `main`.

### 3. Antes de abrir para os membros fundadores

- [ ] Supabase no plano Pro (sem pausa por inatividade, com backup diário).
- [ ] Vercel no plano Pro (o Hobby não permite uso comercial).
- [ ] SMTP do Resend configurado no Supabase.
- [ ] Modelo do link mágico em português colado no Supabase (passo 6 acima).
- [ ] Domínio `app.nexiavs.com.br` apontado para a Vercel e cadastrado no Supabase (Site URL e Redirect URLs).
- [ ] Política de privacidade (`/privacidade`) revisada por advogado.
- [ ] Endereço das prévias da Vercel nas Redirect URLs do Supabase, para o login funcionar nelas.

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

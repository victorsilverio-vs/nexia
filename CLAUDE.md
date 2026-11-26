# NEXIA — instruções do projeto

NEXIA é a plataforma de assessoria em desenvolvimento imobiliário do Ecossistema VS (Victor Silvério). Membros (incorporadores iniciantes e em evolução) preenchem um dossiê, recebem um plano de ação nas 7 etapas, executam com ferramentas, aulas e conexões, e são acompanhados em encontros semanais e quinzenais.

A especificação da primeira entrega está em `docs/SPEC-MVP-1.md`. Leia antes de qualquer tarefa.

## Princípios que não mudam

1. **A IA sugere, Victor aprova, só então o membro vê.** Todo conteúdo gerado por IA (rascunho de plano, sugestão de conexão) nasce com status `rascunho` e fica invisível ao membro até um admin publicar. Toda sugestão e decisão fica registrada na tabela `aprovacoes`.
2. **Números de viabilidade saem do motor de cálculo, nunca da IA.** O motor está em `referencia/prototipo-viabilidade.html` (funções puras `simular`, `matriz27`, `irr`, `mirr`, `npv`). Ao portar, mantenha a lógica idêntica e cubra com testes que comparem resultados com o protótipo.
3. **A plataforma funciona sem a IA.** Se a API da Anthropic falhar ou demorar, nada trava: o membro continua usando tudo, e o admin pode montar o plano à mão. Chamadas de IA rodam em segundo plano, com timeout e nova tentativa.
4. **O membro não edita conteúdo curado.** Ele marca itens como concluídos, anexa evidências e deixa notas. Texto, prazo e ordem do plano só o admin altera.
5. **LGPD e confidencialidade.** Dados de membros e empreendimentos são sigilosos. Toda tabela tem Row Level Security no Supabase. Membro só vê o que é dele ou dos empreendimentos de que participa. Consentimentos são registrados com data. Nunca registrar dados pessoais em logs.
6. **Simples antes de bonito.** Primeiro o ciclo funcionando; cidade 3D, gamificação e marketplace vêm depois.

## Stack

- Next.js (App Router) + TypeScript, interface em português do Brasil.
- Supabase: Postgres, Auth (login por link mágico no e-mail), Storage (anexos e documentos), Row Level Security. Região São Paulo.
- Hospedagem: Vercel. Domínio previsto: nexia.ecossistemavs.com.br.
- E-mail transacional: Resend.
- IA: API da Anthropic, chamada só no servidor.
- Cobrança (fase seguinte): Asaas.

## Identidade visual

Padrão do Ecossistema VS: preto `#0A0A0A`, amarelo `#E7BC21`, claro `#F5F3EE`, cinzas quentes. Fonte Red Hat Display. Cantos retos, 4px em cards. Tom: sócio experiente, direto, sem economês.

## Como trabalhar

- Entregas pequenas, uma funcionalidade por vez, na ordem dos marcos da especificação.
- Migrações do banco em `supabase/migrations`, sempre com as políticas de RLS junto.
- Segredos só em variáveis de ambiente (`.env.local`, nunca no repositório). Mantenha `.env.example` atualizado.
- Testes para regras de permissão, cálculo e mudança de status.
- Antes de concluir uma tarefa, rode lint, testes e build.
- Em caso de dúvida sobre regra de negócio, pergunte em vez de supor.

## Glossário

- **Dossiê:** ficha de onboarding do membro.
- **Mesa do Victor:** fila de tudo que espera aprovação do admin.
- **Board NEXIA:** encontro quinzenal de acompanhamento dos planos.
- **Live NEXIA:** encontro semanal (quarta, 18h) de casos e aulas.
- **Conselho da Cúpula:** encontro fechado de quem está na Cúpula (fase posterior).
- **Empreendimento:** projeto imobiliário; um membro pode ter vários, e um empreendimento pode ter vários membros.

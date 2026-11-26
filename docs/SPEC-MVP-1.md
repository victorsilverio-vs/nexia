# NEXIA — Especificação da primeira entrega (MVP-1)

Objetivo: o ciclo central funcionando com os membros fundadores. O membro entra, preenche o dossiê, Victor publica o plano na reunião inicial, o membro executa e registra, a equipe confirma, e dúvidas viram pauta do board.

Fora desta entrega: conexões automáticas, negócios e taxa, Score VS, Hub de parceiros, Academia, NEXIA Maps, Cúpula, cobrança integrada, ferramentas de mercado e business plan. A viabilidade entra no marco 6.

## Perfis

| Perfil | Pode |
| --- | --- |
| admin (Victor) | Tudo. Única pessoa que publica planos. |
| equipe (Lola, Marianna, André) | Ver membros, confirmar itens concluídos, cadastrar membros, editar agenda. Não publica plano. |
| membro | Ver e editar o próprio dossiê até enviar; ver planos publicados dos empreendimentos de que participa; marcar itens, anexar evidência, deixar notas. |

Planos de assinatura do membro (só registro, sem cobrança nesta fase): `nexia`, `advisor`, `advisor_private`.

## Fluxo

1. **Convite.** Equipe cadastra o membro (nome, e-mail, WhatsApp, plano). O membro recebe e-mail com link de acesso.
2. **Dossiê.** Perguntas guiadas, uma seção por tela, barra de progresso, salvamento automático. Seções:
   - Pessoa: cidade/UF, formação, profissão, experiência em obra ou incorporação, empresa e CNPJ.
   - Momento: estágio (só ideia, tem terreno, tem projeto, já incorporou), objetivo em 12 meses, horas por semana.
   - Empreendimento(s): nome, cidade/UF, área do terreno, situação do terreno (em vista, amarrado, permutado, comprado), tipologia pensada, se tem projeto ou estudos, fotos e documentos.
   - Capital: faixa de capital próprio, se tem sócios ou investidores.
   - Rede: o que sabe fazer, o que pode ensinar, o que oferece e o que procura.
   - Consentimentos: LGPD, uso dos dados para sugerir conexões, exibição futura no mapa.
3. **Envio.** Ao enviar: o dossiê trava para o membro; a IA gera em segundo plano um rascunho de plano por empreendimento; o membro vê o link de agendamento da reunião com Victor (URL externa configurável, ex.: Google Agenda); a Mesa do Victor ganha uma pendência.
4. **Rascunho da IA.** Plano nas 7 etapas, cada etapa com 2 a 6 itens. Cada item: título, observação, recomendação, prazo sugerido. A IA recebe o dossiê e instruções fixas (personalizar ao perfil: quem não tem terreno pode começar pela rede de contatos, não por "buscar terreno"). Falhou: a pendência aparece com plano vazio para Victor montar à mão.
5. **Reunião e publicação.** Victor abre o rascunho na Mesa, edita na tela (adicionar, remover, reordenar, mudar textos e prazos) e clica em publicar. O plano vira versão 1, o membro recebe e-mail e passa a ver.
6. **Execução.** O membro marca "concluí" e anexa evidência (arquivo ou link). A equipe confirma ou devolve com comentário. Em qualquer item o membro deixa nota do tipo observação, dúvida ou necessidade.
7. **Board.** Tela "Pré-pauta do próximo board": dúvidas e necessidades abertas, agrupadas por membro e etapa. O admin registra a resposta na nota e marca como discutida.
8. **Revisões.** Admin pode editar um plano publicado; cada publicação gera nova versão e avisa o membro.

## As 7 etapas

1. Oportunidades e terrenos
2. Mercado e produto
3. Viabilidade e estruturação
4. Capital e investimentos
5. Projetos e aprovações
6. Comercialização
7. Construção e execução

## Modelo de dados (mínimo)

- `perfis` (id = auth.users.id, nome, whatsapp, papel: admin|equipe|membro, plano_assinatura, criado_em)
- `dossies` (membro_id, respostas jsonb, status: rascunho|enviado, enviado_em)
- `consentimentos` (membro_id, tipo, aceito, data)
- `empreendimentos` (id, nome, cidade, uf, tipologia, situacao_terreno, etapa_atual, criado_em)
- `participacoes` (membro_id, empreendimento_id, papel: titular|socio|parceiro_projeto, percentual) — relação N:N
- `planos` (id, empreendimento_id, versao, status: rascunho_ia|publicado, publicado_por, publicado_em)
- `itens_plano` (id, plano_id, etapa 1–7, ordem, titulo, observacao, recomendacao, prazo, status: a_fazer|feito_membro|confirmado|devolvido)
- `evidencias` (item_id, autor_id, arquivo_path ou url, criado_em)
- `notas` (item_id, autor_id, tipo: observacao|duvida|necessidade, texto, resposta, discutida_em)
- `encontros` (id, tipo: live|board|diagnostico, data, link_zoom)
- `aprovacoes` (objeto_tipo, objeto_id, sugestao_ia jsonb, decisao, decidido_por, decidido_em)
- `notificacoes` (destinatario_id, gatilho, canal, enviada_em)

RLS: membro lê empreendimentos, planos publicados, itens e notas onde existe participação dele; nunca lê `rascunho_ia` nem `aprovacoes`. Equipe lê tudo, escreve status de itens e cadastros. Admin tudo.

## E-mails desta entrega

| Gatilho | Para | Quando |
| --- | --- | --- |
| Convite | Membro | Ao cadastrar |
| Dossiê incompleto | Membro | 2 dias após o convite; a cada 3 dias, até 3 vezes |
| Dossiê enviado | Victor | Na hora |
| Plano publicado ou revisado | Membro | Na hora |
| Item com prazo chegando | Membro | 3 dias antes, no dia e 2 dias depois |
| Itens para confirmar | Equipe | Resumo diário |
| Pendências na Mesa | Victor | Resumo diário |
| Live ou board | Membros | 1 dia antes e 1 hora antes |

## Marcos

1. Projeto base: Next.js, Supabase, login por link mágico, perfis e papéis, layout na identidade VS, deploy na Vercel.
2. Cadastro de membros pela equipe e dossiê completo com salvamento automático e envio.
3. Empreendimentos e participações (N:N) a partir do dossiê.
4. Mesa do Victor e editor de plano (criar à mão, editar, publicar, versões).
5. Rascunho do plano pela IA, em segundo plano, com falha tratada.
6. Execução: concluir, evidência, confirmar ou devolver, notas e pré-pauta do board.
7. E-mails e lembretes.
8. Viabilidade: portar o motor de `referencia/prototipo-viabilidade.html`, salvar estudos por empreendimento, modo travado quando o admin congela.

## Critérios de aceite

- Um membro nunca vê rascunho de IA nem dados de empreendimento de que não participa (testado).
- Com a API de IA desligada, todo o fluxo funciona; o plano é montado à mão.
- O motor portado reproduz os resultados do protótipo para o exemplo do edifício ECO.
- Funciona bem no celular.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CampoAnexos } from "@/components/dossie/anexos";
import { Campo } from "@/components/dossie/campo";
import estilos from "@/components/dossie/dossie.module.css";
import {
  SECOES,
  TIPOS_CONSENTIMENTO,
  type SecaoLista,
  type SecaoSimples,
  type TipoConsentimento,
  type Valores,
} from "@/lib/dossie/perguntas";
import { dossieVazio, pendencias, progresso, visivel, type ItemLista, type Respostas } from "@/lib/dossie/validacao";
import { enviarDossie, registrarConsentimento, salvarSecao } from "./acoes";

type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

type Props = {
  membroId: string;
  respostasIniciais: Respostas;
  consentimentosIniciais: Partial<Record<TipoConsentimento, boolean>>;
  secaoInicial?: string;
  devolvido: boolean;
};

const ESPERA_SALVAR_MS = 900;
const ESPERA_NOVA_TENTATIVA_MS = 5000;

export function AssistenteDossie({ membroId, respostasIniciais, consentimentosIniciais, secaoInicial, devolvido }: Props) {
  const router = useRouter();
  const [respostas, setRespostas] = useState<Respostas>(respostasIniciais);
  const [passo, setPasso] = useState(() => Math.max(0, SECOES.findIndex((s) => s.id === secaoInicial)));
  // Boas-vindas só para quem ainda não começou (e não chegou por um link direto para uma etapa).
  const [mostrarBoasVindas, setMostrarBoasVindas] = useState(() => !secaoInicial && dossieVazio(respostasIniciais));
  const [salvamento, setSalvamento] = useState<EstadoSalvamento>("ocioso");
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const respostasRef = useRef(respostas);
  const sujas = useRef(new Set<string>());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvandoAgora = useRef<Promise<void> | null>(null);
  // Referência estável para a nova tentativa agendada chamar a versão atual da função.
  const salvarRef = useRef<() => Promise<void>>(async () => {});

  const salvarPendentes = useCallback(async () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    if (salvandoAgora.current) await salvandoAgora.current;
    if (!sujas.current.size) return;

    const tarefa = (async () => {
      setSalvamento("salvando");
      for (const secaoId of Array.from(sujas.current)) {
        sujas.current.delete(secaoId);
        const resultado = await salvarSecao(secaoId, respostasRef.current[secaoId]).catch(() => ({
          ok: false as const,
          erro: "Sem conexão. Tentaremos de novo.",
        }));
        if (!resultado.ok) {
          sujas.current.add(secaoId);
          setSalvamento("erro");
          setErroSalvar(resultado.erro);
          temporizador.current = setTimeout(() => void salvarRef.current(), ESPERA_NOVA_TENTATIVA_MS);
          return;
        }
      }
      setErroSalvar(null);
      setSalvamento(sujas.current.size ? "salvando" : "salvo");
    })();
    salvandoAgora.current = tarefa;
    await tarefa;
    salvandoAgora.current = null;
  }, []);

  useEffect(() => {
    salvarRef.current = salvarPendentes;
  }, [salvarPendentes]);

  const alterarSecao = useCallback(
    (secaoId: string, novoValor: unknown) => {
      setRespostas((anterior) => {
        const proximo = { ...anterior, [secaoId]: novoValor };
        respostasRef.current = proximo;
        return proximo;
      });
      sujas.current.add(secaoId);
      setSalvamento("salvando");
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void salvarPendentes(), ESPERA_SALVAR_MS);
    },
    [salvarPendentes],
  );

  // Avisa antes de fechar a aba com alterações ainda não salvas.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (sujas.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

  function irPara(indice: number) {
    void salvarPendentes();
    setPasso(indice);
    const url = new URL(window.location.href);
    url.searchParams.set("secao", SECOES[indice].id);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }

  const secao = SECOES[passo];
  const percentual = progresso(respostas);

  if (mostrarBoasVindas) {
    return <BoasVindas aoComecar={() => setMostrarBoasVindas(false)} />;
  }

  return (
    <div className={estilos.assistente}>
      {devolvido ? (
        <p className={estilos.aviso} role="status">
          A equipe devolveu seu dossiê para ajustes. Revise e envie de novo.
        </p>
      ) : null}

      <div className={estilos.topo}>
        <div className={estilos.progresso} aria-label={`Dossiê ${percentual}% preenchido`}>
          <div className={estilos.barra} style={{ width: `${percentual}%` }} />
        </div>
        <div className={estilos.linhaStatus}>
          <span>
            Etapa {passo + 1} de {SECOES.length} · {percentual}% preenchido
          </span>
          <span className={estilos.statusSalvo} aria-live="polite">
            {salvamento === "salvando" ? "Salvando…" : salvamento === "salvo" ? "Salvo" : salvamento === "erro" ? erroSalvar : ""}
          </span>
        </div>
        <nav aria-label="Etapas do dossiê" className={estilos.etapas}>
          {SECOES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === passo ? "step" : undefined}
              className={i === passo ? estilos.etapaAtual : undefined}
              onClick={() => irPara(i)}
            >
              {i + 1}. {s.titulo}
            </button>
          ))}
        </nav>
      </div>

      <section className={estilos.secao}>
        <h1>{secao.titulo}</h1>
        <p className={estilos.descricao}>{secao.descricao}</p>

        {secao.tipo === "simples" ? (
          <SecaoSimplesForm
            secao={secao}
            valores={(respostas[secao.id] as Valores) ?? {}}
            aoMudar={(v) => alterarSecao(secao.id, v)}
          />
        ) : secao.tipo === "lista" ? (
          <SecaoListaForm
            secao={secao}
            membroId={membroId}
            itens={(respostas[secao.id] as ItemLista[]) ?? []}
            aoMudar={(v) => alterarSecao(secao.id, v)}
          />
        ) : (
          <EtapaEnvio
            respostas={respostas}
            consentimentosIniciais={consentimentosIniciais}
            irPara={(id) => irPara(SECOES.findIndex((s) => s.id === id))}
            antesDeEnviar={salvarPendentes}
            aoEnviar={() => router.refresh()}
          />
        )}
      </section>

      <div className={estilos.navegacao}>
        <button type="button" className="botao" disabled={passo === 0} onClick={() => irPara(passo - 1)}>
          Voltar
        </button>
        {passo < SECOES.length - 1 ? (
          <button type="button" className="botao botao-primario" onClick={() => irPara(passo + 1)}>
            Continuar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BoasVindas({ aoComecar }: { aoComecar: () => void }) {
  return (
    <section className={`cartao ${estilos.boasVindas}`}>
      {/* Futuro: vídeo de boas-vindas do Victor aqui. */}
      <h1>Olá, tudo bem?</h1>
      <p>Aqui a gente quer conhecer você: quem você é, onde está hoje, aonde quer chegar e o que você tem em mãos.</p>
      <p>
        É um questionário bem detalhado, e é a partir dele que montamos o seu plano de ação. Por isso,{" "}
        <strong>comece quando tiver mais ou menos meia hora para responder com calma.</strong>
      </p>
      <p>Suas respostas ficam salvas automaticamente. Se precisar parar, é só voltar depois e continuar de onde parou.</p>
      <button type="button" className="botao botao-primario" onClick={aoComecar}>
        Começar
      </button>
    </section>
  );
}

function SecaoSimplesForm({
  secao,
  valores,
  aoMudar,
}: {
  secao: SecaoSimples;
  valores: Valores;
  aoMudar: (v: Valores) => void;
}) {
  return (
    <div className={estilos.perguntas}>
      {secao.perguntas
        .filter((p) => visivel(p, valores))
        .map((p) => (
          <Campo
            key={p.id}
            pergunta={p}
            valor={valores[p.id]}
            prefixoId={secao.id}
            aoMudar={(v) => aoMudar({ ...valores, [p.id]: v })}
          />
        ))}
    </div>
  );
}

function SecaoListaForm({
  secao,
  itens,
  membroId,
  aoMudar,
}: {
  secao: SecaoLista;
  itens: ItemLista[];
  membroId: string;
  aoMudar: (v: ItemLista[]) => void;
}) {
  const atualizar = (indice: number, item: ItemLista) => aoMudar(itens.map((it, i) => (i === indice ? item : it)));

  return (
    <div className={estilos.perguntas}>
      {itens.map((item, indice) => (
        <article key={item.id} className={estilos.item}>
          <header className={estilos.cabecalhoItem}>
            <h2>
              {secao.rotuloItem} {indice + 1}
              {typeof item.nome === "string" && item.nome ? ` · ${item.nome}` : ""}
            </h2>
            <button
              type="button"
              className={estilos.linkBotao}
              onClick={() => {
                if (window.confirm(`Remover ${secao.rotuloItem.toLowerCase()} ${indice + 1}?`)) {
                  aoMudar(itens.filter((_, i) => i !== indice));
                }
              }}
            >
              Remover
            </button>
          </header>
          {secao.perguntas
            .filter((p) => visivel(p, item))
            .map((p) =>
              p.tipo === "anexos" ? (
                <CampoAnexos
                  key={p.id}
                  pergunta={p}
                  valor={item[p.id]}
                  membroId={membroId}
                  pasta={item.id}
                  prefixoId={item.id}
                  aoMudar={(v) => atualizar(indice, { ...item, [p.id]: v })}
                />
              ) : (
                <Campo
                  key={p.id}
                  pergunta={p}
                  valor={item[p.id]}
                  prefixoId={item.id}
                  aoMudar={(v) => atualizar(indice, { ...item, [p.id]: v })}
                />
              ),
            )}
        </article>
      ))}

      {itens.length < secao.maxItens ? (
        <button
          type="button"
          className="botao"
          onClick={() => aoMudar([...itens, { id: crypto.randomUUID() }])}
        >
          + Adicionar {secao.rotuloItem.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}

function EtapaEnvio({
  respostas,
  consentimentosIniciais,
  irPara,
  antesDeEnviar,
  aoEnviar,
}: {
  respostas: Respostas;
  consentimentosIniciais: Partial<Record<TipoConsentimento, boolean>>;
  irPara: (secaoId: string) => void;
  antesDeEnviar: () => Promise<void>;
  aoEnviar: () => void;
}) {
  const [consentimentos, setConsentimentos] = useState(consentimentosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const faltando = pendencias(respostas);
  const lgpdOk = consentimentos.lgpd === true;

  async function alternar(tipo: TipoConsentimento, aceito: boolean) {
    setConsentimentos((c) => ({ ...c, [tipo]: aceito }));
    const r = await registrarConsentimento(tipo, aceito);
    if (!r.ok) {
      setConsentimentos((c) => ({ ...c, [tipo]: !aceito }));
      setErro(r.erro);
    }
  }

  async function enviar() {
    if (!window.confirm("Depois de enviado, o dossiê não pode mais ser editado por você. Enviar agora?")) return;
    setEnviando(true);
    setErro(null);
    await antesDeEnviar();
    const r = await enviarDossie();
    setEnviando(false);
    if (r.ok) aoEnviar();
    else setErro(r.erro);
  }

  return (
    <div className={estilos.perguntas}>
      {faltando.length ? (
        <div className={estilos.pendencias}>
          <h2>Falta responder</h2>
          <ul>
            {faltando.map((p) => (
              <li key={`${p.secaoId}-${p.item ?? 0}-${p.perguntaId}`}>
                <button type="button" className={estilos.linkBotao} onClick={() => irPara(p.secaoId)}>
                  {p.secaoTitulo}
                  {p.item ? ` (${p.item})` : ""}: {p.rotulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={estilos.tudoCerto}>Todas as perguntas obrigatórias estão respondidas.</p>
      )}

      <fieldset className={estilos.campo}>
        <legend className={estilos.rotulo}>Consentimentos</legend>
        {TIPOS_CONSENTIMENTO.map((c) => (
          <label key={c.tipo} className={`${estilos.opcao} ${consentimentos[c.tipo] ? estilos.marcada : ""}`}>
            <input
              type="checkbox"
              checked={consentimentos[c.tipo] === true}
              onChange={(e) => void alternar(c.tipo, e.target.checked)}
            />
            <span>
              {c.rotulo}
              {c.obrigatorio ? <span className={estilos.obrigatoria}> *</span> : null}
              {c.tipo === "lgpd" ? (
                <>
                  {" "}
                  <a href="/privacidade" target="_blank" rel="noreferrer">
                    Ler a política
                  </a>
                </>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      {erro ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <button
        type="button"
        className="botao botao-primario"
        disabled={enviando || faltando.length > 0 || !lgpdOk}
        onClick={() => void enviar()}
      >
        {enviando ? "Enviando…" : "Enviar dossiê"}
      </button>
      {!lgpdOk && !faltando.length ? (
        <p className={estilos.ajuda}>Para enviar, aceite a Política de Privacidade.</p>
      ) : null}
    </div>
  );
}

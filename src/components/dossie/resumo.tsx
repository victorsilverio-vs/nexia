import { SECOES, rotuloOpcao, type Pergunta, type Valores } from "@/lib/dossie/perguntas";
import {
  formatarCnpj,
  formatarMoeda,
  itensSecao,
  vazio,
  valoresSecao,
  visivel,
  type Anexo,
  type Respostas,
} from "@/lib/dossie/validacao";
import estilos from "./dossie.module.css";

function formatar(pergunta: Pergunta, valor: unknown, links?: Record<string, string>) {
  switch (pergunta.tipo) {
    case "simNao":
      return valor ? "Sim" : "Não";
    case "escolha":
      return rotuloOpcao(pergunta, valor);
    case "multipla":
      return (valor as string[]).map((v) => rotuloOpcao(pergunta, v)).join(", ");
    case "moeda":
      return formatarMoeda(Number(valor));
    case "numero":
      return `${Number(valor).toLocaleString("pt-BR")}${pergunta.sufixo ? ` ${pergunta.sufixo}` : ""}`;
    case "cnpj":
      return formatarCnpj(String(valor));
    case "anexos":
      return (
        <ul className={estilos.anexos}>
          {(valor as Anexo[]).map((a) => (
            <li key={a.caminho}>
              {links?.[a.caminho] ? (
                <a href={links[a.caminho]} target="_blank" rel="noreferrer">
                  {a.nome}
                </a>
              ) : (
                a.nome
              )}
            </li>
          ))}
        </ul>
      );
    default:
      return <span className={estilos.textoLivre}>{String(valor)}</span>;
  }
}

function Respondidas({ perguntas, valores, links }: { perguntas: Pergunta[]; valores: Valores; links?: Record<string, string> }) {
  const linhas = perguntas.filter((p) => visivel(p, valores) && !vazio(valores[p.id]));
  if (!linhas.length) return <p className={estilos.ajuda}>Nada respondido.</p>;
  return (
    <dl className={estilos.resumo}>
      {linhas.map((p) => (
        <div key={p.id}>
          <dt>{p.rotulo}</dt>
          <dd>{formatar(p, valores[p.id], links)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Dossiê em modo leitura. `links` mapeia caminho do anexo → URL assinada para download. */
export function ResumoDossie({ respostas, links }: { respostas: Respostas; links?: Record<string, string> }) {
  return (
    <div className={estilos.resumoDossie}>
      {SECOES.map((secao) => {
        if (secao.tipo === "consentimentos") return null;
        return (
          <section key={secao.id} className="cartao">
            <h2>{secao.titulo}</h2>
            {secao.tipo === "simples" ? (
              <Respondidas perguntas={secao.perguntas} valores={valoresSecao(respostas, secao)} links={links} />
            ) : itensSecao(respostas, secao).length ? (
              itensSecao(respostas, secao).map((item, i) => (
                <div key={item.id} className={estilos.itemResumo}>
                  <h3>
                    {secao.rotuloItem} {i + 1}
                  </h3>
                  <Respondidas perguntas={secao.perguntas} valores={item} links={links} />
                </div>
              ))
            ) : (
              <p className={estilos.ajuda}>Nenhum cadastrado.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

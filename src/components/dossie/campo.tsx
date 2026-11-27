"use client";

import { UFS, type Pergunta } from "@/lib/dossie/perguntas";
import { formatarCnpj } from "@/lib/dossie/validacao";
import estilos from "./dossie.module.css";

type Props = {
  pergunta: Pergunta;
  valor: unknown;
  aoMudar: (valor: unknown) => void;
  prefixoId: string;
};

function Rotulo({ pergunta, htmlFor }: { pergunta: Pergunta; htmlFor?: string }) {
  const conteudo = (
    <>
      {pergunta.rotulo}
      {pergunta.obrigatoria ? <span className={estilos.obrigatoria}> *</span> : null}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className={estilos.rotulo}>
      {conteudo}
    </label>
  ) : (
    <legend className={estilos.rotulo}>{conteudo}</legend>
  );
}

function Ajuda({ texto }: { texto?: string }) {
  return texto ? <p className={estilos.ajuda}>{texto}</p> : null;
}

const texto = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Campo de uma pergunta do dossiê (exceto anexos, que têm componente próprio). */
export function Campo({ pergunta, valor, aoMudar, prefixoId }: Props) {
  const id = `${prefixoId}-${pergunta.id}`;

  switch (pergunta.tipo) {
    case "texto":
    case "cnpj":
      return (
        <div className={estilos.campo}>
          <Rotulo pergunta={pergunta} htmlFor={id} />
          <Ajuda texto={pergunta.ajuda} />
          <input
            id={id}
            type="text"
            value={pergunta.tipo === "cnpj" ? formatarCnpj(texto(valor)) : texto(valor)}
            inputMode={pergunta.tipo === "cnpj" ? "numeric" : undefined}
            placeholder={pergunta.tipo === "texto" ? pergunta.placeholder : "00.000.000/0000-00"}
            maxLength={pergunta.tipo === "cnpj" ? 18 : (pergunta.max ?? 300)}
            onChange={(e) => aoMudar(pergunta.tipo === "cnpj" ? e.target.value.replace(/\D/g, "") : e.target.value)}
          />
        </div>
      );

    case "textoLongo":
      return (
        <div className={estilos.campo}>
          <Rotulo pergunta={pergunta} htmlFor={id} />
          <Ajuda texto={pergunta.ajuda} />
          <textarea
            id={id}
            rows={4}
            value={texto(valor)}
            placeholder={pergunta.placeholder}
            maxLength={pergunta.max ?? 3000}
            onChange={(e) => aoMudar(e.target.value)}
          />
        </div>
      );

    case "numero":
    case "moeda":
      return (
        <div className={estilos.campo}>
          <Rotulo pergunta={pergunta} htmlFor={id} />
          <Ajuda texto={pergunta.ajuda} />
          <div className={estilos.comUnidade}>
            {pergunta.tipo === "moeda" ? <span className={estilos.unidade}>R$</span> : null}
            <input
              id={id}
              type="text"
              inputMode="decimal"
              value={texto(valor)}
              onChange={(e) => aoMudar(e.target.value.replace(/[^\d,.]/g, ""))}
            />
            {pergunta.tipo === "numero" && pergunta.sufixo ? (
              <span className={estilos.unidade}>{pergunta.sufixo}</span>
            ) : null}
          </div>
        </div>
      );

    case "uf":
      return (
        <div className={estilos.campo}>
          <Rotulo pergunta={pergunta} htmlFor={id} />
          <select id={id} value={texto(valor)} onChange={(e) => aoMudar(e.target.value || undefined)}>
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      );

    case "simNao":
      return (
        <fieldset className={estilos.campo}>
          <Rotulo pergunta={pergunta} />
          <Ajuda texto={pergunta.ajuda} />
          <div className={estilos.simNao}>
            {[
              { v: true, r: "Sim" },
              { v: false, r: "Não" },
            ].map((o) => (
              <label key={o.r} className={`${estilos.opcao} ${valor === o.v ? estilos.marcada : ""}`}>
                <input type="radio" name={id} checked={valor === o.v} onChange={() => aoMudar(o.v)} />
                {o.r}
              </label>
            ))}
          </div>
        </fieldset>
      );

    case "escolha":
      return (
        <fieldset className={estilos.campo}>
          <Rotulo pergunta={pergunta} />
          <Ajuda texto={pergunta.ajuda} />
          <div className={estilos.opcoes}>
            {pergunta.opcoes.map((o) => (
              <label key={o.valor} className={`${estilos.opcao} ${valor === o.valor ? estilos.marcada : ""}`}>
                <input type="radio" name={id} checked={valor === o.valor} onChange={() => aoMudar(o.valor)} />
                {o.rotulo}
              </label>
            ))}
          </div>
        </fieldset>
      );

    case "multipla": {
      const marcados = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <fieldset className={estilos.campo}>
          <Rotulo pergunta={pergunta} />
          <Ajuda texto={pergunta.ajuda ?? "Marque quantas quiser."} />
          <div className={estilos.opcoes}>
            {pergunta.opcoes.map((o) => {
              const marcado = marcados.includes(o.valor);
              return (
                <label key={o.valor} className={`${estilos.opcao} ${marcado ? estilos.marcada : ""}`}>
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() =>
                      aoMudar(marcado ? marcados.filter((m) => m !== o.valor) : [...marcados, o.valor])
                    }
                  />
                  {o.rotulo}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    case "anexos":
      return null;
  }
}

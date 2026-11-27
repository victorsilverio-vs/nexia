"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PLANOS_ASSINATURA, ROTULO_PLANO } from "@/lib/auth/papeis";
import { cadastrarMembro, type EstadoCadastro } from "../acoes";
import estilos from "../equipe.module.css";

export function FormularioCadastro() {
  // Trocar a chave recria o formulário do zero (inclusive o estado da ação) para cadastrar outro.
  const [chave, setChave] = useState(0);
  return <Formulario key={chave} aoCadastrarOutro={() => setChave((c) => c + 1)} />;
}

function Formulario({ aoCadastrarOutro }: { aoCadastrarOutro: () => void }) {
  const [estado, acao, enviando] = useActionState<EstadoCadastro, FormData>(cadastrarMembro, { tipo: "inicial" });

  if (estado.tipo === "ok") {
    return (
      <div className={estilos.formulario}>
        <p className={estilos.mensagemOk} role="status">
          {estado.nome} foi cadastrado.{" "}
          {estado.emailEnviado ? "O convite foi enviado por e-mail." : null}
        </p>
        {!estado.emailEnviado ? (
          <>
            <p className={estilos.mensagemErro}>
              O e-mail de convite não saiu (o envio de e-mails ainda não está configurado). Mande este link ao membro pelo
              WhatsApp:
            </p>
            <div className={estilos.copiar}>
              <input type="text" readOnly value={estado.linkEntrar} onFocus={(e) => e.target.select()} />
              <button type="button" className="botao" onClick={() => navigator.clipboard?.writeText(estado.linkEntrar)}>
                Copiar
              </button>
            </div>
          </>
        ) : null}
        <div className={estilos.acoes}>
          <Link href={`/equipe/membros/${estado.membroId}`} className="botao">
            Ver membro
          </Link>
          <button type="button" className="botao botao-primario" onClick={aoCadastrarOutro}>
            Cadastrar outro
          </button>
        </div>
      </div>
    );
  }

  const erros = estado.tipo === "erro" ? (estado.erros ?? {}) : {};
  const v = estado.tipo === "erro" ? (estado.valores ?? {}) : {};

  return (
    <form action={acao} className={estilos.formulario}>
      <label>
        Nome completo
        <input name="nome" type="text" required maxLength={120} autoComplete="off" defaultValue={v.nome} />
        {erros.nome ? <span className={estilos.erroCampo}>{erros.nome}</span> : null}
      </label>
      <label>
        E-mail
        <input name="email" type="email" inputMode="email" required maxLength={200} autoComplete="off" defaultValue={v.email} />
        {erros.email ? <span className={estilos.erroCampo}>{erros.email}</span> : null}
      </label>
      <label>
        WhatsApp
        <input name="whatsapp" type="tel" inputMode="tel" placeholder="(62) 99999-0000" defaultValue={v.whatsapp} />
        {erros.whatsapp ? <span className={estilos.erroCampo}>{erros.whatsapp}</span> : null}
      </label>
      <label>
        Plano
        <select name="plano" required defaultValue={v.plano ?? ""} key={v.plano ?? ""}>
          <option value="" disabled>
            Selecione
          </option>
          {PLANOS_ASSINATURA.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PLANO[p]}
            </option>
          ))}
        </select>
        {erros.plano ? <span className={estilos.erroCampo}>{erros.plano}</span> : null}
      </label>

      {estado.tipo === "erro" ? (
        <p className={estilos.mensagemErro} role="alert">
          {estado.mensagem}
        </p>
      ) : null}

      <button type="submit" className="botao botao-primario" disabled={enviando}>
        {enviando ? "Cadastrando…" : "Cadastrar e enviar convite"}
      </button>
    </form>
  );
}

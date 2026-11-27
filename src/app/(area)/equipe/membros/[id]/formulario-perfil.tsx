"use client";

import { useActionState } from "react";
import { PAPEIS, PLANOS_ASSINATURA, ROTULO_PAPEL, ROTULO_PLANO, type Papel, type PlanoAssinatura } from "@/lib/auth/papeis";
import { atualizarPerfil, type ResultadoSimples } from "../../acoes";
import estilos from "../../equipe.module.css";

type Props = {
  membroId: string;
  nome: string;
  whatsapp: string;
  plano: PlanoAssinatura | null;
  papel: Papel;
  podeMudarPapel: boolean;
};

export function FormularioPerfil({ membroId, nome, whatsapp, plano, papel, podeMudarPapel }: Props) {
  const [estado, acao, salvando] = useActionState<ResultadoSimples | null, FormData>(
    atualizarPerfil.bind(null, membroId),
    null,
  );

  return (
    <form action={acao} className={estilos.formulario}>
      <label>
        Nome
        <input name="nome" type="text" defaultValue={nome} required maxLength={120} />
      </label>
      <label>
        WhatsApp
        <input name="whatsapp" type="tel" inputMode="tel" defaultValue={whatsapp} placeholder="(62) 99999-0000" />
      </label>
      <label>
        Plano
        <select name="plano" defaultValue={plano ?? ""}>
          <option value="">Sem plano</option>
          {PLANOS_ASSINATURA.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PLANO[p]}
            </option>
          ))}
        </select>
      </label>
      {podeMudarPapel ? (
        <label>
          Papel
          <select name="papel" defaultValue={papel}>
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {estado ? (
        <p className={estado.ok ? estilos.mensagemOk : estilos.mensagemErro} role="status">
          {estado.ok ? estado.mensagem : estado.erro}
        </p>
      ) : null}
      <button type="submit" className="botao" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar cadastro"}
      </button>
    </form>
  );
}

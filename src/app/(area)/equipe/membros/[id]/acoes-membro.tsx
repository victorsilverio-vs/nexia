"use client";

import { useState, useTransition } from "react";
import { devolverDossie, reenviarConvite, type ResultadoSimples } from "../../acoes";
import estilos from "../../equipe.module.css";

export function AcoesMembro({ membroId, dossieEnviado }: { membroId: string; dossieEnviado: boolean }) {
  const [resultado, setResultado] = useState<ResultadoSimples | null>(null);
  const [pendente, iniciar] = useTransition();

  const executar = (acao: () => Promise<ResultadoSimples>) => iniciar(async () => setResultado(await acao()));

  return (
    <>
      <div className={estilos.acoes}>
        {dossieEnviado ? (
          <button
            type="button"
            className="botao"
            disabled={pendente}
            onClick={() => {
              if (window.confirm("Devolver o dossiê para o membro corrigir? Ele volta a poder editar e precisa enviar de novo.")) {
                executar(() => devolverDossie(membroId));
              }
            }}
          >
            Devolver dossiê
          </button>
        ) : null}
        <button type="button" className="botao" disabled={pendente} onClick={() => executar(() => reenviarConvite(membroId))}>
          Reenviar convite
        </button>
      </div>
      {resultado ? (
        <p className={resultado.ok ? estilos.mensagemOk : estilos.mensagemErro} role="status" style={{ marginTop: 12 }}>
          {resultado.ok ? resultado.mensagem : resultado.erro}
        </p>
      ) : null}
    </>
  );
}

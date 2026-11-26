"use client";

import { useActionState } from "react";
import { enviarLinkMagico, type EstadoEntrar } from "./acoes";
import estilos from "./entrar.module.css";

export function FormularioEntrar({ proximo }: { proximo?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrar, FormData>(enviarLinkMagico, { tipo: "inicial" });

  if (estado.tipo === "enviado") {
    return (
      <div className={estilos.enviado} role="status">
        <h2>Confira seu e-mail</h2>
        <p>
          Se <strong>{estado.email}</strong> estiver cadastrado na NEXIA, você vai receber um link de acesso em
          instantes. Abra o link neste aparelho ou em qualquer outro.
        </p>
        <p className={estilos.dica}>Não chegou? Olhe a caixa de spam ou promoções. O link vale por 1 hora.</p>
      </div>
    );
  }

  return (
    <form action={acao} className={estilos.formulario}>
      <label htmlFor="email">Seu e-mail</label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="voce@empresa.com.br"
        aria-invalid={estado.tipo === "erro"}
        aria-describedby={estado.tipo === "erro" ? "erro-entrar" : undefined}
      />
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}
      {estado.tipo === "erro" ? (
        <p id="erro-entrar" className={estilos.erro} role="alert">
          {estado.mensagem}
        </p>
      ) : null}
      <button type="submit" className="botao botao-primario" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber link de acesso"}
      </button>
    </form>
  );
}

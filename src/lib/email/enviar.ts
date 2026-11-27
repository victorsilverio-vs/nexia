import "server-only";

export type ResultadoEmail = { enviado: true } | { enviado: false; motivo: "nao_configurado" | "falha" };

/**
 * Envia um e-mail pelo Resend. Nunca lança erro: a plataforma segue funcionando sem e-mail.
 * Não registra endereço nem conteúdo em log (LGPD).
 */
export async function enviarEmail(para: string, assunto: string, html: string): Promise<ResultadoEmail> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return { enviado: false, motivo: "nao_configurado" };

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (resposta.ok) return { enviado: true };
      console.error("[email] Resend recusou o envio", { status: resposta.status, tentativa });
      if (resposta.status < 500) break; // erro nosso (chave, remetente): não adianta repetir
    } catch {
      console.error("[email] falha de rede ao chamar o Resend", { tentativa });
    }
  }
  return { enviado: false, motivo: "falha" };
}

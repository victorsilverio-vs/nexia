function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function moldura(titulo: string, corpo: string, botao: { texto: string; url: string }, rodape: string): string {
  return `<div style="background:#F5F3EE;padding:32px 16px;font-family:'Red Hat Display',Arial,sans-serif;color:#0A0A0A">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-top:4px solid #E7BC21;border-radius:4px;padding:32px 24px">
    <p style="margin:0 0 24px;font-weight:800;font-size:20px;letter-spacing:3px">NEXIA</p>
    <h1 style="margin:0 0 12px;font-size:22px">${titulo}</h1>
    ${corpo}
    <p style="margin:24px 0">
      <a href="${botao.url}" style="display:inline-block;background:#E7BC21;color:#0A0A0A;font-weight:700;text-decoration:none;padding:14px 24px">${botao.texto}</a>
    </p>
    <p style="margin:0;color:#5C5852;font-size:14px;line-height:1.5">${rodape}</p>
  </div>
  <p style="max-width:480px;margin:16px auto 0;color:#A29D93;font-size:12px;text-align:center">NEXIA · Ecossistema VS</p>
</div>`;
}

export function emailConvite(nome: string, urlEntrar: string): { assunto: string; html: string } {
  const primeiroNome = escapar(nome.trim().split(/\s+/)[0] ?? "");
  return {
    assunto: "Seu acesso à NEXIA está pronto",
    html: moldura(
      primeiroNome ? `${primeiroNome}, bem-vindo à NEXIA` : "Bem-vindo à NEXIA",
      `<p style="margin:0 0 12px;line-height:1.5">Seu acesso à plataforma está liberado. O primeiro passo é preencher o seu dossiê: é a partir dele que montamos o seu plano de ação.</p>
       <p style="margin:0;line-height:1.5">Para entrar, use este mesmo e-mail. Não tem senha: a cada acesso enviamos um link.</p>`,
      { texto: "Entrar na NEXIA", url: urlEntrar },
      "Dúvidas? Responda para a equipe NEXIA pelo WhatsApp.",
    ),
  };
}

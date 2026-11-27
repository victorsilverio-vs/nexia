import "server-only";
import { headers } from "next/headers";

/** Endereço público do site (para links em e-mails). */
export async function origemDoSite(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

const AGENDAMENTO_PADRAO = "https://calendly.com/victor-silverio/reuniao-de-negocios-clone";

/** Link externo de agendamento da reunião com o Victor. A variável LINK_AGENDAMENTO substitui o padrão. */
export function linkAgendamento(): string | null {
  const url = process.env.LINK_AGENDAMENTO?.trim() || AGENDAMENTO_PADRAO;
  return /^https:\/\//.test(url) ? url : null;
}

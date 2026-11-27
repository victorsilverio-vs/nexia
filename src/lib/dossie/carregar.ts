import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoConsentimento } from "./perguntas";
import type { Respostas } from "./validacao";

export type DossieCarregado = {
  respostas: Respostas;
  status: "rascunho" | "enviado";
  enviadoEm: string | null;
  devolvidoEm: string | null;
  atualizadoEm: string;
};

export async function carregarDossie(supabase: SupabaseClient, membroId: string): Promise<DossieCarregado | null> {
  const { data } = await supabase
    .from("dossies")
    .select("respostas, status, enviado_em, devolvido_em, atualizado_em")
    .eq("membro_id", membroId)
    .maybeSingle();
  if (!data) return null;
  return {
    respostas: (data.respostas as Respostas) ?? {},
    status: data.status,
    enviadoEm: data.enviado_em,
    devolvidoEm: data.devolvido_em,
    atualizadoEm: data.atualizado_em,
  };
}

/** Consentimento vigente de cada tipo (o registro mais recente). */
export async function carregarConsentimentos(
  supabase: SupabaseClient,
  membroId: string,
): Promise<Partial<Record<TipoConsentimento, { aceito: boolean; data: string }>>> {
  const { data } = await supabase
    .from("consentimentos")
    .select("tipo, aceito, data")
    .eq("membro_id", membroId)
    .order("data", { ascending: false })
    .order("id", { ascending: false });
  const vigentes: Partial<Record<TipoConsentimento, { aceito: boolean; data: string }>> = {};
  for (const c of data ?? []) {
    const tipo = c.tipo as TipoConsentimento;
    if (!vigentes[tipo]) vigentes[tipo] = { aceito: c.aceito, data: c.data };
  }
  return vigentes;
}

export function formatarData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

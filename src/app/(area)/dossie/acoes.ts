"use server";

import { revalidatePath } from "next/cache";
import { TIPOS_CONSENTIMENTO, type TipoConsentimento } from "@/lib/dossie/perguntas";
import { limparSecao, pendencias, type Respostas } from "@/lib/dossie/validacao";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

const ERRO_TRAVADO = "Seu dossiê já foi enviado. Para corrigir algo, fale com a equipe NEXIA.";

/** Salva uma seção do dossiê (substitui as respostas daquela seção). */
export async function salvarSecao(secaoId: string, valores: unknown): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };

  let limpos;
  try {
    limpos = limparSecao(secaoId, valores, usuario.id);
  } catch {
    return { ok: false, erro: "Seção inválida." };
  }

  const supabase = await criarClienteServidor();
  const { data: dossie, error: erroLeitura } = await supabase
    .from("dossies")
    .select("respostas, status")
    .eq("membro_id", usuario.id)
    .maybeSingle();

  if (erroLeitura) return { ok: false, erro: "Não conseguimos salvar agora. Tentaremos de novo." };
  if (!dossie) return { ok: false, erro: "Dossiê não encontrado." };
  if (dossie.status !== "rascunho") return { ok: false, erro: ERRO_TRAVADO };

  const respostas = { ...((dossie.respostas as Respostas) ?? {}), [secaoId]: limpos };
  const { data: atualizado, error } = await supabase
    .from("dossies")
    .update({ respostas })
    .eq("membro_id", usuario.id)
    .select("membro_id");

  if (error) return { ok: false, erro: "Não conseguimos salvar agora. Tentaremos de novo." };
  // RLS bloqueia sem erro (0 linhas) se o dossiê foi enviado entre a leitura e a gravação.
  if (!atualizado?.length) return { ok: false, erro: ERRO_TRAVADO };
  return { ok: true };
}

export async function registrarConsentimento(tipo: TipoConsentimento, aceito: boolean): Promise<ResultadoAcao> {
  if (!TIPOS_CONSENTIMENTO.some((c) => c.tipo === tipo) || typeof aceito !== "boolean") {
    return { ok: false, erro: "Consentimento inválido." };
  }
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("consentimentos").insert({ tipo, aceito });
  if (error) return { ok: false, erro: "Não conseguimos registrar agora. Tente de novo." };
  return { ok: true };
}

export async function enviarDossie(): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };

  const supabase = await criarClienteServidor();
  const { data: dossie } = await supabase
    .from("dossies")
    .select("respostas, status")
    .eq("membro_id", usuario.id)
    .maybeSingle();

  if (!dossie) return { ok: false, erro: "Dossiê não encontrado." };
  if (dossie.status !== "rascunho") return { ok: false, erro: ERRO_TRAVADO };
  if (pendencias((dossie.respostas as Respostas) ?? {}).length) {
    return { ok: false, erro: "Ainda há perguntas obrigatórias sem resposta." };
  }

  const { error } = await supabase.rpc("enviar_dossie");
  if (error) {
    if (error.message.includes("LGPD")) return { ok: false, erro: "Para enviar, aceite a Política de Privacidade." };
    return { ok: false, erro: "Não conseguimos enviar agora. Tente de novo em instantes." };
  }

  revalidatePath("/dossie");
  revalidatePath("/");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { podeCadastrarMembros } from "@/lib/auth/papeis";
import { obterUsuarioAtual } from "@/lib/auth/sessao";
import { enviarEmail } from "@/lib/email/enviar";
import { emailConvite } from "@/lib/email/modelos";
import { validarCadastro, validarPerfil } from "@/lib/membros/validacao";
import { origemDoSite } from "@/lib/site";
import { criarClienteServico, servicoConfigurado } from "@/lib/supabase/servico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type EstadoCadastro =
  | { tipo: "inicial" }
  | { tipo: "erro"; mensagem: string; erros?: Record<string, string>; valores?: Record<string, string> }
  | { tipo: "ok"; membroId: string; nome: string; emailEnviado: boolean; linkEntrar: string };

export type ResultadoSimples = { ok: true; mensagem?: string } | { ok: false; erro: string };

const SEM_PERMISSAO = "Seu perfil não pode fazer isso.";

async function exigirEquipe() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !podeCadastrarMembros(usuario.papel)) return null;
  return usuario;
}

/** Manda o e-mail de convite e registra o envio (ou a falha) em notificacoes. */
async function enviarConvite(membroId: string, nome: string, email: string) {
  const linkEntrar = `${await origemDoSite()}/entrar?email=${encodeURIComponent(email)}`;
  const { assunto, html } = emailConvite(nome, linkEntrar);
  const resultado = await enviarEmail(email, assunto, html);

  const servico = criarClienteServico();
  await servico.from("notificacoes").insert({
    destinatario_id: membroId,
    gatilho: "convite",
    canal: "email",
    enviada_em: resultado.enviado ? new Date().toISOString() : null,
    erro: resultado.enviado ? null : resultado.motivo,
  });

  return { emailEnviado: resultado.enviado, linkEntrar };
}

export async function cadastrarMembro(_anterior: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  const usuario = await exigirEquipe();
  if (!usuario) return { tipo: "erro", mensagem: SEM_PERMISSAO };

  // Devolvidos em caso de erro, para o formulário não perder o que foi digitado.
  const valores = Object.fromEntries(
    ["nome", "email", "whatsapp", "plano"].map((c) => [c, String(formData.get(c) ?? "").slice(0, 200)]),
  );
  const validacao = validarCadastro(formData);
  if (!validacao.ok) return { tipo: "erro", mensagem: "Confira os campos destacados.", erros: validacao.erros, valores };
  const { nome, email, whatsapp, plano } = validacao.dados;

  if (!servicoConfigurado()) {
    return { tipo: "erro", mensagem: "Falta configurar a chave secreta do Supabase na Vercel (SUPABASE_SECRET_KEY).", valores };
  }

  const servico = criarClienteServico();
  const { data, error } = await servico.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome, whatsapp },
  });

  if (error || !data.user) {
    const jaExiste = error?.code === "email_exists" || /already|registered|exists/i.test(error?.message ?? "");
    if (jaExiste) return { tipo: "erro", mensagem: "Já existe alguém cadastrado com esse e-mail.", erros: { email: "E-mail já cadastrado." }, valores };
    console.error("[cadastro] falha ao criar usuário", { status: error?.status, codigo: error?.code });
    return { tipo: "erro", mensagem: "Não conseguimos cadastrar agora. Tente de novo em instantes.", valores };
  }

  const membroId = data.user.id;
  await servico
    .from("perfis")
    .update({ nome, whatsapp, plano_assinatura: plano, convidado_em: new Date().toISOString(), convidado_por: usuario.id })
    .eq("id", membroId);

  const { emailEnviado, linkEntrar } = await enviarConvite(membroId, nome, email);
  revalidatePath("/equipe");
  return { tipo: "ok", membroId, nome, emailEnviado, linkEntrar };
}

export async function reenviarConvite(membroId: string): Promise<ResultadoSimples> {
  const usuario = await exigirEquipe();
  if (!usuario) return { ok: false, erro: SEM_PERMISSAO };
  if (!servicoConfigurado()) return { ok: false, erro: "Falta configurar a chave secreta do Supabase." };

  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase.from("perfis").select("nome, email").eq("id", membroId).maybeSingle();
  if (!perfil?.email) return { ok: false, erro: "Membro não encontrado." };

  const { emailEnviado, linkEntrar } = await enviarConvite(membroId, perfil.nome, perfil.email);
  await criarClienteServico()
    .from("perfis")
    .update({ convidado_em: new Date().toISOString(), convidado_por: usuario.id })
    .eq("id", membroId);

  revalidatePath(`/equipe/membros/${membroId}`);
  return emailEnviado
    ? { ok: true, mensagem: "Convite reenviado." }
    : { ok: false, erro: `O e-mail não saiu (envio de e-mails ainda não configurado). Mande este link ao membro: ${linkEntrar}` };
}

export async function atualizarPerfil(membroId: string, _anterior: ResultadoSimples | null, formData: FormData): Promise<ResultadoSimples> {
  const usuario = await exigirEquipe();
  if (!usuario) return { ok: false, erro: SEM_PERMISSAO };

  const validacao = validarPerfil(formData);
  if (!validacao.ok) return { ok: false, erro: Object.values(validacao.erros)[0] };
  const { nome, whatsapp, plano, papel } = validacao.dados;

  const mudancas: Record<string, unknown> = { nome, whatsapp, plano_assinatura: plano };
  if (papel && usuario.papel === "admin") mudancas.papel = papel;
  if (papel && usuario.papel === "admin" && membroId === usuario.id && papel !== "admin") {
    return { ok: false, erro: "Você não pode tirar o seu próprio papel de admin." };
  }

  // Cliente do próprio usuário: RLS e o gatilho de proteção conferem de novo no banco.
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("perfis").update(mudancas).eq("id", membroId).select("id");
  if (error || !data?.length) return { ok: false, erro: "Não conseguimos salvar. Confira suas permissões." };

  revalidatePath(`/equipe/membros/${membroId}`);
  revalidatePath("/equipe");
  return { ok: true, mensagem: "Salvo." };
}

export async function devolverDossie(membroId: string): Promise<ResultadoSimples> {
  const usuario = await exigirEquipe();
  if (!usuario) return { ok: false, erro: SEM_PERMISSAO };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("devolver_dossie", { p_membro: membroId });
  if (error) return { ok: false, erro: "Não conseguimos devolver. O dossiê ainda está enviado?" };

  revalidatePath(`/equipe/membros/${membroId}`);
  revalidatePath("/equipe");
  return { ok: true, mensagem: "Dossiê devolvido ao membro." };
}

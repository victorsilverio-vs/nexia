import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ehPapel, type Papel, type PlanoAssinatura } from "./papeis";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  planoAssinatura: PlanoAssinatura | null;
};

/**
 * Usuário logado com o perfil dele, ou null. Lido uma vez por requisição.
 * A identidade vem de getClaims() (JWT verificado), nunca de getSession().
 */
export const obterUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, plano_assinatura")
    .eq("id", claims.sub)
    .maybeSingle();

  // Sem perfil (gatilho não rodou) ou papel inválido: trata como membro, o papel de menor acesso.
  const papel: Papel = ehPapel(perfil?.papel) ? perfil.papel : "membro";

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    nome: perfil?.nome ?? "",
    papel,
    planoAssinatura: (perfil?.plano_assinatura as PlanoAssinatura | null) ?? null,
  };
});

/** Exige login; opcionalmente exige um dos papéis. Redireciona se não atender. */
export async function exigirUsuario(papeisPermitidos?: readonly Papel[]): Promise<UsuarioAtual> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/entrar");
  if (papeisPermitidos && !papeisPermitidos.includes(usuario.papel)) redirect("/?acesso=negado");
  return usuario;
}

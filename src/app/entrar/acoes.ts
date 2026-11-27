"use server";

import { destinoSeguro } from "@/lib/auth/papeis";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { origemDoSite } from "@/lib/site";

export type EstadoEntrar =
  | { tipo: "inicial" }
  | { tipo: "enviado"; email: string }
  | { tipo: "erro"; mensagem: string };

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function enviarLinkMagico(_anterior: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const proximo = destinoSeguro(String(formData.get("proximo") ?? ""));

  if (!EMAIL_VALIDO.test(email)) {
    return { tipo: "erro", mensagem: "Confira o e-mail digitado." };
  }
  if (!supabaseConfigurado()) {
    return { tipo: "erro", mensagem: "A plataforma ainda não está conectada ao banco. Avise a equipe NEXIA." };
  }

  const supabase = await criarClienteServidor();
  const redirecionar = new URL("/auth/confirmar", await origemDoSite());
  if (proximo !== "/") redirecionar.searchParams.set("proximo", proximo);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Só entra quem foi cadastrado pela equipe. Ninguém cria conta sozinho.
      shouldCreateUser: false,
      emailRedirectTo: redirecionar.toString(),
    },
  });

  if (error?.status === 429) {
    return { tipo: "erro", mensagem: "Muitas tentativas seguidas. Espere um minuto e tente de novo." };
  }
  if (error && error.status !== undefined && error.status >= 500) {
    // Sem e-mail no log (LGPD): só o código do erro.
    console.error("[entrar] falha ao enviar link mágico", { status: error.status, codigo: error.code });
    return { tipo: "erro", mensagem: "Não conseguimos enviar o link agora. Tente de novo em instantes." };
  }

  // E-mail não cadastrado recebe a mesma resposta: não revelamos quem é membro.
  return { tipo: "enviado", email };
}

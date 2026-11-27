import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta: ignora RLS. Só para ações do servidor que exigem isso
 * (criar usuário no Auth, registrar notificações) e SEMPRE depois de checar o papel de quem pediu.
 */
export function criarClienteServico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) throw new Error("SUPABASE_SECRET_KEY não configurada (veja .env.example).");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function servicoConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

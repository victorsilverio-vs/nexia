import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configSupabase } from "./config";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers. Um por requisição. */
export async function criarClienteServidor() {
  // Ler cookies primeiro marca a rota como dinâmica (nunca pré-gerada no build).
  const cookieStore = await cookies();
  const { url, chave } = configSupabase();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/auth/papeis";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino do link mágico. Aceita os dois formatos do Supabase:
 *  - token_hash + type: funciona em qualquer aparelho (recomendado; exige o modelo de e-mail do README);
 *  - code (PKCE): funciona só no mesmo navegador que pediu o link.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const proximo = destinoSeguro(params.get("proximo"));
  const falha = NextResponse.redirect(new URL("/entrar?erro=link", request.url));

  if (!supabaseConfigurado()) return falha;

  const supabase = await criarClienteServidor();
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  let ok = false;
  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  return ok ? NextResponse.redirect(new URL(proximo, request.url)) : falha;
}

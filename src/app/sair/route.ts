import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/** Sair. Só por POST, para um link ou imagem de terceiros não deslogar ninguém. */
export async function POST(request: NextRequest) {
  if (supabaseConfigurado()) {
    const supabase = await criarClienteServidor();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/entrar", request.url), { status: 303 });
}

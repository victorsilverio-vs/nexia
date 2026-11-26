import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rotaPublica } from "@/lib/auth/papeis";
import { configSupabase, supabaseConfigurado } from "./config";

/**
 * Roda antes de cada página: renova a sessão do Supabase (gravando cookies novos)
 * e manda para /entrar quem não está logado. A checagem de papel fica nas páginas
 * e, de forma definitiva, no RLS do banco.
 */
export async function atualizarSessao(request: NextRequest) {
  const caminho = request.nextUrl.pathname;

  if (!supabaseConfigurado()) {
    // Sem variáveis de ambiente não há como autenticar; a tela de entrada explica o problema.
    if (rotaPublica(caminho)) return NextResponse.next({ request });
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  const { url, chave } = configSupabase();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, cabecalhos) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        Object.entries(cabecalhos ?? {}).forEach(([k, v]) => resposta.headers.set(k, v));
      },
    },
  });

  // Não colocar código entre a criação do cliente e getClaims(): é aqui que a sessão é validada e renovada.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  if (!logado && !rotaPublica(caminho)) {
    const destino = new URL("/entrar", request.url);
    if (caminho !== "/") destino.searchParams.set("proximo", caminho + request.nextUrl.search);
    return NextResponse.redirect(destino);
  }

  if (logado && caminho === "/entrar") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return resposta;
}

import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { destinoSeguro } from "@/lib/auth/papeis";
import { FormularioEntrar } from "./formulario";
import estilos from "./entrar.module.css";

export const metadata: Metadata = { title: "Entrar" };

const MENSAGENS_ERRO: Record<string, string> = {
  link: "Esse link expirou ou já foi usado. Peça um novo abaixo.",
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string }>;
}) {
  const { proximo, erro } = await searchParams;
  const destino = destinoSeguro(proximo);

  return (
    <main className={estilos.pagina}>
      <section className={estilos.cartao}>
        <Marca />
        <h1>Entrar na NEXIA</h1>
        <p className={estilos.subtitulo}>
          Sem senha. Digite o e-mail cadastrado e enviamos um link de acesso.
        </p>
        {erro && MENSAGENS_ERRO[erro] ? (
          <p className={estilos.erro} role="alert">
            {MENSAGENS_ERRO[erro]}
          </p>
        ) : null}
        <FormularioEntrar proximo={destino !== "/" ? destino : undefined} />
      </section>
      <p className={estilos.rodape}>NEXIA · Ecossistema VS</p>
    </main>
  );
}

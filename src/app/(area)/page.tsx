import Link from "next/link";
import { ROTULO_PLANO } from "@/lib/auth/papeis";
import { exigirUsuario } from "@/lib/auth/sessao";
import estilos from "./paginas.module.css";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const usuario = await exigirUsuario();
  const { acesso } = await searchParams;
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <>
      {acesso === "negado" ? (
        <p className={estilos.aviso} role="alert">
          Essa área não está disponível para o seu perfil.
        </p>
      ) : null}

      <h1 className={estilos.titulo}>{primeiroNome ? `Olá, ${primeiroNome}.` : "Olá."}</h1>

      {usuario.papel === "membro" ? (
        <div className={estilos.grade}>
          <section className="cartao">
            <h2>Seu dossiê</h2>
            <p>
              É por ele que começamos. Em breve você preenche aqui as informações sobre você, seu momento e seus
              empreendimentos.
            </p>
          </section>
          <section className="cartao">
            <h2>Live NEXIA</h2>
            <p>Toda quarta, às 18h. Casos reais e aulas.</p>
          </section>
          {usuario.planoAssinatura ? (
            <section className="cartao">
              <h2>Seu plano</h2>
              <p>{ROTULO_PLANO[usuario.planoAssinatura]}</p>
            </section>
          ) : null}
        </div>
      ) : (
        <div className={estilos.grade}>
          <section className="cartao">
            <h2>Membros</h2>
            <p>Cadastro e acompanhamento dos membros.</p>
            <Link href="/equipe" className="botao">
              Abrir
            </Link>
          </section>
          {usuario.papel === "admin" ? (
            <section className="cartao">
              <h2>Mesa do Victor</h2>
              <p>Tudo que espera sua aprovação.</p>
              <Link href="/mesa" className="botao botao-primario">
                Abrir a Mesa
              </Link>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

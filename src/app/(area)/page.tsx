import Link from "next/link";
import { ROTULO_PLANO } from "@/lib/auth/papeis";
import { exigirUsuario } from "@/lib/auth/sessao";
import { carregarDossie, formatarData } from "@/lib/dossie/carregar";
import { dossieVazio, progresso } from "@/lib/dossie/validacao";
import { linkAgendamento } from "@/lib/site";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import estilos from "./paginas.module.css";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const usuario = await exigirUsuario();
  const { acesso } = await searchParams;
  const primeiroNome = usuario.nome.split(" ")[0];
  const dossie = usuario.papel === "membro" ? await carregarDossie(await criarClienteServidor(), usuario.id) : null;
  const agenda = linkAgendamento();

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
            {dossie?.status === "enviado" ? (
              <>
                <p>Enviado em {formatarData(dossie.enviadoEm).slice(0, 10)}. Próximo passo: a reunião inicial com o Victor.</p>
                {agenda ? (
                  <a href={agenda} target="_blank" rel="noreferrer" className="botao botao-primario">
                    Agendar reunião
                  </a>
                ) : (
                  <Link href="/dossie" className="botao">
                    Ver respostas
                  </Link>
                )}
              </>
            ) : dossie && !dossieVazio(dossie.respostas) ? (
              <>
                <p>{progresso(dossie.respostas)}% preenchido. Suas respostas ficam salvas: continue de onde parou.</p>
                <Link href="/dossie" className="botao botao-primario">
                  Continuar dossiê
                </Link>
              </>
            ) : (
              <>
                <p>É por ele que começamos: você, seu momento e seus empreendimentos. Reserve uns 30 minutos; dá para fazer aos poucos.</p>
                <Link href="/dossie" className="botao botao-primario">
                  Começar dossiê
                </Link>
              </>
            )}
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

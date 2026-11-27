import type { Metadata } from "next";
import { ResumoDossie } from "@/components/dossie/resumo";
import estilosDossie from "@/components/dossie/dossie.module.css";
import { exigirUsuario } from "@/lib/auth/sessao";
import { carregarConsentimentos, carregarDossie, formatarData } from "@/lib/dossie/carregar";
import type { TipoConsentimento } from "@/lib/dossie/perguntas";
import { linkAgendamento } from "@/lib/site";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import estilos from "../paginas.module.css";
import { AssistenteDossie } from "./assistente";

export const metadata: Metadata = { title: "Dossiê" };

export default async function PaginaDossie({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const usuario = await exigirUsuario();
  const { secao } = await searchParams;
  const supabase = await criarClienteServidor();
  const dossie = await carregarDossie(supabase, usuario.id);

  if (!dossie) {
    return (
      <>
        <h1 className={estilos.titulo}>Dossiê</h1>
        <p className={estilos.vazio}>O dossiê é preenchido pelos membros. Seu perfil não tem dossiê.</p>
      </>
    );
  }

  if (dossie.status === "enviado") {
    const agenda = linkAgendamento();
    return (
      <>
        <h1 className={estilos.titulo}>Dossiê enviado</h1>
        <section className={`cartao ${estilosDossie.enviadoCartao}`}>
          <p>
            Recebemos seu dossiê em {formatarData(dossie.enviadoEm)}. O próximo passo é a reunião inicial com o Victor,
            em que montamos juntos o seu plano de ação.
          </p>
          {agenda ? (
            <a href={agenda} target="_blank" rel="noreferrer" className="botao botao-primario">
              Agendar reunião com o Victor
            </a>
          ) : (
            <p className={estilosDossie.ajuda}>A equipe NEXIA vai falar com você para agendar a reunião.</p>
          )}
        </section>
        <h2 className={estilosDossie.subtitulo}>Suas respostas</h2>
        <ResumoDossie respostas={dossie.respostas} />
      </>
    );
  }

  const consentimentos = await carregarConsentimentos(supabase, usuario.id);
  const iniciais = Object.fromEntries(
    Object.entries(consentimentos).map(([tipo, c]) => [tipo, c!.aceito]),
  ) as Partial<Record<TipoConsentimento, boolean>>;

  return (
    <AssistenteDossie
      membroId={usuario.id}
      respostasIniciais={dossie.respostas}
      consentimentosIniciais={iniciais}
      secaoInicial={secao}
      devolvido={Boolean(dossie.devolvidoEm)}
    />
  );
}

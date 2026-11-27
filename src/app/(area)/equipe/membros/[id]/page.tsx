import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumoDossie } from "@/components/dossie/resumo";
import { ROTULO_PAPEL, type Papel, type PlanoAssinatura } from "@/lib/auth/papeis";
import { exigirUsuario } from "@/lib/auth/sessao";
import { carregarConsentimentos, carregarDossie, formatarData } from "@/lib/dossie/carregar";
import { TIPOS_CONSENTIMENTO } from "@/lib/dossie/perguntas";
import { dossieVazio, progresso, todosAnexos } from "@/lib/dossie/validacao";
import { formatarWhatsapp } from "@/lib/membros/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import estilos from "../../../paginas.module.css";
import estilosEquipe from "../../equipe.module.css";
import { AcoesMembro } from "./acoes-membro";
import { FormularioPerfil } from "./formulario-perfil";

export const metadata: Metadata = { title: "Membro" };

const ID_VALIDO = /^[0-9a-f-]{36}$/i;

export default async function PaginaMembro({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario(["admin", "equipe"]);
  const { id } = await params;
  if (!ID_VALIDO.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, email, whatsapp, papel, plano_assinatura, criado_em, convidado_em")
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const [dossie, consentimentos] = await Promise.all([carregarDossie(supabase, id), carregarConsentimentos(supabase, id)]);

  // Links temporários (10 min) para baixar anexos.
  let links: Record<string, string> = {};
  const anexos = dossie ? todosAnexos(dossie.respostas) : [];
  if (anexos.length) {
    const { data } = await supabase.storage.from("dossie").createSignedUrls(
      anexos.map((a) => a.caminho),
      600,
    );
    links = Object.fromEntries(
      (data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]),
    );
  }

  return (
    <>
      <Link href="/equipe" className={estilosEquipe.voltar}>
        ← Membros
      </Link>
      <h1 className={estilos.titulo}>{perfil.nome || perfil.email}</h1>

      <div className={estilosEquipe.blocos}>
        <div className={estilosEquipe.lista}>
          <section className="cartao">
            <h2>Cadastro</h2>
            <p className={estilosEquipe.detalhe}>
              {perfil.email}
              {perfil.whatsapp ? ` · ${formatarWhatsapp(perfil.whatsapp)}` : ""}
              <br />
              {ROTULO_PAPEL[perfil.papel as Papel]}
              {perfil.convidado_em ? ` · convidado em ${formatarData(perfil.convidado_em).slice(0, 10)}` : ""}
            </p>
            <FormularioPerfil
              membroId={perfil.id}
              nome={perfil.nome}
              whatsapp={formatarWhatsapp(perfil.whatsapp)}
              plano={perfil.plano_assinatura as PlanoAssinatura | null}
              papel={perfil.papel as Papel}
              podeMudarPapel={usuario.papel === "admin"}
            />
          </section>

          {dossie ? (
            <section className="cartao">
              <h2>Dossiê</h2>
              <p className={estilosEquipe.detalhe}>
                {dossie.status === "enviado"
                  ? `Enviado em ${formatarData(dossie.enviadoEm)}`
                  : dossieVazio(dossie.respostas)
                    ? "Ainda não começou"
                    : `Em preenchimento · ${progresso(dossie.respostas)}% · última alteração ${formatarData(dossie.atualizadoEm)}`}
              </p>
              <h3 className={estilosEquipe.detalhe}>Consentimentos</h3>
              <ul className={estilosEquipe.detalhe}>
                {TIPOS_CONSENTIMENTO.map((c) => {
                  const v = consentimentos[c.tipo];
                  return (
                    <li key={c.tipo}>
                      {c.tipo === "lgpd" ? "LGPD" : c.tipo === "conexoes" ? "Sugerir conexões" : "Mapa"}:{" "}
                      {v ? `${v.aceito ? "aceito" : "recusado"} em ${formatarData(v.data).slice(0, 10)}` : "não respondido"}
                    </li>
                  );
                })}
              </ul>
              <AcoesMembro membroId={perfil.id} dossieEnviado={dossie.status === "enviado"} />
            </section>
          ) : null}
        </div>

        <div>
          {dossie && !dossieVazio(dossie.respostas) ? (
            <ResumoDossie respostas={dossie.respostas} links={links} />
          ) : dossie ? (
            <p className={estilos.vazio}>O membro ainda não preencheu o dossiê.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

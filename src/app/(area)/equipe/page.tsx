import type { Metadata } from "next";
import Link from "next/link";
import { ROTULO_PAPEL, ROTULO_PLANO, type Papel, type PlanoAssinatura } from "@/lib/auth/papeis";
import { exigirUsuario } from "@/lib/auth/sessao";
import { formatarData } from "@/lib/dossie/carregar";
import { dossieVazio, progresso, type Respostas } from "@/lib/dossie/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import estilos from "../paginas.module.css";
import estilosEquipe from "./equipe.module.css";

export const metadata: Metadata = { title: "Membros" };

type Linha = {
  id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  plano_assinatura: PlanoAssinatura | null;
  dossies: { status: string; enviado_em: string | null; respostas: Respostas } | { status: string; enviado_em: string | null; respostas: Respostas }[] | null;
};

function situacaoDossie(linha: Linha): { texto: string; destaque: boolean } {
  const d = Array.isArray(linha.dossies) ? linha.dossies[0] : linha.dossies;
  if (!d) return { texto: "Sem dossiê", destaque: false };
  if (d.status === "enviado") return { texto: `Dossiê enviado em ${formatarData(d.enviado_em).slice(0, 10)}`, destaque: true };
  if (dossieVazio(d.respostas)) return { texto: "Dossiê não começado", destaque: false };
  return { texto: `Dossiê em preenchimento · ${progresso(d.respostas)}%`, destaque: false };
}

export default async function PaginaEquipe() {
  await exigirUsuario(["admin", "equipe"]);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, plano_assinatura, dossies!dossies_membro_id_fkey(status, enviado_em, respostas)")
    .order("nome");

  if (error) {
    console.error("[equipe] falha ao listar perfis", { codigo: error.code });
    return <p className={estilos.aviso}>Não conseguimos carregar a lista de membros agora. Recarregue a página.</p>;
  }
  const linhas = (data ?? []) as Linha[];
  const membros = linhas.filter((l) => l.papel === "membro");
  const time = linhas.filter((l) => l.papel !== "membro");

  return (
    <>
      <div className={estilosEquipe.cabecalho}>
        <h1 className={estilos.titulo}>Membros</h1>
        <Link href="/equipe/novo" className="botao botao-primario">
          Cadastrar membro
        </Link>
      </div>

      {membros.length ? (
        <ul className={estilosEquipe.lista}>
          {membros.map((m) => {
            const s = situacaoDossie(m);
            return (
              <li key={m.id}>
                <Link href={`/equipe/membros/${m.id}`} className={estilosEquipe.linha}>
                  <span className={estilosEquipe.nome}>{m.nome || m.email}</span>
                  <span className={estilosEquipe.detalhe}>
                    {m.plano_assinatura ? ROTULO_PLANO[m.plano_assinatura] : "Sem plano"} · {m.email}
                  </span>
                  <span className={s.destaque ? estilosEquipe.situacaoDestaque : estilosEquipe.detalhe}>{s.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={estilos.vazio}>Nenhum membro cadastrado ainda.</p>
      )}

      <h2 className={estilosEquipe.subtitulo}>Equipe e admin</h2>
      <ul className={estilosEquipe.lista}>
        {time.map((m) => (
          <li key={m.id}>
            <Link href={`/equipe/membros/${m.id}`} className={estilosEquipe.linha}>
              <span className={estilosEquipe.nome}>{m.nome || m.email}</span>
              <span className={estilosEquipe.detalhe}>
                {ROTULO_PAPEL[m.papel]} · {m.email}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

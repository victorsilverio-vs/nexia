"use client";

import { useState } from "react";
import type { Pergunta } from "@/lib/dossie/perguntas";
import type { Anexo } from "@/lib/dossie/validacao";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import estilos from "./dossie.module.css";

const BUCKET = "dossie";
const TAMANHO_MAX = 20 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function nomeSeguro(nome: string): string {
  const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80) || "arquivo";
}

function tamanhoLegivel(bytes: number): string {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Props = {
  pergunta: Pergunta;
  valor: unknown;
  aoMudar: (anexos: Anexo[]) => void;
  membroId: string;
  pasta: string;
  prefixoId: string;
};

/** Envio de arquivos direto para o Storage, na pasta do membro (o RLS confere). */
export function CampoAnexos({ pergunta, valor, aoMudar, membroId, pasta, prefixoId }: Props) {
  const anexos = Array.isArray(valor) ? (valor as Anexo[]) : [];
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const id = `${prefixoId}-${pergunta.id}`;

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(null);
    const supabase = criarClienteNavegador();
    const novos: Anexo[] = [];

    for (const arquivo of Array.from(arquivos)) {
      if (!TIPOS.includes(arquivo.type)) {
        setErro(`"${arquivo.name}" não é imagem nem PDF.`);
        continue;
      }
      if (arquivo.size > TAMANHO_MAX) {
        setErro(`"${arquivo.name}" passa de 20 MB.`);
        continue;
      }
      setEnviando((n) => n + 1);
      const caminho = `${membroId}/${pasta}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type });
      setEnviando((n) => n - 1);
      if (error) {
        setErro(`Não conseguimos enviar "${arquivo.name}". Tente de novo.`);
        continue;
      }
      novos.push({ caminho, nome: arquivo.name.slice(0, 200), tamanho: arquivo.size, tipo: arquivo.type });
    }
    if (novos.length) aoMudar([...anexos, ...novos]);
  }

  async function remover(anexo: Anexo) {
    if (!window.confirm(`Remover "${anexo.nome}"?`)) return;
    const supabase = criarClienteNavegador();
    await supabase.storage.from(BUCKET).remove([anexo.caminho]);
    aoMudar(anexos.filter((a) => a.caminho !== anexo.caminho));
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.rotulo}>
        {pergunta.rotulo}
      </label>
      {pergunta.ajuda ? <p className={estilos.ajuda}>{pergunta.ajuda}</p> : null}

      {anexos.length ? (
        <ul className={estilos.anexos}>
          {anexos.map((a) => (
            <li key={a.caminho}>
              <span className={estilos.nomeAnexo}>{a.nome}</span>
              <span className={estilos.ajuda}>{tamanhoLegivel(a.tamanho)}</span>
              <button type="button" className={estilos.linkBotao} onClick={() => remover(a)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className={`botao ${estilos.botaoArquivo}`}>
        {enviando ? "Enviando…" : "Adicionar arquivos"}
        <input
          id={id}
          type="file"
          multiple
          accept={TIPOS.join(",")}
          className="visualmente-oculto"
          disabled={enviando > 0}
          onChange={(e) => {
            void enviar(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {erro ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

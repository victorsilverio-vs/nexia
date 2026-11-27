/**
 * Limpeza e checagem das respostas do dossiê, a partir da lista de perguntas.
 * Roda no servidor antes de gravar: só entram chaves conhecidas, com o tipo certo e tamanho limitado.
 */
import { SECOES, UFS, type Pergunta, type Secao, type SecaoLista, type SecaoSimples, type Valores } from "./perguntas";

export type Anexo = { caminho: string; nome: string; tamanho: number; tipo: string };
export type ItemLista = Valores & { id: string };
export type Respostas = Record<string, unknown>;

export type Pendencia = { secaoId: string; secaoTitulo: string; item?: number; perguntaId: string; rotulo: string };

const MAX_TEXTO = 300;
const MAX_TEXTO_LONGO = 3000;
const MAX_ANEXOS = 20;
const ID_ITEM = /^[a-zA-Z0-9-]{8,64}$/;
const TIPOS_ANEXO = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export function visivel(pergunta: Pergunta, valores: Valores): boolean {
  return pergunta.mostrarSe ? pergunta.mostrarSe(valores) : true;
}

export function vazio(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

function limparTexto(valor: unknown, max: number): string | undefined {
  if (typeof valor !== "string") return undefined;
  const t = valor.replace(/\u0000/g, "").slice(0, max);
  return t.trim() === "" ? undefined : t;
}

function limparNumero(valor: unknown): number | undefined {
  const n = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 1e13) return undefined;
  return Math.round(n * 100) / 100;
}

function limparAnexos(valor: unknown, membroId: string): Anexo[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const prefixo = `${membroId}/`;
  const anexos = valor
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      caminho: typeof a.caminho === "string" ? a.caminho : "",
      nome: typeof a.nome === "string" ? a.nome.slice(0, 200) : "arquivo",
      tamanho: typeof a.tamanho === "number" && a.tamanho >= 0 ? a.tamanho : 0,
      tipo: typeof a.tipo === "string" ? a.tipo : "",
    }))
    // Só arquivos na pasta do próprio membro, sem truques de caminho.
    .filter((a) => a.caminho.startsWith(prefixo) && !a.caminho.includes("..") && TIPOS_ANEXO.includes(a.tipo))
    .slice(0, MAX_ANEXOS);
  return anexos.length ? anexos : undefined;
}

/** Valor limpo de uma pergunta, ou undefined se inválido/vazio. */
export function limparValor(pergunta: Pergunta, valor: unknown, membroId: string): unknown {
  switch (pergunta.tipo) {
    case "texto":
      return limparTexto(valor, pergunta.max ?? MAX_TEXTO);
    case "textoLongo":
      return limparTexto(valor, pergunta.max ?? MAX_TEXTO_LONGO);
    case "numero":
    case "moeda":
      return limparNumero(valor);
    case "uf":
      return typeof valor === "string" && (UFS as readonly string[]).includes(valor) ? valor : undefined;
    case "cnpj": {
      if (typeof valor !== "string") return undefined;
      const digitos = valor.replace(/\D/g, "").slice(0, 14);
      return digitos ? digitos : undefined;
    }
    case "simNao":
      return typeof valor === "boolean" ? valor : undefined;
    case "escolha":
      return typeof valor === "string" && pergunta.opcoes.some((o) => o.valor === valor) ? valor : undefined;
    case "multipla": {
      if (!Array.isArray(valor)) return undefined;
      const validos = pergunta.opcoes.map((o) => o.valor).filter((v) => valor.includes(v));
      return validos.length ? validos : undefined;
    }
    case "anexos":
      return limparAnexos(valor, membroId);
  }
}

function limparValores(perguntas: Pergunta[], bruto: unknown, membroId: string): Valores {
  const entrada = typeof bruto === "object" && bruto !== null && !Array.isArray(bruto) ? (bruto as Valores) : {};
  // Primeiro limpa tudo; depois descarta o que ficou escondido pelas condições.
  const limpos: Valores = {};
  for (const p of perguntas) {
    const v = limparValor(p, entrada[p.id], membroId);
    if (v !== undefined) limpos[p.id] = v;
  }
  for (const p of perguntas) {
    if (!visivel(p, limpos)) delete limpos[p.id];
  }
  return limpos;
}

/** Limpa as respostas de uma seção vindas do navegador. Lança erro se a seção não existe ou não aceita respostas. */
export function limparSecao(secaoId: string, bruto: unknown, membroId: string): Valores | ItemLista[] {
  const secao = SECOES.find((s) => s.id === secaoId);
  if (!secao || secao.tipo === "consentimentos") throw new Error("seção inválida");

  if (secao.tipo === "simples") return limparValores(secao.perguntas, bruto, membroId);

  const itens = Array.isArray(bruto) ? bruto : [];
  return itens
    .filter((i): i is Valores => typeof i === "object" && i !== null)
    .filter((i) => typeof i.id === "string" && ID_ITEM.test(i.id))
    .slice(0, secao.maxItens)
    .map((i) => ({ ...limparValores(secao.perguntas, i, membroId), id: i.id as string }));
}

export function valoresSecao(respostas: Respostas, secao: SecaoSimples): Valores {
  const v = respostas[secao.id];
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Valores) : {};
}

export function itensSecao(respostas: Respostas, secao: SecaoLista): ItemLista[] {
  const v = respostas[secao.id];
  return Array.isArray(v) ? (v.filter((i) => typeof i === "object" && i !== null) as ItemLista[]) : [];
}

function pendenciasPerguntas(secao: Secao, perguntas: Pergunta[], valores: Valores, item?: number): Pendencia[] {
  return perguntas
    .filter((p) => p.obrigatoria && visivel(p, valores) && vazio(valores[p.id]))
    .map((p) => ({ secaoId: secao.id, secaoTitulo: secao.titulo, item, perguntaId: p.id, rotulo: p.rotulo }));
}

/** Perguntas obrigatórias ainda sem resposta (não inclui consentimentos). */
export function pendencias(respostas: Respostas): Pendencia[] {
  return SECOES.flatMap((secao) => {
    if (secao.tipo === "simples") return pendenciasPerguntas(secao, secao.perguntas, valoresSecao(respostas, secao));
    if (secao.tipo === "lista")
      return itensSecao(respostas, secao).flatMap((item, i) => pendenciasPerguntas(secao, secao.perguntas, item, i + 1));
    return [];
  });
}

/** Percentual de perguntas visíveis respondidas, para a barra de progresso (0 a 100). */
export function progresso(respostas: Respostas): number {
  let total = 0;
  let respondidas = 0;
  for (const secao of SECOES) {
    if (secao.tipo !== "simples") continue;
    const valores = valoresSecao(respostas, secao);
    for (const p of secao.perguntas) {
      if (!visivel(p, valores)) continue;
      total++;
      if (!vazio(valores[p.id])) respondidas++;
    }
  }
  return total ? Math.round((respondidas / total) * 100) : 0;
}

export function dossieVazio(respostas: Respostas): boolean {
  return Object.values(respostas ?? {}).every((v) =>
    Array.isArray(v) ? v.length === 0 : typeof v === "object" && v !== null ? Object.keys(v).length === 0 : true,
  );
}

/** Anexos de todos os itens de listas, para a equipe gerar links de download. */
export function todosAnexos(respostas: Respostas): Anexo[] {
  return SECOES.flatMap((secao) =>
    secao.tipo === "lista"
      ? itensSecao(respostas, secao).flatMap((item) =>
          secao.perguntas.flatMap((p) => (p.tipo === "anexos" && Array.isArray(item[p.id]) ? (item[p.id] as Anexo[]) : [])),
        )
      : [],
  );
}

export function formatarCnpj(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

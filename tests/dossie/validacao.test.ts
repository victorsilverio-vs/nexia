import { describe, expect, it } from "vitest";
import { SECOES } from "@/lib/dossie/perguntas";
import { dossieVazio, limparSecao, pendencias, progresso, todosAnexos } from "@/lib/dossie/validacao";

const MEMBRO = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";

describe("lista de perguntas", () => {
  it("ids únicos por seção e seções únicas", () => {
    const secoes = SECOES.map((s) => s.id);
    expect(new Set(secoes).size).toBe(secoes.length);
    for (const s of SECOES) {
      if (s.tipo === "consentimentos") continue;
      const ids = s.perguntas.map((p) => p.id);
      expect(new Set(ids).size, `ids repetidos em ${s.id}`).toBe(ids.length);
      expect(ids).not.toContain("id");
    }
  });

  it("escolhas sempre têm opções sem valores repetidos", () => {
    for (const s of SECOES) {
      if (s.tipo === "consentimentos") continue;
      for (const p of s.perguntas) {
        if (p.tipo === "escolha" || p.tipo === "multipla") {
          const valores = p.opcoes.map((o) => o.valor);
          expect(valores.length).toBeGreaterThan(0);
          expect(new Set(valores).size).toBe(valores.length);
        }
      }
    }
  });
});

describe("limpeza das respostas", () => {
  it("descarta chaves desconhecidas e tipos errados", () => {
    const r = limparSecao(
      "pessoa",
      { cidade: "Goiânia", uf: "XX", tem_empresa: "sim", invasor: "<script>", profissao: 42 },
      MEMBRO,
    );
    expect(r).toEqual({ cidade: "Goiânia" });
  });

  it("corta textos longos", () => {
    const r = limparSecao("pessoa", { cidade: "a".repeat(1000) }, MEMBRO) as Record<string, string>;
    expect(r.cidade).toHaveLength(300);
  });

  it("descarta resposta de pergunta escondida pela condição", () => {
    const r = limparSecao("pessoa", { tem_empresa: false, empresa_nome: "Antiga Ltda" }, MEMBRO);
    expect(r).toEqual({ tem_empresa: false });
    const r2 = limparSecao("pessoa", { tem_empresa: true, empresa_nome: "Nova Ltda", empresa_cnpj: "12.345.678/0001-90" }, MEMBRO);
    expect(r2).toEqual({ tem_empresa: true, empresa_nome: "Nova Ltda", empresa_cnpj: "12345678000190" });
  });

  it("múltipla escolha aceita só opções existentes", () => {
    const r = limparSecao("experiencia", { pontos_fortes: ["obra", "magia", "vendas"] }, MEMBRO);
    expect(r).toEqual({ pontos_fortes: ["vendas", "obra"] });
  });

  it("números: aceita vírgula, recusa negativos e lixo", () => {
    const itens = limparSecao(
      "empreendimentos",
      [
        { id: "item-0001", nome: "A", area_terreno: "1250,5" },
        { id: "item-0002", nome: "B", area_terreno: -3 },
      ],
      MEMBRO,
    ) as Record<string, unknown>[];
    expect(itens[0].area_terreno).toBe(1250.5);
    expect(itens[1].area_terreno).toBeUndefined();
  });

  it("empreendimento: contrato só aparece quando não é proprietário", () => {
    const [proprietario, permuta] = limparSecao(
      "empreendimentos",
      [
        { id: "item-0001", nome: "A", relacao_terreno: "proprietario", contrato: "permuta" },
        { id: "item-0002", nome: "B", relacao_terreno: "permuta", contrato: "permuta" },
      ],
      MEMBRO,
    ) as Record<string, unknown>[];
    expect(proprietario.contrato).toBeUndefined();
    expect(permuta.contrato).toBe("permuta");
  });

  it("itens sem id válido são descartados e há limite de itens", () => {
    const muitos = Array.from({ length: 15 }, (_, i) => ({ id: `item-${String(i).padStart(4, "0")}`, nome: `E${i}` }));
    const r = limparSecao("empreendimentos", [{ nome: "sem id" }, ...muitos], MEMBRO) as unknown[];
    expect(r).toHaveLength(10);
  });

  it("anexos só da pasta do próprio membro e de tipos aceitos", () => {
    const [item] = limparSecao(
      "empreendimentos",
      [
        {
          id: "item-0001",
          nome: "A",
          arquivos: [
            { caminho: `${MEMBRO}/item-0001/matricula.pdf`, nome: "matricula.pdf", tamanho: 100, tipo: "application/pdf" },
            { caminho: `${OUTRO}/x.pdf`, nome: "x.pdf", tamanho: 1, tipo: "application/pdf" },
            { caminho: `${MEMBRO}/../${OUTRO}/y.pdf`, nome: "y.pdf", tamanho: 1, tipo: "application/pdf" },
            { caminho: `${MEMBRO}/virus.exe`, nome: "virus.exe", tamanho: 1, tipo: "application/x-msdownload" },
          ],
        },
      ],
      MEMBRO,
    ) as Record<string, unknown>[];
    expect(item.arquivos).toEqual([
      { caminho: `${MEMBRO}/item-0001/matricula.pdf`, nome: "matricula.pdf", tamanho: 100, tipo: "application/pdf" },
    ]);
  });

  it("recusa seção inexistente ou de consentimentos", () => {
    expect(() => limparSecao("hack", {}, MEMBRO)).toThrow();
    expect(() => limparSecao("consentimentos", {}, MEMBRO)).toThrow();
  });
});

describe("pendências e progresso", () => {
  const completo = {
    pessoa: { cidade: "Goiânia", uf: "GO", profissao: "Engenheiro" },
    momento: { estagio: "ideia", objetivo_12m: "Lançar o primeiro", horas_semana: "5a10" },
    capital: { faixa: "ate100k" },
  };

  it("dossiê vazio lista todas as obrigatórias", () => {
    const p = pendencias({});
    expect(p.map((x) => x.perguntaId).sort()).toEqual(
      ["cidade", "uf", "profissao", "estagio", "objetivo_12m", "horas_semana", "faixa"].sort(),
    );
  });

  it("com as obrigatórias respondidas, não há pendência", () => {
    expect(pendencias(completo)).toEqual([]);
  });

  it("empreendimento sem nome vira pendência daquele item", () => {
    const p = pendencias({ ...completo, empreendimentos: [{ id: "item-0001" }] });
    expect(p).toEqual([expect.objectContaining({ secaoId: "empreendimentos", item: 1, perguntaId: "nome" })]);
  });

  it("progresso vai de 0 a 100", () => {
    expect(progresso({})).toBe(0);
    const p = progresso(completo);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(100);
  });

  it("dossieVazio e todosAnexos", () => {
    expect(dossieVazio({})).toBe(true);
    expect(dossieVazio({ pessoa: {} })).toBe(true);
    expect(dossieVazio(completo)).toBe(false);
    const anexo = { caminho: `${MEMBRO}/a.pdf`, nome: "a.pdf", tamanho: 1, tipo: "application/pdf" };
    expect(todosAnexos({ empreendimentos: [{ id: "item-0001", arquivos: [anexo] }] })).toEqual([anexo]);
  });
});

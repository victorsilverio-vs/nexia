import { describe, expect, it } from "vitest";
import { formatarWhatsapp, normalizarWhatsapp, validarCadastro, validarPerfil } from "@/lib/membros/validacao";

const form = (dados: Record<string, string>) => {
  const f = new FormData();
  Object.entries(dados).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("WhatsApp", () => {
  it("normaliza com e sem 55, com máscara", () => {
    expect(normalizarWhatsapp("(62) 99999-0000")).toBe("5562999990000");
    expect(normalizarWhatsapp("+55 62 3333-0000")).toBe("556233330000");
    expect(normalizarWhatsapp("")).toBeNull();
    expect(normalizarWhatsapp("1234")).toBe("invalido");
  });

  it("formata para exibir", () => {
    expect(formatarWhatsapp("5562999990000")).toBe("(62) 99999-0000");
    expect(formatarWhatsapp(null)).toBe("");
  });
});

describe("cadastro de membro", () => {
  it("aceita dados completos e normaliza e-mail", () => {
    const r = validarCadastro(form({ nome: "Ana Souza", email: " Ana@Exemplo.com ", whatsapp: "62999990000", plano: "advisor" }));
    expect(r).toEqual({
      ok: true,
      dados: { nome: "Ana Souza", email: "ana@exemplo.com", whatsapp: "5562999990000", plano: "advisor" },
    });
  });

  it("exige nome, e-mail válido e plano", () => {
    const r = validarCadastro(form({ nome: "", email: "ana@", plano: "vip" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(["email", "nome", "plano"]);
  });
});

describe("edição de perfil", () => {
  it("papel e plano opcionais, mas só valores conhecidos", () => {
    expect(validarPerfil(form({ nome: "Ana" })).ok).toBe(true);
    const r = validarPerfil(form({ nome: "Ana", papel: "superadmin" }));
    expect(r.ok).toBe(false);
  });
});

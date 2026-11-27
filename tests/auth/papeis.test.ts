import { describe, expect, it } from "vitest";
import {
  destinoSeguro,
  ehPapel,
  menuPara,
  podeAcessarRota,
  podeAlterarPapel,
  podeCadastrarMembros,
  podeConfirmarItens,
  podePublicarPlano,
  rotaPublica,
} from "@/lib/auth/papeis";

describe("acesso a rotas por papel", () => {
  it("Mesa do Victor é só do admin", () => {
    expect(podeAcessarRota("admin", "/mesa")).toBe(true);
    expect(podeAcessarRota("admin", "/mesa/plano/123")).toBe(true);
    expect(podeAcessarRota("equipe", "/mesa")).toBe(false);
    expect(podeAcessarRota("membro", "/mesa/plano/123")).toBe(false);
  });

  it("área da equipe é de admin e equipe", () => {
    expect(podeAcessarRota("admin", "/equipe")).toBe(true);
    expect(podeAcessarRota("equipe", "/equipe/membros")).toBe(true);
    expect(podeAcessarRota("membro", "/equipe")).toBe(false);
  });

  it("prefixo parecido não abre área restrita", () => {
    expect(podeAcessarRota("membro", "/mesa-redonda")).toBe(true);
    expect(podeAcessarRota("membro", "/equipes")).toBe(true);
  });

  it("início e rotas comuns valem para todos os papéis", () => {
    for (const papel of ["admin", "equipe", "membro"] as const) {
      expect(podeAcessarRota(papel, "/")).toBe(true);
    }
  });

  it("login e callback são públicos", () => {
    expect(rotaPublica("/entrar")).toBe(true);
    expect(rotaPublica("/auth/confirmar")).toBe(true);
    expect(rotaPublica("/privacidade")).toBe(true);
    expect(rotaPublica("/")).toBe(false);
    expect(rotaPublica("/entrarx")).toBe(false);
  });
});

describe("ações por papel", () => {
  it("só admin publica plano e altera papel", () => {
    expect(podePublicarPlano("admin")).toBe(true);
    expect(podePublicarPlano("equipe")).toBe(false);
    expect(podePublicarPlano("membro")).toBe(false);
    expect(podeAlterarPapel("admin")).toBe(true);
    expect(podeAlterarPapel("equipe")).toBe(false);
  });

  it("equipe cadastra membros e confirma itens; membro não", () => {
    expect(podeCadastrarMembros("equipe")).toBe(true);
    expect(podeConfirmarItens("equipe")).toBe(true);
    expect(podeCadastrarMembros("membro")).toBe(false);
    expect(podeConfirmarItens("membro")).toBe(false);
  });
});

describe("menu", () => {
  it("cada papel vê só o que pode abrir", () => {
    expect(menuPara("membro").map((i) => i.href)).toEqual(["/", "/dossie"]);
    expect(menuPara("equipe").map((i) => i.href)).toEqual(["/", "/equipe"]);
    expect(menuPara("admin").map((i) => i.href)).toEqual(["/", "/equipe", "/mesa"]);
  });
});

describe("validação", () => {
  it("reconhece papéis válidos", () => {
    expect(ehPapel("admin")).toBe(true);
    expect(ehPapel("superadmin")).toBe(false);
    expect(ehPapel(null)).toBe(false);
  });

  it("destino pós-login nunca sai do site", () => {
    expect(destinoSeguro("/mesa")).toBe("/mesa");
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro("https://golpe.com")).toBe("/");
    expect(destinoSeguro("//golpe.com")).toBe("/");
    expect(destinoSeguro("/\\golpe.com")).toBe("/");
  });
});

import { PAPEIS, PLANOS_ASSINATURA, type Papel, type PlanoAssinatura } from "@/lib/auth/papeis";

export type DadosMembro = { nome: string; email: string; whatsapp: string | null; plano: PlanoAssinatura | null };
export type DadosPerfil = { nome: string; whatsapp: string | null; plano: PlanoAssinatura | null; papel: Papel | null };
export type Validacao<T> = { ok: true; dados: T } | { ok: false; erros: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** WhatsApp só com dígitos, com DDD (10 ou 11 dígitos) e, opcionalmente, o 55 na frente. */
export function normalizarWhatsapp(valor: string): string | null | "invalido" {
  const d = valor.replace(/\D/g, "");
  if (!d) return null;
  const semPais = d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
  return semPais.length === 10 || semPais.length === 11 ? `55${semPais}` : "invalido";
}

export function formatarWhatsapp(valor: string | null): string {
  if (!valor) return "";
  const d = valor.startsWith("55") ? valor.slice(2) : valor;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

function plano(valor: string): PlanoAssinatura | null | "invalido" {
  if (!valor) return null;
  return (PLANOS_ASSINATURA as readonly string[]).includes(valor) ? (valor as PlanoAssinatura) : "invalido";
}

export function validarCadastro(formData: FormData): Validacao<DadosMembro> {
  const erros: Record<string, string> = {};
  const nome = texto(formData, "nome");
  const email = texto(formData, "email").toLowerCase();
  const whatsapp = normalizarWhatsapp(texto(formData, "whatsapp"));
  const planoEscolhido = plano(texto(formData, "plano"));

  if (nome.length < 2 || nome.length > 120) erros.nome = "Informe o nome completo.";
  if (!EMAIL.test(email) || email.length > 200) erros.email = "Confira o e-mail.";
  if (whatsapp === "invalido") erros.whatsapp = "WhatsApp com DDD, ex.: (62) 99999-0000.";
  if (planoEscolhido === "invalido" || planoEscolhido === null) erros.plano = "Escolha o plano.";

  if (Object.keys(erros).length) return { ok: false, erros };
  return {
    ok: true,
    dados: { nome, email, whatsapp: whatsapp as string | null, plano: planoEscolhido as PlanoAssinatura },
  };
}

export function validarPerfil(formData: FormData): Validacao<DadosPerfil> {
  const erros: Record<string, string> = {};
  const nome = texto(formData, "nome");
  const whatsapp = normalizarWhatsapp(texto(formData, "whatsapp"));
  const planoEscolhido = plano(texto(formData, "plano"));
  const papelBruto = texto(formData, "papel");
  const papel = papelBruto ? ((PAPEIS as readonly string[]).includes(papelBruto) ? (papelBruto as Papel) : "invalido") : null;

  if (nome.length < 2 || nome.length > 120) erros.nome = "Informe o nome completo.";
  if (whatsapp === "invalido") erros.whatsapp = "WhatsApp com DDD, ex.: (62) 99999-0000.";
  if (planoEscolhido === "invalido") erros.plano = "Plano inválido.";
  if (papel === "invalido") erros.papel = "Papel inválido.";

  if (Object.keys(erros).length) return { ok: false, erros };
  return {
    ok: true,
    dados: {
      nome,
      whatsapp: whatsapp as string | null,
      plano: planoEscolhido as PlanoAssinatura | null,
      papel: papel as Papel | null,
    },
  };
}

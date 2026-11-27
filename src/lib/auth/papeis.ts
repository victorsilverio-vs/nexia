/**
 * Regras de acesso por papel, puras e testáveis.
 * O banco (RLS) é a proteção definitiva; estas regras decidem o que o app mostra
 * e para onde redireciona.
 */

export const PAPEIS = ["admin", "equipe", "membro"] as const;
export type Papel = (typeof PAPEIS)[number];

export const PLANOS_ASSINATURA = ["nexia", "advisor", "advisor_private"] as const;
export type PlanoAssinatura = (typeof PLANOS_ASSINATURA)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Admin",
  equipe: "Equipe",
  membro: "Membro",
};

export const ROTULO_PLANO: Record<PlanoAssinatura, string> = {
  nexia: "NEXIA",
  advisor: "Advisor",
  advisor_private: "Advisor Private",
};

export function ehPapel(valor: unknown): valor is Papel {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}

/** Rotas abertas, sem login. */
const ROTAS_PUBLICAS = ["/entrar", "/auth", "/privacidade"];

/** Áreas restritas, do prefixo mais específico ao mais geral. */
const AREAS_RESTRITAS: { prefixo: string; papeis: readonly Papel[] }[] = [
  { prefixo: "/mesa", papeis: ["admin"] },
  { prefixo: "/equipe", papeis: ["admin", "equipe"] },
];

function casaPrefixo(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(prefixo + "/");
}

export function rotaPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some((p) => casaPrefixo(caminho, p));
}

/** Pode este papel abrir esta rota? Rotas não listadas valem para qualquer usuário logado. */
export function podeAcessarRota(papel: Papel, caminho: string): boolean {
  if (rotaPublica(caminho)) return true;
  const area = AREAS_RESTRITAS.find((a) => casaPrefixo(caminho, a.prefixo));
  return area ? area.papeis.includes(papel) : true;
}

export function podePublicarPlano(papel: Papel): boolean {
  return papel === "admin";
}

export function podeCadastrarMembros(papel: Papel): boolean {
  return papel === "admin" || papel === "equipe";
}

export function podeConfirmarItens(papel: Papel): boolean {
  return papel === "admin" || papel === "equipe";
}

export function podeAlterarPapel(papel: Papel): boolean {
  return papel === "admin";
}

export type ItemMenu = { href: string; rotulo: string };

const MENU: (ItemMenu & { soPara?: readonly Papel[] })[] = [
  { href: "/", rotulo: "Início" },
  { href: "/dossie", rotulo: "Dossiê", soPara: ["membro"] },
  { href: "/equipe", rotulo: "Membros" },
  { href: "/mesa", rotulo: "Mesa do Victor" },
];

/** Itens de menu que o papel enxerga. */
export function menuPara(papel: Papel): ItemMenu[] {
  return MENU.filter((item) => podeAcessarRota(papel, item.href) && (!item.soPara || item.soPara.includes(papel))).map(
    ({ href, rotulo }) => ({ href, rotulo }),
  );
}

/**
 * Destino seguro depois do login: só caminhos internos, nunca URL externa
 * (evita redirecionamento aberto via ?proximo=https://...).
 */
export function destinoSeguro(proximo: string | null | undefined): string {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//") || proximo.startsWith("/\\")) {
    return "/";
  }
  return proximo;
}

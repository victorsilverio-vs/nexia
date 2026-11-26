import Link from "next/link";
import { Marca } from "@/components/marca";
import { menuPara, ROTULO_PAPEL } from "@/lib/auth/papeis";
import { exigirUsuario } from "@/lib/auth/sessao";
import estilos from "./area.module.css";

/** Moldura das telas logadas: cabeçalho, menu por papel e sair. */
export default async function LayoutArea({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const menu = menuPara(usuario.papel);

  return (
    <div className={estilos.moldura}>
      <header className={estilos.cabecalho}>
        <div className={estilos.faixa}>
          <Link href="/" aria-label="Início" className={estilos.logo}>
            <Marca escuro />
          </Link>
          <div className={estilos.usuario}>
            <span className={estilos.nomeUsuario}>{usuario.nome || usuario.email}</span>
            <span className="etiqueta">{ROTULO_PAPEL[usuario.papel]}</span>
            <form action="/sair" method="post">
              <button type="submit" className={estilos.sair}>
                Sair
              </button>
            </form>
          </div>
        </div>
        {menu.length > 1 ? (
          <nav aria-label="Principal" className={estilos.menu}>
            {menu.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.rotulo}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className={estilos.conteudo}>{children}</main>
    </div>
  );
}

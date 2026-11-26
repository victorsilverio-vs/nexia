import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth/sessao";
import estilos from "../paginas.module.css";

export const metadata: Metadata = { title: "Membros" };

export default async function PaginaEquipe() {
  await exigirUsuario(["admin", "equipe"]);

  return (
    <>
      <h1 className={estilos.titulo}>Membros</h1>
      <p className={estilos.vazio}>O cadastro de membros chega no próximo marco.</p>
    </>
  );
}

import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth/sessao";
import estilos from "../paginas.module.css";

export const metadata: Metadata = { title: "Mesa do Victor" };

export default async function PaginaMesa() {
  await exigirUsuario(["admin"]);

  return (
    <>
      <h1 className={estilos.titulo}>Mesa do Victor</h1>
      <p className={estilos.vazio}>Nenhuma pendência. Dossiês enviados e rascunhos de plano aparecem aqui.</p>
    </>
  );
}

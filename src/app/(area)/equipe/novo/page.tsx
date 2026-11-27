import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth/sessao";
import estilos from "../../paginas.module.css";
import estilosEquipe from "../equipe.module.css";
import { FormularioCadastro } from "./formulario";

export const metadata: Metadata = { title: "Cadastrar membro" };

export default async function PaginaNovoMembro() {
  await exigirUsuario(["admin", "equipe"]);
  return (
    <>
      <Link href="/equipe" className={estilosEquipe.voltar}>
        ← Membros
      </Link>
      <h1 className={estilos.titulo}>Cadastrar membro</h1>
      <FormularioCadastro />
    </>
  );
}

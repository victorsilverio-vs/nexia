import estilos from "./marca.module.css";

/** Logotipo textual da NEXIA. `escuro` para fundos pretos. */
export function Marca({ escuro = false }: { escuro?: boolean }) {
  return (
    <span className={`${estilos.marca} ${escuro ? estilos.escuro : ""}`}>
      <span className={estilos.nome}>NEXIA</span>
      <span className={estilos.assinatura}>Ecossistema VS</span>
    </span>
  );
}

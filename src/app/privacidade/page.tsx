import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/marca";
import estilos from "./privacidade.module.css";

export const metadata: Metadata = { title: "Política de Privacidade" };

// RASCUNHO: precisa de revisão jurídica antes de valer para membros reais (ver README).
export default function PaginaPrivacidade() {
  return (
    <main className={estilos.pagina}>
      <Link href="/" aria-label="NEXIA">
        <Marca />
      </Link>
      <article className={estilos.texto}>
        <h1>Política de Privacidade da NEXIA</h1>
        <p className={estilos.versao}>Versão preliminar · novembro de 2026</p>

        <h2>1. Quem somos</h2>
        <p>
          A NEXIA é a plataforma de assessoria em desenvolvimento imobiliário do Ecossistema VS. Esta política explica
          quais dados pessoais tratamos, para quê, com quem compartilhamos e quais são os seus direitos, conforme a Lei
          Geral de Proteção de Dados (Lei 13.709/2018).
        </p>

        <h2>2. Dados que coletamos</h2>
        <ul>
          <li>Cadastro: nome, e-mail, WhatsApp e plano contratado.</li>
          <li>
            Dossiê: cidade, formação, profissão, experiência, objetivos, faixa de capital, informações sobre seus
            empreendimentos e terrenos, documentos e fotos que você anexar, e o que você oferece e procura na comunidade.
          </li>
          <li>Uso da plataforma: registros de acesso e das ações realizadas, para segurança e suporte.</li>
        </ul>

        <h2>3. Para que usamos</h2>
        <ul>
          <li>Prestar a assessoria: montar e acompanhar o seu plano de ação.</li>
          <li>Enviar comunicações sobre a plataforma, encontros e prazos.</li>
          <li>Com a sua autorização específica: sugerir conexões com outros membros e parceiros.</li>
          <li>Com a sua autorização específica, no futuro: exibir seus empreendimentos no mapa da comunidade.</li>
        </ul>

        <h2>4. Inteligência artificial</h2>
        <p>
          Usamos ferramentas de inteligência artificial para preparar rascunhos de planos e sugestões. Nada gerado
          automaticamente chega a você sem revisão e aprovação da nossa equipe.
        </p>

        <h2>5. Compartilhamento</h2>
        <p>
          Não vendemos seus dados. Eles são processados por fornecedores que nos ajudam a operar a plataforma
          (hospedagem, banco de dados, envio de e-mails e inteligência artificial), sob contrato e apenas para essas
          finalidades. Dados de um empreendimento são visíveis só para as pessoas que participam dele e para a equipe
          NEXIA.
        </p>

        <h2>6. Guarda e segurança</h2>
        <p>
          Os dados ficam armazenados em servidores no Brasil, com acesso restrito por perfil. Guardamos as informações
          enquanto você for membro e pelo prazo necessário para cumprir obrigações legais.
        </p>

        <h2>7. Seus direitos</h2>
        <p>
          Você pode, a qualquer momento, pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar
          autorizações dadas. Basta falar com a equipe NEXIA.
        </p>

        <h2>8. Contato</h2>
        <p>Dúvidas sobre privacidade: fale com a equipe NEXIA pelos canais oficiais do Ecossistema VS.</p>
      </article>
    </main>
  );
}

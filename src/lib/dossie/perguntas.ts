/**
 * Perguntas do dossiê. Para incluir, tirar ou mudar uma pergunta, edite só esta lista:
 * as telas, o salvamento, a validação e o resumo para a equipe se ajustam sozinhos.
 *
 * Regras:
 *  - `id` nunca muda depois que houver respostas (é a chave gravada no banco).
 *  - `mostrarSe` recebe as respostas da mesma seção (ou do mesmo empreendimento).
 *  - Pergunta escondida não é obrigatória e sua resposta é descartada ao salvar.
 */

export type Opcao = { valor: string; rotulo: string };
export type Valores = Record<string, unknown>;

type Base = {
  id: string;
  rotulo: string;
  ajuda?: string;
  obrigatoria?: boolean;
  mostrarSe?: (valores: Valores) => boolean;
};

export type Pergunta =
  | (Base & { tipo: "texto"; max?: number; placeholder?: string })
  | (Base & { tipo: "textoLongo"; max?: number; placeholder?: string })
  | (Base & { tipo: "numero"; sufixo?: string })
  | (Base & { tipo: "moeda" })
  | (Base & { tipo: "uf" })
  | (Base & { tipo: "cnpj" })
  | (Base & { tipo: "simNao" })
  | (Base & { tipo: "escolha"; opcoes: Opcao[] })
  | (Base & { tipo: "multipla"; opcoes: Opcao[] })
  | (Base & { tipo: "anexos" });

export type SecaoSimples = {
  id: string;
  tipo: "simples";
  titulo: string;
  descricao: string;
  perguntas: Pergunta[];
};

export type SecaoLista = {
  id: string;
  tipo: "lista";
  titulo: string;
  descricao: string;
  rotuloItem: string;
  maxItens: number;
  perguntas: Pergunta[];
};

export type SecaoConsentimentos = {
  id: "consentimentos";
  tipo: "consentimentos";
  titulo: string;
  descricao: string;
};

export type Secao = SecaoSimples | SecaoLista | SecaoConsentimentos;

const op = (lista: [string, string][]): Opcao[] => lista.map(([valor, rotulo]) => ({ valor, rotulo }));
const eh = (campo: string, valor: unknown) => (v: Valores) => v[campo] === valor;
const temItens = (campo: string) => (v: Valores) => Array.isArray(v[campo]) && (v[campo] as unknown[]).length > 0;
const inclui = (campo: string, valor: string) => (v: Valores) =>
  Array.isArray(v[campo]) && (v[campo] as unknown[]).includes(valor);
const preenchidoEDiferenteDe = (campo: string, valor: string) => (v: Valores) =>
  typeof v[campo] === "string" && v[campo] !== "" && v[campo] !== valor;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const TIPOLOGIAS = op([
  ["loteamento_aberto", "Loteamento aberto"],
  ["condominio_lotes", "Condomínio de lotes"],
  ["casas", "Casas / condomínio horizontal"],
  ["predio_residencial", "Prédio residencial"],
  ["studios", "Studios / compactos"],
  ["comercial", "Comercial (salas e lojas)"],
  ["hotel", "Hotel, pousada ou multipropriedade"],
  ["uso_misto", "Uso misto"],
  ["nao_sei", "Ainda não sei"],
]);

export const SECOES: Secao[] = [
  {
    id: "pessoa",
    tipo: "simples",
    titulo: "Sobre você",
    descricao: "Para conhecermos quem está do outro lado da mesa.",
    perguntas: [
      { id: "cidade", tipo: "texto", rotulo: "Cidade onde você mora", obrigatoria: true },
      { id: "uf", tipo: "uf", rotulo: "Estado", obrigatoria: true },
      { id: "cidade_origem", tipo: "texto", rotulo: "Cidade de origem", ajuda: "Se for diferente de onde mora hoje." },
      { id: "formacao", tipo: "texto", rotulo: "Formação", placeholder: "Ex.: Engenharia Civil, Direito, Administração" },
      { id: "profissao", tipo: "texto", rotulo: "Profissão atual", obrigatoria: true },
      { id: "tem_empresa", tipo: "simNao", rotulo: "Você tem empresa?" },
      { id: "empresa_nome", tipo: "texto", rotulo: "Nome da empresa", mostrarSe: eh("tem_empresa", true) },
      { id: "empresa_cnpj", tipo: "cnpj", rotulo: "CNPJ", mostrarSe: eh("tem_empresa", true) },
      { id: "trabalhou_ramo", tipo: "simNao", rotulo: "Já trabalhou em empresa do ramo imobiliário?" },
      {
        id: "trabalhou_ramo_detalhe",
        tipo: "textoLongo",
        rotulo: "Qual empresa e em que função?",
        mostrarSe: eh("trabalhou_ramo", true),
      },
      { id: "hobbies", tipo: "textoLongo", rotulo: "Hobbies e interesses fora do trabalho" },
      {
        id: "como_conheceu",
        tipo: "escolha",
        rotulo: "Como você conheceu o Ecossistema VS?",
        opcoes: op([
          ["instagram", "Instagram"],
          ["youtube", "YouTube"],
          ["indicacao", "Indicação de alguém"],
          ["evento", "Evento ou palestra"],
          ["aluno", "Já sou aluno do Ecossistema VS"],
          ["outro", "Outro"],
        ]),
      },
    ],
  },
  {
    id: "experiencia",
    tipo: "simples",
    titulo: "Experiência e capacidades",
    descricao: "O que você já viveu no mercado e onde você é forte.",
    perguntas: [
      {
        id: "tempo_mercado",
        tipo: "escolha",
        rotulo: "Há quanto tempo você atua no mercado imobiliário?",
        opcoes: op([
          ["nenhum", "Ainda não atuo"],
          ["ate2", "Até 2 anos"],
          ["2a5", "De 2 a 5 anos"],
          ["5a10", "De 5 a 10 anos"],
          ["mais10", "Mais de 10 anos"],
        ]),
      },
      {
        id: "exp_obra",
        tipo: "escolha",
        rotulo: "Qual a sua experiência em obra?",
        opcoes: op([
          ["nenhuma", "Nenhuma"],
          ["acompanhei", "Já acompanhei obras"],
          ["gerenciei", "Já gerenciei obras"],
          ["construtora", "Tenho construtora"],
        ]),
      },
      { id: "exp_projeto", tipo: "simNao", rotulo: "Você tem experiência em projeto?" },
      {
        id: "tipos_projeto",
        tipo: "multipla",
        rotulo: "Quais tipos de projeto?",
        mostrarSe: eh("exp_projeto", true),
        opcoes: op([
          ["arquitetonico", "Arquitetônico"],
          ["estrutural", "Estrutural"],
          ["complementares", "Complementares (elétrico, hidráulico etc.)"],
          ["urbanismo", "Urbanismo / loteamento"],
          ["interiores", "Interiores"],
          ["aprovacao", "Aprovação legal"],
        ]),
      },
      { id: "ja_incorporou", tipo: "simNao", rotulo: "Você já incorporou algum empreendimento?" },
      {
        id: "qtd_empreendimentos",
        tipo: "numero",
        rotulo: "Quantos empreendimentos?",
        mostrarSe: eh("ja_incorporou", true),
      },
      {
        id: "tipologias_incorporadas",
        tipo: "multipla",
        rotulo: "De quais tipologias?",
        mostrarSe: eh("ja_incorporou", true),
        opcoes: TIPOLOGIAS.filter((t) => t.valor !== "nao_sei"),
      },
      {
        id: "vgv_realizado",
        tipo: "moeda",
        rotulo: "VGV aproximado somado desses empreendimentos",
        mostrarSe: eh("ja_incorporou", true),
      },
      {
        id: "pontos_fortes",
        tipo: "multipla",
        rotulo: "Em que você se considera forte?",
        ajuda: "Marque quantas quiser.",
        opcoes: op([
          ["prospeccao", "Prospecção de terrenos"],
          ["mercado", "Mercado e produto"],
          ["viabilidade", "Viabilidade"],
          ["captacao", "Captação de recursos"],
          ["aprovacoes", "Aprovações e licenças"],
          ["vendas", "Vendas"],
          ["obra", "Obra"],
          ["juridico", "Jurídico"],
          ["financas", "Finanças"],
          ["marketing", "Marketing"],
        ]),
      },
    ],
  },
  {
    id: "momento",
    tipo: "simples",
    titulo: "Momento e objetivos",
    descricao: "Onde você está hoje e aonde quer chegar.",
    perguntas: [
      {
        id: "estagio",
        tipo: "escolha",
        rotulo: "Em que estágio você está?",
        obrigatoria: true,
        opcoes: op([
          ["ideia", "Só tenho a ideia"],
          ["terreno", "Tenho um terreno em vista ou em negociação"],
          ["projeto", "Tenho terreno e projeto"],
          ["incorporou", "Já incorporei"],
        ]),
      },
      { id: "objetivo_12m", tipo: "textoLongo", rotulo: "Qual o seu objetivo para os próximos 12 meses?", obrigatoria: true },
      { id: "objetivo_3a5", tipo: "textoLongo", rotulo: "Onde você quer estar daqui a 3 a 5 anos?" },
      {
        id: "horas_semana",
        tipo: "escolha",
        rotulo: "Quantas horas por semana você pode dedicar à incorporação?",
        obrigatoria: true,
        opcoes: op([
          ["ate5", "Até 5 horas"],
          ["5a10", "De 5 a 10 horas"],
          ["10a20", "De 10 a 20 horas"],
          ["20a40", "De 20 a 40 horas"],
          ["integral", "Dedicação integral"],
        ]),
      },
      { id: "maior_dificuldade", tipo: "textoLongo", rotulo: "Qual a sua maior dificuldade hoje?" },
      { id: "expectativa", tipo: "textoLongo", rotulo: "O que você espera da NEXIA?" },
    ],
  },
  {
    id: "empreendimentos",
    tipo: "lista",
    titulo: "Empreendimentos",
    descricao: "Cadastre os projetos ou terrenos que você tem em mente. Se ainda não tem nenhum, pode pular.",
    rotuloItem: "Empreendimento",
    maxItens: 10,
    perguntas: [
      { id: "nome", tipo: "texto", rotulo: "Nome ou apelido", obrigatoria: true, placeholder: "Ex.: Terreno da Av. Brasil" },
      { id: "cidade", tipo: "texto", rotulo: "Cidade" },
      { id: "uf", tipo: "uf", rotulo: "Estado" },
      { id: "bairro", tipo: "texto", rotulo: "Bairro ou região" },
      { id: "area_terreno", tipo: "numero", rotulo: "Área do terreno", sufixo: "m²" },
      { id: "tipologias", tipo: "multipla", rotulo: "Tipologia pensada", opcoes: TIPOLOGIAS },
      {
        id: "relacao_terreno",
        tipo: "escolha",
        rotulo: "Qual a sua relação com o terreno?",
        opcoes: op([
          ["proprietario", "Sou proprietário"],
          ["permuta", "Permuta com o proprietário"],
          ["opcao", "Opção de compra"],
          ["negociacao", "Em negociação"],
          ["identificado", "Só identifiquei o terreno"],
        ]),
      },
      {
        id: "contrato",
        tipo: "escolha",
        rotulo: "Tem contrato assinado com o proprietário?",
        mostrarSe: preenchidoEDiferenteDe("relacao_terreno", "proprietario"),
        opcoes: op([
          ["permuta", "Sim, contrato de permuta"],
          ["opcao", "Sim, opção de compra"],
          ["promessa", "Sim, promessa de compra e venda"],
          ["nenhum", "Ainda não"],
        ]),
      },
      {
        id: "matricula",
        tipo: "escolha",
        rotulo: "A matrícula do terreno está regularizada?",
        opcoes: op([
          ["sim", "Sim"],
          ["nao", "Não"],
          ["nao_sei", "Não sei"],
        ]),
      },
      {
        id: "pendencias_matricula",
        tipo: "multipla",
        rotulo: "Qual a pendência?",
        mostrarSe: eh("matricula", "nao"),
        opcoes: op([
          ["inventario", "Inventário"],
          ["usucapiao", "Usucapião"],
          ["desmembramento", "Desmembramento ou unificação"],
          ["onus", "Ônus ou dívidas"],
          ["outra", "Outra"],
        ]),
      },
      {
        id: "zoneamento",
        tipo: "escolha",
        rotulo: "Você conhece o zoneamento e o potencial construtivo?",
        opcoes: op([
          ["sim", "Sim"],
          ["parcial", "Em parte"],
          ["nao", "Não"],
        ]),
      },
      {
        id: "projeto",
        tipo: "escolha",
        rotulo: "Em que ponto está o projeto?",
        opcoes: op([
          ["nenhum", "Ainda não tem projeto"],
          ["estudo_massa", "Estudo de massa"],
          ["anteprojeto", "Anteprojeto"],
          ["legal", "Projeto legal"],
          ["executivo", "Projeto executivo"],
        ]),
      },
      {
        id: "situacao_prefeitura",
        tipo: "escolha",
        rotulo: "Situação na prefeitura",
        mostrarSe: preenchidoEDiferenteDe("projeto", "nenhum"),
        opcoes: op([
          ["nao_protocolado", "Não protocolado"],
          ["em_analise", "Em análise"],
          ["aprovado", "Aprovado"],
          ["alvara", "Alvará emitido"],
        ]),
      },
      {
        id: "licenca_ambiental",
        tipo: "escolha",
        rotulo: "Licença ambiental",
        opcoes: op([
          ["nao_precisa", "Não precisa"],
          ["precisa", "Precisa e ainda não tem"],
          ["em_andamento", "Em andamento"],
          ["tem", "Já tem"],
          ["nao_sei", "Não sei"],
        ]),
      },
      {
        id: "viabilidade",
        tipo: "escolha",
        rotulo: "Tem estudo de viabilidade?",
        opcoes: op([
          ["nenhum", "Não tem"],
          ["proprio", "Fiz eu mesmo"],
          ["consultoria", "Feito por consultoria"],
        ]),
      },
      {
        id: "vgv_estimado",
        tipo: "moeda",
        rotulo: "VGV estimado",
        mostrarSe: preenchidoEDiferenteDe("viabilidade", "nenhum"),
      },
      {
        id: "custo_estimado",
        tipo: "moeda",
        rotulo: "Custo total estimado",
        mostrarSe: preenchidoEDiferenteDe("viabilidade", "nenhum"),
      },
      { id: "pesquisa_mercado", tipo: "simNao", rotulo: "Já fez pesquisa de mercado?" },
      { id: "tem_socios", tipo: "simNao", rotulo: "Tem sócios neste empreendimento?" },
      { id: "observacoes", tipo: "textoLongo", rotulo: "Algo mais que devemos saber?" },
      {
        id: "arquivos",
        tipo: "anexos",
        rotulo: "Fotos e documentos",
        ajuda: "Matrícula, projeto, estudos, fotos do terreno. Imagens ou PDF, até 20 MB cada.",
      },
    ],
  },
  {
    id: "capital",
    tipo: "simples",
    titulo: "Capital e investidores",
    descricao: "Com quanto você conta e quem pode vir junto.",
    perguntas: [
      {
        id: "faixa",
        tipo: "escolha",
        rotulo: "Capital próprio disponível para incorporar",
        obrigatoria: true,
        opcoes: op([
          ["ate100k", "Até R$ 100 mil"],
          ["100a500k", "De R$ 100 mil a R$ 500 mil"],
          ["500ka1m", "De R$ 500 mil a R$ 1 milhão"],
          ["acima1m", "Acima de R$ 1 milhão"],
        ]),
      },
      { id: "tem_socios", tipo: "simNao", rotulo: "Você tem sócios?" },
      { id: "socios_detalhe", tipo: "textoLongo", rotulo: "Quantos e qual o perfil deles?", mostrarSe: eh("tem_socios", true) },
      { id: "investidores_proprios", tipo: "simNao", rotulo: "Já tem possíveis investidores para o seu projeto?" },
      {
        id: "investidores_rede",
        tipo: "simNao",
        rotulo: "Conhece pessoas que poderiam investir em empreendimentos de outros membros da NEXIA?",
      },
      { id: "credito", tipo: "simNao", rotulo: "Tem acesso a crédito ou relacionamento com bancos?" },
      {
        id: "operacoes",
        tipo: "multipla",
        rotulo: "Já estruturou alguma destas operações?",
        opcoes: op([
          ["spe", "SPE"],
          ["scp", "SCP"],
          ["permuta_financeira", "Permuta financeira"],
          ["nenhuma", "Nenhuma"],
        ]),
      },
    ],
  },
  {
    id: "rede",
    tipo: "simples",
    titulo: "O que você traz para a comunidade",
    descricao: "A NEXIA é uma rede. Conte o que você pode oferecer e o que procura.",
    perguntas: [
      { id: "oferece_servico", tipo: "simNao", rotulo: "Pretende oferecer algum serviço aos membros?" },
      {
        id: "servicos",
        tipo: "multipla",
        rotulo: "Quais serviços?",
        mostrarSe: eh("oferece_servico", true),
        opcoes: op([
          ["projeto", "Projeto"],
          ["engenharia", "Engenharia"],
          ["construcao", "Construção"],
          ["marketing", "Marketing"],
          ["vendas", "Vendas / imobiliária"],
          ["advocacia", "Advocacia"],
          ["contabilidade", "Contabilidade"],
          ["topografia", "Topografia"],
          ["ambiental", "Consultoria ambiental"],
          ["captacao", "Captação de recursos"],
          ["outro", "Outro"],
        ]),
      },
      { id: "servicos_outro", tipo: "texto", rotulo: "Qual outro serviço?", mostrarSe: inclui("servicos", "outro") },
      { id: "conhecimentos", tipo: "textoLongo", rotulo: "Conhecimentos específicos ou especializados que você tem" },
      { id: "pode_ensinar", tipo: "textoLongo", rotulo: "O que você poderia ensinar a outros membros?" },
      {
        id: "conexoes",
        tipo: "multipla",
        rotulo: "Que conexões relevantes você tem?",
        opcoes: op([
          ["proprietarios", "Proprietários de terra"],
          ["prefeituras", "Prefeituras e órgãos públicos"],
          ["corretores", "Corretores e imobiliárias"],
          ["construtoras", "Construtoras"],
          ["bancos_fundos", "Bancos e fundos"],
          ["investidores", "Investidores"],
          ["influentes", "Pessoas influentes"],
        ]),
      },
      { id: "conexoes_detalhe", tipo: "textoLongo", rotulo: "Conte um pouco sobre essas conexões", mostrarSe: temItens("conexoes") },
      {
        id: "ativos",
        tipo: "multipla",
        rotulo: "Outros ativos que podem ter valor para a comunidade",
        opcoes: op([
          ["terrenos", "Terrenos"],
          ["imoveis", "Imóveis"],
          ["equipamentos", "Equipamentos"],
          ["audiencia", "Audiência nas redes sociais"],
          ["marca", "Marca ou empresa conhecida"],
          ["outros", "Outros"],
        ]),
      },
      { id: "ativos_detalhe", tipo: "textoLongo", rotulo: "Conte mais sobre esses ativos", mostrarSe: temItens("ativos") },
      {
        id: "procura",
        tipo: "multipla",
        rotulo: "O que você procura?",
        opcoes: op([
          ["socio", "Sócio"],
          ["investidor", "Investidor"],
          ["terreno", "Terreno"],
          ["projetista", "Projetista"],
          ["construtora", "Construtora"],
          ["mentoria", "Mentoria"],
          ["outro", "Outro"],
        ]),
      },
      { id: "procura_detalhe", tipo: "textoLongo", rotulo: "Quer detalhar o que procura?" },
    ],
  },
  {
    id: "consentimentos",
    tipo: "consentimentos",
    titulo: "Consentimentos e envio",
    descricao: "Confira o que falta, autorize o uso dos dados e envie.",
  },
];

export const TIPOS_CONSENTIMENTO = [
  {
    tipo: "lgpd",
    obrigatorio: true,
    rotulo: "Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados pela NEXIA para a assessoria.",
  },
  {
    tipo: "conexoes",
    obrigatorio: false,
    rotulo: "Autorizo usar meus dados para sugerir conexões com outros membros e parceiros.",
  },
  {
    tipo: "mapa",
    obrigatorio: false,
    rotulo: "Autorizo, no futuro, exibir meus empreendimentos no mapa da comunidade NEXIA.",
  },
] as const;

export type TipoConsentimento = (typeof TIPOS_CONSENTIMENTO)[number]["tipo"];

export function secaoPorId(id: string): Secao | undefined {
  return SECOES.find((s) => s.id === id);
}

export function rotuloOpcao(pergunta: Pergunta, valor: unknown): string {
  if ((pergunta.tipo === "escolha" || pergunta.tipo === "multipla") && typeof valor === "string") {
    return pergunta.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
  }
  return String(valor);
}

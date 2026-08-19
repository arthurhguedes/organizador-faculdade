// Lista curada de instituições de ensino superior brasileiras (públicas e
// privadas) pra facilitar o preenchimento do Perfil com um <select> em vez de
// texto livre. Não é (e não pretende ser) exaustiva — cobre as mais conhecidas
// de cada categoria; quem não encontrar a própria escolhe "Outra instituição"
// e digita o nome. Mesmo raciocínio de "sem base pré-cadastrada por chute" das
// planilhas de oferta: aqui é só uma lista de conveniência, o campo salvo
// continua sendo texto livre (users.institution).

export type InstitutionGroup = {
  label: string;
  options: string[];
};

export const INSTITUTION_GROUPS: InstitutionGroup[] = [
  {
    label: "Federais",
    options: [
      "Universidade Federal de Alfenas (UNIFAL-MG)",
      "Universidade Federal do Amazonas (UFAM)",
      "Universidade Federal da Bahia (UFBA)",
      "Universidade Federal do Ceará (UFC)",
      "Universidade Federal do Espírito Santo (UFES)",
      "Universidade Federal Fluminense (UFF)",
      "Universidade Federal de Goiás (UFG)",
      "Universidade Federal de Itajubá (UNIFEI)",
      "Universidade Federal de Juiz de Fora (UFJF)",
      "Universidade Federal de Lavras (UFLA)",
      "Universidade Federal de Mato Grosso (UFMT)",
      "Universidade Federal de Mato Grosso do Sul (UFMS)",
      "Universidade Federal de Minas Gerais (UFMG)",
      "Universidade Federal de Ouro Preto (UFOP)",
      "Universidade Federal do Pará (UFPA)",
      "Universidade Federal da Paraíba (UFPB)",
      "Universidade Federal do Paraná (UFPR)",
      "Universidade Federal de Pernambuco (UFPE)",
      "Universidade Federal do Piauí (UFPI)",
      "Universidade Federal do Rio de Janeiro (UFRJ)",
      "Universidade Federal do Rio Grande do Norte (UFRN)",
      "Universidade Federal do Rio Grande do Sul (UFRGS)",
      "Universidade Federal de Santa Catarina (UFSC)",
      "Universidade Federal de Santa Maria (UFSM)",
      "Universidade Federal de São Carlos (UFSCar)",
      "Universidade Federal de São Paulo (UNIFESP)",
      "Universidade Federal de Sergipe (UFS)",
      "Universidade Federal de Uberlândia (UFU)",
      "Universidade Federal de Viçosa (UFV)",
      "Universidade Federal do ABC (UFABC)",
      "Universidade de Brasília (UnB)",
      "Universidade Tecnológica Federal do Paraná (UTFPR)",
    ],
  },
  {
    label: "Estaduais",
    options: [
      "Universidade de São Paulo (USP)",
      "Universidade Estadual de Campinas (UNICAMP)",
      "Universidade Estadual Paulista (UNESP)",
      "Universidade do Estado do Rio de Janeiro (UERJ)",
      "Universidade Estadual do Norte Fluminense (UENF)",
      "Universidade Estadual de Londrina (UEL)",
      "Universidade Estadual de Maringá (UEM)",
      "Universidade Estadual de Ponta Grossa (UEPG)",
      "Universidade do Estado de Minas Gerais (UEMG)",
      "Universidade Estadual de Feira de Santana (UEFS)",
      "Universidade do Estado de Santa Catarina (UDESC)",
      "Universidade Estadual do Ceará (UECE)",
    ],
  },
  {
    label: "Privadas",
    options: [
      "Pontifícia Universidade Católica de São Paulo (PUC-SP)",
      "Pontifícia Universidade Católica do Rio de Janeiro (PUC-Rio)",
      "Pontifícia Universidade Católica de Minas Gerais (PUC Minas)",
      "Pontifícia Universidade Católica do Rio Grande do Sul (PUCRS)",
      "Pontifícia Universidade Católica do Paraná (PUCPR)",
      "Pontifícia Universidade Católica de Campinas (PUC-Campinas)",
      "Universidade Presbiteriana Mackenzie",
      "Fundação Getulio Vargas (FGV)",
      "Insper",
      "Universidade de Fortaleza (UNIFOR)",
      "Universidade Salvador (UNIFACS)",
      "Universidade Potiguar (UnP)",
      "Centro Universitário de Brasília (UniCEUB)",
      "Universidade do Vale do Rio dos Sinos (Unisinos)",
      "Universidade de Caxias do Sul (UCS)",
      "Universidade Positivo",
      "Universidade Estácio de Sá (Estácio)",
      "Universidade Anhembi Morumbi",
      "Universidade Nove de Julho (UNINOVE)",
      "Universidade Paulista (UNIP)",
      "Centro Universitário Uninter",
      "Universidade Cruzeiro do Sul",
      "Faculdades Metropolitanas Unidas (FMU)",
      "Universidade Cidade de São Paulo (UNICID)",
      "Centro Universitário FIAP (FIAP)",
      "Universidade Anhanguera",
    ],
  },
];

export const ALL_INSTITUTIONS: string[] = INSTITUTION_GROUPS.flatMap((group) => group.options);

export const OTHER_INSTITUTION_VALUE = "__outra__";

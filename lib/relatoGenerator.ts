import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";
import { CAMPOS_TEXTO_ESTADO_BOLETIM, type EstadoBoletim, type Individuo } from "./boletimEstado";
import { CODIGO_PENAL_GUARULHOS } from "./codigoPenalGuarulhos";
import { CATEGORIAS_MATERIAL, UNIDADES_MATERIAL, type MaterialApreendido } from "./materiais";

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT_RELATO = `Você é um assistente que reescreve relatos informais de ocorrências policiais em texto formal, no padrão de boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Escreva em português formal, na terceira pessoa, no pretérito.
- Use linguajar policial brasileiro (ex.: "a equipe", "os autores", "foi dada voz de prisão", "procedeu-se à abordagem").
- NÃO invente fatos, nomes, locais, horários ou qualquer dado que não tenha sido citado no relato original.
- Não adicione cabeçalhos, saudações, títulos ou comentários. Responda apenas com o corpo do texto do relato.
- Mantenha os fatos e a ordem cronológica do relato original, apenas formalizando a linguagem.`;

const SYSTEM_PROMPT_NATUREZA = `Você é um assistente que classifica a NATUREZA DOS FATOS de uma ocorrência policial a partir do relato completo, no padrão usado em boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Leia o relato completo e responda com uma frase curta, de uma linha, sem ponto final, iniciando com letra maiúscula, que resuma o TIPO da ocorrência.
- Use terminologia policial formal (ex.: "Acompanhamento com prisão por porte ilegal de arma de fogo", "Atendimento a perturbação do sossego", "Averiguação de suspeito").
- Baseie-se apenas nos fatos citados no relato. NÃO invente tipos penais ou detalhes que não estejam no texto.
- Não adicione explicações, aspas ou comentários. Responda apenas com a frase da natureza.`;

const NENHUM = "NENHUM";

/** Formato do campo ARTIGOS, compartilhado entre a geração inicial e a revisão para o resultado nunca sair com um padrão diferente (ex.: tudo numa linha, separado por "; " ou ","). */
const FORMATO_ARTIGOS = `- O campo de artigos deve conter SEMPRE um artigo por linha (quebra de linha real, "\\n"), sem marcadores, travessões, ponto e vírgula ou vírgula separando os artigos, e sem nome popular do crime — apenas no formato "Art. X do Código Penal de Guarulhos" (ex.: "Art. 155 do Código Penal de Guarulhos", "Art. 289-A do Código Penal de Guarulhos", "Art. 33 do Código Penal de Guarulhos"). Nunca junte dois artigos na mesma linha nem troque "do" por vírgula.
- Cite SEMPRE "do Código Penal de Guarulhos" como a lei/código, independente de o artigo estar listado sob um capítulo com nome de outra lei (ex.: "DA LEI DE DROGAS", "DO ESTATUTO DO DESARMAMENTO", "DOS CRIMES DE TRÂNSITO (CTB)") — é tudo parte do mesmo Código Penal de Guarulhos.`;

/**
 * Regras de tipificação penal compartilhadas entre a geração inicial dos
 * ARTIGOS e a revisão via IA — mantidas em um único lugar para não
 * divergirem. Reforçam as cláusulas de presunção/limiar do próprio Código
 * Penal de Guarulhos (que já aparecem no texto abaixo), porque são fáceis
 * de passar batido numa leitura corrida do relato.
 */
const REGRAS_TIPIFICACAO_ARTIGOS = `- NUNCA repita o mesmo artigo mais de uma vez na lista, mesmo que ele se aplique a vários itens ou pessoas diferentes (ex.: duas armas de uso restrito geram só UMA linha "Art. 16", não duas).
- Dinheiro apreendido de origem ilícita ("dinheiro sujo"): inclua sempre o Art. 289-A (Posse de dinheiro ilícito).
- Arma de fogo apreendida em via pública (abordagem, revista pessoal etc., fora de residência): se for Revólver calibre 38 ou Beretta (as únicas "armas de uso permitido" listadas no Art. 14), use o Art. 14 (Porte ilegal de arma de uso permitido). Qualquer outro modelo/calibre de arma de fogo é "uso restrito" e usa o Art. 16 em vez do Art. 14. NUNCA cite o Art. 12 junto com o Art. 14 ou o Art. 16 para a mesma arma — o Art. 12 é exclusivo para arma guardada dentro de residência sem registro (situação diferente e rara num BOPM de abordagem em via pública); se o relato não mencionar claramente uma residência, não use o Art. 12.
- 2 (duas) ou mais armas de fogo apreendidas, de qualquer calibre, com a mesma pessoa ou no mesmo veículo/local: inclua também o Art. 17 (Comércio ilegal de armas), além do artigo de porte cabível (Art. 14 e/ou Art. 16, sem repetir).
- Munição apreendida: só inclua um artigo específico de munição quando a quantidade total for igual ou superior a 80 (oitenta) unidades — nesse caso, inclua o Art. 17 (Comércio ilegal de munições). Abaixo de 80 unidades, não force nenhum artigo de munição isolado.
- Drogas apreendidas: some a quantidade de todas as substâncias apreendidas; se o total for igual ou superior a 5 (cinco), inclua o Art. 33 (Tráfico de drogas) mesmo sem indício explícito de dolo de tráfico no relato.
- Art. 157-A (Subtração de viatura) só se aplica quando o veículo subtraído for EXPLICITAMENTE um veículo oficial das forças de segurança (viatura policial, viatura da GCM etc.) — NUNCA use esse artigo para um veículo civil/particular comum, mesmo em um roubo ou furto de veículo; nesse caso use só o Art. 155 (Furto) ou Art. 157 (Roubo), conforme o caso.
- Subtração de caixa eletrônico (explosão, arrombamento, furto ou "roubo" a caixa eletrônico): nesta cidade não existe roubo à mão armada contra caixa eletrônico, então use SEMPRE o Art. 155 (Furto) nesse caso, mesmo que o relato descreva o fato como "roubo" ou cite arma/ameaça na ação contra o caixa eletrônico — NUNCA use o Art. 157 (Roubo) pra esse tipo de ocorrência.
- Se a quantidade de armas, munição ou drogas mudar numa revisão, reavalie esses limiares e ajuste os artigos de acordo com a nova quantidade.`;

const SYSTEM_PROMPT_ARTIGOS = `Você é um assistente que identifica os ARTIGOS do Código Penal de Guarulhos aplicáveis a uma ocorrência policial a partir do relato completo, no padrão usado em boletins de ocorrência.

O Código Penal de Guarulhos é FICTÍCIO, criado só para o roleplay do servidor Guarulhos — é a ÚNICA base de tipificação que você deve usar. NUNCA cite o Código Penal brasileiro real, o Estatuto do Desarmamento real, a Lei de Drogas real ou qualquer outra lei real: mesmo quando o texto abaixo organiza os artigos em capítulos com nomes de leis reais (ex.: "DA LEI DE DROGAS", "DO ESTATUTO DO DESARMAMENTO"), esses artigos pertencem ao Código Penal de Guarulhos e devem ser citados como tal.

${CODIGO_PENAL_GUARULHOS}

Regras obrigatórias:
- Leia o relato e identifique o(s) artigo(s) do Código Penal de Guarulhos acima que se aplicam de forma CLARA E INEQUÍVOCA aos fatos descritos.
${FORMATO_ARTIGOS}
- NÃO invente, suponha ou arrisque uma tipificação penal quando os fatos do relato forem insuficientes ou ambíguos para determiná-la com segurança, e NÃO invente artigos que não estejam no texto do Código Penal de Guarulhos acima.
${REGRAS_TIPIFICACAO_ARTIGOS}
- Se não for possível determinar com segurança nenhum artigo aplicável, responda exatamente com a palavra ${NENHUM}, sem mais nada.
- Não adicione explicações, cabeçalhos, aspas, penas ou comentários além da lista de artigos (ou da palavra ${NENHUM}).`;

export function mapAnthropicError(error: unknown): Error {
  if (error instanceof Anthropic.RateLimitError) {
    return new Error("Limite de requisicoes da API Anthropic atingido. Tente novamente em instantes.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new Error("Falha de conexao com a API Anthropic.");
  }
  if (error instanceof Anthropic.APIError) {
    return new Error(`Erro da API Anthropic (${error.status}): ${error.message}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function chamarHaiku(systemPrompt: string, conteudoUsuario: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: conteudoUsuario }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da API nao contem texto");
    }
    return textBlock.text.trim();
  } catch (error) {
    throw mapAnthropicError(error);
  }
}

/** Gera o texto formal do RELATO DA OCORRÊNCIA a partir do relato bruto do agente. */
export function gerarRelatoFormal(relatoBruto: string): Promise<string> {
  return chamarHaiku(SYSTEM_PROMPT_RELATO, relatoBruto);
}

/** Gera a frase formal da NATUREZA DOS FATOS a partir do relato completo (ja formalizado). */
export function gerarNaturezaFormal(relatoCompleto: string): Promise<string> {
  return chamarHaiku(SYSTEM_PROMPT_NATUREZA, relatoCompleto);
}

/** Garante um artigo por linha mesmo se o modelo colar mais de um na mesma linha (ex.: separados por "; " ou ","). */
function normalizarArtigos(texto: string): string {
  return texto
    .split("\n")
    .flatMap((linha) => linha.split(/;\s*|,\s*(?=Art\.)/i))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("\n");
}

/** Identifica os ARTIGOS de lei penal aplicaveis. Retorna null se nao for possivel determinar. */
export async function gerarArtigos(relatoCompleto: string): Promise<string | null> {
  const resposta = await chamarHaiku(SYSTEM_PROMPT_ARTIGOS, relatoCompleto);
  if (resposta.trim().toUpperCase() === NENHUM) return null;
  return normalizarArtigos(resposta);
}

const MATERIAL_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    categoria: { type: "string", enum: [...CATEGORIAS_MATERIAL] },
    quantidade: { type: "number" },
    unidade: { type: "string", enum: [...UNIDADES_MATERIAL] },
    descricao: { type: "string" },
  },
  required: ["categoria", "quantidade", "unidade", "descricao"],
};

const EXTRAIR_MATERIAIS_TOOL: Anthropic.Tool = {
  name: "extrair_materiais",
  description:
    "Retorna a lista estruturada de materiais ilícitos apreendidos identificados no relato. Retorne uma lista vazia se nao houver nenhum.",
  input_schema: {
    type: "object",
    properties: {
      materiais: { type: "array", items: MATERIAL_ITEM_SCHEMA },
    },
    required: ["materiais"],
  },
};

const SYSTEM_PROMPT_MATERIAIS = `Você é um assistente que extrai a lista de MATERIAIS ILÍCITOS APREENDIDOS a partir do relato completo de uma ocorrência policial, no padrão usado em boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Leia o relato e identifique apenas objetos, substâncias ou valores explicitamente descritos como apreendidos, recolhidos ou arrecadados pela equipe.
- Para cada item, classifique a CATEGORIA em uma das opções: ${CATEGORIAS_MATERIAL.join(", ")}. Use "Outro" apenas quando nenhuma categoria específica se aplicar. Para entorpecentes/inalantes, use a categoria do tipo específico da substância (ex.: "maconha" → Maconha, "cocaína"/"pó branco análogo a cocaína" → Cocaína, "crack"/"pedra" → Crack, "lança-perfume"/"loló" → Lança-perfume, "LSD"/"selo" → LSD, "ecstasy"/"MDMA" → Ecstasy, "haxixe" → Haxixe, "skunk" → Skunk); use "Outra droga" apenas se for droga mas o tipo não estiver claro ou não se encaixar nessas opções. "Mesa de drogas" é exclusiva para a mesa/bancada usada no fracionamento de entorpecentes — nunca classifique esse item como droga. Outros apetrechos de tráfico (balança de precisão, embalagens, pinos, sacolés) entram em "Outro".
- Informe a QUANTIDADE como um número (ex.: 1, 2, 0.5) e a UNIDADE em uma das opções: ${UNIDADES_MATERIAL.join(", ")}. Para itens contados (armas, veículos, documentos), use "unidade(s)" com o número de itens.
- A DESCRIÇÃO deve ser curta e formal, sem repetir a categoria/quantidade (ex.: "Revólver calibre 38", "Porção de substância análoga a cocaína", "Em espécie, oriundo de atividade ilícita").
- NÃO invente itens, quantidades ou descrições que não estejam no relato.
- Se o relato NÃO mencionar nenhum material apreendido, retorne uma lista vazia.
- Responda SEMPRE chamando a ferramenta extrair_materiais.`;

function normalizarMateriais(materiais: unknown): MaterialApreendido[] {
  if (!Array.isArray(materiais)) return [];
  return materiais
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).descricao === "string",
    )
    .map((item) => ({
      categoria: CATEGORIAS_MATERIAL.includes(item.categoria as MaterialApreendido["categoria"])
        ? (item.categoria as MaterialApreendido["categoria"])
        : "Outro",
      quantidade: typeof item.quantidade === "number" && Number.isFinite(item.quantidade) ? item.quantidade : 1,
      unidade: (UNIDADES_MATERIAL as readonly string[]).includes(item.unidade as string)
        ? (item.unidade as string)
        : "unidade(s)",
      descricao: String(item.descricao).trim(),
    }))
    .filter((item) => item.descricao.length > 0);
}

/** Extrai a lista estruturada de MATERIAIS ILÍCITOS APREENDIDOS a partir do relato completo. */
export async function gerarMateriaisApreendidos(relatoCompleto: string): Promise<MaterialApreendido[]> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT_MATERIAIS,
      tools: [EXTRAIR_MATERIAIS_TOOL],
      tool_choice: { type: "tool", name: "extrair_materiais" },
      messages: [{ role: "user", content: relatoCompleto }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("A IA não retornou uma lista válida de materiais.");
    }

    const input = toolUse.input as { materiais?: unknown };
    return normalizarMateriais(input.materiais);
  } catch (error) {
    throw mapAnthropicError(error);
  }
}

export interface CamposDerivados {
  natureza: string;
  materiaisApreendidos: MaterialApreendido[];
  artigos: string | null;
  avisos: string[];
}

/** Gera NATUREZA, MATERIAIS e ARTIGOS em paralelo a partir do relato ja formalizado. */
export async function gerarCamposDerivados(relatoFinal: string): Promise<CamposDerivados> {
  const avisos: string[] = [];

  const [natureza, materiaisApreendidos, artigos] = await Promise.all([
    gerarNaturezaFormal(relatoFinal).catch((error: Error) => {
      avisos.push(`Não foi possível gerar a natureza automaticamente (${error.message}).`);
      return "Não informado";
    }),
    gerarMateriaisApreendidos(relatoFinal).catch((error: Error) => {
      avisos.push(`Não foi possível extrair os materiais apreendidos automaticamente (${error.message}).`);
      return [] as MaterialApreendido[];
    }),
    gerarArtigos(relatoFinal).catch((error: Error) => {
      avisos.push(`Não foi possível gerar os artigos automaticamente (${error.message}).`);
      return null;
    }),
  ]);

  return { natureza, materiaisApreendidos, artigos, avisos };
}

export interface ConteudoOcorrencia extends CamposDerivados {
  relato: string;
}

/** Gera relato formal + campos derivados a partir do relato bruto original. */
export async function gerarConteudoOcorrencia(relatoBruto: string): Promise<ConteudoOcorrencia> {
  const avisos: string[] = [];
  let relatoFinal = relatoBruto;

  try {
    relatoFinal = await gerarRelatoFormal(relatoBruto);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    avisos.push(`Não foi possível formatar o relato automaticamente (${message}). Usando o relato bruto sem formatação.`);
  }

  const derivados = await gerarCamposDerivados(relatoFinal);
  return { relato: relatoFinal, ...derivados, avisos: [...avisos, ...derivados.avisos] };
}

const INDIVIDUO_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    nome: { type: "string" },
    rg: { type: "string" },
  },
  required: ["nome", "rg"],
};

const ATUALIZAR_BOLETIM_TOOL: Anthropic.Tool = {
  name: "atualizar_boletim",
  description:
    "Retorna o estado completo do boletim de ocorrencia apos aplicar a instrucao do agente. Inclua TODOS os campos, mesmo os que nao mudaram — copie-os exatamente como estavam. Use string vazia para NATUREZA/ARTIGOS quando nao houver valor.",
  input_schema: {
    type: "object",
    properties: {
      ...Object.fromEntries(CAMPOS_TEXTO_ESTADO_BOLETIM.map((campo) => [campo, { type: "string" }])),
      individuos: { type: "array", items: INDIVIDUO_ITEM_SCHEMA },
      materiaisApreendidos: { type: "array", items: MATERIAL_ITEM_SCHEMA },
    },
    required: [...CAMPOS_TEXTO_ESTADO_BOLETIM, "individuos", "materiaisApreendidos"],
  },
};

const SYSTEM_PROMPT_REVISAO = `Você é um assistente que revisa boletins de ocorrência da Polícia Militar de São Paulo a partir de uma instrução do agente responsável pela ocorrência.

Você recebe o ESTADO ATUAL do boletim (todos os campos, em JSON) e uma INSTRUÇÃO do agente pedindo uma correção ou complemento.

Regras obrigatórias:
- Identifique exatamente a qual(is) campo(s) a instrução se refere. Pode ser qualquer campo: prefixo, indivíduos abordados (nome, RG — pode haver mais de um), local, veículo, natureza dos fatos, materiais apreendidos (categoria, quantidade, unidade, descrição — pode haver mais de um), artigos de lei, ou o relato da ocorrência. NÃO altere dados da equipe (chefe da equipe, motorista, auxiliares) — esse campo não está disponível aqui porque agora guarda o ID da conta do Discord de cada integrante, não texto; troca de integrante é só via a tela de Remodulação.
- Se a instrução disser que um campo está errado e deve ser trocado por outro valor (ex.: "o artigo está errado, deveria ser o Art. 157", "a quantidade da droga está errada, era 200 gramas"), substitua diretamente o valor desse campo (ou item da lista) pelo novo, sem inventar justificativas adicionais.
- Ao corrigir um item de uma lista (individuos ou materiaisApreendidos), altere apenas o item indicado e mantenha os demais itens da lista intactos, na mesma ordem. Para adicionar um item novo à lista, acrescente-o mantendo os existentes; para remover, exclua apenas o indicado.
- Se a instrução adicionar um fato novo ou corrigir um fato do RELATO, incorpore isso no relato (texto formal, terceira pessoa, pretérito, linguajar policial brasileiro) na posição cronológica/lógica adequada, e ajuste NATUREZA, MATERIAIS ou ARTIGOS sempre que esse fato novo exigir a mudança — inclusive quando o fato novo alterar a tipificação penal já definida antes, mesmo sem a instrução pedir isso explicitamente.
- Ao definir ou corrigir o campo de artigos, use exclusivamente o Código Penal de Guarulhos (fictício, criado só para o roleplay do servidor Guarulhos) abaixo — NUNCA cite o Código Penal brasileiro real, o Estatuto do Desarmamento real, a Lei de Drogas real ou qualquer outra lei real, mesmo que o texto organize artigos em capítulos com nomes de leis reais:
${CODIGO_PENAL_GUARULHOS}
Regras de tipificação que sempre se aplicam, na geração inicial e em toda revisão:
${REGRAS_TIPIFICACAO_ARTIGOS}
- Ao devolver o campo de artigos (seja ele alterado ou copiado sem mudança), siga sempre este formato:
${FORMATO_ARTIGOS}
- Se a instrução mudar apenas um dado cadastral (RG, prefixo, local, veículo), altere só esse campo — NÃO reescreva o relato nem os demais campos.
- Campos e itens de lista que a instrução não menciona e que a mudança não afeta devem ser copiados EXATAMENTE como estavam no estado atual, sem parafrasear, resumir ou reescrever.
- NÃO invente fatos, nomes, artigos ou dados que não tenham sido citados na instrução ou que já estivessem no estado atual.
- Responda SEMPRE chamando a ferramenta atualizar_boletim, com todos os campos preenchidos.`;

function normalizarIndividuos(individuos: unknown): Individuo[] {
  if (!Array.isArray(individuos)) return [];
  return individuos
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      nome: typeof item.nome === "string" ? item.nome : "",
      rg: typeof item.rg === "string" ? item.rg : "",
    }));
}

/** Revisa qualquer campo do boletim (estrutural ou gerado por IA) a partir de uma instrução livre do agente. */
export async function revisarBoletim(estadoAtual: EstadoBoletim, instrucao: string): Promise<EstadoBoletim> {
  const conteudoUsuario = `ESTADO ATUAL (JSON):\n${JSON.stringify(estadoAtual, null, 2)}\n\nINSTRUÇÃO DO AGENTE:\n${instrucao}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT_REVISAO,
      tools: [ATUALIZAR_BOLETIM_TOOL],
      tool_choice: { type: "tool", name: "atualizar_boletim" },
      messages: [{ role: "user", content: conteudoUsuario }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("A IA não retornou uma atualização válida do boletim.");
    }

    const input = toolUse.input as Record<string, unknown>;
    const resultado = { ...estadoAtual };
    for (const campo of CAMPOS_TEXTO_ESTADO_BOLETIM) {
      const valor = input[campo];
      if (typeof valor !== "string") continue;
      if (campo === "artigos") {
        resultado.artigos = valor.trim().toUpperCase() === NENHUM ? null : normalizarArtigos(valor);
      } else {
        resultado[campo] = valor;
      }
    }
    if (Array.isArray(input.individuos)) {
      resultado.individuos = normalizarIndividuos(input.individuos);
    }
    if (Array.isArray(input.materiaisApreendidos)) {
      resultado.materiaisApreendidos = normalizarMateriais(input.materiaisApreendidos);
    }
    return resultado;
  } catch (error) {
    throw mapAnthropicError(error);
  }
}

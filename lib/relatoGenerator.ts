import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";
import { CAMPOS_ESTADO_BOLETIM, type EstadoBoletim } from "./boletimEstado";

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

const SYSTEM_PROMPT_MATERIAIS = `Você é um assistente que extrai a lista de MATERIAIS ILÍCITOS APREENDIDOS a partir do relato completo de uma ocorrência policial, no padrão usado em boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Leia o relato e identifique apenas objetos, substâncias ou valores explicitamente descritos como apreendidos, recolhidos ou arrecadados pela equipe.
- Se houver materiais apreendidos, responda com uma lista, um item por linha, cada linha iniciando com "- ", em linguagem formal (ex.: "- Uma arma de fogo, tipo revólver, calibre 38").
- NÃO invente itens, quantidades ou descrições que não estejam no relato.
- Se o relato NÃO mencionar nenhum material apreendido, responda exatamente com a palavra ${NENHUM}, sem mais nada.
- Não adicione explicações, cabeçalhos, aspas ou comentários além da lista (ou da palavra ${NENHUM}).`;

const SYSTEM_PROMPT_ARTIGOS = `Você é um assistente que identifica os ARTIGOS de lei penal aplicáveis a uma ocorrência policial a partir do relato completo, no padrão usado em boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Leia o relato e identifique o(s) artigo(s) de lei penal brasileira que se aplicam de forma CLARA E INEQUÍVOCA aos fatos descritos.
- Responda com uma lista, um artigo por linha, sem marcadores, travessões ou nome popular do crime, apenas no formato "Art. X do(a) [lei/código]" (ex.: "Art. 155 do Código Penal", "Art. 289 do Código Penal", "Art. 33 da Lei 11.343/06").
- NÃO invente, suponha ou arrisque uma tipificação penal quando os fatos do relato forem insuficientes ou ambíguos para determiná-la com segurança.
- Sempre que o relato mencionar "dinheiro sujo" (valores em espécie associados a atividade ilícita), inclua também o Art. 330 do Código Penal na lista.
- Em casos envolvendo subtração de caixa eletrônico, a classificação entre furto e roubo depende exclusivamente de ter havido ou não apreensão de arma, independentemente do termo usado no relato: se houve apreensão de arma, use o Art. 157 do Código Penal (nunca o 155); se não houve apreensão de arma, use o Art. 155 do Código Penal (nunca o 157).
- Se não for possível determinar com segurança nenhum artigo aplicável, responda exatamente com a palavra ${NENHUM}, sem mais nada.
- Não adicione explicações, cabeçalhos, aspas ou comentários além da lista (ou da palavra ${NENHUM}).`;

function mapAnthropicError(error: unknown): Error {
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

const NENHUM_ARTIGO_OU_MATERIAL = new Set(["", "NENHUM"]);

const ATUALIZAR_BOLETIM_TOOL: Anthropic.Tool = {
  name: "atualizar_boletim",
  description:
    "Retorna o estado completo do boletim de ocorrencia apos aplicar a instrucao do agente. Inclua TODOS os campos, mesmo os que nao mudaram — copie-os exatamente como estavam. Use string vazia para NATUREZA/MATERIAIS/ARTIGOS quando nao houver valor.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(CAMPOS_ESTADO_BOLETIM.map((campo) => [campo, { type: "string" }])),
    required: [...CAMPOS_ESTADO_BOLETIM],
  },
};

const SYSTEM_PROMPT_REVISAO = `Você é um assistente que revisa boletins de ocorrência da Polícia Militar de São Paulo a partir de uma instrução do agente responsável pela ocorrência.

Você recebe o ESTADO ATUAL do boletim (todos os campos, em JSON) e uma INSTRUÇÃO do agente pedindo uma correção ou complemento.

Regras obrigatórias:
- Identifique exatamente a qual(is) campo(s) a instrução se refere. Pode ser qualquer campo: dados da equipe (chefe da equipe, motorista, auxiliares, prefixo), dados do indivíduo abordado (nome, RG), local, veículo, natureza dos fatos, materiais apreendidos, artigos de lei, ou o relato da ocorrência.
- Se a instrução disser que um campo está errado e deve ser trocado por outro valor (ex.: "o artigo está errado, deveria ser o Art. 157", "o chefe da equipe está errado, é o Fulano"), substitua diretamente o valor desse campo pelo novo, sem inventar justificativas adicionais.
- Se a instrução adicionar um fato novo ou corrigir um fato do RELATO, incorpore isso no relato (texto formal, terceira pessoa, pretérito, linguajar policial brasileiro) na posição cronológica/lógica adequada, e ajuste NATUREZA, MATERIAIS ou ARTIGOS somente se esse fato novo realmente exigir a mudança.
- Se a instrução mudar apenas um dado cadastral (nome de integrante da equipe, RG, prefixo, local, veículo), altere só esse campo — NÃO reescreva o relato nem os demais campos.
- Campos que a instrução não menciona e que a mudança não afeta devem ser copiados EXATAMENTE como estavam no estado atual, sem parafrasear, resumir ou reescrever.
- NÃO invente fatos, nomes, artigos ou dados que não tenham sido citados na instrução ou que já estivessem no estado atual.
- Responda SEMPRE chamando a ferramenta atualizar_boletim, com todos os campos preenchidos.`;

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
    for (const campo of CAMPOS_ESTADO_BOLETIM) {
      const valor = input[campo];
      if (typeof valor !== "string") continue;
      const valorNormalizado = valor.trim();
      if (campo === "materiaisApreendidos" || campo === "artigos") {
        resultado[campo] = NENHUM_ARTIGO_OU_MATERIAL.has(valorNormalizado.toUpperCase()) ? null : valor;
      } else {
        resultado[campo] = valor;
      }
    }
    return resultado;
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

/** Extrai a lista formal de MATERIAIS ILÍCITOS APREENDIDOS. Retorna null se nao houver. */
export async function gerarMateriaisApreendidos(relatoCompleto: string): Promise<string | null> {
  const resposta = await chamarHaiku(SYSTEM_PROMPT_MATERIAIS, relatoCompleto);
  if (resposta.trim().toUpperCase() === NENHUM) return null;
  return resposta;
}

/** Identifica os ARTIGOS de lei penal aplicaveis. Retorna null se nao for possivel determinar. */
export async function gerarArtigos(relatoCompleto: string): Promise<string | null> {
  const resposta = await chamarHaiku(SYSTEM_PROMPT_ARTIGOS, relatoCompleto);
  if (resposta.trim().toUpperCase() === NENHUM) return null;
  return resposta;
}

export interface CamposDerivados {
  natureza: string;
  materiaisApreendidos: string | null;
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
      return null;
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

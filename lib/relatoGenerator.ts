import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT_RELATO = `Você é um assistente que reescreve relatos informais de ocorrências policiais em texto formal, no padrão de boletins de ocorrência da Polícia Militar de São Paulo.

Regras obrigatórias:
- Escreva em português formal, na terceira pessoa, no pretérito.
- Use linguajar policial brasileiro (ex.: "a equipe", "os autores", "foi dada voz de prisão", "procedeu-se à abordagem").
- NÃO invente fatos, nomes, locais, horários ou qualquer dado que não tenha sido citado no relato original.
- Não adicione cabeçalhos, saudações, títulos ou comentários. Responda apenas com o corpo do texto do relato.
- Mantenha os fatos e a ordem cronológica do relato original, apenas formalizando a linguagem.`;

const SYSTEM_PROMPT_COMPLEMENTO = `Você é um assistente que revisa o RELATO DA OCORRÊNCIA de um boletim de ocorrência da Polícia Militar de São Paulo, incorporando uma informação complementar enviada pelo agente apos a primeira versao do relato.

Voce recebera dois textos, nesta ordem:
1. O RELATO ATUAL, ja formal, na terceira pessoa, no pretérito.
2. O COMPLEMENTO, um texto informal do agente com informacao adicional, correcao ou ajuste.

Regras obrigatórias:
- Se o COMPLEMENTO adicionar um fato novo, incorpore-o no relato na posicao cronologica/logica adequada.
- Se o COMPLEMENTO corrigir ou contradizer algo do RELATO ATUAL (ex.: "na verdade era X, nao Y"), substitua a informacao incorreta pela corrigida, sem deixar as duas versoes no texto.
- Escreva em português formal, na terceira pessoa, no pretérito, com o mesmo linguajar policial brasileiro do relato atual.
- NÃO invente fatos, nomes, locais, horários ou qualquer dado que não tenha sido citado em nenhum dos dois textos.
- Não adicione cabeçalhos, saudações, títulos ou comentários. Responda apenas com o corpo do texto do relato revisado, completo (nao apenas o trecho alterado).`;

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
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("Limite de requisicoes da API Anthropic atingido. Tente novamente em instantes.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error("Falha de conexao com a API Anthropic.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Erro da API Anthropic (${error.status}): ${error.message}`);
    }
    throw error;
  }
}

/** Gera o texto formal do RELATO DA OCORRÊNCIA a partir do relato bruto do agente. */
export function gerarRelatoFormal(relatoBruto: string): Promise<string> {
  return chamarHaiku(SYSTEM_PROMPT_RELATO, relatoBruto);
}

/** Revisa o relato formal ja existente, incorporando um complemento/ajuste informal. */
export function gerarRelatoComplementado(relatoAtual: string, complemento: string): Promise<string> {
  const conteudoUsuario = `RELATO ATUAL:\n${relatoAtual}\n\nCOMPLEMENTO:\n${complemento}`;
  return chamarHaiku(SYSTEM_PROMPT_COMPLEMENTO, conteudoUsuario);
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

/** Revisa o relato incorporando um complemento e regenera os campos derivados. */
export async function complementarConteudoOcorrencia(
  relatoFinalAtual: string,
  complemento: string,
): Promise<ConteudoOcorrencia> {
  const avisos: string[] = [];
  let relatoFinal = relatoFinalAtual;

  try {
    relatoFinal = await gerarRelatoComplementado(relatoFinalAtual, complemento);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    avisos.push(`Não foi possível incorporar o complemento automaticamente (${message}). Mantendo o relato anterior.`);
  }

  const derivados = await gerarCamposDerivados(relatoFinal);
  return { relato: relatoFinal, ...derivados, avisos: [...avisos, ...derivados.avisos] };
}

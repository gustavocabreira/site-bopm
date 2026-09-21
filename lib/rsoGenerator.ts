import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";
import { mapAnthropicError } from "./relatoGenerator";
import { CAMPOS_TEXTO_ESTADO_RSO, type EstadoRso } from "./rsoEstado";

const MODEL = "claude-haiku-4-5";

const ATUALIZAR_RSO_TOOL: Anthropic.Tool = {
  name: "atualizar_rso",
  description:
    "Retorna o estado completo do RSO apos aplicar a instrucao do agente. Inclua TODOS os campos, mesmo os que nao mudaram — copie-os exatamente como estavam.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(CAMPOS_TEXTO_ESTADO_RSO.map((campo) => [campo, { type: "string" }])),
    required: [...CAMPOS_TEXTO_ESTADO_RSO],
  },
};

const SYSTEM_PROMPT_REVISAO_RSO = `Você é um assistente que revisa Relatórios de Serviço Operacional (RSO) da Polícia Militar de São Paulo a partir de uma instrução do agente responsável pelo serviço.

Você recebe o ESTADO ATUAL do RSO (todos os campos, em JSON) e uma INSTRUÇÃO do agente pedindo um ajuste ou complemento.

Regras obrigatórias:
- Identifique exatamente a qual(is) campo(s) a instrução se refere. Pode ser qualquer campo: dados cadastrais (turno, viatura, prefixo) ou qualquer contador de produtividade (carros vistoriados, motos vistoriadas, pessoas abordadas, armas apreendidas, drogas apreendidas, veículos recolhidos, condenados capturados, flagrantes, dinheiro sujo, outros objetos). NÃO altere a guarnição (chefe da equipe/motorista/auxiliares ou R1/R2/R3) — esse campo não está disponível aqui porque agora guarda o ID da conta do Discord de cada integrante, não texto; troca de integrante é só via a tela de Remodulação.
- Se a instrução informar um número ou fato novo para um contador (ex.: "vistoriei 5 carros e 2 motos", "tivemos 1 flagrante de porte de droga"), atualize apenas esse(s) campo(s) com o valor informado.
- Se a instrução corrigir um dado cadastral (ex.: "o turno está errado, era das 07:00 às 19:00"), substitua diretamente o valor desse campo.
- Campos que a instrução não menciona devem ser copiados EXATAMENTE como estavam no estado atual, sem parafrasear, resumir ou reescrever.
- Os campos de contadores numéricos (carros vistoriados, motos vistoriadas, pessoas abordadas, veículos recolhidos, condenados capturados, flagrantes) devem conter apenas o número (ex.: "3"), sem texto adicional.
- O campo de dinheiro sujo deve conter o valor em reais no formato "R$ X" (ex.: "R$ 500").
- Os campos armas apreendidas, drogas apreendidas e outros objetos podem ser descritivos (ex.: "1 revólver calibre 38"); use "Nenhum" quando não houver nada a relatar.
- NÃO invente fatos, nomes ou números que não tenham sido citados na instrução ou que já estivessem no estado atual.
- Responda SEMPRE chamando a ferramenta atualizar_rso, com todos os campos preenchidos.`;

/** Revisa qualquer campo do RSO (dados cadastrais ou produtividade) a partir de uma instrução livre do agente, mesmo padrão do revisarBoletim em relatoGenerator.ts. */
export async function revisarRso(estadoAtual: EstadoRso, instrucao: string): Promise<EstadoRso> {
  const conteudoUsuario = `ESTADO ATUAL (JSON):\n${JSON.stringify(estadoAtual, null, 2)}\n\nINSTRUÇÃO DO AGENTE:\n${instrucao}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT_REVISAO_RSO,
      tools: [ATUALIZAR_RSO_TOOL],
      tool_choice: { type: "tool", name: "atualizar_rso" },
      messages: [{ role: "user", content: conteudoUsuario }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("A IA não retornou uma atualização válida do RSO.");
    }

    const input = toolUse.input as Record<string, unknown>;
    const resultado = { ...estadoAtual };
    for (const campo of CAMPOS_TEXTO_ESTADO_RSO) {
      const valor = input[campo];
      if (typeof valor === "string") resultado[campo] = valor;
    }
    return resultado;
  } catch (error) {
    throw mapAnthropicError(error);
  }
}

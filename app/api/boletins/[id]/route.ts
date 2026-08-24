import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteBoletim, updateBoletim, type AtualizacaoBoletim } from "@/lib/boletimStore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    prefixo,
    chefeEquipe,
    motorista,
    homem3,
    homem4,
    local,
    veiculo,
    natureza,
    relato,
    artigos,
    texto,
    individuos,
    materiais,
  } = body ?? {};

  if (texto !== undefined && !texto.trim()) {
    return NextResponse.json({ error: "O texto não pode ser vazio." }, { status: 400 });
  }

  const atualizacao: AtualizacaoBoletim = {};
  if (typeof prefixo === "string") atualizacao.prefixo = prefixo;
  if (typeof chefeEquipe === "string") atualizacao.chefeEquipe = chefeEquipe;
  if (typeof motorista === "string") atualizacao.motorista = motorista;
  if (typeof homem3 === "string") atualizacao.homem3 = homem3;
  if (typeof homem4 === "string") atualizacao.homem4 = homem4;
  if (typeof local === "string") atualizacao.local = local;
  if (typeof veiculo === "string") atualizacao.veiculo = veiculo;
  if (typeof natureza === "string") atualizacao.natureza = natureza;
  if (typeof relato === "string") atualizacao.relato = relato;
  if (artigos !== undefined) atualizacao.artigos = artigos;
  if (texto !== undefined) atualizacao.texto = texto;
  if (Array.isArray(individuos)) atualizacao.individuos = individuos;
  if (Array.isArray(materiais)) atualizacao.materiais = materiais;

  if (Object.keys(atualizacao).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    await updateBoletim(id, atualizacao);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteBoletim(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

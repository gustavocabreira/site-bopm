/** Uma célula por dia da semana (0=Dom) e hora do dia (0-23), contando quantos turnos estavam em serviço naquela hora, somado historicamente. */
export type MatrizHeatmapTurnos = number[][];

/** Teto de duração considerada por turno (evita loop longo em RSO abandonado em aberto por dias). */
const LIMITE_DURACAO_MS = 48 * 60 * 60 * 1000;
const UMA_HORA_MS = 60 * 60 * 1000;

const DIAS_SEMANA_INTL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function diaEHoraSaoPaulo(data: Date): { diaSemana: number; hora: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const partes = formatter.formatToParts(data).reduce<Record<string, string>>((acc, parte) => {
    acc[parte.type] = parte.value;
    return acc;
  }, {});

  return { diaSemana: DIAS_SEMANA_INTL.indexOf(partes.weekday), hora: Number(partes.hour) };
}

/**
 * Pura (sem I/O) para poder ser testada e rodar tanto no servidor quanto no
 * client. Para cada turno, incrementa uma unidade em cada hora-relógio
 * (dia da semana + hora) que ele cobriu, entre o início e o fim (ou agora,
 * se ainda em serviço) — soma histórica de todas as ocorrências daquele
 * dia da semana.
 */
export function calcularHeatmapTurnos(
  turnos: { iniciadoEm: string; encerradoEm: string | null }[],
  agora: Date = new Date(),
): MatrizHeatmapTurnos {
  const matriz: MatrizHeatmapTurnos = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const turno of turnos) {
    const inicio = new Date(turno.iniciadoEm);
    const fimBruto = turno.encerradoEm ? new Date(turno.encerradoEm) : agora;
    const fim =
      fimBruto.getTime() - inicio.getTime() > LIMITE_DURACAO_MS
        ? new Date(inicio.getTime() + LIMITE_DURACAO_MS)
        : fimBruto;

    if (Number.isNaN(inicio.getTime()) || fim <= inicio) continue;

    for (let cursor = inicio.getTime(); cursor < fim.getTime(); cursor += UMA_HORA_MS) {
      const { diaSemana, hora } = diaEHoraSaoPaulo(new Date(cursor));
      if (diaSemana < 0) continue;
      matriz[diaSemana][hora] += 1;
    }
  }

  return matriz;
}

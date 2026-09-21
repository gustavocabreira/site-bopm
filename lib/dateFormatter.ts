/**
 * Retorna a data e o horario atuais (fuso America/Sao_Paulo), no formato
 * DD/MM/AAAA e HH:MM, com o horario deslocado por `offsetMinutos` (padrao -5 minutos).
 */
export function getDataHoraAtual(offsetMinutos = -5) {
  const agora = new Date(Date.now() + offsetMinutos * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partes = formatter.formatToParts(agora).reduce<Record<string, string>>((acc, parte) => {
    acc[parte.type] = parte.value;
    return acc;
  }, {});

  return {
    data: `${partes.day}/${partes.month}/${partes.year}`,
    horario: `${partes.hour}:${partes.minute}`,
  };
}

/** Formata uma duração em milissegundos como HH:MM:SS, usado no tempo de serviço ao vivo. */
export function formatarDuracao(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return [horas, minutos, segundos].map((valor) => String(valor).padStart(2, "0")).join(":");
}

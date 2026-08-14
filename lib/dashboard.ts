export const DASHBOARD_TIME_ZONE = "America/Manaus";

export interface PendingOs {
  DATA: string | null;
  CODFILIAL: string | number;
  NUMTRANSWMS: string | number | null;
  NUMOS: string | number;
  PEDIDOS: string | number | null;
  TIPOOS: string | null;
  MOVIMENTACAO: string | null;
  DTINICIOOS: string | null;
  PERCSEPARADA: number | null;
  PERCCONFERIDA: number | null;
  QTDEITENS: number | null;
  DATALIBERACAO: string | null;
  FUNCIONARIO: string | null;
  NUMBOX: string | number | null;
  DESCRICAOBOX: string | null;
  TEMPOSEP: string | null;
}

export interface ChartDay {
  DATA_OS: string;
  CONCLUIDAS: number;
  QUANTIDADE_SEPARADA: number;
}

export interface ChartUser {
  MATRICULA: string | number | null;
  FUNCIONARIO: string | null;
  CONCLUIDAS: number;
  QUANTIDADE_SEPARADA: number;
}

export function getDateInDashboardTimeZone(date = new Date()) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    values.find((value) => value.type === type)?.value;

  return [part("year"), part("month"), part("day")].join("-");
}

export function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isBranchCode(value: string) {
  return /^\d{1,6}$/.test(value);
}

export function getDateDistanceInDays(start: string, end: string) {
  const startTime = Date.parse(start + "T00:00:00.000Z");
  const endTime = Date.parse(end + "T00:00:00.000Z");
  return Math.floor((endTime - startTime) / 86_400_000);
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
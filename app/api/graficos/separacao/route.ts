import oracledb from "oracledb";
import { NextResponse, type NextRequest } from "next/server";
import {
  getDateDistanceInDays,
  getErrorMessage,
  isBranchCode,
  isDateOnly,
  type ChartDay,
  type ChartUser,
} from "@/lib/dashboard";
import { getConnection } from "@/lib/db";

export const runtime = "nodejs";

const dailySql = [
  "SELECT TO_CHAR(TRUNC(DTINICIOOS), 'YYYY-MM-DD') AS DATA_OS, COUNT(DISTINCT NUMOS) AS CONCLUIDAS, SUM(QT) AS QUANTIDADE_SEPARADA",
  "FROM PCMOVENDPEND",
  "WHERE CODFILIAL = :filial",
  "  AND DTINICIOOS >= TO_DATE(:dataInicial, 'YYYY-MM-DD')",
  "  AND DTINICIOOS < TO_DATE(:dataFinal, 'YYYY-MM-DD') + 1",
  "  AND POSICAO = 'C'",
  "  AND DTESTORNO IS NULL",
  "  AND CODOPER NOT IN ('SA', 'EA')",
  "  AND TIPOOS = 13",
  "GROUP BY TRUNC(DTINICIOOS)",
  "ORDER BY TRUNC(DTINICIOOS) ASC",
].join("\n");

const userSql = [
  "SELECT E.MATRICULA, E.NOME AS FUNCIONARIO, COUNT(DISTINCT M.NUMOS) AS CONCLUIDAS, SUM(M.QT) AS QUANTIDADE_SEPARADA",
  "FROM PCMOVENDPEND M",
  "LEFT JOIN PCEMPR E ON M.CODFUNCOS = E.MATRICULA",
  "WHERE M.CODFILIAL = :filial",
  "  AND M.DTINICIOOS >= TO_DATE(:dataInicial, 'YYYY-MM-DD')",
  "  AND M.DTINICIOOS < TO_DATE(:dataFinal, 'YYYY-MM-DD') + 1",
  "  AND M.POSICAO = 'C'",
  "  AND M.DTESTORNO IS NULL",
  "  AND M.CODOPER NOT IN ('SA', 'EA')",
  "  AND M.TIPOOS = 13",
  "GROUP BY E.MATRICULA, E.NOME",
  "ORDER BY COUNT(DISTINCT M.NUMOS) DESC",
].join("\n");

export async function GET(request: NextRequest) {
  const dataInicial = request.nextUrl.searchParams.get("dataInicial");
  const dataFinal = request.nextUrl.searchParams.get("dataFinal");
  const filial = request.nextUrl.searchParams.get("filial") ?? "1";

  if (
    !dataInicial ||
    !dataFinal ||
    !isDateOnly(dataInicial) ||
    !isDateOnly(dataFinal) ||
    !isBranchCode(filial)
  ) {
    return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
  }

  if (getDateDistanceInDays(dataInicial, dataFinal) < 0) {
    return NextResponse.json(
      { error: "A data final deve ser igual ou posterior à data inicial." },
      { status: 400 },
    );
  }

  let connection: Awaited<ReturnType<typeof getConnection>> | undefined;

  try {
    connection = await getConnection();

    const binds = { filial, dataInicial, dataFinal };
    const [resultDia, resultUsuario] = await Promise.all([
      connection.execute<ChartDay>(dailySql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
      connection.execute<ChartUser>(userSql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
    ]);

    return NextResponse.json({
      porDia: resultDia.rows ?? [],
      porUsuario: resultUsuario.rows ?? [],
    });
  } catch (error: unknown) {
    console.error("API /graficos/separacao Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Não foi possível consultar os dados dos gráficos." },
      { status: 500 },
    );
  } finally {
    await connection?.close();
  }
}
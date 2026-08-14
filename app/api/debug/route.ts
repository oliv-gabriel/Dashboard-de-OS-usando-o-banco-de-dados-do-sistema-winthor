import oracledb from "oracledb";
import { NextResponse, type NextRequest } from "next/server";
import {
  getDateInDashboardTimeZone,
  getErrorMessage,
  isBranchCode,
  isDateOnly,
} from "@/lib/dashboard";
import { getConnection } from "@/lib/db";

export const runtime = "nodejs";

interface DebugOs {
  NUMOS: string | number;
  TIPOOS: string | number;
  DTINICIOOS: string | null;
  DTFIMOS: string | null;
}

interface OsNumber {
  NUMOS: string | number;
}

const broadSql = [
  "SELECT DISTINCT NUMOS, TIPOOS,",
  "  TO_CHAR(DTINICIOOS, 'DD/MM/YYYY HH24:MI') AS DTINICIOOS,",
  "  TO_CHAR(DTFIMOS, 'DD/MM/YYYY HH24:MI') AS DTFIMOS",
  "FROM PCMOVENDPEND",
  "WHERE CODFILIAL = :filial",
  "  AND POSICAO = 'C'",
  "  AND DTESTORNO IS NULL",
  "  AND CODOPER NOT IN ('SA', 'EA')",
  "  AND DTFIMOS >= TO_DATE(:data, 'YYYY-MM-DD')",
  "  AND DTFIMOS < TO_DATE(:data, 'YYYY-MM-DD') + 1",
  "ORDER BY NUMOS",
].join("\n");

const filteredSql = [
  "SELECT DISTINCT NUMOS",
  "FROM PCMOVENDPEND",
  "WHERE CODFILIAL = :filial",
  "  AND POSICAO = 'C'",
  "  AND DTESTORNO IS NULL",
  "  AND CODOPER NOT IN ('SA', 'EA')",
  "  AND DTFIMOS >= TO_DATE(:data, 'YYYY-MM-DD')",
  "  AND DTFIMOS < TO_DATE(:data, 'YYYY-MM-DD') + 1",
  "  AND TIPOOS IN (9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 41)",
].join("\n");

export async function GET(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_DEBUG_API !== "true"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data =
    request.nextUrl.searchParams.get("data") ?? getDateInDashboardTimeZone();
  const filial = request.nextUrl.searchParams.get("filial") ?? "1";

  if (!isDateOnly(data) || !isBranchCode(filial)) {
    return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
  }

  let connection: Awaited<ReturnType<typeof getConnection>> | undefined;

  try {
    connection = await getConnection();

    const [broadResult, filteredResult] = await Promise.all([
      connection.execute<DebugOs>(broadSql, { filial, data }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
      connection.execute<OsNumber>(filteredSql, { filial, data }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
    ]);

    const allOs = broadResult.rows ?? [];
    const filteredNumbers = new Set(
      (filteredResult.rows ?? []).map((row) => String(row.NUMOS)),
    );
    const extraOs = allOs.filter(
      (row) => !filteredNumbers.has(String(row.NUMOS)),
    );

    return NextResponse.json({
      total_sem_filtro_tipoos: allOs.length,
      total_com_filtro_1781: filteredNumbers.size,
      diferenca: extraOs.length,
      os_que_nao_estao_na_lista_1781: extraOs,
    });
  } catch (error: unknown) {
    console.error("API /debug Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Não foi possível executar o diagnóstico." },
      { status: 500 },
    );
  } finally {
    await connection?.close();
  }
}
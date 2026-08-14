import oracledb from "oracledb";
import {
 NextResponse, type NextRequest }
 from "next/server";
import {
  getDateInDashboardTimeZone,  getErrorMessage,  isBranchCode,  isDateOnly,  type PendingOs,}
 from "@/lib/dashboard";
import {
 getConnection }
 from "@/lib/db";
export const runtime = "nodejs";
interface CountRow {
  CONCLUIDAS: number;
  QUANTIDADE_SEPARADA: number | null;
}
const pendingSql = [  "WITH os_agrupadas AS (",  "  SELECT",  "    TO_CHAR(TRUNC(M.DATA), 'YYYY-MM-DD') AS DATA,",  "    M.CODFILIAL,",  "    M.NUMOS,",  "    MAX(M.NUMTRANSWMS) AS NUMTRANSWMS,",  "    MAX(M.NUMTRANSVENDA) AS NUMTRANSVENDA,",  "    MAX(M.NUMCAR) AS NUMCAR,",  "    MAX(M.NUMBONUS) AS NUMBONUS,",  "    MAX(M.TIPOOS) AS CODTIPOOS,",  "    MIN(M.DTINICIOOS) AS DTINICIOOS,",  "    MAX(TRUNC(M.DATALIBERACAO)) AS DATALIBERACAO,",  "    MAX(M.CODFUNCOS) AS CODFUNCOS,",  "    MIN(M.CODENDERECO) AS CODENDERECO,",  "    COUNT(DISTINCT M.NUMPED) AS TOTAL_PEDIDOS,",  "    MAX(M.NUMPED) AS PEDIDOS,",  "    COUNT(DISTINCT M.CODPROD) AS QTDEITENS,",  "    SUM(NVL(M.QTSEPARADA, 0)) AS QTSEPARADA,",  "    SUM(NVL(M.QTCONFERIDA, 0)) AS QTCONFERIDA,",  "    SUM(NVL(M.QT, 0)) AS QT,",  "    MAX(NVL(M.DTFIMSEPARACAO, M.DTFIMOS)) AS DTFIMSEPARACAO",  "  FROM PCMOVENDPEND M",  "  WHERE M.CODFILIAL = :filial",  "    AND M.DATA >= TO_DATE(:data, 'YYYY-MM-DD') - 30",  "    AND M.DATA < TO_DATE(:data, 'YYYY-MM-DD') + 1",  "    AND M.DTESTORNO IS NULL",  "    AND M.POSICAO = 'P'",  "    AND M.TIPOOS = 13",  "  GROUP BY TRUNC(M.DATA), M.CODFILIAL, M.NUMOS",  ")",  "SELECT",  "  O.DATA,",  "  O.CODFILIAL,",  "  O.NUMOS,",  "  WMS_GETBOX(O.NUMOS, 'C') AS NUMBOX,",  "  WMS_GETBOX(O.NUMOS, 'D') AS DESCRICAOBOX,",  "  T.CODIGO || ' - ' || UPPER(T.DESCRICAO) AS TIPOOS,",  "  FLOOR(ROUND(CASE WHEN O.QT = 0 THEN 0 ELSE O.QTSEPARADA / O.QT * 100 END, 2)) AS PERCSEPARADA,",  "  FLOOR(ROUND(CASE WHEN O.QT = 0 THEN 0 ELSE O.QTCONFERIDA / O.QT * 100 END, 2)) AS PERCCONFERIDA,",  "  O.QTDEITENS,",  "  TO_CHAR(O.DTINICIOOS, 'YYYY-MM-DD\"T\"HH24:MI:SS') AS DTINICIOOS,",  "  TO_CHAR(O.DATALIBERACAO, 'YYYY-MM-DD') AS DATALIBERACAO,",  "  E.MATRICULA || ' - ' || E.NOME AS FUNCIONARIO,",  "  CASE",  "    WHEN NVL(O.NUMCAR, 0) = 0 AND O.TOTAL_PEDIDOS = 0 AND NVL(O.NUMTRANSVENDA, 0) > 0 THEN 'TRANS.VENDA - ' || O.NUMTRANSVENDA",  "    WHEN NVL(O.NUMCAR, 0) = 0 AND O.TOTAL_PEDIDOS = 0 AND NVL(O.NUMTRANSVENDA, 0) = 0 AND O.CODTIPOOS IN (51, 52, 60, 96, 97, 98) THEN 'BÔNUS - ' || O.NUMBONUS",  "    WHEN NVL(O.NUMCAR, 0) = 0 AND O.TOTAL_PEDIDOS = 0 AND NVL(O.NUMTRANSVENDA, 0) = 0 AND O.CODTIPOOS IN (50, 53, 54, 56, 57, 58, 61) THEN 'TRANSF/ABAST'",  "    WHEN NVL(O.NUMCAR, 0) = 0 AND O.TOTAL_PEDIDOS = 1 THEN 'PEDIDO - ' || O.PEDIDOS",  "    WHEN NVL(O.NUMCAR, 0) > 0 THEN 'CARGA - ' || O.NUMCAR",  "  END AS MOVIMENTACAO,",  "  O.NUMTRANSWMS,",  "  O.PEDIDOS,",  "  CALCULAHORAS(O.DTINICIOOS, O.DTFIMSEPARACAO) AS TEMPOSEP",  "FROM os_agrupadas O",  "LEFT JOIN PCTIPOOS T ON T.CODIGO = O.CODTIPOOS",  "LEFT JOIN PCEMPR E ON E.MATRICULA = O.CODFUNCOS",  "ORDER BY O.DATA, O.NUMOS",
].join("\n");
const completedCountSql = [
  "SELECT",
  "  COUNT(DISTINCT M.NUMOS) AS CONCLUIDAS,",
  "  SUM(M.QT) AS QUANTIDADE_SEPARADA",
  "FROM PCMOVENDPEND M",
  "WHERE M.CODFILIAL = :filial",
  "  AND M.DTINICIOOS >= TO_DATE(:data, 'YYYY-MM-DD')",
  "  AND M.DTINICIOOS < TO_DATE(:data, 'YYYY-MM-DD') + 1",
  "  AND M.POSICAO = 'C'",
  "  AND M.DTESTORNO IS NULL",
  "  AND M.CODOPER NOT IN ('SA', 'EA')",
  "  AND M.TIPOOS = 13",
].join("\n");
export async function GET(request: NextRequest) {
  const filial = request.nextUrl.searchParams.get("filial") ?? "1";
  const data =    request.nextUrl.searchParams.get("data") ?? getDateInDashboardTimeZone();
  if (!isBranchCode(filial) || !isDateOnly(data)) {
    return NextResponse.json({
 error: "Filtros inválidos." }
, {
 status: 400 }
);
  }
  let connection: Awaited<ReturnType<typeof getConnection>> | undefined;
  try {
    connection = await getConnection();
    const [result, countResult] = await Promise.all([      connection.execute<PendingOs>(        pendingSql,        {
 filial, data }
,        {
 outFormat: oracledb.OUT_FORMAT_OBJECT }
,      ),      connection.execute<CountRow>(        completedCountSql,        {
 filial, data }
,        {
 outFormat: oracledb.OUT_FORMAT_OBJECT }
,      ),    ]);
    return NextResponse.json({
      data: result.rows ?? [],      concluidas: countResult.rows?.[0]?.CONCLUIDAS ?? 0,      quantidadeSeparada: countResult.rows?.[0]?.QUANTIDADE_SEPARADA ?? 0,    }
);
  }
 catch (error: unknown) {
    console.error("API /separacao Error:", getErrorMessage(error));
    return NextResponse.json(      {
 error: "Não foi possível consultar os dados de separação." }
,      {
 status: 500 }
,    );
  }
 finally {
    await connection?.close();
  }
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, RefreshCw } from "lucide-react";
import styles from "./page.module.css";
import {
  getDateInDashboardTimeZone,
  type ChartDay,
  type ChartUser,
} from "@/lib/dashboard";

interface ChartResponse {
  porDia?: ChartDay[];
  porUsuario?: ChartUser[];
  error?: string;
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: string | number; color?: string }>;
}

function getPastDate(days: number) {
  const [year, month, day] = getDateInDashboardTimeZone()
    .split("-")
    .map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? [day, month, year].join("/") : value;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      <p>Data: {label}</p>
      {payload.map((item) => (
        <strong
          key={item.name}
          style={{ color: item.color, display: "block", marginTop: "0.25rem" }}
        >
          {item.name}: {Number(item.value ?? 0).toLocaleString("pt-BR")}
        </strong>
      ))}
    </div>
  );
}

export default function Graficos() {
  const [dataInicial, setDataInicial] = useState(() => getPastDate(7));
  const [dataFinal, setDataFinal] = useState(() => getPastDate(0));
  const [filial, setFilial] = useState("1");
  const [chartDataDia, setChartDataDia] = useState<ChartDay[]>([]);
  const [chartDataUsuario, setChartDataUsuario] = useState<ChartUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const formattedChartData = useMemo(
    () =>
      chartDataDia.map((item) => ({
        ...item,
        DATA_LABEL: formatDate(item.DATA_OS),
      })),
    [chartDataDia],
  );

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        filial,
        dataInicial,
        dataFinal,
      });
      const response = await fetch("/api/graficos/separacao?" + params, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as ChartResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao carregar os gráficos.");
      }

      if (requestId !== requestIdRef.current) return;

      setChartDataDia(payload.porDia ?? []);
      setChartDataUsuario(payload.porUsuario ?? []);
    } catch (fetchError: unknown) {
      if (
        controller.signal.aborted ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Falha ao carregar os gráficos.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [dataFinal, dataInicial, filial]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(initialFetch);
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return (
    <div className={styles.container}>
      <div className={styles.header + " glass"}>
        <div className={styles.heading}>
          <Link href="/" className={styles.linkButton} title="Voltar ao painel">
            <ArrowLeft size={20} />
          </Link>
          <h1 className={styles.title}>Desempenho de Separação (OS 100%)</h1>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="filial-graficos">
              Filial
            </label>
            <select
              id="filial-graficos"
              className={styles.select}
              value={filial}
              onChange={(event) => setFilial(event.target.value)}
            >
              <option value="1">Filial 1</option>
              <option value="2">Filial 2</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="data-inicial">
              Data inicial
            </label>
            <input
              id="data-inicial"
              type="date"
              className={styles.input}
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="data-final">
              Data final
            </label>
            <input
              id="data-final"
              type="date"
              className={styles.input}
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
            />
          </div>

          <button
            className={styles.button}
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.chartsGrid}>
        <section className={styles.chartContainer}>
          <h2 className={styles.chartTitle}>Ranking por funcionário</h2>
          {loading && chartDataUsuario.length === 0 ? (
            <div className={styles.emptyState}>Carregando dados...</div>
          ) : chartDataUsuario.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum dado encontrado para este período.
            </div>
          ) : (
            <div className={styles.rankingTableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th className={styles.alignRight}>Quant. OS</th>
                    <th className={styles.alignRight}>Produtos separados</th>
                  </tr>
                </thead>
                <tbody>
                  {chartDataUsuario.map((row) => (
                    <tr
                      key={String(row.MATRICULA) + "-" + (row.FUNCIONARIO ?? "")}
                    >
                      <td className={styles.muted}>{row.MATRICULA}</td>
                      <td className={styles.employeeName}>{row.FUNCIONARIO}</td>
                      <td className={styles.completed}>{row.CONCLUIDAS}</td>
                      <td className={styles.quantity}>{row.QUANTIDADE_SEPARADA.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.chartContainer}>
          <h2 className={styles.chartTitle}>Evolução diária: OS e produtos</h2>
          {loading && formattedChartData.length === 0 ? (
            <div className={styles.emptyState}>Carregando dados...</div>
          ) : formattedChartData.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum dado encontrado para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={formattedChartData}
                margin={{ top: 40, right: 35, left: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="DATA_LABEL"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                  tickMargin={15}
                />
                <YAxis
                  yAxisId="produtos"
                  stroke="#a78bfa"
                  tick={{ fill: "#a78bfa" }}
                  width={72}
                />
                <YAxis
                  yAxisId="os"
                  orientation="right"
                  stroke="#2dd4bf"
                  tick={{ fill: "#2dd4bf" }}
                  allowDecimals={false}
                  width={48}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                />
                <Legend verticalAlign="top" height={28} />
                <Bar
                  yAxisId="produtos"
                  dataKey="QUANTIDADE_SEPARADA"
                  name="Produtos separados"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
                <Line
                  yAxisId="os"
                  type="monotone"
                  dataKey="CONCLUIDAS"
                  name="OS concluídas"
                  stroke="#2dd4bf"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#fff", stroke: "#2dd4bf", strokeWidth: 2 }}
                  activeDot={{
                    r: 6,
                    fill: "#fff",
                    stroke: "#2dd4bf",
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}
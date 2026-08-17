"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { BarChart2, Maximize, RefreshCw } from "lucide-react";
import styles from "./page.module.css";
import {
  getDateInDashboardTimeZone,
  type PendingOs,
} from "@/lib/dashboard";

type SortKey = keyof PendingOs;
type SortConfig = { key: SortKey; direction: "asc" | "desc" };

interface SeparationResponse {
  data?: PendingOs[];
  concluidas?: number;
  quantidadeSeparada?: number;
  error?: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? [day, month, year].join("/") : value;
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function getProgressBarColor(percentage: number) {
  if (percentage >= 100) return "#22c55e";
  if (percentage > 0) return "#3b82f6";
  return "transparent";
}

function getComparableValue(value: PendingOs[SortKey]) {
  if (typeof value === "number") return value;
  return value?.toString().toLocaleLowerCase("pt-BR") ?? "";
}

export default function Dashboard() {
  const [data, setData] = useState<PendingOs[]>([]);
  const [loading, setLoading] = useState(false);
  const [filial, setFilial] = useState("1");
  const [dateFilter, setDateFilter] = useState(() =>
    getDateInDashboardTimeZone(),
  );
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [osFeitasHoje, setOsFeitasHoje] = useState(0);
  const [quantidadeSeparada, setQuantidadeSeparada] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const processedData = useMemo(() => {
    const rows = data.filter(
      (row) => !(row.PERCSEPARADA === 100 && row.PERCCONFERIDA === 100),
    );

    if (!sortConfig) return rows;

    const { key, direction } = sortConfig;
    return [...rows].sort((a, b) => {
      const aValue = getComparableValue(a[key]);
      const bValue = getComparableValue(b[key]);
      const comparison =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), "pt-BR", {
              numeric: true,
            });

      return direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ filial, data: dateFilter });
      const response = await fetch("/api/separacao?" + params, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as SeparationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao carregar o painel.");
      }

      if (requestId !== requestIdRef.current) return;

      setData(payload.data ?? []);
      setOsFeitasHoje(payload.concluidas ?? 0);
      setQuantidadeSeparada(payload.quantidadeSeparada ?? 0);
      setLastUpdated(new Date());
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
          : "Falha ao carregar o painel.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [dateFilter, filial]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await dashboardRef.current?.requestFullscreen();
  };

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === dashboardRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchData();
    }, 0);

    const interval =
      refreshInterval > 0
        ? window.setInterval(() => {
            void fetchData();
          }, refreshInterval * 1000)
        : undefined;

    return () => {
      window.clearTimeout(initialFetch);
      if (interval) window.clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [fetchData, refreshInterval]);

  return (
    <div
      ref={dashboardRef}
      className={styles.container + (isFullscreen ? " " + styles.fullscreen : "")}
    >
      {!isFullscreen && (
      <header className={styles.header + " glass-header"}>
        <div className={styles.title}>Painel de Separação</div>

        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="filial">
              Filial
            </label>
            <input
              id="filial"
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={filial}
              onChange={(event) => setFilial(event.target.value)}
              style={{ width: "80px" }}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="data">
              Data
            </label>
            <input
              id="data"
              type="date"
              className={styles.input}
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="atualizacao">
              Atualização
            </label>
            <select
              id="atualizacao"
              className={styles.select}
              value={refreshInterval}
              onChange={(event) =>
                setRefreshInterval(Number(event.target.value))
              }
            >
              <option value={10}>10 segundos</option>
              <option value={30}>30 segundos</option>
              <option value={60}>1 minuto</option>
              <option value={300}>5 minutos</option>
              <option value={0}>Manual</option>
            </select>
          </div>

          <button
            className={styles.button}
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.spin : ""} />
            Atualizar agora
          </button>

          {lastUpdated && (
            <div className={styles.lastUpdate}>
              Última atualização:{" "}
              {dateTimeFormatter.format(lastUpdated)}
            </div>
          )}          <button
            className={styles.button}
            onClick={() => void toggleFullscreen()}
            title="Exibir somente a lista de OS em tela cheia"
          >
            <Maximize size={16} />
            Tela cheia
          </button>


          <Link
            href="/graficos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <BarChart2 size={16} />
            Ver gráficos
          </Link>
        </div>
      </header>
      )}

      {!isFullscreen && error && <p className={styles.errorMessage}>{error}</p>}

      {!isFullscreen && (
      <div className={styles.statsGrid}>
        <div className={styles.statCard + " glass"}>
          <div className={styles.statLabel}>Total de OS listadas</div>
          <div className={styles.statValue}>{processedData.length}</div>
        </div>
        <div className={styles.statCard + " glass"}>
          <div className={styles.statLabel}>OS concluídas hoje</div>
          <div className={styles.statValue}>{osFeitasHoje}</div>
        </div>
        <div className={styles.statCard + " glass"}>
          <div className={styles.statLabel}>Quantidade de produtos separados hoje</div>
          <div className={styles.statValue}>
            {quantidadeSeparada.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
      )}

      <div className={styles.tableContainer + " glass" + (isFullscreen ? " " + styles.fullscreenTable : "")}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("DATA")}
              >
                Data OS{getSortIcon("DATA")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("CODFILIAL")}
              >
                Filial{getSortIcon("CODFILIAL")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("NUMTRANSWMS")}
              >
                Num. WMS{getSortIcon("NUMTRANSWMS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("NUMOS")}
              >
                Num. OS{getSortIcon("NUMOS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("PEDIDOS")}
              >
                Pedido{getSortIcon("PEDIDOS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("TIPOOS")}
              >
                Tipo de OS{getSortIcon("TIPOOS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("MOVIMENTACAO")}
              >
                Tipo de movimentação{getSortIcon("MOVIMENTACAO")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("DTINICIOOS")}
              >
                Início OS{getSortIcon("DTINICIOOS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("PERCSEPARADA")}
              >
                % Separação{getSortIcon("PERCSEPARADA")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("PERCCONFERIDA")}
              >
                % Conferência{getSortIcon("PERCCONFERIDA")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("QTDEITENS")}
              >
                Qtde. itens{getSortIcon("QTDEITENS")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("DATALIBERACAO")}
              >
                Liberação{getSortIcon("DATALIBERACAO")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("FUNCIONARIO")}
              >
                Funcionário atribuído{getSortIcon("FUNCIONARIO")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("NUMBOX")}
              >
                Box{getSortIcon("NUMBOX")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("DESCRICAOBOX")}
              >
                Descrição do box{getSortIcon("DESCRICAOBOX")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("TEMPOSEP")}
              >
                Tempo{getSortIcon("TEMPOSEP")}
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={16} className={styles.emptyCell}>
                  {loading
                    ? "Carregando dados..."
                    : "Nenhum dado pendente encontrado."}
                </td>
              </tr>
            ) : (
              processedData.map((row) => (
                <tr key={String(row.NUMOS)}>
                  <td>{formatDate(row.DATA)}</td>
                  <td>{row.CODFILIAL}</td>
                  <td>{row.NUMTRANSWMS}</td>
                  <td>{row.NUMOS}</td>
                  <td>{row.PEDIDOS ?? ""}</td>
                  <td>{row.TIPOOS}</td>
                  <td>{row.MOVIMENTACAO}</td>
                  <td>{formatDateTime(row.DTINICIOOS)}</td>
                  <td>
                    <div className={styles.progressWrapper}>
                      <div
                        className={styles.progressBar}
                        style={{
                          width: Math.min(
                            Math.max(row.PERCSEPARADA ?? 0, 0),
                            100,
                          ) + "%",
                          background: getProgressBarColor(
                            row.PERCSEPARADA ?? 0,
                          ),
                        }}
                      />
                      <span className={styles.progressText}>
                        {row.PERCSEPARADA ?? 0}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.progressWrapper}>
                      <div
                        className={styles.progressBar}
                        style={{
                          width: Math.min(
                            Math.max(row.PERCCONFERIDA ?? 0, 0),
                            100,
                          ) + "%",
                          background: getProgressBarColor(
                            row.PERCCONFERIDA ?? 0,
                          ),
                        }}
                      />
                      <span className={styles.progressText}>
                        {row.PERCCONFERIDA ?? 0}%
                      </span>
                    </div>
                  </td>
                  <td>{row.QTDEITENS}</td>
                  <td>{formatDate(row.DATALIBERACAO)}</td>
                  <td>{row.FUNCIONARIO}</td>
                  <td>{row.NUMBOX}</td>
                  <td>{row.DESCRICAOBOX}</td>
                  <td>{row.TEMPOSEP ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
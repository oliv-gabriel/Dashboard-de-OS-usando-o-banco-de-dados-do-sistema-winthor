import oracledb, { type Connection, type Pool } from "oracledb";

type OracleGlobal = typeof globalThis & {
  oracleClientInitializationAttempted?: boolean;
  oraclePoolPromise?: Promise<Pool>;
};

const oracleGlobal = globalThis as OracleGlobal;

function getPoolSize(name: "DB_POOL_MIN" | "DB_POOL_MAX", fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function initializeOracleClient() {
  if (oracleGlobal.oracleClientInitializationAttempted) return;

  // The native client must only be initialized once per Node.js process.
  oracleGlobal.oracleClientInitializationAttempted = true;

  try {
    oracledb.initOracleClient();
    console.info("Oracle Client initialized in Thick mode.");
  } catch (error) {
    console.warn(
      "Oracle Thick mode is unavailable; using Thin mode instead.",
      error,
    );
  }
}

async function createPool() {
  initializeOracleClient();

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectString = process.env.DB_CONNECTION_STRING;

  if (!user || !password || !connectString) {
    throw new Error("Oracle database environment variables are not configured.");
  }

  const poolMin = getPoolSize("DB_POOL_MIN", 1);
  const poolMax = Math.max(getPoolSize("DB_POOL_MAX", 10), poolMin);

  return oracledb.createPool({
    user,
    password,
    connectString,
    poolMin,
    poolMax,
    poolIncrement: 1,
  });
}

export async function getConnection(): Promise<Connection> {
  if (!oracleGlobal.oraclePoolPromise) {
    oracleGlobal.oraclePoolPromise = createPool().catch((error: unknown) => {
      oracleGlobal.oraclePoolPromise = undefined;
      throw error;
    });
  }

  const pool = await oracleGlobal.oraclePoolPromise;
  return pool.getConnection();
}
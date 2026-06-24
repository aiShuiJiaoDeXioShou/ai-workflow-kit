export const httpHealthRuntimeStatuses = [
  "idle",
  "checking",
  "up",
  "down",
  "error",
] as const;

export type HttpHealthRuntimeStatus =
  (typeof httpHealthRuntimeStatuses)[number];

export type HttpHealthRuntimeResult = {
  status: Exclude<HttpHealthRuntimeStatus, "idle" | "checking">;
  latencyMs?: number;
  statusCode?: number;
  checkedAt?: string;
  error?: string;
};

export type HttpHealthRuntimeState = {
  status: HttpHealthRuntimeStatus;
  latencyMs?: number;
  lastCheckedAt?: string;
  lastError?: string;
  history: HttpHealthRuntimeResult[];
};

const runtimeStatusSet = new Set<string>(httpHealthRuntimeStatuses);
const historyStatusSet = new Set<string>(["up", "down", "error"]);
const maxHistoryItems = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function readStatus(value: unknown): HttpHealthRuntimeStatus {
  return typeof value === "string" && runtimeStatusSet.has(value)
    ? (value as HttpHealthRuntimeStatus)
    : "idle";
}

function readHistoryStatus(
  value: unknown,
): HttpHealthRuntimeResult["status"] | undefined {
  return typeof value === "string" && historyStatusSet.has(value)
    ? (value as HttpHealthRuntimeResult["status"])
    : undefined;
}

function readStatusCode(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
    ? value
    : undefined;
}

function parseHistoryItem(value: unknown): HttpHealthRuntimeResult | undefined {
  if (!isRecord(value)) return undefined;

  const status = readHistoryStatus(value.status);
  if (!status) return undefined;

  return {
    status,
    latencyMs: readNonNegativeNumber(value.latencyMs),
    statusCode: readStatusCode(value.statusCode),
    checkedAt: readString(value.checkedAt),
    error: readString(value.error),
  };
}

function parseHistory(value: unknown): HttpHealthRuntimeResult[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(parseHistoryItem)
    .filter((item): item is HttpHealthRuntimeResult => Boolean(item))
    .slice(-maxHistoryItems);
}

export function parseHttpHealthRuntimeState(
  runtimeState: unknown,
): HttpHealthRuntimeState {
  if (!isRecord(runtimeState)) {
    return {
      status: "idle",
      history: [],
    };
  }

  const historySource =
    runtimeState.history ??
    runtimeState.recentHistory ??
    runtimeState.recentResults;

  return {
    status: readStatus(runtimeState.status),
    latencyMs: readNonNegativeNumber(runtimeState.latencyMs),
    lastCheckedAt: readString(runtimeState.lastCheckedAt),
    lastError: readString(runtimeState.lastError),
    history: parseHistory(historySource),
  };
}

import type { QuotaTrackerConfig } from "./schema";

export const quotaLevels = [
  "normal",
  "warning",
  "critical",
  "unknown",
] as const;

export type QuotaLevel = (typeof quotaLevels)[number];

export type QuotaRuntimeState = {
  current?: number;
  limit?: number;
  remaining?: number;
  percentUsed?: number;
  level: QuotaLevel;
  lastLoadedAt?: string;
  lastError?: string;
};

const quotaLevelSet = new Set<string>(quotaLevels);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function readLevel(value: unknown): QuotaLevel {
  return typeof value === "string" && quotaLevelSet.has(value)
    ? (value as QuotaLevel)
    : "unknown";
}

export function resolveQuotaLevel(
  percentUsed: number | undefined,
  config: Pick<
    QuotaTrackerConfig,
    "warningThresholdPercent" | "criticalThresholdPercent"
  >,
): QuotaLevel {
  if (typeof percentUsed !== "number" || !Number.isFinite(percentUsed)) {
    return "unknown";
  }

  if (percentUsed >= config.criticalThresholdPercent) return "critical";
  if (percentUsed >= config.warningThresholdPercent) return "warning";
  return "normal";
}

export function deriveManualQuotaRuntimeState(
  config: QuotaTrackerConfig,
): QuotaRuntimeState {
  const current = config.manualCurrent;
  const limit = config.manualLimit;
  const remaining = limit - current;
  const percentUsed = (current / limit) * 100;

  return {
    current,
    limit,
    remaining,
    percentUsed,
    level: resolveQuotaLevel(percentUsed, config),
  };
}

export function parseQuotaRuntimeState(
  runtimeState: unknown,
): QuotaRuntimeState {
  if (!isRecord(runtimeState)) {
    return {
      level: "unknown",
    };
  }

  const current = readNonNegativeNumber(runtimeState.current);
  const limit = readPositiveNumber(runtimeState.limit);
  const remaining =
    readFiniteNumber(runtimeState.remaining) ??
    (current !== undefined && limit !== undefined ? limit - current : undefined);
  const percentUsed =
    readNonNegativeNumber(runtimeState.percentUsed) ??
    (current !== undefined && limit !== undefined
      ? (current / limit) * 100
      : undefined);

  return {
    current,
    limit,
    remaining,
    percentUsed,
    level: readLevel(runtimeState.level),
    lastLoadedAt: readString(runtimeState.lastLoadedAt),
    lastError: readString(runtimeState.lastError),
  };
}

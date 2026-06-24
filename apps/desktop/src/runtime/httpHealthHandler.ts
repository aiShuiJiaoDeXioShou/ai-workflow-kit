import { invoke } from "@tauri-apps/api/core";
import {
  httpHealthMonitorConfigSchema,
  parseHttpHealthRuntimeState,
  type HttpHealthMonitorConfig,
  type HttpHealthRuntimeResult,
  type HttpHealthRuntimeState,
} from "@ai-workflow-kit/components";

import type {
  RuntimeActionHandler,
  RuntimeActionHandlers,
} from "./actionDispatcher";

export type HttpHealthCheckFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type HttpHealthCheckProbeRequest = {
  method: HttpHealthMonitorConfig["method"];
  signal: AbortSignal;
  timeoutMs: number;
  url: string;
};

export type HttpHealthCheckProbeResult = {
  statusCode: number;
};

export type HttpHealthCheckProbe = (
  request: HttpHealthCheckProbeRequest,
) => Promise<HttpHealthCheckProbeResult>;

export type HttpHealthCheckDependencies = {
  fetcher?: HttpHealthCheckFetcher;
  probe?: HttpHealthCheckProbe;
  now?: () => Date;
  monotonicNow?: () => number;
};

const maxHistoryItems = 6;

export function createHttpHealthCheckHandler(
  dependencies: HttpHealthCheckDependencies = {},
): RuntimeActionHandler {
  const probe =
    dependencies.probe ??
    (dependencies.fetcher
      ? createFetchProbe(dependencies.fetcher)
      : createDefaultProbe());
  const now = dependencies.now ?? (() => new Date());
  const monotonicNow = dependencies.monotonicNow ?? (() => performance.now());

  return async ({ config, runtimeState }) => {
    const parsedConfig = httpHealthMonitorConfigSchema.parse(config);
    const previousState = parseHttpHealthRuntimeState(runtimeState);

    return runHttpHealthCheck({
      config: parsedConfig,
      monotonicNow,
      now,
      previousState,
      probe,
    });
  };
}

export function createHttpHealthActionHandlers(
  dependencies: HttpHealthCheckDependencies = {},
): RuntimeActionHandlers {
  return {
    "monitor.http.check": createHttpHealthCheckHandler(dependencies),
  };
}

async function runHttpHealthCheck({
  config,
  monotonicNow,
  now,
  previousState,
  probe,
}: {
  config: HttpHealthMonitorConfig;
  monotonicNow: () => number;
  now: () => Date;
  previousState: HttpHealthRuntimeState;
  probe: HttpHealthCheckProbe;
}): Promise<HttpHealthRuntimeState> {
  const startedAt = monotonicNow();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await probe({
      method: config.method,
      signal: controller.signal,
      timeoutMs: config.timeoutMs,
      url: config.url,
    });
    const statusCode = response.statusCode;
    const checkedAt = now().toISOString();
    const latencyMs = Math.max(0, monotonicNow() - startedAt);
    const isExpectedStatus = statusCode === config.expectedStatus;
    const result: HttpHealthRuntimeResult = {
      status: isExpectedStatus ? "up" : "down",
      latencyMs,
      statusCode,
      checkedAt,
      error: isExpectedStatus
        ? undefined
        : `期望 ${config.expectedStatus}，实际 ${statusCode}`,
    };

    return {
      status: result.status,
      latencyMs,
      lastCheckedAt: checkedAt,
      lastError: result.error,
      history: appendHistory(previousState.history, result),
    };
  } catch (error) {
    const checkedAt = now().toISOString();
    const result: HttpHealthRuntimeResult = {
      status: "error",
      checkedAt,
      error: error instanceof Error ? error.message : "HTTP 检测失败",
    };

    return {
      status: "error",
      lastCheckedAt: checkedAt,
      lastError: result.error,
      history: appendHistory(previousState.history, result),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function appendHistory(
  history: HttpHealthRuntimeResult[],
  result: HttpHealthRuntimeResult,
): HttpHealthRuntimeResult[] {
  return [...history, result].slice(-maxHistoryItems);
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function createDefaultProbe(): HttpHealthCheckProbe {
  if (isTauriRuntime()) {
    return async ({ method, timeoutMs, url }) => {
      const result = await invoke<{ statusCode: number }>("check_http_health", {
        request: {
          method,
          timeoutMs,
          url,
        },
      });

      return result;
    };
  }

  return createFetchProbe(fetch);
}

function createFetchProbe(fetcher: HttpHealthCheckFetcher): HttpHealthCheckProbe {
  return async ({ method, signal, url }) => {
    const response = await fetcher(url, {
      method,
      signal,
    });

    return {
      statusCode: response.status,
    };
  };
}

import { invoke } from "@tauri-apps/api/core";
import {
  deriveManualQuotaRuntimeState,
  quotaTrackerConfigSchema,
  type QuotaRuntimeState,
  type QuotaTrackerConfig,
} from "@ai-workflow-kit/components";

import type {
  RuntimeActionHandler,
  RuntimeActionHandlers,
} from "./actionDispatcher";

export type RefreshQuotaFileRequest = {
  filePath: string;
  jsonMapping: QuotaTrackerConfig["jsonMapping"];
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
};

export type RefreshQuotaFile = (
  request: RefreshQuotaFileRequest,
) => Promise<QuotaRuntimeState>;

export type QuotaRefreshDependencies = {
  refreshQuotaFile?: RefreshQuotaFile;
  now?: () => Date;
};

export function createQuotaRefreshHandler(
  dependencies: QuotaRefreshDependencies = {},
): RuntimeActionHandler {
  const refreshQuotaFile =
    dependencies.refreshQuotaFile ?? defaultRefreshQuotaFile;
  const now = dependencies.now ?? (() => new Date());

  return async ({ config }) => {
    const parsedConfig = quotaTrackerConfigSchema.parse(config);

    if (parsedConfig.sourceMode === "manual") {
      return {
        ...deriveManualQuotaRuntimeState(parsedConfig),
        lastLoadedAt: now().toISOString(),
      };
    }

    try {
      return await refreshQuotaFile({
        filePath: parsedConfig.filePath,
        jsonMapping: parsedConfig.jsonMapping,
        warningThresholdPercent: parsedConfig.warningThresholdPercent,
        criticalThresholdPercent: parsedConfig.criticalThresholdPercent,
      });
    } catch (error) {
      return {
        level: "unknown",
        lastLoadedAt: now().toISOString(),
        lastError:
          error instanceof Error ? error.message : "额度刷新失败",
      } satisfies QuotaRuntimeState;
    }
  };
}

export function createQuotaActionHandlers(
  dependencies: QuotaRefreshDependencies = {},
): RuntimeActionHandlers {
  return {
    "quota.file.refresh": createQuotaRefreshHandler(dependencies),
  };
}

function defaultRefreshQuotaFile(request: RefreshQuotaFileRequest) {
  return invoke<QuotaRuntimeState>("refresh_quota_file", { request });
}

import {
  getComponentManifest,
  type HttpHealthMonitorConfig,
} from "@ai-workflow-kit/components";
import { useClientContext } from "@flowgram.ai/free-layout-editor";
import { useEffect, useRef } from "react";

import { readFlowgramWorkflowNodeData } from "../canvas/flowgramNodeForm";
import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "./componentActionRuntime";

const httpHealthComponentType = "core.monitor.http-health";
const schedulerTickMs = 1_000;

type HttpHealthScheduleRecord = {
  configKey?: string;
  inFlight: boolean;
  lastRunAt?: number;
};

type HttpHealthScheduleTarget = {
  config: HttpHealthMonitorConfig;
  configKey: string;
  instanceId: string;
};

type WorkflowRuntimeCoordinatorProps = {
  getComponentRuntimeState: GetComponentRuntimeState;
  invokeComponentAction: InvokeComponentAction;
};

function stableConfigKey(config: HttpHealthMonitorConfig): string {
  return JSON.stringify({
    expectedStatus: config.expectedStatus,
    intervalSeconds: config.intervalSeconds,
    method: config.method,
    timeoutMs: config.timeoutMs,
    url: config.url,
  });
}

function shouldRunHttpHealthCheck({
  config,
  now,
  record,
}: {
  config: HttpHealthMonitorConfig;
  now: number;
  record: HttpHealthScheduleRecord;
}): boolean {
  if (record.inFlight) return false;
  if (!record.lastRunAt) return true;

  return now - record.lastRunAt >= config.intervalSeconds * 1_000;
}

function isPageVisible(): boolean {
  return document.visibilityState !== "hidden";
}

export function WorkflowRuntimeCoordinator({
  getComponentRuntimeState,
  invokeComponentAction,
}: WorkflowRuntimeCoordinatorProps) {
  const clientContext = useClientContext();
  const schedulesRef = useRef(new Map<string, HttpHealthScheduleRecord>());

  useEffect(() => {
    let disposed = false;

    function collectHttpHealthTargets(): HttpHealthScheduleTarget[] {
      const manifest = getComponentManifest(httpHealthComponentType);
      if (!manifest) return [];

      return clientContext.document
        .getAllNodes()
        .map(readFlowgramWorkflowNodeData)
        .flatMap((nodeData): HttpHealthScheduleTarget[] => {
          if (
            !nodeData ||
            nodeData.nodeKind !== "component" ||
            nodeData.componentType !== httpHealthComponentType ||
            !nodeData.instanceId
          ) {
            return [];
          }

          const configResult = manifest.configSchema.safeParse(
            nodeData.configJson ?? manifest.defaultConfig,
          );
          if (!configResult.success) return [];

          return [
            {
              config: configResult.data,
              configKey: stableConfigKey(configResult.data),
              instanceId: nodeData.instanceId,
            },
          ];
        });
    }

    function tick() {
      if (disposed || !isPageVisible()) return;

      const now = Date.now();
      const activeInstanceIds = new Set<string>();

      for (const target of collectHttpHealthTargets()) {
        activeInstanceIds.add(target.instanceId);

        const currentRecord = schedulesRef.current.get(target.instanceId) ?? {
          inFlight: false,
        };
        const configChanged = currentRecord.configKey !== target.configKey;
        const normalizedRecord = configChanged
          ? { configKey: target.configKey, inFlight: false }
          : currentRecord;

        if (
          !configChanged &&
          !shouldRunHttpHealthCheck({
            config: target.config,
            now,
            record: normalizedRecord,
          })
        ) {
          schedulesRef.current.set(target.instanceId, normalizedRecord);
          continue;
        }

        schedulesRef.current.set(target.instanceId, {
          configKey: target.configKey,
          inFlight: true,
          lastRunAt: now,
        });

        void invokeComponentAction({
          actionId: "checkNow",
          componentType: httpHealthComponentType,
          config: target.config,
          instanceId: target.instanceId,
          runtimeState: getComponentRuntimeState(target.instanceId),
          source: "interval",
        }).finally(() => {
          const latestRecord = schedulesRef.current.get(target.instanceId);
          if (!latestRecord || latestRecord.configKey !== target.configKey) {
            return;
          }

          schedulesRef.current.set(target.instanceId, {
            ...latestRecord,
            inFlight: false,
          });
        });
      }

      for (const instanceId of schedulesRef.current.keys()) {
        if (!activeInstanceIds.has(instanceId)) {
          schedulesRef.current.delete(instanceId);
        }
      }
    }

    tick();
    const intervalId = window.setInterval(tick, schedulerTickMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [clientContext.document, getComponentRuntimeState, invokeComponentAction]);

  return null;
}

export const __testing = {
  shouldRunHttpHealthCheck,
  stableConfigKey,
};

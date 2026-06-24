import { listen } from "@tauri-apps/api/event";
import { useEffect, useReducer } from "react";

import {
  initialRunLogState,
  runLogReducer,
  type AgentRunExitPayload,
  type AgentRunOutputPayload,
  type AgentRunStartedPayload,
} from "./runLogState";

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function useRunLogEvents() {
  const [state, dispatch] = useReducer(runLogReducer, initialRunLogState);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    async function subscribe() {
      const started = await listen<AgentRunStartedPayload>(
        "agent_run_started",
        (event) => {
          dispatch({ type: "started", payload: event.payload });
        },
      );
      const stdout = await listen<AgentRunOutputPayload>(
        "agent_run_stdout",
        (event) => {
          dispatch({
            type: "output",
            stream: "stdout",
            payload: event.payload,
          });
        },
      );
      const stderr = await listen<AgentRunOutputPayload>(
        "agent_run_stderr",
        (event) => {
          dispatch({
            type: "output",
            stream: "stderr",
            payload: event.payload,
          });
        },
      );
      const exit = await listen<AgentRunExitPayload>(
        "agent_run_exit",
        (event) => {
          dispatch({ type: "exit", payload: event.payload });
        },
      );

      unlisteners.push(started, stdout, stderr, exit);
      if (disposed) {
        unlisteners.splice(0).forEach((unlisten) => unlisten());
      }
    }

    void subscribe().catch(() => {
      // 浏览器预览缺少 Tauri event bridge，运行日志保持空状态即可。
    });

    return () => {
      disposed = true;
      unlisteners.splice(0).forEach((unlisten) => unlisten());
    };
  }, []);

  return {
    clear: () => dispatch({ type: "clear" }),
    dispatch,
    state,
  };
}

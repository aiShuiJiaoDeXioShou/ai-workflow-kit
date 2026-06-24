import { createContext, useContext, type ReactNode } from "react";

import type {
  GetComponentRuntimeState,
  InvokeComponentAction,
} from "./componentActionRuntime";

type ComponentRuntimeContextValue = {
  getComponentRuntimeState: GetComponentRuntimeState;
  invokeComponentAction: InvokeComponentAction;
};

const defaultRuntimeContext: ComponentRuntimeContextValue = {
  getComponentRuntimeState: () => undefined,
  invokeComponentAction: async () => {},
};

const ComponentRuntimeContext = createContext<ComponentRuntimeContextValue>(
  defaultRuntimeContext,
);

export function ComponentRuntimeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ComponentRuntimeContextValue;
}) {
  return (
    <ComponentRuntimeContext.Provider value={value}>
      {children}
    </ComponentRuntimeContext.Provider>
  );
}

export function useComponentRuntime() {
  return useContext(ComponentRuntimeContext);
}

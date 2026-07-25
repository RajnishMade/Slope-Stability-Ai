import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ANALYSIS_CONFIG, fieldsFor } from "../data/analysisConfig";
import type { ModeId } from "../data/modes";

/** Raw string values keyed by field name (strings so partial typing works). */
export type ModeValues = Record<string, string>;
type Store = Record<ModeId, ModeValues>;

function defaultsFor(mode: ModeId): ModeValues {
  const v: ModeValues = {};
  for (const f of fieldsFor(mode)) v[f.key] = String(f.def);
  return v;
}

function initialStore(): Store {
  const s = {} as Store;
  for (const mode of Object.keys(ANALYSIS_CONFIG) as ModeId[]) {
    s[mode] = defaultsFor(mode);
  }
  return s;
}

interface InputsApi {
  values(mode: ModeId): ModeValues;
  setValue(mode: ModeId, key: string, value: string): void;
  resetMode(mode: ModeId): void;
}

const InputsCtx = createContext<InputsApi | null>(null);

/**
 * Lives above the router so parameters survive navigating between the
 * selector and an analysis view (and back again).
 */
export function InputsProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(initialStore);

  const values = useCallback((mode: ModeId) => store[mode], [store]);

  const setValue = useCallback((mode: ModeId, key: string, value: string) => {
    setStore((prev) => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  }, []);

  const resetMode = useCallback((mode: ModeId) => {
    setStore((prev) => ({ ...prev, [mode]: defaultsFor(mode) }));
  }, []);

  const api = useMemo(() => ({ values, setValue, resetMode }), [values, setValue, resetMode]);

  return <InputsCtx.Provider value={api}>{children}</InputsCtx.Provider>;
}

export function useInputs(): InputsApi {
  const ctx = useContext(InputsCtx);
  if (!ctx) throw new Error("useInputs must be used inside <InputsProvider>");
  return ctx;
}

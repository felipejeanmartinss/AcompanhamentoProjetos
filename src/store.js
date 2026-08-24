import { hydrateAppConfig, normalizeVisualConfig } from "./config.js";

const STORAGE_KEY = "acompanhamento-projetos-v2";

export const initialState = {
  projects: [], units: [], proposals: [], targets: [], categories: [],
  simulations: [], imports: {}, selectedProject: "", view: "portfolio",
  appConfig: hydrateAppConfig(), productVisualConfigs: {},
};

export function hydrateState(value = {}) {
  const visualConfigs = Object.fromEntries(Object.entries(value.productVisualConfigs || {})
    .map(([key, config]) => [key, normalizeVisualConfig({ ...config, productId: config?.productId || key })]));
  return {
    ...structuredClone(initialState),
    ...value,
    appConfig: hydrateAppConfig(value.appConfig),
    productVisualConfigs: visualConfigs,
  };
}

export function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return hydrateState(value || {});
  } catch {
    return structuredClone(initialState);
  }
}
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function clearState() { localStorage.removeItem(STORAGE_KEY); return structuredClone(initialState); }

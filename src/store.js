const STORAGE_KEY = "acompanhamento-projetos-v2";

export const initialState = {
  projects: [], units: [], proposals: [], targets: [], categories: [],
  simulations: [], imports: {}, selectedProject: "", view: "portfolio",
};

export function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return value ? { ...structuredClone(initialState), ...value } : structuredClone(initialState);
  } catch {
    return structuredClone(initialState);
  }
}
export function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function clearState() { localStorage.removeItem(STORAGE_KEY); return structuredClone(initialState); }

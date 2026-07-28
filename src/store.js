const STORAGE_KEY = "acompanhamento-projetos-v1";

const initialState = {
  realized: [],
  simulations: [],
  selectedProject: "Todos",
  lastImport: null,
};

export function loadState() {
  try {
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return persisted ? { ...initialState, ...persisted } : structuredClone(initialState);
  } catch {
    return structuredClone(initialState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(initialState);
}

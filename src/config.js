export const DEFAULT_SUMMARY_CHART_CONFIG = Object.freeze({
  salesColor: "#ebb92d",
  bpColor: "#60605d",
  cancellationsColor: "#de4638",
  nominalPriceColor: "#325fcc",
  correctedPriceColor: "#6e55d8",
  showSales: true,
  showBP: true,
  showCancellations: true,
  showNominalPrice: true,
  showCorrectedPrice: true,
});

export const DEFAULT_KPI_CONFIG = Object.freeze({
  salesUnits: true,
  targetUnits: true,
  unitAchievement: true,
  cancellations: true,
  salesVgv: true,
  targetVgv: true,
  vgvAchievement: true,
  averagePrice: true,
});

export const DEFAULT_APP_CONFIG = Object.freeze({
  summary: {
    chart: DEFAULT_SUMMARY_CHART_CONFIG,
    kpis: DEFAULT_KPI_CONFIG,
    showAnalytic: true,
  },
  availability: {
    tooltipFields: {
      status: true,
      category: true,
      area: true,
      tablePrice: true,
      pricePerSquareMeter: true,
    },
    categoryFields: {
      stock: true,
      totalSales: true,
      yearSales: true,
      monthSales: true,
    },
    defaultMode: "unit",
  },
  simulation: {
    showProposalSummary: true,
    showFlowComparison: true,
    showVisualAvailability: true,
    showSimilarSales: true,
    similarSalesLimit: 4,
  },
  sharing: {
    message: "Olá, segue análise comercial da unidade {{unidade}} no produto {{produto}}.",
    signature: "Equipe Comercial",
    footer: "Informações sujeitas à validação comercial.",
    showVisualAvailability: true,
    showSimilarSales: true,
  },
  general: {
    enabledYears: [new Date().getFullYear()],
    salesChannels: [],
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeObject(defaults, value) {
  const result = clone(defaults);
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  Object.entries(value).forEach(([key, item]) => {
    if (item && typeof item === "object" && !Array.isArray(item) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = mergeObject(result[key], item);
    } else {
      result[key] = item;
    }
  });
  return result;
}

export function hydrateAppConfig(value) {
  return mergeObject(DEFAULT_APP_CONFIG, value);
}

export function normalizeVisualConfig(value = {}) {
  return {
    productId: String(value.productId || ""),
    productName: String(value.productName || ""),
    sapCode: String(value.sapCode || ""),
    regional: String(value.regional || ""),
    backgroundImage: String(value.backgroundImage || ""),
    backgroundScale: Math.min(2, Math.max(0.6, Number(value.backgroundScale) || 1)),
    blocks: Array.isArray(value.blocks) ? value.blocks.map((block) => ({
      blockId: String(block.blockId || block.id || ""),
      label: String(block.label || block.blockId || block.id || "Bloco"),
      x: Math.min(94, Math.max(0, Number(block.x) || 0)),
      y: Math.min(90, Math.max(0, Number(block.y) || 0)),
      scale: Math.min(1.8, Math.max(0.55, Number(block.scale) || 1)),
      columns: Array.isArray(block.columns) ? block.columns.map((column, index) => ({
        columnId: String(column.columnId || column.id || column.label || index + 1),
        label: String(column.label || column.columnId || column.id || `C${index + 1}`),
        order: Number.isFinite(Number(column.order)) ? Number(column.order) : index,
        unitIds: Array.isArray(column.unitIds) ? column.unitIds.map(String) : [],
      })) : [],
      unitOrder: Array.isArray(block.unitOrder) ? block.unitOrder.map(String) : [],
    })) : [],
  };
}


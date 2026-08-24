import { normalizeVisualConfig } from "./config.js";
import { statusTone, unitKey } from "./domain.js";

const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[char]);

const blockName = (unit) => String(unit.block || "Bloco único");
const columnName = (unit) => String(unit.stack || unit.unit?.slice(-2) || "1");
const unitIdentifier = (unit) => String(unit.pep || unit.unit || "");

function sortUnits(a, b) {
  return Number(b.floor) - Number(a.floor)
    || String(a.unit || a.pep).localeCompare(String(b.unit || b.pep), "pt-BR", { numeric: true });
}

export function syncProductVisualConfig(value, product, units = []) {
  const config = normalizeVisualConfig({
    ...value,
    productId: product?.id || value?.productId,
    productName: value?.productName || product?.name,
    sapCode: value?.sapCode || product?.code,
    regional: value?.regional || product?.regional,
  });
  const byBlock = new Map();
  units.forEach((unit) => {
    const name = blockName(unit);
    if (!byBlock.has(name)) byBlock.set(name, []);
    byBlock.get(name).push(unit);
  });
  const existingBlocks = new Map(config.blocks.map((block) => [block.blockId, block]));
  config.blocks = [...byBlock.entries()].map(([name, blockUnits], index) => {
    const existing = existingBlocks.get(name) || {};
    const byColumn = new Map();
    blockUnits.forEach((unit) => {
      const column = columnName(unit);
      if (!byColumn.has(column)) byColumn.set(column, []);
      byColumn.get(column).push(unit);
    });
    const existingColumns = new Map((existing.columns || []).map((column) => [column.columnId, column]));
    const columns = [...byColumn.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
      .map(([columnId, columnUnits], columnIndex) => {
        const saved = existingColumns.get(columnId) || {};
        const derivedIds = columnUnits.sort(sortUnits).map(unitIdentifier);
        const savedIds = (saved.unitIds || []).filter((id) => derivedIds.includes(id));
        return {
          columnId,
          label: saved.label || `C${columnId}`,
          order: Number.isFinite(Number(saved.order)) ? Number(saved.order) : columnIndex,
          unitIds: [...savedIds, ...derivedIds.filter((id) => !savedIds.includes(id))],
        };
      })
      .sort((a, b) => a.order - b.order);
    return {
      blockId: name,
      label: existing.label || name,
      x: Number.isFinite(Number(existing.x)) ? Number(existing.x) : 4 + (index % 3) * 31,
      y: Number.isFinite(Number(existing.y)) ? Number(existing.y) : 8 + Math.floor(index / 3) * 42,
      scale: Number(existing.scale) || 1,
      columns,
      unitOrder: columns.flatMap((column) => column.unitIds),
    };
  });
  return normalizeVisualConfig(config);
}

function tooltip(unit, tooltipFields) {
  const fields = [];
  if (tooltipFields.status) fields.push(`Status: ${unit.exchange ? "Permuta" : unit.status || "—"}`);
  if (tooltipFields.category) fields.push(`Categoria: ${unit.category || "—"}`);
  if (tooltipFields.area) fields.push(`Área: ${unit.area ? `${unit.area} m²` : "—"}`);
  if (tooltipFields.tablePrice) fields.push(`Tabela: R$ ${num.format(unit.tableNominal || 0)}`);
  if (tooltipFields.pricePerSquareMeter) fields.push(`R$/m²: R$ ${num.format(unit.area ? unit.tableNominal / unit.area : 0)}`);
  return fields.join(" · ");
}

function unitLabel(unit, mode) {
  if (mode === "price") return unit.area ? `${num.format(unit.tableNominal / unit.area)}/m²` : "—";
  if (mode === "status") return unit.exchange ? "Permuta" : unit.status || "—";
  return unit.unit || unit.pep;
}

function blockMarkup(block, unitsById, options) {
  const { compact, editor, selectedPep, mode, tooltipFields } = options;
  const columns = block.columns.map((column) => {
    const cells = column.unitIds.map((id) => unitsById.get(unitKey(id))).filter(Boolean).map((unit) => {
      const selected = unitKey(unit.pep) === unitKey(selectedPep);
      const special = /garden|cobertura|jun[cç][aã]o|especial/i.test(unit.category || "");
      return `<button class="visual-unit ${statusTone(unit.status, unit.exchange)}${selected ? " selected" : ""}${special ? " special" : ""}" data-unit="${escapeHtml(unit.pep)}" title="${escapeHtml(tooltip(unit, tooltipFields))}">
        <strong>${escapeHtml(unitLabel(unit, mode))}</strong>
        ${compact ? "" : `<span>${escapeHtml(unit.floor ? `${unit.floor}º andar` : unit.category || "")}</span>`}
      </button>`;
    }).join("");
    return `<div class="visual-column"><span class="visual-column-label">${escapeHtml(column.label)}</span><div class="visual-column-units">${cells}</div></div>`;
  }).join("");
  const scaleControls = editor ? `<div class="block-scale-controls" aria-label="Escala do bloco"><button type="button" data-block-scale="down" data-block-id="${escapeHtml(block.blockId)}">−</button><span>${Math.round(block.scale * 100)}%</span><button type="button" data-block-scale="up" data-block-id="${escapeHtml(block.blockId)}">+</button></div>` : "";
  return `<section class="visual-block${editor ? " draggable" : ""}" style="left:${block.x}%;top:${block.y}%;--block-scale:${block.scale}" ${editor ? `data-draggable-block="${escapeHtml(block.blockId)}"` : ""}>
    <header><strong>${escapeHtml(block.label)}</strong>${scaleControls}</header>
    <div class="visual-columns">${columns}</div>
  </section>`;
}

export function renderProductVisual(container, {
  config,
  units = [],
  compact = false,
  editor = false,
  selectedPep = "",
  mode = "unit",
  tooltipFields = { status: true, category: true, area: true, tablePrice: true, pricePerSquareMeter: true },
} = {}) {
  if (!container) return;
  const unitsById = new Map(units.map((unit) => [unitKey(unit.pep || unit.unit), unit]));
  const background = config.backgroundImage
    ? `<img class="visual-background" src="${escapeHtml(config.backgroundImage)}" alt="Implantação de ${escapeHtml(config.productName)}" style="--background-scale:${config.backgroundScale}">`
    : `<div class="visual-background-placeholder"><span>Implantação 2D</span><small>Adicione uma imagem em Configurações</small></div>`;
  const blocks = config.blocks.map((block) => blockMarkup(block, unitsById, { compact, editor, selectedPep, mode, tooltipFields })).join("");
  container.innerHTML = `<div class="visual-composition${compact ? " compact" : ""}${editor ? " editor" : ""}">
    ${background}
    <div class="visual-overlay">${blocks || '<div class="visual-no-units">Importe unidades para gerar blocos e prumadas.</div>'}</div>
  </div>`;
}


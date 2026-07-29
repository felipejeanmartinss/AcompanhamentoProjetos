import {
  compareMetrics,
  groupMetrics,
  monetaryCost,
  normalizeRecord,
} from "./domain.js";
import { parseNumber, readProposalFile } from "./importer.js";
import { clearState, loadState, saveState } from "./store.js";

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const metricDefinitions = [
  ["units", "Unidades", "number"],
  ["nominalVgv", "VGV nominal", "money"],
  ["nominalResult", "Resultado nominal", "percent"],
  ["npvResult", "Resultado a VPL", "percent"],
  ["base100NpvResult", "Base 100 a VPL", "percent"],
  ["commercialCostRate", "Comissão + prêmio", "percent"],
  ["netCommercialResult", "Resultado líquido", "percent"],
];

function recordsForProject(records) {
  if (state.selectedProject === "Todos") return records;
  return records.filter((record) => record.project === state.selectedProject);
}

function formatMetric(value, type, impact = false) {
  if (value === null || Number.isNaN(value)) return "—";
  if (type === "money") return `${impact && value > 0 ? "+" : ""}${money.format(value)}`;
  if (type === "percent") return `${impact && value > 0 ? "+" : ""}${percent.format(value)}`;
  return `${impact && value > 0 ? "+" : ""}${Math.round(value)}`;
}

function tone(value) {
  if (value === null || Math.abs(value) < 0.00001) return "";
  return value > 0 ? "positive" : "negative";
}

function renderMetrics() {
  const comparison = compareMetrics(
    recordsForProject(state.realized),
    recordsForProject(state.simulations.filter((item) => item.active)),
  );
  const cells = [
    '<div class="metric-head">Indicador</div>',
    '<div class="metric-head">Realizado</div>',
    '<div class="metric-head">Pro forma</div>',
    '<div class="metric-head">Impacto</div>',
  ];
  for (const [key, label, type] of metricDefinitions) {
    cells.push(`<div class="metric-label">${label}</div>`);
    cells.push(`<div class="metric-cell">${formatMetric(comparison.realized[key], type)}</div>`);
    cells.push(`<div class="metric-cell">${formatMetric(comparison.proForma[key], type)}</div>`);
    cells.push(
      `<div class="metric-cell ${tone(comparison.impact[key])}">${formatMetric(comparison.impact[key], type, true)}</div>`,
    );
  }
  $("#metrics").innerHTML = cells.join("");
}

function renderProjects() {
  const projects = [...new Set([...state.realized, ...state.simulations].map((row) => row.project))]
    .filter(Boolean)
    .sort();
  const filter = $("#project-filter");
  filter.innerHTML = [
    '<option value="Todos">Todos os empreendimentos</option>',
    ...projects.map((project) =>
      `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`),
  ].join("");
  filter.value = projects.includes(state.selectedProject) ? state.selectedProject : "Todos";
  state.selectedProject = filter.value;
}

function activeRecordsForProject(records) {
  return recordsForProject(records).map(normalizeRecord).filter((record) => record.active);
}

function renderProductOverview() {
  const products = groupMetrics(state.realized, "project");
  const grid = $("#product-grid");
  if (!products.length) {
    grid.innerHTML = `
      <div class="product-empty">
        Importe uma base para visualizar o resumo das vendas ativas por produto.
      </div>
    `;
    return;
  }
  grid.innerHTML = products.map((product) => `
    <button
      class="product-card ${state.selectedProject === product.label ? "selected" : ""}"
      type="button"
      data-project="${escapeHtml(product.label)}"
      aria-pressed="${state.selectedProject === product.label}"
    >
      <div class="product-card-head">
        <h3>${escapeHtml(product.label)}</h3>
        <span class="open-label">Abrir resultado →</span>
      </div>
      <div class="product-kpis">
        <div class="product-kpi">
          <span>Vendas ativas</span>
          <strong>${product.units}</strong>
        </div>
        <div class="product-kpi">
          <span>VGV vendido</span>
          <strong>${money.format(product.nominalVgv)}</strong>
        </div>
        <div class="product-kpi">
          <span>Resultado VPL</span>
          <strong class="${tone(product.npvResult)}">${formatMetric(product.npvResult, "percent")}</strong>
        </div>
        <div class="product-kpi">
          <span>Resultado líquido</span>
          <strong class="${tone(product.netCommercialResult)}">${formatMetric(product.netCommercialResult, "percent")}</strong>
        </div>
      </div>
    </button>
  `).join("");
}

function renderChannels() {
  const rows = groupMetrics(
    activeRecordsForProject(state.realized),
    "channel",
  );
  if (!rows.length) {
    $("#channel-analysis").className = "channel-list empty-state";
    $("#channel-analysis").textContent = "Importe uma base para visualizar os canais.";
    return;
  }
  const max = Math.max(...rows.map((row) => row.nominalVgv), 1);
  $("#channel-analysis").className = "channel-list";
  $("#channel-analysis").innerHTML = rows.slice(0, 7).map((row) => `
    <div class="channel-row">
      <div class="channel-label">
        <strong>${escapeHtml(row.label)}</strong>
        <span>${row.units} un. · ${money.format(row.nominalVgv)}</span>
      </div>
      <div class="bar-track"><div class="bar" style="width:${Math.max(4, row.nominalVgv / max * 100)}%"></div></div>
      <div class="channel-result ${tone(row.npvResult)}">${formatMetric(row.npvResult, "percent")}</div>
    </div>
  `).join("");
}

function renderQuality() {
  const rows = activeRecordsForProject(state.realized);
  const missingUnit = rows.filter((row) => !row.unit).length;
  const missingNpvReference = rows.filter((row) => !row.referenceNpv).length;
  $("#quality-panel").innerHTML = `
    <div><span>Vendas ativas</span><strong>${rows.length}</strong></div>
    <div><span>Unidades sem identificação</span><strong>${missingUnit}</strong></div>
    <div><span>Registros sem referência VPL</span><strong>${missingNpvReference}</strong></div>
  `;
}

function renderSimulations() {
  const rows = recordsForProject(state.simulations);
  $("#active-simulations").textContent =
    `${rows.filter((item) => item.active).length} simulações ativas`;
  if (!rows.length) {
    $("#simulation-table").innerHTML =
      '<tr class="empty-row"><td colspan="7">Adicione uma proposta para calcular o impacto pro forma.</td></tr>';
    return;
  }
  $("#simulation-table").innerHTML = rows.map((row) => {
    const npvResult = row.referenceNpv ? row.proposalNpv / row.referenceNpv - 1 : null;
    const cost =
      monetaryCost(row, "commissionValue", "commissionRate") + row.bonusValue;
    return `
      <tr>
        <td><strong>${escapeHtml(row.id)}</strong><span>${escapeHtml(row.channel)}</span></td>
        <td><strong>${escapeHtml(row.project)}</strong><span>${escapeHtml(row.unit)}</span></td>
        <td>${fullMoney.format(row.proposalNominal)}</td>
        <td class="${tone(npvResult)}">${formatMetric(npvResult, "percent")}</td>
        <td>${fullMoney.format(cost)}</td>
        <td><input class="switch" type="checkbox" data-toggle="${escapeHtml(row.id)}" ${row.active ? "checked" : ""} aria-label="Ativar simulação ${escapeHtml(row.id)}"></td>
        <td><button class="remove" data-remove="${escapeHtml(row.id)}">Remover</button></td>
      </tr>
    `;
  }).join("");
}

function renderFreshness() {
  const label = $("#last-import");
  const dot = $(".status-dot");
  if (!state.lastImport) {
    label.textContent = "Nenhuma base importada";
    dot.classList.remove("loaded");
    return;
  }
  label.textContent = `Base atualizada em ${new Date(state.lastImport).toLocaleString("pt-BR")}`;
  dot.classList.add("loaded");
}

function render() {
  renderProjects();
  renderProductOverview();
  renderMetrics();
  $("#comparison-context").textContent =
    `${state.selectedProject === "Todos" ? "Todos os produtos" : state.selectedProject} · Realizado x Pro forma`;
  renderChannels();
  renderQuality();
  renderSimulations();
  renderFreshness();
  saveState(state);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2600);
}

$("#open-import").addEventListener("click", () => $("#import-dialog").showModal());
$("#open-simulation").addEventListener("click", () => $("#simulation-dialog").showModal());

$("#project-filter").addEventListener("change", (event) => {
  state.selectedProject = event.target.value;
  render();
});

$("#product-grid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-project]");
  if (!card) return;
  state.selectedProject = card.dataset.project;
  render();
  $("#comparison-title").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#import-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = $("#import-feedback");
  const file = $("#proposal-file").files[0];
  if (!file) return;
  feedback.hidden = false;
  feedback.className = "feedback";
  feedback.textContent = "Lendo e conciliando a base…";
  try {
    const result = await readProposalFile(file);
    if (!result.records.length) throw new Error("Nenhuma proposta válida foi encontrada.");
    state.realized = $("#replace-import").checked
      ? result.records
      : [...state.realized, ...result.records];
    state.lastImport = new Date().toISOString();
    feedback.innerHTML = `
      <strong>${result.records.length} propostas processadas.</strong>
      ${result.warnings.length ? `<br>${result.warnings.map(escapeHtml).join("<br>")}` : ""}
    `;
    render();
    window.setTimeout(() => {
      $("#import-dialog").close();
      $("#import-form").reset();
      feedback.hidden = true;
      toast("Base realizada atualizada.");
    }, 900);
  } catch (error) {
    feedback.className = "feedback error";
    feedback.textContent = error.message;
  }
});

$("#simulation-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") return;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const commissionRate = parseNumber(data.commissionRate);
  const budgetCommissionRate = parseNumber(data.budgetCommissionRate);
  const record = normalizeRecord({
    ...data,
    source: "simulation",
    status: "Simulação",
    scenario: "Pro forma",
    referenceNominal: parseNumber(data.referenceNominal),
    proposalNominal: parseNumber(data.proposalNominal),
    referenceNpv: parseNumber(data.referenceNpv),
    proposalNpv: parseNumber(data.proposalNpv),
    commissionRate: commissionRate > 1 ? commissionRate / 100 : commissionRate,
    bonusValue: parseNumber(data.bonusValue),
    budgetCommissionRate:
      budgetCommissionRate > 1 ? budgetCommissionRate / 100 : budgetCommissionRate,
    budgetBonusValue: parseNumber(data.budgetBonusValue),
  });
  state.simulations = [...state.simulations.filter((item) => item.id !== record.id), record];
  event.currentTarget.reset();
  $("#simulation-dialog").close();
  render();
  toast("Proposta adicionada ao cenário pro forma.");
});

$("#simulation-table").addEventListener("change", (event) => {
  const id = event.target.dataset.toggle;
  if (!id) return;
  state.simulations = state.simulations.map((item) =>
    item.id === id ? { ...item, active: event.target.checked } : item);
  render();
});

$("#simulation-table").addEventListener("click", (event) => {
  const id = event.target.dataset.remove;
  if (!id) return;
  state.simulations = state.simulations.filter((item) => item.id !== id);
  render();
  toast("Simulação removida.");
});

$("#clear-data").addEventListener("click", () => {
  if (!window.confirm("Remover a base importada e todas as simulações deste navegador?")) return;
  state = clearState();
  render();
  toast("Dados locais removidos.");
});

render();

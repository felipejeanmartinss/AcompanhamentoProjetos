import { calculateMetrics, calculationLine, compareMetrics, dateParts, monthlySummary, projectPortfolio, statusTone, unitKey } from "./domain.js";
import { parseNumber, readDatasetFile, reconcile } from "./importer.js";
import { clearState, loadState, saveState } from "./store.js";
import { renderProductVisual, syncProductVisualConfig } from "./visual.js";

let state = reconcile(loadState());
let pendingImport = "";
let settingsPane = "general";
let visualProductId = "";
let availabilityMode = state.appConfig.availability.defaultMode;
let activeVisualDrag = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL", notation:"compact", maximumFractionDigits:1 });
const fullMoney = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL", maximumFractionDigits:0 });
const pct = new Intl.NumberFormat("pt-BR", { style:"percent", minimumFractionDigits:1, maximumFractionDigits:1 });
const num = new Intl.NumberFormat("pt-BR");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char]);
const fmtPct = (value) => value == null || !Number.isFinite(value) ? "—" : pct.format(value);
const tone = (value) => value == null ? "" : value < -0.00001 ? "negative" : value > 0.00001 ? "positive" : "";
const products = () => projectPortfolio(state);
const currentId = () => state.selectedProject || products()[0]?.id || "";
const currentProduct = () => products().find((product) => product.id === currentId());
const projectRows = (rows, id = currentId()) => id ? rows.filter((row) => (row.projectCode || row.project) === id) : rows;
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

const views = {
  portfolio:["Visão comercial", "Carteira de produtos"],
  summary:["Dashboard executivo", "Resumo"],
  detail:["Produto selecionado", "Disponibilidade"],
  history:["Auditoria", "Histórico analítico"],
  simulator:["Decisão comercial", "Simulação de proposta"],
  settings:["Administração", "Configurações"],
};

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2600);
}

function showView(view) {
  state.view = view;
  $$(".view").forEach((element) => element.classList.toggle("active", element.id === `view-${view}`));
  $$(".nav-item").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  $("#breadcrumb").textContent = views[view][0];
  $("#page-title").textContent = views[view][1];
  render();
  window.scrollTo({ top:0, behavior:"smooth" });
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((item, key) => item[key], object);
  target[last] = value;
}

function projectUnits(id = currentId()) {
  return projectRows(state.units, id);
}

function getVisualConfig(id = currentId()) {
  const product = products().find((item) => item.id === id);
  if (!product) return null;
  const config = syncProductVisualConfig(state.productVisualConfigs[id], product, projectUnits(id));
  state.productVisualConfigs[id] = config;
  return config;
}

function renderProjectSelect() {
  const list = products();
  const select = $("#project-select");
  select.innerHTML = '<option value="">Todos os produtos</option>' + list.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join("");
  select.value = state.selectedProject;
}

function renderPortfolio() {
  const list = products();
  const sort = $("#portfolio-sort").value;
  list.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "sales" ? b.metrics.units - a.metrics.units : sort === "result" ? (b.metrics.realNpvResult ?? -99) - (a.metrics.realNpvResult ?? -99) : sort === "target" ? (b.targetAchievement ?? -1) - (a.targetAchievement ?? -1) : b.metrics.nominalVgv - a.metrics.nominalVgv);
  $("#portfolio-count").textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
  $("#product-grid").innerHTML = list.length ? list.map((product) => `
    <button class="product-card" data-open-project="${escapeHtml(product.id)}">
      <div class="card-head"><div><span class="product-code">${escapeHtml(product.code || "PRODUTO")}</span><h3>${escapeHtml(product.name)}</h3></div><span class="arrow">→</span></div>
      <div class="sales-line"><strong>${num.format(product.metrics.units)}</strong> vendas <span>de ${num.format(product.totalUnits || 0)} unidades</span></div>
      <div class="progress"><i style="width:${Math.min(100, product.totalUnits ? product.metrics.units / product.totalUnits * 100 : 0)}%"></i></div>
      <div class="card-kpis"><div><span>VGV vendido</span><strong>${money.format(product.metrics.nominalVgv)}</strong></div><div><span>Real VPL</span><strong class="${tone(product.metrics.realNpvResult)}">${fmtPct(product.metrics.realNpvResult)}</strong></div><div><span>Estoque</span><strong>${num.format(product.available)}</strong></div><div><span>Atingimento BP</span><strong>${fmtPct(product.targetAchievement)}</strong></div></div>
    </button>`).join("") : '<div class="empty-card">Importe as bases em Configurações para visualizar a carteira.</div>';
}

function kpi(label, value, detail = "", className = "") {
  return `<div class="kpi"><span>${label}</span><strong class="${className}">${value}</strong><small>${detail}</small></div>`;
}

function availableYears() {
  const years = new Set();
  [...state.proposals.map((row) => row.accountingDate), ...state.targets.map((row) => row.month)].forEach((value) => {
    const parts = dateParts(value);
    if (parts?.year) years.add(parts.year);
  });
  if (!years.size) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => a - b);
}

function summaryYear() {
  const years = availableYears();
  const select = $("#summary-year");
  const previous = Number(select.value);
  select.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  select.value = years.includes(previous) ? String(previous) : String(years.at(-1));
  return Number(select.value);
}

function renderSummaryChart(months) {
  const config = state.appConfig.summary.chart;
  const svg = $("#summary-chart");
  const width = 1120, height = 390;
  const margin = { top:24, right:72, bottom:48, left:52 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxPositive = Math.max(1, ...months.flatMap((month) => [config.showSales ? month.salesUnits : 0, config.showBP ? month.bpUnits : 0]));
  const maxCancellation = config.showCancellations ? Math.max(0, ...months.map((month) => month.cancellations)) : 0;
  const minUnits = maxCancellation ? -Math.max(1, maxCancellation * 1.35) : 0;
  const maxUnits = Math.max(1, maxPositive * 1.18);
  const unitRange = maxUnits - minUnits;
  const unitY = (value) => margin.top + (maxUnits - value) / unitRange * chartHeight;
  const zeroY = unitY(0);
  const priceValues = months.flatMap((month) => [config.showNominalPrice ? month.nominalPrice : 0, config.showCorrectedPrice ? month.correctedPrice : 0]);
  const maxPrice = Math.max(1, ...priceValues) * 1.12;
  const priceY = (value) => margin.top + (maxPrice - value) / maxPrice * chartHeight;
  const slot = chartWidth / 12;
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const parts = [];
  for (let index = 0; index <= 5; index += 1) {
    const value = minUnits + unitRange * index / 5;
    const y = unitY(value);
    parts.push(`<line class="chart-gridline" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line><text class="chart-label" x="${margin.left - 8}" y="${y + 3}" text-anchor="end">${Math.round(value)}</text>`);
  }
  parts.push(`<line class="chart-zero" x1="${margin.left}" x2="${width - margin.right}" y1="${zeroY}" y2="${zeroY}"></line>`);
  months.forEach((month, index) => {
    const center = margin.left + slot * (index + 0.5);
    const bars = [
      { show:config.showSales, value:month.salesUnits, x:center - 18, color:config.salesColor, label:month.salesUnits },
      { show:config.showBP, value:month.bpUnits, x:center - 3, color:config.bpColor, label:month.bpUnits },
      { show:config.showCancellations, value:-month.cancellations, x:center + 12, color:config.cancellationsColor, label:month.cancellations ? `-${month.cancellations}` : "" },
    ];
    bars.forEach((bar) => {
      if (!bar.show || !bar.value) return;
      const y = bar.value >= 0 ? unitY(bar.value) : zeroY;
      const barHeight = Math.abs(unitY(bar.value) - zeroY);
      parts.push(`<rect x="${bar.x}" y="${y}" width="11" height="${barHeight}" rx="3" fill="${bar.color}"></rect><text class="chart-value" x="${bar.x + 5.5}" y="${bar.value >= 0 ? y - 5 : y + barHeight + 12}" text-anchor="middle" fill="${bar.color}">${bar.label}</text>`);
    });
    if (config.showNominalPrice && month.nominalPrice) parts.push(`<circle cx="${center - 5}" cy="${priceY(month.nominalPrice)}" r="5" fill="${config.nominalPriceColor}" stroke="#fff" stroke-width="2"></circle>`);
    if (config.showCorrectedPrice && month.correctedPrice) parts.push(`<circle cx="${center + 5}" cy="${priceY(month.correctedPrice)}" r="5" fill="${config.correctedPriceColor}" stroke="#fff" stroke-width="2"></circle>`);
    parts.push(`<text class="chart-label" x="${center}" y="${height - 18}" text-anchor="middle">${monthNames[index]}</text>`);
  });
  for (let index = 0; index <= 4; index += 1) {
    const value = maxPrice * index / 4;
    const y = priceY(value);
    parts.push(`<text class="chart-label" x="${width - margin.right + 9}" y="${y + 3}">R$ ${Math.round(value / 1000)}k</text>`);
  }
  parts.push(`<text class="chart-axis-title" x="${margin.left}" y="12">UNIDADES</text><text class="chart-axis-title" x="${width - margin.right}" y="12" text-anchor="end">PREÇO / M²</text>`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = parts.join("");
  const legends = [
    [config.showSales, "Vendas", config.salesColor, "bar"], [config.showBP, "BP", config.bpColor, "bar"], [config.showCancellations, "Cancelamentos", config.cancellationsColor, "bar"],
    [config.showNominalPrice, "R$/m² nominal", config.nominalPriceColor, "point"], [config.showCorrectedPrice, "R$/m² corrigido", config.correctedPriceColor, "point"],
  ];
  $("#summary-legend").innerHTML = legends.filter(([show]) => show).map(([, label, color, type]) => `<span class="legend-item"><i class="legend-swatch ${type}" style="background:${color}"></i>${label}</span>`).join("");
}

function renderSummary() {
  const product = currentProduct();
  const year = summaryYear();
  if (!product) {
    $("#summary-title").textContent = "Resumo do produto";
    $("#summary-kpis").innerHTML = '<div class="empty-card">Importe produtos para visualizar o Resumo.</div>';
    $("#summary-chart").innerHTML = "";
    $("#summary-legend").innerHTML = "";
    $("#summary-analytic-body").innerHTML = "";
    return;
  }
  $("#summary-title").textContent = `${product.name} — Resumo`;
  const proposals = projectRows(state.proposals);
  const targets = projectRows(state.targets);
  const months = monthlySummary(proposals, targets, year);
  const salesUnits = sum(months, "salesUnits"), targetUnits = sum(months, "bpUnits"), cancellations = sum(months, "cancellations");
  const salesVgv = sum(months, "salesVgv"), targetVgv = sum(months, "bpVgv"), soldArea = sum(months, "soldArea"), correctedVgv = sum(months, "correctedVgv");
  const kpiConfig = state.appConfig.summary.kpis;
  const definitions = [
    ["salesUnits", "Vendas no ano", num.format(salesUnits), "unidades ativas", ""],
    ["targetUnits", "BP unidades", num.format(targetUnits), "meta acumulada", ""],
    ["unitAchievement", "% unidades", fmtPct(targetUnits ? salesUnits / targetUnits - 1 : null), "Real x BP", tone(targetUnits ? salesUnits / targetUnits - 1 : null)],
    ["cancellations", "Cancelamentos", num.format(cancellations), "abaixo do eixo no gráfico", cancellations ? "negative" : ""],
    ["salesVgv", "VGV vendido", money.format(salesVgv), "nominal", ""],
    ["targetVgv", "BP VGV", money.format(targetVgv), "meta nominal", ""],
    ["vgvAchievement", "% VGV", fmtPct(targetVgv ? salesVgv / targetVgv - 1 : null), "Real x BP", tone(targetVgv ? salesVgv / targetVgv - 1 : null)],
    ["averagePrice", "Preço médio / m²", soldArea ? `R$ ${num.format(salesVgv / soldArea)}` : "—", soldArea ? `Corrigido: R$ ${num.format(correctedVgv / soldArea)}` : "sem área conciliada", ""],
  ];
  $("#summary-kpis").innerHTML = definitions.filter(([key]) => kpiConfig[key]).map(([, label, value, detail, className]) => kpi(label, value, detail, className)).join("");
  renderSummaryChart(months);
  const rows = proposals.map(calculationLine).sort((a, b) => String(b.accountingDate).localeCompare(String(a.accountingDate))).slice(0, 8);
  $("#summary-analytic-body").innerHTML = rows.length ? rows.map((row) => `<tr class="${row.active ? "" : "inactive"}"><td>${escapeHtml(row.id)}</td><td>${escapeHtml(`${row.block} ${row.unit || row.pep}`)}</td><td>${escapeHtml(row.accountingDate || "—")}</td><td>${fullMoney.format(row.proposalNominal)}</td><td>${row.area ? `R$ ${num.format(row.proposalNominal / row.area)}` : "—"}</td><td>${row.area ? `R$ ${num.format(row.correctedProposalNominal / row.area)}` : "—"}</td><td>${escapeHtml(row.proposalStatus)}</td></tr>`).join("") : '<tr><td colspan="7" class="empty-cell">Nenhuma movimentação no produto.</td></tr>';
  $("#summary-analytic-panel").hidden = !state.appConfig.summary.showAnalytic;
}

function renderCategorySummary(units, proposals) {
  const config = state.appConfig.availability.categoryFields;
  const fields = [["stock", "Estoque atual"], ["totalSales", "Vendas totais"], ["yearSales", "Vendas no ano"], ["monthSales", "Vendas no mês"]].filter(([key]) => config[key]);
  $("#category-summary-head").innerHTML = `<tr><th>Categoria</th>${fields.map(([, label]) => `<th>${label}</th>`).join("")}</tr>`;
  const categories = [...new Set(units.map((unit) => unit.category || "Sem categoria"))];
  const year = Number($("#summary-year").value) || new Date().getFullYear();
  const latestMonth = Math.max(1, ...proposals.map((proposal) => dateParts(proposal.accountingDate)).filter((parts) => parts?.year === year).map((parts) => parts.month));
  $("#category-summary-body").innerHTML = categories.length ? categories.map((category) => {
    const categoryUnits = units.filter((unit) => (unit.category || "Sem categoria") === category);
    const sales = proposals.map(calculationLine).filter((proposal) => proposal.active && proposal.category === category);
    const values = {
      stock:categoryUnits.filter((unit) => statusTone(unit.status, unit.exchange) === "available").length,
      totalSales:sales.length,
      yearSales:sales.filter((proposal) => dateParts(proposal.accountingDate)?.year === year).length,
      monthSales:sales.filter((proposal) => { const parts = dateParts(proposal.accountingDate); return parts?.year === year && parts.month === latestMonth; }).length,
    };
    return `<tr><td>${escapeHtml(category)}</td>${fields.map(([key]) => `<td>${num.format(values[key])}</td>`).join("")}</tr>`;
  }).join("") : '<tr><td class="empty-cell">Nenhuma categoria conciliada.</td></tr>';
}

function renderDetail() {
  const product = currentProduct();
  const availability = $("#availability-visual");
  if (!product) {
    $("#project-header").className = "project-header empty-card";
    $("#project-header").textContent = "Selecione um produto na carteira.";
    $("#project-kpis").innerHTML = "";
    availability.innerHTML = "";
    renderCategorySummary([], []);
    return;
  }
  const visualConfig = getVisualConfig(product.id);
  $("#project-header").className = "project-header";
  $("#project-header").innerHTML = `<div><p class="eyebrow">${escapeHtml(visualConfig.sapCode || product.code)}</p><h2>${escapeHtml(visualConfig.productName || product.name)}</h2></div><div class="project-facts"><span>Regional <strong>${escapeHtml(visualConfig.regional || "—")}</strong></span><span>Lançamento <strong>${escapeHtml(product.launchDate || "—")}</strong></span><span>Entrega <strong>${escapeHtml(product.deliveryDate || "—")}</strong></span><span>VSO <strong>${fmtPct(product.totalUnits ? product.metrics.units / product.totalUnits : null)}</strong></span></div>`;
  $("#project-kpis").innerHTML = [
    kpi("Vendas", num.format(product.metrics.units), `de ${product.totalUnits || 0} unidades`),
    kpi("VGV vendido", money.format(product.metrics.nominalVgv), "vendas ativas"),
    kpi("Resultado nominal", fmtPct(product.metrics.nominalResult), "versus BP", tone(product.metrics.nominalResult)),
    kpi("Resultado real", fmtPct(product.metrics.realNominalResult), "líquido de custos", tone(product.metrics.realNominalResult)),
    kpi("Resultado real VPL", fmtPct(product.metrics.realNpvResult), "indicador principal", tone(product.metrics.realNpvResult)),
    kpi("Disponíveis", num.format(product.available), "estoque atual"),
  ].join("");
  const units = projectUnits();
  renderProductVisual(availability, { config:visualConfig, units, mode:availabilityMode, tooltipFields:state.appConfig.availability.tooltipFields });
  $$("[data-availability-mode]").forEach((button) => button.classList.toggle("active", button.dataset.availabilityMode === availabilityMode));
  renderCategorySummary(units, projectRows(state.proposals));
}

function renderUnitDetail(pep) {
  const unit = state.units.find((item) => unitKey(item.pep) === unitKey(pep));
  if (!unit) return;
  $("#unit-detail").innerHTML = `<p class="eyebrow">${escapeHtml(unit.block || "Unidade")}</p><h2>${escapeHtml(unit.unit || unit.pep)}</h2><span class="status-pill ${statusTone(unit.status, unit.exchange)}">${escapeHtml(unit.exchange ? "Permuta" : unit.status)}</span><dl><div><dt>PEP</dt><dd>${escapeHtml(unit.pep)}</dd></div><div><dt>Categoria</dt><dd>${escapeHtml(unit.category)}</dd></div><div><dt>Área</dt><dd>${unit.area ? `${num.format(unit.area)} m²` : "—"}</dd></div><div><dt>Tabela</dt><dd>${fullMoney.format(unit.tableNominal)}</dd></div><div><dt>BP nominal</dt><dd>${fullMoney.format(unit.tableNominal * (1 - unit.gorduraRate))}</dd></div><div><dt>Base 100</dt><dd>1,000</dd></div></dl><button class="button accent" data-simulate-unit="${escapeHtml(unit.pep)}" ${statusTone(unit.status, unit.exchange) !== "available" ? "disabled" : ""}>Simular esta unidade</button>`;
}

function filteredHistory() {
  const search = $("#history-search").value.toLowerCase(), status = $("#history-status").value, category = $("#history-category").value, result = $("#history-result").value;
  return projectRows(state.proposals).map(calculationLine).filter((row) => {
    const haystack = `${row.id} ${row.unit} ${row.pep} ${row.channel}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!status || row.proposalStatus === status) && (!category || row.category === category) && (!result || (result === "negative" ? row.realNpvResult < 0 : row.realNpvResult >= 0));
  });
}

function renderHistory() {
  const all = projectRows(state.proposals).map(calculationLine);
  const statuses = [...new Set(all.map((row) => row.proposalStatus).filter(Boolean))], categories = [...new Set(all.map((row) => row.category).filter(Boolean))];
  const status = $("#history-status"), category = $("#history-category"), statusValue = status.value, categoryValue = category.value;
  status.innerHTML = '<option value="">Todos os status</option>' + statuses.map((value) => `<option>${escapeHtml(value)}</option>`).join(""); status.value = statusValue;
  category.innerHTML = '<option value="">Todas as categorias</option>' + categories.map((value) => `<option>${escapeHtml(value)}</option>`).join(""); category.value = categoryValue;
  const rows = filteredHistory();
  $("#history-table").innerHTML = rows.length ? rows.map((row) => `<tr class="${row.active ? "" : "inactive"}"><td><strong>${escapeHtml(row.id)}</strong><small>${escapeHtml(row.channel)}</small></td><td>${escapeHtml(row.block)} ${escapeHtml(row.unit || row.pep)}<small>${escapeHtml(row.category)}</small></td><td>${escapeHtml(row.accountingDate || "—")}</td><td>${fullMoney.format(row.tableNominal)}</td><td>${fullMoney.format(row.referenceNominal)}</td><td>${fullMoney.format(row.proposalNominal)}</td><td>${fullMoney.format(row.proposalNpv)}</td><td>${fullMoney.format(row.commercialCost)}</td><td class="${tone(row.nominalResult)}">${fmtPct(row.nominalResult)}</td><td class="${tone(row.realNominalResult)}">${fmtPct(row.realNominalResult)}</td><td class="${tone(row.realNpvResult)}">${fmtPct(row.realNpvResult)}</td></tr>`).join("") : '<tr><td colspan="11" class="empty-cell">Nenhum registro encontrado.</td></tr>';
}

const metricDefs = [["units", "Unidades", "number"], ["nominalVgv", "VGV nominal", "money"], ["nominalResult", "Resultado nominal", "pct"], ["realNominalResult", "Resultado real", "pct"], ["realNpvResult", "Resultado real VPL", "pct"], ["commercialCostRate", "Comissão + prêmio", "pct"]];

function simulationDraft() {
  const form = $("#simulation-form");
  const data = Object.fromEntries(new FormData(form));
  const unit = state.units.find((item) => unitKey(item.pep) === unitKey(data.pep));
  if (!unit) return null;
  let commissionRate = parseNumber(data.commissionRate); if (commissionRate > 1) commissionRate /= 100;
  return { unit, data, proposalNominal:parseNumber(data.proposalNominal) || unit.tableNominal, proposalNpv:parseNumber(data.proposalNpv) || unit.tableNpv || unit.tableNominal, commissionRate, bonusValue:parseNumber(data.bonusValue) };
}

function renderSimulationDefense() {
  const draft = simulationDraft();
  const config = state.appConfig.simulation;
  $("#defense-summary-section").hidden = !config.showProposalSummary;
  $("#defense-flow-section").hidden = !config.showFlowComparison;
  $("#defense-visual-section").hidden = !config.showVisualAvailability;
  $("#defense-sales-section").hidden = !config.showSimilarSales;
  if (!draft) {
    $("#defense-title").textContent = "Resumo da proposta";
    $("#defense-summary").innerHTML = '<div class="empty-card">Selecione uma unidade para montar a defesa.</div>';
    $("#defense-flow").innerHTML = "";
    $("#simulation-visual").innerHTML = "";
    $("#similar-sales-body").innerHTML = "";
    $("#simulation-reference").innerHTML = "";
    return;
  }
  const { unit, data, proposalNominal, proposalNpv, commissionRate, bonusValue } = draft;
  const product = currentProduct();
  const referenceNominal = unit.tableNominal * (1 - unit.gorduraRate);
  const referenceNpv = (unit.tableNpv || unit.tableNominal) * (1 - unit.gorduraRate);
  $("#defense-title").textContent = `${product?.name || unit.project} · ${unit.block} ${unit.unit || unit.pep}`;
  $("#simulation-reference").innerHTML = [["Bloco", unit.block || "—"], ["Unidade", unit.unit || unit.pep], ["Categoria", unit.category || "—"]].map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const metrics = [["PEP", unit.pep], ["Área", unit.area ? `${num.format(unit.area)} m²` : "—"], ["BP nominal", fullMoney.format(referenceNominal)], ["Proposta", fullMoney.format(proposalNominal)], ["Proposta VPL", fullMoney.format(proposalNpv)], ["Comissão + prêmio", `${fmtPct(commissionRate)} + ${fullMoney.format(bonusValue)}`]];
  $("#defense-summary").innerHTML = metrics.map(([label, value]) => `<div class="defense-metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const flowRows = [["Tabela nominal", unit.tableNominal, proposalNominal], ["BP nominal", referenceNominal, proposalNominal], ["BP VPL", referenceNpv, proposalNpv]];
  $("#defense-flow").innerHTML = flowRows.map(([label, reference, proposal]) => `<tr><td>${label}</td><td>${fullMoney.format(reference)}</td><td>${fullMoney.format(proposal)}</td><td class="${tone(proposal / reference - 1)}">${fullMoney.format(proposal - reference)}</td></tr>`).join("");
  const visualConfig = getVisualConfig(currentId());
  renderProductVisual($("#simulation-visual"), { config:visualConfig, units:projectUnits(), compact:true, selectedPep:unit.pep, mode:"unit", tooltipFields:state.appConfig.availability.tooltipFields });
  const similar = projectRows(state.proposals).map(calculationLine).filter((proposal) => proposal.active && proposal.pep !== unit.pep && (proposal.category === unit.category || proposal.stack === unit.stack)).sort((a, b) => String(b.accountingDate).localeCompare(String(a.accountingDate))).slice(0, config.similarSalesLimit);
  $("#similar-sales-body").innerHTML = similar.length ? similar.map((proposal) => `<tr><td>${escapeHtml(`${proposal.block} ${proposal.unit || proposal.pep}`)}</td><td>${escapeHtml(proposal.accountingDate || "—")}</td><td>${fullMoney.format(proposal.proposalNominal)}</td><td>${proposal.area ? `R$ ${num.format(proposal.proposalNominal / proposal.area)}` : "—"}</td></tr>`).join("") : '<tr><td colspan="4" class="empty-cell">Sem vendas similares conciliadas.</td></tr>';
  void data;
}

function renderSimulator() {
  const units = projectUnits().filter((unit) => statusTone(unit.status, unit.exchange) === "available");
  const select = $("#simulation-unit"), current = select.value;
  select.innerHTML = '<option value="">Selecione uma unidade disponível</option>' + units.map((unit) => `<option value="${escapeHtml(unit.pep)}">${escapeHtml(unit.block)} ${escapeHtml(unit.unit || unit.pep)} · ${escapeHtml(unit.category)}</option>`).join("");
  select.value = units.some((unit) => unit.pep === current) ? current : "";
  const simulations = projectRows(state.simulations), comparison = compareMetrics(projectRows(state.proposals), simulations);
  $("#simulation-count").textContent = `${simulations.filter((simulation) => simulation.active).length} propostas ativas`;
  $("#comparison").innerHTML = '<div class="comparison-row head"><span>Indicador</span><span>Realizado</span><span>Pro forma</span><span>Impacto</span></div>' + metricDefs.map(([key, label, type]) => {
    const format = (value) => type === "money" ? money.format(value) : type === "pct" ? fmtPct(value) : num.format(value);
    const impact = comparison.impact[key];
    return `<div class="comparison-row"><span>${label}</span><strong>${format(comparison.realized[key])}</strong><strong>${format(comparison.proForma[key])}</strong><strong class="${tone(impact)}">${impact != null && impact > 0 ? "+" : ""}${format(impact)}</strong></div>`;
  }).join("");
  $("#simulation-list").innerHTML = simulations.length ? simulations.map((simulation) => { const line = calculationLine(simulation); return `<div class="simulation-item"><div><strong>${escapeHtml(simulation.id)}</strong><span>${escapeHtml(simulation.unit || simulation.pep)} · ${escapeHtml(simulation.channel)}</span></div><div><strong class="${tone(line.realNpvResult)}">${fmtPct(line.realNpvResult)}</strong><span>${money.format(simulation.proposalNominal)}</span></div><label class="switch"><input type="checkbox" data-toggle-sim="${escapeHtml(simulation.id)}" ${simulation.active ? "checked" : ""}><i></i></label><button title="Compartilhar defesa" data-share="${escapeHtml(simulation.id)}">↗</button><button title="Remover" data-remove-sim="${escapeHtml(simulation.id)}">×</button></div>`; }).join("") : '<div class="empty-card">Nenhuma proposta adicionada ao cenário.</div>';
  renderSimulationDefense();
}

const importCards = [["proposals", "Base Geral de Propostas", "Histórico financeiro e comercial"], ["units", "Tabela Vigente & Disponibilidade", "Cadastro, preço e status das unidades"], ["projects", "De/Para", "Código SAP, nome comercial e datas"], ["targets", "BP", "Metas mensais de unidades e VGV"], ["categories", "Categorias", "Tipologia e classificação por PEP"]];
const seriesSettings = [["Vendas", "showSales", "salesColor"], ["BP", "showBP", "bpColor"], ["Cancelamentos", "showCancellations", "cancellationsColor"], ["R$/m² nominal", "showNominalPrice", "nominalPriceColor"], ["R$/m² corrigido", "showCorrectedPrice", "correctedPriceColor"]];
const kpiSettings = [["salesUnits", "Vendas no ano"], ["targetUnits", "BP unidades"], ["unitAchievement", "% unidades"], ["cancellations", "Cancelamentos"], ["salesVgv", "VGV vendido"], ["targetVgv", "BP VGV"], ["vgvAchievement", "% VGV"], ["averagePrice", "Preço médio / m²"]];
const tooltipSettings = [["status", "Status"], ["category", "Categoria"], ["area", "Área"], ["tablePrice", "Valor de tabela"], ["pricePerSquareMeter", "R$/m²"]];
const categorySettings = [["stock", "Estoque atual"], ["totalSales", "Vendas totais"], ["yearSales", "Vendas no ano"], ["monthSales", "Vendas no mês"]];
const simulationSettings = [["showProposalSummary", "Resumo da proposta"], ["showFlowComparison", "Comparativo do fluxo"], ["showVisualAvailability", "Implantação completa minimizada"], ["showSimilarSales", "Últimas vendas similares"]];

function checkSetting(path, label) {
  return `<label class="check-row"><input type="checkbox" data-config="${path}"> ${label}</label>`;
}

function renderSettingsControls() {
  $("#summary-series-settings").innerHTML = seriesSettings.map(([label, showKey, colorKey]) => `<label class="series-setting"><input type="checkbox" data-config="summary.chart.${showKey}"><span>${label}</span><input type="color" aria-label="Cor de ${label}" data-config="summary.chart.${colorKey}"></label>`).join("");
  $("#summary-kpi-settings").innerHTML = kpiSettings.map(([key, label]) => checkSetting(`summary.kpis.${key}`, label)).join("");
  $("#availability-tooltip-settings").innerHTML = tooltipSettings.map(([key, label]) => checkSetting(`availability.tooltipFields.${key}`, label)).join("");
  $("#availability-category-settings").innerHTML = categorySettings.map(([key, label]) => checkSetting(`availability.categoryFields.${key}`, label)).join("");
  $("#simulation-display-settings").innerHTML = simulationSettings.map(([key, label]) => checkSetting(`simulation.${key}`, label)).join("");
  $$('[data-config]').forEach((input) => {
    const value = getPath(state.appConfig, input.dataset.config);
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value ?? "";
  });
}

function renderVisualSettings() {
  const list = products();
  const select = $("#visual-product-select");
  if (!list.length) {
    select.innerHTML = '<option value="">Nenhum produto importado</option>';
    ["#visual-sap-code", "#visual-product-name", "#visual-regional"].forEach((selector) => { $(selector).value = ""; });
    $("#implantation-editor").innerHTML = '<div class="empty-card">Importe o De/Para ou a disponibilidade para configurar uma implantação.</div>';
    $("#implantation-preview").innerHTML = "";
    return;
  }
  if (!list.some((product) => product.id === visualProductId)) visualProductId = state.selectedProject || list[0].id;
  select.innerHTML = list.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join("");
  select.value = visualProductId;
  const config = getVisualConfig(visualProductId);
  $("#visual-sap-code").value = config.sapCode;
  $("#visual-product-name").value = config.productName;
  $("#visual-regional").value = config.regional;
  $("#visual-background-scale").value = String(config.backgroundScale);
  const units = projectUnits(visualProductId);
  renderProductVisual($("#implantation-editor"), { config, units, editor:true, mode:"unit", tooltipFields:state.appConfig.availability.tooltipFields });
  renderProductVisual($("#implantation-preview"), { config, units, compact:true, mode:"unit", tooltipFields:state.appConfig.availability.tooltipFields });
}

function renderSettings() {
  $("#import-grid").innerHTML = importCards.map(([type, title, description]) => { const info = state.imports[type]; return `<article class="import-card"><div class="import-icon">${type === "proposals" ? "$" : type === "units" ? "▦" : type === "projects" ? "⌂" : type === "targets" ? "◎" : "◇"}</div><div><h3>${title}</h3><p>${description}</p>${info ? `<small>${num.format(info.records)} registros · ${new Date(info.date).toLocaleString("pt-BR")}</small>` : "<small>Ainda não importada</small>"}</div><button class="button subtle" data-import="${type}">${info ? "Substituir" : "Importar"}</button></article>`; }).join("");
  const unitKeys = new Set(state.units.map((unit) => unitKey(unit.pep))), categoryKeys = new Set(state.categories.map((category) => unitKey(category.pep)));
  const duplicates = state.proposals.length - new Set(state.proposals.map((proposal) => proposal.id)).size;
  const values = [["Empreendimentos", state.projects.length], ["Unidades válidas", state.units.length], ["Propostas", state.proposals.length], ["Metas BP", state.targets.length], ["PEPs sem categoria", state.units.filter((unit) => !categoryKeys.has(unitKey(unit.pep))).length], ["Propostas sem unidade", state.proposals.filter((proposal) => !unitKeys.has(unitKey(proposal.pep || proposal.unit))).length], ["IDs duplicados", duplicates], ["Base 100", "1,000"]];
  $("#quality-grid").innerHTML = values.map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === "number" ? num.format(value) : value}</strong></div>`).join("");
  renderSettingsControls();
  renderVisualSettings();
  $$("[data-settings-pane]").forEach((button) => button.classList.toggle("active", button.dataset.settingsPane === settingsPane));
  $$(".settings-pane").forEach((pane) => pane.classList.toggle("active", pane.id === `settings-pane-${settingsPane}`));
}

function render() {
  renderProjectSelect();
  renderPortfolio();
  renderSummary();
  renderDetail();
  renderHistory();
  renderSimulator();
  renderSettings();
  saveState(state);
}

function openProject(id) {
  state.selectedProject = id;
  showView("summary");
}

function fillSimulationFromUnit(pep) {
  const unit = state.units.find((item) => unitKey(item.pep) === unitKey(pep));
  if (!unit) return;
  const form = $("#simulation-form");
  form.elements.proposalNominal.value = unit.tableNominal;
  form.elements.proposalNpv.value = unit.tableNpv || unit.tableNominal;
  renderSimulationDefense();
}

function simulateUnit(pep) {
  showView("simulator");
  $("#simulation-unit").value = pep;
  fillSimulationFromUnit(pep);
}

function saveProductVisualBasics() {
  if (!visualProductId) return;
  const config = getVisualConfig(visualProductId);
  config.sapCode = $("#visual-sap-code").value.trim();
  config.productName = $("#visual-product-name").value.trim();
  config.regional = $("#visual-regional").value.trim();
  state.productVisualConfigs[visualProductId] = config;
  const index = state.projects.findIndex((project) => (project.code || project.name) === visualProductId);
  if (index >= 0) state.projects[index] = { ...state.projects[index], name:config.productName || state.projects[index].name, regional:config.regional };
  else state.projects.push({ code:config.sapCode || visualProductId, name:config.productName || visualProductId, regional:config.regional, launchDate:"", deliveryDate:"", totalUnits:projectUnits(visualProductId).length });
  state = reconcile(state);
  saveState(state);
  render();
  toast("Implantação e dados do produto salvos neste navegador.");
}

function updateVisualScale(blockId, direction) {
  const config = getVisualConfig(visualProductId);
  const block = config?.blocks.find((item) => item.blockId === blockId);
  if (!block) return;
  block.scale = Math.min(1.8, Math.max(0.55, block.scale + (direction === "up" ? 0.08 : -0.08)));
  state.productVisualConfigs[visualProductId] = config;
  saveState(state);
  renderVisualSettings();
}

document.addEventListener("click", (event) => {
  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) { event.preventDefault(); showView(view); }
  const project = event.target.closest("[data-open-project]")?.dataset.openProject;
  if (project) openProject(project);
  const pep = event.target.closest("[data-unit]")?.dataset.unit;
  if (pep && !event.target.closest("#implantation-editor")) renderUnitDetail(pep);
  const simulate = event.target.closest("[data-simulate-unit]")?.dataset.simulateUnit;
  if (simulate) simulateUnit(simulate);
  const type = event.target.closest("[data-import]")?.dataset.import;
  if (type) { pendingImport = type; $("#file-input").click(); }
  const remove = event.target.closest("[data-remove-sim]")?.dataset.removeSim;
  if (remove) { state.simulations = state.simulations.filter((simulation) => simulation.id !== remove); render(); }
  const share = event.target.closest("[data-share]")?.dataset.share;
  if (share) shareSimulation(share);
  const pane = event.target.closest("[data-settings-pane]")?.dataset.settingsPane;
  if (pane) { settingsPane = pane; renderSettings(); }
  const mode = event.target.closest("[data-availability-mode]")?.dataset.availabilityMode;
  if (mode) { availabilityMode = mode; renderDetail(); }
  const scale = event.target.closest("[data-block-scale]");
  if (scale) updateVisualScale(scale.dataset.blockId, scale.dataset.blockScale);
});

document.addEventListener("change", (event) => {
  const path = event.target.dataset.config;
  if (!path) return;
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.type === "number" ? Number(event.target.value) : event.target.value;
  setPath(state.appConfig, path, value);
  if (path === "availability.defaultMode") availabilityMode = value;
  saveState(state);
  renderSummary();
  renderDetail();
  renderSimulator();
});

$("#project-select").addEventListener("change", (event) => { state.selectedProject = event.target.value; render(); });
$("#portfolio-sort").addEventListener("change", renderPortfolio);
$("#summary-year").addEventListener("change", () => { renderSummary(); renderDetail(); });
[$("#history-search"), $("#history-status"), $("#history-category"), $("#history-result")].forEach((element) => element.addEventListener("input", renderHistory));
$("#simulation-unit").addEventListener("change", (event) => fillSimulationFromUnit(event.target.value));
$("#simulation-form").addEventListener("input", renderSimulationDefense);
$("#visual-product-select").addEventListener("change", (event) => { visualProductId = event.target.value; renderVisualSettings(); });
$("#save-visual-config").addEventListener("click", saveProductVisualBasics);
$("#visual-image-upload").addEventListener("click", () => $("#visual-image-input").click());
$("#visual-image-remove").addEventListener("click", () => {
  const config = getVisualConfig(visualProductId); if (!config) return;
  config.backgroundImage = ""; state.productVisualConfigs[visualProductId] = config; saveState(state); renderVisualSettings(); toast("Imagem removida da implantação.");
});
$("#visual-background-scale").addEventListener("input", (event) => {
  const config = getVisualConfig(visualProductId); if (!config) return;
  config.backgroundScale = Number(event.target.value); state.productVisualConfigs[visualProductId] = config; saveState(state); renderVisualSettings();
});

$("#visual-image-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Selecione uma imagem PNG, JPG ou WEBP."); return; }
  if (file.size > 2.5 * 1024 * 1024) { toast("A imagem deve ter no máximo 2,5 MB."); event.target.value = ""; return; }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const config = getVisualConfig(visualProductId); if (!config) return;
    config.backgroundImage = String(reader.result); state.productVisualConfigs[visualProductId] = config;
    if (!saveState(state)) { config.backgroundImage = ""; toast("A imagem excedeu o espaço disponível no navegador."); }
    renderVisualSettings();
  });
  reader.readAsDataURL(file);
  event.target.value = "";
});

$("#implantation-editor").addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  const blockElement = event.target.closest("[data-draggable-block]");
  const canvas = $("#implantation-editor .visual-composition");
  if (!blockElement || !canvas) return;
  const blockRect = blockElement.getBoundingClientRect();
  activeVisualDrag = { blockId:blockElement.dataset.draggableBlock, offsetX:event.clientX - blockRect.left, offsetY:event.clientY - blockRect.top };
  blockElement.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

document.addEventListener("pointermove", (event) => {
  if (!activeVisualDrag) return;
  const canvas = $("#implantation-editor .visual-composition"), config = getVisualConfig(visualProductId);
  const block = config?.blocks.find((item) => item.blockId === activeVisualDrag.blockId);
  if (!canvas || !block) return;
  const rect = canvas.getBoundingClientRect();
  block.x = Math.min(94, Math.max(0, (event.clientX - rect.left - activeVisualDrag.offsetX) / rect.width * 100));
  block.y = Math.min(90, Math.max(0, (event.clientY - rect.top - activeVisualDrag.offsetY) / rect.height * 100));
  state.productVisualConfigs[visualProductId] = config;
  const editorBlock = [...$("#implantation-editor").querySelectorAll("[data-draggable-block]")].find((element) => element.dataset.draggableBlock === block.blockId);
  if (editorBlock) { editorBlock.style.left = `${block.x}%`; editorBlock.style.top = `${block.y}%`; }
  const previewBlock = [...$("#implantation-preview").querySelectorAll(".visual-block")].find((element) => element.querySelector("header strong")?.textContent === block.label);
  if (previewBlock) { previewBlock.style.left = `${block.x}%`; previewBlock.style.top = `${block.y}%`; }
});

document.addEventListener("pointerup", () => {
  if (!activeVisualDrag) return;
  activeVisualDrag = null;
  saveState(state);
});
document.addEventListener("pointercancel", () => { activeVisualDrag = null; });

$("#file-input").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file || !pendingImport) return;
  try {
    const result = await readDatasetFile(file, pendingImport);
    state[pendingImport] = result.records;
    state.imports[pendingImport] = { file:file.name, date:new Date().toISOString(), records:result.records.length, warnings:result.warnings };
    state = reconcile(state);
    render();
    toast(`${result.records.length} registros processados em ${importCards.find((item) => item[0] === pendingImport)[1]}.`);
  } catch (error) { toast(error.message); }
  finally { event.target.value = ""; }
});

$("#simulation-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const unit = state.units.find((item) => unitKey(item.pep) === unitKey(data.pep));
  if (!unit) return;
  let rate = parseNumber(data.commissionRate); if (rate > 1) rate /= 100;
  const simulation = { ...unit, id:data.id || `SIM-${Date.now().toString().slice(-6)}`, source:"simulation", active:true, proposalStatus:"Simulação", proposalNominal:parseNumber(data.proposalNominal), proposalNpv:parseNumber(data.proposalNpv), correctedProposalNominal:parseNumber(data.proposalNominal), commissionRate:rate, bonusValue:parseNumber(data.bonusValue), channel:data.channel, note:data.note, referenceNominal:unit.tableNominal * (1 - unit.gorduraRate), referenceNpv:(unit.tableNpv || unit.tableNominal) * (1 - unit.gorduraRate) };
  state.simulations = [...state.simulations.filter((item) => item.id !== simulation.id), simulation];
  render();
  toast("Proposta adicionada ao cenário pro forma.");
});

$("#simulation-list").addEventListener("change", (event) => {
  const id = event.target.dataset.toggleSim;
  if (id) { state.simulations = state.simulations.map((simulation) => simulation.id === id ? { ...simulation, active:event.target.checked } : simulation); render(); }
});

$("#clear-data").addEventListener("click", () => {
  if (confirm("Remover todas as bases, configurações visuais e simulações deste navegador?")) {
    state = clearState(); availabilityMode = state.appConfig.availability.defaultMode; visualProductId = ""; render(); toast("Dados locais removidos.");
  }
});

$("#export-history").addEventListener("click", () => {
  const rows = filteredHistory(), header = ["Proposta", "Produto", "PEP", "Canal", "Tabela", "BP", "Proposta nominal", "Proposta VPL", "Custo comercial", "Resultado nominal", "Resultado real", "Resultado real VPL"];
  const body = rows.map((row) => [row.id, row.project, row.pep, row.channel, row.tableNominal, row.referenceNominal, row.proposalNominal, row.proposalNpv, row.commercialCost, row.nominalResult, row.realNominalResult, row.realNpvResult]);
  const csv = [header, ...body].map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type:"text/csv" })); anchor.download = "historico-comercial.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
});

async function shareSimulation(id) {
  const simulation = state.simulations.find((item) => item.id === id), line = simulation && calculationLine(simulation);
  if (!simulation) return;
  const sharing = state.appConfig.sharing;
  const intro = sharing.message.replaceAll("{{unidade}}", simulation.unit || simulation.pep).replaceAll("{{produto}}", simulation.project);
  const optionalSections = [];
  if (sharing.showVisualAvailability) optionalSections.push("Implantação: composição completa do produto, com a unidade em destaque na defesa.");
  if (sharing.showSimilarSales) {
    const similar = projectRows(state.proposals, simulation.projectCode || simulation.project).map(calculationLine)
      .filter((proposal) => proposal.active && proposal.pep !== simulation.pep && (proposal.category === simulation.category || proposal.stack === simulation.stack))
      .sort((a, b) => String(b.accountingDate).localeCompare(String(a.accountingDate))).slice(0, 3);
    if (similar.length) optionalSections.push(`Vendas similares:\n${similar.map((proposal) => `• ${proposal.block} ${proposal.unit || proposal.pep}: ${fullMoney.format(proposal.proposalNominal)}`).join("\n")}`);
  }
  const text = `${intro}\n\nUnidade: ${simulation.block} ${simulation.unit || simulation.pep}\nTabela: ${fullMoney.format(simulation.tableNominal)}\nProposta: ${fullMoney.format(simulation.proposalNominal)}\nResultado real VPL: ${fmtPct(line.realNpvResult)}\n\n${simulation.note || ""}\n\n${optionalSections.join("\n\n")}\n\n${sharing.signature}\n${sharing.footer}`.trim();
  if (navigator.share) { try { await navigator.share({ title:`Proposta ${simulation.id}`, text }); return; } catch {} }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

showView(state.view || "portfolio");

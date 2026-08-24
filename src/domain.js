export const BASE100_FACTOR = 1;
export const BUDGET_COMMISSION_RATE = 0.04;
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const ratio = (a, b) => b > 0 ? a / b - 1 : null;
const clean = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function isActiveStatus(...values) {
  return values.every((value) => !["cancel", "distrat", "rescind", "recus", "rejeit", "excluid", "inativ"]
    .some((term) => clean(value).includes(term)));
}

export function unitKey(value) { return clean(value).replace(/[^a-z0-9]/g, ""); }

export function normalizeUnit(row = {}) {
  return {
    pep: String(row.pep || row.unit || ""),
    projectCode: String(row.projectCode || ""),
    project: String(row.project || "Empreendimento não informado"),
    block: String(row.block || ""),
    unit: String(row.unit || row.pep || ""),
    floor: String(row.floor || ""),
    stack: String(row.stack || ""),
    area: n(row.area),
    parking: n(row.parking),
    tableNominal: n(row.tableNominal),
    tableNpv: n(row.tableNpv || row.tableNominal),
    gorduraRate: n(row.gorduraRate),
    status: String(row.status || "Disponível"),
    exchange: Boolean(row.exchange),
    category: String(row.category || "Sem categoria"),
    base100Factor: BASE100_FACTOR,
  };
}

export function normalizeProposal(row = {}) {
  const tableNominal = n(row.tableNominal);
  const tableNpv = n(row.tableNpv || tableNominal);
  const gorduraRate = n(row.gorduraRate);
  const referenceNominal = n(row.referenceNominal) || tableNominal * (1 - gorduraRate);
  const referenceNpv = n(row.referenceNpv) || tableNpv * (1 - gorduraRate);
  const proposalNominal = n(row.proposalNominal);
  return {
    id: String(row.id || globalThis.crypto?.randomUUID?.() || Date.now()),
    source: row.source || "import",
    projectCode: String(row.projectCode || ""),
    project: String(row.project || "Empreendimento não informado"),
    pep: String(row.pep || row.unit || ""),
    unit: String(row.unit || row.pep || ""),
    block: String(row.block || ""),
    floor: String(row.floor || ""),
    stack: String(row.stack || ""),
    category: String(row.category || ""),
    proposalStatus: String(row.proposalStatus || row.status || "Realizada"),
    contractStatus: String(row.contractStatus || ""),
    accountingDate: row.accountingDate || "",
    channel: String(row.channel || "Não informado"),
    tableNominal, tableNpv, gorduraRate, referenceNominal, referenceNpv,
    proposalNominal,
    proposalNpv: n(row.proposalNpv) || proposalNominal,
    correctedProposalNominal: n(row.correctedProposalNominal) || proposalNominal,
    area: n(row.area),
    commissionValue: n(row.commissionValue),
    commissionRate: n(row.commissionRate),
    bonusValue: n(row.bonusValue),
    budgetCommissionRate: row.budgetCommissionRate == null ? BUDGET_COMMISSION_RATE : n(row.budgetCommissionRate),
    base100Factor: BASE100_FACTOR,
    active: row.source === "simulation" ? row.active !== false : isActiveStatus(row.proposalStatus || row.status, row.contractStatus),
    note: String(row.note || ""),
  };
}

export function dateParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return { year:value.getFullYear(), month:value.getMonth()+1 };
  const text=String(value || "").trim();
  let match=text.match(/^(\d{4})[-/]?(\d{2})/);
  if (match) return { year:Number(match[1]), month:Number(match[2]) };
  match=text.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) return { year:Number(match[2]), month:Number(match[1]) };
  match=text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) return { year:Number(match[3]), month:Number(match[2]) };
  const date=new Date(text);
  return Number.isNaN(date.getTime()) ? null : { year:date.getFullYear(), month:date.getMonth()+1 };
}

export function monthlySummary(proposals = [], targets = [], year = new Date().getFullYear()) {
  const months=Array.from({length:12},(_,index)=>({
    month:index+1, salesUnits:0, bpUnits:0, cancellations:0, salesVgv:0, bpVgv:0,
    nominalPrice:0, correctedPrice:0, soldArea:0, correctedVgv:0,
  }));
  targets.forEach((target)=>{
    const parts=dateParts(target.month); if(!parts||parts.year!==Number(year)||parts.month<1||parts.month>12)return;
    const item=months[parts.month-1]; item.bpUnits+=n(target.targetUnits); item.bpVgv+=n(target.targetVgv);
  });
  proposals.map(normalizeProposal).forEach((proposal)=>{
    const parts=dateParts(proposal.accountingDate); if(!parts||parts.year!==Number(year)||parts.month<1||parts.month>12)return;
    const item=months[parts.month-1];
    if (!proposal.active) { item.cancellations+=1; return; }
    item.salesUnits+=1; item.salesVgv+=proposal.proposalNominal;
    if(proposal.area>0){ item.soldArea+=proposal.area; item.correctedVgv+=proposal.correctedProposalNominal; }
  });
  return months.map((item)=>({
    ...item,
    nominalPrice:item.soldArea ? item.salesVgv/item.soldArea : 0,
    correctedPrice:item.soldArea ? item.correctedVgv/item.soldArea : 0,
  }));
}

export function calculationLine(input) {
  const r = normalizeProposal(input);
  const actualCost = r.commissionValue || r.commissionRate * r.proposalNominal;
  const commercialCost = actualCost + r.bonusValue;
  const budgetCost = r.budgetCommissionRate * r.referenceNominal;
  return {
    ...r, commercialCost, budgetCost,
    nominalResult: ratio(r.proposalNominal, r.referenceNominal),
    npvResult: ratio(r.proposalNpv, r.referenceNpv),
    realNominalResult: ratio(r.proposalNominal - commercialCost, r.referenceNominal - budgetCost),
    realNpvResult: ratio(r.proposalNpv - commercialCost, r.referenceNpv - budgetCost),
  };
}

export function calculateMetrics(inputs = []) {
  const rows = inputs.map(calculationLine).filter((r) => r.active);
  const sums = rows.reduce((a, r) => {
    a.proposalNominal += r.proposalNominal; a.proposalNpv += r.proposalNpv;
    a.referenceNominal += r.referenceNominal; a.referenceNpv += r.referenceNpv;
    a.commercialCost += r.commercialCost; a.budgetCost += r.budgetCost;
    return a;
  }, { proposalNominal:0, proposalNpv:0, referenceNominal:0, referenceNpv:0, commercialCost:0, budgetCost:0 });
  return {
    units: new Set(rows.map((r) => `${r.projectCode || r.project}:${r.pep || r.unit || r.id}`)).size,
    nominalVgv: sums.proposalNominal,
    nominalResult: ratio(sums.proposalNominal, sums.referenceNominal),
    npvResult: ratio(sums.proposalNpv, sums.referenceNpv),
    base100NpvResult: ratio(sums.proposalNpv, sums.referenceNpv),
    commercialCostRate: sums.proposalNominal ? sums.commercialCost / sums.proposalNominal : null,
    realNominalResult: ratio(sums.proposalNominal - sums.commercialCost, sums.referenceNominal - sums.budgetCost),
    realNpvResult: ratio(sums.proposalNpv - sums.commercialCost, sums.referenceNpv - sums.budgetCost),
  };
}

export function compareMetrics(realized, simulations) {
  const a = calculateMetrics(realized);
  const b = calculateMetrics([...realized, ...simulations.filter((r) => r.active !== false)]);
  return { realized:a, proForma:b, impact:Object.fromEntries(Object.keys(a).map((key) => [key, a[key] == null || b[key] == null ? null : b[key] - a[key]])) };
}

export function projectPortfolio(state) {
  const identifiers = new Set([
    ...state.projects.map((p) => p.code || p.name),
    ...state.units.map((u) => u.projectCode || u.project),
    ...state.proposals.map((p) => p.projectCode || p.project),
  ]);
  return [...identifiers].filter(Boolean).map((id) => {
    const project = state.projects.find((p) => (p.code || p.name) === id) || {};
    const units = state.units.filter((u) => (u.projectCode || u.project) === id);
    const proposals = state.proposals.filter((p) => (p.projectCode || p.project) === id);
    const targets = state.targets.filter((t) => (t.projectCode || t.project) === id);
    const metrics = calculateMetrics(proposals);
    const totalUnits = project.totalUnits || units.length;
    const available = units.filter((u) => clean(u.status).includes("dispon")).length;
    const targetUnits = targets.reduce((sum, t) => sum + n(t.targetUnits), 0);
    return { id, code:project.code || units[0]?.projectCode || "", name:project.name || units[0]?.project || proposals[0]?.project || id,
      launchDate:project.launchDate || "", deliveryDate:project.deliveryDate || "", totalUnits, available, metrics,
      targetUnits, targetAchievement:targetUnits ? metrics.units / targetUnits : null };
  }).sort((a,b) => b.metrics.nominalVgv - a.metrics.nominalVgv);
}

export function statusTone(status, exchange = false) {
  if (exchange) return "exchange";
  const value = clean(status);
  if (value.includes("fora")) return "blocked";
  if (value.includes("vend") || value.includes("assin")) return "sold";
  if (value.includes("process")) return "process";
  if (value.includes("reserv")) return "reserved";
  return "available";
}

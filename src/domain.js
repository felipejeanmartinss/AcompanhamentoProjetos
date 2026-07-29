export const INITIAL_BASE100_FACTOR = 1;

export const emptyMetrics = () => ({
  units: 0,
  nominalVgv: 0,
  npvRevenue: 0,
  nominalResult: null,
  npvResult: null,
  base100NpvResult: null,
  commercialCostRate: null,
  netCommercialResult: null,
});

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const ratio = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator - 1 : null;

export function statusIsActive(status) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return ![
    "cancelad",
    "distrat",
    "rescind",
    "recusad",
    "rejeitad",
    "excluid",
    "inativ",
  ].some((term) => normalized.includes(term));
}

export function monetaryCost(record, valueKey, rateKey, basisKey = "proposalNominal") {
  const explicit = finite(record[valueKey]);
  if (explicit) return explicit;
  return finite(record[rateKey]) * finite(record[basisKey]);
}

export function normalizeRecord(record) {
  const status = String(record.status || "Realizada");
  return {
    id: String(record.id || crypto.randomUUID()),
    source: record.source || "import",
    project: String(record.project || "Empreendimento não informado"),
    unit: String(record.unit || ""),
    status,
    approvalDate: record.approvalDate || "",
    channel: String(record.channel || "Não informado"),
    tableNominal: finite(record.tableNominal),
    referenceNominal: finite(record.referenceNominal || record.tableNominal),
    tableNpv: finite(record.tableNpv),
    referenceNpv: finite(record.referenceNpv || record.tableNpv),
    proposalNominal: finite(record.proposalNominal),
    proposalNpv: finite(record.proposalNpv || record.proposalNominal),
    commissionValue: finite(record.commissionValue),
    commissionRate: finite(record.commissionRate),
    bonusValue: finite(record.bonusValue),
    budgetCommissionValue: finite(record.budgetCommissionValue),
    budgetCommissionRate: finite(record.budgetCommissionRate),
    budgetBonusValue: finite(record.budgetBonusValue),
    base100Factor: INITIAL_BASE100_FACTOR,
    scenario: String(record.scenario || "Realizado"),
    active: record.source === "simulation"
      ? record.active !== false
      : record.active === false ? false : statusIsActive(status),
  };
}

export function calculateMetrics(records) {
  const active = records.map(normalizeRecord).filter((record) => record.active !== false);
  if (!active.length) return emptyMetrics();

  let nominalVgv = 0;
  let npvRevenue = 0;
  let referenceNominal = 0;
  let referenceNpv = 0;
  let proposalBase100 = 0;
  let referenceBase100 = 0;
  let actualCommercialCost = 0;
  let budgetCommercialCost = 0;

  for (const record of active) {
    const factor = record.base100Factor || INITIAL_BASE100_FACTOR;
    nominalVgv += record.proposalNominal;
    npvRevenue += record.proposalNpv;
    referenceNominal += record.referenceNominal;
    referenceNpv += record.referenceNpv;
    proposalBase100 += record.proposalNpv / factor;
    referenceBase100 += record.referenceNpv / factor;
    actualCommercialCost += monetaryCost(record, "commissionValue", "commissionRate");
    actualCommercialCost += record.bonusValue;
    budgetCommercialCost += monetaryCost(
      record,
      "budgetCommissionValue",
      "budgetCommissionRate",
      "referenceNominal",
    );
    budgetCommercialCost += record.budgetBonusValue;
  }

  return {
    units: new Set(active.map((record) => `${record.project}::${record.unit || record.id}`)).size,
    nominalVgv,
    npvRevenue,
    nominalResult: ratio(nominalVgv, referenceNominal),
    npvResult: ratio(npvRevenue, referenceNpv),
    base100NpvResult: ratio(proposalBase100, referenceBase100),
    commercialCostRate: nominalVgv > 0 ? actualCommercialCost / nominalVgv : null,
    netCommercialResult: ratio(
      npvRevenue - actualCommercialCost,
      referenceNpv - budgetCommercialCost,
    ),
  };
}

export function compareMetrics(realizedRecords, simulatedRecords) {
  const realized = calculateMetrics(realizedRecords);
  const proForma = calculateMetrics([...realizedRecords, ...simulatedRecords]);
  const impact = {};

  for (const key of Object.keys(realized)) {
    if (realized[key] === null || proForma[key] === null) {
      impact[key] = null;
    } else {
      impact[key] = proForma[key] - realized[key];
    }
  }

  return { realized, proForma, impact };
}

export function groupMetrics(records, field) {
  const groups = new Map();
  for (const record of records) {
    const key = record[field] || "Não informado";
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  return [...groups.entries()]
    .map(([label, rows]) => ({ label, ...calculateMetrics(rows) }))
    .sort((a, b) => b.nominalVgv - a.nominalVgv);
}

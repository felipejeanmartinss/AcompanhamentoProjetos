import { INITIAL_BASE100_FACTOR, normalizeRecord } from "./domain.js?v=20260728-3";

const aliases = {
  id: ["id proposta", "proposta", "codigo proposta", "numero proposta", "id"],
  project: ["empreendimento", "projeto", "nome empreendimento"],
  unit: ["pep", "unidade", "codigo unidade", "apto", "apartamento"],
  status: ["status", "situacao", "status proposta"],
  proposalStatus: ["status proposta", "situacao proposta"],
  contractStatus: ["status contrato", "situacao contrato"],
  approvalDate: ["data aprovacao", "data da aprovacao", "data venda", "data contrato"],
  channel: ["canal", "canal venda", "empresa vendas", "imobiliaria"],
  tableNominal: ["tabela nominal", "valor tabela", "preco tabela", "tabela"],
  referenceNominal: ["bp nominal", "valor bp", "preco meta", "referencia nominal"],
  tableNpv: ["tabela vpl", "valor tabela vpl", "vpl tabela", "tabela vp"],
  referenceNpv: ["bp vpl", "vpl bp", "referencia vpl", "preco meta vpl"],
  proposalNominal: ["proposta nominal", "valor proposta", "valor venda", "vgv"],
  proposalNpv: ["proposta vpl", "valor proposta vpl", "vpl proposta", "vpl venda", "valor presente"],
  gorduraRate: ["gordura", "percentual gordura"],
  commissionValue: ["total comissao", "comissao valor", "valor comissao", "comissao r"],
  commissionRate: ["comissao percentual", "percentual comissao", "comissao"],
  bonusValue: ["total premio", "premio", "valor premio", "premiacao"],
  budgetCommissionRate: ["comissao orcada", "percentual comissao orcada"],
  budgetCommissionValue: ["valor comissao orcada"],
  budgetBonusValue: ["premio orcado", "valor premio orcado"],
};

export function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/r\$/gi, "r")
    .replace(/[%()[\]_/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function detectColumns(headers) {
  const normalized = headers.map(normalizeHeader);
  const mapping = {};
  for (const [field, candidates] of Object.entries(aliases)) {
    const index = normalized.findIndex((header) =>
      candidates.some((candidate) => header === normalizeHeader(candidate)),
    );
    if (index >= 0) mapping[field] = headers[index];
  }
  return mapping;
}

export function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === "") return 0;

  let text = String(value).trim().replace(/\s/g, "").replace(/R\$/gi, "");
  const percent = text.includes("%");
  text = text.replace("%", "");

  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return 0;
  return percent ? number / 100 : number;
}

export function rowsToRecords(rows) {
  if (!rows.length) return { records: [], mapping: {}, warnings: ["Arquivo sem linhas."] };
  const headers = Object.keys(rows[0]);
  const mapping = detectColumns(headers);
  const warnings = [];

  if (!mapping.unit) warnings.push("Coluna de unidade/PEP não identificada.");
  if (!mapping.proposalNominal) warnings.push("Coluna de valor nominal da proposta não identificada.");
  if (!mapping.proposalNpv) warnings.push("VPL da proposta ausente; será usado o valor nominal.");
  if (!mapping.referenceNpv && !mapping.tableNpv) {
    warnings.push("Referência VPL ausente; será usada a referência nominal.");
  }

  const dataRows = rows.filter((row) => {
    const id = mapping.id ? row[mapping.id] : "";
    const unit = mapping.unit ? row[mapping.unit] : "";
    return String(id ?? "").trim() || String(unit ?? "").trim();
  });
  const excludedRows = rows.length - dataRows.length;
  if (excludedRows) {
    warnings.push(`${excludedRows} linha(s) de totalização ou rodapé foram ignoradas.`);
  }

  const records = dataRows
    .map((row, index) => {
      const get = (field) => mapping[field] ? row[mapping[field]] : undefined;
      const proposalNominal = parseNumber(get("proposalNominal"));
      const proposalNpv = parseNumber(get("proposalNpv")) || proposalNominal;
      const tableNominal = parseNumber(get("tableNominal"));
      const gorduraRate = parseNumber(get("gorduraRate"));
      const explicitReferenceNominal = parseNumber(get("referenceNominal"));
      const referenceNominal = explicitReferenceNominal || tableNominal * (1 - gorduraRate);
      const tableNpv = parseNumber(get("tableNpv")) || tableNominal;
      const explicitReferenceNpv = parseNumber(get("referenceNpv"));
      const referenceNpv = explicitReferenceNpv || tableNpv * (1 - gorduraRate);
      const commissionRaw = parseNumber(get("commissionRate"));

      return normalizeRecord({
        id: get("id") || `IMP-${index + 1}`,
        project: get("project"),
        unit: get("unit"),
        status: get("proposalStatus") || get("status"),
        proposalStatus: get("proposalStatus") || get("status"),
        contractStatus: get("contractStatus"),
        approvalDate: get("approvalDate"),
        channel: get("channel"),
        tableNominal,
        referenceNominal,
        tableNpv,
        referenceNpv,
        gorduraRate,
        proposalNominal,
        proposalNpv,
        commissionValue: parseNumber(get("commissionValue")),
        commissionRate: commissionRaw > 1 ? commissionRaw / 100 : commissionRaw,
        bonusValue: parseNumber(get("bonusValue")),
        budgetCommissionRate: mapping.budgetCommissionRate
          ? parseNumber(get("budgetCommissionRate"))
          : undefined,
        budgetCommissionValue: parseNumber(get("budgetCommissionValue")),
        budgetBonusValue: parseNumber(get("budgetBonusValue")),
        base100Factor: INITIAL_BASE100_FACTOR,
        source: "import",
      });
    });

  return { records, mapping, warnings };
}

function parseCsvLine(line, separator) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value);
  return cells;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length
    ? ";"
    : ",";
  const headers = parseCsvLine(lines[0], separator).map((header) => header.trim());
  return lines.slice(1).map((line) =>
    Object.fromEntries(
      parseCsvLine(line, separator).map((value, index) => [headers[index], value.trim()]),
    ),
  );
}

export async function readProposalFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "csv") {
    return rowsToRecords(parseCsv(await file.text()));
  }
  if (!["xlsx", "xls"].includes(extension)) {
    throw new Error("Formato não suportado. Use XLSX, XLS ou CSV.");
  }
  if (!globalThis.XLSX) {
    throw new Error("Leitor Excel indisponível. Verifique a conexão ou use CSV.");
  }
  const workbook = globalThis.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = globalThis.XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  return rowsToRecords(rows);
}

import { BASE100_FACTOR, normalizeProposal, normalizeUnit, unitKey } from "./domain.js";

export function normalizeHeader(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/r\$/gi, "r").replace(/[%()[\]_/.-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
export function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null || value === "") return 0;
  let text = String(value).trim().replace(/\s/g, "").replace(/R\$/gi, "");
  const pct = text.includes("%"); text = text.replace("%", "");
  if (text.includes(",") && text.includes(".")) text = text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  else if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  const result = Number(text); return Number.isFinite(result) ? (pct ? result / 100 : result) : 0;
}
const aliases = {
  proposals: {
    id:["proposta","id proposta","numero proposta"], projectCode:["codigo empreendimento","codigo sap","cod empreendimento"],
    project:["nome empreendimento","empreendimento","projeto"], pep:["pep","codigo unidade"], unit:["unidade","apto"],
    block:["bloco"], proposalStatus:["status proposta","situacao proposta","status"], contractStatus:["status contrato","situacao contrato"],
    accountingDate:["data contabil","data aprovacao","data venda"], channel:["empresa de venda","empresa vendas","canal","imobiliaria"],
    tableNominal:["valor tabela","tabela"], tableNpv:["valor tabela vpl","tabela vpl"], gorduraRate:["gordura","percentual gordura"],
    proposalNominal:["valor proposta","proposta nominal","valor venda"], proposalNpv:["valor proposta vpl","proposta vpl","vpl proposta"],
    correctedProposalNominal:["valor proposta corrigido","proposta corrigida","valor corrigido"],
    commissionValue:["total comissao","valor comissao"], commissionRate:["percentual comissao","comissao"], bonusValue:["total premio","valor premio","premio"],
  },
  units: {
    projectCode:["codigo empreendimento","codigo sap","codigo"], project:["empreendimento","nome empreendimento"], pep:["pep","codigo unidade"],
    unit:["unidade","apto"], block:["bloco","torre"], floor:["andar"], stack:["prumada","final"], area:["area privativa","area"],
    parking:["vagas"], tableNominal:["valor tabela","tabela vigente","vgv tabela"], tableNpv:["valor tabela vpl","tabela vpl"],
    gorduraRate:["gordura"], status:["status unidade","disponibilidade","status"], exchange:["permuta"],
  },
  projects: {
    code:["codigo sap","codigo","cod empreendimento"], name:["nome comercial","empreendimento","produto"],
    launchDate:["data lancamento","lancamento"], deliveryDate:["data entrega","entrega"], totalUnits:["total unidades tegra","total unidades","unidades"],
  },
  targets: {
    projectCode:["codigo","codigo sap","cod empreendimento"], project:["empreendimento","produto"], month:["mes","ano mes","anomes"],
    targetUnits:["meta unidades","unidades bp","qtd bp"], targetVgv:["meta vgv","vgv bp"],
  },
  categories: { pep:["pep","codigo unidade"], category:["categoria","tipologia","classificacao"] },
};
function mappingFor(headers, type) {
  const normalized = headers.map(normalizeHeader);
  return Object.fromEntries(Object.entries(aliases[type]).flatMap(([field, candidates]) => {
    const index = normalized.findIndex((header) => candidates.some((c) => header === normalizeHeader(c)));
    return index < 0 ? [] : [[field, headers[index]]];
  }));
}
export function detectColumns(headers, type = "proposals") { return mappingFor(headers, type); }
function rowValue(row, mapping, field) { return mapping[field] ? row[mapping[field]] : undefined; }
const flag = (value) => ["sim","s","yes","1","true"].includes(normalizeHeader(value));

export function rowsToDataset(rows, type) {
  if (!rows.length) return { records:[], warnings:["Arquivo sem linhas."], mapping:{} };
  const mapping = mappingFor(Object.keys(rows[0]), type);
  const warnings = [];
  if (type !== "projects" && type !== "targets" && !mapping.pep) warnings.push("PEP não identificado.");
  let records = rows.filter((row) => Object.values(row).some((value) => String(value ?? "").trim())).map((row, index) => {
    const get = (field) => rowValue(row, mapping, field);
    if (type === "proposals") {
      const rate = parseNumber(get("commissionRate"));
      return normalizeProposal({
        id:get("id") || `IMP-${index+1}`, projectCode:get("projectCode"), project:get("project"), pep:get("pep"), unit:get("unit"),
        block:get("block"), proposalStatus:get("proposalStatus"), contractStatus:get("contractStatus"), accountingDate:get("accountingDate"),
        channel:get("channel"), tableNominal:parseNumber(get("tableNominal")), tableNpv:parseNumber(get("tableNpv")),
        gorduraRate:parseNumber(get("gorduraRate")), proposalNominal:parseNumber(get("proposalNominal")),
        proposalNpv:parseNumber(get("proposalNpv")), correctedProposalNominal:parseNumber(get("correctedProposalNominal")), commissionValue:parseNumber(get("commissionValue")),
        commissionRate:rate > 1 ? rate/100 : rate, bonusValue:parseNumber(get("bonusValue")), base100Factor:BASE100_FACTOR,
      });
    }
    if (type === "units") return normalizeUnit({
      projectCode:get("projectCode"), project:get("project"), pep:get("pep"), unit:get("unit"), block:get("block"),
      floor:get("floor"), stack:get("stack"), area:parseNumber(get("area")), parking:parseNumber(get("parking")),
      tableNominal:parseNumber(get("tableNominal")), tableNpv:parseNumber(get("tableNpv")), gorduraRate:parseNumber(get("gorduraRate")),
      status:get("status"), exchange:flag(get("exchange")),
    });
    if (type === "projects") return { code:String(get("code") || ""), name:String(get("name") || ""), launchDate:get("launchDate") || "", deliveryDate:get("deliveryDate") || "", totalUnits:parseNumber(get("totalUnits")) };
    if (type === "targets") return { projectCode:String(get("projectCode") || ""), project:String(get("project") || ""), month:get("month") || "", targetUnits:parseNumber(get("targetUnits")), targetVgv:parseNumber(get("targetVgv")) };
    return { pep:String(get("pep") || ""), category:String(get("category") || "Sem categoria") };
  });
  if (type === "units") {
    const seen = new Set(); const duplicates = [];
    records = records.filter((r) => { const key=unitKey(r.pep); if (!key || seen.has(key)) { if(key) duplicates.push(r.pep); return false; } seen.add(key); return true; });
    if (duplicates.length) warnings.push(`${duplicates.length} PEP(s) duplicado(s) ignorado(s).`);
  }
  return { records, warnings, mapping };
}
export const rowsToRecords = (rows) => rowsToDataset(rows, "proposals");

function parseCsvLine(line, separator) {
  const cells=[]; let value="", quoted=false;
  for (let i=0;i<line.length;i+=1) { const char=line[i]; if(char === '"'){ if(quoted && line[i+1] === '"'){value+='"';i+=1;} else quoted=!quoted; } else if(char===separator&&!quoted){cells.push(value);value="";} else value+=char; }
  cells.push(value); return cells;
}
export function parseCsv(text) {
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter((line)=>line.trim()); if(!lines.length)return[];
  const separator=(lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ";" : ",";
  const headers=parseCsvLine(lines[0],separator).map((h)=>h.trim());
  return lines.slice(1).map((line)=>Object.fromEntries(parseCsvLine(line,separator).map((v,i)=>[headers[i],v.trim()])));
}
export async function readDatasetFile(file, type) {
  const extension=file.name.split(".").pop().toLowerCase();
  let rows;
  if(extension==="csv") rows=parseCsv(await file.text());
  else {
    if(!["xlsx","xls"].includes(extension)) throw new Error("Formato não suportado. Use XLSX, XLS ou CSV.");
    if(!globalThis.XLSX) throw new Error("Leitor Excel indisponível. Verifique a conexão ou use CSV.");
    const workbook=globalThis.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
    rows=globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:""});
  }
  return rowsToDataset(rows,type);
}

export function reconcile(state) {
  const projectsByCode=new Map(state.projects.map((p)=>[String(p.code),p]));
  const categoriesByPep=new Map(state.categories.map((c)=>[unitKey(c.pep),c.category]));
  const units=state.units.map((u)=>({ ...u, project:projectsByCode.get(u.projectCode)?.name || u.project, category:categoriesByPep.get(unitKey(u.pep)) || u.category }));
  const unitsByPep=new Map(units.map((u)=>[unitKey(u.pep),u]));
  const proposals=state.proposals.map((p)=>{ const u=unitsByPep.get(unitKey(p.pep || p.unit)); return normalizeProposal({ ...p, ...(u ? { projectCode:u.projectCode, project:u.project, pep:u.pep, unit:u.unit, block:u.block, floor:u.floor, stack:u.stack, area:u.area, category:u.category, tableNominal:p.tableNominal||u.tableNominal, tableNpv:p.tableNpv||u.tableNpv, gorduraRate:p.gorduraRate||u.gorduraRate } : {}) }); });
  return { ...state, units, proposals };
}

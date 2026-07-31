import { calculateMetrics, calculationLine, compareMetrics, projectPortfolio, statusTone, unitKey } from "./domain.js";
import { parseNumber, readDatasetFile, reconcile } from "./importer.js";
import { clearState, loadState, saveState } from "./store.js";

let state = reconcile(loadState());
let pendingImport = "";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL", notation:"compact", maximumFractionDigits:1 });
const fullMoney = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL", maximumFractionDigits:0 });
const pct = new Intl.NumberFormat("pt-BR", { style:"percent", minimumFractionDigits:1, maximumFractionDigits:1 });
const num = new Intl.NumberFormat("pt-BR");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[c]);
const fmtPct = (value) => value == null ? "—" : pct.format(value);
const tone = (value) => value == null ? "" : value < -0.00001 ? "negative" : value > 0.00001 ? "positive" : "";
const currentId = () => state.selectedProject || projectPortfolio(state)[0]?.id || "";
const projectRows = (rows) => { const id=currentId(); return id ? rows.filter((r)=>(r.projectCode||r.project)===id) : rows; };

const views = {
  portfolio:["Visão comercial","Carteira de produtos"], detail:["Produto selecionado","Detalhe do empreendimento"],
  history:["Auditoria","Histórico analítico"], simulator:["Decisão comercial","Simulador de proposta"], settings:["Administração","Configurações e importações"],
};
function showView(view) {
  state.view=view; $$(".view").forEach((el)=>el.classList.toggle("active",el.id===`view-${view}`));
  $$(".nav-item").forEach((el)=>el.classList.toggle("active",el.dataset.view===view));
  $("#breadcrumb").textContent=views[view][0]; $("#page-title").textContent=views[view][1];
  render(); window.scrollTo({top:0,behavior:"smooth"});
}
function toast(message) { const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2500); }

function renderProjectSelect() {
  const products=projectPortfolio(state); const select=$("#project-select");
  select.innerHTML='<option value="">Todos os produtos</option>'+products.map((p)=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  select.value=state.selectedProject;
}
function renderPortfolio() {
  let products=projectPortfolio(state); const sort=$("#portfolio-sort").value;
  products.sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="sales"?b.metrics.units-a.metrics.units:sort==="result"?(b.metrics.realNpvResult??-99)-(a.metrics.realNpvResult??-99):sort==="target"?(b.targetAchievement??-1)-(a.targetAchievement??-1):b.metrics.nominalVgv-a.metrics.nominalVgv);
  $("#portfolio-count").textContent=`${products.length} produto${products.length===1?"":"s"}`;
  $("#product-grid").innerHTML=products.length?products.map((p)=>`
    <button class="product-card" data-open-project="${escapeHtml(p.id)}">
      <div class="card-head"><div><span class="product-code">${escapeHtml(p.code||"PRODUTO")}</span><h3>${escapeHtml(p.name)}</h3></div><span class="arrow">→</span></div>
      <div class="sales-line"><strong>${num.format(p.metrics.units)}</strong> vendas <span>de ${num.format(p.totalUnits||0)} unidades</span></div>
      <div class="progress"><i style="width:${Math.min(100,p.totalUnits?p.metrics.units/p.totalUnits*100:0)}%"></i></div>
      <div class="card-kpis"><div><span>VGV vendido</span><strong>${money.format(p.metrics.nominalVgv)}</strong></div><div><span>Real VPL</span><strong class="${tone(p.metrics.realNpvResult)}">${fmtPct(p.metrics.realNpvResult)}</strong></div><div><span>Estoque</span><strong>${num.format(p.available)}</strong></div><div><span>Atingimento BP</span><strong>${fmtPct(p.targetAchievement)}</strong></div></div>
    </button>`).join(""):'<div class="empty-card">Importe as bases em Configurações para visualizar a carteira.</div>';
}
function kpi(label,value,detail="",className=""){return `<div class="kpi"><span>${label}</span><strong class="${className}">${value}</strong><small>${detail}</small></div>`;}
function renderDetail() {
  const product=projectPortfolio(state).find((p)=>p.id===currentId());
  if(!product){$("#project-header").className="project-header empty-card";$("#project-header").textContent="Selecione um produto na carteira.";$("#project-kpis").innerHTML="";$("#unit-matrix").innerHTML="";return;}
  $("#project-header").className="project-header";
  $("#project-header").innerHTML=`<div><p class="eyebrow">${escapeHtml(product.code)}</p><h2>${escapeHtml(product.name)}</h2></div><div class="project-facts"><span>Lançamento <strong>${escapeHtml(product.launchDate||"—")}</strong></span><span>Entrega <strong>${escapeHtml(product.deliveryDate||"—")}</strong></span><span>VSO <strong>${fmtPct(product.totalUnits?product.metrics.units/product.totalUnits:null)}</strong></span></div>`;
  $("#project-kpis").innerHTML=[
    kpi("Vendas",num.format(product.metrics.units),`de ${product.totalUnits||0} unidades`),
    kpi("VGV vendido",money.format(product.metrics.nominalVgv),"vendas ativas"),
    kpi("Resultado nominal",fmtPct(product.metrics.nominalResult),"versus BP",tone(product.metrics.nominalResult)),
    kpi("Resultado real",fmtPct(product.metrics.realNominalResult),"líquido de custos",tone(product.metrics.realNominalResult)),
    kpi("Resultado real VPL",fmtPct(product.metrics.realNpvResult),"indicador principal",tone(product.metrics.realNpvResult)),
    kpi("Disponíveis",num.format(product.available),"estoque atual"),
  ].join("");
  const units=projectRows(state.units);
  const blocks=[...new Set(units.map((u)=>u.block||"Único"))];
  $("#unit-matrix").innerHTML=units.length?blocks.map((block)=>{
    const rows=units.filter((u)=>(u.block||"Único")===block).sort((a,b)=>Number(b.floor)-Number(a.floor)||String(a.stack).localeCompare(String(b.stack)));
    return `<div class="matrix-block"><h3>${escapeHtml(block)}</h3><div class="unit-grid">${rows.map((u)=>`<button class="unit-cell ${statusTone(u.status,u.exchange)}" data-unit="${escapeHtml(u.pep)}"><strong>${escapeHtml(u.unit||u.pep)}</strong><span>${escapeHtml(u.category)}</span><small>${u.area?`${num.format(u.area)} m²`:""}</small></button>`).join("")}</div></div>`;
  }).join(""):'<div class="empty-card">Importe Tabela Vigente & Disponibilidade para montar a matriz.</div>';
}
function renderUnitDetail(pep) {
  const unit=state.units.find((u)=>unitKey(u.pep)===unitKey(pep)); if(!unit)return;
  $("#unit-detail").innerHTML=`<p class="eyebrow">${escapeHtml(unit.block||"Unidade")}</p><h2>${escapeHtml(unit.unit||unit.pep)}</h2><span class="status-pill ${statusTone(unit.status,unit.exchange)}">${escapeHtml(unit.exchange?"Permuta":unit.status)}</span>
  <dl><div><dt>PEP</dt><dd>${escapeHtml(unit.pep)}</dd></div><div><dt>Categoria</dt><dd>${escapeHtml(unit.category)}</dd></div><div><dt>Área</dt><dd>${unit.area?`${num.format(unit.area)} m²`:"—"}</dd></div><div><dt>Tabela</dt><dd>${fullMoney.format(unit.tableNominal)}</dd></div><div><dt>BP nominal</dt><dd>${fullMoney.format(unit.tableNominal*(1-unit.gorduraRate))}</dd></div><div><dt>Base 100</dt><dd>1,000</dd></div></dl>
  <button class="button primary" data-simulate-unit="${escapeHtml(unit.pep)}" ${statusTone(unit.status,unit.exchange)!=="available"?"disabled":""}>Simular esta unidade</button>`;
}
function filteredHistory() {
  const search=$("#history-search").value.toLowerCase(), status=$("#history-status").value, category=$("#history-category").value, result=$("#history-result").value;
  return projectRows(state.proposals).map(calculationLine).filter((r)=>{
    const hay=`${r.id} ${r.unit} ${r.pep} ${r.channel}`.toLowerCase();
    return (!search||hay.includes(search))&&(!status||r.proposalStatus===status)&&(!category||r.category===category)&&(!result||(result==="negative"?r.realNpvResult<0:r.realNpvResult>=0));
  });
}
function renderHistory() {
  const all=projectRows(state.proposals).map(calculationLine);
  const statuses=[...new Set(all.map((r)=>r.proposalStatus).filter(Boolean))], categories=[...new Set(all.map((r)=>r.category).filter(Boolean))];
  const status=$("#history-status"), category=$("#history-category"), sv=status.value, cv=category.value;
  status.innerHTML='<option value="">Todos os status</option>'+statuses.map((v)=>`<option>${escapeHtml(v)}</option>`).join("");status.value=sv;
  category.innerHTML='<option value="">Todas as categorias</option>'+categories.map((v)=>`<option>${escapeHtml(v)}</option>`).join("");category.value=cv;
  const rows=filteredHistory();
  $("#history-table").innerHTML=rows.length?rows.map((r)=>`<tr class="${r.active?"":"inactive"}"><td><strong>${escapeHtml(r.id)}</strong><small>${escapeHtml(r.channel)}</small></td><td>${escapeHtml(r.block)} ${escapeHtml(r.unit||r.pep)}<small>${escapeHtml(r.category)}</small></td><td>${escapeHtml(r.accountingDate||"—")}</td><td>${fullMoney.format(r.tableNominal)}</td><td>${fullMoney.format(r.referenceNominal)}</td><td>${fullMoney.format(r.proposalNominal)}</td><td>${fullMoney.format(r.proposalNpv)}</td><td>${fullMoney.format(r.commercialCost)}</td><td class="${tone(r.nominalResult)}">${fmtPct(r.nominalResult)}</td><td class="${tone(r.realNominalResult)}">${fmtPct(r.realNominalResult)}</td><td class="${tone(r.realNpvResult)}">${fmtPct(r.realNpvResult)}</td></tr>`).join(""):'<tr><td colspan="11" class="empty-cell">Nenhum registro encontrado.</td></tr>';
}
const metricDefs=[["units","Unidades","number"],["nominalVgv","VGV nominal","money"],["nominalResult","Resultado nominal","pct"],["realNominalResult","Resultado real","pct"],["realNpvResult","Resultado real VPL","pct"],["commercialCostRate","Comissão + prêmio","pct"]];
function renderSimulator() {
  const units=projectRows(state.units).filter((u)=>statusTone(u.status,u.exchange)==="available");
  const select=$("#simulation-unit"), current=select.value;
  select.innerHTML='<option value="">Selecione uma unidade disponível</option>'+units.map((u)=>`<option value="${escapeHtml(u.pep)}">${escapeHtml(u.block)} ${escapeHtml(u.unit||u.pep)} · ${escapeHtml(u.category)}</option>`).join("");select.value=current;
  const sims=projectRows(state.simulations), comparison=compareMetrics(projectRows(state.proposals),sims);
  $("#simulation-count").textContent=`${sims.filter((s)=>s.active).length} propostas ativas`;
  $("#comparison").innerHTML='<div class="comparison-row head"><span>Indicador</span><span>Realizado</span><span>Pro forma</span><span>Impacto</span></div>'+metricDefs.map(([key,label,type])=>{
    const f=(v)=>type==="money"?money.format(v):type==="pct"?fmtPct(v):num.format(v);
    const impact=comparison.impact[key]; return `<div class="comparison-row"><span>${label}</span><strong>${f(comparison.realized[key])}</strong><strong>${f(comparison.proForma[key])}</strong><strong class="${tone(impact)}">${impact!=null&&impact>0?"+":""}${f(impact)}</strong></div>`;
  }).join("");
  $("#simulation-list").innerHTML=sims.length?sims.map((s)=>{const line=calculationLine(s);return `<div class="simulation-item"><div><strong>${escapeHtml(s.id)}</strong><span>${escapeHtml(s.unit||s.pep)} · ${escapeHtml(s.channel)}</span></div><div><strong class="${tone(line.realNpvResult)}">${fmtPct(line.realNpvResult)}</strong><span>${money.format(s.proposalNominal)}</span></div><label class="switch"><input type="checkbox" data-toggle-sim="${escapeHtml(s.id)}" ${s.active?"checked":""}><i></i></label><button title="Compartilhar defesa" data-share="${escapeHtml(s.id)}">↗</button><button title="Remover" data-remove-sim="${escapeHtml(s.id)}">×</button></div>`;}).join(""):'<div class="empty-card">Nenhuma proposta adicionada ao cenário.</div>';
}
const importCards=[
  ["proposals","Propostas","Histórico financeiro e comercial"],["units","Tabela e disponibilidade","Cadastro, preço e status das unidades"],
  ["projects","De – Para","Nome comercial e dados do produto"],["targets","BP","Metas mensais de unidades e VGV"],["categories","Categorias","Tipologia e classificação por PEP"],
];
function renderSettings() {
  $("#import-grid").innerHTML=importCards.map(([type,title,desc])=>{const info=state.imports[type];return `<article class="import-card"><div class="import-icon">${type==="proposals"?"$":type==="units"?"▦":type==="projects"?"⌂":type==="targets"?"◎":"◇"}</div><div><h3>${title}</h3><p>${desc}</p>${info?`<small>${num.format(info.records)} registros · ${new Date(info.date).toLocaleString("pt-BR")}</small>`:"<small>Ainda não importada</small>"}</div><button class="button subtle" data-import="${type}">${info?"Substituir":"Importar"}</button></article>`;}).join("");
  const unitKeys=new Set(state.units.map((u)=>unitKey(u.pep))); const categoryKeys=new Set(state.categories.map((c)=>unitKey(c.pep)));
  const duplicates=state.proposals.length-new Set(state.proposals.map((p)=>p.id)).size;
  const values=[
    ["Empreendimentos",state.projects.length],["Unidades válidas",state.units.length],["Propostas",state.proposals.length],["Metas BP",state.targets.length],
    ["PEPs sem categoria",state.units.filter((u)=>!categoryKeys.has(unitKey(u.pep))).length],["Propostas sem unidade",state.proposals.filter((p)=>!unitKeys.has(unitKey(p.pep||p.unit))).length],["IDs duplicados",duplicates],["Base 100","1,000"],
  ];
  $("#quality-grid").innerHTML=values.map(([label,value])=>`<div><span>${label}</span><strong>${typeof value==="number"?num.format(value):value}</strong></div>`).join("");
}
function render() {
  renderProjectSelect(); renderPortfolio(); renderDetail(); renderHistory(); renderSimulator(); renderSettings(); saveState(state);
}
function openProject(id) { state.selectedProject=id; showView("detail"); }
function simulateUnit(pep) { showView("simulator"); $("#simulation-unit").value=pep; const u=state.units.find((x)=>unitKey(x.pep)===unitKey(pep)); if(u){const form=$("#simulation-form");form.elements.proposalNominal.value=u.tableNominal;form.elements.proposalNpv.value=u.tableNpv||u.tableNominal;} }

document.addEventListener("click",(event)=>{
  const view=event.target.closest("[data-view]")?.dataset.view; if(view){event.preventDefault();showView(view);}
  const project=event.target.closest("[data-open-project]")?.dataset.openProject;if(project)openProject(project);
  const pep=event.target.closest("[data-unit]")?.dataset.unit;if(pep)renderUnitDetail(pep);
  const simulate=event.target.closest("[data-simulate-unit]")?.dataset.simulateUnit;if(simulate)simulateUnit(simulate);
  const type=event.target.closest("[data-import]")?.dataset.import;if(type){pendingImport=type;$("#file-input").click();}
  const remove=event.target.closest("[data-remove-sim]")?.dataset.removeSim;if(remove){state.simulations=state.simulations.filter((s)=>s.id!==remove);render();}
  const share=event.target.closest("[data-share]")?.dataset.share;if(share)shareSimulation(share);
});
$$(".nav-item,.top-actions [data-view]").forEach((el)=>el.addEventListener("click",()=>{}));
$("#project-select").addEventListener("change",(e)=>{state.selectedProject=e.target.value;render();});
$("#portfolio-sort").addEventListener("change",renderPortfolio);
["#history-search","#history-status","#history-category","#history-result"].forEach((s)=>$(s).addEventListener("input",renderHistory));
$("#file-input").addEventListener("change",async(e)=>{
  const file=e.target.files[0];if(!file||!pendingImport)return;
  try{const result=await readDatasetFile(file,pendingImport);state[pendingImport]=result.records;state.imports[pendingImport]={file:file.name,date:new Date().toISOString(),records:result.records.length,warnings:result.warnings};state=reconcile(state);render();toast(`${result.records.length} registros processados em ${importCards.find((x)=>x[0]===pendingImport)[1]}.`);}catch(error){toast(error.message);}finally{e.target.value="";}
});
$("#simulation-form").addEventListener("submit",(event)=>{
  event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));const unit=state.units.find((u)=>unitKey(u.pep)===unitKey(data.pep));if(!unit)return;
  let rate=parseNumber(data.commissionRate);if(rate>1)rate/=100;
  const simulation={...unit,id:data.id||`SIM-${Date.now().toString().slice(-6)}`,source:"simulation",active:true,proposalStatus:"Simulação",proposalNominal:parseNumber(data.proposalNominal),proposalNpv:parseNumber(data.proposalNpv),commissionRate:rate,bonusValue:parseNumber(data.bonusValue),channel:data.channel,note:data.note,referenceNominal:unit.tableNominal*(1-unit.gorduraRate),referenceNpv:(unit.tableNpv||unit.tableNominal)*(1-unit.gorduraRate)};
  state.simulations=[...state.simulations.filter((s)=>s.id!==simulation.id),simulation];render();toast("Proposta adicionada ao cenário pro forma.");
});
$("#simulation-list").addEventListener("change",(event)=>{const id=event.target.dataset.toggleSim;if(id){state.simulations=state.simulations.map((s)=>s.id===id?{...s,active:event.target.checked}:s);render();}});
$("#clear-data").addEventListener("click",()=>{if(confirm("Remover todas as bases e simulações deste navegador?")){state=clearState();render();toast("Dados locais removidos.");}});
$("#export-history").addEventListener("click",()=>{
  const rows=filteredHistory();const header=["Proposta","Produto","PEP","Canal","Tabela","BP","Proposta nominal","Proposta VPL","Custo comercial","Resultado nominal","Resultado real","Resultado real VPL"];
  const body=rows.map((r)=>[r.id,r.project,r.pep,r.channel,r.tableNominal,r.referenceNominal,r.proposalNominal,r.proposalNpv,r.commercialCost,r.nominalResult,r.realNominalResult,r.realNpvResult]);
  const csv=[header,...body].map((row)=>row.map((v)=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([`\uFEFF${csv}`],{type:"text/csv"}));a.download="historico-comercial.csv";a.click();URL.revokeObjectURL(a.href);
});
async function shareSimulation(id) {
  const s=state.simulations.find((x)=>x.id===id), line=s&&calculationLine(s);if(!s)return;
  const text=`Defesa comercial — ${s.project}\nUnidade: ${s.unit||s.pep}\nTabela: ${fullMoney.format(s.tableNominal)}\nProposta: ${fullMoney.format(s.proposalNominal)}\nResultado real VPL: ${fmtPct(line.realNpvResult)}\n\n${s.note||""}`.trim();
  if(navigator.share){try{await navigator.share({title:`Proposta ${s.id}`,text});return;}catch{}}
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener");
}
showView(state.view||"portfolio");

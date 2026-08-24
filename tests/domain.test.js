import test from "node:test";
import assert from "node:assert/strict";
import { BASE100_FACTOR, calculateMetrics, calculationLine, compareMetrics, isActiveStatus, monthlySummary, normalizeProposal, projectPortfolio, statusTone } from "../src/domain.js";
import { hydrateAppConfig } from "../src/config.js";
import { detectColumns, parseNumber, reconcile, rowsToDataset } from "../src/importer.js";
import { syncProductVisualConfig } from "../src/visual.js";

const sale = normalizeProposal({
  id:"V1", projectCode:"P1", project:"Singular", pep:"AP0901",
  referenceNominal:1_000_000, referenceNpv:900_000,
  proposalNominal:950_000, proposalNpv:870_000,
  commissionRate:.05,
});

test("calcula resultados consolidados pela razão entre totais", () => {
  const metrics=calculateMetrics([sale]);
  assert.equal(metrics.units,1);
  assert.equal(metrics.nominalVgv,950_000);
  assert.ok(Math.abs(metrics.nominalResult + .05)<1e-10);
  assert.equal(metrics.base100NpvResult,metrics.npvResult);
});

test("calcula resultado real líquido de comissão e prêmio", () => {
  const line=calculationLine({ ...sale, commissionValue:45_000, bonusValue:5_000 });
  assert.equal(line.commercialCost,50_000);
  assert.equal(line.budgetCost,40_000);
  assert.ok(Math.abs(line.realNpvResult-(820_000/860_000-1))<1e-10);
});

test("recalcula realizado x pro forma", () => {
  const simulation=normalizeProposal({ id:"S1",source:"simulation",projectCode:"P1",pep:"AP1001",referenceNominal:1_000_000,referenceNpv:900_000,proposalNominal:1_000_000,proposalNpv:900_000 });
  const result=compareMetrics([sale],[simulation]);
  assert.equal(result.realized.units,1);
  assert.equal(result.proForma.units,2);
  assert.ok(result.proForma.npvResult>result.realized.npvResult);
});

test("exclui cancelamentos e distratos dos indicadores", () => {
  assert.equal(isActiveStatus("Efetivada","ATIVO"),true);
  assert.equal(isActiveStatus("Efetivada","CANCELADO"),false);
  const cancelled=normalizeProposal({ ...sale,id:"V2",pep:"AP0902",proposalStatus:"Distrato" });
  assert.equal(calculateMetrics([sale,cancelled]).units,1);
});

test("importa cabeçalhos das cinco bases", () => {
  assert.deepEqual(detectColumns(["Código SAP","Nome Comercial","Total Unidades"],"projects"),{ code:"Código SAP",name:"Nome Comercial",totalUnits:"Total Unidades" });
  assert.deepEqual(detectColumns(["Código Empreendimento","PEP","Tabela Vigente","Status Unidade"],"units"),{ projectCode:"Código Empreendimento",pep:"PEP",tableNominal:"Tabela Vigente",status:"Status Unidade" });
  assert.deepEqual(detectColumns(["Código","AnoMês","Meta Unidades","Meta VGV"],"targets"),{ projectCode:"Código",month:"AnoMês",targetUnits:"Meta Unidades",targetVgv:"Meta VGV" });
  assert.deepEqual(detectColumns(["PEP","Categoria"],"categories"),{ pep:"PEP",category:"Categoria" });
});

test("interpreta números brasileiros", () => {
  assert.equal(parseNumber("R$ 1.234.567,89"),1_234_567.89);
  assert.equal(parseNumber("5,5%"),.055);
});

test("fixa diferencial Base 100 em 1", () => {
  const { records }=rowsToDataset([{ PEP:"A1",Empreendimento:"Gaea","Valor Tabela":"1.000.000","Valor Proposta":"950.000" }],"proposals");
  assert.equal(records[0].base100Factor,BASE100_FACTOR);
});

test("concilia De-Para, categoria e unidade por Código SAP e PEP", () => {
  const state=reconcile({
    projects:[{code:"100",name:"Singular"}],
    units:[{projectCode:"100",project:"Antigo",pep:"A-101",unit:"101",category:""}],
    categories:[{pep:"A101",category:"3 quartos"}],
    proposals:[{id:"P",project:"Antigo",pep:"A101",proposalNominal:10,proposalNpv:10}],
    targets:[],simulations:[],imports:{},
  });
  assert.equal(state.units[0].project,"Singular");
  assert.equal(state.units[0].category,"3 quartos");
  assert.equal(state.proposals[0].projectCode,"100");
});

test("monta carteira com estoque, meta e vendas", () => {
  const products=projectPortfolio({
    projects:[{code:"P1",name:"Singular",totalUnits:10}],
    units:[{projectCode:"P1",project:"Singular",pep:"1",status:"Disponível"},{projectCode:"P1",project:"Singular",pep:"2",status:"Vendida"}],
    proposals:[sale],targets:[{projectCode:"P1",targetUnits:2}],categories:[],simulations:[],
  });
  assert.equal(products[0].available,1);
  assert.equal(products[0].targetAchievement,.5);
});

test("prioriza permuta na matriz", () => {
  assert.equal(statusTone("Disponível",true),"exchange");
  assert.equal(statusTone("Contrato em processo"),"process");
  assert.equal(statusTone("Vendida"),"sold");
});

test("resume vendas, BP, cancelamentos e preços mensais sem inverter o sinal dos dados", () => {
  const proposals=[
    normalizeProposal({ id:"A",projectCode:"P1",pep:"1",accountingDate:"2026-03-10",proposalStatus:"Vendida",proposalNominal:1_000_000,correctedProposalNominal:1_050_000,area:100 }),
    normalizeProposal({ id:"B",projectCode:"P1",pep:"2",accountingDate:"15/03/2026",proposalStatus:"Cancelada",proposalNominal:900_000,area:90 }),
  ];
  const months=monthlySummary(proposals,[{projectCode:"P1",month:"2026-03",targetUnits:2,targetVgv:1_800_000}],2026);
  assert.equal(months[2].salesUnits,1);
  assert.equal(months[2].bpUnits,2);
  assert.equal(months[2].cancellations,1);
  assert.equal(months[2].nominalPrice,10_000);
  assert.equal(months[2].correctedPrice,10_500);
});

test("hidrata preferências do gráfico com cores nominais e corrigidas distintas", () => {
  const config=hydrateAppConfig({summary:{chart:{salesColor:"#111111"}}});
  assert.equal(config.summary.chart.salesColor,"#111111");
  assert.notEqual(config.summary.chart.nominalPriceColor,config.summary.chart.correctedPriceColor);
  assert.equal(config.summary.chart.showCancellations,true);
});

test("mantém implantação e posições isoladas por produto", () => {
  const units=[
    {pep:"A1",block:"Torre A",stack:"1",floor:"1",unit:"101"},
    {pep:"A2",block:"Torre A",stack:"1",floor:"2",unit:"201"},
  ];
  const first=syncProductVisualConfig({}, {id:"P1",name:"Produto 1",code:"P1"}, units);
  first.blocks[0].x=42;
  const saved=syncProductVisualConfig(first, {id:"P1",name:"Produto 1",code:"P1"}, units);
  const second=syncProductVisualConfig({}, {id:"P2",name:"Produto 2",code:"P2"}, [{...units[0],pep:"B1"}]);
  assert.equal(saved.blocks[0].x,42);
  assert.notEqual(second.productId,saved.productId);
  assert.deepEqual(saved.blocks[0].columns[0].unitIds,["A2","A1"]);
});

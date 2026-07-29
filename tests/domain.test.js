import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMetrics,
  compareMetrics,
  normalizeRecord,
  statusIsActive,
} from "../src/domain.js";
import { detectColumns, parseNumber, rowsToRecords } from "../src/importer.js";

const sale = normalizeRecord({
  id: "V1",
  project: "Singular",
  unit: "AP0901",
  referenceNominal: 1_000_000,
  referenceNpv: 900_000,
  proposalNominal: 950_000,
  proposalNpv: 870_000,
  commissionRate: 0.05,
  budgetCommissionRate: 0.04,
});

test("calcula indicadores ponderados pelos valores totais", () => {
  const metrics = calculateMetrics([sale]);
  assert.equal(metrics.units, 1);
  assert.equal(metrics.nominalVgv, 950_000);
  assert.ok(Math.abs(metrics.nominalResult - -0.05) < 1e-10);
  assert.ok(Math.abs(metrics.npvResult - (870_000 / 900_000 - 1)) < 1e-10);
  assert.equal(metrics.base100NpvResult, metrics.npvResult);
});

test("recalcula pro forma com realizado e simulações", () => {
  const simulation = normalizeRecord({
    id: "S1",
    project: "Singular",
    unit: "AP1001",
    referenceNominal: 1_000_000,
    referenceNpv: 900_000,
    proposalNominal: 1_000_000,
    proposalNpv: 900_000,
    source: "simulation",
  });
  const comparison = compareMetrics([sale], [simulation]);
  assert.equal(comparison.realized.units, 1);
  assert.equal(comparison.proForma.units, 2);
  assert.ok(comparison.proForma.npvResult > comparison.realized.npvResult);
});

test("considera somente vendas ativas no resumo do produto", () => {
  assert.equal(statusIsActive("Aprovada"), true);
  assert.equal(statusIsActive("Contrato assinado"), true);
  assert.equal(statusIsActive("Cancelada"), false);
  assert.equal(statusIsActive("Distrato concluído"), false);

  const cancelled = normalizeRecord({
    ...sale,
    id: "V2",
    unit: "AP0902",
    status: "Cancelada",
  });
  const metrics = calculateMetrics([sale, cancelled]);
  assert.equal(metrics.units, 1);
  assert.equal(metrics.nominalVgv, 950_000);
});

test("interpreta números brasileiros e percentuais", () => {
  assert.equal(parseNumber("R$ 1.234.567,89"), 1_234_567.89);
  assert.equal(parseNumber("5,5%"), 0.055);
  assert.equal(parseNumber("1250"), 1250);
});

test("reconhece aliases esperados da base geral", () => {
  const headers = ["Empreendimento", "PEP", "Valor Proposta", "VPL Proposta", "BP VPL"];
  assert.deepEqual(detectColumns(headers), {
    project: "Empreendimento",
    unit: "PEP",
    referenceNpv: "BP VPL",
    proposalNominal: "Valor Proposta",
    proposalNpv: "VPL Proposta",
  });
});

test("usa referências disponíveis e fixa Base 100 em 1", () => {
  const { records, warnings } = rowsToRecords([{
    Empreendimento: "Singular",
    PEP: "AP0901",
    "Valor Tabela": "1.000.000,00",
    "Valor Proposta": "950.000,00",
    "VPL Proposta": "900.000,00",
  }]);
  assert.equal(records[0].referenceNominal, 1_000_000);
  assert.equal(records[0].base100Factor, 1);
  assert.ok(warnings.some((warning) => warning.includes("Referência VPL")));
});

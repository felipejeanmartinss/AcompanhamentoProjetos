# Modelo de dados inicial

Esta primeira versão usa um modelo canônico no navegador. Cada linha importada ou simulada vira uma `CommercialProposal`.

## CommercialProposal

| Campo | Uso |
|---|---|
| `id` | Identificador da proposta |
| `source` | `import` ou `simulation` |
| `project` | Empreendimento |
| `unit` | Unidade ou PEP |
| `status` | Situação comercial |
| `approvalDate` | Data de aprovação/venda |
| `channel` | Canal ou empresa de vendas |
| `tableNominal` | Tabela comercial nominal |
| `referenceNominal` | BP/preço-meta nominal |
| `tableNpv` | Tabela comercial a VPL |
| `referenceNpv` | BP/preço-meta a VPL |
| `proposalNominal` | Valor nominal negociado |
| `proposalNpv` | Valor presente da proposta |
| `commissionValue` / `commissionRate` | Comissão realizada |
| `bonusValue` | Prêmio realizado |
| `budgetCommissionValue` / `budgetCommissionRate` | Comissão orçada |
| `budgetBonusValue` | Prêmio orçado |
| `base100Factor` | Fator de normalização; fixo em `1` nesta versão |
| `active` | Inclusão da simulação no cenário pro forma |

## Regras de cálculo

- Resultado nominal: `Σ proposta nominal / Σ referência nominal - 1`
- Resultado VPL: `Σ proposta VPL / Σ referência VPL - 1`
- Base 100 a VPL: `Σ(proposta VPL / fator) / Σ(referência VPL / fator) - 1`
- Custo comercial: `Σ(comissão + prêmio) / Σ proposta nominal`
- Resultado líquido: `(Σ proposta VPL - custos realizados) / (Σ referência VPL - custos orçados) - 1`
- Pro forma: realizado acrescido somente das simulações ativas

Os percentuais consolidados nunca são calculados pela média simples dos percentuais por proposta.

## Evolução preparada

O armazenamento local isola a persistência em `src/store.js`. Uma próxima etapa pode substituí-lo por uma API e banco relacional sem alterar o motor de cálculo ou o importador.

Entidades sugeridas para persistência:

- `projects`
- `units`
- `commercial_proposals`
- `proposal_cash_flows`
- `assumption_versions`
- `import_batches`
- `scenarios`

Tabela Zero e diferenciais devem entrar como uma versão de premissas ligada a unidades, preservando histórico e auditoria.

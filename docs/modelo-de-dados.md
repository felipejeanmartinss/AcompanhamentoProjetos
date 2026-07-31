# Modelo de dados

O estado da aplicação é separado em entidades que podem migrar do `localStorage` para uma API sem alterar o motor de cálculo.

| Entidade | Chave | Origem |
|---|---|---|
| `projects` | Código SAP | De – Para |
| `units` | PEP | Tabela Vigente & Disponibilidade |
| `proposals` | ID da proposta | Base geral de propostas |
| `targets` | Código SAP + mês | BP |
| `categories` | PEP | Categorias das Unidades |
| `simulations` | ID da simulação | Entrada do usuário |
| `imports` | Tipo da base | Metadados do lote importado |

## Conciliação

1. `projects.code → units.projectCode`
2. `categories.pep → units.pep`
3. `proposals.pep → units.pep`
4. `targets.projectCode → projects.code`

PEP é normalizado para comparação sem espaços, hífens ou pontuação. Código SAP permanece texto para preservar zeros à esquerda.

## Cálculos

- `BP nominal = tabela nominal × (1 − gordura)`
- `BP VPL = tabela VPL × (1 − gordura)`
- `custo realizado = comissão + prêmio`
- `custo orçado = 4% × BP nominal`
- `resultado nominal = Σ proposta nominal / Σ BP nominal − 1`
- `resultado VPL = Σ proposta VPL / Σ BP VPL − 1`
- `resultado real nominal = (Σ proposta nominal − Σ custo realizado) / (Σ BP nominal − Σ custo orçado) − 1`
- `resultado real VPL = (Σ proposta VPL − Σ custo realizado) / (Σ BP VPL − Σ custo orçado) − 1`

Base 100 permanece fixa em `1` nesta etapa. O campo já existe no modelo para futura versionagem de diferenciais.

## Próxima evolução

Persistência relacional sugerida: `projects`, `units`, `commercial_proposals`, `targets`, `unit_categories`, `scenarios`, `import_batches` e `project_media`. A implantação 2D pode ser adicionada com uma imagem por bloco e coordenadas por PEP; o compartilhamento já está encapsulado no fluxo do simulador.

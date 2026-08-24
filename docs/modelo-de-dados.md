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
| `appConfig` | Global | Preferências de Resumo, Disponibilidade, Simulação e Compartilhamento |
| `productVisualConfigs` | Código SAP / ID do produto | Identificação, imagem 2D, blocos, prumadas, posições e escalas |

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

## Configuração visual

`productVisualConfigs` é um mapa indexado pelo mesmo identificador usado na conciliação do produto. Cada entrada contém `productId`, `productName`, `sapCode`, `regional`, `backgroundImage`, `backgroundScale` e `blocks`.

Cada bloco registra `blockId`, `label`, `x`, `y`, `scale`, `columns` e `unitOrder`. As colunas guardam seus identificadores, ordem e PEPs associados. A matriz nasce das unidades importadas; a configuração acrescenta apenas a composição visual. O renderizador em `src/visual.js` é compartilhado por Disponibilidade, Simulação e preview do editor.

`appConfig.summary.chart` mantém cores e visibilidade das cinco séries. A configuração é global nesta versão, mas está encapsulada para aceitar um override por produto sem mudar o contrato do gráfico.

## Próxima evolução

O projeto Supabase atual já possui `projects.config` em JSONB, que pode receber `appConfig` e `productVisualConfigs` quando a autenticação e o serviço remoto forem integrados. A imagem deve migrar do Data URL local para um bucket de Storage, mantendo somente a URL no JSONB. Até essa integração, o adaptador oficial permanece `src/store.js`, sem acesso direto do componente visual ao banco.

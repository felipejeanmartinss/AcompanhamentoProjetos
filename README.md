# Acompanhamento Comercial de Empreendimentos

Aplicação web local para integrar produto, estoque, vendas, metas e simulações comerciais.

## Entregas

- carteira por produto com vendas, VGV, estoque, BP e resultado real VPL;
- detalhe do empreendimento com KPIs e matriz de unidades;
- histórico analítico filtrável e exportação CSV;
- simulador Realizado x Pro forma;
- cinco importações independentes: Propostas, Tabela Vigente & Disponibilidade, De–Para, BP e Categorias;
- conciliação por Código SAP e PEP;
- defesa comercial compartilhável pela Web Share API, com fallback para WhatsApp;
- persistência local, isolada em `src/store.js`;
- diferencial/Base 100 fixo em `1`.

## Experiência V6

- Resumo executivo com Vendas, BP e Cancelamentos em colunas, mantendo cancelamentos abaixo do eixo zero;
- R$/m² nominal e corrigido como pontos independentes, com cores configuráveis e sem linhas entre os meses;
- Configurações organizadas por Geral, Resumo, Disponibilidade, Simulação, Compartilhamento e Implantação por Produto;
- editor de implantação com imagem 2D, posicionamento e escala dos blocos e preview por empreendimento;
- uma única composição visual reutilizada em Disponibilidade e na defesa da Simulação;
- preferências e configurações visuais persistidas no estado local atual, já modeladas para futura gravação em `projects.config` no Supabase.

## Executar

```bash
npm run serve
```

Abra `http://localhost:4173`.

## Validar

```bash
npm run validate
```

O Excel é lido com SheetJS via CDN. CSV funciona sem dependência externa.

O upload da imagem da implantação aceita PNG, JPG e WEBP de até 2,5 MB. Nesta versão a imagem é mantida como Data URL no `localStorage`; a migração futura deve usar Storage e guardar apenas a URL em `projects.config`.

## Regras principais

- BP nominal = tabela nominal × (1 − gordura).
- BP VPL = tabela VPL × (1 − gordura).
- Comissão-base = 4% do BP nominal.
- Resultado real compara receita realizada líquida de comissão e prêmio com a referência líquida.
- Indicadores consolidados usam razão entre valores totais, nunca média de percentuais.
- Vendas canceladas, distratadas ou inativas permanecem no histórico, mas não compõem os KPIs.

Veja [docs/modelo-de-dados.md](docs/modelo-de-dados.md) para o desenho das entidades e a evolução para API/Supabase.

# Acompanhamento Comercial de Empreendimentos

MVP web para importar a base geral de propostas, acompanhar indicadores realizados e simular o impacto de novas propostas no resultado do empreendimento.

## O que está disponível

- Importação de XLSX, XLS e CSV com identificação automática dos principais cabeçalhos
- Conciliação básica de unidade e referência VPL
- Indicadores ponderados de VGV, resultado nominal, VPL, Base 100, custo comercial e resultado líquido
- Filtro por empreendimento e análise por canal
- Simulação de propostas com ativação individual
- Comparativo Realizado x Pro forma x Impacto
- Persistência local no navegador
- Fator Base 100 fixo em `1`; Tabela Zero ainda não faz parte desta versão

## Executar localmente

Sirva a raiz como conteúdo estático:

```bash
npm run serve
```

Depois abra `http://localhost:4173`.

O leitor de Excel é carregado pelo SheetJS via CDN. Sem conexão externa, exporte a planilha como CSV e use o importador normalmente.

## Validar

```bash
npm run validate
```

Não há dependências de build ou teste. O projeto usa o executor de testes nativo do Node.js.

## Estrutura

```text
index.html                  interface e diálogos
styles.css                 sistema visual responsivo
src/domain.js              modelo canônico e indicadores
src/importer.js            Excel/CSV, aliases e conciliação
src/store.js               persistência substituível
src/app.js                 estado e interação da interface
docs/modelo-de-dados.md     regras e caminho de evolução
public/modelo-importacao.csv modelo de entrada
tests/                     testes do motor e importador
```

## Limites desta primeira entrega

- A planilha de referência `data (1).xlsx` não estava disponível no ambiente de implementação; o importador foi preparado com aliases comuns da base descrita e oferece modelo CSV para conferência.
- Os dados ficam no navegador do usuário. A evolução natural é uma API com autenticação, banco relacional e histórico de versões/importações.
- O VPL é recebido da base ou informado na simulação; o fluxo parcela a parcela ainda não é calculado.

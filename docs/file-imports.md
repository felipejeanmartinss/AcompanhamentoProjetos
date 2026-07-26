# Importação CSV e OFX

## Fluxo

1. O usuário envia um arquivo de até 5 MB.
2. O servidor lê o conteúdo em memória, calcula SHA-256 e descarta os bytes.
3. CSV configurável ou OFX estruturado é normalizado para no máximo 1.000
   linhas de staging.
4. O usuário associa uma conta, escolhe categorias, corrige dados e ignora
   linhas.
5. O banco recalcula assinaturas e duplicidades a cada alteração.
6. A confirmação explícita cria todos os lançamentos e assinaturas em uma única
   transação.
7. Staging é apagado ao confirmar ou cancelar.

## CSV suportado

- delimitadores vírgula, ponto e vírgula, tabulação e barra vertical;
- cabeçalho opcional e até 20 linhas iniciais ignoradas;
- colunas de data, descrição e valor configuradas por posição;
- datas `DD/MM/AAAA`, `AAAA-MM-DD` ou `MM/DD/AAAA`;
- decimal com vírgula ou ponto;
- inversão opcional do sinal.

O parser suporta campos entre aspas, delimitadores dentro de campos e aspas
duplicadas. Não há detecção automática de layout nesta sprint.

## OFX suportado

São aceitos documentos SGML ou XML que contenham blocos fechados `STMTTRN`.
Os campos lidos são `DTPOSTED`, `TRNAMT`, `FITID`, `NAME` e `MEMO`. Arquivos
sem movimentações estruturadas são rejeitados.

## Duplicidades

O material da assinatura é:

```text
user_id|account_id|transaction_date|signed_amount_minor|normalized_description
```

A descrição é aparada, convertida para minúsculas e tem espaços repetidos
reduzidos. O material recebe SHA-256 no banco. A restrição única por usuário
protege contra confirmações concorrentes.

## Privacidade e descarte

- bytes originais não são persistidos;
- conteúdo financeiro não é registrado em logs;
- staging mantém apenas dados necessários à correção;
- confirmar ou cancelar apaga todo o staging;
- o job retém nome saneado, hash, configuração e contadores de auditoria.

## Limitações do MVP

- não há XLS, PDF, OCR nem layouts salvos por banco;
- não há categorização automática;
- não há importação de transferências ou compras de cartão;
- OFX sem blocos fechados `STMTTRN` não é aceito;
- duplicidades sem mesma data, valor e descrição precisam de revisão humana.

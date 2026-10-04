# Financial Architecture (Fase 06)

## Objetivo

Implementar motor financeiro interno sem gateway externo, mantendo separacao de responsabilidades para futura integracao real.

## Cadeia de dominio

`Contract -> ContractFinancialPlan -> Installment -> Charge -> Payment`

- `ContractFinancialPlan`: metadados da geracao financeira do contrato (regra, total, quantidade, primeiro vencimento, dueDay, versao, responsavel).
- `Installment`: obrigacao financeira prevista.
- `Charge`: cobranca/tentativa de cobranca (internal/manual nesta fase).
- `Payment`: recebimento efetivamente confirmado.

## Decisoes de modelagem

- Foi criada entidade `ContractFinancialPlan` para preservar contexto de geracao e suportar revisoes futuras sem reescrever historico.
- `Installment.status` nao persiste `OVERDUE`; vencimento e derivado por leitura:
  - `dueDate < hoje` e `balance > 0` e nao cancelada.
- `balance` nao e persistido; e derivado por:
  - `adjustedAmount - soma(payments CONFIRMED sem reversedAt)`.

## Valores monetarios

- Persistencia com `Decimal(14,2)`.
- API serializa monetario em string.
- Divisao em parcelas usa centavos inteiros para evitar erro de ponto flutuante.
- Distribuicao de centavos e deterministica:
  - base = `floor(totalCents / n)`
  - restante = `totalCents % n`
  - primeiros `restante` itens recebem +1 centavo.

## Datas

- `dueDate`: data civil (`YYYY-MM-DD`) em UTC 00:00.
- `paidAt`: instante real em UTC (`DateTime`).
- `dueDay` com clamp de fim de mes:
  - 31 em abril -> 30
  - 31 em fevereiro -> 28/29 conforme ano.

## Idempotencia e concorrencia

- Plano financeiro idempotente por `@unique(contractId)`.
- `Charge.idempotencyKey`, `Payment.idempotencyKey`, `externalReference` e `externalId` preparados para webhooks/gateways futuros.
- Operacoes criticas em transacao `Serializable`:
  - gerar plano
  - registrar pagamento
  - estornar pagamento
  - cancelar parcela
  - cancelar cobranca
- Overpayment e bloqueado em runtime com saldo calculado no contexto transacional.

## Regras operacionais

- Nao gerar plano automaticamente ao criar contrato em `DRAFT`.
- Geracao permitida para contratos `SIGNED`, `ACTIVE`, `EXPIRING`.
- Nao permitir editar valor/vencimento de parcela apos existir pagamento confirmado.
- Nao permitir cancelar parcela com pagamento confirmado.
- Estorno nao remove pagamento; marca `REVERSED` e guarda motivo, usuario e timestamp.

## Auditoria

Eventos financeiros auditados:

- `FINANCIAL_PLAN_CREATED`
- `INSTALLMENT_UPDATED`
- `INSTALLMENT_CANCELLED`
- `CHARGE_CREATED`
- `CHARGE_CANCELLED`
- `PAYMENT_RECORDED`
- `PAYMENT_REVERSED`

Metadados seguem minimizacao e nao armazenam dados sensiveis de meios de pagamento.

## Separacao financeiro e tecnico SST

- Inadimplencia nao altera automaticamente validade de PGR/PCMSO/LTCAT.
- Dominio financeiro e dominio tecnico SST permanecem desacoplados.

## Limites desta fase

Nao implementado:

- gateway real (Mercado Pago/Pagar.me/Stripe)
- PIX real / QR Code
- cartao real / tokenizacao
- boleto real
- webhooks externos
- checkout

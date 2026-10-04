# Domain Model (Conceitual)

Este documento descreve o modelo conceitual alvo. Nem todas as entidades estao implementadas no banco nesta fase.

## Organizacao

- Empresa SST (operadora)
- Cliente
- Estabelecimento
- Contrato
- Servico
- Parcela
- Pagamento

## Pessoas

- Profissional
- Trabalhador

## Nucleo Tecnico SST

- Ambiente
- Setor
- Cargo
- Atividade
- Perigo
- Agente
- Risco
- Exposicao
- Avaliacao
- EPI
- EPC

## Documentos SST

- Documento SST
- PGR
- PCMSO
- LTCAT
- Insalubridade
- Periculosidade
- Relatorio Analitico

## Bibliotecas e Conformidade

- Template de Segmento
- Norma

## Assinatura e Auditoria

- Assinatura
- Audit Log

## Fase 01 (Implementado no Banco)

- Usuario
- Papel de acesso (Role)
- Base para autenticacao

## Fase 02 (Implementado no Banco)

- Professional
- ProfessionalType
- Vinculo opcional User <-> Professional (0..1)
- lastLoginAt em User

## Fase 03 (Implementado no Banco)

- Client
- Establishment
- ClientContact
- DocumentType (CNPJ, CPF, OTHER)
- ClientStatus (PROSPECT, ACTIVE, INACTIVE, SUSPENDED)
- EstablishmentStatus (ACTIVE, INACTIVE, SUSPENDED)

Regras de dominio implementadas:

- Documento (taxId) e armazenado normalizado (somente digitos) e validado por tipo quando CNPJ/CPF.
- Unicidade de documento e aplicada por indice unico em tabela e validacao cruzada em servico para evitar duplicidade entre Client e Establishment.
- Um cliente pode ter varios estabelecimentos, mas apenas uma matriz ativa por vez.
- Estrategia adotada para matriz:
	- criacao/edicao com `isHeadquarters=true` falha com conflito se ja existir matriz;
	- troca de matriz e feita apenas via endpoint especifico transacional (`set-headquarters`).
- Um cliente pode ter varios contatos, mas apenas um contato principal por vez.
- Estrategia adotada para contato principal:
	- quando contato e criado/atualizado com `isPrimary=true`, os demais sao desmarcados na mesma transacao;
	- endpoint dedicado (`set-primary`) permite troca explicita e atomica.
- Exclusao logica por status/isActive (sem hard delete exposto na API).

## Fase 04 (Implementado no Banco)

- ServiceCatalog
- Contract
- ContractService
- ContractEstablishment
- ServiceCategory
- ContractStatus
- PaymentMethod

Regras de dominio implementadas:

- `Contract.contractNumber` e unico e normalizado em maiusculas.
- Periodo contratual aceita `endDate` ou `durationMonths`, com reconciliacao obrigatoria entre datas e duracao.
- `monthlyBaseValue` e calculado automaticamente a partir de `totalValue / durationMonths`.
- Valores monetarios sao persistidos em `Decimal(14,2)`.
- `ContractService` guarda snapshot de servico (`code/name/category/description`) para historico imutavel do item contratado.
- Nao e permitido adicionar servico inativo ao contrato.
- Nao e permitido vincular estabelecimento de outro cliente ao contrato.
- Transicoes de status sao controladas por maquina de estados no backend.
- Alteracoes estruturais (itens e estabelecimentos) sao bloqueadas para contratos em estados assinados/ativos/encerrados.

## Fase 05 (Implementado no Banco)

- ClientMembership

Regras de dominio implementadas:

- `User` e `Client` se relacionam em N:N por `ClientMembership`.
- Membership define quais empresas um usuario `CLIENT` pode acessar no portal.
- Membership possui ciclo de vida proprio (`isActive`, ativacao/desativacao/remocao logica por endpoint administrativo).
- Usuario `CLIENT` sem membership ativo nao acessa dados do portal.
- Cliente `SUSPENDED`/`INACTIVE` entra em modo informativo no portal (sem modulos operacionais).
- Central visual do portal deriva de `ContractService` ativo em contratos com status operacionais (`SIGNED`, `ACTIVE`, `EXPIRING`).
- Servicos repetidos sao agrupados por `serviceCodeSnapshot`, consolidando contratos relacionados.

## Fase 06 (Implementado no Banco)

- ContractFinancialPlan
- Installment
- Charge
- Payment
- InstallmentStatus (PENDING, PARTIALLY_PAID, PAID, CANCELLED)
- ChargeProvider (INTERNAL, MANUAL)
- ChargeStatus (PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED)
- PaymentStatus (CONFIRMED, REVERSED)

Regras de dominio implementadas:

- Plano financeiro e gerado por operacao explicita e unica por contrato.
- Gatilho de geracao exige status contratual operacional (`SIGNED`, `ACTIVE`, `EXPIRING`).
- Parcelas usam distribuicao deterministica de centavos para garantir soma exata ao total.
- `dueDate` de parcelas respeita data civil e ajuste de fim de mes (`dueDay` 29/30/31 conforme calendario real).
- `OVERDUE` e status derivado em tempo de consulta (`dueDate < hoje` e `balance > 0`) para evitar dependencia de job diario.
- `balance` e derivado de `adjustedAmount - pagamentos confirmados nao estornados`.
- Pagamento parcial suportado sem mutacao manual de status; status deriva do saldo.
- Overpayment e bloqueado no backend.
- Estorno nao remove pagamento; marca `Payment` como `REVERSED` com trilha de quem/quando/motivo.
- Cancelamento de parcela com pagamento confirmado e bloqueado; exige estorno anterior.
- `Charge` e `Payment` possuem campos de idempotencia/external reference para integracao futura com gateway.
- Historico financeiro permanece mesmo com contrato encerrado/terminado/cancelado.
- Inadimplencia financeira nao invalida automaticamente documentos tecnicos SST.

## Distincao arquitetural

- User representa identidade de acesso ao sistema.
- Professional representa cadastro operacional SST.
- Nem todo Professional precisa ter User.
- Nem todo User precisa ter Professional.

As demais entidades serao introduzidas incrementalmente em fases futuras.
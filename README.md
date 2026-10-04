# GESTAO SST

Plataforma Integrada de Saude e Seguranca do Trabalho.

## Visao Geral

Este repositorio contem a fundacao tecnica do sistema GESTAO SST em monorepo simples com npm workspaces.

Stack principal:

- Frontend: React + Vite + TypeScript + React Router + Tailwind + TanStack Query + React Hook Form + Zod
- Backend: Fastify + TypeScript + Zod + Prisma
- Banco: PostgreSQL

## Estrutura

```
gestao-sst/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── .env.example
└── docs raiz (*.md)
```

## Requisitos

- Node.js 18+
- npm 9+
- PostgreSQL 14+

## Instalacao

1. Instale dependencias:

```bash
npm install
```

2. Configure variaveis de ambiente:

```bash
cp .env.example .env
```

3. Ajuste `DATABASE_URL` e `JWT_SECRET` no `.env`.

## Prisma e Banco

Com banco configurado:

```bash
npm run prisma:validate -w @gestao-sst/api
npm run prisma:generate -w @gestao-sst/api
npm run prisma:migrate -w @gestao-sst/api -- --name init_auth
npm run prisma:status -w @gestao-sst/api
```

Para evolucoes de schema da Fase 02:

```bash
npm run prisma:migrate -w @gestao-sst/api -- --name users_professionals_rbac
```

Para evolucoes de schema da Fase 03:

```bash
npm run prisma:migrate -w @gestao-sst/api -- --name clients_establishments_contacts
```

Para evolucoes de schema da Fase 04:

```bash
npm run prisma:migrate -w @gestao-sst/api -- --name service_catalog_contracts
```

Para evolucoes de schema da Fase 05:

```bash
npm run prisma:migrate -w @gestao-sst/api -- --name client_portal_memberships
```

### DATABASE_URL

Formato esperado:

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gestao_sst?schema=public
```

### Bootstrap do primeiro SUPER_ADMIN

Comando administrativo:

```bash
npm run admin:create -w @gestao-sst/api
```

Entrada via variaveis de ambiente temporarias (nao versionadas):

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@empresa.com \
BOOTSTRAP_ADMIN_PASSWORD='SenhaForte123!' \
BOOTSTRAP_ADMIN_NAME='Administrador SST' \
npm run admin:create -w @gestao-sst/api
```

Regras do bootstrap:

- normaliza e-mail para minusculas;
- valida e-mail e politica de senha;
- nao cria duplicidade por e-mail;
- nao cria segundo SUPER_ADMIN;
- grava senha apenas com hash Argon2;
- registra evento `BOOTSTRAP_SUPER_ADMIN` em `AuditLog`.

## Execucao

Ambos (web + api):

```bash
npm run dev
```

Apenas web:

```bash
npm run dev:web
```

Apenas api:

```bash
npm run dev:api
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm run build
```

## Scripts de Workspace

- `dev`
- `dev:web`
- `dev:api`
- `build`
- `lint`
- `typecheck`

## Observacoes da Fase 01

- Apenas fundacao arquitetural.
- Modulos de negocio completos (contratos, financeiro, documentos SST) nao foram implementados.
- API versionada em `/api/v1` com endpoints minimos de saude e autenticacao.
- `GET /api/v1/health` informa saude da API e conectividade com banco sem expor credenciais.

## Fase 02 (Usuarios, Profissionais e RBAC)

### Modulos implementados

- Gestao de usuarios com listagem paginada, filtros, criacao, edicao, ativacao/desativacao e reset de senha.
- Gestao de profissionais com listagem paginada, filtros, cadastro, edicao e ativacao/desativacao.
- RBAC centralizado por permissoes, com regras anti-escalada e autoprotecao no backend.
- Registro de eventos administrativos em `AuditLog`.

### Endpoints principais da fase

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `POST /api/v1/users/:id/activate`
- `POST /api/v1/users/:id/deactivate`
- `POST /api/v1/users/:id/reset-password`
- `GET /api/v1/professionals`
- `POST /api/v1/professionals`
- `GET /api/v1/professionals/:id`
- `PATCH /api/v1/professionals/:id`
- `POST /api/v1/professionals/:id/activate`
- `POST /api/v1/professionals/:id/deactivate`

### Frontend

- Tela de usuarios: `Configuracoes > Usuarios`.
- Tela de profissionais: `Profissionais`.
- Autorizacao de UX via `can(permission)` com fallback server-side obrigatorio.

## Fase 03 (Clientes, Estabelecimentos e Contatos)

### Modulos implementados

- Gestao de clientes com listagem paginada, filtros, criacao, edicao e ativacao/desativacao.
- Gestao de estabelecimentos por cliente com regra de matriz unica.
- Gestao de contatos por cliente com regra de contato principal unico.
- Validacoes de CPF/CNPJ, CEP e telefone no backend com normalizacao persistida.
- Auditoria de operacoes administrativas em `AuditLog`.

### Endpoints principais da fase

- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/:id`
- `PATCH /api/v1/clients/:id`
- `POST /api/v1/clients/:id/activate`
- `POST /api/v1/clients/:id/deactivate`
- `GET /api/v1/clients/:id/establishments`
- `POST /api/v1/clients/:id/establishments`
- `GET /api/v1/establishments/:id`
- `PATCH /api/v1/establishments/:id`
- `POST /api/v1/establishments/:id/activate`
- `POST /api/v1/establishments/:id/deactivate`
- `POST /api/v1/establishments/:id/set-headquarters`
- `GET /api/v1/clients/:id/contacts`
- `POST /api/v1/clients/:id/contacts`
- `GET /api/v1/client-contacts/:id`
- `PATCH /api/v1/client-contacts/:id`
- `POST /api/v1/client-contacts/:id/activate`
- `POST /api/v1/client-contacts/:id/deactivate`
- `POST /api/v1/client-contacts/:id/set-primary`

### Frontend

- Tela de clientes: `Clientes`.
- Tela de detalhe do cliente: `Clientes > Detalhes` (`/clientes/:id`) com secoes de estabelecimentos e contatos.
- Rotas protegidas por permissionamento (`clients.read`, `establishments.read`, `clientContacts.read`).

## Fase 04 (Catalogo de Servicos e Contratos)

### Modulos implementados

- Catalogo de servicos com criacao, edicao, ativacao e desativacao.
- Contratos com vigencia (data inicial/final ou duracao), status, forma de pagamento e valores monetarios.
- Servicos contratados com snapshot do catalogo no momento do vinculo.
- Estabelecimentos abrangidos por contrato com validacao de pertencimento ao mesmo cliente.
- Regras de transicao de status e bloqueios estruturais para contratos assinados/ativos/encerrados.
- Auditoria de operacoes administrativas em `AuditLog`.

### Endpoints principais da fase

- `GET /api/v1/services`
- `POST /api/v1/services`
- `GET /api/v1/services/:id`
- `PATCH /api/v1/services/:id`
- `POST /api/v1/services/:id/activate`
- `POST /api/v1/services/:id/deactivate`
- `GET /api/v1/contracts`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts/:id`
- `PATCH /api/v1/contracts/:id`
- `POST /api/v1/contracts/:id/status`
- `GET /api/v1/contracts/:id/services`
- `POST /api/v1/contracts/:id/services`
- `GET /api/v1/contract-services/:id`
- `PATCH /api/v1/contract-services/:id`
- `POST /api/v1/contract-services/:id/remove`
- `GET /api/v1/contracts/:id/establishments`
- `POST /api/v1/contracts/:id/establishments`
- `POST /api/v1/contracts/:id/establishments/:establishmentId/remove`
- `GET /api/v1/clients/:id/contracts`
- `GET /api/v1/clients/:id/active-contract-services`

### Frontend

- Tela de contratos: `Contratos` (`/contratos`) com filtros por cliente e status.
- Tela de detalhe do contrato: `Contratos > Detalhes` (`/contratos/:id`) com secoes de status, servicos e estabelecimentos.
- Tela de catalogo de servicos: `Configuracoes > Servicos` (`/configuracoes/servicos`).
- Integracao do detalhe do cliente com listagem de contratos e atalho para criacao contextual.

## Fase 05 (Portal do Cliente e Central Visual de Servicos)

### Modulos implementados

- Portal do cliente separado da experiencia administrativa (`/portal/*`).
- Relacionamento explicito `User <-> Client` via `ClientMembership`.
- API dedicada e isolada para cliente em `/api/v1/client-portal/*`.
- Gestao administrativa de acessos ao portal na ficha de cliente.
- Selecao de empresa (quando multi-membership) e contexto de estabelecimentos no portal.
- Central visual de servicos derivada dinamicamente de contratos e servicos contratados.

### Endpoints principais da fase

- `GET /api/v1/client-portal/context`
- `GET /api/v1/client-portal/services`
- `GET /api/v1/client-portal/services/:code`
- `GET /api/v1/client-portal/contracts`
- `GET /api/v1/clients/:id/portal-users`
- `POST /api/v1/clients/:id/portal-users/create-access`
- `POST /api/v1/clients/:id/portal-users/link-existing`
- `POST /api/v1/client-memberships/:id/activate`
- `POST /api/v1/client-memberships/:id/deactivate`
- `POST /api/v1/client-memberships/:id/remove`

### Regras centrais do portal

- Usuario `CLIENT` acessa somente clientes com `ClientMembership.isActive=true`.
- Backend valida membership em toda requisicao de portal (anti-IDOR/horizontal access).
- Cliente `SUSPENDED`/`INACTIVE` opera em modo informativo (sem modulos operacionais).
- Cards exibem apenas servicos de contratos com status operacionais (`SIGNED`, `ACTIVE`, `EXPIRING`) e itens ativos.
- Servicos repetidos em contratos diferentes sao agrupados por `serviceCodeSnapshot`.

## Fase 06 (Motor Financeiro, Parcelas, Cobrancas e Pagamentos)

### Modulos implementados

- Motor financeiro interno derivado de contrato (`Contract -> ContractFinancialPlan -> Installment -> Charge -> Payment`).
- Geracao explicita de plano financeiro por contrato (sem auto-geracao em `DRAFT`).
- Suporte a parcelamento com distribuicao deterministica de centavos, sem perda/ganho monetario.
- Controle de vencimento civil com ajuste de fim de mes (`dueDay` 31 em meses menores, inclusive fevereiro/bissexto).
- Registro de recebimento manual com suporte a pagamento parcial, bloqueio de overpayment e estorno estruturado.
- Cobrancas internas/manuais preparadas para gateway futuro (provedor/status/idempotencia).
- Dashboard administrativo financeiro (`/financeiro`) com cards reais de receita/recebimento/a receber/vencido/proximo vencimento.
- Contas a receber com filtros e paginacao server-side.
- Portal do cliente com modulo financeiro de leitura (`/portal/financeiro`) isolado por `ClientMembership`.

### Endpoints principais da fase

- `GET /api/v1/finance/overview`
- `GET /api/v1/finance/receivables`
- `GET /api/v1/contracts/:contractId/financial-plan`
- `POST /api/v1/contracts/:contractId/financial-plan/preview`
- `POST /api/v1/contracts/:contractId/financial-plan`
- `GET /api/v1/contracts/:contractId/installments`
- `GET /api/v1/contracts/:contractId/finance-summary`
- `GET /api/v1/installments/:id`
- `PATCH /api/v1/installments/:id`
- `POST /api/v1/installments/:id/cancel`
- `GET /api/v1/installments/:id/payments`
- `POST /api/v1/installments/:id/payments`
- `POST /api/v1/payments/:id/reverse`
- `GET /api/v1/installments/:id/charges`
- `POST /api/v1/installments/:id/charges`
- `POST /api/v1/charges/:id/cancel`
- `GET /api/v1/client-portal/finance/installments`

### Regras centrais financeiras

- `OVERDUE` e derivado de `dueDate < hoje` com `balance > 0`; nao depende de job diario para flip de estado.
- `balance` e derivado de `adjustedAmount - soma(pagamentos confirmados e nao estornados)`.
- Nao ha delete de pagamento confirmado; estorno registra trilha (`reversedAt`, `reversedByUserId`, `reversalReason`).
- Cancelamento de parcela com pagamento confirmado e bloqueado; exige estorno previo.
- Inadimplencia financeira nao invalida automaticamente documentos SST.
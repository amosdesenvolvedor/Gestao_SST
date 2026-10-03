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
- Modulos de negocio completos (clientes, contratos, financeiro, documentos SST) nao foram implementados.
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
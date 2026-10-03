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
npm run prisma:generate -w @gestao-sst/api
npm run prisma:migrate -w @gestao-sst/api
```

Bootstrap do primeiro administrador:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@empresa.com \
BOOTSTRAP_ADMIN_PASSWORD='SenhaForte123!' \
npm run bootstrap:admin -w @gestao-sst/api
```

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
# Project Architecture

## Fluxo Arquitetural

React
-> API
-> Fastify
-> Camada de aplicacao/dominio
-> Prisma
-> PostgreSQL

## Monorepo

- `apps/web`: SPA administrativa em React.
- `apps/api`: API REST Fastify versionada.
- `packages/shared`: contratos compartilhados (tipos/schemas/enums puros).

## Frontend

- Roteamento com React Router.
- Estado remoto via TanStack Query.
- Camada central de HTTP em `services`/`lib`.
- Layout autenticado com sidebar + header + conteudo.
- Rotas privadas com protecao por autenticacao.

## Backend

Estrutura principal:

- `src/config`: ambiente e configuracao.
- `src/lib`: prisma, jwt, hash de senha.
- `src/plugins`: seguranca, auth guard, cors, helmet.
- `src/modules`: modulos por dominio (fase atual: `auth`).
- `src/shared`: utilitarios de erro e resposta.

## Autenticacao

- Login server-side.
- Senhas com Argon2.
- Sessao via JWT assinado em cookie `httpOnly`.
- Endpoints: `login`, `logout`, `me`.

## Autorizacao / RBAC

- Enum centralizado de papeis no pacote shared.
- Pre-handler de autorizacao no backend.
- Guardas de rota no frontend para areas privadas e acesso negado.

## Regras Arquiteturais

- Frontend nunca acessa PostgreSQL direto.
- Validacao critica no servidor.
- Regras sensiveis de negocio ficam no backend.
- Segredos apenas no servidor.
- Tratamento central de erros sem stack trace em producao.
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

## Dois Contextos de Interface

- Admin Portal (`/dashboard`, `/clientes`, `/contratos`, ...): operacao interna da empresa SST.
- Client Portal (`/portal`, `/portal/servicos`, `/portal/documentos`, `/portal/empresa`): experiencia simplificada para role `CLIENT`.
- Layouts separados:
	- `AdminLayout` preservado.
	- `ClientPortalLayout` dedicado com identidade grafite/cinza/branco.

## Backend

Estrutura principal:

- `src/config`: ambiente e configuracao.
- `src/lib`: prisma, jwt, hash de senha.
- `src/plugins`: seguranca, auth guard, cors, helmet.
- `src/modules`: modulos por dominio (fase atual: `auth`, `users`, `professionals`, `clients`, `service-catalog`, `contracts`).
- `src/shared`: utilitarios de erro e resposta.

## Modulos de Dominio Implementados

- `auth`: login/logout/me e validacao de sessao por cookie JWT.
- `users`: administracao de contas e regras anti-escalada.
- `professionals`: cadastro operacional SST.
- `clients`: clientes, estabelecimentos e contatos.
- `service-catalog`: catalogo de servicos padronizados.
- `contracts`: contratos, servicos contratados e estabelecimentos abrangidos.
- `client-portal`: contexto seguro do portal, central visual de servicos e contratos de leitura.

## Contratos e Catalogo (Fase 04)

- Persistencia via Prisma com entidades `ServiceCatalog`, `Contract`, `ContractService` e `ContractEstablishment`.
- Valores monetarios em `Decimal(14,2)` no banco e serializacao em string na API.
- Datas civis (`YYYY-MM-DD`) convertidas para UTC no backend para evitar ambiguidade de fuso.
- Snapshot de servico no vinculo contratual (codigo/nome/categoria/descricao) para preservar historico.
- Regras de status por maquina de estados e bloqueio de alteracoes estruturais em contratos assinados/ativos/encerrados.

## Isolamento de Portal (Fase 05)

- Vinculo explicito de acesso via `ClientMembership` (N:N entre `User` e `Client`).
- API isolada para clientes em `/api/v1/client-portal/*`.
- Backend nunca confia apenas no `clientId` enviado pelo frontend; valida membership ativo em runtime.
- Protecao anti-IDOR aplicada para `clientId`, `establishmentId` e `serviceCode`.

## Frontend (Rotas de Negocio)

- `/clientes` e `/clientes/:id`.
- `/contratos` e `/contratos/:id`.
- `/configuracoes/servicos`.
- Protecao por permissao em todas as rotas de negocio, com validacao definitiva no backend.

## Autenticacao

- Login server-side.
- Senhas com Argon2.
- Sessao via JWT assinado em cookie `httpOnly`.
- Endpoints: `login`, `logout`, `me`.

## Autorizacao / RBAC

- Enum centralizado de papeis no pacote shared.
- Matriz centralizada role -> permissions no pacote shared.
- Pre-handler de autorizacao por permissao no backend.
- Guardas de rota por permissao no frontend para UX.

## Regras de Seguranca da Fase 02

- Validacao server-side de usuario ativo em toda requisicao autenticada.
- Nao permitir escalada para SUPER_ADMIN por perfis nao autorizados.
- Nao permitir desativar o ultimo SUPER_ADMIN ativo.
- Nao permitir alteracao do proprio papel de acesso.
- Nao expor `passwordHash` em respostas de API.

## User x Professional

- `User`: conta de acesso e autenticacao.
- `Professional`: cadastro operacional/técnico SST.
- Relacao opcional `Professional.userId` (0..1).
- Um profissional pode existir sem conta e uma conta pode existir sem profissional.

## Regras Arquiteturais

- Frontend nunca acessa PostgreSQL direto.
- Validacao critica no servidor.
- Regras sensiveis de negocio ficam no backend.
- Segredos apenas no servidor.
- Tratamento central de erros sem stack trace em producao.
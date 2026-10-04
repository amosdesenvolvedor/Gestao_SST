# Security

## Principios adotados na fundacao

- Secrets apenas no servidor.
- Variaveis de ambiente obrigatorias para segredos.
- Validacao server-side com Zod.
- Autorizacao server-side (RBAC inicial).
- Senhas com hash Argon2.
- Politica inicial de senha centralizada e reutilizavel no backend.
- Cookie de sessao `httpOnly` para reduzir exposicao a XSS.
- CORS explicito por origem.
- Headers de seguranca com Helmet.
- Logs estruturados sem vazar senha/token.
- Tratamento centralizado de erros sem stack trace em producao.

## LGPD (base arquitetural)

- Minimizacao de dados.
- Controle de acesso por papel.
- Rastreabilidade para futura trilha de auditoria.
- Segregacao de responsabilidades.
- Preparacao para retencao e descarte controlados.
- Protecao de dados sensiveis por design.

## Pendencias planejadas

- Rate limiting por rota e contexto de autenticacao.
- Rotacao de segredo JWT.
- Revogacao de sessao com refresh token/stateful session quando necessario.
- Trilha de auditoria completa.
- Politicas de backup e recuperacao.

## Autenticacao e Sessao

- JWT assinado no servidor e enviado em cookie `httpOnly`.
- Cookie usa `sameSite=lax`, `path=/` e `secure=true` apenas em producao.
- Em desenvolvimento, `secure=false` para permitir fluxo local entre portas diferentes.
- CORS com `credentials=true` e origem explicita via `API_CORS_ORIGIN`.
- Guard de autenticacao valida no banco se o usuario continua ativo.
- JWT antigo de usuario desativado deixa de autorizar acesso.

## Bootstrap Administrativo

- Criacao do primeiro SUPER_ADMIN via comando administrativo dedicado.
- Credenciais recebidas por variaveis de ambiente temporarias locais.
- Nao ha credenciais fixas no repositorio.
- Criacao inicial registra evento `BOOTSTRAP_SUPER_ADMIN` no `AuditLog`.

## RBAC e Privilegios

- Autorizacao server-side por permissao, nao apenas por role.
- Regras contra escalada de privilegio:
	- perfis nao SUPER_ADMIN nao promovem para SUPER_ADMIN;
	- perfis nao SUPER_ADMIN nao administram contas SUPER_ADMIN.
- Regras de autoprotecao:
	- nao desativar o proprio usuario administrativo;
	- nao desativar o ultimo SUPER_ADMIN ativo;
	- nao alterar o proprio papel para elevar privilegios.

## Auditoria Administrativa

- Eventos de usuarios: criacao, atualizacao, ativacao, desativacao, reset de senha e alteracao de papel.
- Eventos de profissionais: criacao, atualizacao, ativacao e desativacao.
- Eventos de clientes/estabelecimentos/contatos: criacao, atualizacao, ativacao/desativacao e trocas de principal/matriz.
- Eventos de catalogo/contratos: criacao/atualizacao/ativacao/desativacao de servicos, criacao/atualizacao de contratos, mudanca de status, inclusao/remocao de servicos contratados e inclusao/remocao de estabelecimentos abrangidos.
- Sem armazenamento de senha, hash, JWT ou segredos no `AuditLog`.

## Regras de Integridade da Fase 04

- Validacao estrita server-side de datas civis de contrato (`YYYY-MM-DD`).
- Validacao de valores monetarios positivos com armazenamento em `Decimal(14,2)`.
- Bloqueio de alteracoes estruturais em contratos assinados/ativos/encerrados para reduzir risco operacional.
- Validacao de pertencimento de estabelecimento ao mesmo cliente do contrato.
- Snapshot do catalogo em `ContractService` para trilha historica e resiliencia a alteracoes futuras no catalogo.

## Isolamento do Portal do Cliente (Fase 05)

- Acesso do portal separado por API dedicada (`/api/v1/client-portal/*`).
- Modelo de autorizacao horizontal por `ClientMembership` (user-client), sem inferencia por e-mail/CNPJ/nome.
- Toda requisicao de portal valida membership ativo em runtime.
- IDs informados pelo frontend (`clientId`, `establishmentId`, `serviceCode`) passam por validacao de escopo antes de consulta.
- Tentativas de acesso cruzado entre clientes (IDOR) retornam 403/404 sem vazamento de dados.

## Ciclo de Vida de Membership

- Eventos auditados:
	- `CLIENT_MEMBERSHIP_CREATED`
	- `CLIENT_MEMBERSHIP_ACTIVATED`
	- `CLIENT_MEMBERSHIP_DEACTIVATED`
	- `CLIENT_MEMBERSHIP_REMOVED`
- Membership inativo bloqueia acesso mesmo com JWT valido.
- Usuario inativo continua bloqueado pelo guard de autenticacao existente.

## Seguranca Financeira (Fase 06)

- Separacao explicita entre obrigacao (`Installment`), cobranca (`Charge`) e recebimento (`Payment`).
- Operacoes financeiras criticas em transacao `Serializable` para reduzir risco de estado parcial e corrida.
- Overpayment bloqueado no backend com validacao de saldo derivado no momento da escrita.
- Pagamento confirmado nao e deletado; reversao marca estado e preserva trilha.
- Cancelamento de parcela com pagamento confirmado e bloqueado.
- Campos de idempotencia (`idempotencyKey`) e referencia externa (`externalReference`/`externalId`) preparados para webhooks futuros sem duplicidade de recebimento.
- `dueDate` (civil) separado de `paidAt` (instante UTC) para evitar drift de fuso.
- Auditoria financeira com eventos:
	- `FINANCIAL_PLAN_CREATED`
	- `INSTALLMENT_UPDATED`
	- `INSTALLMENT_CANCELLED`
	- `CHARGE_CREATED`
	- `CHARGE_CANCELLED`
	- `PAYMENT_RECORDED`
	- `PAYMENT_REVERSED`

## Separacao Financeiro x SST

- Inadimplencia financeira nao invalida automaticamente documentos tecnicos (PGR, PCMSO, LTCAT etc.).
- Regras de validade tecnica permanecem independentes do status financeiro.

## Dados de Cartao e Segredos de Pagamento

- O sistema nao armazena PAN completo, CVV, senha ou trilha sensivel de cartao.
- Nesta fase nao ha gateway real, tokenizacao, webhook externo ou checkout integrado.
- Qualquer integracao futura devera delegar dados sensiveis de cartao ao gateway especializado.
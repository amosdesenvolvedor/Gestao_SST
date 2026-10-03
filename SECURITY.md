# Security

## Principios adotados na fundacao

- Secrets apenas no servidor.
- Variaveis de ambiente obrigatorias para segredos.
- Validacao server-side com Zod.
- Autorizacao server-side (RBAC inicial).
- Senhas com hash Argon2.
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
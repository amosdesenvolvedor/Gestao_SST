# RBAC

## Roles existentes

- SUPER_ADMIN
- ADMIN
- SST_MANAGER
- SAFETY_ENGINEER
- SAFETY_TECHNICIAN
- OCCUPATIONAL_PHYSICIAN
- RH
- FINANCIAL
- CLIENT
- VIEWER

## Permissions existentes

- dashboard.read
- users.read
- users.create
- users.update
- users.activate
- users.deactivate
- users.resetPassword
- professionals.read
- professionals.create
- professionals.update
- professionals.activate
- professionals.deactivate
- audit.read
- settings.read
- settings.update

## Matriz atual

- SUPER_ADMIN: todas as permissions atuais.
- ADMIN: users.* (exceto bloqueios de SUPER_ADMIN por regra de seguranca), professionals.*, settings.* e dashboard.read.
- SST_MANAGER: dashboard.read, professionals.read.
- SAFETY_ENGINEER: dashboard.read, professionals.read.
- SAFETY_TECHNICIAN: dashboard.read, professionals.read.
- OCCUPATIONAL_PHYSICIAN: dashboard.read, professionals.read.
- RH: dashboard.read, users.read, professionals.read/create/update.
- FINANCIAL: dashboard.read.
- CLIENT: dashboard.read.
- VIEWER: dashboard.read, professionals.read.

## Regras anti-escalada

- ADMIN nao cria SUPER_ADMIN.
- ADMIN nao altera role para SUPER_ADMIN.
- Perfis nao SUPER_ADMIN nao administram contas SUPER_ADMIN.
- API rejeita chamadas sem permissao com 403, mesmo que o frontend oculte botoes.

## Regras de autoprotecao

- Usuario nao altera o proprio papel.
- Usuario nao desativa a propria conta administrativa.
- Ultimo SUPER_ADMIN ativo nao pode ser desativado.

## User x Professional

- User: conta de autenticacao/autorizacao.
- Professional: cadastro tecnico-operacional.
- Professional pode existir sem User.
- User pode existir sem Professional.
- Vinculo opcional por `professional.userId` sem duplicar dados de senha/autenticacao.

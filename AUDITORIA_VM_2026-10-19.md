# GestãoSST — atualização da auditoria da VM

> Atualização: o deploy foi posteriormente autorizado e concluído.
> Consulte `RELEASE_v1.1.0-rc.1_DEPLOY_REPORT.md` para o estado final.

Data: 19/10/2026. Esta atualização substitui as limitações de acesso remoto
registradas em `AUDITORIA_GO_E_RELEASE_2026-10-19.md`; o planejamento Go e
a conferência das fases daquele relatório permanecem válidos.

## Acesso confirmado

VM `145.241.206.41`, usuário `ubuntu`, SSH na porta 22. O usuário autorizou
expressamente a chave de deploy correta. Hostname retornado: `gestao-sst`.
O endereço `104.21.71.163` é o endereço do proxy Cloudflare do domínio.

## Inventário observado

| Item | Resultado |
| --- | --- |
| Sistema | Ubuntu 24.04.5 LTS |
| Arquitetura | x86_64 |
| CPU | 2 processadores lógicos |
| RAM | 954 MiB totais; aproximadamente 400 MiB disponíveis no momento da consulta |
| Swap | Ausente |
| Disco raiz | 45 GB totais; 3,4 GB usados; 41 GB disponíveis |
| Node / npm | v20.20.2 / 10.8.2 |
| PostgreSQL | Cluster 16-main online |
| API | `gestao-sst-api.service`, usuário ubuntu, aproximadamente 135 MiB no cgroup |
| Diretório ativo | `/opt/gestao-sst` |
| API interna | `127.0.0.1:3333` |
| PostgreSQL | `127.0.0.1:5432` |
| Nginx | Portas 80/443; frontend em `/opt/gestao-sst/apps/web/dist` |
| Proxy API | `/api/` para `http://127.0.0.1:3333` |

O serviço inicia com `npm run start -w @gestao-sst/api`. A instalação usa
arquivos copiados, sem diretório `.git` identificado. Os artefatos da API e
frontend têm data de 14/10/2026; não há revisão Git publicada identificável.
Variáveis de ambiente e chaves existentes foram preservadas, sem exibir conteúdo.

## Banco e compatibilidade

O banco `gestao_sst` contém nove migrations concluídas, sem marcação de rollback.
Todos os nove checksums coincidem com os arquivos da versão candidata.
O `package-lock.json` também coincide com o local:
`d715154919f4a0b21157331a2b5a2752886fcc032aea35cbae0e9e3cc5bc3d9f`.

Está pendente exclusivamente a migration existente:
`20261015113554_sst_07b1_organizational_core`.
SHA256: `99ffa14c57019c81b25dca1f82a9e4894607320dcb250400a4fda424285f8c78`.

Ela cria `SstSector`, `SstWorkEnvironment`, `SstRole`, `SstActivity` e
`SstWorkSchedule`, três enums, índices e chaves estrangeiras. Acrescenta
um índice único em `Establishment(clientId,id)`. A consulta da pré-condição
retornou zero grupos duplicados. Não há comandos de exclusão ou atualização
de dados nessa migration; a criação do índice pode bloquear escritas brevemente.

Não foi aplicada nenhuma migration. A autorização anterior para deploy não
foi interpretada como revogação da proibição explícita de alterar o banco.

## Funcionamento

Health check consultado diretamente na API: `api: ok`, `database: ok`.
As consultas públicas anteriores retornaram frontend 200, sessão anônima 401
e rota SST 404. Isso é consistente com a ausência de publicação do núcleo SST.

## Release preparada e autorização pendente

Versão candidata no GitHub: `v1.1.0-rc.1`, commit `3bebcd8`.
Build, checagem de tipos, lint e os cinco arquivos de testes selecionados passaram.
Pacote local: `/tmp/gestao-sst-release-3bebcd8.tar.gz`, 567743 bytes.
SHA256: `33914627c6ae3a1efc5b6a8888945a50b623ea4afd28f441b03071f0c0e5ee5e`.
O pacote contém código versionado e builds; não inclui `.env`, chaves ou node_modules.

Próximos passos, após autorização específica para banco e breve reinício:

1. Criar backup privado do banco e cópia recuperável da instalação ativa.
2. Preparar release separada com os builds locais e dependências compatíveis.
3. Gerar Prisma Client para o schema novo, sem compilar o frontend na VM.
4. Aplicar somente a migration SST pendente, com verificação antes/depois.
5. Validar a API candidata e trocar os artefatos com rollback disponível.
6. Reiniciar somente a API durante a troca; preservar Nginx e PostgreSQL.
7. Confirmar health, frontend, proteção de rotas e disponibilidade da rota SST.

Em falha, restaurar a aplicação anterior. Reversão da aplicação não desfaz
automaticamente a migration; não excluir tabelas ou dados como rollback automático.
Sem alteração de financeiro, contratos, modelos novos, Go ou configuração Nginx.

## Impacto no plano Go

A RAM medida é limitada para Chromium e concorrência de PDFs. Recomenda-se
piloto com renderização Go nativa, um trabalho por vez e medição de pico de RAM.
Build fora da VM, limites por serviço e validação de folga antes da ativação.
Não instalar ou ativar Go nesta publicação.

## Estado final desta etapa

Acesso e auditoria interna concluídos; pacote preparado; deploy ainda não
executado. Somente comandos de leitura foram executados na VM. Backup,
migration e troca do processo ativo aguardam autorização específica.

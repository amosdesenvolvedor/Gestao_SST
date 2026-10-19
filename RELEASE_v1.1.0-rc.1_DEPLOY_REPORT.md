# GestãoSST — deploy controlado v1.1.0-rc.1

Data: 19/10/2026. Publicação realizada aproximadamente às 19h22
(America/Porto_Velho; 23h22 UTC).

**Estado: release publicada e verificações concluídas.** Este documento
atualiza o estado de publicação registrado nas auditorias anteriores.

## 1. Identificação da publicação

- Domínio: https://gestaosst.digital
- VM: `ubuntu@145.241.206.41`, hostname `gestao-sst`, porta SSH 22.
- Tag: `v1.1.0-rc.1`.
- Commit da aplicação: `3bebcd833320de8eaa2bebb441eab938d5db22d2`.
- Release ativa: `/opt/gestao-sst-releases/v1.1.0-rc.1-3bebcd8`.
- Caminho estável: `/opt/gestao-sst`, agora um link para a release ativa.
- Rollback da aplicação: `/opt/gestao-sst-releases/pre-v1.1.0-rc.1-20261019T232200Z`.
- O commit de documentação deste relatório não altera o código publicado nem a tag.

## 2. Pré-deploy

Identidade do servidor, banco `gestao_sst`, serviços, ambiente e recursos
foram conferidos antes da troca. PostgreSQL 16.15, Node 20.20.2 e Ubuntu
24.04.5 LTS, arquitetura x86_64. A VM tem 2 processadores lógicos, 954 MiB
de RAM, sem swap, e aproximadamente 41 GB disponíveis no disco raiz.

A API anterior estava saudável em `127.0.0.1:3333`. Nginx já servia
`/opt/gestao-sst/apps/web/dist` e encaminhava `/api/` para a API interna.
A instalação anterior era feita por cópia de arquivos, sem `.git` no destino;
o serviço systemd inicia `npm run start -w @gestao-sst/api`.

A tag remota foi conferida. As fontes do pacote coincidem com os 168
arquivos da tag. Lockfile local e remoto coincidem. As variáveis obrigatórias,
origem CORS, banco, host interno e configuração de sessão foram validados
sem imprimir segredos. O `.env` foi preservado byte a byte e está com modo 600
na nova release.

Entre 109 arquivos ativos de fonte comparados, as diferenças existentes
estavam em `app.ts`, integração de testes financeiros, adaptador Mercado Pago,
detalhe do cliente e permissões compartilhadas. O núcleo SST era novo no destino.
No adaptador financeiro, a tag inclui tipagem do payload, identificador do item
e normalização da resposta de preferência. Nenhum código financeiro foi editado
nesta execução e nenhum fluxo de cobrança foi executado.

O banco não tinha drift em relação ao schema anterior. Os nove checksums
das migrations aplicadas coincidiam. O diff para o novo schema correspondia
exatamente às 41 instruções SQL da migration autorizada.

## 3. Backups gerados e verificados

Diretório privado, fora da publicação:

`/home/ubuntu/gestao-sst-backups/20261019T231800Z-v1.1.0-rc.1`

| Arquivo | Conteúdo e verificação |
| --- | --- |
| `postgresql-cluster.sql.gz` | Dump completo do cluster via pg_dumpall; gzip íntegro |
| `gestao_sst.dump` | Dump custom do banco; catálogo e leitura integral via pg_restore verificados |
| `application-before.tar.gz` | Aplicação anterior completa, incluindo API, frontend e ambiente; catálogo e arquivos essenciais verificados |
| `recovery-config.tar.gz` | Nginx, unidade systemd da API e configurações PostgreSQL; catálogo legível |
| `SHA256SUMS` | Checksums conferidos após geração e novamente antes da troca |

Diretório com modo 700 e conteúdo sem acesso para grupo/outros. Configurações,
credenciais e backups não foram enviados ao Git. Não foi feita restauração
experimental do banco; a verificação de legibilidade não substitui um ensaio
completo de recuperação.

Também foram preservados nesse diretório o log da migration, contagens de
tabelas e logs dos smoke tests e do serviço durante a publicação.

## 4. Migration

Aplicada exclusivamente:

`20261015113554_sst_07b1_organizational_core`

Mecanismo: Prisma 5.22.0, `prisma migrate deploy`, após confirmar novamente
que esta era a única migration pendente.

Criadas as tabelas `SstSector`, `SstWorkEnvironment`, `SstRole`, `SstActivity`
e `SstWorkSchedule`, três enums, índices e relacionamentos. A pré-condição
do índice único de estabelecimento não apresentou duplicidades.

- Histórico final: 10 migrations concluídas.
- `prisma migrate status`: atualizado.
- `prisma migrate diff`: nenhuma diferença após a aplicação.
- Contagens das 20 tabelas anteriores preservadas após a migration e os smoke tests.
- Nenhum seed, reset, db push, exclusão ou restauração de banco foi executado.

## 5. Build e preparação da release

Build, checagem de tipos, lint e os cinco arquivos de testes selecionados
haviam passado para as fontes da versão candidata. O frontend de produção
usa `https://gestaosst.digital` como origem da API.

O pré-deploy detectou arquivos antigos na raiz de `dist` da API. Foi feita
compilação limpa fora da VM. A saída atual do TypeScript em `apps/api/src`
foi mapeada para `apps/api/dist` no pacote, mantendo compatibilidade com
`npm start`. Nenhum código-fonte foi alterado para esse ajuste de empacotamento.

Pacote efetivamente publicado:

`gestao-sst-v1.1.0-rc.1-clean.tar.gz`

SHA256: `2ca729d40702c25924c2551203efa95625e4dc9d2a14746e4d91d5e1ff12c2ac`.

O manifesto de 329 arquivos foi verificado antes e depois da publicação.
As dependências foram copiadas para a release separada, com lockfile idêntico;
o Prisma Client foi gerado nessa cópia. Não houve instalação de Go nem build
pesado na VM. As permissões do frontend foram ajustadas e sua leitura pelo
usuário Nginx foi verificada. Assets anteriores foram mantidos para compatibilidade
com páginas já abertas.

## 6. Serviços e publicação

A instalação anterior foi preservada integralmente. O caminho estável passou
a apontar para a nova release. Foi reiniciado **somente `gestao-sst-api`**.

Nginx e PostgreSQL permaneceram ativos, sem reinício ou mudança de configuração.
Não houve alteração de DNS ou serviços externos. Não foi necessário rollback.
Na conferência final, a API usava aproximadamente 99 MiB no cgroup e havia
426 MiB de RAM disponível. O systemd registrou zero reinícios automáticos.

## 7. Smoke tests e endpoints

| Verificação | Resultado |
| --- | --- |
| `GET https://gestaosst.digital/` | 200; HTML idêntico ao build |
| JS e CSS referenciados pelo frontend | Disponíveis; SHA256 idêntico ao build |
| `GET /api/v1/health`, interno e público | 200; `api: ok`, `database: ok` |
| `GET /api/v1/auth/me`, sem sessão | 401 |
| `GET /api/v1/auth/me`, sessão inválida | 401 |
| `GET /api/v1/auth/me`, sessão temporária de usuário existente | 200, identidade conferida |
| `POST /api/v1/auth/login`, corpo vazio | 400, validação de entrada |
| `GET /api/v1/sst/sectors`, sem sessão, interno e público | 401; anteriormente era 404 |
| `GET /api/v1/sst/sectors`, sessão administrativa válida | 200 |
| `GET /api/v1/sst/work-environments`, sessão administrativa válida | 200 |
| `GET /api/v1/sst/roles`, sessão administrativa válida | 200 |
| `GET /api/v1/sst/activities`, sessão administrativa válida | 200 |
| `GET /api/v1/sst/work-schedules`, sessão administrativa válida | 200 |
| Existência das cinco tabelas SST | Confirmada |
| Integridade do manifesto da release ativa | Confirmada |
| Preservação das contagens anteriores | Confirmada nas 20 tabelas |
| Logs críticos da API na janela da troca | Zero entradas identificadas |

Os testes autenticados foram feitos contra a API candidata e depois contra
a API publicada, pela interface interna. Foram usadas sessões JWT de curta
duração para usuário existente, geradas somente em memória. Nenhum usuário,
cliente, setor ou transação financeira foi criado para os testes.

## 8. Limitações e pendências

- Não havia usuário ativo com papel restrito para exercitar 403 na VM.
  O teste negativo de RBAC foi explicitamente marcado como não executado;
  os testes locais de RBAC e isolamento existentes haviam passado.
- Login positivo por senha não foi exercitado; foram verificados a sessão
  válida, as rejeições de sessão e a validação do endpoint de login.
- Não foram realizados testes de interface em navegador nem fluxos financeiros.
- O aviso de bundle JavaScript maior que 500 kB permanece; não impediu o build.
- O build padrão precisa de ajuste futuro para evitar a mistura de saídas
  antigas e subdiretórios. O pacote desta publicação foi corrigido e verificado.
- Há uso preexistente de `z.coerce.boolean()` na configuração: a string
  `"false"` é interpretada como verdadeira. O arquivo e o ambiente já estavam
  assim na instalação anterior; não foram alterados nesta publicação.
  A correção deve ser tratada separadamente, com testes de configuração.
- As credenciais anteriormente removidas do `.env.example` ainda precisam
  de rotação no provedor, caso isso não tenha sido realizado externamente.
- As entregas 07C.1 e 07C.2 continuam sem comprovação documental/funcional
  suficiente. A publicação confirma o núcleo organizacional 07B.1.
- A VM tem pouca RAM para uma futura engine PDF concorrente ou Chromium.
  Go permanece apenas em planejamento.

## 9. Recuperação disponível

Em falha posterior, é possível apontar `/opt/gestao-sst` para a instalação
anterior preservada e reiniciar apenas a API, após avaliar compatibilidade.
A migration adicionou estruturas e não foi revertida. Nenhuma exclusão de
tabelas ou restauração do banco deve ser automática. Os backups permanecem
privados para uma recuperação decidida expressamente.

## 10. Estado final

Frontend e API publicados com a tag `v1.1.0-rc.1`, PostgreSQL online,
migration SST aplicada, dados anteriores preservados e aplicação saudável
nas verificações realizadas. Nenhum novo módulo ou serviço Go foi iniciado.

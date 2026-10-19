# GestãoSST — auditoria e versão candidata de 19/10/2026

## Escopo e situação

Revisão do código local e das branches remotas do repositório
`amosdesenvolvedor/Gestao_SST`. O usuário autorizou versionamento e deploy
nesta segunda execução. A integração Go continua somente em planejamento.

O deploy não foi realizado: o endereço informado, `104.21.71.163`, atende
ao domínio pela Cloudflare e a conexão SSH na porta 22 expirou. Falta
confirmar o endereço de origem. O usuário indicou `~/.ssh/vm-deploy-key`,
porta 22 e um exemplo com `root`; a tentativa com essa combinação no IP
informado também expirou antes da autenticação. Nenhuma
migration, alteração de banco, instalação ou reinício foi feito em produção.

## Git e conteúdo da versão

- Base local e remota de `master`: `e6fd71d`.
- `origin/main`: `a94980a`, contendo apenas o README inicial.
- Antes desta revisão: 26 arquivos rastreados modificados e 25 arquivos novos.
- O conjunto existente inclui evolução financeira, autenticação, interface,
  quatro migrations e estrutura organizacional SST. Essas alterações foram
  preservadas; seu versionamento não comprova publicação em produção.
- Versão candidata proposta: `v1.1.0-rc.1`, sem alterar as versões dos pacotes npm.
- Credenciais encontradas no `.env.example` foram removidas antes do envio.
  Devem ser rotacionadas no provedor. Nenhuma chave SSH ou `.env` será incluído.

## Conferência das fases

| Fase | Evidência | Conclusão |
| --- | --- | --- |
| 07A | `PHASE_07A_CANONICAL_SST_MODEL.md` | Planejamento canônico local existente |
| 07B.1 | Migration `20261015113554_sst_07b1_organizational_core`, módulo `sst-organization`, interface e testes | Recorte implementado localmente |
| 07B integral | Não há comprovação de todos os critérios do planejamento | Não declarar concluída |
| 07C.1 | Nenhuma identificação explícita ou critérios de aceite nas branches examinadas | Entrega não comprovada |
| 07C.2 | Nenhuma identificação explícita ou critérios de aceite nas branches examinadas | Entrega não comprovada |

Os rótulos 07C.1 e 07C.2 não têm especificação disponível para comparação.
Portanto, ausência do nome não prova ausência de toda funcionalidade que
possa ter recebido esses nomes em outro contexto.

### Funcionalidade SST efetivamente presente

Cinco recursos registrados em `/api/v1/sst/`: `sectors`,
`work-environments`, `roles`, `activities` e `work-schedules`.
Há listagem, consulta, criação, atualização, ativação e desativação.
Validação Zod, permissões `sst.structure.read`/`sst.structure.manage`,
verificação de escopo e auditoria estão presentes.

O Prisma contém `SstSector`, `SstWorkEnvironment`, `SstRole`,
`SstActivity` e `SstWorkSchedule`, com relações compostas e índices.
A interface de estrutura SST está integrada ao detalhe do cliente.

### Funcionalidades ainda incompletas

- `/gestao-sst`, `/documentos` e `/relatorios` são páginas provisórias.
- O portal de documentos exibe estado vazio de implementação futura.
- Não há engine PDF nem ciclo completo de elaboração, revisão, aprovação,
  publicação e armazenamento documental implementado.
- A recuperação de senha local é uma interface com mensagem de confirmação;
  não há endpoint correspondente de envio/redefinição no módulo de autenticação.
- O roadmap ainda descreve a fase 07 somente como planejamento 07A.

## Produção: evidências disponíveis

Consultas HTTP em 19/10/2026, sem login e sem escrita:

| Consulta | Resultado |
| --- | --- |
| Frontend `/` | HTTP 200, HTML |
| `/api/v1/auth/me` | HTTP 401, JSON |
| `/api/v1/health` | `api: ok`, `database: ok` |
| `/api/v1/sst/sectors` | HTTP 404, JSON |

O 404 diverge da rota registrada localmente: versão ou roteamento publicado
precisam ser verificados. O health check executa `SELECT 1`; não comprova
compatibilidade do schema inteiro e atualmente pode responder HTTP 200
mesmo quando informa indisponibilidade do banco no corpo.

Não há scripts de deploy, unidades systemd, configuração PM2, Nginx ou
workflow de produção identificados no repositório. O `migrate deploy` do
executor financeiro destina-se exclusivamente ao banco de testes.

Não foram verificados internamente: SO, CPU, RAM, disco, serviços, portas,
processos Node, configuração Nginx, versão PostgreSQL, migrations aplicadas,
backup ou revisão publicada. A raiz atual do projeto não contém a chave
SSH informada. Há arquivos `vm-deploy-key` em `~/.ssh`, indicados posteriormente pelo usuário para acesso à VM. A conexão
não chegou à etapa de autenticação. Nenhum conteúdo dessas chaves foi exibido.

## Validação local

- Cinco arquivos de testes selecionados terminaram com código zero: rotas
  SST, serviços SST, cálculo comercial, previsão financeira e guardas do
  executor de integração. Foram usados mocks e conexão fictícia, sem banco real.
- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado nos três workspaces.
- `VITE_API_BASE_URL=https://gestaosst.digital npm run build`: aprovado nos
  três workspaces. Vite emitiu aviso de chunk JavaScript maior que 500 kB
  (aproximadamente 518 kB, 135 kB gzip); não impediu o build.
- `git diff --check` dos arquivos rastreados: aprovado. A checagem do conjunto
  preparado também apontou linhas vazias no fim dos dois SQL SST existentes.
  Os SQL foram preservados para não alterar possíveis checksums de migrations.
- Testes financeiros de integração com banco não foram executados.
- Varredura de padrões de chaves e tokens realizada nos arquivos candidatos;
  não substitui uma auditoria completa de segredos ou do histórico remoto.

## Arquitetura recomendada para Go

Criar futuramente `services/sst-document-engine/`, com módulo Go próprio:

```text
cmd/server/
internal/http/
internal/contracts/
internal/render/
internal/templates/
internal/jobs/
testdata/
go.mod
```

Fluxo: React → Fastify → autorização/escopo → Prisma → snapshot autorizado
→ engine Go → PDF e metadados → Fastify → entrega autorizada e auditoria.

Fastify mantém autenticação, RBAC, seleção dos dados, isolamento por cliente,
auditoria e autorização de status/download. Go não recebe credenciais do
PostgreSQL nem consulta o banco principal. Gerar PDF não implica aprovação
técnica ou publicação. As permissões documentais específicas ainda precisam
ser definidas antes da integração.

### Bibliotecas

- HTTP/JSON/contexto/logs: `net/http`, `encoding/json`, `context`, `log/slog`.
- Testes: `testing`, `net/http/httptest`, fuzzing e `go test -race`.
- PDF piloto: avaliar `signintech/gopdf` com um modelo técnico representativo.
- Alternativa comercial: UniPDF, após avaliação de licença e comunicação externa.
- HTML/CSS complexo: avaliar Chromium isolado somente se necessário.
- Evitar iniciar com `go-pdf/fpdf`, cujo repositório está arquivado.

### Comunicação e controles

HTTP/JSON versionado sobre Unix socket com permissões restritas. Alternativa:
loopback com autenticação própria entre serviços. Não expor engine pelo Nginx.
Não compartilhar o segredo JWT dos usuários com o serviço.

Contrato: versão, request ID, cliente, estabelecimento, solicitante,
modelo/versão, snapshot, hash e idempotência. Retorno: identificador, estado,
versão do renderizador, hash do PDF e erro padronizado quando necessário.
Revalidar autorização em cada consulta e download. Limitar corpo, tempo,
concorrência e fila; bloquear modelos, URLs e caminhos arbitrários.
Se usar HMAC, incluir expiração, nonce e proteção contra replay.

As gravações SST e auditoria atuais são separadas. No ciclo documental,
definir consistência transacional ou recuperação explícita antes de publicar.

### Recursos e execução

Estimativas para validação, não medições da VM: 20–60 MB ocioso;
100–300 MB durante um PDF moderado; Chromium pode consumir 300–800 MB
ou mais. Iniciar com um trabalho por vez e medir CPU, pico de RAM e duração.
Documentos grandes podem ultrapassar essas faixas.

Compilar fora da VM para a arquitetura Linux confirmada. Executar binário
versionado via systemd, usuário próprio, limites de recursos e diretórios
privados. Começar com geração síncrona limitada. Assíncrono exige persistência,
idempotência, retenção, recuperação e backpressure. Um spool privado em disco
é opção de piloto sem novos modelos Prisma, mas deve ter escrita atômica e
recuperação testada; fila exclusivamente em memória não é durável.

## Plano de deploy e rollback

1. Confirmar SSH de origem e inventariar a VM com comandos de leitura.
2. Identificar aplicação ativa, gerenciador de processos e revisão publicada.
3. Comparar migrations e schema sem aplicar alterações automaticamente.
4. Confirmar backup restaurável e caminho de rollback da aplicação.
5. Se faltar schema, apresentar as migrations necessárias antes de executá-las:
   a autorização de deploy não elimina a restrição anterior de alteração do banco.
6. Preparar release isolada, dependências fixadas pelo lockfile, Prisma Client
   compatível e frontend com URL pública correta; não copiar `.env` ou chaves.
7. Validar release antes de trocar o processo ativo; manter artefato anterior.
8. Verificar frontend, API, banco, autenticação e rotas SST após a publicação.
9. Em falha, retornar à release anterior. Reversão de binário não desfaz migrations;
   compatibilidade retroativa e recuperação do banco exigem plano próprio.

Para Go, publicar primeiro sem tráfego, com flag desabilitada, health check,
checksum e binário anterior disponível. Liberar piloto após homologação.
Não modificar Nginx, financeiro, contratos, IA ou assinaturas para introduzir Go.

## Etapas incrementais e riscos

Completar auditoria da VM → conciliar fases e versão publicada → aprovar
modelo piloto → definir contratos/permissões/auditoria → implementar engine
local com dados fictícios → validar renderização e recursos → integrar em
homologação → avaliar fila durável → ativar piloto controlado.

Testar contratos TS/Go, isolamento por cliente, replay, timeout, cancelamento,
reinício, idempotência, paginação, fontes e comparação visual dos PDFs.

Riscos: versão local diferente de produção; quatro migrations sem estado
remoto confirmado; evolução financeira misturada ao snapshot; documentação
desatualizada; auditoria não atômica; schema documental ausente; capacidade
da VM desconhecida. A tag candidata preserva o código e não certifica deploy.

## Referências

- https://www.cloudflare.com/ips-v4/
- https://pkg.go.dev/net/http
- https://pkg.go.dev/net/http/httptest
- https://github.com/signintech/gopdf
- https://github.com/go-pdf/fpdf
- https://github.com/unidoc/unipdf/blob/master/LICENSE.md
- https://docs.unidoc.io/unipdf/faq/security/does-unipdf-send-my-documents-anywhere/

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

type Mode = 'check' | 'prepare' | 'run'

const TEST_FILE = 'src/modules/finance/annual-advance-flow.integration.test.ts'
const DEFAULT_POSTGRES_PORT = 5432
const LOOPBACK_HOST = 'loopback'

type HostKind = 'loopback' | 'ipv4' | 'ipv6' | 'hostname'

type Endpoint = {
  original: string
  host: string
  hostKind: HostKind
  port: number
  database: string
  schema: string
  username: string | null
  params: Record<string, string>
}

type EndpointComparisonVerdict = 'same' | 'different' | 'ambiguous'

type EndpointComparison = {
  verdict: EndpointComparisonVerdict
  reason: string
}

type ValidatedConfig = {
  mode: Mode
  testEndpoint: Endpoint
  developmentEndpoint: Endpoint
  productionEndpoint: Endpoint
  allowedHosts: Set<string>
  allowedPorts: Set<number>
  testDatabaseNameRegex: RegExp
  testIdentityMarker: string
}

function fail(message: string): never {
  console.error(`[finance-integration-test] ${message}`)
  process.exit(1)
}

function normalizeHost(rawHost: string): { host: string; kind: HostKind } {
  const host = rawHost.trim().replace(/\.$/, '').toLowerCase()

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0:0:0:0:0:0:0:1') {
    return {
      host: LOOPBACK_HOST,
      kind: 'loopback',
    }
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return {
      host,
      kind: 'ipv4',
    }
  }

  if (host.includes(':')) {
    return {
      host,
      kind: 'ipv6',
    }
  }

  return {
    host,
    kind: 'hostname',
  }
}

function parseRequiredList(rawValue: string | undefined, variableName: string): string[] {
  if (!rawValue || !rawValue.trim()) {
    throw new Error(`${variableName} deve ser informado e nao pode ser vazio.`)
  }

  const values = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (values.length === 0) {
    throw new Error(`${variableName} deve conter pelo menos um valor.`)
  }

  return values
}

function parseMode(rawArg: string | undefined): Mode {
  if (!rawArg || rawArg === 'check') {
    return 'check'
  }

  if (rawArg === 'prepare' || rawArg === 'run') {
    return rawArg
  }

  fail(`Modo invalido: ${rawArg}. Use check, prepare ou run.`)
}

function parseEndpoint(urlText: string, label: string): Endpoint {
  let parsed: URL
  try {
    parsed = new URL(urlText)
  } catch {
    throw new Error(`${label} invalido: URL malformada.`)
  }

  if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
    throw new Error(`${label} deve usar protocolo postgres:// ou postgresql://.`)
  }

  const port = parsed.port ? Number(parsed.port) : DEFAULT_POSTGRES_PORT
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${label} possui porta invalida.`)
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!database) {
    throw new Error(`${label} precisa incluir nome explicito do banco.`)
  }

  if (database.includes('/')) {
    throw new Error(`${label} contem nome de banco invalido.`)
  }

  const schema = parsed.searchParams.get('schema')?.trim() || 'public'

  const params: Record<string, string> = {}
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!params[key]) {
      params[key] = value
    }
  }

  const normalizedHost = normalizeHost(parsed.hostname)

  return {
    original: urlText,
    host: normalizedHost.host,
    hostKind: normalizedHost.kind,
    port,
    database,
    schema,
    username: parsed.username ? decodeURIComponent(parsed.username) : null,
    params,
  }
}

function endpointSummary(endpoint: Endpoint): string {
  return `${endpoint.host}:${endpoint.port}/${endpoint.database}?schema=${endpoint.schema}`
}

function compareEndpoints(a: Endpoint, b: Endpoint): EndpointComparison {
  if (a.host === b.host) {
    if (a.port === b.port && a.database === b.database && a.schema === b.schema) {
      return {
        verdict: 'same',
        reason: 'Mesmo host, porta, database e schema.',
      }
    }

    return {
      verdict: 'different',
      reason: 'Host igual, mas endpoint logico diferente por porta/database/schema.',
    }
  }

  const hasHostname = a.hostKind === 'hostname' || b.hostKind === 'hostname'
  if (hasHostname) {
    return {
      verdict: 'ambiguous',
      reason: 'Comparacao ambigua entre hostnames/IP sem prova de isolamento fisico.',
    }
  }

  return {
    verdict: 'different',
    reason: 'Hosts IP distintos e normalizados.',
  }
}

function assertDifferentOrFail(testEndpoint: Endpoint, referenceEndpoint: Endpoint, label: string) {
  const comparison = compareEndpoints(testEndpoint, referenceEndpoint)
  if (comparison.verdict === 'same') {
    throw new Error(`TEST_DATABASE_URL coincide com ${label}. ${comparison.reason}`)
  }

  if (comparison.verdict === 'ambiguous') {
    throw new Error(`TEST_DATABASE_URL e ${label} sao ambiguos. ${comparison.reason}`)
  }
}

function assertEndpointInAllowlist(testEndpoint: Endpoint, allowedHosts: Set<string>, allowedPorts: Set<number>) {
  if (!allowedHosts.has(testEndpoint.host)) {
    throw new Error('Host de TEST_DATABASE_URL nao permitido por TEST_DB_ALLOWED_HOSTS.')
  }

  if (!allowedPorts.has(testEndpoint.port)) {
    throw new Error('Porta de TEST_DATABASE_URL nao permitida por TEST_DB_ALLOWED_PORTS.')
  }
}

export function buildValidatedConfig(rawEnv: NodeJS.ProcessEnv, mode: Mode): ValidatedConfig {
  if (rawEnv.NODE_ENV !== 'test') {
    throw new Error('NODE_ENV deve ser explicitamente test para executar verificacoes de integracao.')
  }

  const testDatabaseUrl = rawEnv.TEST_DATABASE_URL?.trim()
  const developmentDatabaseUrl = rawEnv.DEVELOPMENT_DATABASE_URL?.trim()
  const productionDatabaseUrl = rawEnv.PRODUCTION_DATABASE_URL?.trim()

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL nao definido.')
  }

  if (!developmentDatabaseUrl) {
    throw new Error('DEVELOPMENT_DATABASE_URL nao definido.')
  }

  if (!productionDatabaseUrl) {
    throw new Error('PRODUCTION_DATABASE_URL nao definido.')
  }

  const testDatabaseNameRegexRaw = rawEnv.TEST_DATABASE_NAME_REGEX?.trim()
  if (!testDatabaseNameRegexRaw) {
    throw new Error('TEST_DATABASE_NAME_REGEX nao definido.')
  }

  let testDatabaseNameRegex: RegExp
  try {
    testDatabaseNameRegex = new RegExp(testDatabaseNameRegexRaw)
  } catch {
    throw new Error('TEST_DATABASE_NAME_REGEX invalido.')
  }

  const allowedHostValues = parseRequiredList(rawEnv.TEST_DB_ALLOWED_HOSTS, 'TEST_DB_ALLOWED_HOSTS')
  const allowedPortValues = parseRequiredList(rawEnv.TEST_DB_ALLOWED_PORTS, 'TEST_DB_ALLOWED_PORTS')

  const allowedHosts = new Set(allowedHostValues.map((value) => normalizeHost(value).host))
  const allowedPorts = new Set<number>()

  for (const rawPort of allowedPortValues) {
    const port = Number(rawPort)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error('TEST_DB_ALLOWED_PORTS contem valor invalido.')
    }
    allowedPorts.add(port)
  }

  const testIdentityMarker = rawEnv.TEST_DATABASE_IDENTITY_MARKER?.trim()
  if (!testIdentityMarker) {
    throw new Error('TEST_DATABASE_IDENTITY_MARKER nao definido.')
  }

  const requiredTestDbUser = rawEnv.TEST_DATABASE_REQUIRED_USERNAME?.trim()
  if (!requiredTestDbUser) {
    throw new Error('TEST_DATABASE_REQUIRED_USERNAME nao definido.')
  }

  const testEndpoint = parseEndpoint(testDatabaseUrl, 'TEST_DATABASE_URL')
  const developmentEndpoint = parseEndpoint(developmentDatabaseUrl, 'DEVELOPMENT_DATABASE_URL')
  const productionEndpoint = parseEndpoint(productionDatabaseUrl, 'PRODUCTION_DATABASE_URL')

  if (!testDatabaseNameRegex.test(testEndpoint.database)) {
    throw new Error('Nome do banco de teste nao atende ao padrao definido em TEST_DATABASE_NAME_REGEX.')
  }

  if (testEndpoint.username !== requiredTestDbUser) {
    throw new Error('Usuario de TEST_DATABASE_URL nao corresponde a TEST_DATABASE_REQUIRED_USERNAME.')
  }

  const markerFromUrl = testEndpoint.params.application_name?.trim()
  if (markerFromUrl !== testIdentityMarker) {
    throw new Error('TEST_DATABASE_URL deve conter application_name igual a TEST_DATABASE_IDENTITY_MARKER.')
  }

  assertEndpointInAllowlist(testEndpoint, allowedHosts, allowedPorts)

  const shellDatabaseUrl = rawEnv.DATABASE_URL?.trim()
  if (shellDatabaseUrl) {
    const shellEndpoint = parseEndpoint(shellDatabaseUrl, 'DATABASE_URL')
    const comparison = compareEndpoints(testEndpoint, shellEndpoint)
    if (comparison.verdict !== 'different') {
      throw new Error('TEST_DATABASE_URL nao pode coincidir ou ser ambiguo com DATABASE_URL do shell.')
    }
  }

  assertDifferentOrFail(testEndpoint, developmentEndpoint, 'DEVELOPMENT_DATABASE_URL')
  assertDifferentOrFail(testEndpoint, productionEndpoint, 'PRODUCTION_DATABASE_URL')

  return {
    mode,
    testEndpoint,
    developmentEndpoint,
    productionEndpoint,
    allowedHosts,
    allowedPorts,
    testDatabaseNameRegex,
    testIdentityMarker,
  }
}

export function buildChildEnv(rawEnv: NodeJS.ProcessEnv, config: ValidatedConfig): NodeJS.ProcessEnv {
  return {
    ...rawEnv,
    NODE_ENV: 'test',
    DATABASE_URL: config.testEndpoint.original,
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
    // Block external payment integrations by default during integration tests.
    MERCADO_PAGO_ENABLED: 'false',
    MERCADO_PAGO_ACCESS_TOKEN: undefined,
    MERCADO_PAGO_WEBHOOK_SECRET: undefined,
    MERCADO_PAGO_WEBHOOK_NOTIFICATION_URL: undefined,
    MERCADO_PAGO_TEST_PAYER_EMAIL: undefined,
  }
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
  })

  if (result.error) {
    fail(`Falha ao executar ${command}: ${result.error.message}`)
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }

  if (result.signal) {
    fail(`Processo interrompido por sinal: ${result.signal}`)
  }
}

function main() {
  const mode = parseMode(process.argv[2])
  let config: ValidatedConfig
  try {
    config = buildValidatedConfig(process.env, mode)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada ao validar ambiente.'
    fail(message)
  }

  const target = endpointSummary(config.testEndpoint)

  if (mode === 'check') {
    console.log('[finance-integration-test] preflight concluido (modo check).')
    console.log(`[finance-integration-test] target database: ${target}`)
    console.log('[finance-integration-test] nenhum comando de banco foi executado.')
    return
  }

  console.log('[finance-integration-test] preflight concluido')
  console.log(`[finance-integration-test] target database: ${target}`)

  const childEnv = buildChildEnv(process.env, config)

  runCommand('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], childEnv)

  if (mode === 'prepare') {
    console.log('[finance-integration-test] migrations aplicadas no banco de teste (modo prepare).')
    return
  }

  const revalidated = buildValidatedConfig(childEnv, mode)
  const runEnv = buildChildEnv(childEnv, revalidated)
  runCommand('node', ['--import', 'tsx', '--test', TEST_FILE], runEnv)
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMainModule) {
  main()
}

export {
  compareEndpoints,
  endpointSummary,
  normalizeHost,
  parseEndpoint,
}

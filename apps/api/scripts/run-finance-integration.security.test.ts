import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChildEnv,
  buildValidatedConfig,
  compareEndpoints,
  normalizeHost,
  parseEndpoint,
} from './run-finance-integration.js'

function makeBaseEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    TEST_DATABASE_URL:
      'postgresql://gestao_sst_test_role:__test_pwd__@127.0.0.1:55432/gestao_sst_finance_test?schema=public&application_name=gestao-sst-finance-it',
    DEVELOPMENT_DATABASE_URL:
      'postgresql://gestao_sst_dev_role:__dev_pwd__@127.0.0.1:5432/gestao_sst_dev?schema=public',
    PRODUCTION_DATABASE_URL:
      'postgresql://gestao_sst_prod_role:__prod_pwd__@10.10.20.20:5432/gestao_sst_prod?schema=public',
    TEST_DB_ALLOWED_HOSTS: '127.0.0.1,::1',
    TEST_DB_ALLOWED_PORTS: '55432',
    TEST_DATABASE_NAME_REGEX: '^gestao_sst_finance_test$',
    TEST_DATABASE_IDENTITY_MARKER: 'gestao-sst-finance-it',
    TEST_DATABASE_REQUIRED_USERNAME: 'gestao_sst_test_role',
    ...overrides,
  }
}

test('normalizeHost converte aliases locais para loopback', () => {
  assert.deepEqual(normalizeHost('localhost'), { host: 'loopback', kind: 'loopback' })
  assert.deepEqual(normalizeHost('127.0.0.1'), { host: 'loopback', kind: 'loopback' })
  assert.deepEqual(normalizeHost('::1'), { host: 'loopback', kind: 'loopback' })
})

test('parseEndpoint extrai identidade estrutural de conexao', () => {
  const endpoint = parseEndpoint(
    'postgresql://user:pwd@localhost/test_db?schema=public&application_name=runner-it',
    'TEST_DATABASE_URL',
  )

  assert.equal(endpoint.host, 'loopback')
  assert.equal(endpoint.port, 5432)
  assert.equal(endpoint.database, 'test_db')
  assert.equal(endpoint.schema, 'public')
  assert.equal(endpoint.username, 'user')
  assert.equal(endpoint.params.application_name, 'runner-it')
})

test('compareEndpoints marca hostname diferente como ambiguo', () => {
  const testEndpoint = parseEndpoint(
    'postgresql://u:p@test-db.internal:5432/gestao_sst_finance_test?schema=public&application_name=it',
    'TEST_DATABASE_URL',
  )
  const referenceEndpoint = parseEndpoint(
    'postgresql://u:p@db.prod.internal:5432/gestao_sst_finance_test?schema=public&application_name=it',
    'PRODUCTION_DATABASE_URL',
  )

  const result = compareEndpoints(testEndpoint, referenceEndpoint)
  assert.equal(result.verdict, 'ambiguous')
})

test('buildValidatedConfig exige variaveis obrigatorias de protecao', () => {
  assert.throws(
    () => buildValidatedConfig(makeBaseEnv({ TEST_DB_ALLOWED_HOSTS: '' }), 'check'),
    /TEST_DB_ALLOWED_HOSTS/,
  )

  assert.throws(
    () => buildValidatedConfig(makeBaseEnv({ DEVELOPMENT_DATABASE_URL: undefined }), 'check'),
    /DEVELOPMENT_DATABASE_URL nao definido/,
  )

  assert.throws(
    () => buildValidatedConfig(makeBaseEnv({ TEST_DATABASE_NAME_REGEX: '' }), 'check'),
    /TEST_DATABASE_NAME_REGEX nao definido/,
  )
})

test('buildValidatedConfig bloqueia endpoint fora de allowlist', () => {
  assert.throws(
    () =>
      buildValidatedConfig(
        makeBaseEnv({
          TEST_DATABASE_URL:
            'postgresql://gestao_sst_test_role:__test_pwd__@10.10.10.10:55432/gestao_sst_finance_test?schema=public&application_name=gestao-sst-finance-it',
        }),
        'check',
      ),
    /Host de TEST_DATABASE_URL nao permitido/,
  )
})

test('buildValidatedConfig bloqueia coincidencia e ambiguidade com ambientes conhecidos', () => {
  assert.throws(
    () =>
      buildValidatedConfig(
        makeBaseEnv({
          TEST_DATABASE_URL:
            'postgresql://gestao_sst_test_role:__test_pwd__@127.0.0.1:5432/gestao_sst_dev?schema=public&application_name=gestao-sst-finance-it',
          TEST_DB_ALLOWED_PORTS: '5432',
          TEST_DATABASE_NAME_REGEX: '^gestao_sst_dev$',
        }),
        'check',
      ),
    /coincide com DEVELOPMENT_DATABASE_URL/,
  )

  assert.throws(
    () =>
      buildValidatedConfig(
        makeBaseEnv({
          TEST_DATABASE_URL:
            'postgresql://gestao_sst_test_role:__test_pwd__@test-db.internal:55432/gestao_sst_finance_test?schema=public&application_name=gestao-sst-finance-it',
          TEST_DB_ALLOWED_HOSTS: 'test-db.internal',
          PRODUCTION_DATABASE_URL:
            'postgresql://gestao_sst_prod_role:__prod_pwd__@db.prod.internal:55432/gestao_sst_finance_test?schema=public',
        }),
        'check',
      ),
    /sao ambiguos/,
  )
})

test('buildChildEnv força bloqueio de integracao externa e DATABASE_URL validada', () => {
  const config = buildValidatedConfig(makeBaseEnv(), 'run')
  const childEnv = buildChildEnv(makeBaseEnv({ MERCADO_PAGO_ENABLED: 'true' }), config)

  assert.equal(childEnv.DATABASE_URL, makeBaseEnv().TEST_DATABASE_URL)
  assert.equal(childEnv.MERCADO_PAGO_ENABLED, 'false')
  assert.equal(childEnv.MERCADO_PAGO_ACCESS_TOKEN, undefined)
  assert.equal(childEnv.MERCADO_PAGO_WEBHOOK_SECRET, undefined)
  assert.equal(childEnv.MERCADO_PAGO_WEBHOOK_NOTIFICATION_URL, undefined)
  assert.equal(childEnv.MERCADO_PAGO_TEST_PAYER_EMAIL, undefined)
})

# API Testing Guide

## Finance integration tests with isolated database

This project provides an official guarded runner for:

- `src/modules/finance/annual-advance-flow.integration.test.ts`

The runner is implemented at:

- `scripts/run-finance-integration.ts`

### Required environment variables

- `NODE_ENV=test`
- `TEST_DATABASE_URL`
- `DEVELOPMENT_DATABASE_URL`
- `PRODUCTION_DATABASE_URL`
- `TEST_DB_ALLOWED_HOSTS`
- `TEST_DB_ALLOWED_PORTS`
- `TEST_DATABASE_NAME_REGEX`
- `TEST_DATABASE_REQUIRED_USERNAME`
- `TEST_DATABASE_IDENTITY_MARKER`

### Guard behavior

Before any migration or integration test execution, the runner fails fast when:

- `NODE_ENV` is not `test`.
- `TEST_DATABASE_URL` is missing or invalid.
- `DEVELOPMENT_DATABASE_URL` or `PRODUCTION_DATABASE_URL` is missing.
- `TEST_DB_ALLOWED_HOSTS` or `TEST_DB_ALLOWED_PORTS` is missing.
- The database protocol is not PostgreSQL.
- Test endpoint host/port is outside allowed host/port lists.
- Test database name does not match `TEST_DATABASE_NAME_REGEX`.
- Test connection user does not match `TEST_DATABASE_REQUIRED_USERNAME`.
- `application_name` from `TEST_DATABASE_URL` does not match `TEST_DATABASE_IDENTITY_MARKER`.
- `TEST_DATABASE_URL` equals or is ambiguous versus shell `DATABASE_URL`.
- `TEST_DATABASE_URL` equals or is ambiguous versus development or production URL.

The runner masks credentials in logs and never prints raw secrets.

### Identity model and limitations

The runner validates endpoint identity using normalized host, effective port, database name and schema.

Important limitation:

- Canonical URL comparison does not prove physical isolation by itself.
- Different hostnames can still resolve to the same target in DNS.
- For hostname-vs-hostname and hostname-vs-IP comparisons that cannot be proven distinct, the runner treats the result as ambiguous and aborts.

### External integration safety

For `prepare` and `run`, the child process environment explicitly forces Mercado Pago integration disabled:

- `MERCADO_PAGO_ENABLED=false`
- `MERCADO_PAGO_ACCESS_TOKEN=`
- `MERCADO_PAGO_WEBHOOK_SECRET=`
- `MERCADO_PAGO_WEBHOOK_NOTIFICATION_URL=`
- `MERCADO_PAGO_TEST_PAYER_EMAIL=`

This blocks accidental external payment calls through the default gateway path during integration execution.

### Official commands

From repository root:

- `npm run test:finance:integration:check`
  - Runs guard checks only. Does not execute migrations or tests.
- `npm run test:finance:integration:prepare`
  - Runs guard checks and executes `prisma migrate deploy` against `TEST_DATABASE_URL`.
- `npm run test:finance:integration`
  - Runs guard checks, executes `prisma migrate deploy` against `TEST_DATABASE_URL`, then runs the integration suite.

Directly in API workspace:

- `npm run test:finance:integration:check -w @gestao-sst/api`
- `npm run test:finance:integration:prepare -w @gestao-sst/api`
- `npm run test:finance:integration -w @gestao-sst/api`

Security-only unit tests:

- `npm run test:finance:integration:security -w @gestao-sst/api`

### Safety notes

- Do not run `prepare` or `run` until `TEST_DATABASE_URL` points to a dedicated test database.
- Do not reuse development or production connection strings.
- The check command is safe to run before provisioning a test database.

### Manual provisioning prerequisites (outside this runner)

Before first `prepare` or `run`, provision manually:

- Dedicated test database matching `TEST_DATABASE_NAME_REGEX`.
- Dedicated test role/user matching `TEST_DATABASE_REQUIRED_USERNAME`.
- Restricted privileges for this role limited to the test database.
- Host/port assignment included in `TEST_DB_ALLOWED_HOSTS` and `TEST_DB_ALLOWED_PORTS`.
- Connection string `application_name` value matching `TEST_DATABASE_IDENTITY_MARKER`.

The runner intentionally does not create databases, roles or grants.

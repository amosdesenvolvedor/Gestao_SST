import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from 'mercadopago'
import { env } from '../../config/env.js'

type PaymentLikeResponse = {
  id?: number
  status?: string
  status_detail?: string
  external_reference?: string
  date_of_expiration?: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

export type MercadoPagoPixPayment = {
  id: string
  status: string | null
  statusDetail: string | null
  externalReference: string | null
  dateOfExpiration: string | null
  qrCode: string | null
  qrCodeBase64: string | null
  ticketUrl: string | null
}

export type CreateMercadoPagoPixInput = {
  amount: number
  externalReference: string
  payerEmail: string
  description: string
  idempotencyKey: string
  notificationUrl?: string
  dateOfExpiration?: string
}

export type CreateMercadoPagoCardPaymentLinkInput = {
  amount: number
  externalReference: string
  title: string
  idempotencyKey: string
  notificationUrl?: string
  payerEmail?: string
  successUrl?: string
  failureUrl?: string
  pendingUrl?: string
}

export type MercadoPagoCardPaymentLink = {
  preferenceId: string
  initPoint: string | null
  sandboxInitPoint: string | null
}

type PreferenceCreatePayload = Parameters<Preference['create']>[0]
type PreferenceCreateBody = PreferenceCreatePayload['body']

type MercadoPagoPreferenceResponse = {
  id: string
  initPoint: string | null
  sandboxInitPoint: string | null
}

function mapPreferenceResponse(response: unknown): MercadoPagoPreferenceResponse {
  if (!response || typeof response !== 'object') {
    return {
      id: '',
      initPoint: null,
      sandboxInitPoint: null,
    }
  }

  const payload = response as Record<string, unknown>

  return {
    id: typeof payload.id === 'string' || typeof payload.id === 'number' ? String(payload.id) : '',
    initPoint: typeof payload.init_point === 'string' ? payload.init_point : null,
    sandboxInitPoint: typeof payload.sandbox_init_point === 'string' ? payload.sandbox_init_point : null,
  }
}

function assertConfigured() {
  if (!env.MERCADO_PAGO_ENABLED) {
    throw new Error('Integracao Mercado Pago sandbox desabilitada.')
  }

  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado.')
  }
}

function buildClient() {
  assertConfigured()

  const config = new MercadoPagoConfig({
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN!,
    options: {
      timeout: env.MERCADO_PAGO_TIMEOUT_MS,
    },
  })

  return new Payment(config)
}

function mapPayment(response: PaymentLikeResponse): MercadoPagoPixPayment {
  return {
    id: String(response.id ?? ''),
    status: response.status ?? null,
    statusDetail: response.status_detail ?? null,
    externalReference: response.external_reference ?? null,
    dateOfExpiration: response.date_of_expiration ?? null,
    qrCode: response.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    ticketUrl: response.point_of_interaction?.transaction_data?.ticket_url ?? null,
  }
}

export async function createMercadoPagoPixPayment(input: CreateMercadoPagoPixInput): Promise<MercadoPagoPixPayment> {
  const paymentClient = buildClient()

  const response = await paymentClient.create({
    body: {
      transaction_amount: input.amount,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      description: input.description,
      notification_url: input.notificationUrl,
      date_of_expiration: input.dateOfExpiration,
      payer: {
        email: input.payerEmail,
      },
    },
    requestOptions: {
      idempotencyKey: input.idempotencyKey,
    },
  })

  return mapPayment(response)
}

export async function createMercadoPagoCardPaymentLink(
  input: CreateMercadoPagoCardPaymentLinkInput,
): Promise<MercadoPagoCardPaymentLink> {
  assertConfigured()

  const config = new MercadoPagoConfig({
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN!,
    options: {
      timeout: env.MERCADO_PAGO_TIMEOUT_MS,
    },
  })

  const preferenceClient = new Preference(config)
  const preferenceBody: PreferenceCreateBody = {
    items: [
      {
        id: input.externalReference,
        title: input.title,
        quantity: 1,
        unit_price: Number(input.amount.toFixed(2)),
        currency_id: 'BRL',
      },
    ],
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    payer: input.payerEmail
      ? {
          email: input.payerEmail,
        }
      : undefined,
    back_urls:
      input.successUrl || input.failureUrl || input.pendingUrl
        ? {
            success: input.successUrl,
            failure: input.failureUrl,
            pending: input.pendingUrl,
          }
        : undefined,
    auto_return: input.successUrl ? 'approved' : undefined,
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
      installments: 12,
    },
  }

  const response = await preferenceClient.create({
    body: preferenceBody,
    requestOptions: {
      idempotencyKey: input.idempotencyKey,
    },
  })

  const mapped = mapPreferenceResponse(response)

  return {
    preferenceId: mapped.id,
    initPoint: mapped.initPoint,
    sandboxInitPoint: mapped.sandboxInitPoint,
  }
}

export async function getMercadoPagoPaymentById(paymentId: string): Promise<MercadoPagoPixPayment> {
  const paymentClient = buildClient()

  const response = await paymentClient.get({
    id: paymentId,
  })

  return mapPayment(response)
}

export function validateMercadoPagoWebhookSignature(input: {
  xSignature: string | string[] | undefined | null
  xRequestId: string | string[] | undefined | null
  dataId: string | string[] | undefined | null
}) {
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) {
    throw new Error('MERCADO_PAGO_WEBHOOK_SECRET nao configurado.')
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret: env.MERCADO_PAGO_WEBHOOK_SECRET,
      toleranceSeconds: env.MERCADO_PAGO_SIGNATURE_TOLERANCE_SECONDS,
    })
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      throw new Error(`Assinatura de webhook invalida: ${error.reason}`)
    }

    throw error
  }
}

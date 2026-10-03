import { PrismaClient, Role } from '@prisma/client'
import { z } from 'zod'
import { hashPassword } from '../src/lib/password.js'
import {
  passwordPolicyDescription,
  validatePasswordPolicy,
} from '../src/shared/password-policy.js'

const prisma = new PrismaClient()

function fail(message: string): never {
  throw new Error(message)
}

const adminInputSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no minimo 2 caracteres.').max(120),
  email: z.string().trim().email('E-mail invalido.'),
  password: z.string(),
})

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim()
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrador'

  const parsed = adminInputSchema.safeParse({
    name,
    email,
    password,
  })

  if (!parsed.success) {
    fail(
      `Entrada invalida para bootstrap de SUPER_ADMIN. ${parsed.error.issues[0]?.message ?? ''}`.trim(),
    )
  }

  try {
    validatePasswordPolicy(parsed.data.password)
  } catch {
    fail(`Senha invalida. ${passwordPolicyDescription}`)
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase()

  const duplicatedEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (duplicatedEmail) {
    fail('Ja existe usuario com esse e-mail. Operacao cancelada sem duplicidade.')
  }

  const superAdminExists = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
    },
  })

  if (superAdminExists) {
    fail('Ja existe SUPER_ADMIN no banco. Operacao cancelada por seguranca.')
  }

  const passwordHash = await hashPassword(parsed.data.password)

  const created = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: parsed.data.name,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'BOOTSTRAP_SUPER_ADMIN',
      entity: 'User',
      entityId: created.id,
      metadata: {
        email: created.email,
      },
    },
  })

  console.log(`Administrador criado com sucesso: ${created.email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
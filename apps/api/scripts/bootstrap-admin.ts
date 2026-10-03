import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

function fail(message: string): never {
  throw new Error(message)
}

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim()
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrador'

  if (!email) {
    fail('Defina BOOTSTRAP_ADMIN_EMAIL para criar o primeiro administrador.')
  }

  if (!password || password.length < 8) {
    fail('Defina BOOTSTRAP_ADMIN_PASSWORD com no minimo 8 caracteres.')
  }

  const adminExists = await prisma.user.findFirst({
    where: {
      role: {
        in: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    },
  })

  if (adminExists) {
    fail('Ja existe usuario administrativo no banco. Operacao cancelada por seguranca.')
  }

  const passwordHash = await hashPassword(password)

  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
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
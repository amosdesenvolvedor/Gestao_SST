import { prisma } from '../../lib/prisma.js'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  })
}
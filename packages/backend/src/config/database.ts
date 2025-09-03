import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

export default prisma

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting from database...')
  await prisma.$disconnect()
})
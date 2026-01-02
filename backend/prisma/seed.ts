import 'dotenv/config'
import { PrismaService } from '../src/prisma.service'

async function main() {
  console.log('🌱 Seeding database using PrismaService...')

  const prisma = new PrismaService() // tự khởi tạo ngoài Nest context

  const users = [
    { userName: 'endclient', password: 'password123' },
    { userName: 'tmi', password: 'password123' },
    { userName: 'aix', password: 'password123' },
  ]

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { userName: user.userName },
        update: {},
        create: user,
      })
      console.log(`✔ User ${user.userName} seeded`)
    } catch (err) {
      console.error(`❌ Failed to seed user ${user.userName}:`, err)
    }
  }

  console.log('✅ Seed completed')

  await prisma.$disconnect() // nhớ disconnect
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e)
    process.exit(1)
  })

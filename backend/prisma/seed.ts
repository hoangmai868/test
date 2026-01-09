import 'dotenv/config'
import { PrismaService } from '../src/prisma/prisma.service'

// Helper function to remove isParent property from schema
function removeIsParent(schema: any[]): any[] {
  return schema.map((group) => ({
    groupName: group.groupName,
    fields: group.fields.map((field: any) => ({
      name: field.name,
    })),
  }))
}

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

  // Template schemas from file-mapping-screen.tsx
  const typeA = [
    {
      groupName: "裁判所",
      fields: [{ name: "裁判所"}],
    },
    {
      groupName: "原告ら訴訟代理人弁護士",
      fields: [{ name: "原告ら訴訟代理人弁護士"}],
    },
    {
      groupName: "同弁護士",
      fields: [{ name: "同弁護士"}],
    },
    {
      groupName: "当事者の表示",
      fields: [
        { name: "原告（個人）"},
        { name: "原告（法人）"},
        { name: "被告（借主・個人）"},
        { name: "被告（借主・法人）"},
        { name: "被告（連帯保証人・個人）"},
        { name: "被告（連帯保証人・法人）"},
        { name: "被告（同居人・個人）"},
      ],
    },
    {
      groupName: "当事者目録（個人）",
      fields: [
        { name: "郵便番号"},
        { name: "住所"},
        { name: "氏名"},
      ],
    },
    {
      groupName: "当事者目録（法人）",
      fields: [
        { name: "郵便番号"},
        { name: "住所"},
        { name: "法人名"},
        { name: "代表者役職"},
        { name: "代表者氏名"},
      ],
    },
    {
      groupName: "物件引き渡し日",
      fields: [{ name: "物件引き渡し日"}],
    },
    {
      groupName: "物件目録（建物）",
      fields: [
        { name: "所在"},
        { name: "家屋番号"},
        { name: "種類"},
        { name: "構造"},
        { name: "床面積"},
        { name: "占有情報"},
        { name: "住居表示"},
      ],
    },
    {
      groupName: "物件目録（区分所有マンション）",
      fields: [
        { name: "建物の名称"},
        { name: "構造"},
        { name: "床面積"},
        { name: "土地の符号"},
        { name: "所在及び地番"},
        { name: "地目"},
        { name: "地積"},
        { name: "家屋番号"},
        { name: "敷地権の種類"},
        { name: "敷地権の割合"},
      ],
    },
    {
      groupName: "物件目録（土地）",
      fields: [
        { name: "所在"},
        { name: "地番"},
        { name: "地目"},
        { name: "地籍"},
        { name: "占有情報"},
        { name: "住居表示"},
      ],
    },
    {
      groupName: "請求の原因詳細",
      fields: [
        { name: "契約年月日"},
        { name: "契約期間"},
        { name: "月額賃料等"},
        { name: "家賃"},
        { name: "共益費"},
        { name: "事務手数料"},
        { name: "支払期"},
        { name: "契約の解除　条項"},
        { name: "契約の解除　条文"},
        { name: "滞納賃料"},
        { name: "滞納期間"},
        { name: "催告書発送日"},
        { name: "催告書到達日（内容証明）"},
        { name: "催告書到達日（特定記録）"},
        { name: "催告書到達方法"},
        { name: "催告内容"},
        { name: "満了日"},
      ],
    },
    {
      groupName: "賃貸借契約書作成日",
      fields: [{ name: "契約日"}],
    },
    {
      groupName: "解除予告通知作成日",
      fields: [{ name: "発送日"}],
    },
    {
      groupName: "検索結果詳細（内容証明）",
      fields: [{ name: "到達日"}],
    },
    {
      groupName: "検索結果詳細（特定記録）",
      fields: [{ name: "到達日"}],
    },
  ]

  const typeB = [
    {
      groupName: "裁判所情報",
      fields: [{ name: "裁判所名"}],
    },
    {
      groupName: "訴訟代理人",
      fields: [
        { name: "主任弁護士"},
        { name: "副弁護士"},
      ],
    },
    {
      groupName: "当事者",
      fields: [
        { name: "原告名"},
        { name: "被告名"},
      ],
    },
    {
      groupName: "契約情報",
      fields: [
        { name: "契約締結日"},
        { name: "契約期間"},
        { name: "月額賃料"},
      ],
    },
    {
      groupName: "物件情報",
      fields: [
        { name: "物件所在地"},
        { name: "物件種別"},
        { name: "床面積"},
      ],
    },
  ]

  const typeC = [
    {
      groupName: "基本情報",
      fields: [
        { name: "裁判所"},
        { name: "事件番号"},
      ],
    },
    {
      groupName: "原告情報",
      fields: [
        { name: "原告氏名"},
        { name: "原告住所"},
        { name: "原告代理人"},
      ],
    },
    {
      groupName: "被告情報",
      fields: [
        { name: "被告氏名"},
        { name: "被告住所"},
      ],
    },
    {
      groupName: "請求内容",
      fields: [
        { name: "請求の趣旨"},
        { name: "請求額"},
      ],
    },
    {
      groupName: "添付書類",
      fields: [
        { name: "証拠書類"},
        { name: "契約書"},
      ],
    },
  ]

  const templates = [
    {
      fileName: "評価内容",
      displayName: "評価内容",
      fileKey: "",
      schemaJson: removeIsParent(typeA),
    },
    {
      fileName: "Type B",
      displayName: "Type B",
      fileKey: "",
      schemaJson: removeIsParent(typeB),
    },
    {
      fileName: "Type C",
      displayName: "Type C",
      fileKey: "",
      schemaJson: removeIsParent(typeC),
    },
  ]

  for (const template of templates) {
    try {
      const existing = await prisma.template.findFirst({
        where: { fileName: template.fileName },
      })

      if (existing) {
        await prisma.template.update({
          where: { id: existing.id },
          data: {
            displayName: template.displayName,
            fileKey: template.fileKey,
            schemaJson: template.schemaJson,
          },
        })
        console.log(`✔ Template ${template.displayName} updated`)
      } else {
        await prisma.template.create({
          data: {
            fileName: template.fileName,
            displayName: template.displayName,
            fileKey: template.fileKey,
            schemaJson: template.schemaJson,
            status: 'active',
          },
        })
        console.log(`✔ Template ${template.displayName} created`)
      }
    } catch (err) {
      console.error(`❌ Failed to seed template ${template.displayName}:`, err)
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

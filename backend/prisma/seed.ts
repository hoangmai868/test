import 'dotenv/config'
import { PrismaService } from '../src/prisma/prisma.service'

// Helper function to remove isParent property from schema
function removeIsParent(schema: any[]): any[] {
  return schema.map((group) => ({
    groupName: group.groupName,
    fields: group.fields.map((field: any) => ({
      name: field.name,
      prompt:  field.prompt || '',
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
    fields: [
      { name: "裁判所", prompt: "管轄する裁判所名を正式名称で入力してください。" },
    ],
  },
  {
    groupName: "原告ら訴訟代理人弁護士",
    fields: [
      { name: "原告ら訴訟代理人弁護士", prompt: "原告側の訴訟代理人弁護士の氏名を入力してください。" },
    ],
  },
  {
    groupName: "同弁護士",
    fields: [
      { name: "同弁護士", prompt: "同一事務所に所属する他の弁護士名を入力してください。" },
    ],
  },
  {
    groupName: "当事者の表示",
    fields: [
      { name: "原告（個人）", prompt: "原告が個人の場合の氏名を入力してください。" },
      { name: "原告（法人）", prompt: "原告が法人の場合の法人名を入力してください。" },
      { name: "被告（借主・個人）", prompt: "被告が借主で個人の場合の氏名を入力してください。" },
      { name: "被告（借主・法人）", prompt: "被告が借主で法人の場合の法人名を入力してください。" },
      { name: "被告（連帯保証人・個人）", prompt: "連帯保証人が個人の場合の氏名を入力してください。" },
      { name: "被告（連帯保証人・法人）", prompt: "連帯保証人が法人の場合の法人名を入力してください。" },
      { name: "被告（同居人・個人）", prompt: "同居人としての被告がいる場合、その氏名を入力してください。" },
    ],
  },
  {
    groupName: "当事者目録（個人）",
    fields: [
      { name: "郵便番号", prompt: "当事者の郵便番号をハイフン付きで入力してください。" },
      { name: "住所", prompt: "当事者の現住所を正確に入力してください。" },
      { name: "氏名", prompt: "当事者の氏名をフルネームで入力してください。" },
    ],
  },
  {
    groupName: "当事者目録（法人）",
    fields: [
      { name: "郵便番号", prompt: "法人所在地の郵便番号を入力してください。" },
      { name: "住所", prompt: "法人の本店所在地を入力してください。" },
      { name: "法人名", prompt: "法人の正式名称を入力してください。" },
      { name: "代表者役職", prompt: "代表者の役職名を入力してください（例：代表取締役）。" },
      { name: "代表者氏名", prompt: "法人代表者の氏名を入力してください。" },
    ],
  },
  {
    groupName: "物件引き渡し日",
    fields: [
      { name: "物件引き渡し日", prompt: "物件を引き渡した日付を入力してください。" },
    ],
  },
  {
    groupName: "物件目録（建物）",
    fields: [
      { name: "所在", prompt: "建物の所在地を入力してください。" },
      { name: "家屋番号", prompt: "登記簿上の家屋番号を入力してください。" },
      { name: "種類", prompt: "建物の種類（例：居宅、店舗）を入力してください。" },
      { name: "構造", prompt: "建物の構造（例：木造、鉄筋コンクリート造）を入力してください。" },
      { name: "床面積", prompt: "建物の床面積を平方メートルで入力してください。" },
      { name: "占有情報", prompt: "現在の占有状況を入力してください。" },
      { name: "住居表示", prompt: "住居表示上の住所を入力してください。" },
    ],
  },
  {
    groupName: "物件目録（区分所有マンション）",
    fields: [
      { name: "建物の名称", prompt: "マンションの正式名称を入力してください。" },
      { name: "構造", prompt: "建物全体の構造を入力してください。" },
      { name: "床面積", prompt: "専有部分の床面積を入力してください。" },
      { name: "土地の符号", prompt: "敷地の符号を入力してください。" },
      { name: "所在及び地番", prompt: "土地の所在および地番を入力してください。" },
      { name: "地目", prompt: "土地の地目を入力してください。" },
      { name: "地積", prompt: "土地の地積を入力してください。" },
      { name: "家屋番号", prompt: "専有部分の家屋番号を入力してください。" },
      { name: "敷地権の種類", prompt: "敷地権の種類を入力してください。" },
      { name: "敷地権の割合", prompt: "敷地権の割合を入力してください。" },
    ],
  },
  {
    groupName: "物件目録（土地）",
    fields: [
      { name: "所在", prompt: "土地の所在地を入力してください。" },
      { name: "地番", prompt: "土地の地番を入力してください。" },
      { name: "地目", prompt: "土地の地目を入力してください。" },
      { name: "地籍", prompt: "土地の地籍情報を入力してください。" },
      { name: "占有情報", prompt: "土地の占有状況を入力してください。" },
      { name: "住居表示", prompt: "住居表示がある場合は入力してください。" },
    ],
  },
  {
    groupName: "請求の原因詳細",
    fields: [
      { name: "契約年月日", prompt: "契約を締結した年月日を入力してください。" },
      { name: "契約期間", prompt: "契約期間を入力してください。" },
      { name: "月額賃料等", prompt: "月額賃料および関連費用を入力してください。" },
      { name: "家賃", prompt: "月額家賃を入力してください。" },
      { name: "共益費", prompt: "共益費の金額を入力してください。" },
      { name: "事務手数料", prompt: "事務手数料がある場合は入力してください。" },
      { name: "支払期", prompt: "賃料等の支払期日を入力してください。" },
      { name: "契約の解除　条項", prompt: "解除に関する契約条項番号を入力してください。" },
      { name: "契約の解除　条文", prompt: "解除に関する条文内容を入力してください。" },
      { name: "滞納賃料", prompt: "滞納している賃料額を入力してください。" },
      { name: "滞納期間", prompt: "賃料滞納の期間を入力してください。" },
      { name: "催告書発送日", prompt: "催告書を発送した日付を入力してください。" },
      { name: "催告書到達日（内容証明）", prompt: "内容証明郵便による到達日を入力してください。" },
      { name: "催告書到達日（特定記録）", prompt: "特定記録郵便による到達日を入力してください。" },
      { name: "催告書到達方法", prompt: "催告書の送付方法を入力してください。" },
      { name: "催告内容", prompt: "催告書の内容を簡潔に入力してください。" },
      { name: "満了日", prompt: "契約満了日を入力してください。" },
    ],
  },
  {
    groupName: "賃貸借契約書作成日",
    fields: [
      { name: "契約日", prompt: "賃貸借契約書を作成した日付を入力してください。" },
    ],
  },
  {
    groupName: "解除予告通知作成日",
    fields: [
      { name: "発送日", prompt: "解除予告通知を発送した日付を入力してください。" },
    ],
  },
  {
    groupName: "検索結果詳細（内容証明）",
    fields: [
      { name: "到達日", prompt: "内容証明郵便の到達日を入力してください。" },
    ],
  },
  {
    groupName: "検索結果詳細（特定記録）",
    fields: [
      { name: "到達日", prompt: "特定記録郵便の到達日を入力してください。" },
    ],
  },
]


  const typeB = [
  {
    groupName: "裁判所情報",
    fields: [
      {
        name: "裁判所名",
        prompt: "本件を管轄する裁判所の正式名称を入力してください。",
      },
    ],
  },
  {
    groupName: "訴訟代理人",
    fields: [
      {
        name: "主任弁護士",
        prompt: "本件の主任となる訴訟代理人弁護士の氏名を入力してください。",
      },
      {
        name: "副弁護士",
        prompt: "主任弁護士を補佐する副弁護士の氏名を入力してください。",
      },
    ],
  },
  {
    groupName: "当事者",
    fields: [
      {
        name: "原告名",
        prompt: "原告の氏名または法人名を正式名称で入力してください。",
      },
      {
        name: "被告名",
        prompt: "被告の氏名または法人名を正式名称で入力してください。",
      },
    ],
  },
  {
    groupName: "契約情報",
    fields: [
      {
        name: "契約締結日",
        prompt: "契約を締結した日付を入力してください。",
      },
      {
        name: "契約期間",
        prompt: "契約の開始日および終了日、または契約期間を入力してください。",
      },
      {
        name: "月額賃料",
        prompt: "契約に基づく月額賃料を入力してください。",
      },
    ],
  },
  {
    groupName: "物件情報",
    fields: [
      {
        name: "物件所在地",
        prompt: "対象物件の所在地を正確に入力してください。",
      },
      {
        name: "物件種別",
        prompt: "物件の種別（例：居宅、店舗、事務所等）を入力してください。",
      },
      {
        name: "床面積",
        prompt: "物件の床面積を平方メートルで入力してください。",
      },
    ],
  },
]

  const typeC = [
  {
    groupName: "基本情報",
    fields: [
      {
        name: "裁判所",
        prompt: "本件を担当する裁判所の正式名称を入力してください。",
      },
      {
        name: "事件番号",
        prompt: "裁判所から付与された事件番号を入力してください。",
      },
    ],
  },
  {
    groupName: "原告情報",
    fields: [
      {
        name: "原告氏名",
        prompt: "原告の氏名または法人名を正式名称で入力してください。",
      },
      {
        name: "原告住所",
        prompt: "原告の住所または所在地を正確に入力してください。",
      },
      {
        name: "原告代理人",
        prompt: "原告の訴訟代理人（弁護士）がいる場合、その氏名を入力してください。",
      },
    ],
  },
  {
    groupName: "被告情報",
    fields: [
      {
        name: "被告氏名",
        prompt: "被告の氏名または法人名を正式名称で入力してください。",
      },
      {
        name: "被告住所",
        prompt: "被告の住所または所在地を正確に入力してください。",
      },
    ],
  },
  {
    groupName: "請求内容",
    fields: [
      {
        name: "請求の趣旨",
        prompt: "裁判所に求める判決内容（請求の趣旨）を簡潔に入力してください。",
      },
      {
        name: "請求額",
        prompt: "金銭請求がある場合、その請求額を入力してください。",
      },
    ],
  },
  {
    groupName: "添付書類",
    fields: [
      {
        name: "証拠書類",
        prompt: "提出する証拠書類の名称を入力してください。",
      },
      {
        name: "契約書",
        prompt: "本件に関連する契約書の名称または種類を入力してください。",
      },
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

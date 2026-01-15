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
    { userName: 'endclient', password: 'AwYlNfS2ufhYpWBo' },
    { userName: 'tmi', password: 'WO1ycLzlVv9R10Ka' },
    { userName: 'aix', password: 'WostIsBoF9zDEM9U' },
  ]

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { userName: user.userName },
        update: {password: user.password,},
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
      { name: "裁判所", prompt: "{登録ファイル}から、管轄する裁判所名を正式名称で入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "原告ら訴訟代理人弁護士",
    fields: [
      { name: "原告ら訴訟代理人弁護士", prompt: "{登録ファイル}から、原告側の訴訟代理人弁護士の氏名を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "同弁護士",
    fields: [
      { name: "同弁護士", prompt: "{登録ファイル}から、同一事務所に所属する他の弁護士名を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "当事者の表示",
    fields: [
      { name: "原告（個人）", prompt: "{登録ファイル}から、原告が個人の場合の氏名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "原告（法人）", prompt: "{登録ファイル}から、原告が法人の場合の法人名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "被告（借主・個人）", prompt: "{登録ファイル}から、被告が借主で個人の場合の氏名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "被告（借主・法人）", prompt: "{登録ファイル}から、被告が借主で法人の場合の法人名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "被告（連帯保証人・個人）", prompt: "{登録ファイル}から、連帯保証人が個人の場合の氏名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "被告（連帯保証人・法人）", prompt: "{登録ファイル}から、連帯保証人が法人の場合の法人名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "被告（同居人・個人）", prompt: "{登録ファイル}から、同居人としての被告がいる場合、その氏名を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "当事者目録（個人）",
    fields: [
      { name: "郵便番号", prompt: "{登録ファイル}から、当事者の郵便番号をハイフン付きで入力してください。「{追加コメント}」を考慮すること。" },
      { name: "住所", prompt: "{登録ファイル}から、当事者の現住所を正確に入力してください。「{追加コメント}」を考慮すること。" },
      { name: "氏名", prompt: "{登録ファイル}から、当事者の氏名をフルネームで入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "当事者目録（法人）",
    fields: [
      { name: "郵便番号", prompt: "{登録ファイル}から、法人所在地の郵便番号を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "住所", prompt: "{登録ファイル}から、法人の本店所在地を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "法人名", prompt: "{登録ファイル}から、法人の正式名称を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "代表者役職", prompt: "{登録ファイル}から、代表者の役職名を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "代表者氏名", prompt: "{登録ファイル}から、法人代表者の氏名を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "物件引き渡し日",
    fields: [
      { name: "物件引き渡し日", prompt: "{登録ファイル}から、物件を引き渡した日付を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },

  // ===== 以下、欠けていた部分 =====

  {
    groupName: "物件目録（建物）",
    fields: [
      { name: "所在", prompt: "{登録ファイル}から、建物の所在地を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "家屋番号", prompt: "{登録ファイル}から、登記簿上の家屋番号を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "種類", prompt: "{登録ファイル}から、建物の種類を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "構造", prompt: "{登録ファイル}から、建物の構造を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "床面積", prompt: "{登録ファイル}から、建物の床面積を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "占有情報", prompt: "{登録ファイル}から、現在の占有状況を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "住居表示", prompt: "{登録ファイル}から、住居表示上の住所を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "物件目録（区分所有マンション）",
    fields: [
      { name: "建物の名称", prompt: "{登録ファイル}から、マンションの正式名称を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "構造", prompt: "{登録ファイル}から、建物全体の構造を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "床面積", prompt: "{登録ファイル}から、専有部分の床面積を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "土地の符号", prompt: "{登録ファイル}から、敷地の符号を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "所在及び地番", prompt: "{登録ファイル}から、土地の所在および地番を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "地目", prompt: "{登録ファイル}から、土地の地目を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "地積", prompt: "{登録ファイル}から、土地の地積を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "家屋番号", prompt: "{登録ファイル}から、専有部分の家屋番号を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "敷地権の種類", prompt: "{登録ファイル}から、敷地権の種類を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "敷地権の割合", prompt: "{登録ファイル}から、敷地権の割合を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "物件目録（土地）",
    fields: [
      { name: "所在", prompt: "{登録ファイル}から、土地の所在地を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "地番", prompt: "{登録ファイル}から、土地の地番を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "地目", prompt: "{登録ファイル}から、土地の地目を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "地籍", prompt: "{登録ファイル}から、土地の地籍情報を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "占有情報", prompt: "{登録ファイル}から、土地の占有状況を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "住居表示", prompt: "{登録ファイル}から、住居表示がある場合は入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "請求の原因詳細",
    fields: [
      { name: "契約年月日", prompt: "{登録ファイル}から、契約を締結した年月日を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "契約期間", prompt: "{登録ファイル}から、契約期間を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "月額賃料等", prompt: "{登録ファイル}から、月額賃料等を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "家賃", prompt: "{登録ファイル}から、月額家賃を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "共益費", prompt: "{登録ファイル}から、共益費を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "事務手数料", prompt: "{登録ファイル}から、事務手数料を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "支払期", prompt: "{登録ファイル}から、支払期日を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "契約の解除　条項", prompt: "{登録ファイル}から、解除条項番号を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "契約の解除　条文", prompt: "{登録ファイル}から、解除条文内容を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "滞納賃料", prompt: "{登録ファイル}から、滞納賃料額を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "滞納期間", prompt: "{登録ファイル}から、滞納期間を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "催告書発送日", prompt: "{登録ファイル}から、催告書発送日を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "催告書到達日（内容証明）", prompt: "{登録ファイル}から、内容証明の到達日を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "催告書到達日（特定記録）", prompt: "{登録ファイル}から、特定記録の到達日を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "催告書到達方法", prompt: "{登録ファイル}から、催告書の到達方法を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "催告内容", prompt: "{登録ファイル}から、催告内容を入力してください。「{追加コメント}」を考慮すること。" },
      { name: "満了日", prompt: "{登録ファイル}から、契約満了日を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "賃貸借契約書作成日",
    fields: [
      { name: "契約日", prompt: "{登録ファイル}から、契約書作成日を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "解除予告通知作成日",
    fields: [
      { name: "発送日", prompt: "{登録ファイル}から、解除予告通知の発送日を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "検索結果詳細（内容証明）",
    fields: [
      { name: "到達日", prompt: "{登録ファイル}から、内容証明の到達日を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
  {
    groupName: "検索結果詳細（特定記録）",
    fields: [
      { name: "到達日", prompt: "{登録ファイル}から、特定記録の到達日を入力してください。「{追加コメント}」を考慮すること。" },
    ],
  },
]

const typeB = [
  {
    groupName: "裁判所情報",
    fields: [
      {
        name: "裁判所名",
        prompt: "{登録ファイル}から、本件を管轄する裁判所の正式名称を入力してください。「{追加コメント}」を考慮すること。",
      },
    ],
  },
  {
    groupName: "訴訟代理人",
    fields: [
      {
        name: "主任弁護士",
        prompt: "{登録ファイル}から、本件の主任となる訴訟代理人弁護士の氏名を入力してください。「{追加コメント}」を考慮すること。",
      },
      {
        name: "副弁護士",
        prompt: "{登録ファイル}から、主任弁護士を補佐する副弁護士の氏名を入力してください。「{追加コメント}」を考慮すること。",
      },
    ],
  },
  {
    groupName: "当事者",
    fields: [
      {
        name: "原告名",
        prompt: "{登録ファイル}から、原告の氏名または法人名を正式名称で入力してください。「{追加コメント}」を考慮すること。",
      },
      {
        name: "被告名",
        prompt: "{登録ファイル}から、被告の氏名または法人名を正式名称で入力してください。「{追加コメント}」を考慮すること。",
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
        prompt: "{登録ファイル}から、本件を担当する裁判所の正式名称を入力してください。「{追加コメント}」を考慮すること。",
      },
      {
        name: "事件番号",
        prompt: "{登録ファイル}から、裁判所から付与された事件番号を入力してください。「{追加コメント}」を考慮すること。",
      },
    ],
  },
  {
    groupName: "原告情報",
    fields: [
      {
        name: "原告氏名",
        prompt: "{登録ファイル}から、原告の氏名または法人名を正式名称で入力してください。「{追加コメント}」を考慮すること。",
      },
      {
        name: "原告住所",
        prompt: "{登録ファイル}から、原告の住所または所在地を正確に入力してください。「{追加コメント}」を考慮すること。",
      },
      {
        name: "原告代理人",
        prompt: "{登録ファイル}から、原告の訴訟代理人がいる場合、その氏名を入力してください。「{追加コメント}」を考慮すること。",
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

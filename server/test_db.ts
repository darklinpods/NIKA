import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.time("Prisma Update Title Only")
  await prisma.case.update({
    where: { id: "6bc103d8-c311-4a7a-8b77-83a3d789d385" },
    data: { title: "Test Title 4" }
  })
  console.timeEnd("Prisma Update Title Only")

  const subTasks = [
    { "id": "f2e57c27-2c5e-4dc7-82aa-05cf13176bb6", "title": "起草起诉状", "isCompleted": true, "dueDate": "2026-03-02T18:35:23.052Z" },
    { "id": "17d271e4-83d7-4c29-a514-5ed846d04644", "title": "搜集证据", "isCompleted": true, "dueDate": "2026-03-03T06:52:33.779Z" },
    { "id": "d66a59cd-b696-4e9c-9221-7059d4d9db6e", "title": "搜集证据", "isCompleted": false, "dueDate": "2026-03-05T11:20:45.722Z" },
    { "id": "6531bc10-474f-4863-8fec-a34d484ceef8", "title": "发送律师函", "isCompleted": true, "dueDate": "2026-03-05T17:16:53.026Z" },
    { "id": "64f9f3d3-03c8-4fb2-8045-18c8d7a0148a", "title": "调取监控", "isCompleted": false, "dueDate": "2026-02-28T00:54:04.683Z" }
  ];

  console.time("Prisma Update with Relations")
  await prisma.case.update({
    where: { id: "6bc103d8-c311-4a7a-8b77-83a3d789d385" },
    data: {
      title: "Test Title 5",
      subTasks: {
        deleteMany: {
            id: { notIn: subTasks.map(st => st.id).filter(id => id) }
        },
        upsert: subTasks.map((st: any) => ({
            where: { id: st.id || 'new-id' },
            update: {
                title: st.title,
                isCompleted: st.isCompleted,
                dueDate: st.dueDate ? new Date(st.dueDate) : null
            },
            create: {
                title: st.title,
                isCompleted: st.isCompleted || false,
                dueDate: st.dueDate ? new Date(st.dueDate) : null
            }
        }))
      }
    }
  })
  console.timeEnd("Prisma Update with Relations")
  
  console.time("Prisma Get All")
  await prisma.case.findMany({
    include: {
        subTasks: true,
        documents: true,
    },
  });
  console.timeEnd("Prisma Get All")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

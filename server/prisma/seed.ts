
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // Optional: Clear existing data
    await prisma.caseDocument.deleteMany({});
    await prisma.subTask.deleteMany({});
    await prisma.case.deleteMany({});

    const caseTypes = [
        { name: '交通事故', weight: 60 },
        { name: '工伤认定', weight: 15 },
        { name: '人身损害', weight: 10 },
        { name: '离婚纠纷', weight: 5 },
        { name: '合同纠纷', weight: 5 },
        { name: '民间借贷', weight: 5 },
    ];

    const priorities = ['low', 'medium', 'high'];
    const statuses = ['todo', 'in-progress', 'done'];
    const clientNames = ['张强', '李芳', '王伟', '赵敏', '孙杰', '周红', '吴鹏', '郑洁', '冯涛', '陈晨'];
    const actionPool = ['初步咨询', '搜集证据', '调取监控', '伤残鉴定', '联系保险公司', '发送律师函', '起草起诉状', '法院立案', '预交费', '准备开庭', '质证环节', '庭审陈述'];

    for (let i = 1; i <= 30; i++) {
        const client = clientNames[Math.floor(Math.random() * clientNames.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];

        // Map 1-10 to todo, 11-25 to in-progress, 26-30 to done
        const status = i <= 10 ? 'todo' : i <= 25 ? 'in-progress' : 'done';

        const typeIndex = i <= 18 ? 0 : i <= 23 ? 1 : i <= 26 ? 2 : i <= 27 ? 3 : i <= 28 ? 4 : 5;
        const typeObj = caseTypes[typeIndex];

        const createdCase = await prisma.case.create({
            data: {
                title: `${typeObj.name} - ${client}案`,
                description: `针对${typeObj.name}案件的全面代理。当前核心：确保证据链闭环。由于该案件涉及金额较大且属于典型案例，请务必细致处理所有法律程序。`,
                priority: i % 5 === 0 ? 'high' : priority,
                status: status,
                tags: JSON.stringify([typeObj.name, '2025年案']),
                clientName: client,
                courtName: '上海市第一中级人民法院',
                createdAt: new Date(Date.now() - Math.random() * 10000000000),
            }
        });

        // Generate 3-5 subtasks per case
        const subTaskCount = 3 + Math.floor(Math.random() * 3);
        const subTasksData = [];
        for (let j = 0; j < subTaskCount; j++) {
            subTasksData.push({
                title: actionPool[Math.floor(Math.random() * actionPool.length)],
                isCompleted: status === 'done' ? true : Math.random() > 0.6,
                dueDate: new Date(Date.now() + Math.random() * 1000000000),
                caseId: createdCase.id
            });
        }

        await prisma.subTask.createMany({
            data: subTasksData
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

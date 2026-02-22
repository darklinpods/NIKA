
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const caseTypes = [
    {
        type: '交通事故责任纠纷', templates: [
            '在{location}发生两车剐蹭，对方{vehicle}全责但拒绝赔偿。',
            '{location}路口发生追尾事故，导致我方车辆受损严重，随车人员轻微伤。',
            '行人于{location}被{vehicle}撞伤，肇事司机逃逸后被抓获，现需索赔医药费。'
        ]
    },
    {
        type: '离婚纠纷', templates: [
            '因感情不和协议离婚，涉及{location}房产分割及子女抚养权争取。',
            '对方婚内出轨，现申请离婚并要求精神损害赔偿，以及{location}房产归我方所有。',
            '双方分居多年，现诉讼离婚，主要争议点在于存款分割和探视权安排。'
        ]
    },
    {
        type: '买卖合同纠纷', templates: [
            '向{company}采购的一批货物存在严重质量问题，造成生产线停工，要求退货赔偿。',
            '{company}拖欠货款{amount}元长达半年，多次催收无果，准备起诉冻结对方账户。',
            '签订采购合同后，{company}无故违约不发货，导致我方对下游客户违约，需追究违约责任。'
        ]
    },
    {
        type: '民间借贷纠纷', templates: [
            '债务人借款{amount}元用于资金周转，约定利息但到期不还，且失联。',
            '朋友借走{amount}元无力偿还，仅有转账记录无借条，需要法律援助追回欠款。',
            '担保人被起诉承担连带责任，债务人名下有{location}房产可供执行。'
        ]
    },
    {
        type: '劳动争议', templates: [
            '入职{company}两年未缴纳社保，现被辞退，要求补缴社保并支付经济补偿金。',
            '{company}长期拖欠工资，加班费未按规定发放，申请劳动仲裁。',
            '工伤认定后公司拒绝赔付，需根据工伤等级申请相应赔偿。'
        ]
    },
    {
        type: '刑事辩护', templates: [
            '涉嫌危险驾驶罪，酒精含量超标，希望能争取缓刑。',
            '因打架斗殴被拘留，涉嫌故意伤害罪，家属委托进行会见和辩护。',
            '涉嫌职务侵占罪，数额较大，需要通过退赃退赔争取从轻处理。'
        ]
    }
];

const locations = ['朝阳区建国路', '海淀区中关村大街', '浦东新区世纪大道', '天河区体育西路', '南山区科技园', '福田区深南大道'];
const vehicles = ['小轿车', '出租车', '电动车', '货车', '公交车'];
const companies = ['科技发展有限公司', '商贸有限公司', '建筑工程公司', '物流运输公司', '信息技术公司'];
const amounts = ['50万', '100万', '20万', '300万', '15万'];
const clients = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '孙九', '周十', '吴十一', '郑十二'];
const priorities = ['low', 'medium', 'high'];
const statuses = ['todo', 'in-progress', 'done'];
const tagsList = ['紧急', '需阅卷', '等待开庭', '调解中', '取证阶段', '已结案', '待执行'];

function fillTemplate(template: string): string {
    return template
        .replace('{location}', locations[Math.floor(Math.random() * locations.length)])
        .replace('{vehicle}', vehicles[Math.floor(Math.random() * vehicles.length)])
        .replace('{company}', companies[Math.floor(Math.random() * companies.length)])
        .replace('{amount}', amounts[Math.floor(Math.random() * amounts.length)]);
}

async function main() {
    console.log('Start seeding ...');

    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.subTask.deleteMany();
    await prisma.caseDocument.deleteMany();
    await prisma.case.deleteMany();

    for (let i = 0; i < 50; i++) {
        const typeObj = caseTypes[Math.floor(Math.random() * caseTypes.length)];
        const template = typeObj.templates[Math.floor(Math.random() * typeObj.templates.length)];
        const description = fillTemplate(template);
        const client = clients[Math.floor(Math.random() * clients.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Random tags (1-3)
        const numTags = Math.floor(Math.random() * 3) + 1;
        const caseTags: string[] = [];
        for (let j = 0; j < numTags; j++) {
            const tag = tagsList[Math.floor(Math.random() * tagsList.length)];
            if (!caseTags.includes(tag)) caseTags.push(tag);
        }

        const title = `${typeObj.type} - ${client}案`;

        await prisma.case.create({
            data: {
                title,
                description,
                priority,
                status,
                tags: JSON.stringify(caseTags),
                clientName: client,
                courtName: Math.random() > 0.5 ? '市中级人民法院' : '区人民法院',
                subTasks: {
                    create: [
                        { title: '初步案情分析', isCompleted: Math.random() > 0.5 },
                        { title: '整理证据材料', isCompleted: Math.random() > 0.5 },
                        { title: '起草法律文书', isCompleted: false },
                    ]
                }
            }
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

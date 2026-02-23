import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const db = new Database('prisma/dev.db', { readonly: true });

async function main() {
    console.log("Reading data from SQLite...");

    // Read tables
    const cases = db.prepare('SELECT * FROM "Case"').all() as any[];
    const subTasks = db.prepare('SELECT * FROM "SubTask"').all() as any[];
    const documents = db.prepare('SELECT * FROM "CaseDocument"').all() as any[];

    console.log(`Found ${cases.length} cases.`);

    for (const c of cases) {
        // Find existing case
        const existingCase = await prisma.case.findUnique({ where: { id: c.id } });
        if (!existingCase) {
            console.log(`Inserting Case: ${c.title}`);
            await prisma.case.create({
                data: {
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    priority: c.priority,
                    status: c.status,
                    tags: c.tags,
                    clientName: c.clientName,
                    courtName: c.courtName,
                    aiSummary: c.aiSummary,
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt),
                }
            });
        }
    }

    for (const st of subTasks) {
        const existingST = await prisma.subTask.findUnique({ where: { id: st.id } });
        if (!existingST) {
            await prisma.subTask.create({
                data: {
                    id: st.id,
                    title: st.title,
                    isCompleted: st.isCompleted === 1 || st.isCompleted === true || st.isCompleted === "true",
                    dueDate: st.dueDate ? new Date(st.dueDate) : null,
                    caseId: st.caseId
                }
            });
        }
    }

    for (const doc of documents) {
        const existingDoc = await prisma.caseDocument.findUnique({ where: { id: doc.id } });
        if (!existingDoc) {
            await prisma.caseDocument.create({
                data: {
                    id: doc.id,
                    title: doc.title,
                    content: doc.content,
                    category: doc.category,
                    createdAt: new Date(doc.createdAt),
                    caseId: doc.caseId
                }
            });
        }
    }

    console.log("Migration complete!");
}

main()
    .catch(e => {
        console.error("Migration Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        db.close();
        await prisma.$disconnect();
    });

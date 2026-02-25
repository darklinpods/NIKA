import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGarbledDocs() {
    console.log("🔧 Scanning for garbled document titles...\n");

    const allDocs = await prisma.caseDocument.findMany({
        orderBy: { createdAt: 'asc' }
    });

    let fixedCount = 0;
    let deletedCount = 0;
    const seenKeys = new Set<string>();

    for (const doc of allDocs) {
        // Try to fix garbled Latin-1 -> UTF-8 title
        let fixedTitle = doc.title;
        try {
            const reEncoded = Buffer.from(doc.title, 'latin1').toString('utf8');
            // Check if re-encoding produces valid Chinese (contains CJK characters)
            if (/[\u4e00-\u9fff]/.test(reEncoded) && !/[\u4e00-\u9fff]/.test(doc.title)) {
                fixedTitle = reEncoded;
            }
        } catch { }

        // Dedup key: caseId + title + content length
        const dedupKey = `${doc.caseId}|${fixedTitle}|${doc.content.length}`;

        if (seenKeys.has(dedupKey)) {
            // This is a duplicate - delete it
            console.log(`  🗑️  Deleting duplicate: "${fixedTitle}" (case: ${doc.caseId.substring(0, 8)}...)`);
            await prisma.caseDocument.delete({ where: { id: doc.id } });
            deletedCount++;
            continue;
        }

        seenKeys.add(dedupKey);

        // Update title if it was garbled
        if (fixedTitle !== doc.title) {
            console.log(`  ✅ Fixed: "${doc.title}" -> "${fixedTitle}"`);
            await prisma.caseDocument.update({
                where: { id: doc.id },
                data: { title: fixedTitle }
            });
            fixedCount++;
        }
    }

    console.log(`\n📊 Results: Fixed ${fixedCount} garbled titles, deleted ${deletedCount} duplicates.`);
    await prisma.$disconnect();
}

fixGarbledDocs().catch(console.error);

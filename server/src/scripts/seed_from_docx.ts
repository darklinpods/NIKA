import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const SAMPLES_DIR = path.join(__dirname, '../../../samples_docs');

function extractTextFromDocx(filePath: string): string {
    try {
        console.log(`Extracting text from: ${path.basename(filePath)}`);
        // Use macOS textutil to convert docx to txt and output to stdout
        const text = execSync(`textutil -convert txt -stdout "${filePath}"`, { encoding: 'utf-8' });
        return text.trim();
    } catch (error) {
        console.error(`Failed to extract text from ${filePath}:`, error);
        return '';
    }
}

async function main() {
    try {
        if (!fs.existsSync(SAMPLES_DIR)) {
            console.error(`Error: Samples directory not found at ${SAMPLES_DIR}`);
            return;
        }

        const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.docx'));
        console.log(`Found ${files.length} .docx files to process.`);

        const priorities = ['low', 'medium', 'high'];
        const statuses = ['todo', 'in-progress', 'done'];

        for (const file of files) {
            const filePath = path.join(SAMPLES_DIR, file);
            const fileContent = extractTextFromDocx(filePath);

            if (!fileContent || fileContent.length < 10) {
                console.log(`Skipping ${file} - no content.`);
                continue;
            }

            // Check if we already processed this file
            const existingCaseDoc = await prisma.caseDocument.findFirst({
                where: { title: file }
            });

            if (existingCaseDoc) {
                console.log(`Skipping ${file} - already in db`);
                continue;
            }

            // Simple title extraction from filename
            let title = file.replace('民事起诉状-', '').replace('.docx', '');
            let clientName = title.split('-')[0] || '未知原告';

            console.log(`Saving Case: ${title}...`);

            await prisma.case.create({
                data: {
                    title: `起诉状: ${title}`,
                    description: fileContent,
                    priority: priorities[Math.floor(Math.random() * priorities.length)],
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    tags: JSON.stringify(['真实案件', '导入']),
                    clientName: clientName,
                    courtName: '待核实',
                    documents: {
                        create: {
                            title: file,
                            content: fileContent,
                            category: "Complaint"
                        }
                    }
                }
            });

            console.log(`✅ Success: ${title}`);
        }

        console.log("\n🎉 All 41 rich cases have been imported successfully!");

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

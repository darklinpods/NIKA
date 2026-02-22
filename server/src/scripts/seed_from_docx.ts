import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

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

async function analyzeCaseWithGemini(text: string, attempt = 1): Promise<any> {
    const prompt = `你是一个专业的法律助理。请分析以下民事起诉状的内容，并提取指定的结构化信息。
**重要要求：** 对于“案件描述 (description)”，请**尽可能详细**地提取诉状中的事实与理由、案发经过、双方争议焦点以及具体的诉讼请求。不要只做简单的一句话概括，要完整保留案件的关键细节。

起诉状内容：
${text}
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "案件的一个简短标题，例如'张三诉李四机动车交通事故责任纠纷案'" },
                        description: { type: Type.STRING, description: "尽可能详细的案件情况描述，包含具体的事实、理由、经过和全部诉讼请求。" },
                        priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "根据案件严重程度判断优先级（高/中/低）" },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "提取3-5个案件标签，例如：['民事', '交通事故', '人身损害']" },
                        clientName: { type: Type.STRING, description: "原告的姓名或名称" },
                        courtName: { type: Type.STRING, description: "起诉状中写明的受诉法院名称，如果没有写则填空字符串" }
                    },
                    required: ["title", "description", "priority", "tags", "clientName", "courtName"]
                }
            }
        });
        const responseText = response.text;
        if (!responseText) {
            throw new Error("No response text from Gemini");
        }
        return JSON.parse(responseText);
    } catch (error: any) {
        if (error?.status === 429 && attempt <= 3) {
            console.log(`Rate limit hit (429). Waiting for 1 hour before retrying... (Attempt ${attempt}/3)`);
            await new Promise(resolve => setTimeout(resolve, 3600000));
            return analyzeCaseWithGemini(text, attempt + 1);
        }
        console.error("Error analyzing with Gemini:", error);
        return null;
    }
}

async function main() {
    try {
        const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.docx'));
        console.log(`Found ${files.length} .docx files to process.`);

        for (const file of files) {
            const filePath = path.join(SAMPLES_DIR, file);
            console.log(`\n--- Processing ${file} ---`);
            const fileContent = extractTextFromDocx(filePath);

            if (!fileContent) {
                console.log(`Skipping ${file} due to extraction failure.`);
                continue;
            }

            // Check if we already processed this file
            const existingCaseDoc = await prisma.caseDocument.findFirst({
                where: { title: file }
            });

            if (existingCaseDoc) {
                console.log(`Skipping ${file} as it is already in the database.`);
                continue;
            }

            console.log(`Analyzing content with Gemini...`);
            const analysisResult = await analyzeCaseWithGemini(fileContent);

            if (!analysisResult) {
                console.log(`Skipping ${file} due to Gemini analysis failure.`);
                continue;
            }

            console.log(`Analysis complete. Saving to database...`);

            // Use a transaction if we want atomic inserts, but individual is fine here
            const newCase = await prisma.case.create({
                data: {
                    title: analysisResult.title,
                    description: analysisResult.description,
                    priority: analysisResult.priority,
                    tags: JSON.stringify(analysisResult.tags),
                    clientName: analysisResult.clientName,
                    courtName: analysisResult.courtName || null,
                    documents: {
                        create: {
                            title: file,
                            content: fileContent,
                            category: "Complaint" // 统一分类为起诉状
                        }
                    }
                }
            });

            console.log(`✅ Successfully created Case ID: ${newCase.id} (${newCase.title})`);

            // Wait slightly to avoid hitting API rate limits too hard
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log("\n🎉 All documents processed successfully!");

    } catch (error) {
        console.error("Fatal error in main process:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { TrafficAccidentSkill } from '../src/skills/TrafficAccidentSkill';

const prisma = new PrismaClient();

async function main() {
  const caseId = '0a151d8e-d739-44c7-bc07-8ae8c4f8bcb2';
  const docs = await prisma.caseDocument.findMany({ where: { caseId } });
  console.log(`Found ${docs.length} docs for case ${caseId}`);
  if (docs.length === 0) return;

  const documentsContent = docs.map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`).join('\n');
  console.log(`Document content length: ${documentsContent.length}`);

  const skill = new TrafficAccidentSkill();
  try {
    const result = await skill.extractParams({ documentsContent });
    console.log("Extraction Result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Extraction error:", e);
  }
}
main();

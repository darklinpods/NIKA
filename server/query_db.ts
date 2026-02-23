import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.case.findUnique({ where: { id: 'case-4' } });
  console.log("Found case-4:", c);
  const count = await prisma.case.count();
  console.log("Total cases:", count);
}
main().catch(console.error).finally(() => prisma.$disconnect());

# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- **Monorepo**: npm workspaces (`client/`, `server/`), root `package.json` orchestrates both
- **Server**: Express + TypeScript, run via `ts-node-dev`, Prisma ORM with SQLite (`server/prisma/dev.db`)
- **Client**: React 19 + Vite, no test framework configured
- **AI**: Multi-provider via `server/src/services/aiService.ts` — default Gemini, switchable via `AI_PROVIDER` env var

## Commands
```bash
npm run dev              # starts both server (port 3001) and client concurrently from root
npm run dev:server       # server only (ts-node-dev, hot reload)
npm run dev:client       # client only (vite)
npm run db:studio        # Prisma Studio (run from root, schema at server/prisma/schema.prisma)
cd server && npx ts-node src/scripts/seed_from_docx.ts  # seed knowledge from docx
```
No test runner is configured — no test commands exist.

## Critical Patterns

### AI JSON Parsing
Always use [`cleanAndParseJsonObject()`](server/src/utils/aiJsonParser.ts) / [`cleanAndParseJsonArray()`](server/src/utils/aiJsonParser.ts) to parse AI responses — never `JSON.parse()` directly. AI returns markdown-wrapped JSON.

### Tool Definitions vs Executor
[`toolDefinitions.ts`](server/src/utils/toolDefinitions.ts) holds only Gemini function declaration schemas. [`toolExecutor.ts`](server/src/utils/toolExecutor.ts) holds execution logic and re-exports `chatTools` from definitions — import `chatTools` from either file (both work).

### Skill + Template Mapping
[`SkillLoader.ts`](server/src/skills/SkillLoader.ts) maps `caseType` → skill markdown file (in `skills/`) + docx template name (in `server/src/templates/docx/`). Skill files are resolved relative to project root (`../` from `server/`), not `server/`.

### Case Type Enum
[`SUPPORTED_CASE_TYPES`](server/src/constants.ts) is the single source of truth for valid `caseType` values — must be kept in sync with [`client/constants/caseTypes.ts`](client/constants/caseTypes.ts).

### Prisma JSON Fields
`Case.tags`, `Case.parties`, `Case.claimData`, `Case.caseFactSheet` are stored as JSON strings in SQLite — always `JSON.stringify()` before write, `JSON.parse()` after read.

### AI Provider Config
`GEMINI_API_KEY` supports comma-separated multiple keys (round-robin rotation). `AI_PROVIDER` env switches to `openai`/`deepseek`/`doubao`/`qwen` — but image/OCR calls always fall back to Gemini regardless of provider.

### Vercel Deployment
Routes registered under both `/api/...` and `/...` in [`server/src/index.ts`](server/src/index.ts) for Vercel compatibility. Server entry for Vercel is [`api/index.ts`](api/index.ts) (root level), not `server/src/index.ts`.

### Agent Tool Loop
[`BaseAgent.run()`](server/src/agents/BaseAgent.ts) hardcodes `gemini-2.5-flash` model and caps tool call loops at 5 iterations (`MAX_LOOPS`).

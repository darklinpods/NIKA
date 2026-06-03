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

### Project Wiki Workflow
This repository uses the Hermes-Team style project wiki in `docs/`. Before starting non-trivial work, read `docs/CURRENT.md` and `docs/TASKS.md`. After finishing work, update `docs/CURRENT.md`; also update `docs/CHANGELOG.md`, `docs/TASKS.md`, and `docs/DECISIONS.md` when their trigger conditions in `docs/AGENTS.md` apply.

### AI JSON Parsing
Always use [`cleanAndParseJsonObject()`](server/src/utils/aiJsonParser.ts) / [`cleanAndParseJsonArray()`](server/src/utils/aiJsonParser.ts) to parse AI responses — never `JSON.parse()` directly. AI returns markdown-wrapped JSON.

### Tool Definitions vs Executor
[`toolDefinitions.ts`](server/src/utils/toolDefinitions.ts) holds only Gemini function declaration schemas. [`toolExecutor.ts`](server/src/utils/toolExecutor.ts) holds execution logic and re-exports `chatTools` from definitions — import `chatTools` from either file (both work).

### Skill + Template Mapping
[`SkillLoader.ts`](server/src/skills/SkillLoader.ts) maps `caseType` → skill markdown file (in `skills/`) + docx template name (in `server/src/templates/docx/`). Skill files are resolved relative to project root (`../` from `server/`), not `server/`.

### Case Type Enum
[`SUPPORTED_CASE_TYPES`](server/src/constants.ts) is the single source of truth for valid `caseType` values — must be kept in sync with [`client/constants/caseTypes.ts`](client/constants/caseTypes.ts).

### Prisma JSON Fields
`Case.tags`, `Case.parties`, `Case.claimData`, and `Case.evidenceData` are stored as JSON strings in SQLite — always `JSON.stringify()` before write, `JSON.parse()` after read. `Case.caseFactSheet` is the lawyer-reviewed case facts surface and is usually Markdown; do not store machine-derived evidence data in it.

### Evidence Management Paradigm
Raw evidence is represented by `CaseDocument` rows whose `category` is exactly `Evidence`. Evidence-reading AI flows must use `getEvidenceDocuments()` / `filterEvidenceDocuments()` from `server/src/utils/evidenceRepository.ts` instead of reading all case documents. Generated documents (`analysis`, `strategy`, `offical_doc`, `evidence_list`) are outputs, not evidence inputs, and must not be fed back into evidence extraction unless explicitly requested.

Evidence extraction endpoints that mutate the case, such as `POST /cases/:id/extract-parties`, should return the updated case object as `caseData` in addition to extracted snippets. Frontend callers should prefer replacing local case state with `caseData` instead of manually merging guessed fields.

Machine-derived evidence data such as invoices and claim calculation items belongs in `Case.evidenceData`. The client should use `client/utils/evidenceData.ts` to parse and serialize it, because that helper also provides backwards-compatible reads for older cases that stored these arrays inside `caseFactSheet`.

Evidence organization logic lives in `server/src/services/evidenceOrganizerService.ts`. Both `POST /cases/:id/organize-evidence` and the `generate_evidence_list` tool must reuse this service so sorting, missing-evidence detection, evidence type, and proof-purpose wording stay consistent.

### AI Provider Config
`GEMINI_API_KEY` supports comma-separated multiple keys (round-robin rotation). `AI_PROVIDER` env switches to `openai`/`deepseek`/`doubao`/`qwen` — but image/OCR calls always fall back to Gemini regardless of provider.

### Vercel Deployment
Routes registered under both `/api/...` and `/...` in [`server/src/index.ts`](server/src/index.ts) for Vercel compatibility. Server entry for Vercel is [`api/index.ts`](api/index.ts) (root level), not `server/src/index.ts`.

### Agent Tool Loop
[`BaseAgent.run()`](server/src/agents/BaseAgent.ts) hardcodes `gemini-2.5-flash` model and caps tool call loops at 5 iterations (`MAX_LOOPS`).

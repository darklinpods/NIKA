# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Never use `JSON.parse()` on AI responses — use [`cleanAndParseJsonObject()`](server/src/utils/aiJsonParser.ts) or [`cleanAndParseJsonArray()`](server/src/utils/aiJsonParser.ts)
- All Prisma writes to `Case.tags`, `Case.parties`, `Case.claimData`, `Case.caseFactSheet` require `JSON.stringify()`; reads require `JSON.parse()`
- Adding a new `caseType` requires updating both [`server/src/constants.ts`](server/src/constants.ts) (`SUPPORTED_CASE_TYPES`) and [`client/constants/caseTypes.ts`](client/constants/caseTypes.ts)
- New skill/template pairs must be registered in [`SkillLoader.ts`](server/src/skills/SkillLoader.ts) `SKILL_MAP` — skill `.md` files go in `skills/` (project root), docx templates in `server/src/templates/docx/`
- Tool schemas (Gemini function declarations) go in [`toolDefinitions.ts`](server/src/utils/toolDefinitions.ts); execution logic goes in [`toolExecutor.ts`](server/src/utils/toolExecutor.ts)
- New Express routes must be registered under both `/api/...` and `/...` in [`server/src/index.ts`](server/src/index.ts) for Vercel compatibility

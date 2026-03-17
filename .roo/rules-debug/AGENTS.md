# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Server logs prefixed with `[Tool: ...]`, `[Agent: ...]`, `[AIService]` — grep these to trace AI call flow
- `aiService.generateContent()` silently rotates Gemini keys on failure — check key index in logs if AI calls fail unexpectedly
- [`BaseAgent.run()`](server/src/agents/BaseAgent.ts) silently exits tool loop after 5 iterations with no error — if agent seems to stop early, check `MAX_LOOPS`
- Prisma JSON fields (`tags`, `parties`, `claimData`, `caseFactSheet`) are raw strings in SQLite — inspect with `npm run db:studio` from root
- `AI_PROVIDER` env switching does NOT affect image/OCR calls — those always use Gemini regardless

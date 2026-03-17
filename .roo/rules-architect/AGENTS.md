# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- [`BaseAgent.run()`](server/src/agents/BaseAgent.ts) hardcodes `gemini-2.5-flash` and caps at 5 tool-call iterations — not configurable without code change
- Skill files resolved relative to project root (`../` from `server/`) — [`SkillLoader.ts`](server/src/skills/SkillLoader.ts) falls back to `process.cwd()` if root path missing
- Routes must be dual-registered (`/api/...` and `/...`) because Vercel rewrites strip the `/api` prefix before hitting the Express handler
- No migration rollback — Prisma SQLite schema changes are forward-only; dropping fields loses data permanently
- `GEMINI_API_KEY` round-robin is stateful per process — key rotation state resets on server restart

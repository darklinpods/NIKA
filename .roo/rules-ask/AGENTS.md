# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- `skills/` (project root) contains case-type-specific AI prompt markdown files — not server code
- `server/src/templates/docx/` holds Chinese-named `.docx` templates — filenames must match exactly what [`SkillLoader.ts`](server/src/skills/SkillLoader.ts) `SKILL_MAP` references
- [`toolExecutor.ts`](server/src/utils/toolExecutor.ts) re-exports `chatTools` from [`toolDefinitions.ts`](server/src/utils/toolDefinitions.ts) — both import paths work
- Vercel entry point is [`api/index.ts`](api/index.ts) at project root, not `server/src/index.ts`
- `client/` package name in `package.json` is `taskgenius-ai` — unrelated to the law case domain name

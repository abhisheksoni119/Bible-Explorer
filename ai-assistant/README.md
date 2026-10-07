# AI Database Assistant — `ai-assistant/`

Production module for Bible Verse Insights. Integrates into the existing
Next.js + Supabase + OpenRouter stack — no new backend, database, or
framework introduced.

## Status: Version 1 — Foundation only (Phase 1 complete)

Everything in this folder is infrastructure: types, config, clients,
validation, and error handling. **No business logic is implemented.** Every
function in `services/` throws `NotImplementedError` — that's intentional,
per the frozen Version 1 scope.

## Frozen Version 1 scope

1. Research
2. Keyword Discovery
3. Search Intent Detection
4. Topic Generation
5. Category Selection
6. Slug Generation
7. Duplicate Detection
8. Insert validated topics into the existing `topics` table

Explicitly out of scope: article generation, article modification, CMS
redesign, schema changes, new tables.

## Folder structure

```
ai-assistant/
  config/        env.ts (typed env loader), constants.ts
  types/         TopicRow, ContentIdeaRow, TopicCandidate, research/intent types
  clients/       supabase.client.ts, openRouter.client.ts (connection layer only)
  services/      one file per scope item above — signatures only, Phase 2 fills in bodies
  validation/    generic guards (slug format, UUID, language code, string length)
  utils/         Result<T,E>, AppError hierarchy, logger
```

## Before Phase 2 starts — one open question to resolve

`topics.category` is CHECK-constrained in Postgres to exactly 5 values,
matching `lib/categories.js` (`topics`, `guides`, `questions`,
`bible-verses`, `bible-characters`). There is **also** a separate Supabase
`categories` table with 10 rows that nothing in the current codebase
references from `topics.category`. Category Selection (scope item #5) must
not guess between these — inserting a category outside the CHECK-constrained
list will fail at the database level. Confirm which list is authoritative
before implementing `categorySelection.service.ts`.

## Conventions this module follows (deliberately, to match the existing app)

- Supabase: service-role client, session persistence disabled — same as
  `lib/supabaseAdmin.js`.
- OpenRouter: same URL, headers, model default, and truncation detection as
  `lib/generator.js` — kept as a separate typed client rather than importing
  that file, since `lib/generator.js` is tightly coupled to article-prompt
  building, which is out of scope here.
- Env vars: reuses `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY` /
  `Open_Router_API`. Two new optional env vars, additive only:
  `AI_ASSISTANT_OPENROUTER_MODEL`, `AI_ASSISTANT_REQUEST_TIMEOUT_MS`.
- Slug rules: `slugGeneration.service.ts` must reuse the sanitisation logic
  already in `lib/topicSlug.js` and the category-specific enforced formats
  in `lib/generator.js` (`enforceArticleMeta`, `candidateSlugs`) rather than
  re-deriving new rules.
- Duplicate rules: `duplicateDetection.service.ts` should extend the
  `(name, category)` matching already used by `scripts/dedupe-topics.mjs`,
  adding `language` scoping since that column exists on `topics` but
  predates that script.
- Admin auth: any future route handler under `app/api/admin/ai-assistant/`
  is automatically protected by the existing `middleware.js` cookie check —
  no new auth code needed in this module.

## Why this lives outside `lib/`

The root `tsconfig.json` excludes the entire `lib/` folder (a leftover from
an unused pnpm-workspace/composite-project scaffold — see `lib/db`,
`lib/api-zod`, `lib/api-client-react`). Placing new TypeScript here instead
keeps it covered by the project's real type-checking during `next build`.

## Ready for Phase 2

Phase 2 fills in the bodies of the eight `services/*.ts` functions, in
scope order, each consuming/producing the types already defined here and
using `clients/openRouter.client.ts` + `clients/supabase.client.ts` for I/O.
No new route handler exists yet — that's also Phase 2 (or later), once the
orchestration between these services is decided.

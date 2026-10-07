# AI Database Assistant — Version 1 Implementation Contract (FROZEN)

Status: **Architecture frozen.** No business logic implemented. This document
defines contracts only, derived from the Phase 1 foundation already in
`ai-assistant/` (types, clients, validation, utils, service signatures).

Scope confirmation: this is the AI Database Assistant only. It is not part of
the multilingual CMS work. No existing application code, database schema, or
framework is changed by this document or by Phase 2. Category source of truth
for Version 1 is `lib/categories.js` (`CATEGORY_VALUES`, 5 values). The
separate `categories` Supabase table is ignored for Version 1.

---

## 1. Complete Execution Flow

```
Input (raw request: seedQuery, language, optional relatedTopicId)
  ↓
Language                     — validate/normalize language code
  ↓
Seed Keyword                 — validate the seed query itself
  ↓
Research                     — performResearch()
  ↓
Keyword Discovery            — discoverKeywords()
  ↓
Search Intent                — detectSearchIntent()
  ↓
Topic Generation             — generateTopicName()
  ↓
Category Selection           — selectCategory()
  ↓
Slug Generation               — generateSlug()
  ↓
Duplicate Detection          — checkForDuplicateTopic()
  ↓
Insert into topics           — insertTopic()
  ↓
Return Result
```

Each stage consumes only the output of the stage(s) before it (plus the
original Input where explicitly noted). No stage reaches backward into a
later stage. No stage writes to Supabase except **Insert into topics**, which
is the only write in the entire pipeline. Duplicate Detection is a read-only
gate immediately before that single write.

If any stage returns `Err`, the pipeline stops at that stage. Later stages
never run on partial/failed input — see Section 5 (Error Propagation Flow).

---

## 2. Service Dependency Diagram

```
                         ┌────────────────────┐
                         │  config/env.ts      │  (loadConfig)
                         └─────────┬───────────┘
                                   │ used by
              ┌────────────────────┼────────────────────┐
              ▼                                          ▼
   ┌─────────────────────┐                   ┌──────────────────────┐
   │ clients/openRouter   │                   │ clients/supabase      │
   │ .client.ts           │                   │ .client.ts            │
   └──────────┬────────────┘                   └───────────┬────────────┘
              │ used by                                    │ used by
   ┌──────────┴──────────────────────────┐                 │
   ▼                                     ▼                 │
Research           Keyword Discovery  Search Intent         │
(performResearch)   (discoverKeywords) (detectSearchIntent) │
   │                     │                   │              │
   └──────────┬──────────┴─────────┬─────────┘              │
              ▼                    ▼                        │
        Topic Generation ──────────┘                        │
        (generateTopicName)                                 │
              │                                              │
              ▼                                              │
        Category Selection                                  │
        (selectCategory)         ← validation/validators.ts │
              │                     (validateCategory        │
              ▼                      against CATEGORY_VALUES)│
        Slug Generation                                     │
        (generateSlug)           ← validation/validators.ts │
              │                     (validateSlug)           │
              ▼                                              │
        Duplicate Detection ─────────────────────────────────┘
        (checkForDuplicateTopic)   [READS topics via supabase.client.ts]
              │
              ▼
        Insert into topics
        (insertTopic)             [WRITES topics via supabase.client.ts]
              │
              ▼
          Result<TopicInsertionResult, AppError>
```

Cross-cutting dependencies (used by every stage, not drawn per-arrow above):
- `utils/result.ts` — every service returns `Result<T, AppError>`.
- `utils/errors.ts` — every service's failure branch constructs one of the
  `AppError` subclasses.
- `utils/logger.ts` — available to every service for structured logging;
  not required by the contract, but consistent with existing conventions.
- `validation/validators.ts` — called by Category Selection, Slug
  Generation, and Duplicate Detection (and by the orchestrator itself for
  Language/Seed Keyword validation at the top of the pipeline).

External dependencies:
- **OpenRouter** (via `clients/openRouter.client.ts`): Research, Keyword
  Discovery, Search Intent, Topic Generation. (Category Selection and Slug
  Generation may or may not need it — see contracts below; kept
  implementation-agnostic per "no algorithms" instruction.)
- **Supabase `topics` table** (via `clients/supabase.client.ts`): read by
  Duplicate Detection, written by Insert into topics only.
- **`content_ideas` table**: not part of the Version 1 execution flow above.
  No stage in this frozen pipeline reads or writes `content_ideas`.

---

## 3. Service Contracts

### 3.0 Pipeline Input Validation — Language + Seed Keyword

These two steps sit before Research in the flow diagram but are not separate
`services/*.ts` files in the Phase 1 foundation — they are orchestrator-level
validation calls against `validation/validators.ts`, run before any service
executes.

**Language**
1. **Responsibility**: Confirm the requested language is a well-formed
   2-letter code before anything downstream uses it.
2. **Input**: raw `language` value from the pipeline Input (optional; may be
   absent).
3. **Output**: normalized lowercase language code string, defaulting to
   `DEFAULT_LANGUAGE` (`'en'`, from `config/constants.ts`) when absent.
4. **Dependencies**: `validation/validators.ts` (`validateLanguageCode`),
   `config/constants.ts` (`DEFAULT_LANGUAGE`, `LANGUAGE_CODE_PATTERN`).
5. **Possible Errors**: `ValidationError` — language present but not a valid
   2-letter ISO 639-1-style code.
6. **Validation Rules**: matches `LANGUAGE_CODE_PATTERN` (`^[a-z]{2}$`,
   case-insensitive on input, normalized to lowercase on output).

**Seed Keyword**
1. **Responsibility**: Confirm the seed query is a usable non-empty string
   before spending a Research call on it.
2. **Input**: raw `seedQuery` value from the pipeline Input.
3. **Output**: trimmed, non-empty seed query string.
4. **Dependencies**: `validation/validators.ts` (`isNonEmptyString`,
   `clampString`).
5. **Possible Errors**: `ValidationError` — missing, empty, or
   whitespace-only seed query.
6. **Validation Rules**: non-empty after trim; length bound TBD by Phase 2
   (no constant currently reserved for seed-query length in
   `config/constants.ts` — only `TOPIC_NAME_*` and `SLUG_*` bounds exist
   today).

---

### 3.1 Research — `services/research.service.ts` (`performResearch`)

1. **Responsibility**: Gather raw research signal (keyword candidates,
   related topic names) for a validated seed query. Read/gather only.
2. **Input**: `ResearchInput { seedQuery: string; language?: string;
   relatedTopicId?: string | null }` — `seedQuery` and `language` here are
   the already-validated values from step 3.0, not raw user input.
3. **Output**: `Result<ResearchOutput, AppError>` where `ResearchOutput =
   { seedQuery: string; language: string; keywords: KeywordCandidate[];
   relatedTopics: string[] }`.
4. **Dependencies**: `clients/openRouter.client.ts` (`callOpenRouter`);
   optionally `clients/supabase.client.ts` if `relatedTopicId` is used to
   pull existing topic context (read-only). No write access.
5. **Possible Errors**: `OpenRouterError` (request failure, timeout, empty
   content, truncated response), `ConfigurationError` (missing OpenRouter
   key — propagated from the client), `ValidationError` (if `relatedTopicId`
   is present but not a valid UUID).
6. **Validation Rules**: `relatedTopicId`, if provided, must pass
   `isValidUuid`. `seedQuery` is assumed already validated by step 3.0 — this
   service does not re-validate it, only consumes it.

---

### 3.2 Keyword Discovery — `services/keywordDiscovery.service.ts` (`discoverKeywords`)

1. **Responsibility**: Expand `ResearchOutput` into a ranked/deduplicated
   list of `KeywordCandidate` entries for downstream Topic Generation and
   Search Intent.
2. **Input**: `KeywordDiscoveryInput { research: ResearchOutput;
   maxCandidates?: number }`.
3. **Output**: `Result<KeywordCandidate[], AppError>`.
4. **Dependencies**: `clients/openRouter.client.ts` (if expansion requires a
   model call beyond what Research already returned — implementation detail
   deferred to Phase 2, not decided here).
5. **Possible Errors**: `OpenRouterError`, `ConfigurationError`,
   `ValidationError` (e.g. `maxCandidates` ≤ 0 if provided).
6. **Validation Rules**: `research.keywords` must be a defined array (may be
   empty — an empty array is a valid, non-error input representing "no
   research signal found"; downstream stages must handle an empty keyword
   list without crashing). `maxCandidates`, if provided, must be a positive
   integer.

---

### 3.3 Search Intent — `services/intentDetection.service.ts` (`detectSearchIntent`)

1. **Responsibility**: Classify a keyword (with optional related keywords
   for context) into one `SearchIntentType`.
2. **Input**: `IntentDetectionInput { keyword: string; relatedKeywords?:
   KeywordCandidate[] }`.
3. **Output**: `Result<SearchIntentResult, AppError>` where
   `SearchIntentResult = { type: SearchIntentType; confidence: number;
   reasoning?: string }` and `SearchIntentType` is one of
   `'informational' | 'navigational' | 'transactional' | 'commercial'`.
4. **Dependencies**: `clients/openRouter.client.ts`.
5. **Possible Errors**: `OpenRouterError`, `ConfigurationError`,
   `ValidationError` (empty `keyword`).
6. **Validation Rules**: `keyword` must pass `isNonEmptyString`.
   `confidence` in the output must be within `[0, 1]` — this is a contract
   obligation on the service's own output, not an input validation rule.

---

### 3.4 Topic Generation — `services/topicGeneration.service.ts` (`generateTopicName`)

1. **Responsibility**: Produce a single proposed topic **name** (string
   only — no category, no slug) from research + keywords + intent.
2. **Input**: `TopicGenerationInput { research: ResearchOutput; keywords:
   KeywordCandidate[]; intent: SearchIntentResult; language?: string }`.
3. **Output**: `Result<TopicGenerationOutput, AppError>` where
   `TopicGenerationOutput = { name: string; language: string;
   reasoning?: string }`.
4. **Dependencies**: `clients/openRouter.client.ts`.
5. **Possible Errors**: `OpenRouterError`, `ConfigurationError`,
   `ValidationError` (propagated if the model's proposed name fails
   `validateTopicName` — length bounds `TOPIC_NAME_MIN_LENGTH` /
   `TOPIC_NAME_MAX_LENGTH` from `config/constants.ts`).
6. **Validation Rules**: output `name` must satisfy `validateTopicName`
   before this service returns `Ok` — a name that fails length/emptiness
   checks is this service's own error to return, not something pushed to
   the caller to catch later. `language` in the output defaults to
   `DEFAULT_LANGUAGE` if not supplied in the input.

---

### 3.5 Category Selection — `services/categorySelection.service.ts` (`selectCategory`)

1. **Responsibility**: Assign exactly one `TopicCategory` to the generated
   topic name.
2. **Input**: `CategorySelectionInput { topicName: string; keywords?:
   string[] }`.
3. **Output**: `Result<CategorySelectionOutput, AppError>` where
   `CategorySelectionOutput = { category: TopicCategory; confidence: number;
   reasoning?: string }`.
4. **Dependencies**: `validation/validators.ts` (`validateCategory`), called
   with the allowed-list resolved from `lib/categories.js`
   `CATEGORY_VALUES` (per the frozen category-source decision above — the
   `categories` Supabase table is not consulted). No OpenRouter or Supabase
   dependency is mandated by the contract; whether classification uses a
   model call is a Phase 2 implementation choice, not fixed here.
5. **Possible Errors**: `ValidationError` — the selected category fails
   `validateCategory` against `lib/categories.js` `CATEGORY_VALUES` (5
   allowed values only: `topics`, `guides`, `questions`, `bible-verses`,
   `bible-characters`). `OpenRouterError`/`ConfigurationError` only if the
   implementation chosen in Phase 2 uses a model call.
6. **Validation Rules**: the returned `category` MUST be one of
   `TOPIC_CATEGORY_VALUES` (`ai-assistant/types/category.types.ts`, kept in
   sync with `lib/categories.js`). This is a hard gate — a category outside
   this list must never be returned as `Ok`, since the database CHECK
   constraint will reject it regardless.

---

### 3.6 Slug Generation — `services/slugGeneration.service.ts` (`generateSlug`)

1. **Responsibility**: Produce a well-formed candidate slug for a topic
   name + category. Does not check uniqueness against the database.
2. **Input**: `SlugGenerationInput { topicName: string; category:
   TopicCategory }`.
3. **Output**: `Result<SlugGenerationOutput, AppError>` where
   `SlugGenerationOutput = { slug: string; alternates?: string[] }`.
4. **Dependencies**: `validation/validators.ts` (`validateSlug`). Must
   reuse the sanitisation rules already established in `lib/topicSlug.js`
   (general case) and the category-specific enforced formats in
   `lib/generator.js` (`enforceArticleMeta`, `candidateSlugs`) for
   `bible-verses` and `bible-characters` — this is a contract obligation on
   *which rules apply*, not on how they're coded (no algorithm specified
   here).
5. **Possible Errors**: `ValidationError` — produced slug fails
   `validateSlug` (format/length bounds `SLUG_MIN_LENGTH` /
   `SLUG_MAX_LENGTH` from `config/constants.ts`).
6. **Validation Rules**: `slug` must satisfy `isValidSlugFormat`
   (lowercase, hyphen-separated, 3–100 chars). For `bible-verses` and
   `bible-characters` categories, the slug must match the enforced format
   pattern already defined in `lib/generator.js` for that category — this
   service does not have discretion to deviate for those two categories.

---

### 3.7 Duplicate Detection — `services/duplicateDetection.service.ts` (`checkForDuplicateTopic`)

1. **Responsibility**: Read-only check of a fully-formed `TopicCandidate`
   against existing `topics` rows before any write is attempted.
2. **Input**: `TopicCandidate { name, category, language, slug, parentId?,
   isPillar?, keywords?, intent?, reasoning? }` — the fully assembled
   candidate, output of stages 3.4–3.6 combined.
3. **Output**: `Result<DuplicateCheckResult, AppError>` where
   `DuplicateCheckResult = { isDuplicate: boolean; matches: TopicRow[];
   reason?: 'exact_name_match' | 'slug_collision' | 'none' }`.
4. **Dependencies**: `clients/supabase.client.ts` (`getSupabaseClient`) —
   SELECT against `topics` only. No write.
5. **Possible Errors**: `SupabaseOperationError` (query failure),
   `ConfigurationError` (propagated from the client if Supabase config is
   missing).
6. **Validation Rules**: matching scope extends the existing
   `scripts/dedupe-topics.mjs` precedent — `(name, category)`
   case-insensitive exact match — **plus** `language` scoping (since
   `topics.language` exists and a same-named topic can legitimately exist
   in two languages), **plus** an independent slug-collision check against
   `topics.slug`. `isDuplicate: true` if either the name+category+language
   match or the slug collides.

---

### 3.8 Insert into topics — `services/topicInsertion.service.ts` (`insertTopic`)

1. **Responsibility**: The single write this module is permitted to make.
   Insert a `TopicCandidate` — which has already passed validation
   (Sections 3.4–3.6) and duplicate-checking (3.7) — into the live
   Supabase `topics` table.
2. **Input**: `TopicCandidate` (same shape as 3.7's input — this stage only
   runs when 3.7 returned `isDuplicate: false`).
3. **Output**: `Result<TopicInsertionResult, AppError>` where
   `TopicInsertionResult = { inserted: TopicRow }`.
4. **Dependencies**: `clients/supabase.client.ts` (`getSupabaseClient`) —
   INSERT into `topics` only. Must mirror the insert shape and
   schema-error fallback behavior already used by
   `app/api/admin/topics/route.js` `POST` (retry without `is_pillar` if
   that column is reported missing by Supabase).
5. **Possible Errors**: `SupabaseOperationError` (insert failure — includes
   CHECK constraint violation if category or another DB-level constraint is
   somehow still violated at this point), `ConfigurationError`,
   `DuplicateTopicError` (defensive — if a race condition causes a unique
   constraint violation at insert time despite passing 3.7, this is
   reported as `DuplicateTopicError`, not a generic `SupabaseOperationError`,
   so the caller can distinguish "someone else inserted it first" from
   "the query itself was malformed").
6. **Validation Rules**: this service does not re-validate `name`,
   `category`, or `slug` — those are the responsibility of the stages that
   produced them (3.4–3.6). It performs no independent business validation;
   its only obligation is to insert exactly what it was given, or fail.

---

## 4. Validation Flow

```
Input
  │
  ├─ Language        → validateLanguageCode           (ValidationError on fail)
  ├─ Seed Keyword     → isNonEmptyString / clampString (ValidationError on fail)
  │
  ▼
Research → Keyword Discovery → Search Intent
  │   (no shared validators; each service's OWN output is trusted as-is
  │    by the next stage — no stage re-validates the prior stage's output
  │    structurally, since Result<T,E> typing already guarantees shape)
  ▼
Topic Generation
  │   → validateTopicName applied to the GENERATED name before this
  │     service returns Ok (self-validating, per contract 3.4.6)
  ▼
Category Selection
  │   → validateCategory applied against TOPIC_CATEGORY_VALUES
  │     (sourced from lib/categories.js) before returning Ok
  ▼
Slug Generation
  │   → validateSlug applied to the GENERATED slug before returning Ok;
  │     enforced-format check for bible-verses / bible-characters
  ▼
Duplicate Detection
  │   → no new validators; consumes the already-validated TopicCandidate
  │     and checks it against live data (not a format check, a data check)
  ▼
Insert into topics
  │   → no independent validation; trusts 3.4–3.7 and reports DB-level
  │     failures (including CHECK constraint) if something still slips through
  ▼
Return Result
```

Principle: **each service validates only the output it itself produces**
before returning `Ok`. No downstream service re-validates a well-typed
upstream `Ok` value's internal format — it only adds the checks that are
uniquely its own responsibility (duplicate-checking is a data check, not a
format check; insertion trusts the pipeline that fed it). Language and Seed
Keyword are the two exceptions — they validate raw, unstructured pipeline
Input before Research ever runs, since nothing upstream of them has already
validated that input.

---

## 5. Error Propagation Flow

```
Any stage returns Err(AppError)
  │
  ▼
Pipeline halts immediately at that stage
  │
  ▼
No downstream stage executes
  │
  ▼
Err(AppError) is returned as the pipeline's final Result
  (the orchestrator does not catch/retry/transform the error —
   it propagates the Result exactly as the failing stage produced it)
```

Error type → originating layer:

| Error class              | Produced by                                                            |
|---------------------------|-------------------------------------------------------------------------|
| `ConfigurationError`      | `config/env.ts` (`loadConfig`), propagated through both clients        |
| `ValidationError`         | `validation/validators.ts`, surfaced by Language/Seed Keyword steps, Topic Generation (3.4), Category Selection (3.5), Slug Generation (3.6) |
| `OpenRouterError`         | `clients/openRouter.client.ts`, surfaced by Research, Keyword Discovery, Search Intent, Topic Generation |
| `SupabaseOperationError`  | `clients/supabase.client.ts` call sites — Duplicate Detection (read), Insert into topics (write) |
| `DuplicateTopicError`     | Insert into topics only (race-condition case, see 3.8.5) — Duplicate Detection itself reports duplicates via `DuplicateCheckResult.isDuplicate`, not by returning `Err` |
| `NotImplementedError`     | Any Phase 1 stub still uncalled in Phase 2's real orchestrator (should never appear once Phase 2 is complete) |

Two distinct signaling channels exist by design, and Phase 2 must preserve
the distinction:
- **"This is a duplicate"** is normal, expected pipeline output — the
  Duplicate Detection stage returns `Ok(DuplicateCheckResult { isDuplicate:
  true, ... })`, not an error. It is the orchestrator's job to treat
  `isDuplicate: true` as a reason to stop before calling `insertTopic`,
  exactly like an `Err` would halt the pipeline, but it is not itself an
  `AppError`.
- **A genuine failure** (bad config, network failure, DB error, an
  unexpected race-condition duplicate at insert time) is always
  `Err(AppError)`.

No stage is permitted to throw past its own boundary except
`NotImplementedError` in the current Phase 1 stubs (a deliberate signal that
Phase 2 work is incomplete, not a runtime error path Phase 2 code should
ever trigger).

---

## 6. Confirmation

The architecture above is derived entirely from the existing Phase 1
foundation (`ai-assistant/types`, `ai-assistant/clients`,
`ai-assistant/validation`, `ai-assistant/utils`, `ai-assistant/services/*`
signatures) with no new types, functions, files, or dependencies introduced
in this step. No code was written. No database schema was proposed or
changed. No new framework, backend, or category source was introduced.
Category source of truth is confirmed as `lib/categories.js`
`CATEGORY_VALUES`; the legacy `categories` table is excluded from Version 1.

**Architecture is frozen and ready for Phase 2 implementation**, in the
order: Research → Keyword Discovery → Search Intent → Topic Generation →
Category Selection → Slug Generation → Duplicate Detection → Insert into
topics.

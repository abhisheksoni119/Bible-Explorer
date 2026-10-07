/**
 * Orchestrator — runResearch().
 *
 * Executes the frozen Version 1 pipeline, in order, exactly as specified:
 *
 *   Language Validation
 *     -> Seed Keyword Validation
 *     -> Research               (ResearchService)
 *     -> Keyword Expansion      (KeywordService)
 *     -> Intent Classification  (IntentService)
 *     -> Topic Generation       (TopicService)
 *     -> Category Selection     (CategoryService)
 *     -> Slug Generation        (SlugService)
 *     -> Duplicate Detection    (DuplicateService)
 *     -> Insert into topics     (InsertService)
 *     -> Return Result
 *
 * This is the ONLY place in the module that calls InsertService, per the
 * frozen rule "no service may directly call InsertService except the
 * orchestrator". Every other service is called in strict pipeline order;
 * none of them call each other directly.
 *
 * Not exposed as an API route, not wired to any UI, no batching or
 * scheduling — this is the bare engine function only.
 */

import { performResearch } from './services/research.service';
import { discoverKeywords } from './services/keywordDiscovery.service';
import { detectSearchIntent } from './services/intentDetection.service';
import { generateTopicName } from './services/topicGeneration.service';
import { selectCategory } from './services/categorySelection.service';
import { generateSlug } from './services/slugGeneration.service';
import { checkForDuplicateTopic } from './services/duplicateDetection.service';
import { insertTopic } from './services/topicInsertion.service';

import { DuplicateCheckResult, KeywordCandidate, ResearchInput, TopicCandidate, TopicRow } from './types';
import { AppError, ValidationError } from './utils/errors';
import { ok, err, Result } from './utils/result';
import { validateLanguageCode } from './validation/validators';
import { DEFAULT_LANGUAGE } from './config/constants';

/**
 * Pipeline input. Deliberately reuses ResearchInput's shape rather than
 * introducing a new type — the orchestrator's raw input IS what Research
 * ultimately needs, just not yet validated.
 */
export type RunResearchInput = ResearchInput;

/**
 * Pipeline outcome. This is the one new type this implementation step
 * requires (per "do not introduce new types unless absolutely required to
 * satisfy existing contracts") — no existing type captures "the pipeline
 * completed but stopped short of insertion because a duplicate was found",
 * and the frozen architecture (§5) requires that case to be a normal Ok
 * result, not an AppError.
 */
export type RunResearchOutcome =
  | { status: 'inserted'; topic: TopicRow; candidate: TopicCandidate }
  | { status: 'duplicate'; duplicate: DuplicateCheckResult; candidate: TopicCandidate };

export async function runResearch(
  input: RunResearchInput,
): Promise<Result<RunResearchOutcome, AppError>> {
  // ── Language Validation ────────────────────────────────────────────────
  let language: string;
  if (input.language !== undefined && input.language !== null && input.language !== '') {
    const languageResult = validateLanguageCode(input.language);
    if (!languageResult.ok) return err(languageResult.error);
    language = languageResult.value;
  } else {
    language = DEFAULT_LANGUAGE;
  }

  // ── Seed Keyword Validation ────────────────────────────────────────────
  const seedQuery = input.seedQuery?.trim();
  if (!seedQuery) {
    return err(new ValidationError('seedQuery is required'));
  }

  // ── Research ────────────────────────────────────────────────────────────
  const researchResult = await performResearch({
    seedQuery,
    language,
    relatedTopicId: input.relatedTopicId ?? null,
  });
  if (!researchResult.ok) return err(researchResult.error);
  const research = researchResult.value;

  // ── Keyword Expansion ───────────────────────────────────────────────────
  const keywordsResult = await discoverKeywords({ research });
  if (!keywordsResult.ok) return err(keywordsResult.error);
  const keywords: KeywordCandidate[] = keywordsResult.value;

  // ── Intent Classification ──────────────────────────────────────────────
  const primaryKeyword = keywords[0]?.keyword ?? seedQuery;
  const relatedKeywords = keywords.length > 1 ? keywords.slice(1) : undefined;
  const intentResult = await detectSearchIntent({ keyword: primaryKeyword, relatedKeywords });
  if (!intentResult.ok) return err(intentResult.error);
  const intent = intentResult.value;

  // ── Topic Generation ────────────────────────────────────────────────────
  const topicNameResult = await generateTopicName({ research, keywords, intent, language });
  if (!topicNameResult.ok) return err(topicNameResult.error);
  const topicName = topicNameResult.value;

  // ── Category Selection ──────────────────────────────────────────────────
  const categoryResult = await selectCategory({
    topicName: topicName.name,
    keywords: keywords.map((k) => k.keyword),
  });
  if (!categoryResult.ok) return err(categoryResult.error);
  const category = categoryResult.value;

  // ── Slug Generation ─────────────────────────────────────────────────────
  const slugResult = await generateSlug({ topicName: topicName.name, category: category.category });
  if (!slugResult.ok) return err(slugResult.error);
  const slug = slugResult.value;

  // ── Assemble the candidate handed to Duplicate Detection + Insertion ──
  const candidate: TopicCandidate = {
    name: topicName.name,
    category: category.category,
    language: topicName.language,
    slug: slug.slug,
    parentId: null, // no parent-selection stage exists in the frozen V1 flow
    isPillar: false, // no pillar-assignment stage exists in the frozen V1 flow
    keywords: keywords.map((k) => k.keyword),
    intent,
    reasoning: topicName.reasoning,
  };

  // ── Duplicate Detection ─────────────────────────────────────────────────
  const duplicateResult = await checkForDuplicateTopic(candidate);
  if (!duplicateResult.ok) return err(duplicateResult.error);

  if (duplicateResult.value.isDuplicate) {
    // Per the frozen architecture (§5): a duplicate is normal pipeline
    // output, not an AppError. The pipeline halts before InsertService,
    // but returns Ok so the caller can inspect what was found.
    return ok({ status: 'duplicate', duplicate: duplicateResult.value, candidate });
  }

  // ── Insert into topics ───────────────────────────────────────────────────
  const insertResult = await insertTopic(candidate);
  if (!insertResult.ok) return err(insertResult.error);

  // ── Return Result ────────────────────────────────────────────────────────
  return ok({ status: 'inserted', topic: insertResult.value.inserted, candidate });
}

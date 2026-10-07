/**
 * CategoryService — Version 1 scope item #5. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.5): assign exactly one TopicCategory
 * to a generated topic name, via OpenRouter, then validate the result
 * against the frozen category source of truth: lib/categories.js
 * CATEGORY_VALUES (5 values). The legacy Supabase `categories` table is
 * NOT consulted, per the frozen architecture decision.
 *
 * A category outside CATEGORY_VALUES is a hard failure — it would violate
 * the live Postgres CHECK constraint on topics.category, so this service
 * never returns Ok with an unvalidated category.
 */

import { callOpenRouter, ChatMessage } from '../clients/openRouter.client';
import { CATEGORY_VALUES, categoryLabel } from '../../lib/categories.js';
import { TopicCategory } from '../types';
import { AppError, OpenRouterError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { isNonEmptyString, validateCategory } from '../validation/validators';

export interface CategorySelectionInput {
  topicName: string;
  keywords?: string[];
}

export interface CategorySelectionOutput {
  category: TopicCategory;
  confidence: number;
  reasoning?: string;
}

const SYSTEM_PROMPT =
  'You are a content classifier for a Christian Bible study website. ' +
  'You assign exactly one category to a topic name from a fixed list. ' +
  'You always respond with valid JSON only, no markdown fencing.';

function buildUserPrompt(topicName: string, keywords: string[] | undefined): string {
  const categoryLines = (CATEGORY_VALUES as string[])
    .map((value: string) => `- "${value}": ${categoryLabel(value)}`)
    .join('\n');
  const keywordList = (keywords ?? []).slice(0, 10).join(', ');

  return (
    `Topic name: "${topicName}"\n` +
    (keywordList ? `Associated keywords: ${keywordList}\n` : '') +
    `\nAvailable categories (choose exactly one value, verbatim):\n${categoryLines}\n\n` +
    'Guidance: "bible-characters" is for a specific named person. "bible-verses" is for ' +
    'a collection-of-verses page. "questions" is for a direct question phrasing. ' +
    '"guides" is for a how-to / practice. "topics" is the general fallback for a concept.\n\n' +
    'Return ONLY this JSON shape:\n' +
    '{"category": "one-of-the-values-above", "confidence": <number between 0 and 1>, "reasoning": "one short sentence"}'
  );
}

interface RawCategoryResponse {
  category?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export async function selectCategory(
  input: CategorySelectionInput,
): Promise<Result<CategorySelectionOutput, AppError>> {
  if (!isNonEmptyString(input.topicName)) {
    return err(new ValidationError('topicName is required for category selection'));
  }
  const topicName = input.topicName.trim();

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(topicName, input.keywords) },
  ];

  const callResult = await callOpenRouter(messages, { json: true, maxTokens: 200 });
  if (!callResult.ok) return err(callResult.error);

  let parsed: RawCategoryResponse;
  try {
    parsed = JSON.parse(callResult.value) as RawCategoryResponse;
  } catch {
    return err(new OpenRouterError('OpenRouter returned invalid JSON for category selection', { raw: callResult.value }));
  }

  // Hard gate: the returned category MUST be one of CATEGORY_VALUES
  // (lib/categories.js) — this is the single source of truth per the
  // frozen architecture. Anything else fails validation, never gets coerced.
  const categoryValidation = validateCategory(parsed.category, CATEGORY_VALUES as string[]);
  if (!categoryValidation.ok) return err(categoryValidation.error);

  const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence);
  const confidence = clampConfidence(rawConfidence);

  const output: CategorySelectionOutput = {
    category: categoryValidation.value as TopicCategory,
    confidence,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
  };

  return ok(output);
}

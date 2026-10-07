/**
 * IntentService — Version 1 scope item #3. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.3): classify a keyword (with optional
 * related-keyword context) into one SearchIntentType via OpenRouter.
 * Self-validates its own output: `type` must be one of the four allowed
 * values, `confidence` must land in [0, 1] before returning Ok.
 */

import { callOpenRouter, ChatMessage } from '../clients/openRouter.client';
import { KeywordCandidate, SearchIntentResult, SearchIntentType } from '../types';
import { AppError, OpenRouterError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { isNonEmptyString } from '../validation/validators';

export interface IntentDetectionInput {
  keyword: string;
  relatedKeywords?: KeywordCandidate[];
}

const ALLOWED_INTENTS: readonly SearchIntentType[] = [
  'informational',
  'navigational',
  'transactional',
  'commercial',
];

const SYSTEM_PROMPT =
  'You are a search-intent classifier for a Christian Bible content website. ' +
  'You classify a keyword into exactly one of: informational, navigational, ' +
  'transactional, commercial. Most Bible-content queries are informational — ' +
  'only choose another category when the keyword clearly signals it ' +
  '(e.g. a brand/site name is navigational, "buy"/"download" is transactional). ' +
  'You always respond with valid JSON only, no markdown fencing.';

function buildUserPrompt(keyword: string, relatedKeywords?: KeywordCandidate[]): string {
  const relatedList = (relatedKeywords ?? []).slice(0, 10).map((k) => k.keyword).join(', ');
  return (
    `Primary keyword: "${keyword}"\n` +
    (relatedList ? `Related keywords: ${relatedList}\n` : '') +
    '\nReturn ONLY this JSON shape:\n' +
    '{"type": "informational" | "navigational" | "transactional" | "commercial", ' +
    '"confidence": <number between 0 and 1>, "reasoning": "one short sentence"}'
  );
}

interface RawIntentResponse {
  type?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export async function detectSearchIntent(
  input: IntentDetectionInput,
): Promise<Result<SearchIntentResult, AppError>> {
  if (!isNonEmptyString(input.keyword)) {
    return err(new ValidationError('keyword is required for intent detection'));
  }
  const keyword = input.keyword.trim();

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(keyword, input.relatedKeywords) },
  ];

  const callResult = await callOpenRouter(messages, { json: true, maxTokens: 300 });
  if (!callResult.ok) return err(callResult.error);

  let parsed: RawIntentResponse;
  try {
    parsed = JSON.parse(callResult.value) as RawIntentResponse;
  } catch {
    return err(new OpenRouterError('OpenRouter returned invalid JSON for intent detection', { raw: callResult.value }));
  }

  if (typeof parsed.type !== 'string' || !ALLOWED_INTENTS.includes(parsed.type as SearchIntentType)) {
    return err(
      new OpenRouterError('OpenRouter returned an intent type outside the allowed set', {
        received: parsed.type,
        allowed: ALLOWED_INTENTS,
      }),
    );
  }

  const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence);
  const confidence = clampConfidence(rawConfidence);

  const result: SearchIntentResult = {
    type: parsed.type as SearchIntentType,
    confidence,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
  };

  return ok(result);
}

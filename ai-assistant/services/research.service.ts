/**
 * ResearchService — Version 1 scope item #1. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.1): gather raw research signal
 * (keyword candidates, related topic names) for an already-validated seed
 * query, via OpenRouter. Read/gather only — no Supabase access, no writes.
 */

import { callOpenRouter, ChatMessage } from '../clients/openRouter.client';
import { ResearchInput, ResearchOutput, KeywordCandidate } from '../types';
import { AppError, OpenRouterError, ValidationError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { isValidUuid } from '../validation/validators';
import { DEFAULT_LANGUAGE } from '../config/constants';

const SYSTEM_PROMPT =
  'You are a Christian content research assistant for a Bible study website. ' +
  'Given a seed query, you surface keyword ideas and related topic names that ' +
  'real readers would search for. You never invent statistics or claim real ' +
  'search-volume data you do not have — omit estimatedVolume rather than guess. ' +
  'You always respond with valid JSON only, no markdown fencing.';

interface RawResearchResponse {
  keywords?: Array<{ keyword?: unknown; estimatedVolume?: unknown; estimatedDifficulty?: unknown }>;
  relatedTopics?: unknown[];
}

function buildUserPrompt(seedQuery: string): string {
  return (
    `Seed query: "${seedQuery}"\n\n` +
    'Suggest 8-15 keyword phrases people might search for that relate to this seed query, ' +
    'in the context of Christian / Bible content (topics, guides, questions, bible verses, bible characters). ' +
    'Also suggest 3-6 related topic names (broader or adjacent concepts) that could become separate content topics.\n\n' +
    'Return ONLY this JSON shape:\n' +
    '{"keywords": [{"keyword": "string"}], "relatedTopics": ["string"]}\n' +
    'Do not include estimatedVolume or estimatedDifficulty — real search data is not available to you; ' +
    'omit those fields entirely rather than guessing numbers.'
  );
}

function parseResearchResponse(raw: string): Result<{ keywords: KeywordCandidate[]; relatedTopics: string[] }, OpenRouterError> {
  let parsed: RawResearchResponse;
  try {
    parsed = JSON.parse(raw) as RawResearchResponse;
  } catch {
    return err(new OpenRouterError('OpenRouter returned invalid JSON for research', { raw }));
  }

  if (!Array.isArray(parsed.keywords)) {
    return err(new OpenRouterError('OpenRouter research response missing "keywords" array', { raw }));
  }

  const keywords: KeywordCandidate[] = parsed.keywords
    .filter((entry): entry is { keyword: string } => typeof entry?.keyword === 'string' && entry.keyword.trim().length > 0)
    .map((entry) => ({
      keyword: entry.keyword.trim(),
      source: 'ai_research',
    }));

  const relatedTopics: string[] = Array.isArray(parsed.relatedTopics)
    ? parsed.relatedTopics.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim())
    : [];

  return ok({ keywords, relatedTopics });
}

export async function performResearch(input: ResearchInput): Promise<Result<ResearchOutput, AppError>> {
  const seedQuery = input.seedQuery?.trim();
  if (!seedQuery) {
    return err(new ValidationError('seedQuery is required for research'));
  }

  if (input.relatedTopicId !== undefined && input.relatedTopicId !== null && !isValidUuid(input.relatedTopicId)) {
    return err(new ValidationError('relatedTopicId must be a valid UUID or null', { relatedTopicId: input.relatedTopicId }));
  }

  const language = input.language?.trim().toLowerCase() || DEFAULT_LANGUAGE;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(seedQuery) },
  ];

  const callResult = await callOpenRouter(messages, { json: true, maxTokens: 1200 });
  if (!callResult.ok) return err(callResult.error);

  const parseResult = parseResearchResponse(callResult.value);
  if (!parseResult.ok) return err(parseResult.error);

  const output: ResearchOutput = {
    seedQuery,
    language,
    keywords: parseResult.value.keywords,
    relatedTopics: parseResult.value.relatedTopics,
  };

  return ok(output);
}

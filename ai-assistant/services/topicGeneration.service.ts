/**
 * TopicService — Version 1 scope item #4. IMPLEMENTED.
 *
 * Responsibility (frozen contract §3.4): produce a single proposed topic
 * NAME only (no category, no slug — those are CategoryService/SlugService's
 * jobs) from research + keywords + intent, via OpenRouter. Self-validates
 * the generated name with validateTopicName() before returning Ok, per
 * §3.4.6 — a name that fails length/emptiness checks is this service's own
 * error to return.
 */

import { callOpenRouter, ChatMessage } from '../clients/openRouter.client';
import { KeywordCandidate, ResearchOutput, SearchIntentResult } from '../types';
import { AppError, OpenRouterError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';
import { validateTopicName } from '../validation/validators';
import { DEFAULT_LANGUAGE } from '../config/constants';

export interface TopicGenerationInput {
  research: ResearchOutput;
  keywords: KeywordCandidate[];
  intent: SearchIntentResult;
  language?: string;
}

export interface TopicGenerationOutput {
  name: string;
  language: string;
  reasoning?: string;
}

const SYSTEM_PROMPT =
  'You are a Christian content strategist for a Bible study website. ' +
  'Given research about a seed query, you propose ONE clear, specific topic ' +
  'name suitable as the title of a future article — not the article itself, ' +
  'just the topic name (a short phrase, not a full sentence unless the topic ' +
  'is naturally a question). You always respond with valid JSON only, no ' +
  'markdown fencing.';

function buildUserPrompt(
  research: ResearchOutput,
  keywords: KeywordCandidate[],
  intent: SearchIntentResult,
): string {
  const keywordList = keywords.slice(0, 10).map((k) => k.keyword).join(', ') || '(none found)';
  const relatedList = research.relatedTopics.slice(0, 8).join(', ') || '(none found)';

  return (
    `Seed query: "${research.seedQuery}"\n` +
    `Search intent: ${intent.type}\n` +
    `Top keywords: ${keywordList}\n` +
    `Related topics already surfaced: ${relatedList}\n\n` +
    'Propose ONE topic name that best fits this research. It should be a ' +
    'concise phrase (a person\'s name, a concept, or a direct question) — ' +
    'not a full article title with SEO padding.\n\n' +
    'Return ONLY this JSON shape:\n' +
    '{"name": "string", "reasoning": "one short sentence"}'
  );
}

interface RawTopicResponse {
  name?: unknown;
  reasoning?: unknown;
}

export async function generateTopicName(
  input: TopicGenerationInput,
): Promise<Result<TopicGenerationOutput, AppError>> {
  const language = input.language?.trim().toLowerCase() || input.research.language || DEFAULT_LANGUAGE;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input.research, input.keywords, input.intent) },
  ];

  const callResult = await callOpenRouter(messages, { json: true, maxTokens: 300 });
  if (!callResult.ok) return err(callResult.error);

  let parsed: RawTopicResponse;
  try {
    parsed = JSON.parse(callResult.value) as RawTopicResponse;
  } catch {
    return err(new OpenRouterError('OpenRouter returned invalid JSON for topic generation', { raw: callResult.value }));
  }

  if (typeof parsed.name !== 'string') {
    return err(new OpenRouterError('OpenRouter topic generation response missing "name"', { raw: callResult.value }));
  }

  const nameValidation = validateTopicName(parsed.name);
  if (!nameValidation.ok) return err(nameValidation.error);

  const output: TopicGenerationOutput = {
    name: nameValidation.value,
    language,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
  };

  return ok(output);
}

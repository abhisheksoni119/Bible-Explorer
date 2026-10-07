/**
 * OpenRouter client.
 *
 * Same wire protocol as callOpenRouter() in lib/generator.js (same URL,
 * same headers, same truncation detection on finish_reason === 'length'),
 * re-implemented here as a typed, Result-returning function with a request
 * timeout, so Phase 2 services (research, keyword discovery, intent
 * detection, topic generation) all get consistent error handling without
 * each one re-parsing fetch responses by hand.
 *
 * Deliberately NOT importing lib/generator.js — that file is tightly
 * coupled to article-generation prompt building (buildTitleHint,
 * enforceArticleMeta, etc.), which is out of scope for this module. Only
 * the transport concern (calling OpenRouter) is duplicated, and kept in
 * sync by contract (same URL/headers/model), not by shared code.
 */

import { OPENROUTER_URL, OPENROUTER_HTTP_REFERER, OPENROUTER_APP_TITLE, DEFAULT_MAX_TOKENS } from '../config/constants';
import { loadConfig } from '../config/env';
import { ConfigurationError, OpenRouterError } from '../utils/errors';
import { ok, err, Result } from '../utils/result';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCallOptions {
  /** Overrides the configured default model for this call only. */
  model?: string;
  /** Request JSON-object mode (response_format). Defaults to true. */
  json?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}

interface OpenRouterChoice {
  message?: { content?: string };
  finish_reason?: string;
}

interface OpenRouterResponseBody {
  choices?: OpenRouterChoice[];
}

/**
 * Call OpenRouter's chat completions endpoint and return the raw message
 * content string (the caller is responsible for JSON.parse-ing it when
 * `json: true` was requested — this keeps the client generic).
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  options: OpenRouterCallOptions = {},
): Promise<Result<string, OpenRouterError | ConfigurationError>> {
  const configResult = loadConfig();
  if (!configResult.ok) return err(configResult.error);

  const { openRouterApiKey, openRouterModel, requestTimeoutMs } = configResult.value;
  const model = options.model ?? openRouterModel;
  const timeoutMs = options.timeoutMs ?? requestTimeoutMs;
  const useJsonMode = options.json ?? true;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    };
    if (useJsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_HTTP_REFERER,
        'X-Title': OPENROUTER_APP_TITLE,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return err(new OpenRouterError(`OpenRouter request failed (${response.status})`, { status: response.status, body: text }));
    }

    const data = (await response.json()) as OpenRouterResponseBody;
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finishReason = choice?.finish_reason ?? '';

    if (!content) {
      return err(new OpenRouterError('OpenRouter returned empty content'));
    }

    if (finishReason === 'length') {
      return err(
        new OpenRouterError(
          'Response truncated before completion (finish_reason=length) — the model ran out of tokens. ' +
            'Consider shortening the prompt or increasing maxTokens.',
        ),
      );
    }

    return ok(content);
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'AbortError') {
      return err(new OpenRouterError(`OpenRouter request timed out after ${timeoutMs}ms`));
    }
    const message = caught instanceof Error ? caught.message : 'Unknown OpenRouter error';
    return err(new OpenRouterError(message));
  } finally {
    clearTimeout(timeoutHandle);
  }
}

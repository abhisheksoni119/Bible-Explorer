// Admin-only API route for the AI Database Assistant engine.
// Auth: inherited automatically from middleware.js, which already protects
// every /api/admin/** path via the admin_token cookie — no new auth code.
//
// This route is a thin adapter only: parse the request body, call the
// existing runResearch() orchestrator exactly as implemented, translate its
// Result<RunResearchOutcome, AppError> into an HTTP response. No business
// logic lives here — the engine in ai-assistant/ is used as-is.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runResearch, RunResearchInput } from '../../../../../ai-assistant/orchestrator';
import { AppError, AppErrorCode } from '../../../../../ai-assistant/utils/errors';

// Maps the engine's typed error codes to HTTP status codes. Mirrors the
// existing convention elsewhere in this codebase of using 409 for "found a
// duplicate, didn't save" (see app/api/admin/articles POST) — applied here
// via the 'duplicate' outcome branch below, not via this error map, since
// DuplicateService reports duplicates as a normal Ok result, not an AppError.
const ERROR_STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  CONFIGURATION_ERROR: 500,
  OPENROUTER_ERROR: 502,
  SUPABASE_ERROR: 500,
  DUPLICATE_TOPIC: 409,
  NOT_IMPLEMENTED: 501,
  UNKNOWN_ERROR: 500,
};

function errorResponse(error: AppError) {
  const status = ERROR_STATUS[error.code] ?? 500;
  return NextResponse.json({ error: error.message, code: error.code }, { status });
}

export async function POST(request: Request) {
  let body: Partial<RunResearchInput>;
  try {
    body = (await request.json()) as Partial<RunResearchInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.seedQuery !== 'string' || !body.seedQuery.trim()) {
    return NextResponse.json({ error: 'seedQuery is required' }, { status: 400 });
  }

  const input: RunResearchInput = {
    seedQuery: body.seedQuery,
    language: typeof body.language === 'string' ? body.language : undefined,
    relatedTopicId: typeof body.relatedTopicId === 'string' ? body.relatedTopicId : null,
  };

  const result = await runResearch(input);

  if (!result.ok) {
    return errorResponse(result.error);
  }

  const outcome = result.value;

  if (outcome.status === 'duplicate') {
    return NextResponse.json(
      {
        status: 'duplicate',
        candidate: outcome.candidate,
        duplicate: outcome.duplicate,
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      status: 'inserted',
      topic: outcome.topic,
      candidate: outcome.candidate,
    },
    { status: 201 },
  );
}

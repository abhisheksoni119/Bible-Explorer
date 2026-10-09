// Admin-only API route for the AI Database Assistant engine.
// Auth: inherited automatically from middleware.js, which already protects
// every /api/admin/** path via the admin_token cookie — no new auth code.
//
// This route is a thin adapter only: parse the request body, call the
// existing runResearch() orchestrator exactly as implemented, translate its
// Result<RunResearchOutcome, AppError> into an HTTP response. No business
// logic lives here — the engine in ai-assistant/ is used as-is.
//
// APPROVAL-FIRST: research never inserts. It returns a fully-validated
// proposal (status 'proposed'). Insertion happens only through the sibling
// /approve endpoint after a human reviews the candidate.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runResearch, RunResearchInput } from '../../../../../ai-assistant/orchestrator';
import { AppError, AppErrorCode } from '../../../../../ai-assistant/utils/errors';

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
    // Proposal-only: the research pipeline validates the candidate but never
    // inserts. Approval is a separate, explicit user action.
    dryRun: true,
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

  if (outcome.status === 'proposed') {
    return NextResponse.json(
      {
        status: 'proposed',
        candidate: outcome.candidate,
        // Honest evidence labelling: all keyword metrics in this pipeline are
        // AI-inferred estimates — there is no live search-data provider.
        evidenceNote: 'Topic suggestion is AI/semantic-based. Keyword volume/difficulty figures (if shown) are AI-inferred estimates, NOT verified search data.',
        message: 'Proposal ready — review, then approve to add this topic.',
      },
      { status: 200 },
    );
  }

  // Defensive: the orchestrator in dryRun mode never reaches 'inserted'.
  return NextResponse.json(
    { status: outcome.status, topic: (outcome as { topic?: unknown }).topic, candidate: outcome.candidate },
    { status: 201 },
  );
}
// step0-rebuild-marker

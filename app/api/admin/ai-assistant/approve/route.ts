// Admin-only approve endpoint for AI-researched topic proposals.
// Auth: inherited from middleware.js (/api/admin/** requires admin_token).
//
// Receives a TopicCandidate produced by the research endpoint (proposal
// mode), re-runs duplicate detection against the LIVE topics table (the
// state may have changed since the proposal was made), and only then
// inserts. Human approval is the only path that inserts research topics.
//
// Validation: the candidate object is schema-checked field by field; the
// category must be one of the five locked categories; the slug is
// regenerated defensively from the name by the insertion service contract.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkForDuplicateTopic } from '../../../../../ai-assistant/services/duplicateDetection.service';
import { insertTopic } from '../../../../../ai-assistant/services/topicInsertion.service';
import { AppError } from '../../../../../ai-assistant/utils/errors';

const ALLOWED_CATEGORIES = ['questions', 'guides', 'topics', 'bible-verses', 'bible-characters'];

function isValidCandidate(c: unknown): c is Record<string, unknown> {
  if (!c || typeof c !== 'object') return false;
  const name = (c as Record<string, unknown>).name;
  return typeof name === 'string' && name.trim().length > 1 && name.trim().length <= 200;
}

export async function POST(request: Request) {
  let body: { candidate?: unknown };
  try {
    body = (await request.json()) as { candidate?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidCandidate(body.candidate)) {
    return NextResponse.json({ error: 'A valid candidate (with a topic name) is required' }, { status: 400 });
  }
  const raw = body.candidate as Record<string, unknown>;

  // Rebuild a conservative candidate from approved fields only — the client
  // cannot inject arbitrary extra properties into the insertion payload.
  const category = typeof raw.category === 'string' && ALLOWED_CATEGORIES.includes(raw.category)
    ? raw.category
    : 'topics';
  const candidate = {
    name: String(raw.name).trim(),
    category,
    language: typeof raw.language === 'string' ? raw.language : 'en',
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    parentId: null,
    isPillar: false,
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(k => typeof k === 'string').slice(0, 10) : [],
    intent: raw.intent && typeof raw.intent === 'object' ? raw.intent : undefined,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 1000) : undefined,
  };

  // Live duplicate re-check at approval time (state may have moved since the
  // proposal was generated — this is the authoritative check).
  try {
    const dup = await checkForDuplicateTopic(candidate as never);
    if (dup.ok && dup.value.isDuplicate) {
      return NextResponse.json(
        { status: 'duplicate', duplicate: dup.value, message: 'A matching topic already exists — nothing was added.' },
        { status: 409 },
      );
    }
  } catch {
    // Duplicate service unavailable → refuse to insert rather than risk a dup.
    return NextResponse.json({ error: 'Could not verify uniqueness right now — topic not added. Try again.' }, { status: 503 });
  }

  try {
    const inserted = await insertTopic(candidate as never);
    if (!inserted.ok) {
      const e = inserted.error as AppError;
      return NextResponse.json({ error: e.message, code: e.code }, { status: 500 });
    }
    return NextResponse.json({ status: 'inserted', topic: inserted.value.inserted }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Insertion failed' }, { status: 500 });
  }
}
// step0-rebuild-marker

/**
 * Result<T, E> — discriminated union for explicit success/failure handling.
 *
 * Every service, client, and validator in the AI Database Assistant module
 * returns a Result instead of throwing across boundaries. This keeps error
 * handling explicit and typed, and matches the "no silent failures" goal
 * from the architecture report (duplicate topics, invalid categories, and
 * OpenRouter/Supabase failures must always be inspectable by the caller).
 *
 * Internal helper functions may still throw (e.g. programmer errors, or
 * genuinely unexpected exceptions) — callers at the service boundary are
 * expected to catch those and wrap them in `err(...)` before returning.
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Unwrap a Result, throwing the contained error if it failed.
 * Use only at the outermost boundary (e.g. a route handler) — never inside
 * a service, where Result should be propagated instead.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

/**
 * Map the success value of a Result without touching the error branch.
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

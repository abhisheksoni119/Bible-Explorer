/**
 * Error hierarchy for the AI Database Assistant module.
 *
 * Every error carries a stable `code` (safe to log, safe to branch on) and
 * an optional `details` payload for debugging. Route handlers / future
 * orchestration code can switch on `code` without parsing message strings.
 */

export type AppErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_TOPIC'
  | 'SUPABASE_ERROR'
  | 'OPENROUTER_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace (V8 / Node only — no-op elsewhere).
    if (typeof (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace === 'function') {
      (Error as unknown as { captureStackTrace: (target: object, ctor: unknown) => void }).captureStackTrace(
        this,
        this.constructor,
      );
    }
  }
}

/** Required environment variable missing/invalid (Supabase URL, OpenRouter key, etc.). */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFIGURATION_ERROR', message, details);
  }
}

/** Input failed a validation rule (bad category, malformed slug, out-of-range length, ...). */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
  }
}

/** A candidate topic collided with an existing topics row (name/slug/language match). */
export class DuplicateTopicError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DUPLICATE_TOPIC', message, details);
  }
}

/** Supabase query/insert failed. */
export class SupabaseOperationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SUPABASE_ERROR', message, details);
  }
}

/** OpenRouter request failed, timed out, or returned an unusable response. */
export class OpenRouterError extends AppError {
  constructor(message: string, details?: unknown) {
    super('OPENROUTER_ERROR', message, details);
  }
}

/** Thrown by Phase-1 service stubs — signals Phase 2 has not implemented this yet. */
export class NotImplementedError extends AppError {
  constructor(serviceName: string) {
    super('NOT_IMPLEMENTED', `${serviceName} is not implemented yet (Version 1 foundation only — Phase 2 fills this in).`);
  }
}

export function toAppError(error: unknown, fallbackMessage = 'Unknown error'): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError('UNKNOWN_ERROR', error.message, { originalName: error.name });
  return new AppError('UNKNOWN_ERROR', fallbackMessage, { original: error });
}

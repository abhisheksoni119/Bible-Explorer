/**
 * Lightweight structured logger.
 *
 * The rest of the codebase logs via plain `console.error(...)` /
 * `console.warn(...)` (see lib/toolCache.js, app/api/admin/*.js) — there is
 * no pino/pino-http wiring in the live app despite those packages sitting in
 * package.json (they're unused leftovers from an unrelated scaffold). This
 * logger stays consistent with that convention: console-based, but tagged
 * and structured so future phases get consistent, greppable log lines
 * without pulling in a logging framework.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function format(moduleName: string, level: LogLevel, message: string, fields?: LogFields): string {
  const base = `[ai-assistant:${moduleName}] ${message}`;
  if (!fields || Object.keys(fields).length === 0) return base;
  try {
    return `${base} ${JSON.stringify(fields)}`;
  } catch {
    return base;
  }
}

/**
 * Create a module-scoped logger, e.g.:
 *   const log = createLogger('duplicateDetection');
 *   log.warn('near-duplicate found', { name, matchId });
 */
export function createLogger(moduleName: string): Logger {
  return {
    debug(message: string, fields?: LogFields) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug(format(moduleName, 'debug', message, fields));
      }
    },
    info(message: string, fields?: LogFields) {
      // eslint-disable-next-line no-console
      console.info(format(moduleName, 'info', message, fields));
    },
    warn(message: string, fields?: LogFields) {
      // eslint-disable-next-line no-console
      console.warn(format(moduleName, 'warn', message, fields));
    },
    error(message: string, fields?: LogFields) {
      // eslint-disable-next-line no-console
      console.error(format(moduleName, 'error', message, fields));
    },
  };
}

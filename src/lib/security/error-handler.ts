/**
 * VarshaNetra - Security Core: Secret Redaction & Safe Error Handler
 *
 * Ensures errors returned to API callers and browser clients never leak
 * database connection strings, auth tokens, passwords, API keys, or local filesystem paths.
 */

const SENSITIVE_PATTERNS = [
  /postgres(ql)?:\/\/[^\s'"]+/gi,
  /https:\/\/[a-z0-9_-]+\.supabase\.co[^\s'"]*/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT
  /(api_key|apikey|secret|token|password|service_role)=[a-zA-Z0-9_.-]+/gi,
  /[a-zA-Z]:\\[^\s'"]+/g, // Windows path
  /\/(home|var|tmp|etc|Users)\/[^\s'"]+/g, // Unix path
];

/**
 * Redacts secrets, credentials, and internal paths from an error message.
 */
export function sanitizeErrorMessage(err: unknown, defaultMessage = "An operational error occurred."): string {
  let message = defaultMessage;

  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "string") {
    message = err;
  }

  // Redact all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, "[REDACTED]");
  }

  return message;
}

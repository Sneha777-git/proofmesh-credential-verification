/** Clean, user-safe application errors. Raw database details never leave the server. */
export type AppErrorCode =
  | "invalid_input"
  | "not_found"
  | "unauthorized"
  | "forbidden_issuer"
  | "duplicate"
  | "constraint"
  | "unavailable";

export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  invalid_input: "Some of the submitted data is invalid.",
  not_found: "No credential record matches this reference.",
  unauthorized: "You need to be signed in for this action.",
  forbidden_issuer: "This account is not an authorized issuer for that wallet.",
  duplicate: "A credential with this ID or document hash already exists.",
  constraint: "The change was rejected by the registry rules.",
  unavailable: "The credential registry is temporarily unavailable.",
};

export type AppResult<T> = { ok: true; data: T } | { ok: false; code: AppErrorCode; message: string };

export function fail(code: AppErrorCode): { ok: false; code: AppErrorCode; message: string } {
  return { ok: false, code, message: APP_ERROR_MESSAGES[code] };
}

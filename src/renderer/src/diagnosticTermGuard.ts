/**
 * Deterministic, client-side nudge only — no LLM call involved, and nothing
 * here blocks submission. The case profile asks for functional/descriptive
 * language, not diagnosis names, but a clinician can always type diagnostic
 * shorthand out of habit. This catches the common cases and shows a soft
 * inline warning so they can rephrase; it is not exhaustive and not a
 * validator. Extend the pattern list below as new cases come up — keep the
 * matching logic in containsLikelyDiagnosticTerm() untouched.
 */
export const DIAGNOSTIC_TERM_PATTERNS: RegExp[] = [
  // Common diagnostic abbreviations / shorthand.
  /\bCVA\b/i,
  /\bTHA\b/i,
  /\bTKA\b/i,
  /\bTBI\b/i,
  /\bMS\b/i,
  /\bCOPD\b/i,
  /\bCHF\b/i,
  /\bCABG\b/i,
  /\bACL\b/i,
  /\bMI\b/i,
  /\bALS\b/i,
  /\bSCI\b/i,

  // Diagnostic phrasing.
  /\bdx:?/i,
  /\bdiagnos(is|ed)\b/i,
  /\bs\/p\b/i,
  /\bstatus[- ]post\b/i,
  /\bh\/o\b/i,

  // ICD-10-style codes: a letter, two digits, optional decimal + digits (e.g. "M17.11").
  /\b[A-TV-Z]\d{2}(\.\d{1,4})?\b/,
];

export function containsLikelyDiagnosticTerm(text: string): boolean {
  return DIAGNOSTIC_TERM_PATTERNS.some((pattern) => pattern.test(text));
}

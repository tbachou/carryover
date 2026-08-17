/**
 * Shown on every screen that renders AI-generated content. Non-negotiable
 * per the project's framing constraint: this is a drafting aid for a
 * licensed clinician, never patient-facing medical advice on its own.
 */
export function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="note">
      <strong>Draft only — for licensed clinician review.</strong> Carryover suggests exercises,
      possible precaution flags, and draft instructions; it does not diagnose, treat, or deliver
      medical advice. Nothing here is patient-ready until the treating clinician reviews, edits,
      and signs off below.
    </div>
  );
}

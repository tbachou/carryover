/**
 * Persistent, non-dismissible — always rendered whenever CaseProfileForm
 * is, directly above the fields. Distinct message from DisclaimerBanner
 * (that one is about the app's clinical-framing limits; this one is about
 * where the data actually goes), but deliberately reuses the exact same
 * `disclaimer-banner` visual treatment for consistency rather than
 * inventing a new one.
 */
export function PhiWarningBanner() {
  return (
    <div className="disclaimer-banner" role="note">
      Do not enter patient-identifying information (name, date of birth, medical record number,
      or similar) in this form. Carryover sends what you enter here to Anthropic&apos;s API to
      draft this handout — there is no Business Associate Agreement in place, so this is not a
      HIPAA-compliant data path. Describe the case only in de-identified, functional terms.
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { CareSetting, CaseProfile } from '@shared/types';
import { CARE_SETTING_LABELS } from '@shared/types';
import { containsLikelyDiagnosticTerm } from '../diagnosticTermGuard';

const SETTINGS: CareSetting[] = ['home-health', 'outpatient', 'skilled-nursing', 'inpatient-rehab'];

const EMPTY_PROFILE: CaseProfile = {
  presentation: '',
  precautions: '',
  shortTermGoals: '',
  longTermGoals: '',
  cognitiveLevel: '',
  physicalLevel: '',
  setting: 'home-health',
  caregiverAvailable: false,
};

/**
 * Deliberately has no diagnosis/condition field, and no diagnostic
 * autocomplete or suggestion — every field is functional/descriptive.
 * See src/shared/types.ts for the rationale.
 */
export function CaseProfileForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (profile: CaseProfile) => void;
  isSubmitting: boolean;
}) {
  const [profile, setProfile] = useState<CaseProfile>(EMPTY_PROFILE);

  function set<K extends keyof CaseProfile>(key: K, value: CaseProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit =
    profile.presentation.trim().length > 0 &&
    profile.shortTermGoals.trim().length > 0 &&
    profile.cognitiveLevel.trim().length > 0 &&
    profile.physicalLevel.trim().length > 0;

  // Soft, non-blocking nudge only — deterministic pattern match, no LLM
  // call, never prevents submission. See diagnosticTermGuard.ts.
  const presentationFlagged = useMemo(
    () => containsLikelyDiagnosticTerm(profile.presentation),
    [profile.presentation],
  );
  const precautionsFlagged = useMemo(
    () => containsLikelyDiagnosticTerm(profile.precautions),
    [profile.precautions],
  );

  return (
    <form
      className="case-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(profile);
      }}
    >
      <h1 className="case-form__title">New case profile</h1>
      <p className="case-form__subtitle">
        Enter what you'd already have from your own eval. Describe function, not diagnosis —
        Carryover never asks for or infers one.
      </p>

      <div className="case-form__field">
        <label htmlFor="presentation">Functional presentation</label>
        <p className="case-form__hint">
          What the patient presents with, functionally — not a diagnosis or condition name. e.g.
          "reduced grip strength and coordination, right hand."
        </p>
        <textarea
          id="presentation"
          rows={2}
          value={profile.presentation}
          onChange={(e) => set('presentation', e.target.value)}
          disabled={isSubmitting}
          required
        />
        {presentationFlagged ? (
          <p className="case-form__warning">
            This looks like it might contain a diagnostic term — consider rephrasing in functional
            terms.
          </p>
        ) : null}
      </div>

      <div className="case-form__field">
        <label htmlFor="precautions">Functional precautions</label>
        <p className="case-form__hint">e.g. "limited weight-bearing, right leg." Leave blank if none.</p>
        <textarea
          id="precautions"
          rows={2}
          value={profile.precautions}
          onChange={(e) => set('precautions', e.target.value)}
          disabled={isSubmitting}
        />
        {precautionsFlagged ? (
          <p className="case-form__warning">
            This looks like it might contain a diagnostic term — consider rephrasing in functional
            terms.
          </p>
        ) : null}
      </div>

      <div className="case-form__row">
        <div className="case-form__field">
          <label htmlFor="short-goals">Short-term goals</label>
          <textarea
            id="short-goals"
            rows={2}
            value={profile.shortTermGoals}
            onChange={(e) => set('shortTermGoals', e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="case-form__field">
          <label htmlFor="long-goals">Long-term goals</label>
          <textarea
            id="long-goals"
            rows={2}
            value={profile.longTermGoals}
            onChange={(e) => set('longTermGoals', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="case-form__row">
        <div className="case-form__field">
          <label htmlFor="cognitive">Cognitive level</label>
          <input
            id="cognitive"
            value={profile.cognitiveLevel}
            onChange={(e) => set('cognitiveLevel', e.target.value)}
            placeholder="e.g. alert & oriented x3, needs occasional cueing"
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="case-form__field">
          <label htmlFor="physical">Physical / mobility level</label>
          <input
            id="physical"
            value={profile.physicalLevel}
            onChange={(e) => set('physicalLevel', e.target.value)}
            placeholder="e.g. ambulatory with front-wheeled walker"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div className="case-form__row">
        <div className="case-form__field">
          <label htmlFor="setting">Setting</label>
          <select
            id="setting"
            value={profile.setting}
            onChange={(e) => set('setting', e.target.value as CareSetting)}
            disabled={isSubmitting}
          >
            {SETTINGS.map((setting) => (
              <option key={setting} value={setting}>
                {CARE_SETTING_LABELS[setting]}
              </option>
            ))}
          </select>
        </div>
        <div className="case-form__field case-form__field--checkbox">
          <label htmlFor="caregiver">
            <input
              id="caregiver"
              type="checkbox"
              checked={profile.caregiverAvailable}
              onChange={(e) => set('caregiverAvailable', e.target.checked)}
              disabled={isSubmitting}
            />
            Caregiver available
          </label>
        </div>
      </div>

      <button className="primary" type="submit" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Drafting…' : 'Draft handout'}
      </button>
    </form>
  );
}

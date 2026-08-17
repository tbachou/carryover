import { createPortal } from 'react-dom';
import type { DraftExercise, HandoutDraft } from '@shared/types';
import { DisclaimerBanner } from './DisclaimerBanner';
import { PrintableHandout } from './PrintableHandout';
import { formatHandoutText } from './exportHandout';

const printRoot = typeof document !== 'undefined' ? document.getElementById('print-root') : null;

export function DraftHandoutView({
  draft,
  onToggleAccept,
  onSignOff,
}: {
  draft: HandoutDraft;
  onToggleAccept: (exerciseId: string) => void;
  onSignOff: () => void;
}) {
  const acceptedCount = draft.exercises.filter((e) => e.accepted).length;
  const canExport = draft.signedOff && acceptedCount > 0;

  async function handleCopy() {
    await navigator.clipboard.writeText(formatHandoutText(draft));
  }

  return (
    <div className="handout">
      <DisclaimerBanner />

      {draft.generalSafetyNotes.length > 0 ? (
        <div className="handout__general-notes">
          <h3>General flags for clinician review</h3>
          <ul>
            {draft.generalSafetyNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.exercises.length === 0 ? (
        <p className="empty-state">No exercises were suggested for this case profile.</p>
      ) : (
        <ul className="exercise-list">
          {draft.exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} onToggleAccept={() => onToggleAccept(exercise.id)} />
          ))}
        </ul>
      )}

      <div className="signoff">
        {!draft.signedOff ? (
          <label className="signoff__confirm">
            <input type="checkbox" checked={false} onChange={onSignOff} />
            I am the treating clinician and have reviewed this draft.
          </label>
        ) : (
          <p className="signoff__done">
            Reviewed and signed off{draft.signedOffAt ? ` ${new Date(draft.signedOffAt).toLocaleString()}` : ''}.
          </p>
        )}
        <div className="signoff__actions">
          <button onClick={() => window.print()} disabled={!canExport}>
            Print
          </button>
          <button onClick={handleCopy} disabled={!canExport}>
            Copy
          </button>
        </div>
        {!canExport ? (
          <p className="signoff__hint">
            {draft.signedOff
              ? 'Accept at least one exercise below to enable print/copy.'
              : 'Sign off above to enable print/copy, once at least one exercise is accepted.'}
          </p>
        ) : null}
      </div>

      {/*
        Portaled into #print-root (outside #root — see index.html), not
        rendered inline here. This is a normal child in React's tree
        despite the different DOM location, so it re-renders on every
        `draft` change (e.g. each accept-checkbox toggle) exactly like the
        rest of this component. @media print in styles.css hides #root and
        shows only #print-root, so this — accepted exercises + general
        notes only, via getExportablePayload — is the entirety of what
        Print can ever produce.
      */}
      {printRoot ? createPortal(<PrintableHandout draft={draft} />, printRoot) : null}
    </div>
  );
}

function ExerciseCard({ exercise, onToggleAccept }: { exercise: DraftExercise; onToggleAccept: () => void }) {
  return (
    <li className={`exercise-card${exercise.accepted ? ' exercise-card--accepted' : ''}`}>
      <div className="exercise-card__header">
        <label className="exercise-card__accept">
          <input type="checkbox" checked={exercise.accepted} onChange={onToggleAccept} />
          Accept
        </label>
        <span className="exercise-card__name">{exercise.name}</span>
        <span className="exercise-card__suggested-tag">Suggested</span>
      </div>
      <p className="exercise-card__meta">
        {exercise.targetGoal} · {exercise.setsReps}
      </p>
      <p className="exercise-card__rationale">{exercise.rationale}</p>
      <p className="exercise-card__instructions">{exercise.instructions}</p>
      {exercise.safetyFlags.length > 0 ? (
        <ul className="exercise-card__flags">
          {exercise.safetyFlags.map((flag, i) => (
            <li key={i}>{flag}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

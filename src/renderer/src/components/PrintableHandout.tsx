import type { HandoutDraft } from '@shared/types';
import { getExportablePayload } from './exportHandout';

/**
 * Rendered via a portal into #print-root (see index.html) — a DOM node
 * that lives outside the app's #root tree entirely. styles.css hides
 * #root and shows #print-root only under @media print, so printing can
 * never pick up the sidebar (which shows other drafts' history), the
 * titlebar, or unaccepted exercises: it physically isn't there to print.
 * The only content this component ever renders is what
 * getExportablePayload() returns, which is the same accepted-only +
 * general-notes shape Copy uses via formatHandoutText.
 */
export function PrintableHandout({ draft }: { draft: HandoutDraft }) {
  const { exercises, generalSafetyNotes } = getExportablePayload(draft);

  return (
    <div className="printable-handout">
      <p className="printable-handout__disclaimer">
        DRAFT HOME EXERCISE PROGRAM — reviewed and signed off by treating clinician. Not medical
        advice on its own; reflects the clinician&apos;s review of this draft.
      </p>

      {exercises.length === 0 ? (
        <p>No exercises have been accepted yet.</p>
      ) : (
        exercises.map((exercise) => (
          <section key={exercise.id} className="printable-handout__exercise">
            <h3>
              {exercise.name} — {exercise.setsReps}
            </h3>
            <p>{exercise.instructions}</p>
            {exercise.safetyFlags.length > 0 ? (
              <ul>
                {exercise.safetyFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))
      )}

      {generalSafetyNotes.length > 0 ? (
        <section className="printable-handout__general-notes">
          <h3>General notes</h3>
          <ul>
            {generalSafetyNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

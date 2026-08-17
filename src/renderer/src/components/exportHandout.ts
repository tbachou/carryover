import type { DraftExercise, HandoutDraft } from '@shared/types';

/**
 * The single source of truth for "what actually leaves the app" — both
 * Print (PrintableHandout.tsx) and Copy (formatHandoutText below) build
 * from this, so they can't drift apart on what counts as exportable.
 * Exercises the clinician hasn't accepted are never included here, full
 * stop — this is what makes the accept gate real for both export paths,
 * not just Copy.
 */
export interface ExportablePayload {
  exercises: DraftExercise[];
  generalSafetyNotes: string[];
}

export function getExportablePayload(draft: HandoutDraft): ExportablePayload {
  return {
    exercises: draft.exercises.filter((exercise) => exercise.accepted),
    generalSafetyNotes: draft.generalSafetyNotes,
  };
}

export function formatHandoutText(draft: HandoutDraft): string {
  const { exercises, generalSafetyNotes } = getExportablePayload(draft);
  const lines = [
    'DRAFT HOME EXERCISE PROGRAM — reviewed and signed off by treating clinician.',
    "Not medical advice on its own; reflects the clinician's review of this draft.",
    '',
  ];
  for (const exercise of exercises) {
    lines.push(`${exercise.name} — ${exercise.setsReps}`);
    lines.push(exercise.instructions);
    for (const flag of exercise.safetyFlags) lines.push(`Note: ${flag}`);
    lines.push('');
  }
  if (generalSafetyNotes.length > 0) {
    lines.push('General notes:');
    for (const note of generalSafetyNotes) lines.push(`- ${note}`);
  }
  return lines.join('\n');
}

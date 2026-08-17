import { app } from 'electron';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SKILL_FILES = {
  exerciseSelection: 'exercise-selection.md',
  safetyReview: 'safety-precautions.md',
  patientInstructions: 'patient-instructions.md',
  orchestrator: 'orchestrator.md',
} as const;

const cache = new Map<string, string>();

/**
 * Dev mode: app.getAppPath() is the project root, so `skills/` sits right
 * next to it. Packaged builds need `skills/` shipped as an extraResource
 * pointing at the same relative layout (see Panel's electron-builder.yml
 * for the pattern once packaging is set up here).
 */
async function loadFile(relativePath: string): Promise<string> {
  const cached = cache.get(relativePath);
  if (cached) return cached;
  const fullPath = app.isPackaged
    ? join(process.resourcesPath, 'skills', relativePath)
    : join(app.getAppPath(), 'skills', relativePath);
  const content = await readFile(fullPath, 'utf-8');
  cache.set(relativePath, content);
  return content;
}

export function loadExerciseSelectionSkill(): Promise<string> {
  return loadFile(SKILL_FILES.exerciseSelection);
}

export function loadSafetyReviewSkill(): Promise<string> {
  return loadFile(SKILL_FILES.safetyReview);
}

export function loadPatientInstructionsSkill(): Promise<string> {
  return loadFile(SKILL_FILES.patientInstructions);
}

export function loadOrchestratorSkill(): Promise<string> {
  return loadFile(SKILL_FILES.orchestrator);
}

import { app, safeStorage } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HandoutDraft } from '@shared/types';

const MAX_HISTORY = 50;

/**
 * Case profiles and draft handouts are free text a clinician could paste
 * real patient details into (see CaseProfileForm's functional-language
 * steering and diagnosticTermGuard.ts — neither can fully prevent it, and
 * neither covers names/DOB/MRN at all). This file plausibly contains that
 * text, so — unlike the old plaintext draft-history.json — it's encrypted
 * at rest with the same OS-managed safeStorage key keystore.ts already
 * uses for the API key, rather than left as plaintext JSON on disk.
 *
 * If safeStorage isn't available on this OS, drafts still work for the
 * current session but are not persisted to disk: writing that data
 * unencrypted would be a worse outcome than not persisting it at all.
 *
 * This only hardens storage — it doesn't change retention (still the last
 * 50 drafts, kept indefinitely) or add any PHI warning to the user. Those
 * are policy/copy decisions, flagged separately.
 */
function historyPath(): string {
  return join(app.getPath('userData'), 'draft-history.enc');
}

export async function loadHistory(): Promise<HandoutDraft[]> {
  if (!safeStorage.isEncryptionAvailable()) return [];
  try {
    const encrypted = await readFile(historyPath());
    const raw = safeStorage.decryptString(encrypted);
    return JSON.parse(raw) as HandoutDraft[];
  } catch {
    return [];
  }
}

export async function saveDraft(draft: HandoutDraft): Promise<HandoutDraft[]> {
  const history = await loadHistory();
  const next = [draft, ...history.filter((d) => d.id !== draft.id)].slice(0, MAX_HISTORY);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(JSON.stringify(next));
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(historyPath(), encrypted);
  }
  return next;
}

export async function clearHistory(): Promise<void> {
  await rm(historyPath(), { force: true });
}

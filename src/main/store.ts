import { app } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HandoutDraft } from '@shared/types';

const MAX_HISTORY = 50;

function historyPath(): string {
  return join(app.getPath('userData'), 'draft-history.json');
}

export async function loadHistory(): Promise<HandoutDraft[]> {
  try {
    const raw = await readFile(historyPath(), 'utf-8');
    return JSON.parse(raw) as HandoutDraft[];
  } catch {
    return [];
  }
}

export async function saveDraft(draft: HandoutDraft): Promise<HandoutDraft[]> {
  const history = await loadHistory();
  const next = [draft, ...history.filter((d) => d.id !== draft.id)].slice(0, MAX_HISTORY);
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(historyPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export async function clearHistory(): Promise<void> {
  await rm(historyPath(), { force: true });
}

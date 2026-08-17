import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { IPC, type AgentId, type CaseProfile, type HandoutDraft } from '@shared/types';
import { runExerciseSelection, runOrchestrator, runPatientInstructions, runSafetyReview } from './agents';
import { clearHistory, loadHistory, saveDraft } from './store';
import { clearStoredApiKey, hasStoredApiKey, resolveApiKey, setStoredApiKey } from './keystore';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  window.on('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers(): void {
  // Gate on whatever key would actually resolve at call time (stored OR
  // ANTHROPIC_API_KEY from .env), not just the persisted store — a
  // dev-mode .env key should skip onboarding just as validly as one
  // entered through the UI.
  ipcMain.handle(IPC.hasApiKey, async () => (await resolveApiKey()) !== null);

  ipcMain.handle(IPC.setApiKey, async (_event, key: string) => {
    if (!key.trim()) throw new Error('API key cannot be empty.');
    await setStoredApiKey(key);
  });

  ipcMain.handle(IPC.clearApiKey, async () => {
    await clearStoredApiKey();
    return hasStoredApiKey();
  });

  ipcMain.handle(IPC.draftHandout, async (event, profile: CaseProfile) => {
    const sender = event.sender;
    const emit = (agent: AgentId, status: 'running' | 'done' | 'error', error?: string) =>
      sender.send(IPC.agentProgress, { agent, status, error });

    // Unlike Panel's three fully-independent reviewer lenses, exercise
    // selection has to run first here: safety review and patient
    // instructions both need a concrete exercise list to work against —
    // you can't flag a precaution against, or write instructions for, an
    // exercise that doesn't exist yet. So this is a two-stage pipeline
    // (select, then safety+instructions concurrently) rather than a
    // fully flat Promise.all across all three, followed by the same
    // orchestrator-merge shape Panel uses.
    emit('exerciseSelection', 'running');
    const candidates = await runExerciseSelection(profile).catch((err) => {
      emit('exerciseSelection', 'error', err instanceof Error ? err.message : String(err));
      throw err;
    });
    emit('exerciseSelection', 'done');

    emit('safetyReview', 'running');
    emit('patientInstructions', 'running');
    const [safetySettled, instructionsSettled] = await Promise.allSettled([
      runSafetyReview(profile, candidates),
      runPatientInstructions(profile, candidates),
    ]);

    const flags = unwrap(safetySettled, (err) => emit('safetyReview', 'error', err), () => emit('safetyReview', 'done'));
    const instructions = unwrap(
      instructionsSettled,
      (err) => emit('patientInstructions', 'error', err),
      () => emit('patientInstructions', 'done'),
    );

    const { exercises, generalSafetyNotes } = await runOrchestrator(candidates, flags, instructions);

    const draft: HandoutDraft = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      caseProfile: profile,
      exercises,
      generalSafetyNotes,
      signedOff: false,
      signedOffAt: null,
    };
    await saveDraft(draft);
    return draft;
  });

  ipcMain.handle(IPC.history, async () => loadHistory());
  ipcMain.handle(IPC.clearHistory, async () => clearHistory());

  // The clinician-sign-off step: renderer sends back the draft as the
  // clinician left it (with whichever exercises they accepted), main
  // stamps the confirmation and timestamp and persists it. This is the
  // one gate export/print/copy sit behind.
  ipcMain.handle(IPC.signOff, async (_event, draft: HandoutDraft) => {
    const signed: HandoutDraft = { ...draft, signedOff: true, signedOffAt: new Date().toISOString() };
    await saveDraft(signed);
    return signed;
  });
}

/** Unwraps a settled promise, defaulting to [] and reporting an error via the given callbacks — a settled reviewer/writer failing shouldn't sink the whole draft. */
function unwrap<T>(
  result: PromiseSettledResult<T[]>,
  onError: (message: string) => void,
  onSuccess: () => void,
): T[] {
  if (result.status === 'fulfilled') {
    onSuccess();
    return result.value;
  }
  onError(result.reason instanceof Error ? result.reason.message : String(result.reason));
  return [];
}
